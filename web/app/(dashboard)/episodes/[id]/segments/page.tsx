import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { episodes, segments } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EpisodeStatusBadge } from '@/components/episodes/EpisodeStatusBadge'
import { SegmentTable } from '@/components/episodes/SegmentTable'

export default async function SegmentsPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) redirect('/login')

  const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, params.id) })
  if (!episode) notFound()

  const segs = await db.select().from(segments)
    .where(eq(segments.episodeId, params.id))
    .orderBy(asc(segments.index))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/episodes/${params.id}`} className="text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{episode.name}</h1>
            <EpisodeStatusBadge status={episode.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{segs.length} segments</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <SegmentTable segments={segs as any} />
      </div>
    </div>
  )
}
