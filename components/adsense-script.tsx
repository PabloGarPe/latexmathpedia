"use client"

import { useAuth } from "@/contexts/auth-context"

// AdSense es código de terceros y el access token va en la sesión (`/api/auth/session`),
// así que un script externo podría leerlo (#292). A los administradores, que son las
// cuentas con más privilegios, no se les carga nunca. React 19 sube el <script async src>
// al <head> y lo deduplica.
export function AdsenseScript() {
  const { loading, isAdmin } = useAuth()

  if (loading || isAdmin) return null

  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6477110291995241"
      crossOrigin="anonymous"
    />
  )
}
