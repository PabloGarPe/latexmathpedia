"use client"

import { useState } from "react"
import { Flag, MoreHorizontal, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeleteComment } from "@/hooks/api/use-comments"
import { useToast } from "@/hooks/use-toast"
import { commentActionErrorMessage } from "@/lib/comments"
import { ReportCommentDialog } from "./report-comment-dialog"

// Menú "⋯" de un comentario: denunciar (ajenos) y eliminar (propios, o cualquiera si eres admin).
// Los diálogos viven fuera del menú para que sobrevivan a su cierre.
export function CommentActionsMenu({
  commentId,
  pdfId,
  canReport,
  canDelete,
  /** Del autor al que se refiere el menú; solo para el aria-label. */
  authorLabel,
}: {
  commentId: number
  pdfId: number
  canReport: boolean
  canDelete: boolean
  authorLabel?: string
}) {
  const toast = useToast()
  const [reportOpen, setReportOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutate: remove } = useDeleteComment()

  if (!canReport && !canDelete) return null

  const confirmDelete = () => {
    remove(
      { commentId, pdfId },
      {
        onSuccess: () => toast.success("Comentario eliminado."),
        onError: (error) => toast.error(commentActionErrorMessage(error, "No se pudo eliminar el comentario.")),
      },
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer text-muted-foreground"
            aria-label={authorLabel ? `Más acciones del comentario de ${authorLabel}` : "Más acciones del comentario"}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canReport && (
            <DropdownMenuItem onSelect={() => setReportOpen(true)}>
              <Flag />
              Denunciar
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canReport && <ReportCommentDialog commentId={commentId} open={reportOpen} onOpenChange={setReportOpen} />}
      {canDelete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="¿Eliminar este comentario?"
          description="Se eliminará para todos y no se puede deshacer. Las respuestas que tenga seguirán visibles."
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}
