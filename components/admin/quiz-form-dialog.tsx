"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FileJson, ListChecks, Loader2 } from "lucide-react"
import { DifficultyPicker } from "@/components/admin/difficulty-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QUIZ_DIFFICULTIES } from "@/components/ui/quiz-difficulty-badge"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import { Textarea } from "@/components/ui/textarea"
import { useCreateQuiz, useUpdateQuiz } from "@/hooks/api/use-quizzes"
import { useSubjects, useSubjectUnits } from "@/hooks/api/use-subjects"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import type { QuizDto } from "@/lib/api/quizzes"
import { quizImportHref } from "@/lib/quiz-import"

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    difficulty: z.enum(QUIZ_DIFFICULTIES),
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type Values = z.infer<typeof schema>

// Dónde se creará el cuestionario cuando ya se sabe (se abre desde una asignatura o un tema): se
// resume en una línea y el selector completo solo aparece si se pulsa "Cambiar".
function LocationSummary({
  subjectId,
  subjectUnitId,
  onChange,
}: {
  subjectId: number | null
  subjectUnitId: number | null
  onChange: () => void
}) {
  const { data: subjects } = useSubjects()
  const { data: units } = useSubjectUnits(subjectId)
  const subject = subjects?.find((candidate) => candidate.id === subjectId)
  const unit = units?.find((candidate) => candidate.id === subjectUnitId)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Se creará en</span>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/60 dark:text-purple-100">
          {subject?.name ?? "…"}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border">
          {unit?.name ?? "General (sin tema)"}
        </span>
      </div>
      <Button type="button" variant="ghost" size="sm" className="shrink-0 cursor-pointer" onClick={onChange}>
        Cambiar
      </Button>
    </div>
  )
}

function QuizForm({
  quiz,
  initialSubjectId,
  initialSubjectUnitId,
  onClose,
}: {
  quiz?: QuizDto
  initialSubjectId: number | null
  initialSubjectUnitId: number | null
  onClose: () => void
}) {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const createQuiz = useCreateQuiz()
  const updateQuiz = useUpdateQuiz()
  const editing = quiz != null
  // Con ubicación de partida (creación desde una asignatura/tema) se muestra resumida.
  const [changingLocation, setChangingLocation] = useState(editing || initialSubjectId == null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: quiz?.name ?? "",
      description: quiz?.description ?? "",
      difficulty: (quiz?.difficulty as Values["difficulty"]) ?? "EASY",
      subjectId: quiz?.subject?.id ?? initialSubjectId,
      subjectUnitId: quiz?.subjectUnit?.id ?? initialSubjectUnitId,
    },
  })

  const subjectId = watch("subjectId")
  const subjectUnitId = watch("subjectUnitId")
  const difficulty = watch("difficulty")

  const onSubmit = async (values: Values) => {
    const body = {
      name: values.name,
      description: values.description || undefined,
      difficulty: values.difficulty,
      subjectId: values.subjectId as number,
      subjectUnitId: values.subjectUnitId,
    }
    try {
      if (quiz?.id != null) {
        await updateQuiz.mutateAsync({ id: quiz.id, body })
        toast.success("Cuestionario actualizado.")
        onClose()
      } else {
        const created = await createQuiz.mutateAsync(body)
        toast.success("Cuestionario creado, oculto por ahora. Añade preguntas y publícalo cuando esté listo.")
        onClose()
        if (created?.id != null) router.push(`/dashboard/admin/quizzes/${created.id}`)
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? "Ya existe un cuestionario con ese nombre."
          : editing
            ? "No se pudo actualizar el cuestionario."
            : "No se pudo crear el cuestionario.",
      )
    }
  }

  // "¿Ya lo tienes en JSON?": cierra el diálogo y lleva a la importación con la ubicación que haya
  // ahora en el formulario; "Volver" regresa a esta misma ruta (el search se lee al pulsar).
  const goToImport = () => {
    onClose()
    router.push(
      quizImportHref({ subjectId, subjectUnitId, returnTo: `${pathname}${window.location.search}` }),
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <div className="grid gap-2">
          <Label htmlFor="quiz-name">Nombre</Label>
          <Input id="quiz-name" placeholder="Ej: Test de límites y continuidad" autoFocus {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="quiz-description">Descripción (opcional)</Label>
          <Textarea
            id="quiz-description"
            rows={3}
            placeholder="Qué se evalúa, a quién va dirigido…"
            className="resize-none"
            {...register("description")}
          />
        </div>

        <div className="grid gap-2">
          <Label>Dificultad</Label>
          <DifficultyPicker value={difficulty} onChange={(value) => setValue("difficulty", value)} />
        </div>

        <div className="grid gap-2">
          {changingLocation ? (
            <SubjectUnitPicker
              subjectId={subjectId}
              subjectUnitId={subjectUnitId}
              onSubjectChange={(id) => {
                setValue("subjectId", id, { shouldValidate: true })
                setValue("subjectUnitId", null)
              }}
              onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
            />
          ) : (
            <LocationSummary
              subjectId={subjectId}
              subjectUnitId={subjectUnitId}
              onChange={() => setChangingLocation(true)}
            />
          )}
          {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}
        </div>

        {!editing && (
          <p className="flex flex-wrap items-center gap-x-1 border-t pt-4 text-sm text-muted-foreground">
            ¿Ya lo tienes en JSON?
            <Button type="button" variant="link" size="sm" className="h-auto cursor-pointer p-0" onClick={goToImport}>
              <FileJson className="h-3.5 w-3.5" />
              Impórtalo
            </Button>
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
        <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Guardar cambios" : "Crear y añadir preguntas"}
        </Button>
      </div>
    </form>
  )
}

// Alta y edición de los datos de un cuestionario (nombre, descripción, dificultad y ubicación).
// Sin `quiz` crea uno nuevo y lleva al editor de preguntas; con `quiz` edita sus datos. En el
// alta, `subjectId`/`subjectUnitId` fijan la ubicación de partida (desde la ficha de asignatura).
export function QuizFormDialog({
  open,
  onOpenChange,
  quiz,
  subjectId = null,
  subjectUnitId = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz?: QuizDto
  subjectId?: number | null
  subjectUnitId?: number | null
}) {
  const editing = quiz != null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="relative overflow-hidden border-b bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent px-6 py-5 dark:from-purple-500/30">
          <ListChecks className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rotate-12 text-purple-500/15" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-sm">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-0.5 pr-6">
              <DialogTitle className="text-lg">{editing ? "Editar cuestionario" : "Nuevo cuestionario"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Cambia sus datos; las preguntas se editan desde el editor."
                  : "Lo mínimo para empezar; añadirás las preguntas justo después."}
              </DialogDescription>
            </div>
          </div>
        </div>
        {/* Dentro de DialogContent: se monta al abrir, así cada apertura empieza con valores limpios. */}
        <QuizForm
          quiz={quiz}
          initialSubjectId={subjectId}
          initialSubjectUnitId={subjectUnitId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
