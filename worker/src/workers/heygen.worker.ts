import { createWorker, stitchQueue } from '../queue/queues'
import { db } from '../db'
import { episodes, segments, visualContexts } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import { setEpisodeStatus, setJobStatus, insertJobRecord, incrementCompletedSegments } from '../lib/progress'
import { ensureHeyGenLogin, resetLoginState } from '../services/heygen/login'
import { getSetting } from '../lib/settings'
import { generateSegment } from '../services/heygen/avatar-shots'
import { buildSegmentPrompts } from '../services/prompts'

export function startHeygenWorker() {
  const worker = createWorker('heygen', async (job: import("bullmq").Job) => {
    const { episodeId } = job.data as { episodeId: string }
    console.log(`[heygen] processing episode ${episodeId}`)

    await setEpisodeStatus(episodeId, 'generating')
    await setJobStatus(episodeId, 'heygen', 'active')

    const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) })
    if (!episode) throw new Error(`Episode ${episodeId} not found`)

    const vc = await db.query.visualContexts.findFirst({ where: eq(visualContexts.episodeId, episodeId) })
    if (!vc) throw new Error(`Visual context not found for episode ${episodeId}`)

    const segs = await db.select().from(segments)
      .where(eq(segments.episodeId, episodeId))
      .orderBy(asc(segments.index))

    const heygenEmail    = await getSetting('heygenEmail',    process.env.HEYGEN_EMAIL    ?? '')
    const heygenPassword = await getSetting('heygenPassword', process.env.HEYGEN_PASSWORD ?? '')
    if (!heygenEmail || !heygenPassword) throw new Error('HeyGen credentials not set — add them in Settings')

    const voiceKey = 'voice-reference.mp3'

    let page = await ensureHeyGenLogin(heygenEmail, heygenPassword)

    for (const seg of segs) {
      console.log(`[heygen] generating segment ${seg.index + 1}/${segs.length}`)

      await db.update(segments).set({ status: 'generating' }).where(eq(segments.id, seg.id))

      try {
        const prompts = buildSegmentPrompts(seg.index, seg.text, vc)
        // Avatar Shots uses EN prompt; ZH is stored for reference
        const prompt = prompts[0]

        const r2Key = await generateSegment(
          page,
          prompt,
          voiceKey,
          episode.imageKey,
          seg.index,
          episodeId,
        )

        await db.update(segments).set({
          status: 'done',
          videoKey: r2Key,
        }).where(eq(segments.id, seg.id))

        await incrementCompletedSegments(episodeId)
        console.log(`[heygen] segment ${seg.index} done → ${r2Key}`)

      } catch (err: any) {
        console.error(`[heygen] segment ${seg.index} FAILED:`, err.message)
        await db.update(segments).set({
          status: 'failed',
          errorMessage: err.message,
        }).where(eq(segments.id, seg.id))

        // Re-login on next segment in case session expired
        resetLoginState()
        try {
          page = await ensureHeyGenLogin(heygenEmail, heygenPassword)
        } catch (loginErr: any) {
          console.error('[heygen] re-login failed:', loginErr.message)
        }
      }
    }

    await setJobStatus(episodeId, 'heygen', 'completed')

    // Chain → stitch
    await insertJobRecord(episodeId, 'stitch')
    const stitchJob = await stitchQueue.add('stitch', { episodeId })
    console.log(`[heygen] queued stitch job ${stitchJob.id} for episode ${episodeId}`)
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const { episodeId } = job.data
    await setJobStatus(episodeId, 'heygen', 'failed', err.message)
    await setEpisodeStatus(episodeId, 'failed', `Generation failed: ${err.message}`)
  })

  console.log('[heygen] worker started')
  return worker
}
