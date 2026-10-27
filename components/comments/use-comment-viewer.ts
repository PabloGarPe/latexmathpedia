"use client"

import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"
import type { CommentDto } from "@/lib/api/comments"

// Quién mira el hilo: sirve para saber qué comentarios son propios (no se les da me gusta ni
// se denuncian) y si se puede borrar cualquiera (admin). Todos los consumidores comparten la
// caché de GET /me.
export function useCommentViewer() {
  const { isAuthenticated, isAdmin } = useAuth()
  const { data: me } = useMe(isAuthenticated)
  const userId = me?.id ?? null
  return {
    userId,
    isAdmin,
    isOwn: (comment: Pick<CommentDto, "author">) => userId !== null && comment.author?.id === userId,
  }
}
