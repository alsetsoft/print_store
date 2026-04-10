import { type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isAccountRoute = pathname.startsWith('/account')
  const isAdminLoginPage = pathname === '/admin/login'

  if (isAdminRoute) {
    // Authenticated user on admin login page → redirect to admin
    if (user && isAdminLoginPage) {
      return Response.redirect(new URL('/admin', request.url))
    }
    // Unauthenticated user on protected admin page → redirect to admin login
    if (!user && !isAdminLoginPage) {
      return Response.redirect(new URL('/admin/login', request.url))
    }
  }

  if (isAccountRoute) {
    // Unauthenticated user on account page → redirect to store login
    if (!user) {
      return Response.redirect(new URL(`/login?next=${pathname}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
}
