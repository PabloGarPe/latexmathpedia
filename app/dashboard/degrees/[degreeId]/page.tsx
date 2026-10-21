"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, CalendarRange, GraduationCap, Layers, Pencil, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DegreeFormDialog, DELETE_DEGREE_DESCRIPTION, useDeleteDegreeAction } from "@/components/admin/degree-form-dialog"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { ContentUnavailable } from "@/components/content-unavailable"
import { PageContainer } from "@/components/page-shell"
import { CourseSubscribeButton } from "@/components/subscriptions/course-subscribe-button"
import { SubscribeButton } from "@/components/subscriptions/subscribe-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useCurriculum } from "@/hooks/api/use-degrees"
import { useMe } from "@/hooks/api/use-profile"
import { ApiError } from "@/lib/api/errors"
import { formatSemesterLong, formatSemesterShort, formatYearLong, type Semester } from "@/lib/degrees"
import { getSubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

// Filtro de cuatrimestre del plan. Se aplica en cliente sobre lo ya cargado.
const ALL_SEMESTERS = "all"

// Bloques de cada curso, en orden. Cada uno lleva su color para distinguirlos de un vistazo
// (las clases van enteras para que Tailwind las detecte).
const SEMESTER_GROUPS: { semester: Semester; band: string; chip: string; bar: string }[] = [
  {
    semester: 1,
    band: "bg-sky-500/[0.07] dark:bg-sky-500/10",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  {
    semester: 2,
    band: "bg-amber-500/[0.07] dark:bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  {
    semester: null,
    band: "bg-violet-500/[0.07] dark:bg-violet-500/10",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
  },
]

export default function DegreeCurriculumPage() {
  const params = useParams<{ degreeId: string }>()
  const degreeId = Number(params.degreeId)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { editing } = useEditMode()
  const { data: me } = useMe(isAuthenticated)
  // Sin filtros: todos los años 1..years, también los vacíos. El cuatrimestre se filtra aquí.
  const { data: curriculum, isLoading, error } = useCurriculum(Number.isInteger(degreeId) ? degreeId : null)
  const deleteDegree = useDeleteDegreeAction()

  const [semesterFilter, setSemesterFilter] = useState(ALL_SEMESTERS)
  const [editingDegree, setEditingDegree] = useState(false)
  const [deletingDegree, setDeletingDegree] = useState(false)

  // Los anclajes `#year-N` (curriculumHref) apuntan a secciones que no existen hasta que llegan
  // los datos, así que el navegador no puede hacer el scroll por sí solo.
  const loaded = curriculum != null
  useEffect(() => {
    if (!loaded) return
    const scrollToHash = () => {
      const id = window.location.hash.slice(1)
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    scrollToHash()
    window.addEventListener("hashchange", scrollToHash)
    return () => window.removeEventListener("hashchange", scrollToHash)
  }, [loaded])

  const semester = semesterFilter === ALL_SEMESTERS ? undefined : Number(semesterFilter)
  const years = useMemo(
    () =>
      (curriculum?.years ?? []).map((courseYear) => ({
        year: courseYear.year ?? 0,
        // Como el back: al filtrar por 1 o 2 no salen las anuales.
        entries: (courseYear.subjects ?? []).filter((entry) => semester == null || entry.semester === semester),
      })),
    [curriculum, semester],
  )

  if (isLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </PageContainer>
    )
  }

  // 404 = grado inexistente; cualquier otro fallo se trata igual (no hay plan que mostrar).
  if (error || !curriculum?.degree) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <ContentUnavailable
        title={notFound || !error ? "Este grado no existe" : "No se pudo cargar el grado"}
        description={
          notFound || !error
            ? "Puede que se haya eliminado."
            : "Ha habido un problema al cargar el plan de estudios. Inténtalo de nuevo en un rato."
        }
        backHref="/dashboard/degrees"
        backLabel="Ver grados"
      />
    )
  }

  const degree = curriculum.degree
  const theme = getSubjectTheme(degree.id)
  const courseCount = degree.years ?? years.length
  const totalSubjects = (curriculum.years ?? []).reduce((sum, courseYear) => sum + (courseYear.subjects?.length ?? 0), 0)
  const myDegree = me?.degree?.id === degree.id

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/degrees")}
          className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Grados
        </button>
        <EditModeToggle />
      </div>

      <header
        className={cn("relative overflow-hidden rounded-2xl border bg-linear-to-br p-6 sm:p-8", theme.gradient)}
      >
        <GraduationCap className={cn("pointer-events-none absolute -right-4 -top-4 h-44 w-44 rotate-12", theme.watermark)} />
        {editing && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 backdrop-blur"
              onClick={() => setEditingDegree(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 text-destructive backdrop-blur hover:text-destructive"
              onClick={() => setDeletingDegree(true)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Eliminar grado</span>
            </Button>
          </div>
        )}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm", theme.tile)}>
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{degree.name}</h1>
              {myDegree && <Badge>Tu grado</Badge>}
            </div>
            {degree.university && <p className="text-muted-foreground">{degree.university}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-xs">
                <Layers className="h-3 w-3" />
                {courseCount} {courseCount === 1 ? "curso" : "cursos"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-xs">
                <BookOpen className="h-3 w-3" />
                {totalSubjects} {totalSubjects === 1 ? "asignatura" : "asignaturas"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Plan de estudios</h2>
        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger size="sm" className="w-48" aria-label="Filtrar por cuatrimestre">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEMESTERS}>Todos los cuatrimestres</SelectItem>
            <SelectItem value="1">1.er cuatrimestre</SelectItem>
            <SelectItem value="2">2.º cuatrimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {years.map(({ year, entries }) => {
          const myYear = myDegree && me?.currentYear === year
          return (
            // El margen compensa la cabecera fija al saltar al ancla.
            <section
              key={year}
              id={`year-${year}`}
              className={cn(
                "scroll-mt-[calc(var(--header-height)+1rem)] overflow-hidden rounded-2xl border bg-card shadow-sm",
                myYear && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{formatYearLong(year)}</h3>
                  {myYear && <Badge>Tu curso</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "asignatura" : "asignaturas"}
                  </span>
                </div>
                <CourseSubscribeButton degreeId={degreeId} year={year} semester={semester} />
              </div>

              {entries.length > 0 ? (
                <div className="divide-y">
                  {SEMESTER_GROUPS.map((group) => {
                    // El anual agrupa también las que no especifican cuatrimestre.
                    const groupEntries = entries.filter((entry) =>
                      group.semester == null ? entry.semester !== 1 && entry.semester !== 2 : entry.semester === group.semester,
                    )
                    if (groupEntries.length === 0) return null
                    return (
                      <div key={group.semester ?? "annual"}>
                        <div className={cn("relative flex items-center gap-2.5 px-5 py-2", group.band)}>
                          <span className={cn("absolute inset-y-0 left-0 w-1", group.bar)} aria-hidden />
                          <span
                            className={cn(
                              "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                              group.chip,
                            )}
                          >
                            {group.semester == null ? <CalendarRange className="h-3.5 w-3.5" /> : formatSemesterShort(group.semester)}
                          </span>
                          <h4 className="text-sm font-semibold">{formatSemesterLong(group.semester)}</h4>
                          <span className="text-xs text-muted-foreground">
                            {groupEntries.length} {groupEntries.length === 1 ? "asignatura" : "asignaturas"}
                          </span>
                        </div>
                        <ul className="divide-y">
                          {groupEntries.map((entry) => {
                            const subject = entry.subject
                            if (subject?.id == null) return null
                            const subjectTheme = getSubjectTheme(subject.id)
                            return (
                              <li key={subject.id} className="flex items-center gap-3 px-5 py-3">
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    subjectTheme.chip,
                                  )}
                                >
                                  <BookOpen className="h-4 w-4" />
                                </span>
                                <Link
                                  href={`/dashboard/subjects/${subject.id}`}
                                  className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-primary hover:underline"
                                >
                                  {subject.name}
                                </Link>
                                <SubscribeButton compact subjectId={subject.id} subjectName={subject.name} />
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  {semester == null
                    ? "Sin asignaturas todavía."
                    : "No hay asignaturas de este cuatrimestre en este curso."}
                </p>
              )}
            </section>
          )
        })}
      </div>

      <DegreeFormDialog open={editingDegree} onOpenChange={setEditingDegree} degree={degree} />

      <ConfirmDialog
        open={deletingDegree}
        onOpenChange={setDeletingDegree}
        title={`¿Eliminar "${degree.name}"?`}
        description={DELETE_DEGREE_DESCRIPTION}
        onConfirm={() => deleteDegree(degree, { onDeleted: () => router.push("/dashboard/degrees") })}
      />
    </PageContainer>
  )
}
