"use client"

import { useState } from "react"
import { CornerDownRight, EyeOff, Loader2, Clock, Trash2, XCircle } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import { RichText } from "@/components/rich-text"
import type { CommentDto, CommentStatus } from "@/lib/api/comments"
import { useDeleteComment, useMyComments } from "@/hooks/api/use-comments"
import { useToast } from "@/hooks/use-toast"
import { commentActionErrorMessage, moderationCategoryLabel } from "@/lib/comments"
import { cn, formatRelativeTime } from "@/lib/utils"

const BADGE_BASE = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"

// Insignia de estado. "En revisión" gira mientras se sondea; si el sondeo ya se rindió pasa a un
// reloj quieto (la IA puede estar caída y girar para siempre sería engañoso).
function StatusBadge({ status, polling }: { status: CommentStatus | null | undefined; polling: boolean }) {
  switch (status) {
    case "REJECTED":
      return (
        <span className={cn(BADGE_BASE, "border-destructive/40 bg-destructive/10 text-destructive")}>
          <XCircle className="h-3 w-3" aria-hidden="true" />
          No publicado
        </span>
      )
    case "HIDDEN":
      return (
        <span className={cn(BADGE_BASE, "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
          <EyeOff className="h-3 w-3" aria-hidden="true" />
          Oculto
        </span>
      )
    default:
      return (
        <span className={cn(BADGE_BASE, "border-border bg-muted text-muted-foreground")}>
          {polling && status === "PENDING" ? (
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Clock className="h-3 w-3" aria-hidden="true" />
          )}
          En revisión
        </span>
      )
  }
}

function MyCommentRow({ comment, pdfId, polling }: { comment: CommentDto; pdfId: number; polling: boolean }) {
  const toast = useToast()
  const { mutate: remove, isPending } = useDeleteComment()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const date = comment.createdAt

  if (comment.id === undefined) return null
  const commentId = comment.id

  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge status={comment.status} polling={polling} />
        {comment.replyToUsername && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CornerDownRight className="h-3 w-3" aria-hidden="true" />
            en respuesta a <span className="font-medium">@{comment.replyToUsername}</span>
          </span>
        )}
        {date && (
          <time dateTime={date} title={new Date(date).toLocaleString("es-ES")} className="text-xs text-muted-foreground">
            {formatRelativeTime(date)}
          </time>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-7 cursor-pointer text-muted-foreground"
          aria-label="Eliminar este comentario"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {comment.body && <RichText content={comment.body} variant="compact" className="text-sm" />}

      {comment.status === "REJECTED" && (
        <p className="text-xs text-destructive">
          No se ha publicado{comment.moderationCategory ? `: ${moderationCategoryLabel(comment.moderationCategory)}` : ""}.
        </p>
      )}
      {comment.status === "HIDDEN" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Oculto temporalmente, pendiente de revisión.
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar este comentario?"
        description="Dejará de estar en revisión y no se podrá recuperar."
        onConfirm={() =>
          remove(
            { commentId, pdfId },
            {
              onSuccess: () => toast.success("Comentario eliminado."),
              onError: (error) => toast.error(commentActionErrorMessage(error, "No se pudo eliminar el comentario.")),
            },
          )
        }
      />
    </li>
  )
}

// "Tus comentarios": lo propio que todavía no está en el hilo público (en revisión, rechazado u
// oculto). Solo se pinta si hay algo; al publicarse desaparece de aquí y aparece en la lista.
export function MyComments({ pdfId }: { pdfId: number }) {
  const { unpublished, hasPending, pollingTimedOut } = useMyComments(pdfId)
  if (unpublished.length === 0) return null

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <h3 className="mb-3 text-sm font-semibold">Tus comentarios</h3>
      {hasPending && pollingTimedOut && (
        <p className="mb-3 text-xs text-muted-foreground">
          La revisión está tardando más de lo normal; se publicará en cuanto termine.
        </p>
      )}
      <ul className="divide-y">
        {unpublished.map((comment) => (
          <MyCommentRow key={comment.id} comment={comment} pdfId={pdfId} polling={hasPending && !pollingTimedOut} />
        ))}
      </ul>
    </div>
  )
}
