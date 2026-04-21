import { Check, X } from 'lucide-react'
import { clsx } from 'clsx'

type EpisodeStatus = 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'

const STAGES = [
  { key: 'segmenting', label: 'Segment' },
  { key: 'analyzing',  label: 'Analyze' },
  { key: 'generating', label: 'Generate' },
  { key: 'stitching',  label: 'Stitch' },
  { key: 'done',       label: 'Done' },
] as const

const ORDER: Record<string, number> = {
  pending: -1, segmenting: 0, analyzing: 1, generating: 2, stitching: 3, done: 4, failed: 99,
}

export function StageTracker({ status }: { status: EpisodeStatus }) {
  const current = ORDER[status] ?? -1
  const failed = status === 'failed'

  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, i) => {
        const stageOrder = i
        const isCompleted = current > stageOrder && !failed
        const isActive = current === stageOrder && !failed
        const isFailed = failed && current === stageOrder
        const isWaiting = current < stageOrder

        return (
          <div key={stage.key} className="flex items-center">
            {/* Connector */}
            {i > 0 && (
              <div className={clsx(
                'h-px w-8 transition-colors duration-500',
                isCompleted || current > stageOrder ? 'bg-emerald-500/60' : 'bg-border',
              )} />
            )}

            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <div className={clsx(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                isCompleted && 'border-emerald-500 bg-emerald-500/15',
                isActive    && 'border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.25)] animate-pulse',
                isFailed    && 'border-red-500 bg-red-500/15',
                isWaiting   && 'border-border bg-transparent',
              )}>
                {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {isFailed    && <X    className="w-3.5 h-3.5 text-red-400" />}
                {isActive    && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                {isWaiting   && <div className="w-2 h-2 rounded-full bg-border" />}
              </div>

              {/* Label */}
              <span className={clsx(
                'text-xs font-medium whitespace-nowrap',
                isCompleted && 'text-emerald-400',
                isActive    && 'text-amber-400',
                isFailed    && 'text-red-400',
                isWaiting   && 'text-muted-foreground/50',
              )}>
                {stage.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
