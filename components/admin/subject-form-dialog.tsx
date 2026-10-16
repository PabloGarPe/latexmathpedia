"use client"

import { useMemo } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { Info, Loader2, Plus, Trash2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useDegrees } from "@/hooks/api/use-degrees"
import { useCreateSubject, useUpdateSubject } from "@/hooks/api/use-subjects"
import { useToast } from "@/hooks/use-toast"
import type { DegreeDto } from "@/lib/api/degrees"
import { ApiError } from "@/lib/api/errors"
import type { SubjectDetailDto, SubjectDto } from "@/lib/api/subjects"
import {
  degreeYears,
  formatDegree,
  formatSemesterLong,
  formatYearLong,
  SEMESTER_ANNUAL,
  SEMESTER_OPTIONS,
  semesterFromValue,
  semesterToValue,
} from "@/lib/degrees"

// Los Select de shadcn trabajan con strings, así que grado, curso y cuatrimestre van como
// string en el formulario ("" = sin elegir) y se convierten al enviar.
const placementSchema = z.object({
  degreeId: z.string(),
  year: z.string(),
  semester: z.string(),
})

type PlacementValues = z.infer<typeof placementSchema>

// La validación de colocaciones depende de la lista de grados cargada (años de cada grado), por
// eso el esquema se construye con ella. `withPlacements` es false cuando el editor está oculto.
function buildSchema(degrees: DegreeDto[] | undefined, withPlacements: boolean) {
  return z
    .object({
      name: z.string().trim().min(1, "El nombre es obligatorio"),
      description: z.string(),
      placements: z.array(placementSchema),
    })
    .superRefine((data, ctx) => {
      if (!withPlacements) return
      const seen = new Set<string>()
      data.placements.forEach((placement, index) => {
        const issue = (field: keyof PlacementValues, message: string) =>
          ctx.addIssue({ code: "custom", message, path: ["placements", index, field] })

        if (!placement.degreeId) {
          issue("degreeId", "Elige un grado")
          return
        }
        if (seen.has(placement.degreeId)) issue("degreeId", "Este grado ya está en otra fila")
        seen.add(placement.degreeId)

        const degree = degrees?.find((candidate) => String(candidate.id) === placement.degreeId)
        if (!degree) {
          issue("degreeId", "El grado ya no existe")
          return
        }
        if (!placement.year) {
          issue("year", "Elige un curso")
          return
        }
        const year = Number(placement.year)
        if (!Number.isInteger(year) || year < 1 || year > (degree.years ?? 0)) {
          issue("year", "Curso fuera de rango")
        }
      })
    })
}

type Values = {
  name: string
  description: string
  placements: PlacementValues[]
}

// Triggers de las filas de colocaciones: ocupan su celda y recortan el valor con "…". Sin el
// min-w-0 del valor (es un hijo flex), el texto no se encoge y desborda la fila.
const TRIGGER = "w-full min-w-0 *:data-[slot=select-value]:min-w-0"

