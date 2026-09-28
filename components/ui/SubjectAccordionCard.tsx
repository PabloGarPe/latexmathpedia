"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  useCreateSubjectUnit,
  useDeleteSubject,
  useDeleteSubjectUnit,
  useSubjectUnits,
  useUpdateSubject,
  useUpdateSubjectUnit,
} from "@/hooks/api/use-subjects"
import type { SubjectDto, SubjectUnitDto } from "@/lib/api/subjects"
import { conflictMessage } from "@/lib/api/errors"

const updateSubjectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
})

type UpdateSubjectFormValues = z.infer<typeof updateSubjectSchema>

// El input de posición es un <input type="number">, así que react-hook-form lo trata como
// string; se deja así en el schema y se convierte a number (o undefined si está vacío) a
// mano en el submit, en vez de con z.coerce (que convertiría "" en 0).
const unitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  position: z.string().optional(),
})

type UnitFormValues = z.infer<typeof unitSchema>

function parsePosition(position?: string): number | undefined {
  if (!position || position.trim() === "") return undefined
  const parsed = Number(position)
  return Number.isNaN(parsed) ? undefined : parsed
}

function SubjectUnitRow({ subjectId, unit }: { subjectId: number; unit: SubjectUnitDto }) {
  const toast = useToast()
  const updateUnit = useUpdateSubjectUnit()
  const deleteUnit = useDeleteSubjectUnit()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: unit.name ?? "", position: unit.position != null ? String(unit.position) : "" },
  })

  const onSubmit = async (values: UnitFormValues) => {
    if (unit.id == null) return
    try {
      await updateUnit.mutateAsync({
        id: unit.id,
        subjectId,
        body: { name: values.name, position: parsePosition(values.position) },
      })
      toast.success("Tema actualizado correctamente.")
      setIsEditing(false)
    } catch (error) {
      toast.error(conflictMessage(error, "Error al actualizar el tema."))
    }
  }

  const handleDelete = async () => {
    if (unit.id == null) return
    try {
      await deleteUnit.mutateAsync({ id: unit.id, subjectId })
      toast.success("Tema eliminado correctamente.")
    } catch (error) {
      toast.error(conflictMessage(error, "Error al eliminar el tema."))
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <div className="font-medium text-sm">{unit.name}</div>
          {unit.position != null && (
            <div className="text-xs text-muted-foreground">Posición: {unit.position}</div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="cursor-pointer" disabled={deleteUnit.isPending}>
                <Trash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este tema?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Si el tema tiene PDFs asociados, el
                  backend rechazará el borrado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="cursor-pointer" onClick={handleDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border p-3 space-y-2">
      <div className="grid gap-2 md:flex md:gap-4">
        <div className="flex-1 grid gap-1">
          <Label htmlFor={`unit-name-${unit.id}`}>Nombre</Label>
          <Input id={`unit-name-${unit.id}`} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid gap-1 md:w-32">
          <Label htmlFor={`unit-position-${unit.id}`}>Posición</Label>
          <Input id={`unit-position-${unit.id}`} type="number" {...register("position")} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            reset()
            setIsEditing(false)
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting || updateUnit.isPending}>
          Guardar
        </Button>
      </div>
    </form>
  )
}

function CreateUnitForm({ subjectId }: { subjectId: number }) {
  const toast = useToast()
  const createUnit = useCreateSubjectUnit()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: "", position: "" },
  })

  const onSubmit = async (values: UnitFormValues) => {
    try {
      await createUnit.mutateAsync({
        subjectId,
        body: { name: values.name, position: parsePosition(values.position) },
      })
      toast.success("Tema creado correctamente.")
      reset({ name: "", position: "" })
    } catch (error) {
      toast.error(conflictMessage(error, "Error al crear el tema."))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2 md:flex md:items-end md:gap-4">
      <div className="flex-1 grid gap-1">
        <Label htmlFor={`new-unit-name-${subjectId}`}>Nuevo tema</Label>
        <Input
          id={`new-unit-name-${subjectId}`}
          placeholder="Ej: Tema 1: Límites y Continuidad"
          {...register("name")}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid gap-1 md:w-32">
        <Label htmlFor={`new-unit-position-${subjectId}`}>Posición</Label>
        <Input id={`new-unit-position-${subjectId}`} type="number" {...register("position")} />
      </div>
      <Button type="submit" className="cursor-pointer" disabled={isSubmitting || createUnit.isPending}>
        <Plus className="h-4 w-4" />
        Añadir tema
      </Button>
    </form>
  )
}

export function SubjectAccordionCard({ subject }: { subject: SubjectDto }) {
  const [isOpen, setIsOpen] = useState(false)
  const toast = useToast()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()
  // Los temas de una asignatura solo se piden cuando se expande su tarjeta, para no
  // disparar una llamada por cada asignatura del catálogo al cargar el admin.
  const { data: units, isLoading: unitsLoading } = useSubjectUnits(isOpen ? subject.id : null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSubjectFormValues>({
    resolver: zodResolver(updateSubjectSchema),
    defaultValues: { name: subject.name ?? "", description: subject.description ?? "" },
  })

  const onSubmit = async (values: UpdateSubjectFormValues) => {
    if (subject.id == null) return
    try {
      await updateSubject.mutateAsync({
        id: subject.id,
        body: { name: values.name, description: values.description || undefined },
      })
      toast.success("Asignatura actualizada correctamente.")
    } catch (error) {
      toast.error(conflictMessage(error, "Error al actualizar la asignatura."))
    }
  }

  const handleDelete = async () => {
    if (subject.id == null) return
    try {
      await deleteSubject.mutateAsync(subject.id)
      toast.success("Asignatura eliminada correctamente.")
    } catch (error) {
      toast.error(conflictMessage(error, "Error al eliminar la asignatura."))
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md mb-4 w-full">
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="font-medium">{subject.name}</div>
          {subject.description && (
            <div className="text-xs text-muted-foreground">{subject.description}</div>
          )}
        </div>
        <div className="flex space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="cursor-pointer" disabled={deleteSubject.isPending}>
                <Trash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta asignatura?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Si la asignatura tiene temas asociados,
                  el backend rechazará el borrado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="cursor-pointer" onClick={handleDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="cursor-pointer">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <Separator />
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`subject-name-${subject.id}`}>Nombre</Label>
            <Input id={`subject-name-${subject.id}`} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`subject-description-${subject.id}`}>Descripción</Label>
            <Input id={`subject-description-${subject.id}`} {...register("description")} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting || updateSubject.isPending}>
              Guardar cambios
            </Button>
          </div>
        </form>

        <Separator />

        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Temas</h3>
          {unitsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando temas...</p>
          ) : units && units.length > 0 ? (
            <div className="space-y-2">
              {units.map((unit) => (
                <SubjectUnitRow key={unit.id} subjectId={subject.id as number} unit={unit} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Esta asignatura todavía no tiene temas.</p>
          )}

          <Separator className="my-2" />
          <CreateUnitForm subjectId={subject.id as number} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default SubjectAccordionCard
