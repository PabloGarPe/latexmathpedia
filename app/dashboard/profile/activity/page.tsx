"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Gauge,
  History,
  ListChecks,
  Medal,
  Percent,
  Repeat,
  Target,
  Trophy,
} from "lucide-react"
import { PageNav } from "@/components/page-nav"
import { StatTile } from "@/components/quizzes/stat-tile"
import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { useAllQuizzes, useMyAttempts, useMyStats, usePublicQuizzes } from "@/hooks/api/use-quizzes"
import type { QuizAttemptDto, QuizAttemptStatsDto, QuizDto } from "@/lib/api/quizzes"
import { formatScore, SCORE_TONE_BADGE, scoreTone } from "@/lib/quiz-score"
import { cn, formatRelativeTime } from "@/lib/utils"

const PAGE_SIZE = 10

const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }) : undefined

function MyStatsSection({ stats }: { stats: QuizAttemptStatsDto }) {
  // averageScore/bestScore van sobre 10; completionRate/accuracyPercentage ya son porcentajes.
  const percent = (value?: number) => (value != null ? `${Math.round(value)}%` : "-")
  return (
    <SettingsSection
      title="Tus estadísticas"
      icon={BarChart3}
      description="Tu rendimiento en todos los cuestionarios que has hecho."
    >
      {/* 3 + 2 en pantallas anchas: 6 columnas, las tres primeras de 2 y las dos últimas de 3. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatTile className="sm:col-span-2" icon={Repeat} label="Intentos" value={stats.totalAttempts ?? 0} />
        <StatTile
          className="sm:col-span-2"
          icon={Gauge}
          label="Finalización"
          value={percent(stats.completionRate)}
          hint="Intentos sin preguntas en blanco"
        />
        <StatTile
          className="sm:col-span-2"
          icon={Percent}
          label="Precisión"
          value={percent(stats.accuracyPercentage)}
          hint="Aciertos sobre lo respondido"
        />
        <StatTile
          className="sm:col-span-3"
          icon={Target}
          label="Nota media"
          value={`${formatScore(stats.averageScore)}/10`}
        />
        <StatTile
          className="col-span-2 sm:col-span-3"
          icon={Medal}
          label="Mejor nota"
          value={`${formatScore(stats.bestScore)}/10`}
        />
      </div>
    </SettingsSection>
  )
}

// La nota del intento sobre 10, coloreada con los mismos umbrales que el resultado del cuestionario.
function ScoreBadge({ score }: { score?: number }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg",
        score != null ? SCORE_TONE_BADGE[scoreTone(score * 10)] : "bg-muted text-muted-foreground",
      )}
      aria-label={score != null ? `Nota ${formatScore(score)} sobre 10` : "Sin nota"}
    >
      <span className="text-base font-bold leading-none tabular-nums">{formatScore(score)}</span>
      <span className="text-[10px] leading-tight opacity-70">/10</span>
    </div>
  )
}

function AttemptRow({
  attempt,
  quiz,
  quizzesLoading,
}: {
  attempt: QuizAttemptDto
  quiz?: QuizDto
  quizzesLoading: boolean
}) {
  // Sin ficha en el catálogo (oculto después de hacerlo, o el catálogo falló) no se enlaza: el
  // alumno vería un 404.
  const href = quiz?.id != null ? `/dashboard/quizzes/${quiz.id}` : undefined
  const content = (
    <>
      <ScoreBadge score={attempt.score} />
      <div className="min-w-0 flex-1 space-y-1">
        {quizzesLoading ? (
          <Skeleton className="h-4 w-48 max-w-full" />
        ) : (
          <p className={cn("truncate font-medium", !quiz && "text-muted-foreground")}>
            {quiz?.name ?? "Cuestionario no disponible"}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {quiz?.subject?.name && (
            <span className="max-w-full truncate rounded-full bg-purple-100 px-2 py-0.5 text-purple-800 dark:bg-purple-900/60 dark:text-purple-100">
              {quiz.subject.name}
            </span>
          )}
          <QuizDifficultyBadge difficulty={quiz?.difficulty} />
          {attempt.attemptNumber != null && <span>Intento {attempt.attemptNumber}</span>}
          {attempt.submittedAt && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={attempt.submittedAt} title={formatDateTime(attempt.submittedAt)}>
                {formatRelativeTime(attempt.submittedAt)}
              </time>
            </>
          )}
        </div>
      </div>
      {attempt.adjustedScore != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span className="sr-only">Puntuación para el ranking:</span>
              {formatScore(attempt.adjustedScore)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-balance">
            Puntuación para la tabla de líderes: la nota ponderada por el número de intento.
          </TooltipContent>
        </Tooltip>
      )}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  )

  const rowClass = "flex items-center gap-3 px-3 py-3 sm:px-4"
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(rowClass, "transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none")}>
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  )
}

function AttemptsHistory() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, isPlaceholderData, refetch } = useMyAttempts(page, PAGE_SIZE)

  // Los intentos solo traen quizId: nombre, asignatura y dificultad salen del catálogo. El admin
  // usa el completo para resolver también los cuestionarios ocultos.
  const publicQuizzes = usePublicQuizzes(!isAdmin)
  const allQuizzes = useAllQuizzes(isAdmin)
  const quizzes = isAdmin ? allQuizzes : publicQuizzes
  const quizById = useMemo(
    () => new Map((quizzes.data ?? []).filter((quiz) => quiz.id != null).map((quiz) => [quiz.id!, quiz])),
    [quizzes.data],
  )

  const attempts = data?.content ?? []
  const total = data?.totalElements ?? 0

  return (
    <SettingsSection
      title="Historial de intentos"
      icon={History}
      description={
        total > 0
          ? `${total} ${total === 1 ? "intento" : "intentos"}, del más reciente al más antiguo.`
          : "Cada cuestionario que envías, del más reciente al más antiguo."
      }
      actions={
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/dashboard/quizzes">
            <span className="hidden sm:inline">Más cuestionarios</span>
            <span className="sm:hidden">Más</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <ul className="divide-y overflow-hidden rounded-lg border" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar tu historial.</p>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : attempts.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Todavía no has enviado ningún cuestionario.
          </p>
        ) : (
          <ul
            className={cn(
              "divide-y overflow-hidden rounded-lg border transition-opacity",
              isPlaceholderData && "opacity-60",
            )}
          >
            {attempts.map((attempt) => (
              <AttemptRow
                key={attempt.id}
                attempt={attempt}
                quiz={attempt.quizId != null ? quizById.get(attempt.quizId) : undefined}
                quizzesLoading={quizzes.isLoading}
              />
            ))}
          </ul>
        )}

        <PageNav page={page} totalPages={data?.totalPages ?? 0} onPageChange={setPage} />
      </div>
    </SettingsSection>
  )
}

function EmptyActivity() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
          <ListChecks className="h-6 w-6 text-purple-600 dark:text-purple-300" />
        </div>
        <p className="font-semibold">Aún no has hecho ningún cuestionario</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cuando envíes uno, aquí verás tus notas y el historial de todos tus intentos.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard/quizzes">
            Explorar cuestionarios
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ProfileActivityPage() {
  const { data: stats, isLoading } = useMyStats()

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

  // Sin intentos (con 0 el back devuelve el resto de cifras a 0) no hay nada que enseñar.
  if (stats && !stats.totalAttempts) return <EmptyActivity />

  // Si fallan las estadísticas, el historial se pinta igualmente.
  return (
    <>
      {stats && <MyStatsSection stats={stats} />}
      <AttemptsHistory />
    </>
  )
}
