import { type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  // A stale/invalidated refresh token makes getUser throw ("Invalid Refresh
  // Token: Refresh Token Not Found"). Treat it as signed out — @supabase/ssr
  // clears the session cookies on the response via setAll.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

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
