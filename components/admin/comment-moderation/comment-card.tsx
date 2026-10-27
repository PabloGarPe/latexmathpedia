"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, CornerDownRight, ExternalLink, Flag, Trash2, Undo2, X } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { RejectDialog } from "@/components/admin/comment-moderation/reject-dialog"
import { RichText } from "@/components/rich-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { useApproveComment, useDeleteComment, useRejectComment } from "@/hooks/api/use-comments"
import { useToast } from "@/hooks/use-toast"
import type { AdminCommentDto, CommentStatus, ModerationCategory } from "@/lib/api/comments"
import { commentActionErrorMessage, commentHref, moderationCategoryLabel, reportReasonLabel } from "@/lib/comments"
import { cn, formatRelativeTime } from "@/lib/utils"

// Etiqueta y color por estado de la cola. Clases completas: Tailwind las necesita escritas tal cual.
const STATUS_BADGES: Partial<Record<CommentStatus, { label: string; className: string }>> = {
  REVIEW: { label: "Revisión", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  HIDDEN: { label: "Oculto por denuncias", className: "bg-rose-500/15 text-rose-800 dark:text-rose-300" },
  PENDING: { label: "Pendiente de IA", className: "bg-blue-500/15 text-blue-800 dark:text-blue-300" },
  REJECTED: { label: "Rechazado", className: "bg-destructive/15 text-destructive" },
}

const fullDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-ES") : undefined)

function DateLabel({ prefix, iso }: { prefix: string; iso?: string | null }) {
  const relative = formatRelativeTime(iso)
  if (!relative) return null
  return (
    <span title={fullDate(iso)}>
      {prefix} {relative}
    </span>
  )
}

export function AdminCommentCard({ comment }: { comment: AdminCommentDto }) {
  const toast = useToast()
  const approve = useApproveComment()
  const reject = useRejectComment()
  const remove = useDeleteComment()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { id, pdfId, status, moderationCategory, parentId, author, authorEmail } = comment
  if (id == null) return null

  const busy = approve.isPending || reject.isPending || remove.isPending
  const badge = status ? STATUS_BADGES[status] : undefined
  const reportCount = comment.reportCount ?? 0
  const reasons = Object.entries(comment.reportReasons ?? {}).filter(([, count]) => count > 0)
  const canReject = status !== "REJECTED"

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ commentId: id, pdfId })
      toast.success(status === "HIDDEN" ? "Comentario restaurado." : "Comentario aprobado.")
    } catch (error) {
      toast.error(commentActionErrorMessage(error, "No se pudo aprobar el comentario."))
    }
  }

  const handleReject = async (category: ModerationCategory) => {
    try {
      await reject.mutateAsync({ commentId: id, category, pdfId })
      setRejectOpen(false)
      toast.success("Comentario rechazado.")
    } catch (error) {
      toast.error(commentActionErrorMessage(error, "No se pudo rechazar el comentario."))
    }
  }

  const handleDelete = async () => {
    try {
      await remove.mutateAsync({ commentId: id, pdfId })
      toast.success("Comentario eliminado.")
    } catch (error) {
      toast.error(commentActionErrorMessage(error, "No se pudo eliminar el comentario."))
    }
  }

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={author ?? {}} fallbackLabel={authorEmail} className="h-9 w-9" />
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-medium", !author?.username && "text-muted-foreground italic")}>
              {author?.username ? `@${author.username}` : "Sin nombre de usuario"}
            </p>
            {authorEmail && <p className="truncate text-xs text-muted-foreground">{authorEmail}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {parentId != null && (
            <Badge variant="outline" className="gap-1 font-medium">
              <CornerDownRight className="h-3 w-3" aria-hidden="true" />
              Respuesta
            </Badge>
          )}
          {badge && (
            <Badge variant="secondary" className={cn("border-transparent", badge.className)}>
              {badge.label}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="min-w-0 truncate">
          <span className="text-muted-foreground">PDF: </span>
          <span className="font-medium">{comment.pdfName ?? "Sin título"}</span>
        </span>
        {pdfId != null && (
          <Link
            href={commentHref(pdfId, id)}
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Ver en contexto
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* tabIndex: la región con scroll tiene que poder recorrerse con teclado. */}
      <div
        tabIndex={0}
        className="max-h-48 overflow-y-auto rounded-lg border bg-muted/40 px-3 py-2 text-sm break-words outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <RichText content={comment.body ?? ""} variant="compact" />
      </div>

      {(moderationCategory || reportCount > 0) && (
        <div className="space-y-1 text-sm">
          {moderationCategory && (
            <p>
              <span className="text-muted-foreground">
                {status === "REJECTED" ? "Motivo del rechazo: " : "Categoría propuesta por la IA: "}
              </span>
              <span className="font-medium">{moderationCategoryLabel(moderationCategory)}</span>
            </p>
          )}
          {reportCount > 0 && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <Flag className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span className="font-medium">
                {reportCount} {reportCount === 1 ? "denuncia" : "denuncias"}
              </span>
              {reasons.length > 0 && (
                <span className="text-muted-foreground">
                  ({reasons.map(([reason, count]) => `${reportReasonLabel(reason)}: ${count}`).join(" · ")})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <DateLabel prefix="Creado" iso={comment.createdAt} />
          <DateLabel prefix="Moderado" iso={comment.moderatedAt} />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="cursor-pointer" disabled={busy} onClick={handleApprove}>
            {status === "HIDDEN" ? <Undo2 /> : <Check />}
            {status === "HIDDEN" ? "Restaurar" : "Aprobar"}
          </Button>
          {canReject && (
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" disabled={busy} onClick={() => setRejectOpen(true)}>
              <X />
              Rechazar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Eliminar
          </Button>
        </div>
      </footer>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        suggested={moderationCategory}
        pending={reject.isPending}
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar este comentario?"
        description="Se borrará el comentario y no se podrá recuperar."
        onConfirm={handleDelete}
      />
    </article>
  )
}
