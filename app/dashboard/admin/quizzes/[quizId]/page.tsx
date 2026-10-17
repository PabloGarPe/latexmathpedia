"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { arrayMove } from "@dnd-kit/sortable"
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, FileJson, ListChecks, Pencil, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { QuestionCard } from "@/components/admin/quiz-editor/question-card"
import { QuestionComposer } from "@/components/admin/quiz-editor/question-composer"
import { CLAMPED_RICH_TEXT_CLASS, questionIssue, sortByPosition } from "@/components/admin/quiz-editor/constants"
import { SortableList } from "@/components/admin/quiz-editor/sortable"
import { ImportQuestionsSheet } from "@/components/admin/quiz-import/import-questions-sheet"
import { QuizFormDialog } from "@/components/admin/quiz-form-dialog"
import { PageContainer } from "@/components/page-shell"
import { RichText } from "@/components/rich-text"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { QuizStatusBadge, QuizVisibilityToggle, isQuizHidden } from "@/components/admin/quiz-visibility"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { useDeleteQuiz, useQuiz, useQuizQuestions } from "@/hooks/api/use-quizzes"
import { useQuestionsOptions, useReorderQuestions } from "@/hooks/api/use-questions"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useToast } from "@/hooks/use-toast"

function FullPageSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
    </div>
  )
}

