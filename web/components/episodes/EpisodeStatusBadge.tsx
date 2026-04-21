import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'

type Status = 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'

const ACTIVE = new Set(['segmenting', 'analyzing', 'generating', 'stitching'])

const LABELS: Record<Status, string> = {
  pending:    'Pending',
  segmenting: 'Segmenting',
  analyzing:  'Analyzing',
  generating: 'Generating',
  stitching:  'Stitching',
  done:       'Done',
  failed:     'Failed',
}

export function EpisodeStatusBadge({ status }: { status: Status }) {
  const active = ACTIVE.has(status)

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      status === 'done'    && 'status-done',
      status === 'failed'  && 'status-failed',
      active               && 'status-active',
      status === 'pending' && 'status-pending',
    )}>
      {active   && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'done'    && <CheckCircle2 className="w-3 h-3" />}
      {status === 'failed'  && <XCircle className="w-3 h-3" />}
      {status === 'pending' && <Clock className="w-3 h-3" />}
      {LABELS[status]}
    </span>
  )
}
