import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma, verifyCredentials } from '@pil/db'
import type { Role } from '@pil/domain'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login/staff' },
  cookies: {
    // Renamed so a stale `authjs.session-token` from an earlier secret is never read back
    // (avoids `JWTSessionError: no matching decryption secret` on every request).
    sessionToken: {
      name: 'pil_staff_session',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? '')
        const password = String(creds?.password ?? '')
        const user = await verifyCredentials(prisma, email, password)
        if (!user) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role
        token.sub = user.id
      }
      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = (token.sub as string) ?? ''
        session.user.role = (token.role as Role) ?? 'PUBLIC'
      }
      return session
    },
  },
})
