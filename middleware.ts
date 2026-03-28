import { type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  // Authenticated user on login page → redirect to admin
  if (user && isLoginPage) {
    return Response.redirect(new URL('/admin', request.url))
  }

  // Unauthenticated user on protected admin page → redirect to login
  if (!user && !isLoginPage) {
    return Response.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
