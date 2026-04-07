'use client'

// Dhagayso oo ku celceli — Shadowing practice page (upgraded)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'
import ShadowingPlayer from '@/components/features/ShadowingPlayer'
import { addCoins, COIN_REWARDS } from '@/lib/coins'
import { type Level } from '@/lib/sentences'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionStats {
  sentencesAttempted: number
  totalScore: number
  coinsEarned: number
}

const LEVEL_TABS: { value: Level; label: string; emoji: string; color: string }[] = [
  { value: 'beginner',     label: 'Beginner',     emoji: '🌱', color: '#60A5FA' },
  { value: 'intermediate', label: 'Intermediate', emoji: '', color: '#8B5CF6' },
  { value: 'advanced',     label: 'Advanced',     emoji: '', color: '#34D399' },
]

const TIPS = [
  "Listen to the full sentence before repeating.",
  "Focus on rhythm and stress, not just words.",
  "Use Slow speed (🐢) for difficult sentences.",
  "It's okay to be imperfect — consistency wins.",
  "Turn on Auto mode to keep momentum going.",
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShadowingPage() {
  const router = useRouter()
  const [userId, setUserId]     = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState<Level>('beginner')
  const [coins, setCoins]       = useState(0)
  const [selectedLevel, setSelectedLevel] = useState<Level>('beginner')
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    sentencesAttempted: 0,
    totalScore: 0,
    coinsEarned: 0,
  })
  const [toast, setToast]       = useState<string | null>(null)
  const [sessionsDone, setSessionsDone] = useState(0)
  const [tipIdx]                = useState(() => Math.floor(Math.random() * TIPS.length))
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000)
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/login'; return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await supabase
          .from('users').select('coins, level').eq('id', user.id).single() as any

        setUserId(user.id)
        setCoins(profile?.coins ?? 0)
        const lvl = (profile?.level ?? 'beginner') as Level
        setUserLevel(lvl)
        setSelectedLevel(lvl)
        setLoading(false)
      } catch { setLoading(false) } finally { clearTimeout(t) }
    }
    init()
    return () => clearTimeout(t)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSentenceComplete = async (accuracy: number) => {
    if (!userId) return

    setSessionStats(prev => ({
      ...prev,
      sentencesAttempted: prev.sentencesAttempted + 1,
      totalScore: prev.totalScore + accuracy,
    }))

    if (accuracy >= 30) {
      const coinAward = Math.round(2 + (accuracy / 100) * 18)
      const result = await addCoins(userId, coinAward, 'Shadowing sentence')
      if (result) {
        setCoins(result.newBalance)
        setSessionStats(prev => ({ ...prev, coinsEarned: prev.coinsEarned + coinAward }))
      }
    }
  }

  const handleSessionComplete = async () => {
    if (!userId) return

    const result = await addCoins(userId, COIN_REWARDS.COMPLETE_SHADOWING, 'Complete shadowing session')
    if (result) setCoins(result.newBalance)

    setSessionsDone(prev => prev + 1)
    showToast(`🎉 Session done! +${COIN_REWARDS.COMPLETE_SHADOWING} bonus coins`)
  }

  const handleLevelChange = (lvl: Level) => {
    setSelectedLevel(lvl)
    setSessionStats({ sentencesAttempted: 0, totalScore: 0, coinsEarned: 0 })
  }

  const avgAccuracy = sessionStats.sentencesAttempted > 0
    ? Math.round(sessionStats.totalScore / sessionStats.sentencesAttempted)
    : 0

  return (
    <div className="flex flex-col pb-20 min-h-screen" style={{ background: 'transparent' }}>
      <TopBar title="Shadowing" coins={coins} showBack onBack={() => router.back()} />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-all"
          style={{ background: '#8B5CF6', color: '#FFFFFF' }}>
          {toast}
        </div>
      )}

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Shadowing</h1>
            <p className="text-sm mt-0.5" style={{ color: '#999999' }}>Listen → Repeat → Score</p>
          </div>
          {userLevel !== selectedLevel && (
            <button
              onClick={() => handleLevelChange(userLevel)}
              className="text-xs font-medium px-3 py-1.5 rounded-full text-primary"
              style={{ background: 'rgba(139,92,246,0.12)' }}
            >
              Back to my level
            </button>
          )}
        </div>

        {/* ── Level selector tabs ── */}
        <div className="flex gap-2">
          {LEVEL_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleLevelChange(tab.value)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-card border-2 transition-all text-sm font-semibold"
              style={selectedLevel === tab.value
                ? { color: tab.color, background: `${tab.color}15`, borderColor: tab.color }
                : { borderColor: 'rgba(255,255,255,0.1)', color: '#666666', background: 'rgba(255,255,255,0.04)' }
              }
            >
              <span className="text-lg">{tab.emoji}</span>
              <span className="text-xs mt-0.5">{tab.label}</span>
              {tab.value === userLevel && (
                <span
                  className="text-[9px] font-bold mt-0.5 px-1.5 rounded-full"
                  style={{ background: tab.color, color: '#FFFFFF' }}
                >
                  MY LEVEL
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Session stats ── */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard value={sessionsDone.toString()} label="Sessions" color="#8B5CF6" />
          <StatCard value={sessionStats.sentencesAttempted.toString()} label="Sentences" color="#60A5FA" />
          <StatCard
            value={avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
            label="Accuracy"
            color={avgAccuracy >= 75 ? '#34D399' : avgAccuracy >= 50 ? '#8B5CF6' : '#666666'}
          />
          <StatCard value={`+${sessionStats.coinsEarned}`} label="Coins" color="#8B5CF6" />
        </div>

        {/* ── Tip of the day ── */}
        <div className="rounded-card px-4 py-3 flex items-start gap-2.5"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <span className="text-lg flex-shrink-0">💡</span>
          <p className="text-xs leading-relaxed" style={{ color: '#cccccc' }}>
            <span className="font-semibold text-primary">Tip: </span>
            {TIPS[tipIdx]}
          </p>
        </div>

        {/* ── Player ── */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />
          </div>
        ) : userId ? (
          <ShadowingPlayer
            key={selectedLevel}
            level={selectedLevel}
            onSentenceComplete={handleSentenceComplete}
            onSessionComplete={handleSessionComplete}
          />
        ) : null}
      </div>
    </div>
  )
}

// ─── Helper component ─────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="card text-center py-3 px-1">
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: '#666666' }}>{label}</p>
    </div>
  )
}
