'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.endsWith('@themilvet.org')) {
      setError('Please use your @themilvet.org email address.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo area */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-navy">
              TMV Operating System
            </h1>
            <p className="font-body text-sm text-gray-500 mt-2">
              The Military Veteran — Internal Platform
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-navy mb-2">Check your email</h2>
              <p className="font-body text-sm text-gray-500">
                We sent a magic link to <span className="font-semibold">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 font-body text-sm text-gold hover:text-navy transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block font-body text-sm font-medium text-navy mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@themilvet.org"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
                />
              </div>

              {error && (
                <p className="font-body text-sm text-tmv-red">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-navy text-white rounded-lg font-body text-sm font-medium hover:bg-navy/90 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center font-body text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} The Military Veteran. All rights reserved.
        </p>
      </div>
    </div>
  )
}
