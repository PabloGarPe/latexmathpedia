"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, BookOpen, FileText, Layers, ListChecks } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import ContentCard from "@/components/content-card"
import { PageContainer } from "@/components/page-shell"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useAuth } from "@/contexts/auth-context"
import {
  useSubject,
  useSubjectPdfs,
  useSubjectQuizzes,
  useSubjectUnits,
} from "@/hooks/api/use-subjects"
import { toDisplayPdf, type DisplayPdf } from "@/lib/content/types"
import type { QuizDto } from "@/lib/api/quizzes"
import { getSubjectTheme, type SubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

// Clave usada para agrupar el contenido que no cuelga de ningún tema (subjectUnitId/
// subjectUnit null): se muestra en la sección "General", como primer elemento del panel.
const GENERAL_KEY = "general"

function Counter({
  icon: Icon,
  count,
  singular,
  plural,
  className,
}: {
  icon: LucideIcon
  count: number
  singular: string
  plural: string
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{count}</span>
      <span>{count === 1 ? singular : plural}</span>
    </span>
  )
}

function UnitItem({
  value,
  title,
  index,
  pdfs,
  quizzes,
  loading,
  theme,
  general = false,
}: {
  value: string
  title: string
  index?: number
  pdfs: DisplayPdf[]
  quizzes: QuizDto[]
  loading: boolean
  theme: SubjectTheme
  general?: boolean
}) {
  const hasItems = pdfs.length > 0 || quizzes.length > 0

  return (
    <AccordionItem
      value={value}
      className={cn(
        "relative border-b transition-colors last:border-b-0 data-[state=open]:bg-muted/40",
        // Barra de color a la izquierda del tema abierto.
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-transparent before:transition-colors",
        theme.bar,
      )}
    >
      <AccordionTrigger className="cursor-pointer items-center rounded-none px-5 py-4 text-base font-semibold hover:bg-muted/60 hover:no-underline focus-visible:ring-inset [&>svg]:transition-colors hover:[&>svg]:text-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-4">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
              theme.chip,
            )}
          >
            {general ? <Layers className="h-4 w-4" /> : String(index ?? 0).padStart(2, "0")}
          </span>
          <span className="min-w-0 truncate">{title}</span>
        </span>
        {!loading && hasItems && (
          <span className="mr-1 hidden shrink-0 items-center gap-4 font-normal text-muted-foreground sm:flex">
            {pdfs.length > 0 && (
              <Counter icon={FileText} count={pdfs.length} singular="PDF" plural="PDFs" />
            )}
            {quizzes.length > 0 && (
              <Counter
                icon={ListChecks}
                count={quizzes.length}
                singular="cuestionario"
                plural="cuestionarios"
              />
            )}
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5 pt-1 sm:pl-18">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando contenido...</p>
        ) : hasItems ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pdfs.map((pdf) => (
              <ContentCard key={`pdf-${pdf.id}`} item={{ kind: "pdf", data: pdf }} />
            ))}
            {quizzes.map((quiz) => (
              <ContentCard key={`quiz-${quiz.id}`} item={{ kind: "quiz", data: quiz }} />
            ))}
          </div>
        ) : (
          // Puede tener contenido que el usuario anónimo no ve (cuestionarios), así que el
          // tema se muestra igual en vez de ocultarse.
          <p className="text-sm text-muted-foreground">No hay contenido disponible.</p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

export default function SubjectDetailPage() {
  const params = useParams<{ subjectId: string }>()
  const subjectId = Number(params.subjectId)
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestedUnit = searchParams.get("unit")

  const { isAuthenticated } = useAuth()

  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId)
  const { data: units, isLoading: unitsLoading } = useSubjectUnits(subjectId)
  // Pública, sin gating por auth (trae todos los PDFs de la asignatura de una vez).
  const { data: rawPdfs, isLoading: pdfsLoading } = useSubjectPdfs(subjectId)
  // Requiere sesión: si no hay usuario autenticado, ni se pide (enabled=false) ni se
  // muestra la subsección de cuestionarios -- anónimo solo ve PDFs, igual que en el resto
  // de la app. En modo mock sin JWT real puede devolver 401 aunque isAuthenticated sea
  // true; es un límite ya conocido, no se "arregla" aquí.
  const { data: rawQuizzes, isLoading: quizzesLoading } = useSubjectQuizzes(
    subjectId,
    isAuthenticated,
  )

  const pdfs = useMemo(
    () => (rawPdfs ?? []).map((pdf, index) => toDisplayPdf(pdf, index)),
    [rawPdfs],
  )
  const quizzes: QuizDto[] = useMemo(() => rawQuizzes ?? [], [rawQuizzes])

  const pdfsByUnit = useMemo(() => {
    const map = new Map<string, typeof pdfs>()
    for (const pdf of pdfs) {
      const key = pdf.subjectUnitId != null ? String(pdf.subjectUnitId) : GENERAL_KEY
      map.set(key, [...(map.get(key) ?? []), pdf])
    }
    return map
  }, [pdfs])

  const quizzesByUnit = useMemo(() => {
    const map = new Map<string, QuizDto[]>()
    for (const quiz of quizzes) {
      const key = quiz.subjectUnit?.id != null ? String(quiz.subjectUnit.id) : GENERAL_KEY
      map.set(key, [...(map.get(key) ?? []), quiz])
    }
    return map
  }, [quizzes])

  const generalPdfs = pdfsByUnit.get(GENERAL_KEY) ?? []
  const generalQuizzes = quizzesByUnit.get(GENERAL_KEY) ?? []
  const hasGeneralContent = generalPdfs.length > 0 || generalQuizzes.length > 0

  // Temas abiertos. Si se llega desde el clic en un tema de la sidebar (?unit=X) ese panel
  // arranca abierto, y si ya se está en la ficha y se pulsa otro tema en la sidebar, se abre
  // también (el acordeón no se remonta al cambiar solo el query param).
  const [openUnits, setOpenUnits] = useState<string[]>(requestedUnit ? [requestedUnit] : [])
  useEffect(() => {
    if (requestedUnit) {
      setOpenUnits((prev) => (prev.includes(requestedUnit) ? prev : [...prev, requestedUnit]))
    }
  }, [requestedUnit])

  const contentLoading = pdfsLoading || (isAuthenticated && quizzesLoading)
  const isLoading = subjectLoading || unitsLoading

  if (isLoading) {
    return (
      <PageContainer className="space-y-6">
        <div className="animate-pulse h-44 rounded-2xl bg-muted" />
        <div className="animate-pulse h-72 rounded-2xl bg-muted" />
      </PageContainer>
    )
  }

  if (!subject) {
    return <p className="p-8 text-muted-foreground">No se encontró la asignatura.</p>
  }

  const theme = getSubjectTheme(subject.id)
  const unitCount = units?.length ?? 0

  return (
    <PageContainer className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard/subjects")}
        className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Asignaturas
      </button>

      <header
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-linear-to-br p-6 sm:p-8",
          theme.gradient,
        )}
      >
        <BookOpen className={cn("pointer-events-none absolute -right-4 -top-4 h-44 w-44 rotate-12", theme.watermark)} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm",
              theme.tile,
            )}
          >
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
            {subject.description && (
              <p className="max-w-prose text-muted-foreground">{subject.description}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-xs">
                <Layers className="h-3 w-3" />
                {unitCount} {unitCount === 1 ? "tema" : "temas"}
              </span>
              {!contentLoading && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-xs">
                    <FileText className="h-3 w-3" />
                    {pdfs.length} {pdfs.length === 1 ? "PDF" : "PDFs"}
                  </span>
                  {isAuthenticated && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-xs">
                      <ListChecks className="h-3 w-3" />
                      {quizzes.length} {quizzes.length === 1 ? "cuestionario" : "cuestionarios"}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Temas</h2>
        {unitCount > 0 || hasGeneralContent ? (
          // Los temas forman un único panel: filas separadas por líneas finas, la abierta se
          // tiñe y lleva una barra de color, y su contenido cuelga debajo en el mismo fondo.
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <Accordion type="multiple" value={openUnits} onValueChange={setOpenUnits}>
              {hasGeneralContent && (
                <UnitItem
                  value={GENERAL_KEY}
                  title="General"
                  general
                  pdfs={generalPdfs}
                  quizzes={generalQuizzes}
                  loading={contentLoading}
                  theme={theme}
                />
              )}
              {units?.map((unit, index) => {
                const key = unit.id != null ? String(unit.id) : ""
                return (
                  <UnitItem
                    key={unit.id}
                    value={key}
                    title={unit.name ?? ""}
                    index={index + 1}
                    pdfs={pdfsByUnit.get(key) ?? []}
                    quizzes={quizzesByUnit.get(key) ?? []}
                    loading={contentLoading}
                    theme={theme}
                  />
                )
              })}
            </Accordion>
          </div>
        ) : (
          <p className="text-muted-foreground">Esta asignatura todavía no tiene temas.</p>
        )}
      </section>
    </PageContainer>
  )
}
