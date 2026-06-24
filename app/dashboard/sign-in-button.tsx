'use client'

import { signIn } from 'next-auth/react'

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        border: '1px solid #C9A96E',
        background: 'linear-gradient(180deg, #C9A96E, #B8965C)',
        color: '#1A2040',
        fontWeight: 600,
        fontSize: 15,
        padding: '12px 22px',
        borderRadius: 10,
        fontFamily: 'inherit',
      }}
    >
      Sign in with Google
    </button>
  )
}
