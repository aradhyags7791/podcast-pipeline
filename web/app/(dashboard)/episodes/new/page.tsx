'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, Loader2, X, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

export default function NewEpisodePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [scriptMode, setScriptMode] = useState<'paste'|'file'>('paste')
  const [scriptText, setScriptText] = useState('')
  const [scriptFile, setScriptFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [avatarName, setAvatarName] = useState('')
  const [wordsPerSegment, setWordsPerSegment] = useState(37)

  const imageRef = useRef<HTMLInputElement>(null)
  const scriptRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.heygenAvatarName) setAvatarName(s.heygenAvatarName)
      if (s.wordsPerSegment)  setWordsPerSegment(Number(s.wordsPerSegment))
    }).catch(() => {})
  }, [])

  function handleImageSelect(file: File) {
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleImageSelect(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const text = scriptMode === 'paste' ? scriptText : (await scriptFile?.text() ?? '')
    if (!text || text.trim().length < 100) { setError('Script must be at least 100 characters.'); return }
    if (!imageFile) { setError('Reference image is required.'); return }
    if (!avatarName.trim()) { setError('Avatar name is required.'); return }

    setSubmitting(true)
    try {
      // Upload image
      const imgForm = new FormData()
      imgForm.append('file', imageFile)
      imgForm.append('folder', 'images')
      const imgRes = await fetch('/api/upload', { method: 'POST', body: imgForm })
      if (!imgRes.ok) throw new Error('Image upload failed')
      const { key: imageKey } = await imgRes.json()

      // Upload script file if needed
      let scriptFileKey: string | undefined
      if (scriptMode === 'file' && scriptFile) {
        const sfForm = new FormData()
        sfForm.append('file', scriptFile)
        sfForm.append('folder', 'scripts')
        const sfRes = await fetch('/api/upload', { method: 'POST', body: sfForm })
        if (!sfRes.ok) throw new Error('Script upload failed')
        const { key } = await sfRes.json()
        scriptFileKey = key
      }

      // Create episode
      const epRes = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scriptText: text.trim(), scriptFileKey, imageKey, wordsPerSegment, avatarName }),
      })
      if (!epRes.ok) {
        const e = await epRes.json()
        throw new Error(e.error || 'Failed to create episode')
      }
      const episode = await epRes.json()
      router.push(`/episodes/${episode.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/episodes" className="text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">New Episode</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your podcast pipeline</p>
        </div>
      </div>

      {/* Full-page loading overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <p className="text-foreground font-medium">Creating episode…</p>
          <p className="text-muted-foreground text-sm">Uploading files and queuing pipeline</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 animate-slide-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="glass-card p-6 space-y-5">
          {/* Episode name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Episode Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. The Future of AI in Healthcare"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
            />
          </div>

          {/* Script */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Script *</label>
            <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
              {(['paste','file'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScriptMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer',
                    scriptMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'paste' ? 'Paste text' : 'Upload file'}
                </button>
              ))}
            </div>

            {scriptMode === 'paste' ? (
              <textarea
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                rows={8}
                placeholder="Paste your podcast script here… (minimum 100 characters)"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200 resize-y font-mono"
              />
            ) : (
              <div
                onClick={() => scriptRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setScriptFile(f) }}
                className="border-2 border-dashed border-border hover:border-amber-500/40 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:bg-amber-500/5"
              >
                <input ref={scriptRef} type="file" accept=".txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setScriptFile(f) }} />
                <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                {scriptFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-foreground">{scriptFile.name}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setScriptFile(null) }} className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Drop a .txt file or click to browse</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reference image */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference Image *</label>
            <div
              onClick={() => imageRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleImageDrop}
              className={clsx(
                'border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 hover:bg-amber-500/5',
                imagePreview ? 'border-amber-500/30 p-2' : 'border-border hover:border-amber-500/40 p-8'
              )}
            >
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageSelect(f) }}
              />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Reference" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-card/90 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop image or click to browse</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Used by Claude Vision to analyze your shooting style</p>
                </div>
              )}
            </div>
          </div>

          {/* Avatar + words */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avatar Name *</label>
              <input
                type="text"
                value={avatarName}
                onChange={e => setAvatarName(e.target.value)}
                required
                placeholder="Exact name in HeyGen UI"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Words / Segment</label>
              <input
                type="number"
                value={wordsPerSegment}
                onChange={e => setWordsPerSegment(Number(e.target.value))}
                min={20}
                max={80}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
              <p className="text-xs text-muted-foreground">~15 sec per segment at 37 WPS</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            href="/episodes"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent/50 transition-all duration-200 cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-black font-semibold rounded-lg px-5 py-2 text-sm transition-all duration-200 cursor-pointer"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <>
              <Upload className="w-4 h-4" /> Create Episode
            </>}
          </button>
        </div>
      </form>
    </div>
  )
}
