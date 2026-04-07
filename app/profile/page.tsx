'use client'

// Bogga profile-ka — Full profile page with follow system, DMs, avatar upload

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { createClient, type UserRow, type DirectMessageRow } from '@/lib/supabase'
import { sendNotification } from '@/lib/notifications'
import { getCroppedImg } from '@/lib/cropUtils'
import TopBar from '@/components/ui/TopBar'
import LevelBadge from '@/components/ui/LevelBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'messages'

interface FollowCounts {
  followers: number
  following: number
}

interface ConversationPartner {
  id: string
  name: string | null
  username: string | null
  lastMessage: string
  lastTime: string
  unread: boolean
}

interface FollowUser {
  id: string
  name: string | null
  username: string | null
  avatar_url: string | null
  country?: string | null
  level?: string | null
  public_id?: string | null
  isFollowing: boolean
}

// ─── Country list ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUsername(email: string): string {
  const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${suffix}`
}

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

function formatCountry(country: string | null | undefined): string | null {
  if (!country) return null
  const parts = country.trim().split(' ')
  return parts.length >= 2 ? parts.slice(1).join(' ') : country
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Component ────────────────────────────────────────────────────────────────

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewId = searchParams.get('view') // public_id of user to view

  // Core state
  const [profile, setProfile] = useState<UserRow | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('profile')
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)

  // Viewed profile follow state
  const [isFollowing, setIsFollowing] = useState(false)
  const [togglingFollow, setTogglingFollow] = useState(false)

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarLocked, setAvatarLocked] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameLocked, setNameLocked] = useState(false)
  const [nameDaysLeft, setNameDaysLeft] = useState(0)

  // Edit username
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameLocked, setUsernameLocked] = useState(false)
  const [usernameDaysLeft, setUsernameDaysLeft] = useState(0)

  // Country modal
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [savingCountry, setSavingCountry] = useState(false)

  // Messages
  const [conversations, setConversations] = useState<ConversationPartner[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [convMessages, setConvMessages] = useState<DirectMessageRow[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showNewMsgModal, setShowNewMsgModal] = useState(false)
  const [newMsgUsername, setNewMsgUsername] = useState('')
  const [newMsgContent, setNewMsgContent] = useState('')
  const [newMsgError, setNewMsgError] = useState('')
  const [sendingNewMsg, setSendingNewMsg] = useState(false)
  const [showVipModal, setShowVipModal] = useState(false)

  // Follow modal
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null)
  const [followList, setFollowList] = useState<FollowUser[]>([])
  const [loadingFollowList, setLoadingFollowList] = useState(false)

  // Discover / search
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FollowUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const partnerCache = useRef<Record<string, { name: string | null; username: string | null }>>({})

  // ── Init: load profile based on viewId ────────────────────────────────────

  useEffect(() => {
    if (viewId) {
      // ── Viewing someone else's profile ──
      const t = setTimeout(() => setLoading(false), 3000)
      const load = async () => {
        try {
          const supabase = createClient()
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) { window.location.href = '/login'; return }
          setAuthUserId(authUser.id)
          const { data: profileData } = await (supabase as any)
            .from('users').select('*').eq('public_id', viewId).single()
          if (!profileData) { router.push('/profile'); return }
          setProfile(profileData)
          setIsOwnProfile(false)
          setLoading(false)
          Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
            (supabase as any).from('follows').select('id').eq('follower_id', authUser.id).eq('following_id', profileData.id).maybeSingle(),
          ]).then(([{ count: followers }, { count: following }, { data: followData }]) => {
            setFollowCounts({ followers: followers ?? 0, following: following ?? 0 })
            setIsFollowing(!!followData)
          })
        } catch { setLoading(false) } finally { clearTimeout(t) }
      }
      load()
      return () => clearTimeout(t)
    }

    // ── Own profile ──

    // Step 1: Show cached data INSTANTLY (0ms)
    let hasCached = false
    try {
      const cached = localStorage.getItem('my_profile')
      if (cached) {
        const parsed = JSON.parse(cached)
        setProfile(parsed.profile)
        setFollowCounts({ followers: parsed.followers || 0, following: parsed.following || 0 })
        setLoading(false)
        hasCached = true
      }
    } catch { /* ignore */ }

    // Step 2: Fetch fresh data in background
    const refreshData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!hasCached) window.location.href = '/login'
          return
        }
        setAuthUserId(user.id)
        setIsOwnProfile(true)

        const [profileRes, followersRes, followingRes] = await Promise.all([
          (supabase as any).from('users').select('*').eq('id', user.id).single(),
          (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
          (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        ])

        let profileData = profileRes.data
        if (!profileData) {
          const publicId = Math.floor(100000 + Math.random() * 900000).toString()
          await (supabase as any).from('users').insert({
            id: user.id,
            email: user.email ?? '',
            name: user.email?.split('@')[0] ?? 'User',
            level: 'beginner',
            coins: 0,
            streak: 0,
            is_premium: false,
            public_id: publicId,
          })
          const { data: created } = await (supabase as any).from('users').select('*').eq('id', user.id).single()
          profileData = created
        }

        if (profileData) {
          // Auto-generate username if missing
          if (!profileData.username) {
            const newUsername = generateUsername(user.email ?? 'user')
            await (supabase as any).from('users').update({ username: newUsername }).eq('id', user.id)
            profileData.username = newUsername
          }
          // Auto-generate public_id if missing
          if (!profileData.public_id) {
            const newId = Math.floor(100000 + Math.random() * 900000).toString()
            await (supabase as any).from('users').update({ public_id: newId }).eq('id', user.id)
            profileData.public_id = newId
          }
          // Update last_seen (fire-and-forget)
          ;(supabase as any).from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

          setProfile(profileData)
          setNameInput(profileData.name ?? '')
          setUsernameInput(profileData.username ?? '')

          if (profileData.name_updated_at) {
            const days = (Date.now() - new Date(profileData.name_updated_at).getTime()) / 86400000
            if (days < 7) { setNameLocked(true); setNameDaysLeft(Math.ceil(7 - days)) }
          }
          if (profileData.username_updated_at) {
            const days = (Date.now() - new Date(profileData.username_updated_at).getTime()) / 86400000
            if (days < 7) { setUsernameLocked(true); setUsernameDaysLeft(Math.ceil(7 - days)) }
          }

          const today = new Date().toISOString().split('T')[0]
          const avatarCount = parseInt(localStorage.getItem(`avatar_changes_${today}`) ?? '0')
          if (avatarCount >= 2) setAvatarLocked(true)

          if (!profileData.country) setShowCountryModal(true)

          setFollowCounts({ followers: followersRes.count || 0, following: followingRes.count || 0 })

          try {
            localStorage.setItem('my_profile', JSON.stringify({
              profile: profileData,
              followers: followersRes.count || 0,
              following: followingRes.count || 0,
              time: Date.now(),
            }))
          } catch { /* ignore */ }
        }

        setLoading(false)
      } catch (err) {
        console.error('Profile refresh error:', err)
        setLoading(false)
      }
    }

    refreshData()

    // Step 3: Failsafe — never show skeleton more than 1.5 seconds
    const timeout = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timeout)
  }, [viewId, router])

  // ── Load conversations ─────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!profile || !isOwnProfile) return
    const supabase = createClient()

    const { data: dms } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!dms) return

    const partnerMap = new Map<string, DirectMessageRow>()
    for (const dm of dms) {
      const partnerId = dm.sender_id === profile.id ? dm.receiver_id : dm.sender_id
      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, dm)
    }

    const uncachedIds = Array.from(partnerMap.keys()).filter(id => !partnerCache.current[id])
    if (uncachedIds.length > 0) {
      const { data: partners } = await (supabase as any)
        .from('users').select('id, name, username').in('id', uncachedIds)
      if (partners) {
        for (const p of partners) {
          partnerCache.current[p.id] = { name: p.name, username: p.username ?? null }
        }
      }
    }

    const convList: ConversationPartner[] = [...partnerMap.entries()].map(([partnerId, lastDm]) => {
      const p = partnerCache.current[partnerId] ?? { name: null, username: null }
      return {
        id: partnerId,
        name: p.name,
        username: p.username,
        lastMessage: lastDm.content,
        lastTime: lastDm.created_at,
        unread: lastDm.receiver_id === profile.id,
      }
    })
    setConversations(convList)
  }, [profile, isOwnProfile])

  useEffect(() => {
    if (tab === 'messages' && profile && isOwnProfile) loadConversations()
  }, [tab, profile, isOwnProfile, loadConversations])

  // ── Load a single conversation thread ─────────────────────────────────────

  const loadConversation = async (partnerId: string) => {
    if (!profile) return
    setActiveConvId(partnerId)
    const supabase = createClient()

    const { data: all } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    const thread = (all ?? []).filter(dm =>
      (dm.sender_id === profile.id && dm.receiver_id === partnerId) ||
      (dm.sender_id === partnerId && dm.receiver_id === profile.id)
    )
    setConvMessages(thread)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // ── Send reply ─────────────────────────────────────────────────────────────

  const handleSendReply = async () => {
    if (!authUserId || !activeConvId || !messageInput.trim() || sendingMessage) return
    setSendingMessage(true)
    const content = messageInput.trim()
    setMessageInput('')

    const supabase = createClient()
    const { data: newMsg } = await supabase
      .from('direct_messages')
      .insert({ sender_id: authUserId, receiver_id: activeConvId, content })
      .select()
      .single()

    if (newMsg) {
      setConvMessages(prev => [...prev, newMsg])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    const preview = content.length > 60 ? content.slice(0, 57) + '…' : content
    await sendNotification(supabase, activeConvId, 'message', 'New message', `${profile?.name ?? 'Someone'}: ${preview}`, { fromUserId: authUserId })
    setSendingMessage(false)
  }

  // ── Send new message ───────────────────────────────────────────────────────

  const handleSendNewMessage = async () => {
    if (!authUserId || !newMsgUsername.trim() || !newMsgContent.trim()) return
    setSendingNewMsg(true)
    setNewMsgError('')

    const supabase = createClient()
    const rawUsername = newMsgUsername.startsWith('@') ? newMsgUsername.slice(1) : newMsgUsername

    const { data: receiver } = await (supabase as any)
      .from('users').select('id, name, username').eq('username', rawUsername).single()

    if (!receiver) {
      setNewMsgError(`User @${rawUsername} not found`)
      setSendingNewMsg(false)
      return
    }
    if (receiver.id === authUserId) {
      setNewMsgError("You can't message yourself")
      setSendingNewMsg(false)
      return
    }

    const msgContent = newMsgContent.trim()
    await supabase.from('direct_messages').insert({
      sender_id: authUserId,
      receiver_id: receiver.id,
      content: msgContent,
    })
    const preview = msgContent.length > 60 ? msgContent.slice(0, 57) + '…' : msgContent
    await sendNotification(supabase, receiver.id, 'message', 'New message', `${profile?.name ?? 'Someone'}: ${preview}`, { fromUserId: authUserId })

    partnerCache.current[receiver.id] = { name: receiver.name, username: receiver.username ?? null }
    setNewMsgUsername('')
    setNewMsgContent('')
    setShowNewMsgModal(false)
    setSendingNewMsg(false)
    loadConversations()
  }

  // ── Avatar: file selected → open crop modal ───────────────────────────────

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile || avatarLocked) return
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    e.target.value = ''
  }

  // ── Avatar: crop confirmed → upload ───────────────────────────────────────

  const handleCropSave = async () => {
    if (!cropSrc || !croppedAreaPixels || !profile) return
    setCropSrc(null)
    setUploadingAvatar(true)
    setAvatarError(false)

    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels)
      URL.revokeObjectURL(cropSrc)

      const supabase = createClient()
      const filePath = `${profile.id}/avatar.jpg`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })

      if (error) {
        setAvatarError(true)
        setTimeout(() => setAvatarError(false), 4000)
        setUploadingAvatar(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const urlWithBust = publicUrl + '?t=' + Date.now()
      const now = new Date().toISOString()

      await (supabase as any).from('users')
        .update({ avatar_url: publicUrl, avatar_updated_at: now })
        .eq('id', profile.id)

      setProfile(prev => prev ? { ...prev, avatar_url: urlWithBust, avatar_updated_at: now } : null)

      const today = new Date().toISOString().split('T')[0]
      const key = `avatar_changes_${today}`
      const newCount = parseInt(localStorage.getItem(key) ?? '0') + 1
      localStorage.setItem(key, String(newCount))
      if (newCount >= 2) setAvatarLocked(true)
    } catch {
      setAvatarError(true)
      setTimeout(() => setAvatarError(false), 4000)
    }

    setUploadingAvatar(false)
  }

  // ── Save name ──────────────────────────────────────────────────────────────

  const handleSaveName = async () => {
    if (!profile || !nameInput.trim()) return
    const supabase = createClient()
    const now = new Date().toISOString()
    await (supabase as any).from('users').update({ name: nameInput.trim(), name_updated_at: now }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, name: nameInput.trim(), name_updated_at: now } : null)
    setNameLocked(true)
    setNameDaysLeft(7)
    setEditingName(false)
  }

  // ── Save username ──────────────────────────────────────────────────────────

  const handleSaveUsername = async () => {
    if (!profile || !usernameInput.trim()) return
    const supabase = createClient()
    const now = new Date().toISOString()
    const newUsername = usernameInput.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    if (!newUsername) return
    const { error } = await (supabase as any).from('users')
      .update({ username: newUsername, username_updated_at: now })
      .eq('id', profile.id)
    if (error) return
    setProfile(prev => prev ? { ...prev, username: newUsername, username_updated_at: now } : null)
    setUsernameLocked(true)
    setUsernameDaysLeft(7)
    setEditingUsername(false)
  }

  // ── Save country ───────────────────────────────────────────────────────────

  const handleSaveCountry = async () => {
    if (!profile || !selectedCountry) return
    setSavingCountry(true)
    const c = COUNTRIES.find(x => x.code === selectedCountry)
    if (c) {
      const countryValue = `${c.flag} ${c.name}`
      await (createClient() as any).from('users').update({ country: countryValue }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, country: countryValue } : null)
    }
    setShowCountryModal(false)
    setSavingCountry(false)
  }

  // ── Follow limit (localStorage) ───────────────────────────────────────────

  const getFollowCountToday = (): number => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const stored = localStorage.getItem('follow_count_today')
      if (!stored) return 0
      const parsed = JSON.parse(stored)
      return parsed.date === today ? (parsed.count ?? 0) : 0
    } catch { return 0 }
  }

  const incrementFollowCount = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('follow_count_today', JSON.stringify({ date: today, count: getFollowCountToday() + 1 }))
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load followers / following list ───────────────────────────────────────

  const loadFollowList = async (type: 'followers' | 'following') => {
    if (!profile) return
    setFollowList([])
    setLoadingFollowList(true)
    setFollowModalType(type)
    const supabase = createClient()
    const db = supabase as any

    let userIds: string[] = []
    if (type === 'followers') {
      const { data } = await db.from('follows').select('follower_id').eq('following_id', profile.id)
      userIds = (data ?? []).map((r: any) => r.follower_id)
    } else {
      const { data } = await db.from('follows').select('following_id').eq('follower_id', profile.id)
      userIds = (data ?? []).map((r: any) => r.following_id)
    }

    if (userIds.length === 0) { setLoadingFollowList(false); return }

    const { data: users } = await db.from('users').select('id, name, username, avatar_url, public_id').in('id', userIds)

    let followingSet = new Set<string>()
    if (authUserId && userIds.length > 0) {
      const { data: myFollows } = await db.from('follows').select('following_id').eq('follower_id', authUserId).in('following_id', userIds)
      followingSet = new Set((myFollows ?? []).map((r: any) => r.following_id))
    }

    setFollowList((users ?? []).map((u: any) => ({
      id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url,
      public_id: u.public_id,
      isFollowing: followingSet.has(u.id),
    })))
    setLoadingFollowList(false)
  }

  // ── Follow / unfollow from list ───────────────────────────────────────────

  const handleFollowToggle = async (targetId: string, currentlyFollowing: boolean) => {
    if (!authUserId) return
    if (!currentlyFollowing && getFollowCountToday() >= 100) {
      showToast('Follow limit reached. Try again tomorrow.')
      return
    }
    const supabase = createClient()
    if (currentlyFollowing) {
      await supabase.from('follows').delete().eq('follower_id', authUserId).eq('following_id', targetId)
    } else {
      await supabase.from('follows').insert({ follower_id: authUserId, following_id: targetId })
      incrementFollowCount()
    }
    setFollowList(prev => prev.map(u => u.id === targetId ? { ...u, isFollowing: !currentlyFollowing } : u))
    if (isOwnProfile) {
      setFollowCounts(prev => ({ ...prev, following: currentlyFollowing ? prev.following - 1 : prev.following + 1 }))
    }
  }

  // ── Follow / unfollow viewed profile ──────────────────────────────────────

  const handleFollowViewedUser = async () => {
    if (!authUserId || !profile || togglingFollow) return
    if (!isFollowing && getFollowCountToday() >= 100) {
      showToast('Follow limit reached. Try again tomorrow.')
      return
    }
    setTogglingFollow(true)
    const supabase = createClient()
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', authUserId).eq('following_id', profile.id)
      setFollowCounts(prev => ({ ...prev, followers: prev.followers - 1 }))
    } else {
      await supabase.from('follows').insert({ follower_id: authUserId, following_id: profile.id })
      incrementFollowCount()
      setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }))
    }
    setIsFollowing(!isFollowing)
    setTogglingFollow(false)
  }

  // ── Search users ──────────────────────────────────────────────────────────

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    const supabase = createClient()
    const { data: found } = await (supabase as any)
      .from('users')
      .select('id, name, username, avatar_url, country, level, public_id')
      .or(`username.ilike.%${q.trim()}%,name.ilike.%${q.trim()}%`)
      .neq('id', authUserId)
      .limit(20)

    const ids = (found ?? []).map((u: any) => u.id)
    let followingSet = new Set<string>()
    if (authUserId && ids.length > 0) {
      const { data: myFollows } = await (supabase as any)
        .from('follows').select('following_id').eq('follower_id', authUserId).in('following_id', ids)
      followingSet = new Set((myFollows ?? []).map((r: any) => r.following_id))
    }

    setSearchResults((found ?? []).map((u: any) => ({
      id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url,
      country: u.country, level: u.level, public_id: u.public_id,
      isFollowing: followingSet.has(u.id),
    })))
    setSearchLoading(false)
  }

  // ── Follow toggle for search results ──────────────────────────────────────

  const handleSearchFollowToggle = async (targetId: string, currentlyFollowing: boolean) => {
    if (!authUserId) return
    if (!currentlyFollowing && getFollowCountToday() >= 100) {
      showToast('Follow limit reached. Try again tomorrow.')
      return
    }
    const supabase = createClient()
    if (currentlyFollowing) {
      await supabase.from('follows').delete().eq('follower_id', authUserId).eq('following_id', targetId)
    } else {
      await supabase.from('follows').insert({ follower_id: authUserId, following_id: targetId })
      incrementFollowCount()
    }
    setSearchResults(prev => prev.map(u => u.id === targetId ? { ...u, isFollowing: !currentlyFollowing } : u))
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await createClient().auth.signOut()
    router.push('/')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Show skeleton only when loading with no cached data yet
  if (loading && !profile) {
    return (
      <div className="flex flex-col min-h-screen bg-zone-profile">
        <TopBar title="Profile" coins={0} />
        <div className="px-4 pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
            <div className="flex flex-col gap-2 flex-1">
              <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 8 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  // Done loading but no profile data — show retry UI
  if (!loading && !profile) {
    return (
      <div className="flex flex-col min-h-screen bg-zone-profile">
        <TopBar title="Profile" coins={0} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, paddingTop: 80 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#666' }}>?</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Loading...</p>
          <button
            onClick={() => { setLoading(true); window.location.reload() }}
            style={{ background: '#6C63FF', color: 'white', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const online = isOnline(profile.last_seen)
  const initials = (profile.name ?? profile.email ?? 'U')[0].toUpperCase()
  const activePartner = activeConvId ? partnerCache.current[activeConvId] : null

  // ── Viewed profile (someone else) ─────────────────────────────────────────

  if (!isOwnProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-zone-profile" style={{ paddingBottom: 100 }}>
        <TopBar title="Profile" coins={0} />

        <div className="px-4 pt-5 flex flex-col gap-4">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-medium w-fit"
            style={{ color: '#8B5CF6' }}
          >
            ← Back
          </button>

          {/* Profile card */}
          <div className="glass glass-accent glass-interactive p-4 fade-in">
            <div className="flex items-start gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)', border: profile.is_premium ? '2px solid #8B5CF6' : '2px solid rgba(139,92,246,0.3)' }}
              >
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-primary">{initials}</span>
                }
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="font-bold text-base text-white truncate">
                  {profile.is_premium && <span className="mr-1" style={{color:'#8B5CF6',fontSize:12,fontWeight:700}}>PRO</span>}
                  {profile.name ?? 'Unknown'}
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: '#8B5CF6' }}>@{profile.username ?? '…'}</p>
                {profile.country && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{formatCountry(profile.country)}</p>
                )}
                {(profile as any).public_id && (
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: '#555555' }}>ID: {(profile as any).public_id}</p>
                )}
              </div>
            </div>

            {/* Follow counts + action buttons */}
            <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <button className="text-center" onClick={() => loadFollowList('followers')}>
                <p className="font-bold text-white text-lg leading-none">{followCounts.followers}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Followers</p>
              </button>
              <button className="text-center" onClick={() => loadFollowList('following')}>
                <p className="font-bold text-white text-lg leading-none">{followCounts.following}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Following</p>
              </button>
              <div className="flex-1" />
              {/* Message button */}
              <button
                onClick={() => {
                  setNewMsgUsername(profile.username ?? '')
                  setShowNewMsgModal(true)
                }}
                className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Message
              </button>
              {/* Follow button */}
              <button
                onClick={handleFollowViewedUser}
                disabled={togglingFollow}
                className="text-xs px-4 py-1.5 rounded-full font-bold flex-shrink-0"
                style={isFollowing
                  ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: '#8B5CF6', color: '#FFFFFF' }
                }
              >
                {togglingFollow ? '…' : isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass text-center py-3 p-4">
              <p className="text-xl font-extrabold text-primary">{profile.coins}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Coins</p>
            </div>
            <div className="glass text-center py-3 flex flex-col items-center justify-center gap-1 p-4">
              <LevelBadge level={profile.level} size="sm" />
            </div>
            <div className="glass text-center py-3 p-4">
              <p className="text-xl font-extrabold text-primary">{profile.streak}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Streak</p>
            </div>
          </div>
        </div>


        {/* Followers / Following modal */}
        {followModalType && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setFollowModalType(null)}
          >
            <div
              className="w-full max-w-mobile flex flex-col"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0 0 16px 16px', maxHeight: '70vh', animation: 'slideDown 0.3s ease' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                <h2 className="font-bold text-white text-base">
                  {followModalType === 'followers' ? 'Followers' : 'Following'}
                </h2>
                <button onClick={() => setFollowModalType(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 pb-6 flex flex-col gap-3">
                {loadingFollowList ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : followList.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    
                    <p className="text-sm">{followModalType === 'followers' ? 'No followers yet' : 'Not following anyone'}</p>
                  </div>
                ) : (
                  followList.map(fu => (
                    <div key={fu.id} className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => { setFollowModalType(null); router.push('/profile?view=' + fu.public_id) }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                          style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                        >
                          {fu.avatar_url
                            ? <img src={fu.avatar_url} alt="" className="w-full h-full object-cover" />
                            : (fu.name ?? fu.username ?? '?')[0].toUpperCase()
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{fu.name ?? fu.username ?? 'Unknown'}</p>
                          {fu.username && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>@{fu.username}</p>}
                        </div>
                      </button>
                      {fu.id !== authUserId && (
                        <button
                          onClick={() => handleFollowToggle(fu.id, fu.isFollowing)}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                          style={fu.isFollowing
                            ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }
                            : { background: '#8B5CF6', color: '#FFFFFF' }
                          }
                        >
                          {fu.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* New message modal (for messaging this user) */}
        {showNewMsgModal && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            <div
              className="w-full max-w-mobile rounded-b-3xl p-6 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', animation: 'slideDown 0.3s ease' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-lg">New Message</h2>
                <button onClick={() => { setShowNewMsgModal(false); setNewMsgError(''); setNewMsgContent('') }} style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>To</label>
                <input value={newMsgUsername} onChange={e => setNewMsgUsername(e.target.value)} placeholder="@username" className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Message</label>
                <textarea
                  value={newMsgContent}
                  onChange={e => setNewMsgContent(e.target.value)}
                  placeholder="Write a message… (expires in 24 hours)"
                  rows={3}
                  className="resize-none outline-none text-sm text-white placeholder:text-[#555]"
                  style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px' }}
                />
              </div>
              {newMsgError && <p className="text-xs" style={{ color: '#FF6B6B' }}>{newMsgError}</p>}
              <button
                onClick={handleSendNewMessage}
                disabled={!newMsgUsername.trim() || !newMsgContent.trim() || sendingNewMsg}
                className="btn-primary w-full disabled:opacity-40"
              >
                {sendingNewMsg ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        )}

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

  // ── Own profile ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-zone-profile" style={{ paddingBottom: 100 }}>
      <TopBar title="Profile" coins={profile.coins} />

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── Profile header card ── */}
        <div className="glass glass-accent glass-interactive p-4 fade-in">

          <div className="flex items-start gap-4">

            {/* Avatar */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden${profile.is_premium ? ' vip-avatar' : ''}`}
                  style={{ background: 'rgba(139,92,246,0.12)', border: profile.is_premium ? '2px solid #8B5CF6' : '2px solid rgba(139,92,246,0.3)' }}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">{initials}</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.65)' }}>
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Online dot */}
                <div
                  className="absolute bottom-0.5 right-5 w-4 h-4 rounded-full border-2"
                  style={{ background: online ? '#34D399' : '#555555', borderColor: 'rgba(255,255,255,0.06)' }}
                />

                {/* + button */}
                <button
                  onClick={() => !avatarLocked && fileInputRef.current?.click()}
                  disabled={avatarLocked || uploadingAvatar}
                  aria-label="Change photo"
                  style={{
                    position: 'absolute', bottom: '-2px', right: '-2px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: avatarLocked ? '#444444' : '#8B5CF6',
                    color: '#FFFFFF', fontSize: '18px', fontWeight: 600,
                    border: '2px solid #06000F', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: avatarLocked ? 'default' : 'pointer', lineHeight: 1,
                  }}
                >
                  +
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
              </div>

              {avatarLocked && (
                <p className="text-[9px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '80px' }}>2 changes per day</p>
              )}
              {avatarError && (
                <p className="text-[9px] text-center leading-tight" style={{ color: '#FF6B6B', maxWidth: '80px' }}>Upload failed, try again</p>
              )}
            </div>

            {/* Name / username / country */}
            <div className="flex-1 min-w-0 pt-1">

              {/* Display name */}
              {editingName ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                    className="flex-1 text-base font-bold bg-transparent outline-none border-b text-white"
                    style={{ borderColor: '#8B5CF6' }}
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-xs px-2 py-1 rounded-full font-bold flex-shrink-0" style={{ background: '#8B5CF6', color: '#fff' }}>Save</button>
                  <button onClick={() => setEditingName(false)} className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ color: '#999', background: 'rgba(255,255,255,0.1)' }}>✕</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-base truncate${profile.is_premium ? ' vip-name' : ' text-white'}`}>
                      {profile.is_premium && <span className="mr-1" style={{color:'#8B5CF6',fontSize:12,fontWeight:700}}>PRO</span>}
                      {profile.name ?? 'Set your name'}
                    </p>
                    {!nameLocked && (
                      <button onClick={() => setEditingName(true)} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {nameLocked && (
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Can change in {nameDaysLeft} day{nameDaysLeft !== 1 ? 's' : ''}</p>
                  )}
                </div>
              )}

              {/* Username */}
              <div className="mt-0.5">
                {editingUsername ? (
                  <div className="flex gap-1 items-center mt-1">
                    <span className="text-xs font-medium" style={{ color: '#8B5CF6' }}>@</span>
                    <input
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername() }}
                      className="flex-1 text-xs bg-transparent outline-none border-b text-white"
                      style={{ borderColor: '#8B5CF6', minWidth: 0 }}
                      autoFocus
                    />
                    <button onClick={handleSaveUsername} className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: '#8B5CF6', color: '#fff' }}>OK</button>
                    <button onClick={() => setEditingUsername(false)} className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: '#999', background: 'rgba(255,255,255,0.1)' }}>✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium" style={{ color: '#8B5CF6' }}>@{profile.username ?? '…'}</p>
                    {profile.is_premium && <span className="vip-badge">VIP</span>}
                    {!usernameLocked ? (
                      <button onClick={() => { setUsernameInput(profile.username ?? ''); setEditingUsername(true) }} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    ) : (
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>(change in {usernameDaysLeft}d)</p>
                    )}
                  </div>
                )}
              </div>

              {profile.country ? (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{formatCountry(profile.country)}</p>
              ) : (
                <button onClick={() => setShowCountryModal(true)} className="text-xs mt-0.5 font-medium" style={{ color: '#60A5FA' }}>
                  + Set your country
                </button>
              )}

              {(profile as any).public_id && (
                <button
                  className="flex items-center gap-1 mt-1"
                  onClick={() => {
                    navigator.clipboard.writeText((profile as any).public_id)
                    showToast('ID Copied!')
                  }}
                >
                  <span className="text-[10px] font-mono" style={{ color: '#555555' }}>ID: {(profile as any).public_id}</span>
                  <span className="text-[10px]" style={{ color: '#555555' }}></span>
                </button>
              )}
            </div>
          </div>

          {/* Follow counts + shortcut buttons */}
          <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <button className="text-center" onClick={() => loadFollowList('followers')}>
              <p className="font-bold text-white text-lg leading-none">{followCounts.followers}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Followers</p>
            </button>
            <button className="text-center" onClick={() => loadFollowList('following')}>
              <p className="font-bold text-white text-lg leading-none">{followCounts.following}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Following</p>
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { setShowSearchModal(true); setSearchQuery(''); setSearchResults([]) }}
              className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
              style={{ color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.5)', background: 'transparent' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button
              onClick={() => { setTab('messages'); setShowNewMsgModal(true) }}
              className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass text-center py-3 p-4">
            <p className="text-xl font-extrabold text-primary">{profile.coins}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Coins</p>
          </div>
          <div className="glass text-center py-3 flex flex-col items-center justify-center gap-1 p-4">
            <LevelBadge level={profile.level} size="sm" />
          </div>
          <div className="glass text-center py-3 p-4">
            <p className="text-xl font-extrabold text-primary">{profile.streak}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Streak</p>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div className="glass flex gap-1 rounded-btn" style={{ padding: '4px' }}>
          {(['profile', 'messages'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-semibold rounded-btn transition-colors"
              style={tab === t ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              {t === 'profile' ? 'Profile' : 'Messages'}
            </button>
          ))}
        </div>

        {/* ════════════════ PROFILE TAB ════════════════ */}
        {tab === 'profile' && (
          <div className="flex flex-col gap-3">

            <div className="glass p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Member since</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span style={{width:8,height:8,borderRadius:"50%",background:"#8B5CF6",display:"inline-block"}}/>
            </div>

            {/* Plan section removed - all features free */}

            <button
              onClick={handleSignOut}
              className="glass w-full text-sm font-medium py-3 rounded-btn"
              style={{ color: '#FF6B6B' }}
            >
              Sign Out
            </button>
          </div>
        )}

        {/* ════════════════ MESSAGES TAB ════════════════ */}
        {tab === 'messages' && (
          <div className="flex flex-col gap-2">
            {activeConvId ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setActiveConvId(null); setConvMessages([]) }}
                  className="flex items-center gap-1 text-sm font-medium"
                  style={{ color: '#8B5CF6' }}
                >
                  ← Back
                </button>

                <div className="glass glass-interactive p-4 flex items-center gap-3 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                  >
                    {activePartner?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{activePartner?.name ?? 'Unknown'}</p>
                    {activePartner?.username && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>@{activePartner.username}</p>}
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>24h messages</p>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '45vh' }}>
                  {convMessages.length === 0 ? (
                    <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      
                      <p className="text-sm">No messages yet. Say hi!</p>
                    </div>
                  ) : (
                    convMessages.map(msg => {
                      const isOwn = msg.sender_id === authUserId
                      const expiresInHours = Math.max(0, Math.floor(
                        (new Date(msg.expires_at).getTime() - Date.now()) / 3600000
                      ))
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div>
                            <div
                              className="rounded-2xl px-3 py-2 text-sm"
                              style={{
                                maxWidth: '75vw',
                                ...(isOwn
                                  ? { background: '#8B5CF6', color: '#FFFFFF', borderBottomRightRadius: '4px' }
                                  : { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', borderBottomLeftRadius: '4px' }),
                              }}
                            >
                              {msg.content}
                            </div>
                            <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-right' : ''}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {timeAgo(msg.created_at)} · expires {expiresInHours}h
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="glass flex items-end gap-2 rounded-2xl p-2">
                  <textarea
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                    placeholder="Reply…"
                    rows={1}
                    className="flex-1 bg-transparent text-sm resize-none outline-none px-2 py-1 text-white placeholder:text-[#555]"
                    style={{ minHeight: '36px', maxHeight: '80px' }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!messageInput.trim() || sendingMessage}
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                    style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-90">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Messages</p>
                  <button
                    onClick={() => setShowNewMsgModal(true)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                  >
                    + New
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    
                    <p className="text-sm font-medium text-white">No messages yet</p>
                    <p className="text-xs mt-1.5">Messages disappear after 24 hours</p>
                    <button
                      onClick={() => setShowNewMsgModal(true)}
                      className="mt-4 text-sm font-semibold px-4 py-2 rounded-full"
                      style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                    >
                      Send a message
                    </button>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className="glass glass-interactive p-4 flex items-center gap-3 text-left w-full"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                      >
                        {conv.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white truncate">
                            {conv.name || (conv.username ? `@${conv.username}` : 'Unknown')}
                          </p>
                          <p className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{timeAgo(conv.lastTime)}</p>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{conv.lastMessage}</p>
                      </div>
                      {conv.unread && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#8B5CF6' }} />}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ════════ VIP MODAL ════════ */}
      {/* VIP modal removed - all features free */}

      {/* ════════ COUNTRY MODAL ════════ */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div
            className="w-full max-w-mobile rounded-b-3xl p-6 flex flex-col gap-4"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', animation: 'slideDown 0.3s ease' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Where are you from?</h2>
              {profile.country && <button onClick={() => setShowCountryModal(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>}
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>This can only be set once and cannot be changed later.</p>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="input"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', borderRadius: '12px', padding: '12px', outline: 'none', width: '100%' }}
            >
              <option value="">Select your country…</option>
              {[...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
            <button onClick={handleSaveCountry} disabled={!selectedCountry || savingCountry} className="btn-primary w-full disabled:opacity-40">
              {savingCountry ? 'Saving…' : 'Confirm Country'}
            </button>
          </div>
        </div>
      )}

      {/* ════════ NEW MESSAGE MODAL ════════ */}
      {showNewMsgModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div
            className="w-full max-w-mobile rounded-b-3xl p-6 flex flex-col gap-4"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', animation: 'slideDown 0.3s ease' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">New Message</h2>
              <button onClick={() => { setShowNewMsgModal(false); setNewMsgError(''); setNewMsgUsername(''); setNewMsgContent('') }} style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Recipient</label>
              <input value={newMsgUsername} onChange={e => setNewMsgUsername(e.target.value)} placeholder="@username" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Message</label>
              <textarea
                value={newMsgContent}
                onChange={e => setNewMsgContent(e.target.value)}
                placeholder="Write a message… (expires in 24 hours)"
                rows={3}
                className="resize-none outline-none text-sm text-white placeholder:text-[#555]"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px' }}
              />
            </div>
            {newMsgError && <p className="text-xs" style={{ color: '#FF6B6B' }}>{newMsgError}</p>}
            <button
              onClick={handleSendNewMessage}
              disabled={!newMsgUsername.trim() || !newMsgContent.trim() || sendingNewMsg}
              className="btn-primary w-full disabled:opacity-40"
            >
              {sendingNewMsg ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      {/* ════════ FOLLOWERS / FOLLOWING MODAL ════════ */}
      {followModalType && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setFollowModalType(null)}
        >
          <div
            className="w-full max-w-mobile flex flex-col"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0 0 16px 16px', maxHeight: '70vh', animation: 'slideDown 0.3s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="font-bold text-white text-base">
                {followModalType === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button onClick={() => setFollowModalType(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-6 flex flex-col gap-3">
              {loadingFollowList ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : followList.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  
                  <p className="text-sm">{followModalType === 'followers' ? 'No followers yet' : 'Not following anyone'}</p>
                </div>
              ) : (
                followList.map(fu => (
                  <div key={fu.id} className="flex items-center gap-3">
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => { setFollowModalType(null); router.push('/profile?view=' + fu.public_id) }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                        style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                      >
                        {fu.avatar_url
                          ? <img src={fu.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (fu.name ?? fu.username ?? '?')[0].toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{fu.name ?? fu.username ?? 'Unknown'}</p>
                        {fu.username && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>@{fu.username}</p>}
                      </div>
                    </button>
                    {fu.id !== authUserId && (
                      <button
                        onClick={() => handleFollowToggle(fu.id, fu.isFollowing)}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                        style={fu.isFollowing
                          ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }
                          : { background: '#8B5CF6', color: '#FFFFFF' }
                        }
                      >
                        {fu.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ SEARCH / DISCOVER MODAL ════════ */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-mobile flex flex-col"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0 0 16px 16px', maxHeight: '70vh', animation: 'slideDown 0.3s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="font-bold text-white text-base">Find People</h2>
              <button onClick={() => setShowSearchModal(false)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>✕</button>
            </div>
            <div className="px-4 pb-3 flex-shrink-0">
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name or @username…"
                autoFocus
                className="w-full text-sm outline-none text-white placeholder:text-[#555]"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 14px' }}
              />
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-6 flex flex-col gap-3">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  
                  <p className="text-sm">Type at least 2 characters to search</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                searchResults.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => { setShowSearchModal(false); router.push('/profile?view=' + u.public_id) }}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                        style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                      >
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (u.name ?? u.username ?? '?')[0].toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.name ?? u.username ?? 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {u.username && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>@{u.username}</p>}
                          {u.country && <p className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.country.split(' ')[0]}</p>}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSearchFollowToggle(u.id, u.isFollowing)}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                      style={u.isFollowing
                        ? { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }
                        : { background: '#8B5CF6', color: '#FFFFFF' }
                      }
                    >
                      {u.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ TOAST ════════ */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 z-[70] px-4 py-2.5 rounded-full text-sm font-semibold text-white pointer-events-none"
          style={{ transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}
        >
          {toast}
        </div>
      )}

      {/* ════════ CROP MODAL ════════ */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <div className="px-6 py-4 flex flex-col gap-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="flex items-center gap-3">
              <span className="text-white text-xs">−</span>
              <input
                type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-yellow-400"
                style={{ accentColor: '#8B5CF6' }}
              />
              <span className="text-white text-xs">+</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc) }}
                className="flex-1 py-3 rounded-full text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="flex-1 py-3 rounded-full text-sm font-bold"
                style={{ background: '#8B5CF6', color: '#FFFFFF' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="bg-zone-profile" style={{ minHeight: '100vh' }} />}>
      <ProfileContent />
    </Suspense>
  )
}
