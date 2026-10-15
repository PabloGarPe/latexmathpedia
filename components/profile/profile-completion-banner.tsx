"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles } from "lucide-react"
import { isProfilePath, PROFILE_PATH } from "@/components/profile/profile-completion-guard"
import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"

// Banner discreto bajo el header mientras el perfil siga sin completar. Desaparece solo al
// invalidar ["me"] tras el PUT. No se pinta en /dashboard/profile (ahí ya hay un aviso) ni si
// /me falla (modo mock).
export function ProfileCompletionBanner() {
  const { isAuthenticated } = useAuth()
  const { data: me } = useMe(isAuthenticated)
  const pathname = usePathname()

  if (!me || me.profileCompletedAt != null || isProfilePath(pathname)) return null

  return (
    <div className="sticky top-(--header-height) z-40 flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">Completa tu perfil para elegir tu nombre de usuario.</p>
      <Link href={PROFILE_PATH} className="shrink-0 font-medium text-primary underline-offset-4 hover:underline">
        Completar perfil
      </Link>
    </div>
  )
}
