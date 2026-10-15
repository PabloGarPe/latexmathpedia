"use client"

import { PageContainer } from "@/components/page-shell"
import { ProfileNav } from "@/components/settings/profile-nav"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"
import { useProtectedRoute } from "@/hooks/use-protected-route"

// Marco común de las pantallas de perfil/ajustes: cabecera con la persona y navegación entre
// secciones. Cada sección es una ruta propia bajo /dashboard/profile.
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useProtectedRoute()
  const { email } = useAuth()
  const { data: me } = useMe(isAuthenticated)

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // El título es el username; sin él (perfil por completar) nunca se deduce del email.
  const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ")

  return (
    <PageContainer className="max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <UserAvatar
          user={me ?? {}}
          fallbackLabel={email}
          initialsLength={2}
          className="h-16 w-16 text-xl"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {me ? (me.username ?? "Perfil sin completar") : "Perfil"}
          </h1>
          {fullName && <p className="truncate text-sm">{fullName}</p>}
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <ProfileNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </PageContainer>
  )
}
