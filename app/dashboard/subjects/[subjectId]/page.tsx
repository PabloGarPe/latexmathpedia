"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  FileJson,
  FileText,
  GripVertical,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Trash,
  Upload,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import ContentCard from "@/components/content-card"
import { PageContainer } from "@/components/page-shell"
import { AdminMenu } from "@/components/admin/admin-menu"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { NameDialog } from "@/components/admin/name-dialog"
import { PdfSheet, type PdfSheetTarget } from "@/components/admin/pdf-sheet"
import { QuizFormDialog } from "@/components/admin/quiz-form-dialog"
import { SubjectFormDialog } from "@/components/admin/subject-form-dialog"
import { PlacementBadges } from "@/components/subjects/placement-badges"
import { SubscribeButton } from "@/components/subscriptions/subscribe-button"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useAuth } from "@/contexts/auth-context"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useDeletePdf } from "@/hooks/api/use-pdfs"
import { useDeleteQuiz } from "@/hooks/api/use-quizzes"
import { useToast } from "@/hooks/use-toast"
import {
  useCreateSubjectUnit,
  useDeleteSubject,
  useDeleteSubjectUnit,
  useReorderSubjectUnits,
  useSubject,
  useSubjectPdfs,
  useSubjectQuizzes,
  useSubjectUnits,
  useUpdateSubjectUnit,
} from "@/hooks/api/use-subjects"
import { toDisplayPdf, type DisplayPdf } from "@/lib/content/types"
import { quizImportHref } from "@/lib/quiz-import"
import { ApiError } from "@/lib/api/errors"
import type { QuizDto } from "@/lib/api/quizzes"
import type { SubjectUnitDto } from "@/lib/api/subjects"
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

// Controles de gestión de un tema en modo edición.
type UnitEditing = {
  onAddPdf: () => void
  onAddQuiz: () => void
  // Página de importación desde JSON con la asignatura/tema ya elegidos.
  importQuizHref: string
  // "General" no es un tema real: no se renombra, ni se borra, ni se reordena.
  onRename?: () => void
  onDelete?: () => void
  dragHandle?: React.ReactNode
}

