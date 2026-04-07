export default function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-3">
      {[60, 80, 50].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton flex-shrink-0" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div className="flex flex-col gap-2 flex-1">
            <div className="skeleton" style={{ height: 12, width: `${w}%` }} />
            <div className="skeleton" style={{ height: 10, width: `${w - 20}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
