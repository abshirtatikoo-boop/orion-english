'use client'

import React, { memo } from 'react'

interface BottomControlsProps {
  hasJoined: boolean
  isVoiceMuted: boolean
  micPermissionDenied: boolean
  onToggleMic: () => void
  chatOpen: boolean
  onToggleChat: () => void
  reactionsOpen: boolean
  onToggleReactions: () => void
  onRaiseHand: () => void
  isHandRaised: boolean
  onLeave: () => void
}

const BottomControls = memo(function BottomControls({
  hasJoined,
  isVoiceMuted,
  micPermissionDenied,
  onToggleMic,
  chatOpen,
  onToggleChat,
  reactionsOpen,
  onToggleReactions,
  onRaiseHand,
  isHandRaised,
  onLeave,
}: BottomControlsProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        width: 'calc(100% - 32px)',
        maxWidth: '398px',
        background: 'rgba(20,20,20,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}
    >
      {/* Chat */}
      <ControlBtn
        onClick={onToggleChat}
        active={chatOpen}
        activeColor="#8B5CF6"
        label="Chat"
        size={44}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>
      </ControlBtn>

      {/* Reactions */}
      <ControlBtn
        onClick={onToggleReactions}
        active={reactionsOpen}
        activeColor="#7C3AED"
        label="Reactions"
        size={44}
      >
        😊
      </ControlBtn>

      {/* MIC — center, largest */}
      <button
        onClick={onToggleMic}
        disabled={micPermissionDenied || !hasJoined}
        aria-label={isVoiceMuted ? 'Unmute mic' : 'Mute mic'}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: 'none',
          cursor: micPermissionDenied || !hasJoined ? 'not-allowed' : 'pointer',
          fontSize: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: micPermissionDenied || !hasJoined ? 0.45 : 1,
          transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
          background: isVoiceMuted ? 'rgba(255,255,255,0.08)' : '#8B5CF6',
          boxShadow: isVoiceMuted ? 'none' : '0 0 16px rgba(139,92,246,0.55)',
        }}
      >
        {isVoiceMuted ? '🔇' : '🎤'}
      </button>

      {/* Raise hand */}
      <ControlBtn
        onClick={onRaiseHand}
        active={isHandRaised}
        activeColor="#A78BFA"
        label="Raise hand"
        size={44}
      >
        ✋
      </ControlBtn>

      {/* Leave */}
      <ControlBtn
        onClick={onLeave}
        active={false}
        activeColor="#FF4444"
        label="Leave room"
        size={44}
        danger
      >
        🚪
      </ControlBtn>
    </div>
  )
})

interface ControlBtnProps {
  onClick: () => void
  active: boolean
  activeColor: string
  label: string
  size: number
  danger?: boolean
  children: React.ReactNode
}

const ControlBtn = memo(function ControlBtn({
  onClick,
  active,
  activeColor,
  label,
  size,
  danger = false,
  children,
}: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s, box-shadow 0.15s',
        background: active
          ? `${activeColor}22`
          : danger
            ? 'rgba(255,68,68,0.1)'
            : 'rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 10px ${activeColor}44` : 'none',
        outline: active ? `1.5px solid ${activeColor}66` : 'none',
      }}
    >
      {children}
    </button>
  )
})

export default BottomControls
