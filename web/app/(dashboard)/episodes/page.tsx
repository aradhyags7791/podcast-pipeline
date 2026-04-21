'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Mic2, Loader2, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { EpisodeCard } from '@/components/episodes/EpisodeCard'

interface Episode {
  id: string
  name: string
  status: 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'
  totalSegments: number
  completedSegments: number
  outputVideoKey: string | null
  createdAt: string
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEpisodes = useCallback(async () => {
    try {
      const res = await fetch('/api/episodes')
      if (res.ok) setEpisodes(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchEpisodes().finally(() => setLoading(false))
    const interval = setInterval(fetchEpisodes, 10000)
    return () => clearInterval(interval)
  }, [fetchEpisodes])

  const total      = episodes.length
  const inProgress = episodes.filter(e => ['segmenting','analyzing','generating','stitching'].includes(e.status)).length
  const completed  = episodes.filter(e => e.status === 'done').length
  const failed     = episodes.filter(e => e.status === 'failed').length

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Episodes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your podcast video pipeline</p>
        </div>
        <Link
          href="/episodes/new"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New episode
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',       value: total,       icon: Mic2,         color: 'text-foreground' },
          { label: 'In Progress', value: inProgress,  icon: TrendingUp,   color: 'text-amber-400' },
          { label: 'Completed',   value: completed,   icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Failed',      value: failed,      icon: XCircle,      color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-400/50" />
            </div>
            <p className="text-foreground font-medium mb-1">No episodes yet.</p>
            <p className="text-muted-foreground text-sm mb-4">Create your first episode to get started.</p>
            <Link
              href="/episodes/new"
              className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create your first episode
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Name','Status','Progress','Created','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {episodes.map(ep => <EpisodeCard key={ep.id} episode={ep} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
