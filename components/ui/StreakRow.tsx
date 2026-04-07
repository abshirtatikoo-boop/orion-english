// Safirada toosan — 7-day streak visualization
// Shows yellow dots for days practiced, gray for missed, today highlighted

interface StreakRowProps {
  streak: number   // current consecutive day streak
  lastActive: string | null  // ISO date string or null
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function StreakRow({ streak, lastActive }: StreakRowProps) {
  const today = new Date()
  const todayIdx = (today.getDay() + 6) % 7 // 0 = Monday

  // Build which days in the current week are "active"
  const activeDays = new Set<number>()
  if (lastActive) {
    const last = new Date(lastActive)
    for (let i = 0; i < Math.min(streak, 7); i++) {
      const d = new Date(last)
      d.setDate(d.getDate() - i)
      const idx = (d.getDay() + 6) % 7
      activeDays.add(idx)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">
           {streak}-day streak
        </span>
        <span className="text-xs" style={{ color: '#999999' }}>
          {streak > 0 ? 'Keep it up!' : 'Start today!'}
        </span>
      </div>
      <div className="flex gap-2">
        {DAYS.map((day, i) => {
          const isToday = i === todayIdx
          const isDone = activeDays.has(i)
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={
                  isDone
                    ? { background: '#8B5CF6', color: '#000000' }
                    : isToday
                    ? { border: '2px solid #8B5CF6', color: '#8B5CF6', background: 'rgba(139,92,246,0.08)' }
                    : { background: 'rgba(255,255,255,0.1)', color: '#666666' }
                }
              >
                {isDone ? '✓' : day}
              </div>
              <span
                className="text-[10px]"
                style={{ color: isToday ? '#8B5CF6' : '#666666', fontWeight: isToday ? 600 : 400 }}
              >
                {DAYS[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
