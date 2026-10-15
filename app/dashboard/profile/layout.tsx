"use client"

import { PageContainer } from "@/components/page-shell"
import { ProfileNav } from "@/components/settings/profile-nav"
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

  const displayName = me?.name || email.split("@")[0]

  return (
    <PageContainer className="max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground shadow-lg"
        >
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{displayName}</h1>
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
