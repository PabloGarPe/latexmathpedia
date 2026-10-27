"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ReportReason } from "@/lib/api/comments"
import { useReportComment } from "@/hooks/api/use-comments"
import { useToast } from "@/hooks/use-toast"
import { commentActionErrorMessage, REPORT_REASON_LABELS, REPORT_REASONS } from "@/lib/comments"

// Denuncia de un comentario: se elige un motivo y se envía. Es idempotente en el back, así que
// repetirla no da error.
export function ReportCommentDialog({
  commentId,
  open,
  onOpenChange,
}: {
  commentId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const toast = useToast()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const { mutate, isPending } = useReportComment()

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    if (!next) setReason(null)
    onOpenChange(next)
  }

  const submit = () => {
    if (!reason) return
    mutate(
      { commentId, reason },
      {
        onSuccess: () => {
          toast.success("Gracias, lo revisaremos")
          setReason(null)
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(commentActionErrorMessage(error, "No se pudo enviar la denuncia."))
          // Si el comentario ya no existe o no está publicado, no tiene sentido seguir con el diálogo.
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar comentario</DialogTitle>
          <DialogDescription>
            ¿Qué le ocurre a este comentario? Los administradores lo revisarán.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={reason ?? ""}
          onValueChange={(value) => setReason(value as ReportReason)}
          aria-label="Motivo de la denuncia"
          className="gap-2"
        >
          {REPORT_REASONS.map((value) => (
            <Label
              key={value}
              htmlFor={`report-${commentId}-${value}`}
              className="cursor-pointer gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem id={`report-${commentId}-${value}`} value={value} />
              {REPORT_REASON_LABELS[value]}
            </Label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" className="cursor-pointer" onClick={submit} disabled={!reason || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Denunciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