export default function QuizEditorPage() {
  const params = useParams<{ quizId: string }>()
  const quizId = Number(params.quizId)
  const router = useRouter()
  const toast = useToast()

  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const enabled = isAuthenticated && isAdmin
  const { data: quiz, isLoading: quizLoading } = useQuiz(enabled ? quizId : null)
  const { data: questions, isLoading: questionsLoading } = useQuizQuestions(enabled ? quizId : null)
  const deleteQuiz = useDeleteQuiz()
  const reorderQuestions = useReorderQuestions()

  const sortedQuestions = useMemo(() => sortByPosition(questions ?? []), [questions])
  const questionIds = useMemo(
    () => sortedQuestions.flatMap((question) => (question.id != null ? [question.id] : [])),
    [sortedQuestions],
  )
  const { byQuestion, isLoading: optionsLoading } = useQuestionsOptions(questionIds)

  const [openIds, setOpenIds] = useState<number[]>([])
  const [editingQuiz, setEditingQuiz] = useState(false)
  const [deletingQuiz, setDeletingQuiz] = useState(false)
  const [importingQuestions, setImportingQuestions] = useState(false)
  // Primera pregunta recién importada: cuando la lista ya la pinta (tras el refetch) se lleva hasta ella.
  const [scrollToId, setScrollToId] = useState<number | null>(null)
  // Arrastrar una pregunta abierta es incómodo (es muy alta): al empezar se pliegan y al soltar se restauran.
  const openBeforeDrag = useRef<number[] | null>(null)

  useEffect(() => {
    if (scrollToId == null) return
    const element = document.getElementById(`question-${scrollToId}`)
    if (!element) return
    element.scrollIntoView({ behavior: "smooth", block: "start" })
    setScrollToId(null)
  }, [scrollToId, sortedQuestions])

  const noQuestions = !questionsLoading && sortedQuestions.length === 0
  const publishBlocked = noQuestions ? "Añade al menos una pregunta" : undefined

  if (authLoading) return <FullPageSpinner />
  if (!isAuthenticated || !isAdmin) return null
  if (quizLoading || !quiz) {
    return <p className="p-8 text-muted-foreground">Cargando cuestionario...</p>
  }

  const issues = sortedQuestions.flatMap((question, index) => {
    const issue = question.id != null ? questionIssue(byQuestion.get(question.id)) : null
    return issue ? [{ question, number: index + 1, issue }] : []
  })
  const checked = !questionsLoading && !optionsLoading
  const readyCount = sortedQuestions.length - issues.length
  const nextPosition = sortedQuestions.reduce((max, question) => Math.max(max, question.position ?? 0), 0) + 1

  const focusQuestion = (id: number) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    requestAnimationFrame(() =>
      document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    )
  }

  const handleReorder = (activeId: string, overId: string) => {
    const from = sortedQuestions.findIndex((question) => String(question.id) === activeId)
    const to = sortedQuestions.findIndex((question) => String(question.id) === overId)
    if (from < 0 || to < 0) return
    reorderQuestions.mutate(
      { quizId, questions: arrayMove(sortedQuestions, from, to) },
      { onError: () => toast.error("No se pudo guardar el nuevo orden de las preguntas.") },
    )
  }

  const handleDeleteQuiz = async () => {
    try {
      await deleteQuiz.mutateAsync(quizId)
      toast.success("Cuestionario eliminado.")
      router.push("/dashboard/admin/quizzes")
    } catch {
      toast.error("No se pudo eliminar el cuestionario.")
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/admin/quizzes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Cuestionarios
        </Link>
        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
          <Link href={`/dashboard/quizzes/${quizId}`}>
            <Eye className="h-4 w-4" />
            Ver como alumno
          </Link>
        </Button>
      </div>

      <header className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-8 dark:from-purple-500/25 dark:via-fuchsia-500/10">
        <ListChecks className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rotate-12 text-purple-500/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <QuizStatusBadge quiz={quiz} />
              <QuizDifficultyBadge difficulty={quiz.difficulty} />
              {quiz.subject?.name && (
                <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs">{quiz.subject.name}</span>
              )}
              {quiz.subjectUnit?.name && (
                <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {quiz.subjectUnit.name}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{quiz.name}</h1>
            {quiz.description && <p className="max-w-prose text-muted-foreground">{quiz.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!isQuizHidden(quiz) && <QuizVisibilityToggle quiz={quiz} variant="button" />}
            <Button variant="outline" size="sm" className="cursor-pointer bg-background/80 backdrop-blur" onClick={() => setEditingQuiz(true)}>
              <Pencil className="h-4 w-4" />
              Editar datos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer bg-background/80 text-destructive backdrop-blur hover:text-destructive"
              onClick={() => setDeletingQuiz(true)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Eliminar cuestionario</span>
            </Button>
          </div>
        </div>
      </header>

      {isQuizHidden(quiz) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5 text-sm">
              <p className="font-medium">Este cuestionario está oculto</p>
              <p className="text-muted-foreground">
                Los alumnos no lo ven ni pueden hacerlo.{" "}
                {noQuestions
                  ? "Añade al menos una pregunta para poder publicarlo."
                  : quiz.publishedAt == null
                    ? "Al publicarlo se avisará a todos los usuarios."
                    : "Al volver a publicarlo no se enviará un nuevo aviso."}
              </p>
            </div>
          </div>
          <QuizVisibilityToggle quiz={quiz} variant="button" disabledReason={publishBlocked} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold">Preguntas</h2>
              <p className="text-xs text-muted-foreground">Arrastra el asa para reordenarlas</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={questionsLoading}
              onClick={() => setImportingQuestions(true)}
            >
              <FileJson className="h-4 w-4" />
              Importar preguntas (JSON)
            </Button>
          </div>

          {questionsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            sortedQuestions.length > 0 && (
              <SortableList
                ids={questionIds}
                onDragStart={() => {
                  openBeforeDrag.current = openIds
                  setOpenIds([])
                }}
                onDragFinish={() => {
                  if (openBeforeDrag.current) setOpenIds(openBeforeDrag.current)
                  openBeforeDrag.current = null
                }}
                onReorder={handleReorder}
              >
                <div className="space-y-3">
                  {sortedQuestions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      quizId={quizId}
                      question={question}
                      index={index + 1}
                      options={question.id != null ? byQuestion.get(question.id) : undefined}
                      open={question.id != null && openIds.includes(question.id)}
                      onOpenChange={(open) =>
                        setOpenIds((prev) =>
                          open ? [...prev, question.id as number] : prev.filter((id) => id !== question.id),
                        )
                      }
                    />
                  ))}
                </div>
              </SortableList>
            )
          )}

          {noQuestions && (
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes las preguntas en JSON?{" "}
              <button
                type="button"
                onClick={() => setImportingQuestions(true)}
                className="cursor-pointer font-medium text-foreground underline underline-offset-2 hover:text-purple-600 dark:hover:text-purple-300"
              >
                Impórtalas
              </button>
            </p>
          )}

          {!questionsLoading && (
            <QuestionComposer
              // Se remonta al cambiar de cuestionario; abierto de entrada si aún no hay preguntas.
              key={quizId}
              quizId={quizId}
              nextPosition={nextPosition}
              defaultOpen={sortedQuestions.length === 0}
            />
          )}
        </section>

        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Revisión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Añade al menos una pregunta para que el cuestionario se pueda hacer.
              </p>
            ) : !checked ? (
              <p className="text-sm text-muted-foreground">Comprobando las preguntas...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {issues.length === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                      {issues.length === 0 ? "Todo listo" : "Hay preguntas por completar"}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {readyCount}/{sortedQuestions.length}
                    </span>
                  </div>
                  <Progress
                    value={(readyCount / sortedQuestions.length) * 100}
                    className="h-1.5 bg-purple-500/20 [&>div]:bg-purple-500"
                  />
                </div>

                {issues.length > 0 && (
                  <ul className="space-y-1.5">
                    {issues.map(({ question, number, issue }) => (
                      <li key={question.id}>
                        <button
                          type="button"
                          onClick={() => focusQuestion(question.id as number)}
                          className="flex w-full cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                        >
                          <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-amber-500/15 px-1 text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
                            {number}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-1 overflow-hidden font-medium">
                              <RichText
                                variant="compact"
                                interactive={false}
                                content={question.text ?? ""}
                                className={CLAMPED_RICH_TEXT_CLASS}
                              />
                            </span>
                            <span className="text-xs text-muted-foreground">{issue}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <QuizFormDialog open={editingQuiz} onOpenChange={setEditingQuiz} quiz={quiz} />

      <ImportQuestionsSheet
        open={importingQuestions}
        onOpenChange={setImportingQuestions}
        quizId={quizId}
        existingCount={sortedQuestions.length}
        published={!isQuizHidden(quiz)}
        onImported={(created) => {
          const first = created.find((question) => question.id != null)
          if (first?.id != null) setScrollToId(first.id)
        }}
      />

      <ConfirmDialog
        open={deletingQuiz}
        onOpenChange={setDeletingQuiz}
        title={`¿Eliminar "${quiz.name}"?`}
        description="Esta acción no se puede deshacer y eliminará también sus preguntas y opciones."
        onConfirm={handleDeleteQuiz}
      />
    </PageContainer>
  )
}
