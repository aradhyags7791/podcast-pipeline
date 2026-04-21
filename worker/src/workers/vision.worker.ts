import { createWorker, heygenQueue } from '../queue/queues'
import { db } from '../db'
import { episodes, visualContexts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { setEpisodeStatus, setJobStatus, insertJobRecord } from '../lib/progress'
import { analyzeReferenceImage } from '../services/vision'

export function startVisionWorker() {
  const worker = createWorker('vision', async (job: import("bullmq").Job) => {
    const { episodeId } = job.data as { episodeId: string }
    console.log(`[vision] processing episode ${episodeId}`)

    await setEpisodeStatus(episodeId, 'analyzing')
    await setJobStatus(episodeId, 'vision', 'active')

    const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) })
    if (!episode) throw new Error(`Episode ${episodeId} not found`)

    const vc = await analyzeReferenceImage(episode.imageKey, episodeId)

    await db.insert(visualContexts).values({
      episodeId,
      styleMood:         vc.styleMood,
      actorAppearance:   vc.actorAppearance,
      staticDescription: vc.staticDescription,
    })

    await setJobStatus(episodeId, 'vision', 'completed')

    // Chain → heygen
    await insertJobRecord(episodeId, 'heygen')
    const heygenJob = await heygenQueue.add('heygen', { episodeId })
    console.log(`[vision] queued heygen job ${heygenJob.id} for episode ${episodeId}`)
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const { episodeId } = job.data
    await setJobStatus(episodeId, 'vision', 'failed', err.message)
    await setEpisodeStatus(episodeId, 'failed', `Vision analysis failed: ${err.message}`)
  })

  console.log('[vision] worker started')
  return worker
}
