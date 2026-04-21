'use client'

import { useState } from 'react'
import { Download, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { clsx } from 'clsx'

type SegmentStatus = 'pending' | 'generating' | 'done' | 'failed'

interface Segment {
  id: string
  index: number
  text: string
  wordCount: number
  status: SegmentStatus
  videoKey?: string | null
}

const STATUS_ICON: Record<SegmentStatus, React.ReactNode> = {
  pending:    <Clock className="w-3.5 h-3.5 text-zinc-400" />,
  generating: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
  done:       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed:     <XCircle className="w-3.5 h-3.5 text-red-400" />,
}

export function SegmentTable({ segments }: { segments: Segment[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleDownload(segment: Segment) {
    if (!segment.videoKey) return
    setLoadingId(segment.id)
    try {
      const res = await fetch(`/api/episodes/segment-download?key=${encodeURIComponent(segment.videoKey)}`)
      const { url } = await res.json()
      window.open(url, '_blank')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4 w-10">#</th>
            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Text</th>
            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4 w-16">Words</th>
            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4 w-24">Status</th>
            <th className="text-left text-xs font-medium text-muted-foreground pb-3 w-24">Download</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {segments.map(seg => (
            <tr key={seg.id} className="group hover:bg-accent/20 transition-colors duration-150">
              <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{seg.index + 1}</td>
              <td className="py-3 pr-4">
                <span
                  title={seg.text}
                  className="text-foreground/80 line-clamp-1"
                >
                  {seg.text.slice(0, 80)}{seg.text.length > 80 ? '…' : ''}
                </span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{seg.wordCount}</td>
              <td className="py-3 pr-4">
                <span className={clsx(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                  seg.status === 'done'       && 'status-done',
                  seg.status === 'failed'     && 'status-failed',
                  seg.status === 'generating' && 'status-active',
                  seg.status === 'pending'    && 'status-pending',
                )}>
                  {STATUS_ICON[seg.status]}
                  {seg.status}
                </span>
              </td>
              <td className="py-3">
                {seg.status === 'done' && seg.videoKey && (
                  <button
                    onClick={() => handleDownload(seg)}
                    disabled={loadingId === seg.id}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {loadingId === seg.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Download
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
