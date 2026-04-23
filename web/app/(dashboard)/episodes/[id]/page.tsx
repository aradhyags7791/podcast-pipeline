'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, AlertCircle, ChevronDown, ChevronRight, Play, RefreshCw, Trash2 } from 'lucide-react'
import { EpisodeStatusBadge } from '@/components/episodes/EpisodeStatusBadge'
import { StageTracker } from '@/components/episodes/StageTracker'
import { SegmentGrid } from '@/components/episodes/SegmentGrid'
import { formatDistanceToNow } from '@/lib/utils'

interface Segment { index: number; status: string; text: string; videoKey?: string | null }
interface VisualContext { styleMood: string; actorAppearance: string; staticDescription: string }

interface EpisodeState {
  id: string
  name: string
  status: 'pending' | 'segmenting' | 'analyzing' | 'generating' | 'stitching' | 'done' | 'failed'
  totalSegments: number
  completedSegments: number
  outputVideoKey: string | null
  errorMessage: string | null
  avatarName: string
  wordsPerSegment: number
  createdAt: string
  segments: Segment[]
  visualContext: VisualContext | null
  downloadUrl: string | null
}

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [episode, setEpisode] = useState<EpisodeState | null>(null)
  const [vcOpen, setVcOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  // Initial load
  useEffect(() => {
    fetch(`/api/episodes/${id}`)
      .then(r => r.json())
      .then(data => setEpisode(data))
      .catch(console.error)
  }, [id])

  // SSE live updates
  useEffect(() => {
    const es = new EventSource(`/api/episodes/${id}/stream`)
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setEpisode(prev => prev ? {
        ...prev,
        status: data.status,
        totalSegments: data.totalSegments,
        completedSegments: data.completedSegments,
        outputVideoKey: data.outputVideoKey ?? prev.outputVideoKey,
        errorMessage: data.errorMessage ?? prev.errorMessage,
        segments: data.segments ?? prev.segments,
      } : prev)

      if (data.status === 'done' || data.status === 'failed') {
        es.close()
        // Refresh for downloadUrl
        fetch(`/api/episodes/${id}`).then(r => r.json()).then(setEpisode).catch(() => {})
      }
    }

    es.onerror = () => es.close()
    return () => es.close()
  }, [id])

  async function handleRetry() {
    setRetrying(true)
    setRetryError('')
    try {
      const res = await fetch(`/api/episodes/${id}/retry`, { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Retry failed'
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      // Refresh episode state
      const data = await fetch(`/api/episodes/${id}`).then(r => r.json())
      setEpisode(data)
    } catch (err: any) {
      setRetryError(err.message)
    } finally {
      setRetrying(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await fetch(`/api/episodes/${id}`, { method: 'DELETE' })
      router.push('/episodes')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownload() {
    setDownloadLoading(true)
    try {
      const res = await fetch(`/api/episodes/${id}`)
      const data = await res.json()
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank')
    } finally {
      setDownloadLoading(false)
    }
  }

  if (!episode) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    )
  }

  const isTerminal = episode.status === 'done' || episode.status === 'failed'
  const canRetry = episode.status !== 'done'
  const showSegments = !['pending', 'segmenting'].includes(episode.status) || episode.segments.length > 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/episodes" className="text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{episode.name}</h1>
            <EpisodeStatusBadge status={episode.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Created {formatDistanceToNow(new Date(episode.createdAt))}</p>
        </div>
        <button
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
          disabled={deleting}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer disabled:opacity-50 ${
            confirmDelete
              ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              : 'border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400'
          }`}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {confirmDelete ? 'Confirm delete?' : 'Delete'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Tracker */}
          <div className="glass-card p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-5">Pipeline Stage</h2>
            <div className="overflow-x-auto pb-2">
              <StageTracker status={episode.status} />
            </div>
          </div>

          {/* Segment Grid */}
          {showSegments && (
            <div className="glass-card p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Segment Progress</h2>
              <SegmentGrid
                segments={episode.segments as any}
                total={episode.totalSegments}
                completed={episode.completedSegments}
              />
            </div>
          )}

          {/* Output video */}
          {episode.status === 'done' && (
            <div className="glass-card p-6 space-y-4 animate-slide-in">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Final Video</h2>
              {episode.downloadUrl && (
                <video
                  key={episode.downloadUrl}
                  controls
                  className="w-full rounded-lg bg-black max-h-[400px]"
                  src={episode.downloadUrl}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer"
              >
                {downloadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download final video
              </button>
            </div>
          )}

          {/* Error */}
          {episode.status === 'failed' && episode.errorMessage && (
            <div className="glass-card border-red-500/20 p-5 animate-slide-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-red-400 mb-1">Pipeline failed</h3>
                  <p className="text-sm text-muted-foreground font-mono break-all">{episode.errorMessage}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Retry from this stage
                    </button>
                    <Link
                      href={`/episodes/${id}/segments`}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      View segments <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  {retryError && <p className="text-xs text-red-400 mt-2">{retryError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Stuck pending — no active job */}
          {episode.status === 'pending' && (
            <div className="glass-card p-5 animate-slide-in">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Episode is queued but not processing.</p>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-lg px-3 py-1.5 transition-all cursor-pointer"
                >
                  {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Retry
                </button>
              </div>
              {retryError && <p className="text-xs text-red-400 mt-2">{retryError}</p>}
            </div>
          )}
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Episode Info</h2>
            <dl className="space-y-3">
              {[
                { label: 'Avatar',        value: episode.avatarName },
                { label: 'Words/segment', value: String(episode.wordsPerSegment) },
                { label: 'Total segments',value: String(episode.totalSegments || '—') },
                { label: 'Created',       value: formatDistanceToNow(new Date(episode.createdAt)) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
                  <dd className="text-xs text-foreground text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {isTerminal && (
              <Link
                href={`/episodes/${id}/segments`}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-amber-500/30 rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                View all segments
              </Link>
            )}
          </div>

          {/* Visual Context */}
          {episode.visualContext && (
            <div className="glass-card overflow-hidden animate-slide-in">
              <button
                onClick={() => setVcOpen(!vcOpen)}
                className="w-full flex items-center justify-between px-5 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
              >
                Visual Context
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${vcOpen ? 'rotate-180' : ''}`} />
              </button>
              {vcOpen && (
                <div className="px-5 pb-5 space-y-4 animate-slide-in">
                  {[
                    { key: 'styleMood',         label: 'Style & Mood' },
                    { key: 'actorAppearance',   label: 'Actor Appearance' },
                    { key: 'staticDescription', label: 'Scene Description' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">{label}</h4>
                      <p className="text-xs text-foreground/70 font-mono leading-relaxed">
                        {episode.visualContext![key as keyof VisualContext]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
