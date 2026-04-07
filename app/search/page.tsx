'use client'

// Raadinta dadka — Global user search page

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'
import LevelBadge from '@/components/ui/LevelBadge'

interface SearchUser {
  id: string
  name: string | null
  username: string | null
  avatar_url: string | null
  level: string | null
  country: string | null
  public_id: string | null
  is_premium: boolean
  isFollowing: boolean
}

function formatCountry(country: string | null | undefined): string | null {
  if (!country) return null
  const parts = country.trim().split(' ')
  return parts.length >= 2 ? parts.slice(1).join(' ') : country
}

function getFlag(country: string | null | undefined): string {
  if (!country) return ''
  return country.trim().split(' ')[0] ?? ''
}

function getFollowCountToday(): number {
  try {
    const today = new Date().toISOString().split('T')[0]
    const stored = localStorage.getItem('follow_count_today')
    if (!stored) return 0
    const parsed = JSON.parse(stored)
    return parsed.date === today ? (parsed.count ?? 0) : 0
  } catch { return 0 }
}

function incrementFollowCount() {
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem('follow_count_today', JSON.stringify({
    date: today,
    count: getFollowCountToday() + 1,
  }))
}

export default function SearchPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserCoins, setCurrentUserCoins] = useState<number>(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      const { data } = await (supabase as any).from('users').select('coins').eq('id', user.id).single()
      if (data) setCurrentUserCoins(data.coins ?? 0)
    })
    inputRef.current?.focus()
  }, [router])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const search = useCallback(async (q: string) => {
    if (!currentUserId || q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const supabase = createClient()
    const { data: found } = await (supabase as any)
      .from('users')
      .select('id, name, username, avatar_url, level, country, public_id, is_premium')
      .or(`username.ilike.%${q.trim()}%,name.ilike.%${q.trim()}%,public_id.eq.${q.trim()}`)
      .neq('id', currentUserId)
      .limit(20)

    const ids = (found ?? []).map((u: any) => u.id)
    let followingSet = new Set<string>()
    if (ids.length > 0) {
      const { data: myFollows } = await (supabase as any)
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', ids)
      followingSet = new Set((myFollows ?? []).map((r: any) => r.following_id))
    }

    setResults((found ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatar_url: u.avatar_url,
      level: u.level,
      country: u.country,
      public_id: u.public_id,
      is_premium: u.is_premium,
      isFollowing: followingSet.has(u.id),
    })))
    setSearching(false)
  }, [currentUserId])

  const handleInput = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 350)
  }

  const handleFollowToggle = async (targetId: string, currentlyFollowing: boolean) => {
    if (!currentUserId) return
    if (!currentlyFollowing && getFollowCountToday() >= 100) {
      showToast('Follow limit reached. Try again tomorrow.')
      return
    }
    const supabase = createClient()
    if (currentlyFollowing) {
      await (supabase as any).from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId)
    } else {
      await (supabase as any).from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      incrementFollowCount()
    }
    setResults(prev => prev.map(u => u.id === targetId ? { ...u, isFollowing: !currentlyFollowing } : u))
  }

  return (
    <div className="flex flex-col min-h-screen bg-zone-search" style={{ paddingBottom: 88 }}>
      <TopBar title="Search" coins={currentUserCoins} />

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Search bar */}
        <div className="glass flex items-center gap-2 rounded-2xl px-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Name, @username or 6-digit ID…"
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-[#555] py-3"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} style={{ color: 'rgba(255,255,255,0.4)' }}>
              ✕
            </button>
          )}
        </div>

        {/* States */}
        {query.trim().length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Search for people by name,<br />@username or 6-digit ID
            </p>
          </div>
        )}

        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="text-center text-sm py-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Type at least 2 characters…
          </p>
        )}

        {searching && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No users found for <span className="text-white font-semibold">"{query}"</span>
            </p>
          </div>
        )}

        {/* Results */}
        {!searching && results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map(u => {
              const initials = (u.name ?? u.username ?? '?')[0].toUpperCase()
              return (
                <div key={u.id} className="glass glass-interactive p-4 flex items-center gap-3">
                  {/* Avatar — click to view profile */}
                  <button
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: u.is_premium ? '2px solid #8B5CF6' : 'none' }}
                    onClick={() => router.push(`/profile?view=${u.public_id}`)}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : initials
                    }
                  </button>

                  {/* Info */}
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => router.push(`/profile?view=${u.public_id}`)}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">
                        {u.is_premium && <span className="mr-0.5" style={{color:'#8B5CF6',fontSize:10,fontWeight:700}}>PRO</span>}
                        {u.name ?? u.username ?? 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {u.username && (
                        <p className="text-xs" style={{ color: '#8B5CF6' }}>@{u.username}</p>
                      )}
                      {u.country && (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {getFlag(u.country)} {formatCountry(u.country)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {u.level && <LevelBadge level={u.level as any} size="sm" />}
                      {u.public_id && (
                        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          ID: {u.public_id}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Follow button */}
                  <button
                    onClick={() => handleFollowToggle(u.id, u.isFollowing)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                    style={u.isFollowing
                      ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }
                      : { background: '#8B5CF6', color: '#FFFFFF' }
                    }
                  >
                    {u.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 z-[70] px-4 py-2.5 rounded-full text-sm font-semibold text-white pointer-events-none"
          style={{ transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}
        >
          {toast}
        </div>
      )}

    </div>
  )
}
