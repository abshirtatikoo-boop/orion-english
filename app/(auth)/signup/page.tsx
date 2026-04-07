'use client'

// Diiwaangelinta — Sign up page

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { claimDailyLoginBonus } from '@/lib/coins'

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Signup failed. Please try again.')
        return
      }

      // 2. Create user profile row
      const publicId = Math.floor(100000 + Math.random() * 900000).toString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        level: 'beginner',
        coins: 0,
        streak: 0,
        is_premium: false,
        public_id: publicId,
      } as any)

      if (profileError && profileError.code !== '23505') {
        console.error('[signup] profile error:', profileError)
      }

      // 3. Claim first-day login bonus
      await claimDailyLoginBonus(authData.user.id)

      // 4. Redirect to level test
      router.push('/level-test')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-5" style={{ background: 'transparent' }}>
      {/* Top */}
      <div className="flex justify-center pt-10 pb-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-black font-bold text-2xl">O</span>
          </div>
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-sm" style={{ color: '#999999' }}>Start your English journey today</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#cccccc' }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Fadumo Hassan"
            required
            className="input"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#cccccc' }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="input"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#cccccc' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="input"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-btn px-4 py-3 text-sm" style={{ background: '#2A0A0A', border: '1px solid #5A1A1A', color: '#FF6B6B' }}>
            {error}
          </div>
        )}

        {/* Coin reward notice */}
        <div className="rounded-btn px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid #3A3000' }}>
          <span className="text-lg"></span>
          <p className="text-xs" style={{ color: '#cccccc' }}>
            <span className="font-semibold" style={{ color: '#8B5CF6' }}>+10 coins</span> awarded for signing up today!
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-1"
        >
          {loading ? 'Creating account…' : 'Create Account →'}
        </button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: '#666666' }}>
        By signing up you agree to our Terms of Service
      </p>

      <p className="text-center text-sm mt-4" style={{ color: '#999999' }}>
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
