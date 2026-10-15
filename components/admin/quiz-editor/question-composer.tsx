"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { Check, Loader2, Plus, X } from "lucide-react"
import { QUESTION_TYPES, QUESTION_TYPE_LABEL } from "@/components/admin/quiz-editor/constants"
import { Segmented } from "@/components/admin/quiz-editor/segmented"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateOption } from "@/hooks/api/use-options"
import { useCreateQuestion } from "@/hooks/api/use-questions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const MIN_OPTIONS = 2
const MAX_OPTIONS = 8
const DEFAULT_OPTIONS = 4

const schema = z
  .object({
    text: z.string().trim().min(1, "El enunciado es obligatorio"),
    type: z.enum(QUESTION_TYPES),
    explanation: z.string().optional(),
    options: z.array(z.object({ text: z.string() })),
    // Índice de la opción correcta: en Verdadero/Falso, 0 = Verdadero y 1 = Falso.
    correct: z.number().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "TRUE_FALSE") {
      if (data.correct == null) ctx.addIssue({ code: "custom", path: ["correct"], message: "Indica si es verdadera o falsa" })
      return
    }
    const filled = data.options.filter((option) => option.text.trim() !== "")
    if (filled.length < MIN_OPTIONS) {
      ctx.addIssue({ code: "custom", path: ["options"], message: `Escribe al menos ${MIN_OPTIONS} opciones` })
    }
    if (data.correct == null || !data.options[data.correct]?.text.trim()) {
      ctx.addIssue({ code: "custom", path: ["correct"], message: "Marca cuál es la respuesta correcta" })
    }
  })

type Values = z.infer<typeof schema>

const emptyValues = (type: Values["type"] = "MULTIPLE_CHOICE"): Values => ({
  text: "",
  type,
  explanation: "",
  options: Array.from({ length: DEFAULT_OPTIONS }, () => ({ text: "" })),
  correct: null,
})

const TYPE_OPTIONS = QUESTION_TYPES.map((type) => ({ value: type, label: QUESTION_TYPE_LABEL[type] }))

// Alta de pregunta con sus opciones en un solo paso (antes eran dos formularios separados y la
// pregunta nacía sin opciones). Crea la pregunta y después las opciones, en secuencia.
export function QuestionComposer({
  quizId,
  nextPosition,
  defaultOpen,
}: {
  quizId: number
  nextPosition: number
  defaultOpen: boolean
}) {
  const toast = useToast()
  const createQuestion = useCreateQuestion()
  const createOption = useCreateOption()
  const [open, setOpen] = useState(defaultOpen)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues() })
  const { fields, append, remove } = useFieldArray({ control, name: "options" })

  const type = watch("type")
  const correct = watch("correct")

  const onSubmit = async (values: Values) => {
    const options =
      values.type === "TRUE_FALSE"
        ? [{ text: "Verdadero" }, { text: "Falso" }]
        : values.options
    let questionCreated = false
    try {
      const created = await createQuestion.mutateAsync({
        quizId,
        body: {
          quizId,
          text: values.text,
          type: values.type,
          explanation: values.explanation || undefined,
          position: nextPosition,
        },
      })
      questionCreated = true
      if (created?.id == null) throw new Error("sin id")
      // Posición y marca de correcta se calculan sobre la lista original: los huecos vacíos se saltan.
      let position = 1
      for (const [index, option] of options.entries()) {
        const text = option.text.trim()
        if (!text) continue
        await createOption.mutateAsync({
          questionId: created.id,
          text,
          position: position++,
          correct: index === values.correct,
        })
      }
      toast.success("Pregunta añadida.")
      reset(emptyValues(values.type))
      setFocus("text")
    } catch {
      toast.error(
        questionCreated
          ? "La pregunta se creó, pero no todas las opciones. Complétalas desde la pregunta."
          : "No se pudo añadir la pregunta.",
      )
      if (questionCreated) reset(emptyValues(values.type))
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm font-medium text-muted-foreground transition-colors hover:border-purple-500/60 hover:bg-purple-500/5 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Añadir pregunta
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Nueva pregunta</h3>
        <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="composer-text">Enunciado</Label>
        <Textarea id="composer-text" rows={2} className="resize-y bg-background" {...register("text")} />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label>Tipo de pregunta</Label>
        <Segmented
          label="Tipo de pregunta"
          value={type}
          onChange={(value) => {
            setValue("type", value)
            setValue("correct", null)
          }}
          options={TYPE_OPTIONS}
          className="w-fit bg-background"
        />
      </div>

      <div className="grid gap-2">
        <Label>Opciones</Label>
        <p className="-mt-1 text-xs text-muted-foreground">
          {type === "TRUE_FALSE"
            ? "Elige la respuesta correcta."
            : "Escribe las opciones y pulsa el círculo de la correcta. Las vacías se ignoran."}
        </p>

        {type === "TRUE_FALSE" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {["Verdadero", "Falso"].map((label, index) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={correct === index}
                onClick={() => setValue("correct", index, { shouldValidate: true })}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/60",
                  correct === index && "border-green-500/60 bg-green-500/5",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    correct === index ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/40 text-transparent",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-background py-1.5 pl-2 pr-1.5",
                  correct === index && "border-green-500/60 bg-green-500/5",
                )}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={correct === index}
                  aria-label={`Marcar la opción ${index + 1} como correcta`}
                  onClick={() => setValue("correct", index, { shouldValidate: true })}
                  className={cn(
                    "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
                    correct === index
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/40 text-transparent hover:border-green-500 hover:text-green-500/60",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <Input
                  placeholder={`Opción ${index + 1}`}
                  aria-label={`Texto de la opción ${index + 1}`}
                  className="h-8 border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-input focus-visible:bg-background"
                  {...register(`options.${index}.text`)}
                />
                {fields.length > MIN_OPTIONS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar la opción ${index + 1}`}
                    onClick={() => {
                      remove(index)
                      // La marca sigue a su opción: se ajusta el índice si se quita una anterior o la propia.
                      if (correct != null) {
                        if (correct === index) setValue("correct", null)
                        else if (correct > index) setValue("correct", correct - 1)
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {fields.length < MAX_OPTIONS && (
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => append({ text: "" })}>
                <Plus className="h-4 w-4" />
                Añadir opción
              </Button>
            )}
          </div>
        )}
        {errors.options?.message && <p className="text-sm text-destructive">{errors.options.message}</p>}
        {errors.correct?.message && <p className="text-sm text-destructive">{errors.correct.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="composer-explanation">Explicación (opcional)</Label>
        <Textarea
          id="composer-explanation"
          rows={2}
          placeholder="Se muestra al corregir, tanto si acierta como si falla."
          className="resize-y bg-background"
          {...register("explanation")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Añadir pregunta
        </Button>
      </div>
    </form>
  )
}
