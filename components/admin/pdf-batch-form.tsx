"use client"

import { useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import {
  AuthorEmailsField,
  authorsSchema,
  emptyAuthors,
  toAuthorEmails,
} from "@/components/ui/author-emails-field"
import { formatFileSize, isPdfFile } from "@/components/admin/pdf-file-picker"
import { UnitSelect } from "@/components/admin/unit-select"
import { SheetFooter } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { useCreatePdf } from "@/hooks/api/use-pdfs"
import { pdfMutationErrorMessage } from "@/lib/api/pdfs"
import { cn } from "@/lib/utils"

// Autores propios de un fichero: lista vacía = usa los del lote.
const ownAuthorsSchema = z
  .array(
    z.object({
      email: z.string().trim().min(1, "El email es obligatorio").email("Debe ser un email válido"),
    }),
  )
  .refine(
    (authors) => new Set(authors.map((a) => a.email.trim().toLowerCase())).size === authors.length,
    "Hay emails de autor repetidos",
  )

const itemSchema = z.object({
  key: z.string(),
  // File no existe en el servidor; z.custom evita referenciarlo al evaluar el módulo en SSR.
  file: z.custom<File>((value) => typeof File !== "undefined" && value instanceof File),
  name: z.string().trim().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  subjectUnitId: z.number().nullable(),
  authors: ownAuthorsSchema,
})

const batchSchema = z
  .object({
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
    authors: authorsSchema,
    items: z.array(itemSchema).min(1, "Añade al menos un PDF"),
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type BatchValues = z.infer<typeof batchSchema>
type Item = BatchValues["items"][number]

type UploadState = { status: "uploading" | "done" | "error"; progress: number; error?: string }

function titleFromFile(file: File) {
  return file.name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim()
}

function fileSignature(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`
}

// `compact`: ya hay ficheros en la cola, así que la zona de soltar se queda en una franja fina
// y la lista sube en pantalla.
function Dropzone({
  onFiles,
  disabled,
  compact,
}: {
  onFiles: (files: File[]) => void
  disabled: boolean
  compact: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) onFiles(Array.from(event.dataTransfer.files))
      }}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
        compact ? "flex-row py-3" : "flex-col py-8",
        "hover:border-primary/60 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none",
        dragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <UploadCloud className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-8 w-8")} />
      <p className="text-sm font-medium">
        {compact ? "Añadir más PDFs" : "Arrastra aquí los PDFs o haz clic para elegirlos"}
      </p>
      {!compact && <p className="text-xs text-muted-foreground">Puedes añadir varios a la vez.</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          // Permite volver a elegir el mismo fichero tras quitarlo de la cola.
          event.target.value = ""
        }}
      />
    </div>
  )
}

export function PdfBatchForm({
  initialSubjectId,
  initialSubjectUnitId,
  onBusyChange,
  onDone,
}: {
  initialSubjectId: number | null
  initialSubjectUnitId: number | null
  onBusyChange: (busy: boolean) => void
  onDone: () => void
}) {
  const toast = useToast()
  const createPdf = useCreatePdf()
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      subjectId: initialSubjectId,
      subjectUnitId: initialSubjectUnitId,
      authors: emptyAuthors,
      items: [],
    },
  })
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" })

  const subjectId = useWatch({ control, name: "subjectId" })
  const subjectUnitId = useWatch({ control, name: "subjectUnitId" })
  const items = useWatch({ control, name: "items" })

  const setUpload = (key: string, state: UploadState) =>
    setUploads((prev) => ({ ...prev, [key]: state }))

  const addFiles = (incoming: File[]) => {
    const pdfs = incoming.filter(isPdfFile)
    if (pdfs.length < incoming.length) toast.error("Solo se admiten ficheros PDF.")

    const known = new Set(getValues("items").map((item) => fileSignature(item.file)))
    const fresh = pdfs.filter((file) => !known.has(fileSignature(file)))
    if (fresh.length < pdfs.length) toast.info("Algún fichero ya estaba en la lista.")

    // Cada fichero arranca con el tema del lote; luego se puede cambiar uno a uno.
    const currentUnit = getValues("subjectUnitId")
    append(
      fresh.map<Item>((file) => ({
        key: crypto.randomUUID(),
        file,
        name: titleFromFile(file),
        description: "",
        subjectUnitId: currentUnit,
        authors: [],
      })),
    )
  }

  const onSubmit = async (values: BatchValues) => {
    setUploading(true)
    onBusyChange(true)
    const failed: string[] = []

    for (const item of values.items) {
      setUpload(item.key, { status: "uploading", progress: 0 })
      try {
        await createPdf.mutateAsync({
          data: {
            name: item.name,
            description: item.description || undefined,
            subjectId: values.subjectId as number,
            subjectUnitId: item.subjectUnitId,
            authorEmails: toAuthorEmails(item.authors.length > 0 ? item.authors : values.authors),
          },
          file: item.file,
          onProgress: (fraction) =>
            setUpload(item.key, { status: "uploading", progress: Math.round(fraction * 100) }),
        })
        setUpload(item.key, { status: "done", progress: 100 })
      } catch (error) {
        failed.push(item.key)
        setUpload(item.key, {
          status: "error",
          progress: 0,
          error: pdfMutationErrorMessage(error, "No se pudo subir el PDF."),
        })
      }
    }

    setUploading(false)
    onBusyChange(false)

    const uploaded = values.items.length - failed.length
    if (failed.length === 0) {
      toast.success(uploaded === 1 ? "PDF subido correctamente." : `${uploaded} PDFs subidos correctamente.`)
      onDone()
      return
    }
    // Los subidos salen de la cola; los fallidos se quedan con su error para reintentar.
    if (uploaded > 0) toast.success(`${uploaded} subidos.`)
    toast.error(`${failed.length} no se han podido subir.`)
    replace(values.items.filter((item) => failed.includes(item.key)))
  }

  const count = fields.length

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={uploading} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Datos comunes del lote</h3>
          <SubjectUnitPicker
            subjectId={subjectId}
            subjectUnitId={subjectUnitId}
            onSubjectChange={(id) => {
              setValue("subjectId", id, { shouldValidate: true })
              // Los temas pertenecen a la asignatura: al cambiarla ninguno sigue siendo válido.
              setValue("subjectUnitId", null)
              getValues("items").forEach((_, index) => setValue(`items.${index}.subjectUnitId`, null))
            }}
            onSubjectUnitChange={(id) => {
              setValue("subjectUnitId", id)
              getValues("items").forEach((_, index) => setValue(`items.${index}.subjectUnitId`, id))
            }}
          />
          {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}
          <p className="text-xs text-muted-foreground">
            El tema se aplica a todos los ficheros de la lista; después puedes cambiarlo en cada uno.
          </p>
          <AuthorEmailsField
            control={control}
            register={register}
            errors={errors.authors}
            idPrefix="batch"
          />
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Ficheros{count > 0 && ` (${count})`}</h3>
          <Dropzone onFiles={addFiles} disabled={uploading} compact={count > 0} />
          {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}

          <ul className="space-y-3">
            {fields.map((field, index) => {
              const upload = uploads[field.key]
              const itemErrors = errors.items?.[index]
              const ownAuthors = items?.[index]?.authors ?? []
              return (
                <li key={field.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Input aria-label="Título" {...register(`items.${index}.name`)} />
                      {itemErrors?.name && (
                        <p className="text-sm text-destructive">{itemErrors.name.message}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {field.file.name} · {formatFileSize(field.file.size)}
                      </p>
                    </div>
                    {upload?.status === "done" ? (
                      <CheckCircle2 className="mt-2 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : upload?.status === "uploading" ? (
                      <Loader2 className="mt-2 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 cursor-pointer"
                        aria-label={`Quitar ${field.file.name}`}
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {upload?.status === "uploading" && <Progress value={upload.progress} className="h-1.5" />}
                  {upload?.status === "error" && (
                    <p className="text-sm text-destructive">{upload.error}</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`item-${field.id}-unit`} className="text-xs font-normal text-muted-foreground">
                        Tema
                      </Label>
                      <UnitSelect
                        id={`item-${field.id}-unit`}
                        subjectId={subjectId}
                        value={items?.[index]?.subjectUnitId ?? null}
                        onChange={(id) => setValue(`items.${index}.subjectUnitId`, id)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`item-${field.id}-desc`} className="text-xs font-normal text-muted-foreground">
                        Descripción (opcional)
                      </Label>
                      <Input id={`item-${field.id}-desc`} {...register(`items.${index}.description`)} />
                    </div>
                  </div>

                  {ownAuthors.length > 0 ? (
                    <div className="space-y-2 rounded-md bg-muted/40 p-3">
                      <AuthorEmailsField
                        control={control}
                        register={register}
                        errors={itemErrors?.authors}
                        idPrefix={`item-${field.id}`}
                        name={`items.${index}.authors`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setValue(`items.${index}.authors`, [])}
                      >
                        Usar los autores del lote
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto cursor-pointer p-0 text-xs"
                      onClick={() => setValue(`items.${index}.authors`, [{ email: "" }])}
                    >
                      Autores distintos a los del lote
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </fieldset>

      <SheetFooter className="flex-row justify-end border-t">
        <Button type="submit" className="cursor-pointer" disabled={uploading || count === 0}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo…
            </>
          ) : count > 1 ? (
            `Subir ${count} PDFs`
          ) : (
            "Subir PDF"
          )}
        </Button>
      </SheetFooter>
    </form>
  )
}
