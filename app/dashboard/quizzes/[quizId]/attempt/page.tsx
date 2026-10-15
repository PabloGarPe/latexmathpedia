"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CircleAlert, CircleCheck, CircleX, RotateCcw, Trophy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ContentUnavailable } from "@/components/content-unavailable"
import { PageContainer } from "@/components/page-shell"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useQuizForAttempt, useSubmitQuizAttempt } from "@/hooks/api/use-quizzes"
import type { QuizAttemptResultDto } from "@/lib/api/quizzes"
import { cn } from "@/lib/utils"

export default function QuizAttemptPage() {
  const params = useParams<{ quizId: string }>()
  const quizId = Number(params.quizId)
  const toast = useToast()
  const router = useRouter()

  const { isAuthenticated, loading: authLoading } = useProtectedRoute()
  const { data: quiz, isLoading, error: quizError } = useQuizForAttempt(isAuthenticated ? quizId : null)
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

  if (quizError) {
    return (
      <ContentUnavailable
        title="Este cuestionario no está disponible"
        backHref="/dashboard/quizzes"
        backLabel="Ver cuestionarios"
      />
    )
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
    const total = result.totalQuestions ?? questions.length
    const correct = result.correctAnswers ?? 0
    const percentage = result.percentage ?? (total > 0 ? (correct / total) * 100 : 0)
    const isRetry = (result.attemptNumber ?? 1) > 1
    const adjustedDiffers =
      result.score != null &&
      result.adjustedScore != null &&
      Math.abs(result.score - result.adjustedScore) > 0.05

    return (
      <PageContainer className="max-w-3xl space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent px-6 py-8 text-center dark:from-purple-500/30">
            <p className="text-sm text-muted-foreground">Resultado de &quot;{quiz.name}&quot;</p>
            <div className="mt-4 flex justify-center">
              <ScoreRing percentage={percentage} correct={correct} total={total} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{Math.round(percentage)}% de aciertos</p>
          </div>
          {result.score != null && (
            <CardContent className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{result.score.toFixed(1)}/10</p>
                <p className="text-xs text-muted-foreground">Nota del intento</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">#{result.attemptNumber ?? 1}</p>
                <p className="text-xs text-muted-foreground">Intento</p>
              </div>
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-center dark:border-amber-700/50 dark:bg-amber-950/30">
                <p className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {(result.adjustedScore ?? result.score).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Puntuación para el ranking</p>
              </div>
              {(isRetry || adjustedDiffers) && (
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  Al ser tu intento nº {result.attemptNumber}, la nota se pondera para el ranking
                  ({result.score.toFixed(1)} → {result.adjustedScore?.toFixed(1)}). Se guarda tu mejor
                  puntuación ponderada.
                </p>
              )}
            </CardContent>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button className="cursor-pointer gap-2" onClick={() => router.push(`/dashboard/quizzes/${quizId}`)}>
            <Trophy className="h-4 w-4" />
            Ver tabla de líderes
          </Button>
          <Button variant="outline" className="cursor-pointer gap-2" onClick={() => {
              setAnswers({})
              setResult(null)
              window.scrollTo({ top: 0 })
            }}>
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>

        <h2 className="pt-2 text-lg font-semibold">Revisión</h2>
        {result.answers?.map((answer, index) => {
          const question = answer.questionId != null ? questionById.get(answer.questionId) : undefined
          if (!question) return null
          const selectedOption = question.options?.find((o) => o.id === answer.selectedOptionId)
          const correctOption = question.options?.find((o) => o.id === answer.correctOptionId)

          return (
            <Card
              key={question.id}
              className={cn(
                "border-l-4",
                answer.correct ? "border-l-green-500" : "border-l-red-500",
              )}
            >
              <CardHeader className="flex flex-row items-start gap-2 space-y-0">
                {answer.correct ? (
                  <CircleCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <CircleX className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                )}
                <CardTitle className="text-base font-medium">
                  {index + 1}. {question.text}
                </CardTitle>
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
      </PageContainer>
    )
  }

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="sticky top-0 z-10 -mx-8 space-y-2 border-b bg-background/90 px-8 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-lg font-bold sm:text-xl">{quiz.name}</h1>
          <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
            {answeredCount}/{questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-1.5 bg-purple-500/20 [&>div]:bg-purple-500" />
      </div>

      {questions.map((question, index) => (
        <Card key={question.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-100">
              {index + 1}
            </span>
            <CardTitle className="pt-0.5 text-base font-medium leading-snug">{question.text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              className="gap-2"
              // "" (y no undefined) = controlado desde el principio, sin ninguna opción marcada.
              value={question.id != null && answers[question.id] != null ? String(answers[question.id]) : ""}
              onValueChange={(value) => {
                if (question.id == null) return
                setAnswers((prev) => ({ ...prev, [question.id as number]: Number(value) }))
              }}
            >
              {question.options?.map((option, optionIndex) => (
                <Label
                  key={option.id}
                  htmlFor={`option-${option.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted/60 has-data-[state=checked]:border-purple-500 has-data-[state=checked]:bg-purple-500/10"
                >
                  <RadioGroupItem value={String(option.id)} id={`option-${option.id}`} />
                  <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <Button
        size="lg"
        className="cursor-pointer w-full"
        onClick={handleSubmit}
        disabled={submitAttempt.isPending || answeredCount === 0}
      >
        {submitAttempt.isPending
          ? "Enviando..."
          : answeredCount < questions.length
            ? `Enviar cuestionario (${questions.length - answeredCount} sin responder)`
            : "Enviar cuestionario"}
      </Button>
    </PageContainer>
  )
}

// Anillo de progreso con las respuestas correctas en el centro.
function ScoreRing({ percentage, correct, total }: { percentage: number; correct: number; total: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(percentage, 0), 100) / 100)
  const color = percentage >= 70 ? "text-green-500" : percentage >= 50 ? "text-amber-500" : "text-red-500"

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("stroke-current transition-all duration-1000", color)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums">
          {correct}/{total}
        </span>
        <span className="text-xs text-muted-foreground">aciertos</span>
      </div>
    </div>
  )
}
