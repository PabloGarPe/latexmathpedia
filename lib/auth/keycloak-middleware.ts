import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Rutas que requieren sesión iniciada
const protectedPaths = ['/dashboard/profile', '/dashboard/admin']
// Rutas que además requieren el rol de admin de Keycloak
const adminPaths = ['/dashboard/admin']
// Rutas de login/registro: si ya hay sesión se redirige al dashboard
const authPaths = ['/auth/login', '/auth/register']

const matches = (pathname: string, paths: string[]) =>
  paths.some(path => pathname === path || pathname.startsWith(`${path}/`))

// Solo se importa (y por tanto solo se evalúa `auth.ts`/Keycloak) cuando
// NEXT_PUBLIC_AUTH_MODE=keycloak — ver proxy.ts. En modo mock este módulo nunca se carga,
// así que no hace falta tener KEYCLOAK_*/AUTH_* configuradas para desarrollar sin Keycloak.
export const protectRoutes = auth((request) => {
  const { pathname, search } = request.nextUrl
  const session = request.auth
  const isAuthenticated = !!session && !session.error

  if (matches(pathname, protectedPaths) && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.nextUrl.origin)
    loginUrl.searchParams.set('redirect', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (matches(pathname, adminPaths) && !session?.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
  }

  if (matches(pathname, authPaths) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
  }

  const response = NextResponse.next()

  // Headers para mejorar el manejo de cookies en Safari
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
})
