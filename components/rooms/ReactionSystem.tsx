'use client'

import React, { memo } from 'react'

export interface FloatingReaction {
  id: string
  emoji: string
  userId: string
}

interface ReactionSystemProps {
  reactions: FloatingReaction[]
  onReact: (emoji: string) => void
  isOpen: boolean
}

const EMOJIS = ['🔥', '❤️', '😂', '👏'] as const

const ReactionSystem = memo(function ReactionSystem({
  reactions,
  onReact,
  isOpen,
}: ReactionSystemProps) {
  return (
    <>
      {/* Floating emojis — always rendered, appear over everything */}
      {reactions.map(r => (
        <FloatingEmoji key={r.id} emoji={r.emoji} />
      ))}

      {/* Emoji picker — only when open */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '168px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 44,
            display: 'flex',
            gap: '10px',
            background: 'rgba(18,18,18,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '999px',
            padding: '8px 16px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              aria-label={`React with ${emoji}`}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, transform 0.1s',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  )
})

interface FloatingEmojiProps {
  emoji: string
}

function FloatingEmoji({ emoji }: FloatingEmojiProps) {
  // Random horizontal offset so emojis don't stack on top of each other
  const offset = Math.floor(Math.random() * 120) - 60

  return (
    <div
      className="float-emoji"
      style={{
        position: 'fixed',
        bottom: '180px',
        left: `calc(50% + ${offset}px)`,
        fontSize: '32px',
        pointerEvents: 'none',
        zIndex: 60,
        userSelect: 'none',
      }}
    >
      {emoji}
    </div>
  )
}

export default ReactionSystem
