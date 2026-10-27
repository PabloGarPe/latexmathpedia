"use client"

import { Bot, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ModerationStatusDto } from "@/lib/api/comments"
import { cn, formatRelativeTime } from "@/lib/utils"

// Clases del aviso ámbar (Alert no trae variante de advertencia). Se reutilizan en la tarjeta del
// panel de administración.
export const AI_DOWN_TONE =
  "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"

// "desde hace 5 minutos" / "desde ayer" / "desde 12/10/2026". Sin fecha, mejor nada que inventarla.
export function sinceText(since?: string | null): string {
  const relative = formatRelativeTime(since)
  return relative ? ` desde ${relative}` : ""
}

// Un nextCheckAt ya pasado (el sondeo del front va por detrás del back) se lee como inminente.
export function nextCheckText(nextCheckAt?: string | null): string {
  if (!nextCheckAt) return ""
  const time = new Date(nextCheckAt).getTime()
  if (Number.isNaN(time)) return ""
  return time - Date.now() < 60_000 ? "en breve" : formatRelativeTime(nextCheckAt)
}

// Aviso de la página de moderación. Con la IA disponible, una línea discreta; sin estado todavía
// (cargando o error), nada.
export function AiStatusNotice({ status }: { status?: ModerationStatusDto }) {
  if (!status || status.aiAvailable === undefined) return null

  if (status.aiAvailable) {
    return (
      <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        Moderación automática activa
      </p>
    )
  }

  const next = nextCheckText(status.nextCheckAt)
  return (
    <Alert className={cn("mb-4", AI_DOWN_TONE)}>
      <TriangleAlert />
      <AlertTitle className="line-clamp-none">Moderación automática caída{sinceText(status.since)}</AlertTitle>
      <AlertDescription className="text-current/90">
        <p>
          Los comentarios nuevos esperan en «Pendientes de IA»; puedes aprobarlos o rechazarlos a mano.
          {next && ` Próxima comprobación ${next}.`}
        </p>
      </AlertDescription>
    </Alert>
  )
}
