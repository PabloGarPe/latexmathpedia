"use client"

import { MessageSquare } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useRootComments } from "@/hooks/api/use-comments"
import { cn } from "@/lib/utils"
import { COMMENTS_SECTION_ID, scrollToCommentsSection } from "./scroll"

// "💬 N" de la cabecera del visor: baja a la sección de comentarios. N es el nº de comentarios
// raíz (las respuestas no cuentan); comparte caché con la propia sección.
export function CommentsLink({ pdfId, className }: { pdfId: number; className?: string }) {
  const { data } = useRootComments(pdfId)
  const total = data?.pages[0]?.total

  return (
    <a
      href={`#${COMMENTS_SECTION_ID}`}
      aria-label={total !== undefined ? `Ir a los comentarios (${total})` : "Ir a los comentarios"}
      onClick={(event) => {
        // Sin tocar la URL: la sección está en esta misma página y el hash ya no hace falta.
        if (scrollToCommentsSection(true)) event.preventDefault()
      }}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0", className)}
    >
      <MessageSquare className="h-4 w-4" />
      {total !== undefined && <span className="tabular-nums">{total}</span>}
    </a>
  )
}
