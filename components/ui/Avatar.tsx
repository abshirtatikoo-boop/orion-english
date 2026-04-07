interface AvatarProps {
  name?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 32, md: 48, lg: 80 }
const FONT_MAP = { sm: '12px', md: '16px', lg: '28px' }

export default function Avatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const px = SIZE_MAP[size]
  const fontSize = FONT_MAP[size]
  const initials = (name ?? '?')[0].toUpperCase()

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #667eea, #764ba2)',
        fontSize,
        fontWeight: 700,
        color: '#FFFFFF',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? 'avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => {
            // Fall back to initials on broken image
            const el = e.currentTarget
            el.style.display = 'none'
            if (el.parentElement) {
              el.parentElement.style.background = 'linear-gradient(135deg, #667eea, #764ba2)'
              el.parentElement.textContent = initials
            }
          }}
        />
      ) : (
        initials
      )}
    </div>
  )
}
