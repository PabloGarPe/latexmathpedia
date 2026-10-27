"use client"

import { TriangleAlert } from "lucide-react"
import { AI_DOWN_TONE, sinceText } from "@/components/admin/comment-moderation/ai-status"
import { useModerationStatus } from "@/hooks/api/use-comments"
import { cn, formatCompactCount } from "@/lib/utils"

function Counter({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
        highlight ? "border-transparent bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      <span className="font-semibold tabular-nums">{formatCompactCount(value)}</span>
      {label}
    </span>
  )
}

// Contadores y aviso de IA caída para la tarjeta «Comentarios» del panel de administración.
// Solo texto: la tarjeta entera es un enlace.
export function CommentsCardSummary() {
  const { data: status } = useModerationStatus()
  if (!status) return null

  const review = status.reviewCount ?? 0
  const pending = status.pendingCount ?? 0

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        <Counter value={review} label="por revisar" highlight={review > 0} />
        <Counter value={pending} label={pending === 1 ? "pendiente de IA" : "pendientes de IA"} />
      </div>
      {status.aiAvailable === false && (
        <p className={cn("flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs", AI_DOWN_TONE)}>
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Moderación automática caída{sinceText(status.since)}</span>
        </p>
      )}
    </div>
  )
}
