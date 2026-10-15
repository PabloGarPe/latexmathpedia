"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Trash } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  questionIssue,
  sortByPosition,
} from "@/components/admin/quiz-editor/constants"
import { OptionList } from "@/components/admin/quiz-editor/option-list"
import { Segmented } from "@/components/admin/quiz-editor/segmented"
import { SortableRow } from "@/components/admin/quiz-editor/sortable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useDeleteQuestion, useUpdateQuestion } from "@/hooks/api/use-questions"
import { useToast } from "@/hooks/use-toast"
import type { OptionDto } from "@/lib/api/options"
import type { QuestionDto } from "@/lib/api/questions"
import { cn } from "@/lib/utils"

const schema = z.object({
  text: z.string().trim().min(1, "El enunciado es obligatorio"),
  type: z.enum(QUESTION_TYPES),
  explanation: z.string().optional(),
})

type Values = z.infer<typeof schema>

const TYPE_OPTIONS = QUESTION_TYPES.map((type) => ({ value: type, label: QUESTION_TYPE_LABEL[type] }))

function QuestionForm({ quizId, question }: { quizId: number; question: QuestionDto }) {
  const toast = useToast()
  const updateQuestion = useUpdateQuestion()

  const initial: Values = {
    text: question.text ?? "",
    type: (question.type as Values["type"]) ?? "MULTIPLE_CHOICE",
    explanation: question.explanation ?? "",
  }
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial })

  const type = watch("type")

  const onSubmit = async (values: Values) => {
    if (question.id == null) return
    try {
      await updateQuestion.mutateAsync({
        id: question.id,
        quizId,
        body: {
          text: values.text,
          type: values.type,
          explanation: values.explanation || undefined,
          position: question.position,
          quizId,
        },
      })
      // Lo guardado pasa a ser el estado "limpio": el botón vuelve a quedar desactivado.
      reset(values)
      toast.success("Pregunta guardada.")
    } catch {
      toast.error("No se pudo guardar la pregunta.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor={`question-text-${question.id}`}>Enunciado</Label>
        <Textarea id={`question-text-${question.id}`} rows={2} className="resize-y" {...register("text")} />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label>Tipo de pregunta</Label>
        <Segmented
          label="Tipo de pregunta"
          value={type}
          onChange={(value) => setValue("type", value, { shouldDirty: true })}
          options={TYPE_OPTIONS}
          className="w-fit"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`question-explanation-${question.id}`}>Explicación (opcional)</Label>
        <Textarea
          id={`question-explanation-${question.id}`}
          rows={2}
          placeholder="Se muestra al corregir, tanto si acierta como si falla."
          className="resize-y"
          {...register("explanation")}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {isDirty && (
          <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => reset(initial)}>
            Descartar
          </Button>
        )}
        <Button type="submit" size="sm" className="cursor-pointer" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar pregunta
        </Button>
      </div>
    </form>
  )
}

export function QuestionCard({
  quizId,
  question,
  index,
  options,
  open,
  onOpenChange,
}: {
  quizId: number
  question: QuestionDto
  index: number
  // undefined mientras cargan.
  options: OptionDto[] | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const toast = useToast()
  const deleteQuestion = useDeleteQuestion()
  const [confirming, setConfirming] = useState(false)
  const sorted = options ? sortByPosition(options) : undefined
  const issue = questionIssue(sorted)

  const handleDelete = async () => {
    if (question.id == null) return
    try {
      await deleteQuestion.mutateAsync({ id: question.id, quizId })
      toast.success("Pregunta eliminada.")
    } catch {
      toast.error("No se pudo eliminar la pregunta.")
    }
  }

  return (
    <SortableRow id={question.id as number} label={`pregunta ${index}`}>
      {({ handle, dragging }) => (
        <div
          id={`question-${question.id}`}
          className={cn(
            "scroll-mt-24 rounded-xl border bg-card shadow-sm transition-shadow",
            open && "ring-1 ring-purple-500/30",
            dragging && "shadow-xl",
          )}
        >
          <div className="flex items-center gap-1 p-2 pr-3">
            {handle}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onOpenChange(!open)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold tabular-nums text-purple-800 dark:bg-purple-900/60 dark:text-purple-100">
                {index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-medium">{question.text}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{QUESTION_TYPE_LABEL[question.type as keyof typeof QUESTION_TYPE_LABEL] ?? question.type}</span>
                  {sorted && <span>{sorted.length} {sorted.length === 1 ? "opción" : "opciones"}</span>}
                  {sorted &&
                    (issue ? (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {issue}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lista
                      </span>
                    ))}
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
              aria-label={`Eliminar pregunta ${index}`}
              disabled={deleteQuestion.isPending}
              onClick={() => setConfirming(true)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>

          {open && (
            <div className="space-y-5 border-t px-5 pb-5 pt-4">
              <QuestionForm quizId={quizId} question={question} />
              <Separator />
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Opciones</h4>
                  <p className="text-xs text-muted-foreground">
                    Pulsa el círculo para marcar la respuesta correcta. El texto se guarda al salir del campo.
                  </p>
                </div>
                {sorted ? (
                  <OptionList questionId={question.id as number} type={question.type} options={sorted} />
                ) : (
                  <p className="text-sm text-muted-foreground">Cargando opciones...</p>
                )}
              </div>
            </div>
          )}

          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="¿Eliminar esta pregunta?"
            description="Esta acción no se puede deshacer y también eliminará sus opciones."
            onConfirm={handleDelete}
          />
        </div>
      )}
    </SortableRow>
  )
}
