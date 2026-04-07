'use client'

export default function OfflinePage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center"
      style={{ background: '#000000' }}
    >
      {/* Gold "O" logo */}
      <div
        className="flex items-center justify-center rounded-full font-bold"
        style={{
          width: 80,
          height: 80,
          background: '#8B5CF6',
          color: '#FFFFFF',
          fontSize: 40,
        }}
      >
        O
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">You're offline</h1>
        <p style={{ color: '#999999' }}>Check your connection and try again</p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-full font-bold text-white text-sm"
        style={{ background: '#8B5CF6' }}
      >
        Retry
      </button>
    </div>
  )
}
