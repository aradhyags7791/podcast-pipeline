import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { episodes, segments } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  // Dev bypass — simulate live progress for mock episodes
  if (params.id.startsWith('dev-episode-')) {
    const stages = ['segmenting', 'analyzing', 'generating', 'generating', 'generating', 'stitching', 'done']
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        let step = 0
        const totalSegments = 6
        const tick = async () => {
          const status = stages[Math.min(step, stages.length - 1)] as any
          const completed = Math.min(step, totalSegments)
          send({
            status, totalSegments, completedSegments: completed, outputVideoKey: null, errorMessage: null,
            segments: Array.from({ length: totalSegments }, (_, i) => ({
              index: i, status: i < completed ? 'done' : i === completed && status === 'generating' ? 'generating' : 'pending',
              text: `Segment ${i + 1} of the demo script. This shows what the live progress looks like.`,
            })),
          })
          if (status === 'done') { clearInterval(timer); controller.close() }
          step++
        }
        await tick()
        const timer = setInterval(tick, 3000)
        req.signal.addEventListener('abort', () => { clearInterval(timer); controller.close() })
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      let timer: ReturnType<typeof setInterval>
      let errorCount = 0
      const MAX_ERRORS = 5

      const poll = async () => {
        try {
          const episode = await db.query.episodes.findFirst({
            where: eq(episodes.id, params.id),
          })
          if (!episode) { clearInterval(timer); controller.close(); return }

          errorCount = 0

          const segs = await db.select().from(segments)
            .where(eq(segments.episodeId, params.id))
            .orderBy(asc(segments.index))

          send({
            status: episode.status,
            totalSegments: episode.totalSegments,
            completedSegments: episode.completedSegments,
            outputVideoKey: episode.outputVideoKey,
            errorMessage: episode.errorMessage,
            segments: segs.map(s => ({
              index: s.index,
              status: s.status,
              text: s.text,
              videoKey: s.videoKey,
            })),
          })

          if (episode.status === 'done' || episode.status === 'failed') {
            clearInterval(timer)
            controller.close()
          }
        } catch (err) {
          console.error('[SSE] poll error:', err)
          errorCount++
          if (errorCount >= MAX_ERRORS) {
            console.error('[SSE] too many errors — closing stream')
            clearInterval(timer)
            controller.close()
          }
        }
      }

      await poll()
      timer = setInterval(poll, 2000)
      req.signal.addEventListener('abort', () => {
        clearInterval(timer)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
