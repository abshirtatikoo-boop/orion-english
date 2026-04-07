// Bogga hore — Landing page
// "Barso English si fudud" = Learn English easily

import Link from 'next/link'

const FEATURES = [
  {
    icon: '',
    title: 'Shadowing',
    desc: 'Listen and repeat native speakers to perfect your pronunciation.',
    color: 'rgba(255,255,255,0.04)',
    accent: '#8B5CF6',
  },
  {
    icon: '',
    title: 'AI Chat Tutor',
    desc: 'Practice conversation with your personal AI English teacher.',
    color: 'rgba(255,255,255,0.04)',
    accent: '#60A5FA',
  },
  {
    icon: '',
    title: 'Study Groups',
    desc: 'Join groups of Somali learners and practice together.',
    color: 'rgba(255,255,255,0.04)',
    accent: '#8B5CF6',
  },
  {
    icon: '',
    title: 'Video Shorts',
    desc: 'Learn English through short, engaging video clips.',
    color: 'rgba(255,255,255,0.04)',
    accent: '#34D399',
  },
] as const

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: 'transparent', color: '#FFFFFF' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-black font-bold text-sm">O</span>
          </div>
          <span className="font-bold text-white">Orion English</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-primary"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-8 pb-12">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(139,92,246,0.12)' }}>
          <span className="text-5xl">🌟</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
          Barso English<br />
          <span style={{ color: '#8B5CF6' }}>si fudud</span>
        </h1>
        <p className="text-sm mb-1" style={{ color: '#999999' }}>
          Learn English easily — built for Somali speakers
        </p>
        <p className="text-xs mb-8" style={{ color: '#666666' }}>
          Loogu talagalay Soomaalida Ingiriisi baranaya
        </p>

        {/* Stats row */}
        <div className="flex gap-6 mb-10">
          {[
            { value: '10K+', label: 'Learners' },
            { value: '500+', label: 'Lessons' },
            { value: '4.9★', label: 'Rating' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-bold text-xl text-white">{stat.value}</span>
              <span className="text-xs" style={{ color: '#999999' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/signup"
          className="btn-primary w-full text-center block text-base"
        >
          Get Started Free →
        </Link>
        <p className="text-xs mt-3" style={{ color: '#666666' }}>No credit card required</p>
      </section>

      {/* Feature highlights */}
      <section className="px-5 pb-8">
        <h2 className="font-bold text-white mb-4 text-center">
          Everything you need to learn English
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-card p-4 flex flex-col gap-2"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #2A2A2A' }}
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-bold text-sm text-white">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#999999' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 pb-10 mx-4 rounded-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2A2A2A' }}>
        <h2 className="font-bold text-white mb-5 pt-5 text-center">How it works</h2>
        <div className="flex flex-col gap-4">
          {[
            { step: '1', title: 'Take a level test', desc: 'Find out your English level in 5 minutes' },
            { step: '2', title: 'Practice daily', desc: 'Shadow, chat with AI, and join your group' },
            { step: '3', title: 'Earn coins', desc: 'Complete goals, earn rewards, climb the ranks' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-black text-xs font-bold">{item.step}</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{item.title}</p>
                <p className="text-xs" style={{ color: '#999999' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/signup"
          className="btn-outline w-full text-center block mt-6 mb-5"
        >
          Start Learning Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs" style={{ color: '#666666' }}>
        © 2025 Orion English · Made with  for Somali speakers
      </footer>
    </main>
  )
}
