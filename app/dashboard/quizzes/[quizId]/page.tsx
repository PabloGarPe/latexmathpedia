"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useQuiz, useQuizLeaderboard, useQuizStats } from "@/hooks/api/use-quizzes"

function QuizStatsSection({ quizId }: { quizId: number }) {
  const { data: stats, isLoading } = useQuizStats(quizId)

  if (isLoading || !stats) return null

  const items = [
    { label: "Intentos totales", value: stats.totalAttempts ?? 0 },
    {
      label: "Tasa de finalización",
      value: stats.completionRate != null ? `${Math.round(stats.completionRate * 100)}%` : "-",
    },
    {
      label: "Precisión media",
      value: stats.accuracyPercentage != null ? `${Math.round(stats.accuracyPercentage * 100)}%` : "-",
    },
    {
      label: "Puntuación media",
      value: stats.averageScore != null ? stats.averageScore.toFixed(1) : "-",
    },
    {
      label: "Mejor puntuación",
      value: stats.bestScore != null ? stats.bestScore.toFixed(1) : "-",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus estadísticas</CardTitle>
        <CardDescription>Tu rendimiento en este cuestionario.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function QuizLeaderboardSection({ quizId }: { quizId: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuizLeaderboard(quizId, page, 10)

  const entries = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tabla de líderes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Puntuación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Cargando tabla de líderes...
                  </TableCell>
                </TableRow>
              ) : entries.length > 0 ? (
                entries.map((entry) => (
                  <TableRow key={entry.userId}>
                    <TableCell>{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.username}</TableCell>
                    <TableCell>{entry.bestAdjustedScore?.toFixed(1)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Todavía no hay intentos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.max(0, p - 1))
                  }}
                  className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={i === page}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage(i)
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }}
                  className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
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
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-2xl">{quiz.name}</CardTitle>
            {quiz.description && (
              <CardDescription className="mt-2">{quiz.description}</CardDescription>
            )}
          </div>
          <QuizDifficultyBadge difficulty={quiz.difficulty} />
        </CardHeader>
        {(quiz.subject?.name || quiz.subjectUnit?.name) && (
          <CardContent className="flex flex-wrap gap-2">
            {quiz.subject?.name && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {quiz.subject.name}
              </span>
            )}
            {quiz.subjectUnit?.name && (
              <span className="text-xs bg-secondary/10 text-primary px-2 py-0.5 rounded-full">
                {quiz.subjectUnit.name}
              </span>
            )}
          </CardContent>
        )}
        <CardFooter>
          <Button
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/quizzes/${quizId}/attempt`)}
          >
            Empezar cuestionario
          </Button>
        </CardFooter>
      </Card>

      <QuizStatsSection quizId={quizId} />
      <QuizLeaderboardSection quizId={quizId} />
    </div>
  )
}
