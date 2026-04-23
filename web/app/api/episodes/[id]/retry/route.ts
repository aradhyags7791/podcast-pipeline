import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { episodes, segments, jobs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSegmentQueue, getVisionQueue, getHeygenQueue, getStitchQueue } from '@/lib/queue'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, id) })
  if (!episode) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (episode.status === 'done') return NextResponse.json({ error: 'Episode already completed' }, { status: 400 })

  // Guard: don't double-queue if already actively processing
  const activeStatuses = ['segmenting', 'analyzing', 'generating', 'stitching'] as const
  if ((activeStatuses as readonly string[]).includes(episode.status)) {
    return NextResponse.json({ error: 'Episode is already processing' }, { status: 409 })
  }

  const lastJob = await db.query.jobs.findFirst({
    where: eq(jobs.episodeId, id),
    orderBy: [desc(jobs.createdAt)],
  })

  let retryStage = lastJob?.stage ?? 'segment'

  // If stuck as pending with no job, or failed at segment stage → full restart
  if (!lastJob || retryStage === 'segment') {
    await db.delete(segments).where(eq(segments.episodeId, id))
    await db.delete(jobs).where(eq(jobs.episodeId, id))
    await db.update(episodes)
      .set({ status: 'pending', totalSegments: 0, completedSegments: 0, errorMessage: null, outputVideoKey: null })
      .where(eq(episodes.id, id))
    retryStage = 'segment'
  } else {
    // Reset episode error and status to re-enter the pipeline at the right stage
    const statusMap: Record<string, typeof episode.status> = {
      vision: 'segmenting',
      heygen: 'analyzing',
      stitch: 'generating',
    }
    await db.update(episodes)
      .set({ status: statusMap[retryStage] ?? 'pending', errorMessage: null })
      .where(eq(episodes.id, id))
  }

  // Insert new job record
  const queueMap = {
    segment: getSegmentQueue,
    vision: getVisionQueue,
    heygen: getHeygenQueue,
    stitch: getStitchQueue,
  }
  const getQueue = queueMap[retryStage as keyof typeof queueMap] ?? getSegmentQueue

  const [job] = await db.insert(jobs).values({
    episodeId: id,
    stage: retryStage,
    status: 'waiting',
  }).returning()

  const bullJob = await getQueue().add(retryStage, { episodeId: id })

  await db.update(jobs)
    .set({ bullJobId: bullJob.id?.toString() })
    .where(eq(jobs.id, job.id))

  return NextResponse.json({ ok: true, retryStage })
}
