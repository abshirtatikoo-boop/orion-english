'use client'

import React, { memo, useState, useRef, useEffect, useCallback } from 'react'

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: '#0F1C2E', text: '#60A5FA' },
  intermediate: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6' },
  advanced:     { bg: '#0A2218', text: '#34D399' },
}

interface ChatMember {
  user_id: string
  is_muted: boolean
}

interface ChatMessage {
  id: string
  user_id: string
  content: string
  created_at: string
  sender?: {
    name: string | null
    level: string | null
    is_premium: boolean
  } | null
}

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (content: string) => Promise<void>
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserName: string
  currentUserLevel: string
  currentUserIsPremium: boolean
  hostId: string
  isAdmin: boolean
  isMuted: boolean
  members: ChatMember[]
  onDeleteMessage: (id: string) => void
}

const ChatPanel = memo(function ChatPanel({
  messages,
  onSend,
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserLevel,
  currentUserIsPremium,
  hostId,
  isAdmin,
  isMuted,
  members,
  onDeleteMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || sending || isMuted) return
    setSending(true)
    setInput('')
    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
    }
  }, [input, sending, isMuted, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!isOpen) return null

  return (
    <div
      className="chat-slide-up"
      style={{
        position: 'fixed',
        bottom: '160px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '406px',
        maxHeight: '50vh',
        zIndex: 46,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        animation: 'chatSlideUp 0.25s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}> Chat</span>
        <button
          onClick={onClose}
          style={{
            color: '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '4px',
            minWidth: '28px',
            minHeight: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          minHeight: 0,
        }}
      >
        {/* Push messages to bottom when list is short */}
        <div style={{ flex: 1 }} />

        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '20px 0',
              color: '#555',
            }}
          >
            <span style={{ fontSize: '24px' }}>👋</span>
            <span style={{ fontSize: '12px' }}>Say hello!</span>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId
          const senderName = isMe ? currentUserName : (msg.sender?.name ?? 'Learner')
          const senderLevel = isMe ? currentUserLevel : (msg.sender?.level ?? 'beginner')
          const senderPremium = isMe ? currentUserIsPremium : (msg.sender?.is_premium ?? false)
          const lvl = LEVEL_COLORS[senderLevel] ?? LEVEL_COLORS.beginner
          const senderIsHost = msg.user_id === hostId
          const senderMember = members.find(m => m.user_id === msg.user_id)
          const senderMuted = senderMember?.is_muted ?? false

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '7px',
                marginBottom: '7px',
                flexDirection: isMe ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: lvl.bg,
                  color: lvl.text,
                  border: senderIsHost ? '1.5px solid #8B5CF6' : '1.5px solid #2A2A2A',
                }}
              >
                {(senderName[0] ?? 'L').toUpperCase()}
              </div>

              {/* Bubble column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '72%',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Name row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    paddingLeft: '2px',
                    paddingRight: '2px',
                    marginBottom: '2px',
                  }}
                >
                  {senderPremium && <span style={{ fontSize: '9px' }}></span>}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: senderPremium ? '#8B5CF6' : '#888',
                    }}
                  >
                    {isMe ? 'You' : senderName}
                  </span>
                  {senderIsHost && (
                    <span
                      style={{
                        fontSize: '8px',
                        background: 'rgba(139,92,246,0.1)',
                        color: '#8B5CF6',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      Host
                    </span>
                  )}
                  {senderMuted && <span style={{ fontSize: '8px', color: '#FF6B6B' }}>🔇</span>}
                </div>

                {/* Bubble + delete */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      padding: '7px 11px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      ...(senderMuted
                        ? {
                            background: 'rgba(0,0,0,0.5)',
                            color: '#444',
                            borderBottomLeftRadius: '4px',
                            fontStyle: 'italic',
                          }
                        : isMe
                          ? { background: '#8B5CF6', color: '#000', borderBottomRightRadius: '4px' }
                          : senderPremium
                            ? {
                                background: 'rgba(26,21,0,0.8)',
                                color: '#fff',
                                borderBottomLeftRadius: '4px',
                                borderLeft: '3px solid #8B5CF6',
                              }
                            : {
                                background: 'rgba(255,255,255,0.07)',
                                color: '#fff',
                                borderBottomLeftRadius: '4px',
                              }),
                    }}
                  >
                    {senderMuted ? '[muted]' : msg.content}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        opacity: 0.35,
                        fontSize: '11px',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                      title="Delete"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {isMuted ? (
          <p
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#FF6B6B',
              margin: 0,
              padding: '6px 0',
            }}
          >
            🔇 You are muted by the host
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '6px 8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#fff',
                padding: '2px 6px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: input.trim() && !sending ? '#8B5CF6' : '#333',
                color: input.trim() && !sending ? '#000' : '#666',
                cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', transform: 'rotate(90deg)' }}>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default ChatPanel
