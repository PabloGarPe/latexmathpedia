"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Plus, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion } from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import { QUIZ_DIFFICULTIES, DIFFICULTY_LABEL } from "@/components/ui/quiz-difficulty-badge"
import {
  QuestionAccordionItem,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
} from "@/components/ui/QuizQuestionAccordion"
import { useToast } from "@/hooks/use-toast"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useDeleteQuiz, useQuiz, useQuizQuestions, useUpdateQuiz } from "@/hooks/api/use-quizzes"
import { useCreateQuestion, useUpdateQuestion } from "@/hooks/api/use-questions"
import type { QuestionDto } from "@/lib/api/questions"
import { conflictMessage } from "@/lib/api/errors"

const updateQuizSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    difficulty: z.enum(QUIZ_DIFFICULTIES),
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type UpdateQuizFormValues = z.infer<typeof updateQuizSchema>

const createQuestionSchema = z.object({
  text: z.string().min(1, "El texto es obligatorio"),
  type: z.enum(QUESTION_TYPES),
  explanation: z.string().optional(),
})

type CreateQuestionFormValues = z.infer<typeof createQuestionSchema>

function CreateQuestionForm({ quizId, nextPosition }: { quizId: number; nextPosition: number }) {
  const toast = useToast()
  const createQuestion = useCreateQuestion()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuestionFormValues>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: { text: "", type: "MULTIPLE_CHOICE", explanation: "" },
  })

  const typeValue = watch("type")

  const onSubmit = async (values: CreateQuestionFormValues) => {
    try {
      await createQuestion.mutateAsync({
        quizId,
        body: {
          quizId,
          text: values.text,
          type: values.type,
          explanation: values.explanation || undefined,
          position: nextPosition,
        },
      })
      toast.success("Pregunta añadida.")
      reset({ text: "", type: "MULTIPLE_CHOICE", explanation: "" })
    } catch (error) {
      toast.error(conflictMessage(error, "No se pudo añadir la pregunta."))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border p-4">
      <h4 className="text-sm font-semibold">Añadir pregunta</h4>
      <div className="grid gap-2">
        <Label htmlFor="new-question-text">Texto</Label>
        <Textarea id="new-question-text" {...register("text")} />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>
      <div className="grid gap-2 sm:w-64">
        <Label>Tipo</Label>
        <Select value={typeValue} onValueChange={(value) => setValue("type", value as CreateQuestionFormValues["type"])}>
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
        <Label htmlFor="new-question-explanation">Explicación (opcional)</Label>
        <Textarea id="new-question-explanation" {...register("explanation")} />
      </div>
      <Button type="submit" className="cursor-pointer" disabled={isSubmitting || createQuestion.isPending}>
        <Plus className="h-4 w-4" />
        Añadir pregunta
      </Button>
    </form>
  )
}

