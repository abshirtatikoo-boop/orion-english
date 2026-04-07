'use client'

import React, { memo } from 'react'

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: '#0F1C2E', text: '#60A5FA' },
  intermediate: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6' },
  advanced:     { bg: '#0A2218', text: '#34D399' },
}

interface StageMemberUser {
  name: string | null
  username?: string | null
  avatar_url?: string | null
  level: string | null
  is_premium: boolean
}

interface StageMember {
  id: string
  user_id: string
  seat_number: number | null
  is_admin: boolean
  is_muted: boolean
  user?: StageMemberUser | null
}

interface SpeakerStageProps {
  members: StageMember[]
  maxSeats: number
  currentUserId: string
  currentUserName: string
  currentUserLevel: string
  currentUserIsPremium: boolean
  hostId: string
  speakingUsers: string[]
  voiceUsers: string[]
  handRaisedUsers: string[]
  voiceMuted: boolean
  onAvatarClick: (userId: string) => void
}

interface AvatarBubbleProps {
  member: StageMember
  isHost: boolean
  isMe: boolean
  size: number
  displayName: string
  displayLevel: string
  displayPremium: boolean
  isSpeaking: boolean
  isInVoice: boolean
  hasHandRaised: boolean
  isVoiceMuted: boolean
  currentUserId: string
  onAvatarClick: (userId: string) => void
}

const AvatarBubble = memo(function AvatarBubble({
  member,
  isHost,
  isMe,
  size,
  displayName,
  displayLevel,
  displayPremium,
  isSpeaking,
  isInVoice,
  hasHandRaised,
  isVoiceMuted,
  currentUserId,
  onAvatarClick,
}: AvatarBubbleProps) {
  const lvl = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.beginner
  const avatarUrl = member.user?.avatar_url ?? null
  const initial = (displayName?.[0] ?? 'L').toUpperCase()
  const shortName = (() => {
    const first = displayName?.split(' ')[0] ?? ''
    return first.length > 10 ? first.slice(0, 10) + '…' : first
  })()

  const borderStyle = isSpeaking
    ? { border: `${isHost ? 3 : 2.5}px solid #22C55E` }
    : isHost
      ? { border: '3px solid #8B5CF6' }
      : displayPremium
        ? { border: '2px solid #8B5CF6' }
        : { border: '2px solid #333' }

  const shadowClass = isSpeaking ? 'speaking-ring' : isHost ? 'host-glow' : ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
      }}
    >
      {/* Hand raised indicator */}
      {hasHandRaised && (
        <span
          className="hand-bounce"
          style={{ fontSize: '18px', position: 'absolute', top: `-${size * 0.45}px`, zIndex: 2 }}
        >
          ✋
        </span>
      )}

      <button
        onClick={() => onAvatarClick(member.user_id)}
        className={`avatar-enter ${shadowClass}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.round(size * 0.3)}px`,
          fontWeight: 700,
          overflow: 'hidden',
          background: lvl.bg,
          color: lvl.text,
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative',
          transition: 'border 0.15s',
          ...borderStyle,
        }}
        aria-label={`View ${displayName}'s profile`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          initial
        )}
      </button>

      {/* Badges row */}
      <div
        style={{
          position: 'absolute',
          bottom: `${size * 0.38}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '2px',
          pointerEvents: 'none',
        }}
      >
        {/* Crown for host/admin */}
        {(isHost || member.is_admin) && (
          <span style={{ fontSize: `${Math.round(size * 0.17)}px`, lineHeight: 1 }}>👑</span>
        )}
        {/* Room-muted badge */}
        {member.is_muted && (
          <span style={{ fontSize: `${Math.round(size * 0.17)}px`, lineHeight: 1 }}>🔇</span>
        )}
        {/* Voice-active badge for own avatar */}
        {isMe && !isVoiceMuted && (
          <span style={{ fontSize: `${Math.round(size * 0.17)}px`, lineHeight: 1 }}>🎤</span>
        )}
      </div>

      {/* Name label */}
      <span
        style={{
          fontSize: isHost ? '12px' : '10px',
          fontWeight: isHost ? 600 : 400,
          color: displayPremium ? '#8B5CF6' : isHost ? '#ddd' : '#888',
          maxWidth: `${size + 8}px`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {isMe ? 'You' : shortName}
      </span>
    </div>
  )
})

interface EmptySeatProps {
  size: number
  seatNum: number
}

const EmptySeat = memo(function EmptySeat({ size, seatNum }: EmptySeatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.round(size * 0.35)}px`,
          color: '#444',
          border: '2px dashed #333',
          background: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        +
      </div>
      <span style={{ fontSize: '10px', color: '#444', textAlign: 'center' }}>S{seatNum}</span>
    </div>
  )
})

