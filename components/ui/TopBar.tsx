'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import CoinDisplay from './CoinDisplay'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifRow = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  follow:       'F',
  message:      'M',
  room_created: 'R',
  task_complete:'T',
  vip_activated:'V',
  streak:       'S',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Notification Bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const supabaseRef = useRef(createClient())
  const [userId, setUserId]             = useState<string | null>(null)
  const [notifs, setNotifs]             = useState<NotifRow[]>([])
  const [unread, setUnread]             = useState(0)
  const [open, setOpen]                 = useState(false)
  const [toast, setToast]               = useState<NotifRow | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load user + initial notifications
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      const list = (data ?? []) as NotifRow[]
      setNotifs(list)
      setUnread(list.filter(n => !n.is_read).length)
    })
  }, [])

  // Realtime subscription (runs once userId is known)
  useEffect(() => {
    if (!userId) return
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`notifs_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: { new: NotifRow }) => {
          const n = payload.new
          setNotifs(prev => [n, ...prev].slice(0, 20))
          setUnread(prev => prev + 1)
          if (toastTimer.current) clearTimeout(toastTimer.current)
          setToast(n)
          toastTimer.current = setTimeout(() => setToast(null), 4000)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async () => {
    if (!userId) return
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const markRead = async (id: string, wasRead: boolean) => {
    if (wasRead) return
    const supabase = supabaseRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{ position: 'relative', color: '#999999', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
        aria-label="Notifications"
      >
        Bell
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-5px',
            background: '#FF4444', color: '#FFFFFF',
            fontSize: '9px', fontWeight: 700,
            minWidth: '16px', height: '16px',
            borderRadius: '8px', padding: '0 3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{ position: 'fixed', top: '56px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 50 }}>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
            onClick={() => setOpen(false)}
          />
          <div style={{ background: 'rgba(10,0,20,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ fontSize: '11px', color: '#8B5CF6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#444444', fontSize: '13px' }}>
                  <p style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}></p>
                  No notifications yet
                </div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id, n.is_read)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    background: n.is_read ? 'transparent' : 'rgba(139,92,246,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '18px', flexShrink: 0, width: '26px', textAlign: 'center', marginTop: '1px' }}>
                    {TYPE_ICONS[n.type] ?? 'Bell'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{n.title}</span>
                      <span style={{ fontSize: '10px', color: '#555555', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#888888', margin: 0, marginTop: '2px', lineHeight: '1.4' }}>{n.body}</p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8B5CF6', flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(6,0,15,0.97)', border: '1px solid rgba(139,92,246,0.4)',
          borderRadius: '16px', padding: '12px 18px',
          display: 'flex', gap: '12px', alignItems: 'center',
          zIndex: 100, animation: 'slideUp 0.3s ease',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          maxWidth: '340px', width: 'calc(100% - 32px)',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{TYPE_ICONS[toast.type] ?? 'Bell'}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{toast.title}</p>
            <p style={{ fontSize: '12px', color: '#999999', margin: 0, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.body}</p>
          </div>
        </div>
      )}
    </>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  title?: string
  coins?: number
  showBack?: boolean
  onBack?: () => void
}

export default function TopBar({ title = 'Orion English', coins, showBack, onBack }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40" style={{ background: 'rgba(6,0,15,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="p-1 -ml-1"
              style={{ color: '#999999' }}
              aria-label="Go back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">O</span>
            </div>
            <span className="font-bold text-white text-base">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {coins !== undefined && <CoinDisplay coins={coins} />}
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
