"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { useCreateOption, useDeleteOption, useUpdateOption } from "@/hooks/api/use-options"
import { useDeleteQuestion, useUpdateQuestion } from "@/hooks/api/use-questions"
import { useQuestionOptions } from "@/hooks/api/use-questions"
import type { QuestionDto } from "@/lib/api/questions"
import type { OptionDto } from "@/lib/api/options"

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE"] as const
export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Opción múltiple",
  TRUE_FALSE: "Verdadero/Falso",
}

const questionSchema = z.object({
  text: z.string().min(1, "El texto es obligatorio"),
  type: z.enum(QUESTION_TYPES),
  explanation: z.string().optional(),
})

type QuestionFormValues = z.infer<typeof questionSchema>

const optionSchema = z.object({
  text: z.string().min(1, "El texto es obligatorio"),
})

type OptionFormValues = z.infer<typeof optionSchema>

function OptionRow({
  option,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  option: OptionDto
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const toast = useToast()
  const updateOption = useUpdateOption()
  const deleteOption = useDeleteOption()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema),
    defaultValues: { text: option.text ?? "" },
  })

  const onSubmit = async (values: OptionFormValues) => {
    if (option.id == null || option.questionId == null) return
    try {
      await updateOption.mutateAsync({
        id: option.id,
        body: {
          text: values.text,
          position: option.position,
          questionId: option.questionId,
          correct: option.correct,
        },
      })
      toast.success("Opción actualizada.")
      setIsEditing(false)
    } catch (error) {
      toast.error("No se pudo actualizar la opción.")
    }
  }

  const handleDelete = async () => {
    if (option.id == null || option.questionId == null) return
    try {
      await deleteOption.mutateAsync({ id: option.id, questionId: option.questionId })
      toast.success("Opción eliminada.")
    } catch (error) {
      toast.error("No se pudo eliminar la opción.")
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <RadioGroupItem value={option.id != null ? String(option.id) : ""} id={`option-correct-${option.id}`} />
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 items-center gap-2">
          <div className="flex-1">
            <Input {...register("text")} />
            {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
          </div>
          <Button type="submit" size="sm" className="cursor-pointer" disabled={isSubmitting || updateOption.isPending}>
            Guardar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              reset()
              setIsEditing(false)
            }}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <>
          <Label htmlFor={`option-correct-${option.id}`} className="flex-1 cursor-pointer font-normal">
            {option.text}
          </Label>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onMoveUp} disabled={isFirst}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onMoveDown} disabled={isLast}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer" disabled={deleteOption.isPending}>
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta opción?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
        </>
      )}
    </div>
  )
}

function OptionsEditor({ questionId, options }: { questionId: number; options: OptionDto[] }) {
  const toast = useToast()
  const updateOption = useUpdateOption()
  const sorted = [...options].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const correctOption = sorted.find((o) => o.correct)

  // Las dos escrituras no son atómicas en el backend: se ejecutan en secuencia (nunca en
  // paralelo) para que en ningún instante intermedio existan dos opciones "correct: true" a
  // la vez, y si la segunda falla se deshace la primera para no perder la opción correcta.
  const handleSetCorrect = async (option: OptionDto) => {
    if (option.id == null || option.correct) return
    const previous = correctOption
    try {
      if (previous && previous.id != null && previous.id !== option.id) {
        await updateOption.mutateAsync({
          id: previous.id,
          body: {
            text: previous.text ?? "",
            position: previous.position,
            questionId,
            correct: false,
          },
        })
      }
      try {
        await updateOption.mutateAsync({
          id: option.id,
          body: { text: option.text ?? "", position: option.position, questionId, correct: true },
        })
      } catch (innerError) {
        if (previous && previous.id != null) {
          await updateOption.mutateAsync({
            id: previous.id,
            body: {
              text: previous.text ?? "",
              position: previous.position,
              questionId,
              correct: true,
            },
          })
        }
        throw innerError
      }
    } catch (error) {
      toast.error("No se pudo marcar la opción correcta.")
    }
  }

  const handleMove = async (option: OptionDto, direction: -1 | 1) => {
    const index = sorted.findIndex((o) => o.id === option.id)
    const neighbor = sorted[index + direction]
    if (!neighbor || option.id == null || neighbor.id == null) return
    try {
      await updateOption.mutateAsync({
        id: option.id,
        body: { text: option.text ?? "", position: neighbor.position, questionId, correct: option.correct },
      })
      try {
        await updateOption.mutateAsync({
          id: neighbor.id,
          body: { text: neighbor.text ?? "", position: option.position, questionId, correct: neighbor.correct },
        })
      } catch (innerError) {
        await updateOption.mutateAsync({
          id: option.id,
          body: { text: option.text ?? "", position: option.position, questionId, correct: option.correct },
        })
        throw innerError
      }
    } catch (error) {
      toast.error("No se pudo reordenar la opción.")
    }
  }

  return (
    <RadioGroup
      value={correctOption?.id != null ? String(correctOption.id) : undefined}
      onValueChange={(value) => {
        const option = sorted.find((o) => String(o.id) === value)
        if (option) handleSetCorrect(option)
      }}
      className="space-y-2"
    >
      {sorted.map((option, index) => (
        <OptionRow
          key={option.id}
          option={option}
          isFirst={index === 0}
          isLast={index === sorted.length - 1}
          onMoveUp={() => handleMove(option, -1)}
          onMoveDown={() => handleMove(option, 1)}
        />
      ))}
    </RadioGroup>
  )
}

