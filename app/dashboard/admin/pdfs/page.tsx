"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircleIcon, ExternalLink, Search, Upload, X } from "lucide-react"
import { AdminMenu } from "@/components/admin/admin-menu"
import { PdfSheet, type PdfSheetTarget } from "@/components/admin/pdf-sheet"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useDeletePdf, usePdfs } from "@/hooks/api/use-pdfs"
import { useSubjects, useSubjectUnits } from "@/hooks/api/use-subjects"
import { useToast } from "@/hooks/use-toast"
import type { PDFDto } from "@/lib/api/pdfs"
import { formatPdfAuthors } from "@/lib/content/types"
import { formatCompactCount, formatDate } from "@/lib/utils"

const ALL = "all"
// Solo para el filtro de tema: los PDFs de una asignatura que no cuelgan de ningún tema.
const NO_UNIT = "none"
const PAGE_SIZE = 50

type SortKey = "recent" | "views" | "name"

const SORTERS: Record<SortKey, (a: PDFDto, b: PDFDto) => number> = {
  recent: (a, b) => (b.lastTimeEdited ?? "").localeCompare(a.lastTimeEdited ?? ""),
  views: (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0),
  name: (a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"),
}

function PdfRow({ pdf, onEdit }: { pdf: PDFDto; onEdit: () => void }) {
  const toast = useToast()
  const deletePdf = useDeletePdf()
  const authors = formatPdfAuthors(pdf.author, pdf.coauthors)

  const handleDelete = async () => {
    if (pdf.id == null) return
    try {
      await deletePdf.mutateAsync(pdf.id)
      toast.success("PDF eliminado.")
    } catch {
      toast.error("No se pudo eliminar el PDF.")
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="max-w-72">
        <div className="truncate font-medium">{pdf.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {authors || "Sin autores asignados"}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {pdf.subject?.name && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {pdf.subject.name}
            </span>
          )}
          {pdf.subjectUnit?.name && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pdf.subjectUnit.name}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCompactCount(pdf.viewCount ?? 0)}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDate(pdf.lastTimeEdited)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/dashboard/pdfs/${pdf.id}`} aria-label={`Abrir ${pdf.name}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <AdminMenu
            className="border-0 bg-transparent shadow-none"
            label={pdf.name ?? "PDF"}
            onEdit={onEdit}
            onDelete={handleDelete}
            deleteTitle="¿Eliminar este PDF?"
            deleteDescription="Se borrará el documento y no se podrá recuperar."
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function AdminPdfsPage() {
  // Proteger esta ruta de administración
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const enabled = isAuthenticated && isAdmin

  const { data: pdfs, isLoading, isError } = usePdfs(enabled)
  const { data: subjects } = useSubjects()

  const [searchTerm, setSearchTerm] = useState("")
  const [subjectFilter, setSubjectFilter] = useState(ALL)
  const [unitFilter, setUnitFilter] = useState(ALL)
  const [sort, setSort] = useState<SortKey>("recent")
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [sheet, setSheet] = useState<PdfSheetTarget | null>(null)

  const { data: units } = useSubjectUnits(subjectFilter === ALL ? null : Number(subjectFilter))

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return (pdfs ?? [])
      .filter((pdf) => {
        if (subjectFilter !== ALL && String(pdf.subject?.id) !== subjectFilter) return false
        if (unitFilter === NO_UNIT && pdf.subjectUnit?.id != null) return false
        if (unitFilter !== ALL && unitFilter !== NO_UNIT && String(pdf.subjectUnit?.id) !== unitFilter) {
          return false
        }
        if (!term) return true
        return (
          pdf.name?.toLowerCase().includes(term) ||
          pdf.description?.toLowerCase().includes(term) ||
          pdf.author?.toLowerCase().includes(term) ||
          pdf.coauthors?.some((coauthor) => coauthor?.toLowerCase().includes(term))
        )
      })
      .sort(SORTERS[sort])
  }, [pdfs, searchTerm, subjectFilter, unitFilter, sort])

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Si no está autenticado o no es admin, el hook maneja la redirección
  if (!isAuthenticated || !isAdmin) {
    return null
  }

  const hasFilters = searchTerm !== "" || subjectFilter !== ALL
  const total = pdfs?.length ?? 0

  return (
    <PageContainer>
      <PageHeader
        title="PDFs"
        description="Vista global de todos los documentos. Para añadir o ajustar contenido en su sitio, usa el modo edición dentro de cada asignatura."
        actions={
          <Button
            className="cursor-pointer"
            onClick={() => setSheet({ mode: "create", subjectId: null, subjectUnitId: null })}
          >
            <Upload className="h-4 w-4" />
            Subir PDFs
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descripción o autor..."
            className="pl-10"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setVisible(PAGE_SIZE)
            }}
          />
        </div>

        <Select
          value={subjectFilter}
          onValueChange={(value) => {
            setSubjectFilter(value)
            setUnitFilter(ALL)
            setVisible(PAGE_SIZE)
          }}
        >
          <SelectTrigger className="w-56 cursor-pointer" aria-label="Filtrar por asignatura">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las asignaturas</SelectItem>
            {subjects?.map((subject) => (
              <SelectItem key={subject.id} value={String(subject.id)}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={unitFilter}
          onValueChange={(value) => {
            setUnitFilter(value)
            setVisible(PAGE_SIZE)
          }}
          disabled={subjectFilter === ALL}
        >
          <SelectTrigger className="w-56 cursor-pointer" aria-label="Filtrar por tema">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los temas</SelectItem>
            <SelectItem value={NO_UNIT}>General (sin tema)</SelectItem>
            {units?.map((unit) => (
              <SelectItem key={unit.id} value={String(unit.id)}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-44 cursor-pointer" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más recientes</SelectItem>
            <SelectItem value="views">Más vistos</SelectItem>
            <SelectItem value="name">Nombre (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              setSearchTerm("")
              setSubjectFilter(ALL)
              setUnitFilter(ALL)
              setVisible(PAGE_SIZE)
            }}
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando PDFs...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los PDFs. Inténtalo de nuevo.</p>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hasFilters || unitFilter !== ALL
              ? `${filtered.length} de ${total} PDFs`
              : `${total} ${total === 1 ? "PDF" : "PDFs"}`}
          </p>
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Asignatura / Tema</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead>Última edición</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, visible).map((pdf) => (
                  <PdfRow key={pdf.id} pdf={pdf} onEdit={() => setSheet({ mode: "edit", pdf })} />
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > visible && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setVisible((current) => current + PAGE_SIZE)}
              >
                Mostrar más ({filtered.length - visible} restantes)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center text-muted-foreground">
          <AlertCircleIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>{hasFilters || unitFilter !== ALL ? "Ningún PDF coincide con los filtros." : "No hay PDFs todavía."}</p>
        </div>
      )}

      <PdfSheet target={sheet} onOpenChange={(open) => !open && setSheet(null)} />
    </PageContainer>
  )
}