export default function QuizEditorPage() {
  const params = useParams<{ quizId: string }>()
  const quizId = Number(params.quizId)
  const router = useRouter()
  const toast = useToast()

  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const { data: quiz, isLoading: quizLoading } = useQuiz(isAuthenticated && isAdmin ? quizId : null)
  const { data: questions, isLoading: questionsLoading } = useQuizQuestions(
    isAuthenticated && isAdmin ? quizId : null
  )
  const updateQuiz = useUpdateQuiz()
  const deleteQuiz = useDeleteQuiz()
  const reorderQuestion = useUpdateQuestion()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateQuizFormValues>({
    resolver: zodResolver(updateQuizSchema),
    values: {
      name: quiz?.name ?? "",
      description: quiz?.description ?? "",
      difficulty: (quiz?.difficulty as UpdateQuizFormValues["difficulty"]) ?? "EASY",
      subjectId: quiz?.subject?.id ?? null,
      subjectUnitId: quiz?.subjectUnit?.id ?? null,
    },
  })

  const subjectIdValue = watch("subjectId")
  const subjectUnitIdValue = watch("subjectUnitId")
  const difficultyValue = watch("difficulty")

  const sortedQuestions = useMemo(
    () => [...(questions ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions]
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  if (quizLoading || !quiz) {
    return <p className="p-8 text-muted-foreground">Cargando cuestionario...</p>
  }

  const onSubmitMetadata = async (values: UpdateQuizFormValues) => {
    try {
      await updateQuiz.mutateAsync({
        id: quizId,
        body: {
          name: values.name,
          description: values.description || undefined,
          difficulty: values.difficulty,
          subjectId: values.subjectId as number,
          subjectUnitId: values.subjectUnitId,
        },
      })
      toast.success("Cuestionario actualizado.")
    } catch (error) {
      toast.error(conflictMessage(error, "No se pudo actualizar el cuestionario."))
    }
  }

  const handleDeleteQuiz = async () => {
    try {
      await deleteQuiz.mutateAsync(quizId)
      toast.success("Cuestionario eliminado.")
      router.push("/dashboard/admin/quizzes")
    } catch (error) {
      toast.error("No se pudo eliminar el cuestionario.")
    }
  }

  // Igual que en QuizQuestionAccordion.tsx: las dos escrituras van en secuencia (no en
  // paralelo) y la segunda se deshace si falla, para no dejar dos preguntas con la misma
  // posición si una de las dos peticiones falla.
  const handleMoveQuestion = async (question: QuestionDto, direction: -1 | 1) => {
    const index = sortedQuestions.findIndex((q) => q.id === question.id)
    const neighbor = sortedQuestions[index + direction]
    if (!neighbor || question.id == null || neighbor.id == null) return
    try {
      await reorderQuestion.mutateAsync({
        id: question.id,
        quizId,
        body: {
          text: question.text ?? "",
          type: question.type as "MULTIPLE_CHOICE" | "TRUE_FALSE",
          explanation: question.explanation ?? undefined,
          position: neighbor.position,
          quizId,
        },
      })
      try {
        await reorderQuestion.mutateAsync({
          id: neighbor.id,
          quizId,
          body: {
            text: neighbor.text ?? "",
            type: neighbor.type as "MULTIPLE_CHOICE" | "TRUE_FALSE",
            explanation: neighbor.explanation ?? undefined,
            position: question.position,
            quizId,
          },
        })
      } catch (innerError) {
        await reorderQuestion.mutateAsync({
          id: question.id,
          quizId,
          body: {
            text: question.text ?? "",
            type: question.type as "MULTIPLE_CHOICE" | "TRUE_FALSE",
            explanation: question.explanation ?? undefined,
            position: question.position,
            quizId,
          },
        })
        throw innerError
      }
    } catch (error) {
      toast.error("No se pudo reordenar la pregunta.")
    }
  }

  const nextQuestionPosition =
    sortedQuestions.reduce((max, q) => Math.max(max, q.position ?? 0), 0) + 1

  return (
    <div className="p-8 w-full max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Editar cuestionario</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="cursor-pointer" disabled={deleteQuiz.isPending}>
              <Trash className="h-4 w-4" />
              Eliminar cuestionario
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este cuestionario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer y eliminará también sus preguntas y opciones.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="cursor-pointer" onClick={handleDeleteQuiz}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del cuestionario</CardTitle>
          <CardDescription>Nombre, descripción, dificultad y ubicación en el catálogo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitMetadata)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="quiz-name">Nombre</Label>
              <Input id="quiz-name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quiz-description">Descripción</Label>
              <Input id="quiz-description" {...register("description")} />
            </div>
            <div className="grid gap-2 sm:w-64">
              <Label>Dificultad</Label>
              <Select
                value={difficultyValue}
                onValueChange={(value) => setValue("difficulty", value as UpdateQuizFormValues["difficulty"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_DIFFICULTIES.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {DIFFICULTY_LABEL[difficulty]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <SubjectUnitPicker
              subjectId={subjectIdValue ?? null}
              subjectUnitId={subjectUnitIdValue ?? null}
              onSubjectChange={(id) => {
                setValue("subjectId", id, { shouldValidate: true })
                setValue("subjectUnitId", null)
              }}
              onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
            />
            {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}

            <div className="flex justify-end">
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting || updateQuiz.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas</CardTitle>
          <CardDescription>
            Cada pregunta puede expandirse para editar su texto, tipo, explicación y opciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando preguntas...</p>
          ) : sortedQuestions.length > 0 ? (
            <Accordion type="multiple">
              {sortedQuestions.map((question, index) => (
                <QuestionAccordionItem
                  key={question.id}
                  quizId={quizId}
                  question={question}
                  isFirst={index === 0}
                  isLast={index === sortedQuestions.length - 1}
                  onMoveUp={() => handleMoveQuestion(question, -1)}
                  onMoveDown={() => handleMoveQuestion(question, 1)}
                />
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">Este cuestionario todavía no tiene preguntas.</p>
          )}

          <Separator />

          <CreateQuestionForm quizId={quizId} nextPosition={nextQuestionPosition} />
        </CardContent>
      </Card>
    </div>
  )
}
