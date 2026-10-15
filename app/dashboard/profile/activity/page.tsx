"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { useMyAttempts, useMyStats, usePublicQuizzes } from "@/hooks/api/use-quizzes"
import { formatDate } from "@/lib/utils"

function MyStatsSection() {
  const { data: stats, isLoading } = useMyStats()

  if (isLoading || !stats) return null

  const items = [
    { label: "Intentos totales", value: stats.totalAttempts ?? 0 },
    {
      label: "Tasa de finalización",
      value: stats.completionRate != null ? `${Math.round(stats.completionRate)}%` : "-",
    },
    {
      label: "Precisión media",
      value: stats.accuracyPercentage != null ? `${Math.round(stats.accuracyPercentage)}%` : "-",
    },
    {
      label: "Puntuación media",
      value: stats.averageScore != null ? `${stats.averageScore.toFixed(1)}/10` : "-",
    },
    {
      label: "Mejor puntuación",
      value: stats.bestScore != null ? `${stats.bestScore.toFixed(1)}/10` : "-",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis estadísticas</CardTitle>
        <CardDescription>Rendimiento agregado en todos tus cuestionarios.</CardDescription>
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

function AttemptsHistoryTab() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyAttempts(page, 10)
  const { data: quizzes } = usePublicQuizzes()

  const quizNameById = useMemo(() => {
    const map = new Map<number, string>()
    quizzes?.forEach((quiz) => {
      if (quiz.id != null && quiz.name) map.set(quiz.id, quiz.name)
    })
    return map
  }, [quizzes])

  const attempts = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis cuestionarios</CardTitle>
        <CardDescription>Histórico de intentos realizados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuestionario</TableHead>
                <TableHead>Intento</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead title="Puntuación ponderada por el número de intento; es la que cuenta para el ranking">
                  Ranking
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Cargando intentos...
                  </TableCell>
                </TableRow>
              ) : attempts.length > 0 ? (
                attempts.map((attempt) => (
                  // Toda la fila lleva al detalle (el enlace "Ver detalle" sigue ahí para teclado y lectores).
                  <TableRow
                    key={attempt.id}
                    className={attempt.quizId != null ? "cursor-pointer" : "hover:bg-transparent"}
                    onClick={() => attempt.quizId != null && router.push(`/dashboard/quizzes/${attempt.quizId}`)}
                  >
                    <TableCell className="font-medium">
                      {attempt.quizId != null
                        ? quizNameById.get(attempt.quizId) ?? `Cuestionario #${attempt.quizId}`
                        : "-"}
                    </TableCell>
                    <TableCell>{attempt.attemptNumber != null ? `#${attempt.attemptNumber}` : "-"}</TableCell>
                    <TableCell>{attempt.score != null ? `${attempt.score.toFixed(1)}/10` : "-"}</TableCell>
                    <TableCell className="font-medium">
                      {attempt.adjustedScore != null ? attempt.adjustedScore.toFixed(1) : "-"}
                    </TableCell>
                    <TableCell>{formatDate(attempt.submittedAt)}</TableCell>
                    <TableCell>
                      {attempt.quizId != null && (
                        <Link
                          href={`/dashboard/quizzes/${attempt.quizId}`}
                          className="text-sm text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Ver detalle
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Todavía no has hecho ningún cuestionario.
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

export default function ProfileActivityPage() {
  return (
    <>
      <MyStatsSection />
      <AttemptsHistoryTab />
    </>
  )
}
