'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/ui/TopBar'
import { sendNotification } from '@/lib/notifications'
import { getCached, setCache } from '@/lib/cache'

// ── Types ──────────────────────────────────────────────────────────────────────

type RoomMember = {
  user_id: string
  users: {
    id: string
    name: string | null
    avatar_url: string | null
    is_premium: boolean
  } | null
}

type RoomRow = {
  id: string
  room_code: string | null
  name: string
  topic: string | null
  host_id: string
  is_private: boolean
  max_seats: number
  is_active: boolean
  created_at: string
  last_activity: string
  host?: { name: string | null; is_premium: boolean } | null
  member_count?: number
  members?: RoomMember[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TOPICS = ['Daily Life', 'Grammar', 'Phrases', 'Pronunciation', 'General']

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]

function memberGradient(userId: string) {
  const n = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1)
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length]
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RoomsListPage() {
  const router = useRouter()

  const [userId, setUserId]     = useState<string | null>(null)
  const [userName, setUserName] = useState('Learner')
  const [isPremium, setIsPremium] = useState(false)
  const [coins, setCoins]       = useState(0)

  const [rooms, setRooms]           = useState<RoomRow[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Create room modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName]           = useState('')
  const [createTopic, setCreateTopic]         = useState('General')
  const [createPrivate, setCreatePrivate]     = useState(false)
  const [createMaxSeats, setCreateMaxSeats]   = useState(5)
  const [creating, setCreating]               = useState(false)

  // Join by ID modal
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode]           = useState('')
  const [joiningById, setJoiningById]     = useState(false)
  const [joinError, setJoinError]         = useState('')

  // ── Load rooms ─────────────────────────────────────────────────────────────

  const loadRooms = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('rooms')
      .select('*, host:users!rooms_host_id_fkey(name, is_premium)')
      .eq('is_active', true)
      .order('last_activity', { ascending: false })

    const withData = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map(async (room: any) => {
        const [{ count }, { data: members }] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('room_members')
            .select('id', { count: 'exact' })
            .eq('room_id', room.id),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('room_members')
            .select('user_id, users(id, name, avatar_url, is_premium)')
            .eq('room_id', room.id)
            .limit(6),
        ])
        return { ...room, member_count: count ?? 0, members: members ?? [] }
      })
    )

    setRooms(withData as RoomRow[])
    return withData as RoomRow[]
  }, [])

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000)
    const init = async () => {
      try {
        const cached = getCached<{ rooms: RoomRow[] }>('rooms_data_v2')
        if (cached) {
          setRooms(cached.rooms)
          setLoading(false)
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/login'; return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await supabase
          .from('users')
          .select('name, level, is_premium, coins')
          .eq('id', user.id).single() as any

        setUserId(user.id)
        setUserName(profile?.name ?? 'Learner')
        setIsPremium(profile?.is_premium ?? false)
        setCoins(profile?.coins ?? 0)
        setCreateMaxSeats(10)

        supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [freshRooms, { data: following }] = await Promise.all([
          loadRooms(supabase),
          (supabase as any).from('follows').select('following_id').eq('follower_id', user.id),
        ])
        setFollowingIds((following ?? []).map((f: { following_id: string }) => f.following_id))
        setCache('rooms_data_v2', { rooms: freshRooms ?? [] })
        setLoading(false)
      } catch { setLoading(false) } finally { clearTimeout(t) }
    }
    init()
    return () => clearTimeout(t)
  }, [router, loadRooms])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRooms(createClient())
    setRefreshing(false)
  }

  const handleCreateRoom = async () => {
    if (!userId || !createName.trim() || creating) return
    setCreating(true)
    const supabase = createClient()
    const maxSeats  = Math.min(createMaxSeats, 10)
    const roomCode  = Math.floor(100000 + Math.random() * 900000).toString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newRoom, error } = await (supabase as any)
      .from('rooms')
      .insert({
        name: createName.trim(),
        topic: createTopic,
        host_id: userId,
        is_private: createPrivate,
        max_seats: maxSeats,
        is_active: true,
        room_code: roomCode,
        last_activity: new Date().toISOString(),
      })
      .select('id')
      .single()

    setCreating(false)
    if (error || !newRoom) return

    const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', userId)
    if (followers && followers.length > 0) {
      await Promise.all(followers.map(f =>
        sendNotification(supabase, f.follower_id, 'room_created', 'Room opened', `${userName} opened a room: ${createName.trim()}`, { roomId: newRoom.id })
      ))
    }

    setShowCreateModal(false)
    setCreateName('')
    setCreateTopic('General')
    setCreatePrivate(false)
    setCreateMaxSeats(isPremium ? 10 : 5)

    router.push(`/rooms/${newRoom.id}`)
  }

  const handleJoinById = async () => {
    if (joinCode.length !== 6 || joiningById) return
    setJoiningById(true)
    setJoinError('')
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: room } = await (supabase as any)
      .from('rooms')
      .select('id, max_seats, is_active')
      .eq('room_code', joinCode.trim())
      .eq('is_active', true)
      .single()

    if (!room) {
      setJoinError('Room not found')
      setJoiningById(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('room_members')
      .select('id', { count: 'exact' })
      .eq('room_id', room.id)

    if ((count ?? 0) >= room.max_seats) {
      setJoinError('Room is full')
      setJoiningById(false)
      return
    }

    setShowJoinModal(false)
    setJoinCode('')
    setJoiningById(false)
    router.push(`/rooms/${room.id}`)
  }

  const closeJoinModal = () => {
    setShowJoinModal(false)
    setJoinCode('')
    setJoinError('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const pillBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: 'none',
    color: '#ccc',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }

  const sortedRooms = [
    ...rooms.filter(r => followingIds.includes(r.host_id)),
    ...rooms.filter(r => !followingIds.includes(r.host_id)),
  ]

  return (
    <div className="bg-zone-rooms" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <TopBar title="Rooms" coins={coins} />

      {/* ── Page header ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
          Live Rooms
        </h1>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowJoinModal(true)} style={pillBtn}>
            Join by ID
          </button>
          <button onClick={() => setShowCreateModal(true)} style={pillBtn}>
            Create
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ ...pillBtn, opacity: refreshing ? 0.5 : 1, paddingLeft: 12, paddingRight: 12 }}
            aria-label="Refresh"
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.4s', transform: refreshing ? 'rotate(360deg)' : 'none' }}>
              ↻
            </span>
          </button>
        </div>
      </div>

      {/* ── Room list ── */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
            ))}
          </div>
        ) : sortedRooms.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 80, textAlign: 'center' }}>
            <span style={{ fontSize: 56 }}></span>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>No live rooms right now</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Create one and start talking!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedRooms.map(room => {
              const full    = (room.member_count ?? 0) >= room.max_seats
              const members = room.members ?? []

              return (
                <div
                  key={room.id}
                  onClick={() => !full && router.push(`/rooms/${room.id}`)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: full ? 'default' : 'pointer',
                    opacity: full ? 0.55 : 1,
                    minHeight: 80,
                  }}
                >
                  {/* LEFT: member avatars 2×2 */}
                  <div style={{ width: 100, minHeight: 80, display: 'flex', flexWrap: 'wrap', flexShrink: 0 }}>
                    {members.slice(0, 4).map(m => {
                      const u = m.users
                      return (
                        <div
                          key={m.user_id}
                          style={{
                            width: '50%',
                            height: 40,
                            background: u?.avatar_url
                              ? `url(${u.avatar_url}) center/cover no-repeat`
                              : memberGradient(m.user_id),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {!u?.avatar_url && (u?.name?.[0] ?? '?').toUpperCase()}
                        </div>
                      )
                    })}
                    {members.length === 0 && (
                      <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        
                      </div>
                    )}
                  </div>

                  {/* RIGHT: room name only */}
                  <div style={{ flex: 1, padding: '0 14px', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {room.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Room modal ── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 430,
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>Create a Room</p>
              <button onClick={() => setShowCreateModal(false)} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.65)' }}>Room Name</label>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Morning Practice"
                className="input"
                maxLength={40}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.65)' }}>Topic</label>
              <select value={createTopic} onChange={e => setCreateTopic(e.target.value)} className="input">
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Max Seats{' '}
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                  (up to 10)
                </span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 5, 7, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setCreateMaxSeats(n)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: createMaxSeats === n ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                      color: createMaxSeats === n ? '#000' : '#999',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>Private Room</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Only joinable by room ID</p>
              </div>
              <button
                onClick={() => setCreatePrivate(p => !p)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  background: createPrivate ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'block',
                    transform: createPrivate ? 'translateX(20px)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!createName.trim() || creating}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: !createName.trim() || creating ? 'default' : 'pointer',
                background: '#8B5CF6',
                color: '#fff',
                opacity: !createName.trim() || creating ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating…' : 'Create Room'}
            </button>
          </div>
        </div>
      )}

      {/* ── Join by ID modal ── */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={closeJoinModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 430,
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>Join by Room ID</p>
              <button onClick={closeJoinModal} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
              Enter the 6-digit code to join a private or specific room.
            </p>
            <input
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                setJoinError('')
              }}
              placeholder="000000"
              className="input text-center text-2xl font-mono tracking-[0.4em]"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            {joinError && (
              <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 600, color: '#FF6B6B', margin: 0 }}>
                {joinError}
              </p>
            )}
            <button
              onClick={handleJoinById}
              disabled={joinCode.length !== 6 || joiningById}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: joinCode.length !== 6 || joiningById ? 'default' : 'pointer',
                background: '#8B5CF6',
                color: '#fff',
                opacity: joinCode.length !== 6 || joiningById ? 0.5 : 1,
              }}
            >
              {joiningById ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
