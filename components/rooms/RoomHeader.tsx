'use client'

import React, { memo } from 'react'

interface RoomHeaderProps {
  roomName: string
  roomCode: string | null
  isPrivate: boolean
  memberCount: number
  maxSeats: number
  onLeave: () => void
  copiedId: boolean
  onCopyId: () => void
}

const RoomHeader = memo(function RoomHeader({
  roomName,
  roomCode,
  isPrivate,
  memberCount,
  maxSeats,
  onLeave,
  copiedId,
  onCopyId,
}: RoomHeaderProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139,92,246,0.12)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Back button */}
      <button
        onClick={onLeave}
        aria-label="Back"
        style={{
          color: '#999',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          padding: '4px',
          flexShrink: 0,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '32px',
          minHeight: '32px',
        }}
      >
        ←
      </button>

      {/* Room name + code */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            color: '#fff',
            fontSize: '15px',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {roomName}
        </p>
        {roomCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            {isPrivate && (
              <span style={{ fontSize: '10px', color: '#666' }}>🔒 Private •</span>
            )}
            <span style={{ fontSize: '10px', color: '#666' }}>ID: {roomCode}</span>
            <button
              onClick={onCopyId}
              style={{
                fontSize: '10px',
                color: copiedId ? '#34D399' : '#555',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              {copiedId ? '✓ Copied' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Member count */}
      <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>
         {memberCount}/{maxSeats}
      </span>

      {/* Leave button */}
      <button
        onClick={onLeave}
        style={{
          flexShrink: 0,
          fontSize: '12px',
          padding: '6px 14px',
          borderRadius: '999px',
          fontWeight: 600,
          background: 'transparent',
          color: '#FF6B6B',
          border: '1px solid rgba(255,107,107,0.5)',
          cursor: 'pointer',
          minHeight: '32px',
        }}
      >
        Leave
      </button>
    </div>
  )
})

export default RoomHeader
