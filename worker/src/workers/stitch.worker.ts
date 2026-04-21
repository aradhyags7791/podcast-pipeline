import { createWorker } from '../queue/queues'
import { db } from '../db'
import { episodes, segments } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import * as fs from 'fs/promises'
import * as path from 'path'
import { setEpisodeStatus, setJobStatus } from '../lib/progress'
import { downloadFromR2, uploadFileToR2 } from '../services/r2'
import { stitchEpisode } from '../services/stitch'

export function startStitchWorker() {
  const worker = createWorker('stitch', async (job: import("bullmq").Job) => {
    const { episodeId } = job.data as { episodeId: string }
    console.log(`[stitch] processing episode ${episodeId}`)

    await setEpisodeStatus(episodeId, 'stitching')
    await setJobStatus(episodeId, 'stitch', 'active')

    const doneSegs = await db.select().from(segments)
      .where(eq(segments.episodeId, episodeId))
      .orderBy(asc(segments.index))
      .then(rows => rows.filter(s => s.status === 'done' && s.videoKey))

    if (doneSegs.length === 0) {
      throw new Error('No completed segments to stitch')
    }

    const tmpDir = path.join(process.cwd(), 'tmp', episodeId)
    await fs.mkdir(tmpDir, { recursive: true })

    // Download all segment MP4s
    const segmentPaths: string[] = []
    for (const seg of doneSegs) {
      const localPath = path.join(tmpDir, `seg-${seg.index}.mp4`)
      await downloadFromR2(seg.videoKey!, localPath)
      segmentPaths.push(localPath)
    }

    const outputPath = path.join(tmpDir, 'final.mp4')
    const segmentTexts = doneSegs.map(s => s.text)

    await stitchEpisode(episodeId, segmentPaths, segmentTexts, outputPath)

    const r2Key = `output/${episodeId}/final.mp4`
    await uploadFileToR2(outputPath, r2Key, 'video/mp4')

    await db.update(episodes).set({
      outputVideoKey: r2Key,
      status: 'done',
      updatedAt: new Date(),
    }).where(eq(episodes.id, episodeId))

    await setJobStatus(episodeId, 'stitch', 'completed')

    // Cleanup tmp
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

    console.log(`[stitch] episode ${episodeId} complete → ${r2Key}`)
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const { episodeId } = job.data
    await setJobStatus(episodeId, 'stitch', 'failed', err.message)
    await setEpisodeStatus(episodeId, 'failed', `Stitching failed: ${err.message}`)
  })

  console.log('[stitch] worker started')
  return worker
}