function SubjectForm({
  subject,
  onClose,
  onSaved,
}: {
  subject?: SubjectDetailDto | SubjectDto
  onClose: () => void
  onSaved?: (subject: SubjectDetailDto) => void
}) {
  const toast = useToast()
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()
  const { data: degrees, isPending: degreesLoading, isError: degreesError } = useDegrees()

  const editing = subject?.id != null
  // Un SubjectDto embebido (PDF, cuestionario…) no trae `placements`: no se pueden precargar y,
  // como el PUT con lista reemplaza el conjunto, no hay que enviarlas (el back conserva las
  // actuales). `SubjectDetailDto` siempre las trae (aunque sea []).
  const existingPlacements = subject && "placements" in subject ? subject.placements : undefined
  const withPlacements = !editing || existingPlacements !== undefined

  const schema = useMemo(() => buildSchema(degrees, withPlacements), [degrees, withPlacements])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: subject?.name ?? "",
      description: subject?.description ?? "",
      placements: (existingPlacements ?? []).flatMap((placement) =>
        placement.degreeId != null && placement.year != null
          ? [
              {
                degreeId: String(placement.degreeId),
                year: String(placement.year),
                semester: semesterToValue(placement.semester),
              },
            ]
          : [],
      ),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "placements" })

  const placements = watch("placements")
  const usedDegreeIds = new Set(placements.map((placement) => placement.degreeId).filter(Boolean))
  const degreeById = new Map((degrees ?? []).map((degree) => [String(degree.id), degree]))
  const allDegreesUsed = degrees != null && fields.length >= degrees.length

  // Sin los grados cargados no se puede validar el curso de cada fila.
  const blocked = withPlacements && (degreesLoading || degreesError)

  async function onSubmit(values: Values) {
    const body = {
      name: values.name,
      description: values.description.trim() || undefined,
      ...(withPlacements
        ? {
            placements: values.placements.map((placement) => ({
              degreeId: Number(placement.degreeId),
              year: Number(placement.year),
              semester: semesterFromValue(placement.semester),
            })),
          }
        : {}),
    }
    try {
      const saved =
        editing && subject?.id != null
          ? await updateSubject.mutateAsync({ id: subject.id, body })
          : await createSubject.mutateAsync(body)
      toast.success(editing ? "Asignatura actualizada." : "Asignatura creada.")
      if (saved) onSaved?.(saved)
      onClose()
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null
      if (status === 409) toast.error("Ya existe una asignatura con ese nombre.")
      else if (status === 400) toast.error("Revisa las colocaciones: un grado repetido o un año fuera de rango.")
      else if (status === 404) toast.error("Alguno de los grados ya no existe (o la asignatura).")
      else toast.error(editing ? "No se pudo actualizar la asignatura." : "No se pudo crear la asignatura.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="subject-name">Nombre</Label>
        <Input id="subject-name" placeholder="Ej: Análisis Funcional" autoFocus {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="subject-description">Descripción (opcional)</Label>
        <Textarea id="subject-description" rows={3} className="resize-none" {...register("description")} />
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <Label>Grados</Label>
          <p className="text-sm text-muted-foreground">
            Dónde se cursa la asignatura. Es opcional, y un grado solo puede aparecer una vez.
          </p>
        </div>

        {!withPlacements ? (
          <p className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Las colocaciones en grados no se pueden editar desde aquí: se conservan las actuales. Edita la
              asignatura desde el catálogo para cambiarlas.
            </span>
          </p>
        ) : degreesLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando grados…
          </p>
        ) : degreesError ? (
          <p className="text-sm text-destructive">No se pudieron cargar los grados. Cierra el diálogo y vuelve a intentarlo.</p>
        ) : (
          <>
            {degrees.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay grados.{" "}
                <Link
                  href="/dashboard/admin/degrees"
                  onClick={onClose}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Créalos en la gestión de grados
                </Link>{" "}
                para poder colocar asignaturas.
              </p>
            )}

            {fields.length > 0 && (
              <ul className="grid gap-3">
                {fields.map((field, index) => {
                  const rowErrors = errors.placements?.[index]
                  const degree = degreeById.get(placements[index]?.degreeId ?? "")
                  return (
                    // Dos líneas: grado + quitar arriba (los nombres de grado son largos y necesitan todo
                    // el ancho) y curso + cuatrimestre debajo.
                    <li
                      key={field.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="grid min-w-0 gap-1">
                        <Controller
                          control={control}
                          name={`placements.${index}.degreeId`}
                          render={({ field: degreeField }) => (
                            <Select
                              value={degreeField.value}
                              onValueChange={(value) => {
                                degreeField.onChange(value)
                                // Si el curso elegido ya no cabe en el nuevo grado, se vacía.
                                const newDegree = degreeById.get(value)
                                const year = Number(placements[index]?.year)
                                if (year && year > (newDegree?.years ?? 0)) {
                                  setValue(`placements.${index}.year`, "")
                                }
                              }}
                            >
                              <SelectTrigger
                                className={TRIGGER}
                                aria-label="Grado"
                                aria-invalid={!!rowErrors?.degreeId}
                                title={formatDegree(degree) || undefined}
                              >
                                {/* Texto propio y recortado: el del item (nombre + universidad en dos líneas) no cabe en el trigger. */}
                                <SelectValue placeholder="Elige un grado">
                                  {degree && (
                                    <span className="truncate">
                                      {degree.name}
                                      {degree.university && (
                                        <span className="text-muted-foreground"> · {degree.university}</span>
                                      )}
                                    </span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="max-w-[calc(100vw-2rem)]">
                                {degrees.map((option) => (
                                  <SelectItem
                                    key={option.id}
                                    value={String(option.id)}
                                    // Un grado solo una vez: los usados en otras filas no se pueden elegir.
                                    disabled={
                                      usedDegreeIds.has(String(option.id)) && String(option.id) !== degreeField.value
                                    }
                                  >
                                    <div className="flex min-w-0 flex-col items-start">
                                      <span className="whitespace-normal">{option.name}</span>
                                      {option.university && (
                                        <span className="whitespace-normal text-xs text-muted-foreground">
                                          {option.university}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {rowErrors?.degreeId && (
                          <p className="text-sm text-destructive">{rowErrors.degreeId.message}</p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar de este grado"
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="col-span-2 grid grid-cols-2 items-start gap-2">
                        <div className="grid min-w-0 gap-1">
                          <Controller
                            control={control}
                            name={`placements.${index}.year`}
                            render={({ field: yearField }) => (
                              <Select value={yearField.value} onValueChange={yearField.onChange} disabled={!degree}>
                                <SelectTrigger
                                  className={TRIGGER}
                                  aria-label="Curso"
                                  aria-invalid={!!rowErrors?.year}
                                >
                                  <SelectValue placeholder="Curso">
                                    {yearField.value && (
                                      <span className="truncate">{formatYearLong(Number(yearField.value))}</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {degreeYears(degree).map((year) => (
                                    <SelectItem key={year} value={String(year)}>
                                      {formatYearLong(year)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {rowErrors?.year && <p className="text-sm text-destructive">{rowErrors.year.message}</p>}
                        </div>

                        <Controller
                          control={control}
                          name={`placements.${index}.semester`}
                          render={({ field: semesterField }) => (
                            <Select value={semesterField.value} onValueChange={semesterField.onChange}>
                              <SelectTrigger className={TRIGGER} aria-label="Cuatrimestre">
                                {/* En el trigger, "Anual" a secas: "Anual / sin especificar" no cabe en media fila. */}
                                <SelectValue placeholder="Cuatrimestre">
                                  <span className="truncate">
                                    {formatSemesterLong(semesterFromValue(semesterField.value))}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {SEMESTER_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {degrees.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit cursor-pointer"
                disabled={allDegreesUsed}
                onClick={() => append({ degreeId: "", year: "", semester: SEMESTER_ANNUAL })}
              >
                <Plus className="h-4 w-4" />
                Añadir a un grado
              </Button>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting || blocked}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Guardar cambios" : "Crear asignatura"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Alta y edición de una asignatura, con el editor de sus colocaciones en grados (grado + curso +
// cuatrimestre). Sustituye a NameDialog para asignaturas. En la edición hay que pasar la
// asignatura con `placements` (SubjectDetailDto): se precargan y se reenvían siempre completas,
// porque el PUT las reemplaza. Gestiona la mutación y los toasts; en error el diálogo queda abierto.
export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: SubjectDetailDto | SubjectDto
  onSaved?: (subject: SubjectDetailDto) => void
}) {
  const editing = subject?.id != null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar asignatura" : "Nueva asignatura"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Cambia sus datos y los grados en los que se cursa."
              : "Indica sus datos y, si quieres, en qué grados y cursos se imparte."}
          </DialogDescription>
        </DialogHeader>
        {/* Dentro de DialogContent: se monta al abrir, así los valores iniciales siempre son los de la asignatura. */}
        <SubjectForm subject={subject} onClose={() => onOpenChange(false)} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}
