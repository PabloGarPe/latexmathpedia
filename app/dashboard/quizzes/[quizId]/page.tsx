"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Gauge, ListChecks, Medal, Percent, Repeat, Target } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { QuizLeaderboard } from "@/components/quiz-leaderboard"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useQuiz, useQuizStats } from "@/hooks/api/use-quizzes"

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <Icon className="h-4 w-4 text-purple-500" />
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function QuizStatsSection({ quizId }: { quizId: number }) {
  const { data: stats, isLoading } = useQuizStats(quizId)

  if (isLoading || !stats) return null

  // Con 0 intentos el backend devuelve el resto de valores a 0: no se muestran.
  if (!stats.totalAttempts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tus estadísticas</CardTitle>
          <CardDescription>Aún no has intentado este cuestionario.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // bestScore/averageScore van sobre 10; completionRate/accuracyPercentage ya son porcentajes (0-100).
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Tus estadísticas</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile icon={Repeat} label="Intentos totales" value={stats.totalAttempts} />
        <StatTile
          icon={Gauge}
          label="Tasa de finalización"
          value={stats.completionRate != null ? `${Math.round(stats.completionRate)}%` : "-"}
        />
        <StatTile
          icon={Percent}
          label="Precisión media"
          value={stats.accuracyPercentage != null ? `${Math.round(stats.accuracyPercentage)}%` : "-"}
        />
        <StatTile
          icon={Target}
          label="Puntuación media"
          value={stats.averageScore != null ? `${stats.averageScore.toFixed(1)}/10` : "-"}
        />
        <StatTile
          icon={Medal}
          label="Mejor puntuación"
          value={stats.bestScore != null ? `${stats.bestScore.toFixed(1)}/10` : "-"}
        />
      </div>
    </section>
  )
}

export default function QuizDetailPage() {
  const params = useParams<{ quizId: string }>()
  const quizId = Number(params.quizId)
  const router = useRouter()

  // Ficha: requiere sesión (GET /quiz/{id} no es público, aunque no exige rol admin)
  const { isAuthenticated, loading: authLoading } = useProtectedRoute()
  const { data: quiz, isLoading } = useQuiz(isAuthenticated ? quizId : null)

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

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/quizzes")}
        className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Cuestionarios
      </button>

      <header className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-8 dark:from-purple-500/25 dark:via-fuchsia-500/10">
        <ListChecks className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rotate-12 text-purple-500/10" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-100">
              <ListChecks className="h-3 w-3" />
              Cuestionario
            </span>
            <QuizDifficultyBadge difficulty={quiz.difficulty} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{quiz.name}</h1>
          {quiz.description && (
            <p className="max-w-prose text-muted-foreground">{quiz.description}</p>
          )}
          {(quiz.subject?.name || quiz.subjectUnit?.name) && (
            <div className="flex flex-wrap gap-2">
              {quiz.subject?.name && (
                <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs">{quiz.subject.name}</span>
              )}
              {quiz.subjectUnit?.name && (
                <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {quiz.subjectUnit.name}
                </span>
              )}
            </div>
          )}
          <Button
            size="lg"
            className="cursor-pointer gap-2"
            onClick={() => router.push(`/dashboard/quizzes/${quizId}/attempt`)}
          >
            Empezar cuestionario
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <QuizStatsSection quizId={quizId} />
      <QuizLeaderboard quizId={quizId} />
    </div>
  )
}
