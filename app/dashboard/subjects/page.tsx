"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowRight, BookOpen, GraduationCap, Plus } from "lucide-react"
import { AdminMenu } from "@/components/admin/admin-menu"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { SubjectFormDialog } from "@/components/admin/subject-form-dialog"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { PlacementBadges } from "@/components/subjects/placement-badges"
import { SubscribeButton } from "@/components/subscriptions/subscribe-button"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useDegrees } from "@/hooks/api/use-degrees"
import { useMe } from "@/hooks/api/use-profile"
import { useSubscribedSubjectIds } from "@/hooks/api/use-subscriptions"
import { useDeleteSubject, useSubjects } from "@/hooks/api/use-subjects"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import type { SubjectDetailDto } from "@/lib/api/subjects"
import { curriculumHref, degreeYears, formatDegree, formatYearLong } from "@/lib/degrees"
import { getSubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

// Valor de los Select de filtro para "sin filtrar" (Radix no admite items con value vacío).
const ALL = "all"

// Entero positivo en un parámetro de la URL; cualquier otra cosa se ignora como si no estuviera.
function positiveInt(value: string | null): number | undefined {
  if (value == null || !/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  return parsed >= 1 ? parsed : undefined
}

// `useSearchParams` en una página prerenderizada exige un límite de Suspense (si no, falla el build).
export default function SubjectsCatalogPage() {
  return (
    <Suspense fallback={<PageContainer />}>
      <SubjectsCatalog />
    </Suspense>
  )
}

function SubjectsCatalog() {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { editing } = useEditMode()
  const { data: me, isLoading: meLoading } = useMe(isAuthenticated)
  const { data: degrees, isLoading: degreesLoading } = useDegrees()

  // Filtros en la URL: ?degree=<id|all>&year=<n>&semester=<1|2>. Año y cuatrimestre solo
  // tienen sentido con un grado (el back responde 400 si no), así que sin grado se ignoran.
  const degreeParam = searchParams.get("degree")
  const degreeId = positiveInt(degreeParam)
  const year = degreeId != null ? positiveInt(searchParams.get("year")) : undefined
  const semesterParam = positiveInt(searchParams.get("semester"))
  const semester = degreeId != null && (semesterParam === 1 || semesterParam === 2) ? semesterParam : undefined

  // Reescribe los filtros en la URL sin añadir historial ni mover el scroll. `degree=all` se
  // escribe a propósito: distingue "elegí todos" de "no he elegido nada" (preselección del perfil).
  const setFilters = (next: { degree: string; year?: number; semester?: number }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("degree", next.degree)
    if (next.year != null) params.set("year", String(next.year))
    else params.delete("year")
    if (next.semester != null) params.set("semester", String(next.semester))
    else params.delete("semester")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Preselección: sin `degree` en la URL, se aplica el grado y curso del perfil.
  const profileDegreeId = me?.degree?.id
  const profileYear = me?.currentYear
  const preselect = degreeParam == null && profileDegreeId != null
  useEffect(() => {
    if (!preselect) return
    setFilters({ degree: String(profileDegreeId), year: profileYear ?? undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a que haya algo que preseleccionar
  }, [preselect, profileDegreeId, profileYear])

  // Hasta saber si el perfil trae grado no se pide el catálogo: evita un parpadeo con todas las
  // asignaturas y una petición que se descartaría al aplicar la preselección.
  const awaitingProfile = isAuthenticated && degreeParam == null && meLoading
  const {
    data: subjects,
    isLoading: subjectsLoading,
    error,
  } = useSubjects({ degreeId, year, semester }, !awaitingProfile && !preselect)
  const isLoading = awaitingProfile || preselect || subjectsLoading
  // El back da 404 si el grado de la URL no existe (borrado o enlace antiguo).
  const unknownDegree = degreeId != null && error instanceof ApiError && error.status === 404

  const selectedDegree = degrees?.find((degree) => degree.id === degreeId)
  const filtered = degreeId != null
  const subscribedIds = useSubscribedSubjectIds()
  const deleteSubject = useDeleteSubject()
  // `{}` = nueva asignatura; con `subject` = editar esa.
  const [dialog, setDialog] = useState<{ subject?: SubjectDetailDto } | null>(null)

  const handleDelete = async (subject: SubjectDetailDto) => {
    if (subject.id == null) return
    try {
      await deleteSubject.mutateAsync(subject.id)
      toast.success("Asignatura eliminada.")
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? "No se puede eliminar: la asignatura todavía tiene temas, PDFs o cuestionarios. Elimínalos antes."
          : "No se pudo eliminar la asignatura.",
      )
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Asignaturas"
        description="Elige una asignatura para ver sus temas, apuntes y cuestionarios."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditModeToggle />
            {editing && (
              <Button size="sm" className="cursor-pointer" onClick={() => setDialog({})}>
                <Plus className="h-4 w-4" />
                Nueva asignatura
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select
          value={filtered ? String(degreeId) : ALL}
          onValueChange={(value) => setFilters({ degree: value })}
          disabled={degreesLoading}
        >
          <SelectTrigger className="w-full sm:w-72" aria-label="Grado">
            <SelectValue placeholder="Grado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los grados</SelectItem>
            {degrees?.map((degree) => (
              <SelectItem key={degree.id} value={String(degree.id)}>
                {formatDegree(degree)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year != null ? String(year) : ALL}
          onValueChange={(value) =>
            setFilters({ degree: String(degreeId), year: value === ALL ? undefined : Number(value), semester })
          }
          disabled={!filtered || !selectedDegree}
        >
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Curso">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los cursos</SelectItem>
            {degreeYears(selectedDegree).map((option) => (
              <SelectItem key={option} value={String(option)}>
                {formatYearLong(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={semester != null ? String(semester) : ALL}
          onValueChange={(value) =>
            setFilters({ degree: String(degreeId), year, semester: value === ALL ? undefined : Number(value) })
          }
          disabled={!filtered || !selectedDegree}
        >
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-48" aria-label="Cuatrimestre">
            <SelectValue placeholder="Cuatrimestre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los cuatrimestres</SelectItem>
            <SelectItem value="1">1.er cuatrimestre</SelectItem>
            <SelectItem value="2">2.º cuatrimestre</SelectItem>
          </SelectContent>
        </Select>
        {filtered && !unknownDegree && (
          <Button variant="ghost" size="sm" asChild className="sm:ml-auto">
            <Link href={curriculumHref(degreeId, year)}>
              <GraduationCap className="h-4 w-4" />
              Ver plan de estudios
            </Link>
          </Button>
        )}
      </div>

      {unknownDegree ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            El grado indicado ya no existe.
          </p>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setFilters({ degree: ALL })}>
            Ver todas las asignaturas
          </Button>
        </div>
      ) : isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-muted rounded-xl h-44"></div>
          ))}
        </div>
      ) : subjects && subjects.length > 0 ? (
        <div className={GRID}>
          {subjects.map((subject) => {
            const theme = getSubjectTheme(subject.id)
            const subscribed = subject.id != null && subscribedIds.has(subject.id)
            return (
              <div key={subject.id} className="relative h-full">
                {/* Hermano del enlace (no hijo), así el clic no navega; en modo edición deja sitio al menú. */}
                <SubscribeButton
                  compact
                  subjectId={subject.id}
                  subjectName={subject.name}
                  className={cn("absolute top-3 z-10", editing ? "right-13" : "right-3")}
                />
                {editing && (
                  <AdminMenu
                    className="absolute right-3 top-3 z-10"
                    label={subject.name ?? "asignatura"}
                    onEdit={() => setDialog({ subject })}
                    onDelete={() => handleDelete(subject)}
                    deleteTitle={`¿Eliminar "${subject.name}"?`}
                    deleteDescription="Esta acción no se puede deshacer. Si la asignatura todavía tiene temas, PDFs o cuestionarios no se podrá eliminar: elimínalos antes."
                  />
                )}
                <Link href={`/dashboard/subjects/${subject.id}`} className="group block h-full">
                  <div
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
                      subscribed && "border-primary/40 ring-1 ring-primary/20",
                    )}
                  >
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
                      {/* Sin `linked`: la tarjeta ya es un enlace y no se anidan. */}
                      <PlacementBadges placements={subject.placements} variant="compact" className="pt-1" />
                      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-foreground/70 transition-all group-hover:gap-2 group-hover:text-foreground">
                        Ver asignatura
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      ) : filtered ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-sm text-muted-foreground">No hay asignaturas que coincidan con estos filtros.</p>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setFilters({ degree: ALL })}>
            Quitar filtros
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">No hay asignaturas disponibles todavía.</p>
      )}

      <SubjectFormDialog
        open={dialog != null}
        onOpenChange={(open) => !open && setDialog(null)}
        subject={dialog?.subject}
      />
    </PageContainer>
  )
}
