// Muuqaalka lacagta — Coin balance display

interface CoinDisplayProps {
  coins: number
  size?: 'sm' | 'md'
  animated?: boolean
}

export default function CoinDisplay({ coins, size = 'md', animated = false }: CoinDisplayProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold
        ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1.5'}
        ${animated ? 'animate-bounce' : ''}
      `}
      style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
    >
      {/* Coin icon */}
      <svg
        viewBox="0 0 24 24"
        fill="#8B5CF6"
        className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
      >
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="black" fontWeight="bold">
          C
        </text>
      </svg>
      <span>{coins.toLocaleString()}</span>
    </div>
  )
}
