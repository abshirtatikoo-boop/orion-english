'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'


// ─── Types ────────────────────────────────────────────────────────────────────

interface YTVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
}

type Filter = 'all' | 'beginner' | 'intermediate' | 'advanced'

// ─── Config ───────────────────────────────────────────────────────────────────

const FILTER_QUERIES: Record<Filter, string> = {
  all:          'english learning shorts',
  beginner:     'english for beginners shorts',
  intermediate: 'intermediate english conversation shorts',
  advanced:     'advanced english vocabulary shorts',
}

const FILTER_TABS: { value: Filter; label: string }[] = [
  { value: 'all',          label: 'All' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

const LEVEL_STYLE: Record<Filter, { color: string; bg: string }> = {
  all:          { color: '#8B5CF6', bg: '#E8F7F2' },
  beginner:     { color: '#3B82F6', bg: '#EFF6FF' },
  intermediate: { color: '#EF9F27', bg: '#FEF7E8' },
  advanced:     { color: '#8B5CF6', bg: '#E8F7F2' },
}

const TOPIC_BUTTONS = [
  { label: 'Daily Life',    query: 'daily life english shorts' },
  { label: 'Grammar',       query: 'english grammar tips shorts' },
  { label: 'Phrases',       query: 'useful english phrases shorts' },
  { label: 'Pronunciation', query: 'english pronunciation shorts' },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VideoSkeleton() {
  return (
    <div className="card flex gap-3 animate-pulse">
      <div className="w-24 h-16 rounded-lg bg-gray-200 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2 py-1">
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-2/5" />
        <div className="h-3 bg-gray-200 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TikTokFeedPage() {
  const router = useRouter()
  const [coins, setCoins] = useState(0)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [activeQuery, setActiveQuery] = useState(FILTER_QUERIES['all'])
  const [videos, setVideos] = useState<YTVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await supabase.from('users').select('coins').eq('id', user.id).single() as any
      setCoins(profile?.coins ?? 0)
    }
    init()
  }, [router])

  // Fetch videos whenever query changes
  const fetchVideos = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setVideos(data.videos ?? [])
    } catch {
      setError('Could not load videos. Check your API key or connection.')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos(activeQuery)
  }, [activeQuery, fetchVideos])

  const handleFilterChange = (f: Filter) => {
    setActiveFilter(f)
    setActiveQuery(FILTER_QUERIES[f])
  }

  const handleTopic = (query: string) => {
    setActiveFilter('all')
    setActiveQuery(query)
  }

  const activeStyle = LEVEL_STYLE[activeFilter]

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Video Learn" coins={coins} />

      {/* Filter bar */}
      <div className="flex gap-1.5 px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 overflow-x-auto">
        {FILTER_TABS.map(tab => {
          const active = activeFilter === tab.value
          const s = LEVEL_STYLE[tab.value]
          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={
                active
                  ? { background: s.bg, color: s.color }
                  : { background: '#F3F4F6', color: '#6B7280' }
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Topic buttons */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0 overflow-x-auto">
        {TOPIC_BUTTONS.map(t => (
          <button
            key={t.label}
            onClick={() => handleTopic(t.query)}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50 transition-all"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Video list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
        style={{ borderTop: `3px solid ${activeStyle.color}` }}
      >
        {loading && Array.from({ length: 6 }).map((_, i) => <VideoSkeleton key={i} />)}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={() => fetchVideos(activeQuery)}
              className="btn-primary text-sm px-5"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-4xl"></span>
            <p className="text-sm text-gray-400">No videos found</p>
          </div>
        )}

        {!loading && !error && videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            levelFilter={activeFilter}
            onShadow={() => router.push('/shadowing')}
          />
        ))}
      </div>


    </div>
  )
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({
  video,
  levelFilter,
  onShadow,
}: {
  video: YTVideo
  levelFilter: Filter
  onShadow: () => void
}) {
  const s = LEVEL_STYLE[levelFilter]
  const levelLabel = levelFilter === 'all' ? null : levelFilter.charAt(0).toUpperCase() + levelFilter.slice(1)

  return (
    <div className="card flex flex-col gap-3">
      {/* Thumbnail + text row */}
      <div className="flex gap-3">
        <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📹</div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {video.title}
          </p>
          <p className="text-xs text-gray-400 truncate">{video.channelTitle}</p>
          {levelLabel && (
            <span
              className="self-start text-xs font-bold px-2 py-0.5 rounded-full mt-0.5"
              style={{ background: s.bg, color: s.color }}
            >
              {levelLabel}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <a
          href={`https://www.youtube.com/shorts/${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white font-bold text-xs py-2.5 rounded-btn"
        >
          <span>▶</span>
          <span>Watch</span>
        </a>
        <button
          onClick={onShadow}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-btn bg-white"
        >
          <span></span>
          <span>Shadow</span>
        </button>
      </div>
    </div>
  )
}
