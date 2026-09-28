"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { CircleAlert, CircleCheck, CircleX } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useQuizForAttempt, useSubmitQuizAttempt } from "@/hooks/api/use-quizzes"
import type { QuizAttemptResultDto } from "@/lib/api/quizzes"

export default function QuizAttemptPage() {
  const params = useParams<{ quizId: string }>()
  const quizId = Number(params.quizId)
  const toast = useToast()

  const { isAuthenticated, loading: authLoading } = useProtectedRoute()
  const { data: quiz, isLoading } = useQuizForAttempt(isAuthenticated ? quizId : null)
  const submitAttempt = useSubmitQuizAttempt(quizId)

  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizAttemptResultDto | null>(null)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading || !quiz) {
    return <p className="p-8 text-muted-foreground">Cargando cuestionario...</p>
  }

  const questions = quiz.questions ?? []
  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  const handleSubmit = async () => {
    try {
      const submitted = await submitAttempt.mutateAsync({
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId: Number(questionId),
          selectedOptionId,
        })),
      })
      setResult(submitted)
    } catch (error) {
      toast.error("No se pudo enviar el cuestionario.")
    }
  }

  // Vista de resultado: reemplaza el contenido de esta misma página, no navega a otra URL.
  if (result) {
    const questionById = new Map(questions.map((question) => [question.id, question]))

    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardDescription>Resultado de &quot;{quiz.name}&quot;</CardDescription>
            <CardTitle className="text-5xl font-bold">
              {result.correctAnswers ?? 0}/{result.totalQuestions ?? questions.length}
            </CardTitle>
            {result.percentage != null && (
              <CardDescription>{Math.round(result.percentage)}% de aciertos</CardDescription>
            )}
          </CardHeader>
        </Card>

        {result.answers?.map((answer) => {
          const question = answer.questionId != null ? questionById.get(answer.questionId) : undefined
          if (!question) return null
          const selectedOption = question.options?.find((o) => o.id === answer.selectedOptionId)
          const correctOption = question.options?.find((o) => o.id === answer.correctOptionId)

          return (
            <Card key={question.id}>
              <CardHeader className="flex flex-row items-start gap-2 space-y-0">
                {answer.correct ? (
                  <CircleCheck className="h-5 w-5 text-green-600 mt-1 shrink-0" />
                ) : (
                  <CircleX className="h-5 w-5 text-destructive mt-1 shrink-0" />
                )}
                <CardTitle className="text-base font-medium">{question.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Tu respuesta:{" "}
                  <span className={answer.correct ? "text-green-600" : "text-destructive"}>
                    {selectedOption?.text ?? "Sin responder"}
                  </span>
                </p>
                {!answer.correct && correctOption && (
                  <p>
                    Respuesta correcta: <span className="text-green-600">{correctOption.text}</span>
                  </p>
                )}
                {answer.explanation && (
                  <Alert>
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Explicación</AlertTitle>
                    <AlertDescription>{answer.explanation}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{quiz.name}</h1>
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground">
          {answeredCount} de {questions.length} preguntas respondidas
        </p>
      </div>

      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {index + 1}. {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={question.id != null && answers[question.id] != null ? String(answers[question.id]) : undefined}
              onValueChange={(value) => {
                if (question.id == null) return
                setAnswers((prev) => ({ ...prev, [question.id as number]: Number(value) }))
              }}
            >
              {question.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(option.id)} id={`option-${option.id}`} />
                  <Label htmlFor={`option-${option.id}`}>{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <Button
        className="cursor-pointer w-full"
        onClick={handleSubmit}
        disabled={submitAttempt.isPending || answeredCount === 0}
      >
        {submitAttempt.isPending ? "Enviando..." : "Enviar cuestionario"}
      </Button>
    </div>
  )
}
