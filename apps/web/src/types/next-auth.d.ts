import type { Role } from '@pil/domain'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      name?: string | null
      email?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role
    sub?: string
  }
}
