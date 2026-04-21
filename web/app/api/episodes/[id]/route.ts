import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { episodes, segments, jobs, visualContexts } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getPresignedDownloadUrl } from '@/lib/r2'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Dev bypass
  if (params.id.startsWith('dev-episode-')) {
    return NextResponse.json({
      id: params.id, name: 'Demo Episode', status: 'generating',
      totalSegments: 6, completedSegments: 2, outputVideoKey: null, errorMessage: null,
      wordsPerSegment: 37, avatarName: 'Demo Avatar',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      segments: Array.from({ length: 6 }, (_, i) => ({
        id: `seg-${i}`, index: i, status: i < 2 ? 'done' : i === 2 ? 'generating' : 'pending',
        text: `This is segment ${i + 1} of the demo episode script content shown here.`,
        wordCount: 12, videoKey: null,
      })),
      jobs: [{ id: 'job-1', stage: 'segment', status: 'completed' }, { id: 'job-2', stage: 'vision', status: 'completed' }, { id: 'job-3', stage: 'heygen', status: 'active' }],
      visualContext: { styleMood: 'Cinematic 9:16 portrait, warm side lighting, shallow depth of field, amber tones, intimate mood.', actorAppearance: 'Navy blazer, white shirt, short dark hair, seated at 30° left of lens.', staticDescription: 'Dark wooden desk, professional microphone, softbox light right, blurred bookshelf background.' },
      downloadUrl: null,
    })
  }

  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, params.id),
  })
  if (!episode) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const segs = await db.select().from(segments)
    .where(eq(segments.episodeId, params.id))
    .orderBy(asc(segments.index))

  const jobList = await db.select().from(jobs)
    .where(eq(jobs.episodeId, params.id))
    .orderBy(asc(jobs.createdAt))

  const vc = await db.query.visualContexts.findFirst({
    where: eq(visualContexts.episodeId, params.id),
  })

  let downloadUrl: string | null = null
  if (episode.outputVideoKey) {
    downloadUrl = await getPresignedDownloadUrl(episode.outputVideoKey)
  }

  return NextResponse.json({
    ...episode,
    segments: segs,
    jobs: jobList,
    visualContext: vc || null,
    downloadUrl,
  })
}
