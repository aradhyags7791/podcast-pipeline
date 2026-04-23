import { db } from '../db'
import { episodes, jobs } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

type EpisodeStatus = 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'
type JobStatus = 'waiting' | 'active' | 'completed' | 'failed'

export async function setEpisodeStatus(episodeId: string, status: EpisodeStatus, errorMessage?: string) {
  await db.update(episodes).set({
    status,
    updatedAt: new Date(),
    ...(errorMessage ? { errorMessage } : {}),
  }).where(eq(episodes.id, episodeId))
  console.log(`[progress] episode ${episodeId.slice(0, 8)} → ${status}`)
}

export async function setJobStatus(episodeId: string, stage: string, status: JobStatus, errorMessage?: string) {
  await db.update(jobs).set({
    status,
    ...(status === 'active'    ? { startedAt: new Date() } : {}),
    ...(status === 'completed' ? { completedAt: new Date() } : {}),
    ...(status === 'failed'    ? { completedAt: new Date(), errorMessage } : {}),
  }).where(and(eq(jobs.episodeId, episodeId), eq(jobs.stage, stage)))
}

export async function insertJobRecord(episodeId: string, stage: string, bullJobId?: string) {
  await db.insert(jobs).values({
    episodeId,
    stage,
    status: 'waiting',
    bullJobId: bullJobId ?? null,
  })
}

export async function incrementCompletedSegments(episodeId: string) {
  await db.update(episodes).set({
    completedSegments: sql`${episodes.completedSegments} + 1`,
    updatedAt: new Date(),
  }).where(eq(episodes.id, episodeId))
}
