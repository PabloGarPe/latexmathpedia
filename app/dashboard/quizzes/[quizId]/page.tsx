"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Gauge, ListChecks, Medal, Pencil, Percent, Repeat, Target, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { ContentUnavailable } from "@/components/content-unavailable"
import { QuizFormDialog } from "@/components/admin/quiz-form-dialog"
import { PageContainer } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { QuizLeaderboard } from "@/components/quiz-leaderboard"
import { ShareQuizButton } from "@/components/quizzes/share-quiz-button"
import { StatTile } from "@/components/quizzes/stat-tile"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useDeleteQuiz, useQuiz, useQuizStats } from "@/hooks/api/use-quizzes"
import { useToast } from "@/hooks/use-toast"

function QuizStatsSection({ quizId }: { quizId: number }) {
  const { data: stats, isLoading } = useQuizStats(quizId)

  if (isLoading || !stats) return <div className="h-40 animate-pulse rounded-xl bg-muted" />

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
      {/* 3 + 2 en pantallas anchas: 6 columnas, las tres primeras de 2 y las dos últimas de 3. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatTile className="sm:col-span-2" icon={Repeat} label="Intentos totales" value={stats.totalAttempts} />
        <StatTile
          className="sm:col-span-2"
          icon={Gauge}
          label="Tasa de finalización"
          value={stats.completionRate != null ? `${Math.round(stats.completionRate)}%` : "-"}
        />
        <StatTile
          className="sm:col-span-2"
          icon={Percent}
          label="Precisión media"
          value={stats.accuracyPercentage != null ? `${Math.round(stats.accuracyPercentage)}%` : "-"}
        />
        <StatTile
          className="sm:col-span-3"
          icon={Target}
          label="Puntuación media"
          value={stats.averageScore != null ? `${stats.averageScore.toFixed(1)}/10` : "-"}
        />
        <StatTile
          className="sm:col-span-3"
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
  const toast = useToast()
  const { editing } = useEditMode()
  const deleteQuiz = useDeleteQuiz()
  const [editingQuiz, setEditingQuiz] = useState(false)
  const [deletingQuiz, setDeletingQuiz] = useState(false)

  // Ficha: requiere sesión (GET /quiz/{id} no es público, aunque no exige rol admin)
  const { isAuthenticated, loading: authLoading } = useProtectedRoute()
  const { data: quiz, isLoading, error: quizError } = useQuiz(isAuthenticated ? quizId : null)

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

  // 404: borrado o todavía oculto (a los alumnos no se les distingue).
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

  const handleDelete = async () => {
    try {
      await deleteQuiz.mutateAsync(quizId)
      toast.success("Cuestionario eliminado.")
      router.push("/dashboard/quizzes")
    } catch {
      toast.error("No se pudo eliminar el cuestionario.")
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/quizzes")}
          className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Cuestionarios
        </button>
        <EditModeToggle />
      </div>

      <header className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-8 dark:from-purple-500/25 dark:via-fuchsia-500/10">
        <ListChecks className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rotate-12 text-purple-500/10" />
        {editing && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 backdrop-blur"
              onClick={() => setEditingQuiz(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar datos
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 backdrop-blur"
              onClick={() => router.push(`/dashboard/admin/quizzes/${quizId}`)}
            >
              <ListChecks className="h-4 w-4" />
              Editar preguntas
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 text-destructive backdrop-blur hover:text-destructive"
              onClick={() => setDeletingQuiz(true)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Eliminar cuestionario</span>
            </Button>
          </div>
        )}
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
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              className="cursor-pointer gap-2"
              onClick={() => router.push(`/dashboard/quizzes/${quizId}/attempt`)}
            >
              Empezar cuestionario
              <ArrowRight className="h-4 w-4" />
            </Button>
            <ShareQuizButton
              quizId={quizId}
              size="lg"
              className="bg-background/80 backdrop-blur"
              text={`Te reto a hacer el cuestionario "${quiz.name}" en MathTexpedia.`}
            />
          </div>
        </div>
      </header>

      {/* Dos columnas desde xl (el menú lateral ocupa sitio: antes no caben); apiladas por debajo. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <QuizStatsSection quizId={quizId} />
        <QuizLeaderboard quizId={quizId} />
      </div>

      <QuizFormDialog open={editingQuiz} onOpenChange={setEditingQuiz} quiz={quiz} />
      <ConfirmDialog
        open={deletingQuiz}
        onOpenChange={setDeletingQuiz}
        title={`¿Eliminar "${quiz.name}"?`}
        description="Esta acción no se puede deshacer y eliminará también sus preguntas y opciones."
        onConfirm={handleDelete}
      />
    </PageContainer>
  )
}
