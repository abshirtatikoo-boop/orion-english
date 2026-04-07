'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const TABS = [
  {
    href: '/dashboard',
    icon: (color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/learn',
    icon: (color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    href: '/search',
    icon: (color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    href: '/rooms',
    icon: (color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    icon: (color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [tapped, setTapped] = useState<string | null>(null)

  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/learn')
    router.prefetch('/search')
    router.prefetch('/rooms')
    router.prefetch('/profile')
  }, [router])

  const handleTap = (href: string) => {
    setTapped(href)
    setTimeout(() => setTapped(null), 200)
  }

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 56px)',
        maxWidth: 360,
        background: 'rgba(15, 15, 20, 0.55)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: 9999,
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        zIndex: 50,
      }}
    >
      {TABS.map(tab => {
        const active = pathname.startsWith(tab.href)
        const rippling = tapped === tab.href
        const color = active ? '#A78BFA' : 'rgba(255,255,255,0.35)'
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => handleTap(tab.href)}
            style={{
              padding: 8,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              display: 'flex',
              transform: rippling ? 'scale(0.85)' : active ? 'scale(1.2)' : 'scale(1)',
              transition: rippling ? 'transform 0.1s ease' : 'all 0.2s ease',
            }}>
              {tab.icon(color)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
