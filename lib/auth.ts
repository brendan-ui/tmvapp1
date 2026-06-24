import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'themilvet.org').toLowerCase()

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // hd hints Google Workspace to restrict to the company domain (UX);
      // the real enforcement is the signIn callback below.
      authorization: { params: { hd: ALLOWED_DOMAIN, prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile as { email?: string })?.email?.toLowerCase() || ''
      const verified = (profile as { email_verified?: boolean })?.email_verified
      return email.endsWith('@' + ALLOWED_DOMAIN) && verified !== false
    },
  },
  // On auth errors (e.g. wrong domain) send users back to the dashboard,
  // which renders its own sign-in / access-denied screen.
  pages: { signIn: '/dashboard', error: '/dashboard' },
}
