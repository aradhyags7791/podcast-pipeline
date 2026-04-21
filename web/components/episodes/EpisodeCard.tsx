'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { EpisodeStatusBadge } from './EpisodeStatusBadge'
import { formatDistanceToNow } from '@/lib/utils'

interface Episode {
  id: string
  name: string
  status: 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'
  totalSegments: number
  completedSegments: number
  outputVideoKey: string | null
  createdAt: string
}

export function EpisodeCard({ episode }: { episode: Episode }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/episodes/${episode.id}`)
      const data = await res.json()
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const progress = episode.totalSegments > 0
    ? Math.round((episode.completedSegments / episode.totalSegments) * 100)
    : 0

  return (
    <tr className="group hover:bg-accent/20 transition-colors duration-150">
      {/* Name */}
      <td className="px-5 py-4 font-medium text-foreground group-hover:text-amber-400 transition-colors duration-200">
        {episode.name}
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <EpisodeStatusBadge status={episode.status} />
      </td>

      {/* Progress */}
      <td className="px-5 py-4">
        {episode.totalSegments > 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 bg-border rounded-full overflow-hidden w-20">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {episode.completedSegments}/{episode.totalSegments}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-sm">—</span>
        )}
      </td>

      {/* Created */}
      <td className="px-5 py-4 text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(episode.createdAt))}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/episodes/${episode.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View
          </Link>
          {episode.status === 'done' && episode.outputVideoKey && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
