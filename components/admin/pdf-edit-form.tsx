"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { PdfFilePicker } from "@/components/admin/pdf-file-picker"
import { SheetFooter } from "@/components/ui/sheet"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import {
  AuthorEmailsField,
  authorsSchema,
  emptyAuthors,
  toAuthorEmails,
} from "@/components/ui/author-emails-field"
import { useToast } from "@/hooks/use-toast"
import { useUpdatePdf } from "@/hooks/api/use-pdfs"
import { pdfMutationErrorMessage, type PDFDto } from "@/lib/api/pdfs"
import { formatPdfAuthors } from "@/lib/content/types"

const updatePdfSchema = z
  .object({
    name: z.string().trim().min(1, "El título es obligatorio"),
    // Opcional: sin fichero, el back conserva el contenido actual.
    file: z.custom<File>().nullable(),
    description: z.string().optional(),
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
    authors: authorsSchema,
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type UpdatePdfValues = z.infer<typeof updatePdfSchema>

export function PdfEditForm({
  pdf,
  onBusyChange,
  onDone,
}: {
  pdf: PDFDto
  onBusyChange: (busy: boolean) => void
  onDone: () => void
}) {
  const toast = useToast()
  const updatePdf = useUpdatePdf()
  const [progress, setProgress] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<UpdatePdfValues>({
    resolver: zodResolver(updatePdfSchema),
    defaultValues: {
      name: pdf.name ?? "",
      file: null,
      description: pdf.description ?? "",
      subjectId: pdf.subject?.id ?? null,
      subjectUnitId: pdf.subjectUnit?.id ?? null,
      // PDFDto solo trae usernames (sin email) y el back pide emails (y los sustituye enteros
      // en cada update), así que hay que volver a elegirlos en el buscador al editar.
      authors: emptyAuthors,
    },
  })

  const currentAuthors = formatPdfAuthors(pdf.authors)
  const file = watch("file")
  const subjectId = watch("subjectId")
  const subjectUnitId = watch("subjectUnitId")

  const onSubmit = async (values: UpdatePdfValues) => {
    if (pdf.id == null) return
    const file = values.file ?? undefined
    if (file) setProgress(0)
    onBusyChange(true)
    try {
      await updatePdf.mutateAsync({
        pdfId: pdf.id,
        data: {
          name: values.name,
          description: values.description || undefined,
          subjectId: values.subjectId as number,
          subjectUnitId: values.subjectUnitId,
          authorEmails: toAuthorEmails(values.authors),
        },
        file,
        onProgress: (fraction) => setProgress(Math.round(fraction * 100)),
      })
      toast.success("PDF actualizado correctamente.")
      onBusyChange(false)
      onDone()
    } catch (error) {
      onBusyChange(false)
      setProgress(null)
      toast.error(pdfMutationErrorMessage(error, "Error al actualizar el PDF."))
    }
  }

  const saving = updatePdf.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={saving} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-pdf-title">Título del documento</Label>
          <Input id="edit-pdf-title" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label>Fichero</Label>
          <PdfFilePicker
            value={file}
            onChange={(next) => setValue("file", next)}
            onReject={toast.error}
            disabled={saving}
          />
          {progress != null && <Progress value={progress} className="h-1.5" />}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-pdf-description">Descripción</Label>
          <Input id="edit-pdf-description" {...register("description")} />
        </div>

        <div className="grid gap-2">
          <AuthorEmailsField
            control={control}
            errors={errors.authors}
            idPrefix="edit-pdf"
          />
          <p className="text-xs text-muted-foreground">
            {currentAuthors
              ? `Autores actuales: ${currentAuthors}. `
              : "Este PDF todavía no tiene autores. "}
            Al guardar se sustituyen por los que elijas aquí.
          </p>
        </div>

        <Separator />

        <SubjectUnitPicker
          subjectId={subjectId ?? null}
          subjectUnitId={subjectUnitId ?? null}
          onSubjectChange={(id) => {
            setValue("subjectId", id, { shouldValidate: true })
            setValue("subjectUnitId", null)
          }}
          onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
        />
        {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}
      </fieldset>

      <SheetFooter className="flex-row justify-end border-t">
        <Button type="submit" className="cursor-pointer" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </SheetFooter>
    </form>
  )
}
