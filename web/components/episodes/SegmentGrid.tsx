'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

type SegmentStatus = 'pending' | 'generating' | 'done' | 'failed'

interface Segment {
  index: number
  status: SegmentStatus
  text: string
}

interface SegmentGridProps {
  segments: Segment[]
  total: number
  completed: number
}

export function SegmentGrid({ segments, total, completed }: SegmentGridProps) {
  const [tooltip, setTooltip] = useState<{ index: number; text: string; x: number; y: number } | null>(null)

  if (total === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {completed} of {total} segments generated
        </span>
        <span className="text-xs text-muted-foreground">
          {total > 0 ? Math.round((completed / total) * 100) : 0}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>

      {/* Dot grid */}
      <div className="relative flex flex-wrap gap-1 pt-1">
        {Array.from({ length: total }, (_, i) => {
          const seg = segments.find(s => s.index === i)
          const status: SegmentStatus = seg?.status ?? 'pending'
          return (
            <div
              key={i}
              onMouseEnter={e => {
                if (seg) {
                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                  setTooltip({ index: i, text: seg.text, x: rect.left, y: rect.top })
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              className={clsx(
                'w-4 h-4 rounded-full transition-all duration-300 cursor-default',
                status === 'pending'    && 'bg-border',
                status === 'generating' && 'bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.5)]',
                status === 'done'       && 'bg-emerald-500',
                status === 'failed'     && 'bg-red-500',
              )}
            />
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 max-w-xs bg-card border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-xl pointer-events-none -translate-y-full -translate-x-1/2"
          style={{ left: tooltip.x + 8, top: tooltip.y - 8 }}
        >
          <span className="font-medium text-foreground">Segment {tooltip.index + 1}</span>
          <p className="mt-0.5 leading-relaxed">{tooltip.text.slice(0, 100)}{tooltip.text.length > 100 ? '…' : ''}</p>
        </div>
      )}
    </div>
  )
}