type UnitItemProps = {
  value: string
  title: string
  index?: number
  pdfs: DisplayPdf[]
  quizzes: QuizDto[]
  loading: boolean
  theme: SubjectTheme
  general?: boolean
  editing?: UnitEditing
  pdfActions?: (pdf: DisplayPdf) => React.ReactNode
  quizActions?: (quiz: QuizDto) => React.ReactNode
  // Para dnd-kit (temas reordenables).
  innerRef?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
  dragging?: boolean
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
  editing,
  pdfActions,
  quizActions,
  innerRef,
  style,
  dragging,
}: UnitItemProps) {
  const hasItems = pdfs.length > 0 || quizzes.length > 0

  return (
    <AccordionItem
      ref={innerRef}
      style={style}
      value={value}
      className={cn(
        "relative border-b bg-card transition-colors data-[state=open]:bg-muted/40",
        // Barra de color a la izquierda del tema abierto.
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-transparent before:transition-colors",
        theme.bar,
        dragging && "z-20 rounded-lg border shadow-lg",
      )}
    >
      <AccordionTrigger className="min-w-0 cursor-pointer items-center rounded-none px-5 py-4 text-base font-semibold hover:bg-muted/60 hover:no-underline focus-visible:ring-inset [&>svg]:transition-colors hover:[&>svg]:text-foreground">
        <span className={cn("flex min-w-0 flex-1 items-center gap-4", editing && !general && "pr-12 sm:pr-32")}>
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
        {!editing && !loading && hasItems && (
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

      {/* Fuera del botón del trigger (no se puede anidar un botón en otro), superpuesto sobre su
          extremo derecho, justo antes del chevron. */}
      {editing && !general && (
        <div className="absolute right-12 top-0 flex h-17 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 cursor-pointer sm:inline-flex"
            aria-label={`Renombrar ${title}`}
            onClick={editing.onRename}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 cursor-pointer hover:text-destructive sm:inline-flex"
            aria-label={`Eliminar ${title}`}
            onClick={editing.onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
          {editing.dragHandle}
        </div>
      )}

      <AccordionContent className="px-5 pb-5 pt-1 sm:pl-18">
        {editing && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={editing.onAddPdf}>
              <Upload className="h-4 w-4" />
              Añadir PDF
            </Button>
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={editing.onAddQuiz}>
              <ListChecks className="h-4 w-4" />
              Añadir cuestionario
            </Button>
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" asChild>
              <Link href={editing.importQuizHref} title="Importar un cuestionario desde un archivo JSON">
                <FileJson className="h-4 w-4" />
                Importar JSON
              </Link>
            </Button>
            {/* En pantallas estrechas no caben en la fila del tema (ahí solo queda el asa). */}
            {editing.onRename && (
              <Button type="button" size="sm" variant="outline" className="cursor-pointer sm:hidden" onClick={editing.onRename}>
                <Pencil className="h-4 w-4" />
                Renombrar
              </Button>
            )}
            {editing.onDelete && (
              <Button type="button" size="sm" variant="outline" className="cursor-pointer text-destructive hover:text-destructive sm:hidden" onClick={editing.onDelete}>
                <Trash className="h-4 w-4" />
                Eliminar tema
              </Button>
            )}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando contenido...</p>
        ) : hasItems ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pdfs.map((pdf) => (
              <ContentCard key={`pdf-${pdf.id}`} item={{ kind: "pdf", data: pdf }} actions={pdfActions?.(pdf)} />
            ))}
            {quizzes.map((quiz) => (
              <ContentCard key={`quiz-${quiz.id}`} item={{ kind: "quiz", data: quiz }} actions={quizActions?.(quiz)} />
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

// Tema arrastrable: el asa (⠿) es lo único que inicia el arrastre, para que el resto de la fila
// siga abriendo y cerrando el desplegable.
function SortableUnitItem({ editing, ...props }: UnitItemProps & { editing: UnitEditing }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.value })

  return (
    <UnitItem
      {...props}
      innerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      editing={{
        ...editing,
        dragHandle: (
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Reordenar ${props.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        ),
      }}
    />
  )
}

// Los errores del back no traen cuerpo útil; solo el estado HTTP distingue los casos.
function conflict(error: unknown) {
  return error instanceof ApiError && error.status === 409
}

export default function SubjectDetailPage() {
  const params = useParams<{ subjectId: string }>()
  const subjectId = Number(params.subjectId)
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const requestedUnit = searchParams.get("unit")

  const { isAuthenticated } = useAuth()
  const { editing: editMode } = useEditMode()

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

  const deleteSubject = useDeleteSubject()
  const createUnit = useCreateSubjectUnit()
  const updateUnit = useUpdateSubjectUnit()
  const deleteUnit = useDeleteSubjectUnit()
  const reorderUnits = useReorderSubjectUnits()
  const deletePdf = useDeletePdf()
  const deleteQuiz = useDeleteQuiz()

  // Diálogos del modo edición.
  const [pdfSheet, setPdfSheet] = useState<PdfSheetTarget | null>(null)
  const [quizDialog, setQuizDialog] = useState<{ unitId: number | null } | null>(null)
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState(false)
  const [unitDialog, setUnitDialog] = useState<{ unit?: SubjectUnitDto } | null>(null)
  const [unitToDelete, setUnitToDelete] = useState<SubjectUnitDto | null>(null)

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
  // En modo edición "General" se muestra siempre, para poder añadirle contenido aunque esté vacío.
  const showGeneral = generalPdfs.length > 0 || generalQuizzes.length > 0 || editMode

  // Temas abiertos. Si se llega desde el clic en un tema de la sidebar (?unit=X) ese panel
  // arranca abierto, y si ya se está en la ficha y se pulsa otro tema en la sidebar, se abre
  // también (el acordeón no se remonta al cambiar solo el query param).
  const [openUnits, setOpenUnits] = useState<string[]>(requestedUnit ? [requestedUnit] : [])
  useEffect(() => {
    if (requestedUnit) {
      setOpenUnits((prev) => (prev.includes(requestedUnit) ? prev : [...prev, requestedUnit]))
    }
  }, [requestedUnit])

  // Arrastrar un tema abierto es incómodo (es muy alto): al empezar se pliegan todos y al
  // soltar se restauran.
  const openBeforeDrag = useRef<string[] | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (openBeforeDrag.current) {
      setOpenUnits(openBeforeDrag.current)
      openBeforeDrag.current = null
    }
    const { active, over } = event
    if (!units || !over || active.id === over.id) return
    const from = units.findIndex((unit) => String(unit.id) === active.id)
    const to = units.findIndex((unit) => String(unit.id) === over.id)
    if (from < 0 || to < 0) return
    reorderUnits.mutate(
      { subjectId, units: arrayMove(units, from, to) },
      { onError: () => toast.error("No se pudo guardar el nuevo orden de los temas.") },
    )
  }

  const handleCreateUnit = async (name: string) => {
    const nextPosition = Math.max(0, ...(units ?? []).map((unit) => unit.position ?? 0)) + 1
    try {
      await createUnit.mutateAsync({ subjectId, body: { name, position: nextPosition } })
      toast.success("Tema creado.")
    } catch (error) {
      toast.error(conflict(error) ? "Ya existe un tema con ese nombre en esta asignatura." : "No se pudo crear el tema.")
      throw error
    }
  }

  const handleRenameUnit = async (unit: SubjectUnitDto, name: string) => {
    if (unit.id == null) return
    try {
      // El back toma `position` como obligatoria (sin ella la pondría a 0), así que se reenvía.
      await updateUnit.mutateAsync({ id: unit.id, subjectId, body: { name, position: unit.position ?? 0 } })
      toast.success("Tema renombrado.")
    } catch (error) {
      toast.error(conflict(error) ? "Ya existe un tema con ese nombre en esta asignatura." : "No se pudo renombrar el tema.")
      throw error
    }
  }

  const handleDeleteUnit = async (unit: SubjectUnitDto) => {
    if (unit.id == null) return
    try {
      await deleteUnit.mutateAsync({ id: unit.id, subjectId })
      toast.success("Tema eliminado.")
    } catch (error) {
      toast.error(
        conflict(error)
          ? "No se puede eliminar: el tema todavía tiene PDFs. Muévelos o elimínalos antes."
          : "No se pudo eliminar el tema.",
      )
    }
  }

  const handleDeletePdf = async (pdf: DisplayPdf) => {
    try {
      await deletePdf.mutateAsync(pdf.id)
      toast.success("PDF eliminado.")
    } catch {
      toast.error("No se pudo eliminar el PDF.")
    }
  }

  const handleDeleteQuiz = async (quiz: QuizDto) => {
    if (quiz.id == null) return
    try {
      await deleteQuiz.mutateAsync(quiz.id)
      toast.success("Cuestionario eliminado.")
    } catch {
      toast.error("No se pudo eliminar el cuestionario.")
    }
  }

  const handleDeleteSubject = async () => {
    try {
      await deleteSubject.mutateAsync(subjectId)
      toast.success("Asignatura eliminada.")
      router.push("/dashboard/subjects")
    } catch (error) {
      toast.error(
        conflict(error)
          ? "No se puede eliminar: la asignatura todavía tiene temas, PDFs o cuestionarios. Elimínalos antes."
          : "No se pudo eliminar la asignatura.",
      )
    }
  }

  const pdfActions = editMode
    ? (pdf: DisplayPdf) => (
        <AdminMenu
          label={pdf.title}
          onEdit={() => {
            const dto = rawPdfs?.find((candidate) => candidate.id === pdf.id)
            if (dto) setPdfSheet({ mode: "edit", pdf: dto })
          }}
          onDelete={() => handleDeletePdf(pdf)}
          deleteTitle="¿Eliminar este PDF?"
          deleteDescription="Se borrará el documento y no se podrá recuperar."
        />
      )
    : undefined

  const quizActions = editMode
    ? (quiz: QuizDto) => (
        <AdminMenu
          label={quiz.name ?? "cuestionario"}
          onEdit={() => router.push(`/dashboard/admin/quizzes/${quiz.id}`)}
          onDelete={() => handleDeleteQuiz(quiz)}
          deleteTitle="¿Eliminar este cuestionario?"
          deleteDescription="Se borrará también con sus preguntas y opciones, y no se podrá recuperar."
        />
      )
    : undefined

  const editingFor = (unit: SubjectUnitDto | null): UnitEditing | undefined =>
    editMode
      ? {
          onAddPdf: () =>
            setPdfSheet({ mode: "create", subjectId, subjectUnitId: unit?.id ?? null }),
          onAddQuiz: () => setQuizDialog({ unitId: unit?.id ?? null }),
          importQuizHref: quizImportHref({
            subjectId,
            subjectUnitId: unit?.id ?? null,
            // Al volver se reabre el tema desde el que se importó (?unit=).
            returnTo: `/dashboard/subjects/${subjectId}${unit?.id != null ? `?unit=${unit.id}` : ""}`,
          }),
          ...(unit && {
            onRename: () => setUnitDialog({ unit }),
            onDelete: () => setUnitToDelete(unit),
          }),
        }
      : undefined

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/subjects")}
          className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Asignaturas
        </button>
        <EditModeToggle />
      </div>

      <header
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-linear-to-br p-6 sm:p-8",
          theme.gradient,
        )}
      >
        <BookOpen className={cn("pointer-events-none absolute -right-4 -top-4 h-44 w-44 rotate-12", theme.watermark)} />
        {editMode && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 backdrop-blur"
              onClick={() => setSubjectDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer bg-background/80 text-destructive backdrop-blur hover:text-destructive"
              onClick={() => setDeletingSubject(true)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Eliminar asignatura</span>
            </Button>
          </div>
        )}
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
              <SubscribeButton subjectId={subject.id} subjectName={subject.name} />
            </div>
            {subject.description && (
              <p className="max-w-prose text-muted-foreground">{subject.description}</p>
            )}
            {/* Enlazadas al plan de estudios del grado, ancladas al curso. */}
            <PlacementBadges placements={subject.placements} variant="full" linked />
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Temas</h2>
          {editMode && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setUnitDialog({})}
            >
              <Plus className="h-4 w-4" />
              Añadir tema
            </Button>
          )}
        </div>
        {unitCount > 0 || showGeneral ? (
          // Los temas forman un único panel: filas separadas por líneas finas, la abierta se
          // tiñe y lleva una barra de color, y su contenido cuelga debajo en el mismo fondo.
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            {/* -mb-px: oculta el borde inferior del último tema bajo el recorte del panel (no vale
                last:border-b-0, dnd-kit añade un nodo oculto detrás del último tema). */}
            <Accordion type="multiple" value={openUnits} onValueChange={setOpenUnits} className="-mb-px">
              {showGeneral && (
                <UnitItem
                  value={GENERAL_KEY}
                  title="General"
                  general
                  pdfs={generalPdfs}
                  quizzes={generalQuizzes}
                  loading={contentLoading}
                  theme={theme}
                  editing={editingFor(null)}
                  pdfActions={pdfActions}
                  quizActions={quizActions}
                />
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => {
                  openBeforeDrag.current = openUnits
                  setOpenUnits([])
                }}
                onDragCancel={() => {
                  if (openBeforeDrag.current) setOpenUnits(openBeforeDrag.current)
                  openBeforeDrag.current = null
                }}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={(units ?? []).map((unit) => String(unit.id))}
                  strategy={verticalListSortingStrategy}
                  disabled={!editMode}
                >
                  {units?.map((unit, index) => {
                    const key = unit.id != null ? String(unit.id) : ""
                    const common = {
                      value: key,
                      title: unit.name ?? "",
                      index: index + 1,
                      pdfs: pdfsByUnit.get(key) ?? [],
                      quizzes: quizzesByUnit.get(key) ?? [],
                      loading: contentLoading,
                      theme,
                      pdfActions,
                      quizActions,
                    }
                    const editing = editingFor(unit)
                    return editing ? (
                      <SortableUnitItem key={unit.id} {...common} editing={editing} />
                    ) : (
                      <UnitItem key={unit.id} {...common} />
                    )
                  })}
                </SortableContext>
              </DndContext>
            </Accordion>
          </div>
        ) : (
          <p className="text-muted-foreground">Esta asignatura todavía no tiene temas.</p>
        )}
      </section>

      <PdfSheet target={pdfSheet} onOpenChange={(open) => !open && setPdfSheet(null)} />

      <QuizFormDialog
        open={quizDialog != null}
        onOpenChange={(open) => !open && setQuizDialog(null)}
        subjectId={subjectId}
        subjectUnitId={quizDialog?.unitId ?? null}
      />

      <SubjectFormDialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen} subject={subject} />

      <NameDialog
        open={unitDialog != null}
        onOpenChange={(open) => !open && setUnitDialog(null)}
        title={unitDialog?.unit ? "Renombrar tema" : "Añadir tema"}
        nameLabel="Nombre del tema"
        namePlaceholder="Ej: Tema 1: Límites y continuidad"
        initial={{ name: unitDialog?.unit?.name ?? "", description: "" }}
        submitLabel={unitDialog?.unit ? "Guardar" : "Añadir"}
        onSubmit={async (values) => {
          if (unitDialog?.unit) await handleRenameUnit(unitDialog.unit, values.name)
          else await handleCreateUnit(values.name)
        }}
      />

      <ConfirmDialog
        open={unitToDelete != null}
        onOpenChange={(open) => !open && setUnitToDelete(null)}
        title={`¿Eliminar "${unitToDelete?.name ?? "el tema"}"?`}
        description="Esta acción no se puede deshacer. Si el tema todavía tiene PDFs no se podrá eliminar: muévelos o elimínalos antes."
        onConfirm={async () => {
          if (unitToDelete) await handleDeleteUnit(unitToDelete)
        }}
      />

      <ConfirmDialog
        open={deletingSubject}
        onOpenChange={setDeletingSubject}
        title={`¿Eliminar "${subject.name}"?`}
        description="Esta acción no se puede deshacer. Si la asignatura todavía tiene temas, PDFs o cuestionarios no se podrá eliminar: elimínalos antes."
        onConfirm={handleDeleteSubject}
      />
    </PageContainer>
  )
}
