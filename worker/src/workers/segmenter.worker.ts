import { createWorker, visionQueue } from '../queue/queues'
import { db } from '../db'
import { episodes, segments } from '../db/schema'
import { eq } from 'drizzle-orm'
import { setEpisodeStatus, setJobStatus, insertJobRecord } from '../lib/progress'
import { segmentScript } from '../services/segmenter'

export function startSegmenterWorker() {
  const worker = createWorker('segment', async (job: import("bullmq").Job) => {
    const { episodeId } = job.data as { episodeId: string }
    console.log(`[segmenter] processing episode ${episodeId}`)

    await setEpisodeStatus(episodeId, 'segmenting')
    await setJobStatus(episodeId, 'segment', 'active')

    const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) })
    if (!episode) throw new Error(`Episode ${episodeId} not found`)

    const segs = segmentScript(episode.scriptText, episode.wordsPerSegment)

    await db.insert(segments).values(segs.map(s => ({
      episodeId,
      index:     s.index,
      text:      s.text,
      wordCount: s.wordCount,
    })))

    await db.update(episodes).set({
      totalSegments: segs.length,
      updatedAt: new Date(),
    }).where(eq(episodes.id, episodeId))

    await setJobStatus(episodeId, 'segment', 'completed')

    // Chain → vision
    await insertJobRecord(episodeId, 'vision')
    const visionJob = await visionQueue.add('vision', { episodeId })
    console.log(`[segmenter] queued vision job ${visionJob.id} for episode ${episodeId}`)
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const { episodeId } = job.data
    await setJobStatus(episodeId, 'segment', 'failed', err.message)
    await setEpisodeStatus(episodeId, 'failed', `Segmentation failed: ${err.message}`)
  })

  console.log('[segmenter] worker started')
  return worker
}