const SpeakerStage = memo(function SpeakerStage({
  members,
  maxSeats,
  currentUserId,
  currentUserName,
  currentUserLevel,
  currentUserIsPremium,
  hostId,
  speakingUsers,
  voiceUsers,
  handRaisedUsers,
  voiceMuted,
  onAvatarClick,
}: SpeakerStageProps) {
  const hostMember = members.find(m => m.user_id === hostId) ?? null
  const otherMembers = members.filter(m => m.user_id !== hostId)
  const emptyCount = Math.max(0, maxSeats - members.length)
  // Seat numbers for empty placeholders (those not occupied)
  const occupiedSeats = new Set(members.map(m => m.seat_number))
  const emptySeats = Array.from({ length: maxSeats }, (_, i) => i + 1).filter(
    n => !occupiedSeats.has(n) && n !== 1
  ).slice(0, emptyCount)

  const getMemberDisplay = (m: StageMember) => {
    const isMe = m.user_id === currentUserId
    return {
      isMe,
      displayName: isMe ? currentUserName : (m.user?.name || m.user?.username || 'Learner'),
      displayLevel: isMe ? currentUserLevel : (m.user?.level ?? 'beginner'),
      displayPremium: isMe ? currentUserIsPremium : (m.user?.is_premium ?? false),
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 24px 200px',
        gap: '32px',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      {/* Host row */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        {hostMember ? (
          (() => {
            const { isMe, displayName, displayLevel, displayPremium } = getMemberDisplay(hostMember)
            return (
              <AvatarBubble
                member={hostMember}
                isHost={true}
                isMe={isMe}
                size={80}
                displayName={displayName}
                displayLevel={displayLevel}
                displayPremium={displayPremium}
                isSpeaking={speakingUsers.includes(hostMember.user_id)}
                isInVoice={voiceUsers.includes(hostMember.user_id)}
                hasHandRaised={handRaisedUsers.includes(hostMember.user_id)}
                isVoiceMuted={voiceMuted}
                currentUserId={currentUserId}
                onAvatarClick={onAvatarClick}
              />
            )
          })()
        ) : (
          <EmptySeat size={80} seatNum={1} />
        )}

        {/* Host label */}
        <span
          style={{
            fontSize: '10px',
            color: '#8B5CF6',
            background: 'rgba(139,92,246,0.08)',
            padding: '2px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(139,92,246,0.2)',
            fontWeight: 600,
            marginTop: '2px',
          }}
        >
          Host
        </span>
      </div>

      {/* Divider */}
      {(otherMembers.length > 0 || emptySeats.length > 0) && (
        <div
          style={{
            width: '120px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)',
          }}
        />
      )}

      {/* Others + empty seats */}
      {(otherMembers.length > 0 || emptySeats.length > 0) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            maxWidth: '320px',
          }}
        >
          {otherMembers.map(m => {
            const { isMe, displayName, displayLevel, displayPremium } = getMemberDisplay(m)
            return (
              <AvatarBubble
                key={m.user_id}
                member={m}
                isHost={false}
                isMe={isMe}
                size={60}
                displayName={displayName}
                displayLevel={displayLevel}
                displayPremium={displayPremium}
                isSpeaking={speakingUsers.includes(m.user_id)}
                isInVoice={voiceUsers.includes(m.user_id)}
                hasHandRaised={handRaisedUsers.includes(m.user_id)}
                isVoiceMuted={voiceMuted}
                currentUserId={currentUserId}
                onAvatarClick={onAvatarClick}
              />
            )
          })}

          {emptySeats.map(n => (
            <EmptySeat key={`empty-${n}`} size={60} seatNum={n} />
          ))}
        </div>
      )}
    </div>
  )
})

export default SpeakerStage
