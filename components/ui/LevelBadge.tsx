// Heerka waxbarashada: bilow / dhexe / horumarsan
// Learning level badge: beginner / intermediate / advanced

type Level = 'beginner' | 'intermediate' | 'advanced'

interface LevelBadgeProps {
  level: Level
  xp?: number          // current XP within level (0-99)
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; emoji: string; nextLevel: string }> = {
  beginner: {
    label: 'Beginner',
    color: '#60A5FA',
    bg: '#0F1C2E',
    emoji: '🌱',
    nextLevel: 'Intermediate',
  },
  intermediate: {
    label: 'Intermediate',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    emoji: '',
    nextLevel: 'Advanced',
  },
  advanced: {
    label: 'Advanced',
    color: '#34D399',
    bg: '#0A2218',
    emoji: '',
    nextLevel: 'Master',
  },
}

export default function LevelBadge({ level, xp = 0, showProgress = false, size = 'md' }: LevelBadgeProps) {
  const config = LEVEL_CONFIG[level]
  const progress = Math.min(100, xp)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <div className="flex flex-col gap-2">
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${sizeClasses[size]}`}
        style={{ color: config.color, background: config.bg }}
      >
        <span>{config.emoji}</span>
        {config.label}
      </span>

      {showProgress && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs" style={{ color: '#999999' }}>
            <span>{xp} XP</span>
            <span>100 XP → {config.nextLevel}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: config.color }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
