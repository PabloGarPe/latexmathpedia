"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"

export const PROFILE_PATH = "/dashboard/profile"

// Solo una vez por sesión de pestaña, y en memoria (nada en localStorage: la fuente de verdad es
// `profileCompletedAt` del servidor). Un flag de módulo sobrevive a las navegaciones internas
// pero se reinicia al recargar la pestaña.
let completionPromptShown = false

export function isProfilePath(pathname: string) {
  return pathname === PROFILE_PATH || pathname.startsWith(`${PROFILE_PATH}/`)
}

// Lleva al formulario de perfil a quien aún no lo ha completado, una sola vez, justo tras cargar
// /me. No bloquea nada: si luego sale del formulario, queda el banner. Si /me falla (p. ej. 401
// en modo mock) no hace nada. No renderiza nada.
export function ProfileCompletionGuard() {
  const { isAuthenticated } = useAuth()
  const { data: me } = useMe(isAuthenticated)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!me || me.profileCompletedAt != null || completionPromptShown) return
    completionPromptShown = true
    if (!isProfilePath(pathname)) router.replace(PROFILE_PATH)
  }, [me, pathname, router])

  return null
}
