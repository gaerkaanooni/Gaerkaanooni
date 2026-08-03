import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'

export default auth((req) => {
  const path = req.nextUrl.pathname
  if (path.startsWith('/dashboard')) {
    const role = req.auth?.user?.role as Role | undefined
    if (!canPerform(role, 'dashboard.view')) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
