import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_MODE } from '@/lib/env'

// En modo "keycloak" la protección real de rutas vive en `lib/auth/keycloak-middleware.ts`
// (sesión de Auth.js + rol de Keycloak). Se importa de forma dinámica y solo en ese modo:
// así, en modo "mock" (por defecto) este fichero nunca evalúa
// `auth.ts`/Keycloak, y no hace falta tener AUTH_SECRET/KEYCLOAK_* configuradas para
// desarrollar sin un servidor Keycloak levantado.
//
// En modo mock, la identidad de prueba vive en localStorage (solo accesible en cliente,
// no aquí), así que la protección de /dashboard/admin y compañía la siguen haciendo los
// hooks de cliente `useProtectedRoute`/`useAdminRoute` mientras tanto.
export default async function proxy(request: NextRequest) {
  if (AUTH_MODE === 'keycloak') {
    const { protectRoutes } = await import('@/lib/auth/keycloak-middleware')
    const handler = await protectRoutes
    return handler(request, { params: Promise.resolve({}) })
  }

  const response = NextResponse.next()

  // Headers para mejorar el manejo de cookies en Safari
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, incluidas las de Auth.js)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
