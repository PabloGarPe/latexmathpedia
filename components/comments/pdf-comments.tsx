"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { CommentDto } from "@/lib/api/comments"
import { useCommentContext, useCommentLikes, useRootComments } from "@/hooks/api/use-comments"
import { flattenPages } from "@/lib/comments"
import { CommentComposer } from "./comment-composer"
import { CommentThread } from "./comment-thread"
import { HighlightedComment } from "./highlighted-comment"
import { MyComments } from "./my-comments"
import { COMMENTS_SECTION_ID, scrollToCommentsSection } from "./scroll"

// `?comment=ID` → id válido o null.
function parseCommentParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Al llegar con `#comments` o `?comment=ID` hay que bajar a la sección, pero el visor de arriba
// tarda en cargar y puede mover el layout: se baja al montar y se repite cuando `settled` cambia
// (visor listo), salvo que la persona ya haya empezado a moverse por la página.
function useScrollOnArrival(commentId: number | null, settled: boolean) {
  const userMoved = useRef(false)

  useEffect(() => {
    const markMoved = () => {
      userMoved.current = true
    }
    const events = ["wheel", "touchstart", "keydown", "mousedown"] as const
    events.forEach((name) => window.addEventListener(name, markMoved, { passive: true }))
    return () => events.forEach((name) => window.removeEventListener(name, markMoved))
  }, [])

  // Otro `?comment` en la misma página (p. ej. desde una notificación) vuelve a pedir el scroll.
  useEffect(() => {
    userMoved.current = false
  }, [commentId])

  useEffect(() => {
    const wanted = commentId !== null || window.location.hash === `#${COMMENTS_SECTION_ID}`
    if (!wanted || userMoved.current) return
    // Instantáneo: un scroll suave se quedaría corto si el layout cambia mientras anima.
    const frame = requestAnimationFrame(() => scrollToCommentsSection(false))
    return () => cancelAnimationFrame(frame)
  }, [commentId, settled])
}

function CommentsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Sección de comentarios del visor: composer, "Tus comentarios", comentario destacado y lista de
// raíces paginada. Va bajo el visor y se muestra aunque el binario falle o esté cargando.
// `settled`: el visor ya tiene su altura definitiva (para repetir el scroll de llegada).
export function PdfComments({ pdfId, settled }: { pdfId: number; settled: boolean }) {
  const searchParams = useSearchParams()
  const commentId = parseCommentParam(searchParams.get("comment"))
  useScrollOnArrival(commentId, settled)

  const roots = useRootComments(pdfId)
  const { data: context } = useCommentContext(commentId)

  const rootComments = useMemo(() => {
    // Si se publica un comentario entre dos páginas, el desplazamiento puede repetir una raíz.
    const seen = new Set<number>()
    return flattenPages<CommentDto>(roots.data).filter((c) => c.id !== undefined && !seen.has(c.id) && seen.add(c.id))
  }, [roots.data])
  const total = roots.data?.pages[0]?.total

  // Una sola consulta de me gusta para lo visible: raíces y comentario destacado. Las respuestas
  // desplegadas piden las suyas dentro de su hilo.
  const likeIds = useMemo(() => {
    const ids = rootComments.map((c) => c.id as number)
    for (const c of [context?.root, context?.target]) if (c?.id !== undefined) ids.push(c.id)
    return ids
  }, [rootComments, context])
  const { data: likedIds } = useCommentLikes(likeIds)

  return (
    <section
      id={COMMENTS_SECTION_ID}
      aria-labelledby="comments-title"
      className="scroll-mt-[calc(var(--header-height)+1rem)] space-y-5 border-t pt-6"
    >
      <h2 id="comments-title" className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
        Comentarios
        {total !== undefined && <span className="text-base font-normal text-muted-foreground">({total})</span>}
      </h2>

      <CommentComposer pdfId={pdfId} />

      <MyComments pdfId={pdfId} />

      {context && <HighlightedComment context={context} pdfId={pdfId} likedIds={likedIds} />}

      {roots.isPending ? (
        <CommentsSkeleton />
      ) : roots.isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">No se pudieron cargar los comentarios.</p>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void roots.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : rootComments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MessageSquare className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">Todavía no hay comentarios. ¡Sé el primero!</p>
        </div>
      ) : (
        <>
          <ul className="space-y-6">
            {rootComments.map((comment) => (
              <li key={comment.id}>
                <CommentThread root={comment} pdfId={pdfId} rootLiked={likedIds?.has(comment.id as number) ?? false} />
              </li>
            ))}
          </ul>
          {roots.hasNextPage && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={roots.isFetchingNextPage}
                onClick={() => void roots.fetchNextPage()}
              >
                {roots.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                Ver más comentarios
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// Marcador mientras Next resuelve `useSearchParams` (límite de Suspense de la página).
export function PdfCommentsFallback() {
  return (
    <section id={COMMENTS_SECTION_ID} className="scroll-mt-[calc(var(--header-height)+1rem)] space-y-5 border-t pt-6">
      <h2 className="text-xl font-semibold tracking-tight">Comentarios</h2>
      <CommentsSkeleton />
    </section>
  )
}
