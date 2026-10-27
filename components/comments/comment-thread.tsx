"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { CommentDto } from "@/lib/api/comments"
import { useCommentLikes, useCommentReplies } from "@/hooks/api/use-comments"
import { flattenPages } from "@/lib/comments"
import { CommentItem } from "./comment-item"

// Respuestas de un hilo: línea vertical a la izquierda y sangría. Se reutiliza para el
// comentario destacado cuando es una respuesta.
export function ReplyIndent({ children }: { children: React.ReactNode }) {
  return <div className="ml-4 border-l-2 border-border pl-3 sm:ml-5 sm:pl-4">{children}</div>
}

// Raíz + sus respuestas, plegadas hasta que se piden. `liked` de la raíz llega del padre (que
// pide los me gusta de todas las raíces de una vez); los de las respuestas se piden aquí.
export function CommentThread({
  root,
  pdfId,
  rootLiked,
}: {
  root: CommentDto
  pdfId: number
  rootLiked: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const rootId = root.id
  const replyCount = root.replyCount ?? 0

  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useCommentReplies(
    pdfId,
    rootId ?? -1,
    expanded && rootId !== undefined,
  )
  const replies = useMemo(() => {
    // Una página nueva puede repetir una respuesta si se publicó otra entre dos peticiones.
    const seen = new Set<number>()
    return flattenPages<CommentDto>(data).filter((c) => c.id !== undefined && !seen.has(c.id) && seen.add(c.id))
  }, [data])
  const { data: likedIds } = useCommentLikes(
    replies.map((c) => c.id as number),
    expanded,
  )

  if (rootId === undefined) return null
  const repliesId = `replies-${rootId}`

  return (
    <div className="space-y-3">
      <CommentItem comment={root} pdfId={pdfId} liked={rootLiked} />

      {replyCount > 0 && (
        <ReplyIndent>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={repliesId}
            className="-ml-2 h-7 cursor-pointer gap-1.5 px-2 text-primary hover:text-primary"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Ocultar respuestas" : `Ver ${replyCount} ${replyCount === 1 ? "respuesta" : "respuestas"}`}
          </Button>

          <div id={repliesId}>
            {expanded && (
              <div className="mt-2 space-y-4">
                {isPending && (
                  <div className="space-y-3" aria-hidden="true">
                    <ReplySkeleton />
                  </div>
                )}
                {isError && (
                  <p className="text-sm text-muted-foreground">
                    No se pudieron cargar las respuestas.{" "}
                    <button type="button" className="cursor-pointer font-medium text-primary underline underline-offset-2" onClick={() => void refetch()}>
                      Reintentar
                    </button>
                  </p>
                )}
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    pdfId={pdfId}
                    liked={likedIds?.has(reply.id as number) ?? false}
                    isReply
                  />
                ))}
                {hasNextPage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-7 cursor-pointer px-2 text-primary hover:text-primary"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                    Ver más respuestas
                  </Button>
                )}
              </div>
            )}
          </div>
        </ReplyIndent>
      )}
    </div>
  )
}

function ReplySkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}
