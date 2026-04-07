'use client'

// Gal — Login page

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-5" style={{ background: 'transparent' }}>
      {/* Top logo */}
      <div className="flex justify-center pt-12 pb-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-black font-bold text-2xl">O</span>
          </div>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="text-sm" style={{ color: '#999999' }}>Sign in to continue learning</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            placeholder="••••••••"
            required
            minLength={6}
            className="input"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-btn px-4 py-3 text-sm" style={{ background: '#2A0A0A', border: '1px solid #5A1A1A', color: '#FF6B6B' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span className="text-xs" style={{ color: '#666666' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <p className="text-center text-sm" style={{ color: '#999999' }}>
        {"Don't have an account? "}
        <Link href="/signup" className="text-primary font-semibold">
          Sign up free
        </Link>
      </p>

      <p className="text-center text-xs mt-4" style={{ color: '#666666' }}>
        Akoon ma lihid?{' '}
        <Link href="/signup" className="text-primary">
          Diiwaangeli bilaash
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ background: 'transparent' }} />}>
      <LoginContent />
    </Suspense>
  )
}
