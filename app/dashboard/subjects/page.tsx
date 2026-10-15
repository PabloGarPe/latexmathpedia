"use client"

import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { useSubjects } from "@/hooks/api/use-subjects"
import { getSubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

export default function SubjectsCatalogPage() {
  const { data: subjects, isLoading } = useSubjects()

  return (
    <PageContainer>
      <PageHeader
        title="Asignaturas"
        description="Elige una asignatura para ver sus temas, apuntes y cuestionarios."
      />

      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-muted rounded-xl h-44"></div>
          ))}
        </div>
      ) : subjects && subjects.length > 0 ? (
        <div className={GRID}>
          {subjects.map((subject) => {
            const theme = getSubjectTheme(subject.id)
            return (
              <Link key={subject.id} href={`/dashboard/subjects/${subject.id}`} className="group block h-full">
                <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className={cn("relative h-24 shrink-0 overflow-hidden bg-linear-to-br", theme.gradient)}>
                    <BookOpen className={cn("absolute -bottom-4 right-3 h-20 w-20 -rotate-12", theme.watermark)} />
                    <div
                      className={cn(
                        "absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl shadow-sm",
                        theme.tile,
                      )}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex grow flex-col gap-1.5 p-4">
                    <h3 className={cn("text-base font-semibold leading-snug transition-colors", theme.hoverText)}>
                      {subject.name}
                    </h3>
                    {subject.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{subject.description}</p>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-foreground/70 transition-all group-hover:gap-2 group-hover:text-foreground">
                      Ver asignatura
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay asignaturas disponibles todavía.</p>
      )}
    </PageContainer>
  )
}
