"use client"

import { useState } from "react"
import { CircleHelp, Crown, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuizLeaderboard } from "@/hooks/api/use-quizzes"
import type { LeaderboardEntryDto } from "@/lib/api/quizzes"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

// Estilo por puesto del podio: altura del escalón y colores de medalla.
const PODIUM_STYLE: Record<
  1 | 2 | 3,
  { height: string; step: string; medal: string; ring: string }
> = {
  1: {
    height: "h-28",
    step: "from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600",
    medal: "bg-amber-400 text-amber-950",
    ring: "ring-amber-400",
  },
  2: {
    height: "h-20",
    step: "from-zinc-200 to-zinc-400 dark:from-zinc-400 dark:to-zinc-600",
    medal: "bg-zinc-300 text-zinc-800",
    ring: "ring-zinc-300",
  },
  3: {
    height: "h-14",
    step: "from-orange-300 to-orange-500 dark:from-orange-400 dark:to-orange-700",
    medal: "bg-orange-400 text-orange-950",
    ring: "ring-orange-400",
  },
}

function formatScore(score?: number) {
  return score != null ? score.toFixed(1) : "-"
}

function PodiumPlace({ entry, place }: { entry: LeaderboardEntryDto; place: 1 | 2 | 3 }) {
  const style = PODIUM_STYLE[place]
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {place === 1 && (
        <Crown
          className="mb-1 h-7 w-7 animate-bounce fill-amber-400 text-amber-500 [animation-duration:2.5s]"
          aria-label="Primer puesto"
        />
      )}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ring-4",
          style.medal,
          style.ring,
          place === 1 && "h-14 w-14 text-xl",
        )}
      >
        {(entry.username ?? "?").charAt(0).toUpperCase()}
      </div>
      <p className="mt-2 w-full truncate text-center text-sm font-semibold" title={entry.username}>
        {entry.username}
      </p>
      <p className="text-xs text-muted-foreground">{formatScore(entry.bestAdjustedScore)} / 10</p>
      <div
        className={cn(
          "mt-2 flex w-full items-start justify-center rounded-t-lg bg-linear-to-b pt-2 text-2xl font-extrabold text-black/60 shadow-inner",
          style.height,
          style.step,
        )}
      >
        {place}
      </div>
    </div>
  )
}

function Podium({ entries }: { entries: LeaderboardEntryDto[] }) {
  // Orden visual clásico: 2º · 1º · 3º. Si hay menos de 3, los huecos no se pintan.
  const [first, second, third] = entries
  return (
    <div className="mx-auto flex max-w-md items-end gap-2 sm:gap-4">
      {second ? <PodiumPlace entry={second} place={2} /> : <div className="flex-1" />}
      {first && <PodiumPlace entry={first} place={1} />}
      {third ? <PodiumPlace entry={third} place={3} /> : <div className="flex-1" />}
    </div>
  )
}

export function QuizLeaderboard({ quizId }: { quizId: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuizLeaderboard(quizId, page, PAGE_SIZE)

  const entries = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  // El podio solo en la primera página; en las demás, lista simple.
  const podium = page === 0 ? entries.slice(0, 3) : []
  const rest = page === 0 ? entries.slice(3) : entries

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Tabla de líderes
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Cómo se calcula la puntuación"
                className="cursor-help rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-balance">
              Cuenta tu mejor puntuación ponderada por el número de intento: cuantos más intentos
              necesites, menos puntúa el resultado. Por eso un 10 en un reintento puede aparecer
              aquí con menos de 10.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando tabla de líderes...</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay intentos registrados. ¡Sé el primero!
          </p>
        ) : (
          <>
            {podium.length > 0 && <Podium entries={podium} />}

            {rest.length > 0 && (
              <ol className="divide-y overflow-hidden rounded-lg border">
                {rest.map((entry) => (
                  <li
                    key={entry.userId}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="w-7 text-center font-semibold tabular-nums text-muted-foreground">
                      {entry.rank}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {(entry.username ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{entry.username}</span>
                    <span className="font-semibold tabular-nums">{formatScore(entry.bestAdjustedScore)}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

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
