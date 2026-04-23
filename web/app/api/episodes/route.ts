import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { episodes, jobs } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getSegmentQueue } from '@/lib/queue'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Dev bypass
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    return NextResponse.json([
      { id: 'dev-episode-1', name: 'The Future of AI in Healthcare', status: 'done', totalSegments: 6, completedSegments: 6, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'dev-episode-2', name: 'Building in Public', status: 'generating', totalSegments: 8, completedSegments: 3, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'dev-episode-3', name: 'Startup Lessons', status: 'failed', totalSegments: 4, completedSegments: 1, createdAt: new Date().toISOString() },
    ])
  }

  const list = await db.select().from(episodes).orderBy(desc(episodes.createdAt))
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, scriptText, scriptFileKey, imageKey, wordsPerSegment, avatarName } = body

  if (!name || !scriptText || !imageKey || !avatarName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Dev bypass — return a mock episode when DB isn't configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    const mockEpisode = {
      id: 'dev-episode-' + Date.now(),
      name,
      status: 'pending',
      scriptText,
      imageKey,
      wordsPerSegment: wordsPerSegment || 37,
      avatarName,
      totalSegments: 0,
      completedSegments: 0,
      outputVideoKey: null,
      errorMessage: null,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json(mockEpisode, { status: 201 })
  }

  const [episode] = await db.insert(episodes).values({
    name,
    scriptText,
    scriptFileKey: scriptFileKey || null,
    imageKey,
    wordsPerSegment: wordsPerSegment || 37,
    avatarName,
    createdBy: session.user.id,
  }).returning()

  const [job] = await db.insert(jobs).values({
    episodeId: episode.id,
    stage: 'segment',
    status: 'waiting',
  }).returning()

  try {
    const q = getSegmentQueue()
    const bullJob = await q.add('segment', { episodeId: episode.id })
    await db.update(jobs)
      .set({ bullJobId: bullJob.id?.toString() })
      .where(eq(jobs.id, job.id))
  } catch {
    // Queue unavailable — episode saved, user can retry from episode page
  }

  return NextResponse.json(episode, { status: 201 })
}
