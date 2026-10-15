"use client"

import { useEffect, useState } from "react"
import { UserRound } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useAvatarBlob } from "@/hooks/api/use-profile"
import { cn } from "@/lib/utils"

// Lo mínimo para pintar a una persona: encaja con AuthorDto, UserAccountDto,
// AuthorCandidateDto y LeaderboardEntryDto (en este último el id es `userId`).
export type AvatarUser = {
  id?: number | null
  username?: string | null
  hasAvatar?: boolean | null
  avatarUpdatedAt?: string | null
}

// Un color estable por persona, para reconocerla de un vistazo (clases completas: Tailwind las
// necesita escritas tal cual).
const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
]

function toneFor(seed: string) {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

// Foto de perfil con fallback a iniciales. La foto solo la ve un usuario autenticado (el back
// pide JWT), así que sin sesión, sin foto o si falla la descarga se pintan las iniciales de
// `username` (o de `fallbackLabel`, p. ej. el email en el buscador del admin; nunca se muestra
// el email entero). Sin nada de eso, un icono genérico.
// Tamaño por className (por defecto h-8 w-8 text-sm).
export function UserAvatar({
  user,
  fallbackLabel,
  initialsLength = 1,
  className,
}: {
  user: AvatarUser
  fallbackLabel?: string | null
  initialsLength?: 1 | 2
  className?: string
}) {
  const { isAuthenticated } = useAuth()
  const { data: blob } = useAvatarBlob(user.id, user.avatarUpdatedAt, isAuthenticated && !!user.hasAvatar)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setSrc(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const label = (user.username?.trim() || fallbackLabel?.trim() || "").slice(0, initialsLength).toUpperCase()
  const seed = user.username || fallbackLabel || String(user.id ?? "")

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold",
        toneFor(seed),
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: local, next/image no aporta nada
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setSrc(null)} />
      ) : label ? (
        label
      ) : (
        <UserRound className="h-1/2 w-1/2" />
      )}
    </span>
  )
}
