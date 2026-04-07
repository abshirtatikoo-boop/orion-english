'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const SEEN_KEY = 'seen_shorts'

interface YTVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
}

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeenIds()
    seen.add(id)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch { /* ignore */ }
}

function clearSeen() {
  try {
    localStorage.removeItem(SEEN_KEY)
  } catch { /* ignore */ }
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─── Video slide ──────────────────────────────────────────────────────────────

function VideoSlide({ video, index, onVisible, userHasInteracted, onFirstInteraction }: {
  video: YTVideo
  index: number
  onVisible: (id: string) => void
  userHasInteracted: boolean
  onFirstInteraction: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [active, setActive] = useState(false)
  const [muted, setMuted] = useState(true)
  const notified = useRef(false)

  const sendCommand = (func: 'mute' | 'unMute') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: '' }),
      '*'
    )
  }

  // IntersectionObserver — activate when 70% visible
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setActive(visible)
        if (visible && !notified.current) {
          notified.current = true
          onVisible(video.id)
        }
      },
      { threshold: 0.7 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [video.id, onVisible])

  // When slide becomes active and user has already interacted, unmute
  useEffect(() => {
    if (active && userHasInteracted) {
      setMuted(false)
      // Small delay to let iframe load before sending postMessage
      const t = setTimeout(() => sendCommand('unMute'), 800)
      return () => clearTimeout(t)
    }
  }, [active, userHasInteracted])

  // After iframe loads, unmute if user has already interacted
  const handleLoad = () => {
    if (userHasInteracted) {
      sendCommand('unMute')
      setMuted(false)
    }
  }

  const toggleMute = () => {
    if (muted) {
      sendCommand('unMute')
      setMuted(false)
      if (!userHasInteracted) onFirstInteraction()
    } else {
      sendCommand('mute')
      setMuted(true)
    }
  }

  const handleTapOverlay = () => {
    onFirstInteraction()
    sendCommand('unMute')
    setMuted(false)
  }

  return (
    <div
      ref={ref}
      style={{
        height: '100vh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        flexShrink: 0,
        position: 'relative',
        background: '#000',
      }}
    >
      {active ? (
        <>
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&loop=1&controls=1&playlist=${video.id}&enablejsapi=1`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={`video-${index}`}
            onLoad={handleLoad}
          />

          {/* Tap to unmute — shown until user first interacts */}
          {!userHasInteracted && (
            <button
              onClick={handleTapOverlay}
              style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.65)',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                whiteSpace: 'nowrap',
              }}
            >
              🔊 Tap to unmute
            </button>
          )}

          {/* Speaker toggle — always shown when active */}
          <button
            onClick={toggleMute}
            style={{
              position: 'absolute',
              bottom: '80px',
              right: '16px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#111' }} />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShortsPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<YTVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [userHasInteracted, setUserHasInteracted] = useState(false)

  const handleFirstInteraction = useCallback(() => {
    setUserHasInteracted(true)
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
    }
    init()
  }, [router])

  const fetchVideos = useCallback(async (retried = false) => {
    setLoading(true)
    try {
      const tokenIndex = Math.floor(Math.random() * 6)
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent('english learning shorts')}&tokenIndex=${tokenIndex}`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()

      const raw: YTVideo[] = shuffle(data.videos ?? [])
      const seen = getSeenIds()
      const unseen = raw.filter(v => !seen.has(v.id))

      if (unseen.length === 0) {
        if (retried) {
          // Even after clearing we have nothing — just show all
          setVideos(raw)
        } else {
          // All videos seen — clear history and retry once
          clearSeen()
          fetchVideos(true)
          return
        }
      } else {
        setVideos(unseen)
      }
    } catch {
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleVisible = useCallback((id: string) => {
    markSeen(id)
  }, [])

  return (
    <div style={{ position: 'relative', height: '100vh', background: '#000' }}>
      <div style={{
        height: '100vh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
      }}>
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            height: '100vh',
            scrollSnapAlign: 'start',
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ))}

        {!loading && videos.map((video, i) => (
          <VideoSlide
            key={video.id}
            video={video}
            index={i}
            onVisible={handleVisible}
            userHasInteracted={userHasInteracted}
            onFirstInteraction={handleFirstInteraction}
          />
        ))}

        {!loading && videos.length === 0 && (
          <div style={{
            height: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No videos found</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
