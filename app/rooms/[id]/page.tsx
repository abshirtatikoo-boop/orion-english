'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { sendNotification } from '@/lib/notifications'
import RoomHeader from '@/components/rooms/RoomHeader'
import SpeakerStage from '@/components/rooms/SpeakerStage'
import BottomControls from '@/components/rooms/BottomControls'
import ReactionSystem, { type FloatingReaction } from '@/components/rooms/ReactionSystem'
import ChatPanel from '@/components/rooms/ChatPanel'

// Types
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
}

type RoomMember = {
  id: string
  room_id: string
  user_id: string
  is_admin: boolean
  is_muted: boolean
  joined_at: string
  seat_number: number | null
  user?: { name: string | null; username?: string | null; level: string | null; is_premium: boolean; avatar_url?: string | null } | null
}

type RoomMessage = {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
  sender?: { name: string | null; level: string | null; is_premium: boolean } | null
}

type ProfileData = {
  id: string
  name: string | null
  username: string | null
  avatar_url: string | null
  country: string | null
  is_premium: boolean
  level: string | null
  coins: number
  streak: number
  created_at: string | null
  followers_count: number
  following_count: number
}

// Helpers
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: '#0F1C2E', text: '#60A5FA' },
  intermediate: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6' },
  advanced:     { bg: '#0A2218', text: '#34D399' },
}

function countryFlag(country: string | null): string {
  if (!country) return ''
  if (country.length === 2) {
    const pts = country.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
    return String.fromCodePoint(...pts)
  }
  return country
}

