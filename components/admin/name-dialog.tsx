"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
})

export type NameDialogValues = z.infer<typeof schema>

function NameForm({
  initial,
  withDescription,
  nameLabel,
  namePlaceholder,
  submitLabel,
  onSubmit,
}: {
  initial: NameDialogValues
  withDescription: boolean
  nameLabel: string
  namePlaceholder?: string
  submitLabel: string
  onSubmit: (values: NameDialogValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NameDialogValues>({ resolver: zodResolver(schema), defaultValues: initial })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name-dialog-name">{nameLabel}</Label>
        <Input id="name-dialog-name" placeholder={namePlaceholder} autoFocus {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      {withDescription && (
        <div className="grid gap-2">
          <Label htmlFor="name-dialog-description">Descripción (opcional)</Label>
          <Input id="name-dialog-description" {...register("description")} />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Diálogo pequeño para crear o renombrar una asignatura (con descripción) o un tema (solo
// nombre). `onSubmit` lanza si falla: el diálogo queda abierto y el llamador avisa del error.
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  nameLabel = "Nombre",
  namePlaceholder,
  withDescription = false,
  initial = { name: "", description: "" },
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  nameLabel?: string
  namePlaceholder?: string
  withDescription?: boolean
  initial?: NameDialogValues
  submitLabel: string
  onSubmit: (values: NameDialogValues) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {/* Dentro de DialogContent: se monta al abrir, así los valores iniciales siempre son los del elemento. */}
        <NameForm
          initial={initial}
          withDescription={withDescription}
          nameLabel={nameLabel}
          namePlaceholder={namePlaceholder}
          submitLabel={submitLabel}
          onSubmit={async (values) => {
            try {
              await onSubmit(values)
              onOpenChange(false)
            } catch {
              // El llamador ya ha avisado del error; el diálogo se queda abierto para corregirlo.
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
