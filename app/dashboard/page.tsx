'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface YTVideo {
  id: string
  title: string
  channelTitle: string
}

const FALLBACK_VIDEOS: YTVideo[] = [
  { id: 'dQw4w9WgXcQ', title: 'English Listening Practice', channelTitle: 'English Class' },
  { id: 'YBpdL9hSac4', title: 'Daily English Conversations', channelTitle: 'Learn English' },
  { id: '2OjCi5kXNYk', title: 'English Speaking Practice', channelTitle: 'BBC Learning' },
  { id: 'juKd26qkNAw', title: 'Common English Phrases', channelTitle: 'English Hub' },
  { id: 'ZjdBM7diWbY', title: 'English Vocabulary', channelTitle: 'Oxford English' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<YTVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) router.push('/login')
    })
  }, [router])

  // Fetch videos
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/youtube')
        const data = await res.json()
        if (data.videos?.length > 0) {
          setVideos(data.videos)
        } else {
          setVideos(FALLBACK_VIDEOS)
        }
      } catch {
        setVideos(FALLBACK_VIDEOS)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  // Filter out failed videos
  const validVideos = videos.filter(v => !failedIds.has(v.id))

  // Mark a video as failed and auto-scroll to next
  const handleFailed = useCallback((videoId: string) => {
    setFailedIds(prev => {
      if (prev.has(videoId)) return prev
      const next = new Set(prev)
      next.add(videoId)
      return next
    })
  }, [])

  // IntersectionObserver to track current video
  useEffect(() => {
    if (!validVideos.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!isNaN(idx)) setCurrentIndex(idx)
          }
        })
      },
      { threshold: 0.6 }
    )
    const slides = document.querySelectorAll('.video-slide')
    slides.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [validVideos])

  return (
    <div className="bg-zone-home" style={{ position: 'relative', height: '100vh' }}>
      <div
        ref={scrollRef}
        style={{
          height: 'calc(100vh - 80px)',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading && Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={{
            height: 'calc(100vh - 80px)',
            scrollSnapAlign: 'start',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #111 50%, #1a1a1a 100%)',
            backgroundSize: '100% 200%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }} />
        ))}

        {!loading && validVideos.map((video, index) => (
          <div
            key={video.id}
            className="video-slide"
            data-index={index}
            style={{
              height: 'calc(100vh - 80px)',
              scrollSnapAlign: 'start',
              background: '#000',
            }}
          >
            {Math.abs(index - currentIndex) <= 1 ? (
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?autoplay=${index === currentIndex ? 1 : 0}&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={video.title}
                onError={() => handleFailed(video.id)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#000' }} />
            )}
          </div>
        ))}

        {!loading && validVideos.length === 0 && (
          <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600 }}>No videos right now</p>
            <button
              onClick={() => { setLoading(true); window.location.reload() }}
              style={{
                marginTop: 8,
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer { 0%,100% { background-position: 0 0 } 50% { background-position: 0 100% } }`}</style>
    </div>
  )
}
