"use client"

import { Sparkles } from "lucide-react"
import type { CommentContextDto } from "@/lib/api/comments"
import { CommentItem } from "./comment-item"
import { ReplyIndent } from "./comment-thread"

// "Comentario destacado": el comentario al que apunta `?comment=ID` (p. ej. desde una notificación)
// por encima de la lista. Si es una respuesta, se pinta su raíz con ella debajo, resaltada. Es
// presentacional: el padre pide el contexto y los me gusta.
export function HighlightedComment({
  context,
  pdfId,
  likedIds,
}: {
  context: CommentContextDto
  pdfId: number
  likedIds: ReadonlySet<number> | undefined
}) {
  const { root, target } = context
  if (!root || !target) return null
  const isReply = target.id !== root.id
  const liked = (id?: number) => id !== undefined && (likedIds?.has(id) ?? false)

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 p-3 sm:p-4" aria-label="Comentario destacado" role="region">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Comentario destacado
      </h3>
      {isReply ? (
        <>
          <CommentItem comment={root} pdfId={pdfId} liked={liked(root.id)} />
          <ReplyIndent>
            <CommentItem comment={target} pdfId={pdfId} liked={liked(target.id)} highlighted isReply />
          </ReplyIndent>
        </>
      ) : (
        <CommentItem comment={target} pdfId={pdfId} liked={liked(target.id)} highlighted />
      )}
    </div>
  )
}
