'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Mic2, ListVideo, Settings, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

const nav = [
  { href: '/episodes', label: 'Episodes', icon: ListVideo },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border/50 flex flex-col h-screen sticky top-0 bg-background/95 backdrop-blur-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Mic2 className="w-4 h-4 text-amber-400" />
        </div>
        <span className="font-semibold text-sm text-foreground">Podcast Pipeline</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                active
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-border/50 pt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
