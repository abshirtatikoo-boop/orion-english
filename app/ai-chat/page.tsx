'use client'

// Macalinka AI-ga — AI tutor chat page

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'
import AIChatWindow from '@/components/features/AIChatWindow'
import type { ChatLevel } from '@/lib/claude'

export default function AIChatPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [userLevel, setUserLevel] = useState<ChatLevel>('beginner')
  const [dailyUsed, setDailyUsed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000)
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/login'; return }

        const today = new Date().toISOString().split('T')[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [profileResult, countResult] = await Promise.all([
          supabase.from('users').select('coins, is_premium, level').eq('id', user.id).single() as any,
          supabase.from('coin_transactions').select('id', { count: 'exact' }).eq('user_id', user.id).eq('reason', 'AI chat message').gte('created_at', today),
        ])

        const profile = profileResult.data
        setUserId(user.id)
        setCoins(profile?.coins ?? 0)
        setIsPremium(profile?.is_premium ?? false)
        setUserLevel((profile?.level ?? 'beginner') as ChatLevel)
        setDailyUsed(countResult.count ?? 0)
        setLoading(false)
      } catch { setLoading(false) } finally { clearTimeout(t) }
    }
    init()
    return () => clearTimeout(t)
  }, [])

  const dailyLimit = 999

  return (
    <div className="flex flex-col h-screen" style={{ background: 'transparent' }}>
      <TopBar title="AI Tutor" coins={coins} showBack onBack={() => router.back()} />

      <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 pb-2">
        {/* Sub-header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h1 className="font-bold text-white">Orion AI Tutor</h1>
            <p className="text-xs capitalize" style={{ color: '#999999' }}>{userLevel} level · Ask anything</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: '#34D399' }}
            />
            <span className="text-xs" style={{ color: '#999999' }}>
              Unlimited
            </span>
          </div>
        </div>

        {/* Chat window fills remaining space */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col gap-3 pt-2">
              {[80, 55, 70, 45].map((w, i) => (
                <div key={i} className="flex gap-2" style={{ flexDirection: i % 2 === 0 ? 'row' : 'row-reverse' }}>
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="skeleton" style={{ width: `${w}%`, height: 40, borderRadius: 12 }} />
                </div>
              ))}
            </div>
          ) : userId ? (
            <AIChatWindow
              userId={userId}
              dailyMessagesUsed={dailyUsed}
              dailyLimit={dailyLimit}
              level={userLevel}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
