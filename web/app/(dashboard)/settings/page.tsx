'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Upload, CheckCircle2, Eye, EyeOff } from 'lucide-react'

interface SettingsState {
  heygenEmail: string
  heygenPassword: string
  heygenAvatarName: string
  wordsPerSegment: string
  heygenTimeoutMinutes: string
  anthropicApiKey: string
}

export default function SettingsPage() {
  const [s, setS] = useState<SettingsState>({
    heygenEmail: '',
    heygenPassword: '',
    heygenAvatarName: '',
    wordsPerSegment: '37',
    heygenTimeoutMinutes: '10',
    anthropicApiKey: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const [voiceSaved, setVoiceSaved] = useState(false)
  const voiceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setS(prev => ({ ...prev, ...data }))
    }).catch(() => {})
  }, [])

  async function save(section: string, fields: Partial<SettingsState>) {
    setSaving(section)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      setSaved(section)
      setTimeout(() => setSaved(null), 2500)
    } finally {
      setSaving(null)
    }
  }

  async function handleVoiceUpload(file: File) {
    setVoiceUploading(true)
    try {
      const form = new FormData()
      form.append('file', new File([file], 'voice-reference.mp3', { type: file.type }))
      form.append('folder', '')
      await fetch('/api/upload', { method: 'POST', body: form })
      setVoiceSaved(true)
      setTimeout(() => setVoiceSaved(false), 2500)
    } finally {
      setVoiceUploading(false)
    }
  }

  const SaveBtn = ({ section, fields }: { section: string; fields: Partial<SettingsState> }) => (
    <button
      onClick={() => save(section, fields)}
      disabled={saving === section}
      className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-black font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 cursor-pointer"
    >
      {saving === section ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === section ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saved === section ? 'Saved!' : 'Save'}
    </button>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure HeyGen credentials and pipeline defaults</p>
      </div>

      <div className="space-y-6">
        {/* Anthropic */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Anthropic (Claude Vision)</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={s.anthropicApiKey}
                onChange={e => setS(p => ({ ...p, anthropicApiKey: e.target.value }))}
                placeholder="sk-ant-..."
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Get yours at console.anthropic.com → API Keys</p>
          </div>
          <div className="flex justify-end pt-1">
            <SaveBtn section="anthropic" fields={{ anthropicApiKey: s.anthropicApiKey }} />
          </div>
        </div>

        {/* HeyGen Credentials */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">HeyGen Credentials</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={s.heygenEmail}
                onChange={e => setS(p => ({ ...p, heygenEmail: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={s.heygenPassword}
                  onChange={e => setS(p => ({ ...p, heygenPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avatar Name</label>
              <input
                type="text"
                value={s.heygenAvatarName}
                onChange={e => setS(p => ({ ...p, heygenAvatarName: e.target.value }))}
                placeholder="Exact name shown in HeyGen UI"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <SaveBtn section="heygen" fields={{ heygenEmail: s.heygenEmail, heygenPassword: s.heygenPassword, heygenAvatarName: s.heygenAvatarName }} />
          </div>
        </div>

        {/* Pipeline Defaults */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Pipeline Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Words per Segment</label>
              <input
                type="number"
                value={s.wordsPerSegment}
                onChange={e => setS(p => ({ ...p, wordsPerSegment: e.target.value }))}
                min={20} max={80}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
              <p className="text-xs text-muted-foreground">~15 sec at 37 WPS</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">HeyGen Timeout (min)</label>
              <input
                type="number"
                value={s.heygenTimeoutMinutes}
                onChange={e => setS(p => ({ ...p, heygenTimeoutMinutes: e.target.value }))}
                min={1} max={60}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
              />
              <p className="text-xs text-muted-foreground">Max wait per segment</p>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <SaveBtn section="pipeline" fields={{ wordsPerSegment: s.wordsPerSegment, heygenTimeoutMinutes: s.heygenTimeoutMinutes }} />
          </div>
        </div>

        {/* Voice Reference */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Voice Reference</h2>
          <p className="text-xs text-muted-foreground">Upload a voice reference MP3. Stored at key <code className="font-mono bg-secondary/80 px-1 py-0.5 rounded text-amber-400">voice-reference.mp3</code></p>
          <div
            onClick={() => voiceRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleVoiceUpload(f) }}
            className="border-2 border-dashed border-border hover:border-amber-500/40 rounded-lg p-6 text-center cursor-pointer transition-all duration-200 hover:bg-amber-500/5"
          >
            <input ref={voiceRef} type="file" accept="audio/*,.mp3" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleVoiceUpload(f) }} />
            {voiceUploading ? (
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Uploading…</span>
              </div>
            ) : voiceSaved ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">Uploaded successfully!</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drop MP3 or click to browse</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
