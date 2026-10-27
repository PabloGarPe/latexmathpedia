"use client"

import { AlertCircleIcon, Loader2, PartyPopper } from "lucide-react"
import { AdminCommentCard } from "@/components/admin/comment-moderation/comment-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminCommentQueue } from "@/hooks/api/use-comments"
import type { AdminQueueStatus } from "@/lib/api/comments"
import { flattenPages } from "@/lib/comments"

// Una pestaña de la cola: lista de tarjetas con "Cargar más". Al aprobar/rechazar/eliminar, la
// invalidación de la cola hace desaparecer la tarjeta.
export function CommentQueue({
  statuses,
  emptyTitle,
  emptyDescription,
}: {
  statuses: AdminQueueStatus[]
  emptyTitle: string
  emptyDescription?: string
}) {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminCommentQueue(statuses)
  const items = flattenPages(data)

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando comentarios">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed py-10 text-center">
        <AlertCircleIcon className="mx-auto mb-2 h-10 w-10 text-muted-foreground opacity-50" />
        <p className="mb-3 text-sm">No se pudo cargar la cola de moderación.</p>
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-12 text-center">
        <PartyPopper className="mx-auto mb-2 h-10 w-10 text-muted-foreground opacity-50" aria-hidden="true" />
        <p className="font-medium">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((comment) => (
        <AdminCommentCard key={comment.id} comment={comment} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage && <Loader2 className="animate-spin" />}
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
