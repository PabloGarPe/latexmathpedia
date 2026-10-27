"use client"

import { useState } from "react"
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
import type { ModerationCategory } from "@/lib/api/comments"
import { MODERATION_CATEGORIES, moderationCategoryLabel } from "@/lib/comments"

// Pide la categoría con la que se rechaza (el autor la ve como motivo). Parte de la que propuso la
// IA, si hay; si no, hay que elegir una.
export function RejectDialog({
  open,
  onOpenChange,
  suggested,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggested?: ModerationCategory | null
  pending: boolean
  onConfirm: (category: ModerationCategory) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        {/* El contenido se desmonta al cerrar, así que la elección de un intento anterior no se arrastra. */}
        <RejectForm suggested={suggested} pending={pending} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  )
}

function RejectForm({
  suggested,
  pending,
  onCancel,
  onConfirm,
}: {
  suggested?: ModerationCategory | null
  pending: boolean
  onCancel: () => void
  onConfirm: (category: ModerationCategory) => void
}) {
  const [category, setCategory] = useState<ModerationCategory | undefined>(suggested ?? undefined)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rechazar comentario</DialogTitle>
        <DialogDescription>
          Elige el motivo. El autor recibirá un aviso y lo verá en «Tus comentarios» del PDF.
        </DialogDescription>
      </DialogHeader>

      <RadioGroup
        value={category ?? ""}
        onValueChange={(value) => setCategory(value as ModerationCategory)}
        aria-label="Motivo del rechazo"
        className="gap-2"
      >
        {MODERATION_CATEGORIES.map((item) => {
          const id = `reject-category-${item}`
          return (
            <div key={item} className="flex items-center gap-3">
              <RadioGroupItem id={id} value={item} />
              <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                {moderationCategoryLabel(item)}
                {item === suggested && <span className="ml-2 text-xs text-muted-foreground">(propuesta por la IA)</span>}
              </Label>
            </div>
          )
        })}
      </RadioGroup>

      <DialogFooter>
        <Button type="button" variant="outline" className="cursor-pointer" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="cursor-pointer"
          disabled={!category || pending}
          onClick={() => category && onConfirm(category)}
        >
          {pending ? "Rechazando…" : "Rechazar"}
        </Button>
      </DialogFooter>
    </>
  )
}