function CreateOptionForm({ questionId, nextPosition }: { questionId: number; nextPosition: number }) {
  const toast = useToast()
  const createOption = useCreateOption()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema),
    defaultValues: { text: "" },
  })

  const onSubmit = async (values: OptionFormValues) => {
    try {
      await createOption.mutateAsync({
        questionId,
        text: values.text,
        position: nextPosition,
        correct: false,
      })
      toast.success("Opción añadida.")
      reset({ text: "" })
    } catch (error) {
      toast.error("No se pudo añadir la opción.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
      <div className="flex-1 grid gap-1">
        <Label htmlFor={`new-option-${questionId}`}>Nueva opción</Label>
        <Input id={`new-option-${questionId}`} placeholder="Texto de la opción" {...register("text")} />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>
      <Button type="submit" size="sm" className="cursor-pointer" disabled={isSubmitting || createOption.isPending}>
        <Plus className="h-4 w-4" />
        Añadir opción
      </Button>
    </form>
  )
}

export function QuestionAccordionItem({
  quizId,
  question,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  quizId: number
  question: QuestionDto
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const toast = useToast()
  const updateQuestion = useUpdateQuestion()
  const deleteQuestion = useDeleteQuestion()
  const { data: options, isLoading: optionsLoading } = useQuestionOptions(question.id)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: question.text ?? "",
      type: (question.type as (typeof QUESTION_TYPES)[number]) ?? "MULTIPLE_CHOICE",
      explanation: question.explanation ?? "",
    },
  })

  const typeValue = watch("type")

  const onSubmit = async (values: QuestionFormValues) => {
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
      toast.success("Pregunta actualizada.")
    } catch (error) {
      toast.error("No se pudo actualizar la pregunta.")
    }
  }

  const handleDelete = async () => {
    if (question.id == null) return
    try {
      await deleteQuestion.mutateAsync({ id: question.id, quizId })
      toast.success("Pregunta eliminada.")
    } catch (error) {
      toast.error("No se pudo eliminar la pregunta.")
    }
  }

  const nextOptionPosition = (options?.reduce((max, o) => Math.max(max, o.position ?? 0), 0) ?? 0) + 1

  return (
    <AccordionItem value={String(question.id)}>
      <div className="flex items-center gap-1 pr-2">
        <AccordionTrigger className="flex-1">
          <div className="flex flex-col items-start text-left">
            <span className="font-medium">{question.text}</span>
            <span className="text-xs text-muted-foreground">
              {QUESTION_TYPE_LABEL[question.type ?? ""] ?? question.type}
              {question.position != null && ` · Posición ${question.position}`}
            </span>
          </div>
        </AccordionTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={isFirst}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          disabled={isLast}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              disabled={deleteQuestion.isPending}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta pregunta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer y también eliminará sus opciones.
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

      <AccordionContent className="space-y-4 px-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-2">
            <Label htmlFor={`question-text-${question.id}`}>Texto</Label>
            <Textarea id={`question-text-${question.id}`} {...register("text")} />
            {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
          </div>
          <div className="grid gap-2 sm:w-64">
            <Label>Tipo</Label>
            <Select
              value={typeValue}
              onValueChange={(value) => setValue("type", value as (typeof QUESTION_TYPES)[number])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {QUESTION_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`question-explanation-${question.id}`}>Explicación (opcional)</Label>
            <Textarea id={`question-explanation-${question.id}`} {...register("explanation")} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting || updateQuestion.isPending}>
              Guardar pregunta
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Opciones</h4>
          {optionsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando opciones...</p>
          ) : options && options.length > 0 ? (
            <OptionsEditor questionId={question.id as number} options={options} />
          ) : (
            <p className="text-sm text-muted-foreground">Esta pregunta todavía no tiene opciones.</p>
          )}
          <CreateOptionForm questionId={question.id as number} nextPosition={nextOptionPosition} />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default QuestionAccordionItem
