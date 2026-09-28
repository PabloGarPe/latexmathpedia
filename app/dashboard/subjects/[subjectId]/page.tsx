"use client"

import { useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import ContentCard from "@/components/content-card"
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
import { toDisplayPdf } from "@/lib/content/types"
import type { QuizDto } from "@/lib/api/quizzes"

// Clave usada para agrupar el contenido que no cuelga de ningún tema (subjectUnitId/
// subjectUnit null): se muestra en la sección "General", fuera del acordeón de temas.
const GENERAL_KEY = "general"

export default function SubjectDetailPage() {
  const params = useParams<{ subjectId: string }>()
  const subjectId = Number(params.subjectId)
  const searchParams = useSearchParams()
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
  const quizzes: QuizDto[] = rawQuizzes ?? []

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

  // Si se llega desde el clic en un tema de la sidebar (?unit=X), ese panel arranca abierto.
  const defaultOpenUnits = requestedUnit ? [requestedUnit] : []

  const contentLoading = pdfsLoading || (isAuthenticated && quizzesLoading)
  const isLoading = subjectLoading || unitsLoading

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Cargando asignatura...</p>
  }

  if (!subject) {
    return <p className="p-8 text-muted-foreground">No se encontró la asignatura.</p>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
        {subject.description && (
          <p className="mt-2 text-muted-foreground">{subject.description}</p>
        )}
      </header>

      {hasGeneralContent && (
        <section>
          <h2 className="text-xl font-semibold mb-3">General</h2>
          <div className="flex flex-col gap-3">
            {generalPdfs.map((pdf) => (
              <ContentCard key={`pdf-${pdf.id}`} item={{ kind: "pdf", data: pdf }} />
            ))}
            {generalQuizzes.map((quiz) => (
              <ContentCard key={`quiz-${quiz.id}`} item={{ kind: "quiz", data: quiz }} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Temas</h2>
        {units && units.length > 0 ? (
          <Accordion type="multiple" defaultValue={defaultOpenUnits}>
            {units.map((unit) => {
              const key = unit.id != null ? String(unit.id) : ""
              const unitPdfs = pdfsByUnit.get(key) ?? []
              const unitQuizzes = quizzesByUnit.get(key) ?? []
              const hasItems = unitPdfs.length > 0 || unitQuizzes.length > 0

              return (
                <AccordionItem key={unit.id} value={key}>
                  <AccordionTrigger>{unit.name}</AccordionTrigger>
                  <AccordionContent>
                    {contentLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando contenido...</p>
                    ) : hasItems ? (
                      <div className="flex flex-col gap-3">
                        {unitPdfs.map((pdf) => (
                          <ContentCard key={`pdf-${pdf.id}`} item={{ kind: "pdf", data: pdf }} />
                        ))}
                        {unitQuizzes.map((quiz) => (
                          <ContentCard key={`quiz-${quiz.id}`} item={{ kind: "quiz", data: quiz }} />
                        ))}
                      </div>
                    ) : (
                      // Puede tener contenido que el usuario anónimo no ve (cuestionarios),
                      // así que el tema se muestra igual en vez de ocultarse.
                      <p className="text-sm text-muted-foreground">No hay contenido disponible.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <p className="text-muted-foreground">Esta asignatura todavía no tiene temas.</p>
        )}
      </section>
    </div>
  )
}