// Page
export default function RoomPage() {
  const router  = useRouter()
  const params  = useParams()
  const roomId  = params.id as string

  // Auth / profile
  const [userId, setUserId]         = useState<string | null>(null)
  const [userName, setUserName]     = useState('Learner')
  const [userLevel, setUserLevel]   = useState('beginner')
  const [isPremium, setIsPremium]   = useState(false)

  // Room state
  const [room, setRoom]         = useState<RoomRow | null>(null)
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [members, setMembers]   = useState<RoomMember[]>([])
  const [isMuted, setIsMuted]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [copiedId, setCopiedId] = useState(false)

  // Profile modal
  const [profileUserId, setProfileUserId]   = useState<string | null>(null)
  const [profileData, setProfileData]       = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isFollowing, setIsFollowing]       = useState(false)
  const [followLoading, setFollowLoading]   = useState(false)
  const [dmText, setDmText]                 = useState('')
  const [dmSending, setDmSending]           = useState(false)
  const [dmSent, setDmSent]                 = useState(false)
  const [showDmInput, setShowDmInput]       = useState(false)

  // Modals / overlays
  const [showCloseConfirm, setShowCloseConfirm]   = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTarget, setTransferTarget]       = useState('')
  const [transferring, setTransferring]           = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm]   = useState(false)

  // Seat join
  const [hasJoined, setHasJoined] = useState(false)
  const [joining, setJoining]     = useState(false)

  // Voice chat
  const [voiceMuted, setVoiceMuted] = useState(true)
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([])
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)

  // Clubhouse UI state
  const [chatOpen, setChatOpen]                       = useState(false)
  const [reactionsOpen, setReactionsOpen]             = useState(false)
  const [handRaised, setHandRaised]                   = useState(false)
  const [floatingReactions, setFloatingReactions]     = useState<FloatingReaction[]>([])
  const [handRaisedUsers, setHandRaisedUsers]         = useState<string[]>([])
  const [voiceUsers, setVoiceUsers]                   = useState<string[]>([])

  // Join toast
  const [joinToast, setJoinToast]               = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabaseRef  = useRef(createClient())
  const channelRef   = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uidRef       = useRef('')
  const hostIdRef    = useRef('')
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Record<string, RTCPeerConnection>>({})
  const signalingChannelRef = useRef<RealtimeChannel | null>(null)
  const speakingIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Load members
  const loadMembers = useCallback(async (
    supabase: ReturnType<typeof createClient>,
    uid: string,
    rid: string,
    hostId: string,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mems } = await (supabase as any)
      .from('room_members')
      .select('*, user:users(name, username, level, is_premium, avatar_url)')
      .eq('room_id', rid)
    const memList = (mems ?? []) as RoomMember[]
    setMembers(memList)
    const me = memList.find(m => m.user_id === uid)
    setIsMuted(me?.is_muted ?? false)
    setIsAdmin(hostId === uid || (me?.is_admin ?? false))
    return memList
  }, [])

  // Init
  useEffect(() => {
    const supabase = supabaseRef.current

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      uidRef.current = user.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('name, level, is_premium, coins')
        .eq('id', user.id).single() as any
      if (profileErr) console.error('[RoomPage] profile fetch:', profileErr)

      setUserId(user.id)
      setUserName(profile?.name ?? 'Learner')
      setUserLevel(profile?.level ?? 'beginner')
      setIsPremium(profile?.is_premium ?? false)

      // Load room
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roomData, error: roomErr } = await (supabase as any)
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      if (roomErr) console.error('[RoomPage] rooms fetch (check room_code column exists):', roomErr)

      if (!roomData || !roomData.is_active) {
        router.push('/rooms')
        return
      }
      hostIdRef.current = roomData.host_id
      setRoom(roomData as RoomRow)

      // Check if already a member (re-enter flow)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingMember } = await (supabase as any)
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingMember) {
        setHasJoined(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('rooms')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', roomId)
      }
      // else: hasJoined stays false "seat selection overlay will be shown

      // Update last_seen
      await supabase.from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)

      // Load messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs, error: msgsErr } = await (supabase as any)
        .from('room_messages')
        .select('*, sender:users(name, level, is_premium)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(80)
      if (msgsErr) console.error('[RoomPage] messages fetch:', msgsErr)
      setMessages((msgs ?? []) as RoomMessage[])

      await loadMembers(supabase, user.id, roomId, roomData.host_id)

      // Heartbeat: keep room alive every 30 seconds
      heartbeatRef.current = setInterval(async () => {
        await supabase.from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', uidRef.current)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('rooms')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', roomId)
      }, 30 * 1000)

      setLoading(false)
    }

    init()

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [roomId, router, loadMembers])

  //  Realtime subscriptions (single channel, all listeners before subscribe) 

  useEffect(() => {
    if (!roomId) return
    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        async payload => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as RoomMessage
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: sender } = await supabase
              .from('users').select('name, level, is_premium').eq('id', newMsg.user_id).single() as any
            setMessages(prev => [...prev, { ...newMsg, sender }])
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            setMessages(prev => prev.filter(m => m.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async payload => {
          await loadMembers(supabase, uidRef.current, roomId, hostIdRef.current)
          const newUserId = (payload.new as { user_id: string }).user_id
          if (newUserId !== uidRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: joined } = await supabase
              .from('users').select('name').eq('id', newUserId).single() as any
            if (joined?.name) {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
              setJoinToast(`${joined.name} joined the room`)
              toastTimeoutRef.current = setTimeout(() => setJoinToast(null), 3000)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async payload => {
          const removedUserId = (payload.old as { user_id?: string }).user_id
          if (removedUserId) {
            setMembers(prev => prev.filter(m => m.user_id !== removedUserId))
          }
          await loadMembers(supabase, uidRef.current, roomId, hostIdRef.current)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async () => {
          await loadMembers(supabase, uidRef.current, roomId, hostIdRef.current)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        payload => {
          const updated = payload.new as RoomRow
          if (!updated.is_active) {
            router.push('/rooms')
          } else {
            setRoom(updated)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch follow state whenever a profile popup opens
  useEffect(() => {
    if (!profileUserId || profileUserId === uidRef.current) return
    console.log('useEffect follow check "profileUserId:', profileUserId, 'me:', uidRef.current)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabaseRef.current as any)
      .from('follows')
      .select('id')
      .eq('follower_id', uidRef.current)
      .eq('following_id', profileUserId)
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        console.log('follow row:', data)
        setIsFollowing(!!data)
      })
  }, [profileUserId])

  // Auto-scroll handled inside ChatPanel component

  // Backup member refresh every 15 seconds
  useEffect(() => {
    if (!roomId) return
    const interval = setInterval(() => {
      loadMembers(supabaseRef.current, uidRef.current, roomId, hostIdRef.current)
    }, 15000)
    return () => clearInterval(interval)
  }, [roomId, loadMembers])

  // Voice chat (WebRTC signaling via Supabase Broadcast)
  useEffect(() => {
    if (!userId || !roomId) return
    const supabase = supabaseRef.current

    const setupRemoteSpeaker = (remoteId: string, stream: MediaStream) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = window.AudioContext ?? (window as any).webkitAudioContext
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AC()
        }
        const analyser = audioCtxRef.current!.createAnalyser()
        analyser.fftSize = 256
        audioCtxRef.current!.createMediaStreamSource(stream).connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        speakingIntervalsRef.current[remoteId] = setInterval(() => {
          analyser.getByteFrequencyData(data)
          const level = data.reduce((s, v) => s + v, 0) / data.length
          setSpeakingUsers(prev =>
            level > 20
              ? prev.includes(remoteId) ? prev : [...prev, remoteId]
              : prev.filter(id => id !== remoteId)
          )
        }, 100)
      } catch { /* non-critical */ }
    }

    const createPeer = (remoteId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
      }
      pc.ontrack = (e) => {
        const audio = new Audio()
        audio.srcObject = e.streams[0]
        audio.play().catch(() => {})
        setupRemoteSpeaker(remoteId, e.streams[0])
      }
      pc.onicecandidate = (e) => {
        if (e.candidate && signalingChannelRef.current) {
          signalingChannelRef.current.send({
            type: 'broadcast',
            event: 'ice',
            payload: { candidate: e.candidate, from: uidRef.current, to: remoteId },
          })
        }
      }
      return pc
    }

    const signalingChannel = supabase.channel(`voice_${roomId}`)
    signalingChannelRef.current = signalingChannel

    signalingChannel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'voice_join' }, async ({ payload }: { payload: any }) => {
        if (payload.userId === uidRef.current) return
        setVoiceUsers(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId])
        const pc = createPeer(payload.userId)
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          signalingChannel.send({ type: 'broadcast', event: 'offer', payload: { offer, from: uidRef.current, to: payload.userId } })
          peersRef.current[payload.userId] = pc
        } catch { pc.close() }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'voice_leave' }, ({ payload }: { payload: any }) => {
        setVoiceUsers(prev => prev.filter(id => id !== payload.userId))
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'offer' }, async ({ payload }: { payload: any }) => {
        if (payload.to !== uidRef.current) return
        const pc = createPeer(payload.from)
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          signalingChannel.send({ type: 'broadcast', event: 'answer', payload: { answer, from: uidRef.current, to: payload.from } })
          peersRef.current[payload.from] = pc
        } catch { pc.close() }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: any }) => {
        if (payload.to !== uidRef.current) return
        try { await peersRef.current[payload.from]?.setRemoteDescription(new RTCSessionDescription(payload.answer)) } catch { /* ignore */ }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'ice' }, async ({ payload }: { payload: any }) => {
        if (payload.to !== uidRef.current) return
        try { await peersRef.current[payload.from]?.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch { /* ignore */ }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'reaction' }, ({ payload }: { payload: any }) => {
        if (payload.userId === uidRef.current) return
        const id = Date.now().toString() + payload.userId
        setFloatingReactions(prev => [...prev, { id, emoji: payload.emoji, userId: payload.userId }])
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('broadcast', { event: 'hand_raise' }, ({ payload }: { payload: any }) => {
        if (payload.raised) {
          setHandRaisedUsers(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId])
        } else {
          setHandRaisedUsers(prev => prev.filter(id => id !== payload.userId))
        }
      })
      .subscribe()

    return () => {
      Object.values(peersRef.current).forEach(pc => pc.close())
      peersRef.current = {}
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      Object.values(speakingIntervalsRef.current).forEach(id => clearInterval(id))
      speakingIntervalsRef.current = {}
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
      supabase.removeChannel(signalingChannel)
      signalingChannelRef.current = null
      setVoiceMuted(true)
      setSpeakingUsers([])
      setVoiceUsers([])
      setHandRaisedUsers([])
      setFloatingReactions([])
    }
  }, [userId, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // (particles removed "replaced by radial gradient background)

  // Actions
  const cleanup = () => {
    if (channelRef.current) supabaseRef.current.removeChannel(channelRef.current)
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    Object.values(peersRef.current).forEach(pc => pc.close())
    peersRef.current = {}
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (signalingChannelRef.current) supabaseRef.current.removeChannel(signalingChannelRef.current)
    Object.values(speakingIntervalsRef.current).forEach(id => clearInterval(id))
    speakingIntervalsRef.current = {}
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
    audioCtxRef.current = null
  }

  const leaveRoom = async () => {
    if (!userId) return
    const supabase = supabaseRef.current
    await supabase.from('room_members')
      .delete().eq('room_id', roomId).eq('user_id', userId)
    cleanup()
    router.push('/rooms')
  }

  const closeRoom = async () => {
    if (!userId || !room) return
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rooms').update({ is_active: false }).eq('id', room.id)
    await supabase.from('room_members').delete().eq('room_id', room.id)
    cleanup()
    router.push('/rooms')
  }

  const transferAdmin = async () => {
    if (!transferTarget || !room || !userId || transferring) return
    setTransferring(true)
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('room_members')
      .update({ is_admin: true })
      .eq('room_id', room.id).eq('user_id', transferTarget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rooms')
      .update({ host_id: transferTarget })
      .eq('id', room.id)
    await supabase.from('room_members')
      .delete().eq('room_id', room.id).eq('user_id', userId)
    cleanup()
    setTransferring(false)
    router.push('/rooms')
  }

  const deleteMessage = async (messageId: string) => {
    const supabase = createClient()
    await supabase.from('room_messages').delete().eq('id', messageId)
    // realtime DELETE event will remove it from state for all members
  }

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !userId || isMuted) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('room_messages').insert({ room_id: roomId, user_id: userId, content: trimmed })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('rooms')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', roomId)
    } catch { /* ignore */ }
  }, [userId, isMuted, roomId])

  const muteMember = async (memberId: string, muted: boolean) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('room_members').update({ is_muted: muted }).eq('id', memberId)
    setProfileUserId(null)
  }

  const makeAdmin = async (memberId: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('room_members').update({ is_admin: true }).eq('id', memberId)
    setProfileUserId(null)
  }

  const removeMember = async (memberUserId: string) => {
    const supabase = createClient()
    await supabase.from('room_members')
      .delete().eq('room_id', roomId).eq('user_id', memberUserId)
    setProfileUserId(null)
  }

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setJoinToast(msg)
    toastTimeoutRef.current = setTimeout(() => setJoinToast(null), 3000)
  }

  const handleReaction = useCallback((emoji: string) => {
    if (!userId) return
    const id = Date.now().toString()
    setFloatingReactions(prev => [...prev, { id, emoji, userId }])
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000)
    signalingChannelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji, userId },
    })
  }, [userId])

  const handleRaiseHand = useCallback(() => {
    if (!userId) return
    const newRaised = !handRaised
    setHandRaised(newRaised)
    signalingChannelRef.current?.send({
      type: 'broadcast',
      event: 'hand_raise',
      payload: { userId, raised: newRaised },
    })
  }, [handRaised, userId])

  const toggleVoice = async () => {
    if (!userId) return
    if (!voiceMuted) {
      // Mute: stop local stream and clear speaking interval
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      if (speakingIntervalsRef.current['_local']) {
        clearInterval(speakingIntervalsRef.current['_local'])
        delete speakingIntervalsRef.current['_local']
      }
      setSpeakingUsers(prev => prev.filter(id => id !== userId))
      setVoiceUsers(prev => prev.filter(id => id !== userId))
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'voice_leave',
        payload: { userId },
      })
      setVoiceMuted(true)
    } else {
      // Unmute: request mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream
        // Add tracks to any existing peer connections
        Object.values(peersRef.current).forEach(pc => {
          stream.getTracks().forEach(t => {
            try { pc.addTrack(t, stream) } catch { /* ignore */ }
          })
        })
        // Announce presence to other peers
        signalingChannelRef.current?.send({
          type: 'broadcast',
          event: 'voice_join',
          payload: { userId },
        })
        setVoiceUsers(prev => prev.includes(userId) ? prev : [...prev, userId])
        // Local speaking detection
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const AC = window.AudioContext ?? (window as any).webkitAudioContext
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AC()
          }
          if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume()
          const analyser = audioCtxRef.current.createAnalyser()
          analyser.fftSize = 256
          audioCtxRef.current.createMediaStreamSource(stream).connect(analyser)
          const data = new Uint8Array(analyser.frequencyBinCount)
          speakingIntervalsRef.current['_local'] = setInterval(() => {
            analyser.getByteFrequencyData(data)
            const level = data.reduce((s, v) => s + v, 0) / data.length
            setSpeakingUsers(prev =>
              level > 20
                ? prev.includes(userId) ? prev : [...prev, userId]
                : prev.filter(id => id !== userId)
            )
          }, 100)
        } catch { /* speaking detection non-critical */ }
        setVoiceMuted(false)
        setMicPermissionDenied(false)
      } catch {
        setMicPermissionDenied(true)
        showToast('Microphone access needed')
      }
    }
  }

  const joinSeat = async (seatNum: number) => {
    if (joining || !userId || !room) return
    setJoining(true)
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('room_members').insert({
      room_id: roomId,
      user_id: userId,
      is_admin: room.host_id === userId,
      is_muted: false,
      seat_number: seatNum,
    })
    if (!error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('rooms')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', roomId)
      await loadMembers(supabase, userId, roomId, room.host_id)
      setHasJoined(true)
    }
    setJoining(false)
  }

  const copyRoomId = async () => {
    if (!room?.room_code) return
    await navigator.clipboard.writeText(room.room_code)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleBack = () => {
    if (!room) { router.push('/rooms'); return }
    const isHost = room.host_id === userId
    if (isHost) {
      const others = members.filter(m => m.user_id !== userId)
      if (others.length > 0) {
        setShowTransferModal(true)
      } else {
        setShowCloseConfirm(true)
      }
    } else {
      setShowLeaveConfirm(true)
    }
  }

  // Profile modal actions
  const openProfile = async (uid: string) => {
    console.log('openProfile "clickedUser.id:', uid)
    console.log('openProfile "currentUser.id (uidRef):', uidRef.current)
    console.log('openProfile "isSelf:', uid === uidRef.current)
    setProfileUserId(uid)
    setProfileData(null)
    setIsFollowing(false)
    setShowDmInput(false)
    setDmText('')
    setDmSent(false)
    setProfileLoading(true)
    const supabase = supabaseRef.current

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [
      { data: profile },
      { count: followersCount },
      { count: followingCount },
      { data: followRow },
    ] = await Promise.all([
      sb.from('users')
        .select('id, name, username, avatar_url, country, is_premium, level, coins, streak, created_at')
        .eq('id', uid).single(),
      sb.from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', uid),
      sb.from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', uid),
      sb.from('follows')
        .select('id')
        .eq('follower_id', uidRef.current)
        .eq('following_id', uid)
        .maybeSingle(),
    ])

    setProfileData({
      id: uid,
      name: profile?.name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      country: profile?.country ?? null,
      is_premium: profile?.is_premium ?? false,
      level: profile?.level ?? 'beginner',
      coins: profile?.coins ?? 0,
      streak: profile?.streak ?? 0,
      created_at: profile?.created_at ?? null,
      followers_count: followersCount ?? 0,
      following_count: followingCount ?? 0,
    })
    setIsFollowing(!!followRow)
    setProfileLoading(false)
  }

  const sendDm = async () => {
    if (!dmText.trim() || !profileUserId || dmSending) return
    setDmSending(true)
    const supabase = supabaseRef.current
    const content = dmText.trim()
    await supabase.from('direct_messages').insert({
      sender_id: uidRef.current,
      receiver_id: profileUserId,
      content,
    })
    const preview = content.length > 60 ? content.slice(0, 57) + '...' : content
    await sendNotification(supabase, profileUserId, 'message', 'New message', `${userName}: ${preview}`, { fromUserId: uidRef.current })
    setDmSending(false)
    setDmSent(true)
    setDmText('')
  }

  const followUser = async () => {
    if (!profileUserId || followLoading) return
    setFollowLoading(true)
    const supabase = supabaseRef.current
    await supabase.from('follows').insert({ follower_id: uidRef.current, following_id: profileUserId })
    setIsFollowing(true)
    setProfileData(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev)
    await sendNotification(supabase, profileUserId, 'follow', 'New follower', `${userName} followed you`, { fromUserId: uidRef.current })
    setFollowLoading(false)
  }

  const unfollowUser = async () => {
    if (!profileUserId || followLoading) return
    setFollowLoading(true)
    const supabase = supabaseRef.current
    await supabase.from('follows').delete()
      .eq('follower_id', uidRef.current)
      .eq('following_id', profileUserId)
    setIsFollowing(false)
    setProfileData(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : prev)
    setFollowLoading(false)
  }

  // Loading
  if (loading || !room) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'transparent' }}
      >
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  const isHost       = room.host_id === userId
  const otherMembers = members.filter(m => m.user_id !== userId)

  // Derive selected member from profileUserId for admin actions
  const profileMember = profileUserId ? members.find(m => m.user_id === profileUserId) ?? null : null
  const isSelf = !!profileUserId && profileUserId === uidRef.current

  // Preview screen (before joining)
  if (!hasJoined) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: 20, background: 'transparent',
      }}>
        <div className="glass" style={{ padding: 24, textAlign: 'center', maxWidth: 350, width: '100%' }}>
          <h2 style={{ color: 'white', fontSize: 22, margin: '0 0 4px' }}>{room.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px' }}>{room.topic || 'General'}</p>

          {members.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {members.slice(0, 5).map(m => (
                <div key={m.user_id} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: m.user?.avatar_url ? `url(${m.user.avatar_url}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, fontWeight: 600,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  {!m.user?.avatar_url && (m.user?.name?.[0] || '?')}
                </div>
              ))}
            </div>
          )}

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 20px' }}>
            {members.length} {members.length === 1 ? 'person' : 'people'} inside
          </p>

          <button
            onClick={() => joinSeat(0)}
            disabled={joining}
            style={{
              width: '100%', padding: '14px 0', background: '#8B5CF6', color: 'white',
              border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600,
              cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.6 : 1,
            }}
          >
            {joining ? 'Joining...' : 'Join Room'}
          </button>

          <button
            onClick={() => router.push('/rooms')}
            style={{
              marginTop: 12, background: 'transparent', color: 'rgba(255,255,255,0.5)',
              border: 'none', fontSize: 14, cursor: 'pointer',
            }}
          >
            Back to rooms
          </button>
        </div>
      </div>
    )
  }

  // RENDER

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'transparent',
        paddingBottom: 100,
      }}
    >
      {/* Header */}
      <RoomHeader
        roomName={room.name}
        roomCode={room.room_code}
        isPrivate={room.is_private}
        memberCount={members.length}
        maxSeats={room.max_seats}
        onLeave={handleBack}
        copiedId={copiedId}
        onCopyId={copyRoomId}
      />

      {/* Speaker Stage */}
      <SpeakerStage
        members={members}
        maxSeats={room.max_seats}
        currentUserId={userId ?? ''}
        currentUserName={userName}
        currentUserLevel={userLevel}
        currentUserIsPremium={isPremium}
        hostId={room.host_id}
        speakingUsers={speakingUsers}
        voiceUsers={voiceUsers}
        handRaisedUsers={handRaisedUsers}
        voiceMuted={voiceMuted}
        onAvatarClick={openProfile}
      />

      {/* Reactions */}
      <ReactionSystem
        reactions={floatingReactions}
        onReact={handleReaction}
        isOpen={reactionsOpen}
      />

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        onSend={sendMessage}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUserId={userId ?? ''}
        currentUserName={userName}
        currentUserLevel={userLevel}
        currentUserIsPremium={isPremium}
        hostId={room.host_id}
        isAdmin={isAdmin}
        isMuted={isMuted}
        members={members}
        onDeleteMessage={deleteMessage}
      />

      {/* Bottom Controls */}
      <BottomControls
        hasJoined={hasJoined}
        isVoiceMuted={voiceMuted}
        micPermissionDenied={micPermissionDenied}
        onToggleMic={toggleVoice}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(prev => !prev)}
        reactionsOpen={reactionsOpen}
        onToggleReactions={() => setReactionsOpen(prev => !prev)}
        onRaiseHand={handleRaiseHand}
        isHandRaised={handRaised}
        onLeave={handleBack}
      />

      {/* 
          OVERLAYS
       */}

      {/* Profile Popup (drops from top) */}
      {profileUserId && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setProfileUserId(null)}
        >
          <div
            className="flex flex-col overflow-y-auto"
            style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxHeight: 'calc(100vh - 80px)',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '16px',
              paddingBottom: '20px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end px-4 pt-3 pb-1">
              <button
                onClick={() => setProfileUserId(null)}
                style={{ color: '#666666', fontSize: '18px', lineHeight: 1 }}
              >
                x
              </button>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : profileData ? (
              <div className="px-5 flex flex-col gap-4 pb-2">

                {/* Avatar + name row */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden"
                    style={{
                      background: LEVEL_COLORS[profileData.level ?? 'beginner']?.bg ?? 'rgba(255,255,255,0.04)',
                      color: LEVEL_COLORS[profileData.level ?? 'beginner']?.text ?? '#FFFFFF',
                      ...(profileData.is_premium
                        ? { border: '2.5px solid #8B5CF6', boxShadow: '0 0 16px #8B5CF6aa' }
                        : { border: '2px solid #2A2A2A' }
                      ),
                    }}
                  >
                    {profileData.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profileData.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (profileData.name?.[0] ?? '?').toUpperCase()
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base" style={{ color: profileData.is_premium ? '#8B5CF6' : '#FFFFFF' }}>
                        {profileData.name ?? 'Learner'}
                      </span>
                      {profileData.is_premium && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: '#fff' }}>
                          VIP
                        </span>
                      )}
                    </div>
                    {profileData.username && (
                      <span className="text-xs" style={{ color: '#666666' }}>@{profileData.username}</span>
                    )}
                    {profileData.country && (() => {
                      const parts = profileData.country!.split('')
                      const code  = parts[0] ?? ''
                      const name  = parts.slice(1).join('') || profileData.country!
                      const flag  = code.length === 2 ? countryFlag(code) : ''
                      return (
                        <span className="text-xs" style={{ color: '#888888' }}>
                          {flag} {name}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Level badge */}
                <div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: LEVEL_COLORS[profileData.level ?? 'beginner']?.bg ?? 'rgba(255,255,255,0.04)',
                      color: LEVEL_COLORS[profileData.level ?? 'beginner']?.text ?? '#FFFFFF',
                      border: `1px solid ${LEVEL_COLORS[profileData.level ?? 'beginner']?.text ?? '#444'}44`,
                    }}
                  >
                    {(profileData.level ?? 'beginner').charAt(0).toUpperCase() + (profileData.level ?? 'beginner').slice(1)}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Followers',  value: profileData.followers_count },
                    { label: 'Following',  value: profileData.following_count },
                    { label: 'Coins',   value: profileData.coins },
                    { label: 'Streak',  value: `${profileData.streak}d` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="font-bold text-white text-sm">{value}</span>
                      <span className="text-[10px] mt-0.5" style={{ color: '#666666' }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Member since */}
                {profileData.created_at && (
                  <p className="text-[11px]" style={{ color: '#555555' }}>
                    Member since {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}

                {/* Follow + Message (not shown for self) */}
                {!isSelf && (
                  <>
                    {/* Follow button */}
                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                      <button
                        onClick={isFollowing ? unfollowUser : followUser}
                        disabled={followLoading}
                        style={{
                          background: isFollowing ? 'transparent' : '#8B5CF6',
                          color: isFollowing ? '#8B5CF6' : '#000000',
                          border: isFollowing ? '1px solid #8B5CF6' : 'none',
                          borderRadius: '20px',
                          padding: '10px 48px',
                          fontWeight: 600,
                          fontSize: '15px',
                          cursor: 'pointer',
                          width: '80%',
                          opacity: followLoading ? 0.5 : 1,
                        }}
                      >
                        {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>

                    {/* Message button */}
                    <button
                      onClick={() => { setShowDmInput(v => !v); setDmSent(false) }}
                      className="w-full py-2.5 rounded-full text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', border: '1px solid rgba(139,92,246,0.3)' }}
                    >
                      Message
                    </button>

                    {/* Inline DM */}
                    {showDmInput && (
                      <div className="flex flex-col gap-2">
                        {dmSent ? (
                          <p className="text-center text-sm py-2" style={{ color: '#34D399' }}> Message sent!</p>
                        ) : (
                          <>
                            <textarea
                              value={dmText}
                              onChange={e => setDmText(e.target.value)}
                              placeholder="Write a message..."
                              rows={3}
                              className="w-full text-sm rounded-xl px-3 py-2 resize-none outline-none"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(139,92,246,0.2)', color: '#FFFFFF' }}
                            />
                            <button
                              onClick={sendDm}
                              disabled={!dmText.trim() || dmSending}
                              className="w-full py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                            >
                              {dmSending ? '...' : 'Send'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Admin controls (admin/host only, not for self) */}
                {isAdmin && !isSelf && profileMember && (
                  <div className="flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                    <p className="text-[10px] font-semibold" style={{ color: '#555555' }}>ADMIN CONTROLS</p>

                    <button
                      onClick={() => muteMember(profileMember.id, !profileMember.is_muted)}
                      className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    >
                      {profileMember.is_muted ? 'Unmute' : 'Mute'}
                    </button>

                    {!profileMember.is_admin && (
                      <button
                        onClick={() => makeAdmin(profileMember.id)}
                        className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                      >
                        Make Admin
                      </button>
                    )}

                    <button
                      onClick={() => removeMember(profileMember.user_id)}
                      className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium"
                      style={{ background: '#2A0A0A', color: '#FF6B6B', border: '1px solid #3A1010' }}
                    >
                      Remove from Room
                    </button>
                  </div>
                )}

              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Close Room confirmation */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="glass w-full max-w-sm flex flex-col gap-4"
            style={{ padding: 20 }}
          >
            <p className="font-bold text-white text-base">Close Room?</p>
            <p className="text-sm" style={{ color: '#999999' }}>
              This will end the room for everyone. All members will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#999999' }}
              >
                Cancel
              </button>
              <button
                onClick={closeRoom}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: '#FF4444', color: '#FFFFFF' }}
              >
                Close Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer admin modal */}
      {showTransferModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="glass w-full max-w-sm flex flex-col gap-4"
            style={{ padding: 20 }}
          >
            <p className="font-bold text-white text-base">Leave Room?</p>
            <p className="text-sm" style={{ color: '#999999' }}>
              You are the host. Transfer admin to keep the room open, or close it.
            </p>

            <select
              value={transferTarget}
              onChange={e => setTransferTarget(e.target.value)}
              className="input text-sm"
            >
              <option value="">Choose new admin</option>
              {otherMembers.map(m => (
                <option key={m.id} value={m.user_id}>
                  {m.user?.name ?? 'Learner'}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#999999' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowTransferModal(false); setShowCloseConfirm(true) }}
                className="flex-1 py-2.5 rounded-full text-xs font-bold"
                style={{ background: '#2A0A0A', color: '#FF6B6B' }}
              >
                Close Room
              </button>
              <button
                onClick={transferAdmin}
                disabled={!transferTarget || transferring}
                className="flex-1 py-2.5 rounded-full text-xs font-bold disabled:opacity-50"
                style={{ background: '#8B5CF6', color: '#FFFFFF' }}
              >
                {transferring ? '...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Room confirmation (members) */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="glass w-full max-w-sm flex flex-col gap-4"
            style={{ padding: 20 }}
          >
            <p className="font-bold text-white text-base">Leave this room?</p>
            <p className="text-sm" style={{ color: '#999999' }}>
              You can re-join by selecting an open seat.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#999999' }}
              >
                Cancel
              </button>
              <button
                onClick={leaveRoom}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: '#FF4444', color: '#FFFFFF' }}
              >
                Yes, leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview screen handles pre-join state above */}

      {/* Join toast */}
      {joinToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 60,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)',
            animation: 'slideUp 0.25s ease',
          }}
        >
          {joinToast}
        </div>
      )}

    </div>
  )
}
