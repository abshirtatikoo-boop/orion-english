'use client'

// Ereyada aad keydsatay — My Words & Stats page (upgraded)

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, type SavedWordRow, type UserRow } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'
import LevelBadge from '@/components/ui/LevelBadge'
import CoinDisplay from '@/components/ui/CoinDisplay'
import { COIN_REWARDS } from '@/lib/coins'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'words' | 'stats'

// ─── Vocab milestone (word count → rank) ─────────────────────────────────────

const MILESTONES = [
  { label: 'Starter',  threshold: 0  },
  { label: 'Learner',  threshold: 20 },
  { label: 'Reader',   threshold: 50 },
  { label: 'Scholar',  threshold: 100 },
]

function vocabMilestone(count: number) {
  let current = MILESTONES[0]
  let next    = MILESTONES[1]
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (count >= MILESTONES[i].threshold) {
      current = MILESTONES[i]
      next    = MILESTONES[i + 1] ?? null!
      break
    }
  }
  const progress = next
    ? Math.round(((count - current.threshold) / (next.threshold - current.threshold)) * 100)
    : 100
  return { current, next, progress }
}

// ─── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  shadowing: 'from shadowing',
  reading:   'from reading',
  tiktok:    'from TikTok',
}

const SOURCE_COLOR: Record<string, { bg: string; text: string }> = {
  shadowing: { bg: '#0F1C2E', text: '#60A5FA' },
  reading:   { bg: '#0A2218', text: '#34D399' },
  tiktok:    { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const router = useRouter()
  const [user, setUser]   = useState<UserRow | null>(null)
  const [words, setWords] = useState<SavedWordRow[]>([])
  const [tab, setTab]     = useState<Tab>('words')
  const [search, setSearch]             = useState('')
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const [{ data: profile }, { data: wordData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('saved_words').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ])

      setUser(profile)
      setWords(wordData ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteWord = async (id: string) => {
    const supabase = createClient()
    await supabase.from('saved_words').delete().eq('id', id)
    setWords(prev => prev.filter(w => w.id !== id))
    setDeletingId(null)
  }

  const handleHearWord = (word: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = 'en-US'
    utt.rate = 0.9
    window.speechSynthesis.speak(utt)
  }

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => setDeletingId(id), 600)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const filteredWords = words.filter(w =>
    !search || w.word.toLowerCase().includes(search.toLowerCase())
  )

  const bySource = {
    shadowing: words.filter(w => w.source === 'shadowing').length,
    reading:   words.filter(w => w.source === 'reading').length,
    tiktok:    words.filter(w => w.source === 'tiktok').length,
  }
  const coinsFromWords   = words.length * COIN_REWARDS.SAVE_WORD
  const startOfWeek = (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  })()
  const thisWeekWords = words.filter(w => new Date(w.created_at) >= startOfWeek).length
  const milestone = vocabMilestone(words.length)

  return (
    <div className="flex flex-col pb-20 min-h-screen" style={{ background: 'transparent' }}>
      <TopBar title="My Vocabulary" coins={user?.coins ?? 0} />

      <div className="px-4 pt-5 flex flex-col gap-4">

        {loading && (
          <div className="flex flex-col gap-3">
            <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 rounded-btn p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['words', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-semibold rounded-btn transition-colors"
              style={tab === t
                ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }
                : { color: '#666666' }
              }
            >
              {t === 'words'
                ? `📖 My Words (${words.length})`
                : '📊 Stats'
              }
            </button>
          ))}
        </div>

        {/* ════════════════ MY WORDS TAB ════════════════ */}
        {tab === 'words' && (
          <>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search saved words…"
              className="input"
            />

            {filteredWords.length === 0 ? (
              <div className="text-center py-14" style={{ color: '#666666' }}>
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm font-medium text-white">No words saved yet</p>
                <p className="text-xs mt-1.5 leading-relaxed">
                  {search
                    ? 'No words match your search.'
                    : 'Save words while shadowing to build your vocabulary!'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-center" style={{ color: '#666666' }}>Hold a word to delete it</p>

                {filteredWords.map(word => {
                  const srcStyle = SOURCE_COLOR[word.source ?? 'reading'] ?? SOURCE_COLOR.reading
                  const isDeleting = deletingId === word.id

                  return (
                    <div
                      key={word.id}
                      className="card transition-all"
                      style={isDeleting ? { borderColor: '#5A1A1A', background: '#2A0A0A' } : {}}
                      onPointerDown={() => startLongPress(word.id)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                    >
                      {isDeleting ? (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold" style={{ color: '#FF6B6B' }}>Delete "{word.word}"?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs px-3 py-1.5 rounded-full"
                              style={{ color: '#999999', background: 'rgba(255,255,255,0.1)' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteWord(word.id)}
                              className="text-xs text-white px-3 py-1.5 rounded-full font-semibold"
                              style={{ background: '#EF4444' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-extrabold text-white">{word.word}</p>

                            {word.meaning_somali && (
                              <p className="text-sm mt-0.5" style={{ color: '#999999' }}>{word.meaning_somali}</p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: srcStyle.bg, color: srcStyle.text }}
                              >
                                {SOURCE_LABEL[word.source ?? 'reading']}
                              </span>
                              <span className="text-[10px]" style={{ color: '#666666' }}>
                                {new Date(word.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleHearWord(word.word)}
                            onPointerDown={e => e.stopPropagation()}
                            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base"
                            style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                            aria-label={`Hear ${word.word}`}
                          >
                            🔊
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════ STATS TAB ════════════════ */}
        {tab === 'stats' && user && (
          <div className="flex flex-col gap-4">

            {/* Profile row */}
            <div className="card flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)' }}>
                <span className="text-2xl font-bold text-primary">
                  {(user.name ?? 'L')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{user.name ?? 'Learner'}</p>
                <p className="text-xs truncate" style={{ color: '#666666' }}>{user.email}</p>
                <div className="mt-1.5">
                  <LevelBadge level={user.level} size="sm" />
                </div>
              </div>
              <CoinDisplay coins={user.coins} size="sm" />
            </div>

            {/* Top stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="card text-center py-3">
                <p className="text-2xl font-extrabold text-primary">{words.length}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#666666' }}>Total Words</p>
              </div>
              <div className="card text-center py-3">
                <p className="text-2xl font-extrabold text-primary">{thisWeekWords}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#666666' }}>This Week</p>
              </div>
              <div className="card text-center py-3">
                <p className="text-2xl font-extrabold text-primary">{user.streak}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#666666' }}>Day Streak</p>
              </div>
            </div>

            {/* Words by source */}
            <div className="card flex flex-col gap-3">
              <p className="font-bold text-sm text-white">Words by source</p>
              {(Object.entries(bySource) as [string, number][]).map(([src, count]) => {
                const srcStyle = SOURCE_COLOR[src] ?? SOURCE_COLOR.reading
                const pct = words.length > 0 ? Math.round((count / words.length) * 100) : 0
                return (
                  <div key={src} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium" style={{ color: srcStyle.text }}>
                        {SOURCE_LABEL[src]}
                      </span>
                      <span style={{ color: '#666666' }}>{count} word{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: srcStyle.text }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Coins from saving words */}
            <div className="card flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-white">Coins from vocabulary</p>
                <p className="text-xs mt-0.5" style={{ color: '#666666' }}>
                  {words.length} words × {COIN_REWARDS.SAVE_WORD} coins
                </p>
              </div>
              <span className="text-xl font-extrabold text-primary">+{coinsFromWords} </span>
            </div>

            {/* Vocab milestone progress */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-white">
                  Vocabulary rank: {milestone.current.label}
                </p>
                {!milestone.next && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black bg-primary">
                    Max!
                  </span>
                )}
              </div>
              {milestone.next && (
                <>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: '#666666' }}>
                    {milestone.next.threshold - words.length} more words to reach{' '}
                    <span className="font-semibold text-white">{milestone.next.label}</span>
                  </p>
                </>
              )}
            </div>

            {/* Member since */}
            <p className="text-center text-xs" style={{ color: '#666666' }}>
              Member since{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full text-sm font-medium py-3 rounded-btn"
              style={{ color: '#FF6B6B', border: '1px solid #5A1A1A', background: '#2A0A0A' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
