"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

// Páginas visibles (base 0): la primera, la última y una a cada lado de la actual; el resto se
// colapsa en "…". Con pocas páginas salen todas.
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([0, totalPages - 1])
  for (let i = page - 1; i <= page + 1; i++) if (i >= 0 && i < totalPages) pages.add(i)
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | "gap")[] = []
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1]
    if (previous != null && value - previous === 2) result.push(previous + 1)
    else if (previous != null && value - previous > 2) result.push("gap")
    result.push(value)
  })
  return result
}

// Paginación de listas paginadas por el back (`page` en base 0, como Spring). No pinta nada con
// una sola página.
export function PageNav({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null

  const go = (target: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    if (target >= 0 && target < totalPages && target !== page) onPageChange(target)
  }
  const disabled = "pointer-events-none opacity-50"

  return (
    <Pagination aria-label="Paginación" className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            aria-label="Página anterior"
            aria-disabled={page === 0}
            onClick={go(page - 1)}
            className={cn("gap-1 px-2.5", page === 0 ? disabled : "cursor-pointer")}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:block">Anterior</span>
          </PaginationLink>
        </PaginationItem>
        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === page}
                aria-label={`Página ${item + 1}`}
                onClick={go(item)}
                className="cursor-pointer tabular-nums"
              >
                {item + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            aria-label="Página siguiente"
            aria-disabled={page >= totalPages - 1}
            onClick={go(page + 1)}
            className={cn("gap-1 px-2.5", page >= totalPages - 1 ? disabled : "cursor-pointer")}
          >
            <span className="hidden sm:block">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
