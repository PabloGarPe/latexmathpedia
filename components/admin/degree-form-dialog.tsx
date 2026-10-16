"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { AlertTriangle, Loader2 } from "lucide-react"
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
import { useCreateDegree, useDeleteDegree, useUpdateDegree } from "@/hooks/api/use-degrees"
import { useToast } from "@/hooks/use-toast"
import { DEGREE_LIMITS, type DegreeDto } from "@/lib/api/degrees"
import { ApiError } from "@/lib/api/errors"

// Texto de confirmación de borrado, para el `deleteDescription` de AdminMenu / ConfirmDialog.
export const DELETE_DEGREE_DESCRIPTION =
  "Se eliminará el grado. Solo es posible si no tiene asignaturas colocadas; los usuarios que lo tengan en su perfil lo perderán (y también su curso)."

// El `years` va como string porque trabaja con un Select de shadcn; se convierte al enviar.
const YEAR_OPTIONS = Array.from(
  { length: DEGREE_LIMITS.maxYears - DEGREE_LIMITS.minYears + 1 },
  (_, index) => DEGREE_LIMITS.minYears + index,
)

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(DEGREE_LIMITS.name, `Máximo ${DEGREE_LIMITS.name} caracteres`),
  university: z.string().trim().max(DEGREE_LIMITS.university, `Máximo ${DEGREE_LIMITS.university} caracteres`),
  years: z
    .string()
    .refine(
      (value) => {
        const years = Number(value)
        return Number.isInteger(years) && years >= DEGREE_LIMITS.minYears && years <= DEGREE_LIMITS.maxYears
      },
      `Elige entre ${DEGREE_LIMITS.minYears} y ${DEGREE_LIMITS.maxYears} años`,
    ),
})

type Values = z.infer<typeof schema>

function DegreeForm({
  degree,
  onClose,
  onSaved,
}: {
  degree?: DegreeDto
  onClose: () => void
  onSaved?: (degree: DegreeDto) => void
}) {
  const toast = useToast()
  const createDegree = useCreateDegree()
  const updateDegree = useUpdateDegree()
  const editing = degree?.id != null

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: degree?.name ?? "",
      university: degree?.university ?? "",
      years: degree?.years != null ? String(degree.years) : "4",
    },
  })

  // Reducir los años en la edición tiene consecuencias que conviene avisar antes de guardar.
  const currentYears = degree?.years ?? null
  const selectedYears = Number(watch("years"))
  const reducingYears = editing && currentYears != null && selectedYears < currentYears

  async function onSubmit(values: Values) {
    const body = {
      name: values.name,
      // El back también normaliza vacío a null, pero mandamos ya el valor final.
      university: values.university || null,
      years: Number(values.years),
    }
    try {
      const saved =
        editing && degree?.id != null
          ? await updateDegree.mutateAsync({ id: degree.id, body })
          : await createDegree.mutateAsync(body)
      toast.success(editing ? "Grado actualizado." : "Grado creado.")
      onSaved?.(saved)
      onClose()
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null
      if (status === 409) {
        // En la edición, el 409 puede ser un duplicado o una reducción de años con asignaturas
        // colocadas en los años que desaparecen; el back no distingue el motivo en el status.
        toast.error(
          !editing
            ? "Ya existe un grado con ese nombre en esa universidad."
            : reducingYears
              ? "No se pudo guardar: ya existe un grado con ese nombre en esa universidad, o hay asignaturas colocadas en los años que desaparecen. Quítalas antes editando cada asignatura."
              : "Ya existe un grado con ese nombre en esa universidad.",
        )
      } else if (status === 400) {
        toast.error("Revisa los campos del grado.")
      } else if (status === 404) {
        toast.error("El grado ya no existe.")
      } else {
        toast.error(editing ? "No se pudo actualizar el grado." : "No se pudo crear el grado.")
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="degree-name">Nombre</Label>
        <Input id="degree-name" placeholder="Ej: Grado en Matemáticas" autoFocus {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="degree-university">Universidad (opcional)</Label>
        <Input id="degree-university" placeholder="Ej: Universidad de Oviedo" {...register("university")} />
        {errors.university && <p className="text-sm text-destructive">{errors.university.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="degree-years">Número de cursos</Label>
        <Controller
          control={control}
          name="years"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="degree-years" className="w-full sm:w-40">
                <SelectValue placeholder="Elige" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((years) => (
                  <SelectItem key={years} value={String(years)}>
                    {years} {years === 1 ? "curso" : "cursos"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.years && <p className="text-sm text-destructive">{errors.years.message}</p>}
        {reducingYears && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Al reducir los cursos, los usuarios que estén en un curso superior perderán su curso (conservan el
              grado). No se puede hacer si hay asignaturas colocadas en los cursos que desaparecen.
            </span>
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Guardar cambios" : "Crear grado"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Alta y edición de un grado. Sin `degree` crea uno; con `degree` lo edita (el PUT reemplaza
// los tres campos). Gestiona la mutación y los toasts; en error el diálogo queda abierto.
export function DegreeFormDialog({
  open,
  onOpenChange,
  degree,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  degree?: DegreeDto
  onSaved?: (degree: DegreeDto) => void
}) {
  const editing = degree?.id != null
  const title = editing ? "Editar grado" : "Nuevo grado"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Cambia los datos del grado."
              : "Un grado tiene tantos cursos como indiques; después podrás colocar asignaturas en cada uno."}
          </DialogDescription>
        </DialogHeader>
        {/* Dentro de DialogContent: se monta al abrir, así los valores iniciales siempre son los del grado. */}
        <DegreeForm degree={degree} onClose={() => onOpenChange(false)} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}

// Borrado de un grado con sus toasts, para el `onDelete` de AdminMenu. No lanza: los errores
// ya se avisan aquí (ConfirmDialog no los captura). `onDeleted` solo se llama si se borró (p. ej.
// para volver al listado desde la vista del plan de estudios).
export function useDeleteDegreeAction() {
  const toast = useToast()
  const deleteDegree = useDeleteDegree()

  return async (degree: DegreeDto, options?: { onDeleted?: () => void }): Promise<void> => {
    if (degree.id == null) return
    try {
      await deleteDegree.mutateAsync(degree.id)
      toast.success("Grado eliminado.")
      options?.onDeleted?.()
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null
      if (status === 409) {
        toast.error("No se puede eliminar: el grado tiene asignaturas colocadas. Quítalas antes editando cada asignatura.")
      } else if (status === 404) {
        toast.error("El grado ya no existe.")
      } else {
        toast.error("No se pudo eliminar el grado.")
      }
    }
  }
}
