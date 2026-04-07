'use client'

// Learn — streak, goals, quick actions, level progress

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, type UserRow } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import LevelBadge from '@/components/ui/LevelBadge'
import SkeletonCard from '@/components/ui/SkeletonCard'
import { claimDailyLoginBonus } from '@/lib/coins'
import { sendNotification } from '@/lib/notifications'
import { getCached, setCache } from '@/lib/cache'

interface LeaderUser {
  id: string
  name: string | null
  avatar_url: string | null
  coins: number
  level: 'beginner' | 'intermediate' | 'advanced'
  is_premium: boolean
}

const QUICK_ACTIONS = [
  { href: '/shadowing', icon: 'headphones', label: 'Shadow' },
  { href: '/ai-chat',   icon: 'chat', label: 'AI Chat' },
  { href: '/reading',   icon: 'book', label: 'Reading' },
  { href: '/rooms',     icon: 'play', label: 'Rooms' },
] as const

const DEFAULT_USER: UserRow = {
  id: '',
  email: '',
  name: 'Learner',
  level: 'beginner',
  coins: 0,
  streak: 0,
  last_active: null,
  is_premium: false,
  created_at: new Date().toISOString(),
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function LearnPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserRow>(DEFAULT_USER)
  const [loading, setLoading] = useState(true)
  const [shadowingDone, setShadowingDone] = useState(0)
  const [aiMessagesSent, setAiMessagesSent] = useState(0)
  const [topUsers, setTopUsers] = useState<LeaderUser[]>([])
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPromptRef = useRef<any>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPromptRef.current) return
    deferredPromptRef.current.prompt()
    await deferredPromptRef.current.userChoice
    deferredPromptRef.current = null
    setShowInstallBanner(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)

    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          clearTimeout(timeout)
          router.push('/login')
          return
        }

        // show cached profile immediately while fetching fresh data
        const cachedProfile = getCached<UserRow>(`learn_${authUser.id}`)
        if (cachedProfile) { setUser(cachedProfile); setLoading(false) }

        let { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!profile) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: created } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email ?? '',
              name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'Learner',
              level: 'beginner',
              coins: 0,
              streak: 0,
            } as any)
            .select()
            .single()
          profile = created
        }

        if (profile) { setUser(profile); setCache(`learn_${authUser.id}`, profile) }

        // claim daily bonus fire-and-forget
        claimDailyLoginBonus(authUser.id).then(async (claimed) => {
          if (claimed) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: updated } = await supabase.from('users').select('streak, coins').eq('id', authUser.id).single() as any
            if (updated) {
              setUser((u: UserRow) => ({ ...u, streak: updated.streak ?? u.streak, coins: updated.coins ?? u.coins }))
              if (updated.streak > 1) {
                sendNotification(supabase, authUser.id, 'streak', `${updated.streak} day streak!`, 'Amazing consistency! Keep learning every day ')
              }
            }
          }
        })

        const today = new Date().toISOString().split('T')[0]
        // parallel: txns + leaderboard
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [{ data: txns }, { data: leaders }] = await Promise.all([
          (supabase as any).from('coin_transactions').select('reason').eq('user_id', authUser.id).gte('created_at', today),
          (supabase as any).from('users').select('id, name, avatar_url, coins, level, is_premium').order('coins', { ascending: false }).limit(3),
        ])

        if (txns) {
          const shadowCount = (txns as any[]).filter((t: any) => t.reason.includes('shadowing') || t.reason === 'Complete shadowing session').length
          const aiCount = (txns as any[]).filter((t: any) => t.reason === 'AI chat message').length
          setShadowingDone(Math.min(5, shadowCount))
          setAiMessagesSent(Math.min(10, aiCount))
        }
        if (leaders) setTopUsers(leaders)

      } catch {
        // On any error, just show defaults
      }

      clearTimeout(timeout)
      setLoading(false)
    }

    init()
    return () => clearTimeout(timeout)
  }, [router])

  const xp = user.coins % 100

  return (
    <div className="flex flex-col pb-28 bg-zone-learn" style={{ minHeight: '100vh' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="fade-in">
          <h1 className="text-xl font-bold text-white leading-tight">
            Good {getTimeOfDay()}, {user.name?.split(' ')[0] ?? 'Learner'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Keep learning today</p>
        </div>
        <div className="flex items-center gap-2 fade-in">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <span className="text-sm"></span>
            <span className="text-sm font-bold" style={{ color: '#8B5CF6' }}>{user.coins.toLocaleString()}</span>
          </div>
          <button
            className="glass w-9 h-9 rounded-full flex items-center justify-center"
            style={{ padding: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5">

        {/* ── PWA Install Banner ─────────────────────────────────────────── */}
        {showInstallBanner && (
          <div
            className="rounded-card p-3 flex items-center gap-3 fade-in"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.15))', border: '1px solid #8B5CF6' }}
          >
            <span className="text-2xl"></span>
            <p className="flex-1 text-white text-sm font-medium">Install Orion English as an app</p>
            <button
              onClick={handleInstall}
              className="text-black text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: '#8B5CF6' }}
            >
              Install
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Later
            </button>
          </div>
        )}

        {/* ── Hero Card: Streak + Level ──────────────────────────────────── */}
        <div
          className="glass glass-accent fade-in p-4"
          style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl"></span>
                <span className="text-4xl font-black text-white">{user.streak}</span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                day streak — {user.streak > 0 ? 'Keep it up!' : 'Start today!'}
              </p>
            </div>
            <LevelBadge level={user.level} size="lg" />
          </div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>{xp} XP</span>
            <span>{xp}% to next level</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${xp}%`, background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' }}
            />
          </div>
        </div>

        {/* ── Daily Goals 2x2 Grid ──────────────────────────────────────── */}
        <div className="fade-in">
          <h3 className="text-sm font-semibold mb-3 text-white">Today's Goals</h3>
          <div className="grid grid-cols-2 gap-3">
            <GoalCard icon="H" label="Shadowing" done={shadowingDone} total={5} color="#8B5CF6" href="/shadowing" />
            <GoalCard icon="C" label="AI Chat" done={aiMessagesSent} total={10} color="#60A5FA" href="/ai-chat" unit="msgs" />
            <GoalCard icon="B" label="Reading" done={0} total={1} color="#34D399" href="/reading" unit="text" />
            <GoalCard icon="R" label="Rooms" done={0} total={1} color="#A78BFA" href="/rooms" unit="session" />
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="fade-in">
          <h3 className="text-sm font-semibold mb-3 text-white">Quick Start</h3>
          <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-transform active:scale-90"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  {action.icon}
                </div>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Leaderboard Preview ───────────────────────────────────────── */}
        {topUsers.length > 0 && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Top Learners </h3>
              <Link href="/search" className="text-xs font-medium" style={{ color: '#8B5CF6' }}>
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {topUsers.map((u, i) => (
                <div
                  key={u.id}
                  className="card flex-shrink-0 flex flex-col items-center gap-2 py-4"
                  style={{ minWidth: 110, position: 'relative' }}
                >
                  <div
                    className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: i === 0 ? '#8B5CF6' : i === 1 ? '#C0C0C0' : '#CD7F32',
                      color: i === 0 ? '#FFFFFF' : '#000000',
                    }}
                  >
                    {i + 1}
                  </div>
                  <Avatar name={u.name} avatarUrl={u.avatar_url} size="md" />
                  <div className="flex flex-col items-center gap-0.5">
                    <p className="text-xs font-semibold text-white text-center truncate w-full px-1">
                      {u.is_premium && 'PRO '}{u.name ?? 'Learner'}
                    </p>
                    <p className="text-xs font-bold" style={{ color: '#8B5CF6' }}>
                       {u.coins.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium upsell removed - all features free */}

      </div>

    </div>
  )
}

function GoalCard({
  icon, label, done, total, color, href, unit = 'sessions',
}: {
  icon: string; label: string; done: number; total: number
  color: string; href: string; unit?: string
}) {
  const pct = Math.round((done / total) * 100)
  const complete = done >= total
  return (
    <Link
      href={href}
      className="card flex flex-col gap-2 transition-transform active:scale-95"
      style={complete ? { border: `1px solid ${color}40`, background: `${color}08` } : {}}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {complete && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div>
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{done}/{total} {unit}</p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </Link>
  )
}
