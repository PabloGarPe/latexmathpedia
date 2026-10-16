"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api/errors"
import type { PdfVote } from "@/lib/api/pdfs"
import { useVotePdf, usePdfRating } from "@/hooks/api/use-pdfs"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Motivo por el que el backend no deja votar (cannotVoteReason) → texto del tooltip.
const CANNOT_VOTE_TEXT: Record<string, string> = {
  AUTHOR: "No puedes valorar tus propios apuntes",
  NOT_VIEWED: "Ábrelo para poder valorarlo",
}

const VOTE_CONFIG: Record<
  PdfVote,
  { icon: typeof ThumbsUp; label: string; activeClass: string; field: "likeCount" | "dislikeCount" }
> = {
  LIKE: {
    icon: ThumbsUp,
    label: "Me ha sido útil",
    activeClass: "border-primary text-primary",
    field: "likeCount",
  },
  DISLIKE: {
    icon: ThumbsDown,
    label: "No me ha sido útil",
    activeClass: "border-destructive text-destructive",
    field: "dislikeCount",
  },
}

interface PdfRatingButtonsProps {
  pdfId: number
  /** Solo se pide la valoración cuando es true (en el visor, al llegar el binario: eso registra la vista). */
  enabled: boolean
}

// Botones 👍/👎 con contador del visor. Pulsar el voto activo lo retira.
export function PdfRatingButtons({ pdfId, enabled }: PdfRatingButtonsProps) {
  const toast = useToast()
  const { data, isPending: loading, isError } = usePdfRating(pdfId, enabled)
  const { mutate, isPending } = useVotePdf(pdfId)

  // Pendiente incluye la query aún desactivada (binario sin llegar). Mismo tamaño aprox. que
  // el grupo, para que la cabecera no salte al resolverse.
  if (loading) return <Skeleton className="h-8 w-[8.5rem] shrink-0" />
  // Sin datos (p. ej. 401 en modo auth mock): mejor nada que botones que no funcionan.
  if (isError || !data) return null

  const canVote = data.canVote !== false
  const reasonText = !canVote && data.cannotVoteReason ? CANNOT_VOTE_TEXT[data.cannotVoteReason] : undefined

  const vote = (value: PdfVote) => {
    mutate(data.myVote === value ? null : value, {
      onError: (error) => {
        // En 403 el hook ya relee el estado (autor o PDF no abierto).
        if (error instanceof ApiError && error.status === 403) toast.error("Ya no puedes valorar este PDF.")
        else toast.error("No se pudo guardar tu valoración.")
      },
    })
  }

  const group = (
    <div role="group" aria-label="Valorar estos apuntes" className="flex items-center gap-2">
      {(Object.keys(VOTE_CONFIG) as PdfVote[]).map((value) => {
        const { icon: Icon, label, activeClass, field } = VOTE_CONFIG[value]
        const active = data.myVote === value
        return (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={active}
            aria-label={active ? `${label} (quitar mi voto)` : label}
            disabled={!canVote || isPending}
            onClick={() => vote(value)}
            className={cn(active && activeClass)}
          >
            <Icon className={cn("h-4 w-4", active && "fill-current")} />
            <span className="tabular-nums">{data.rating?.[field] ?? 0}</span>
          </Button>
        )
      })}
    </div>
  )

  if (!reasonText) return <div className="shrink-0">{group}</div>

  // Un botón disabled no dispara eventos de puntero: el trigger es un wrapper enfocable.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="shrink-0 rounded-md">
          {group}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reasonText}</TooltipContent>
    </Tooltip>
  )
}
