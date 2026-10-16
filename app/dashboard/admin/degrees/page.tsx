"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircleIcon, CheckCircle2, ExternalLink, GraduationCap, Plus } from "lucide-react"
import { AdminMenu } from "@/components/admin/admin-menu"
import { DegreeFormDialog, DELETE_DEGREE_DESCRIPTION, useDeleteDegreeAction } from "@/components/admin/degree-form-dialog"
import { SubjectFormDialog } from "@/components/admin/subject-form-dialog"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDegrees } from "@/hooks/api/use-degrees"
import { useSubjects } from "@/hooks/api/use-subjects"
import { useAdminRoute } from "@/hooks/use-protected-route"
import type { DegreeDto } from "@/lib/api/degrees"
import type { SubjectDetailDto } from "@/lib/api/subjects"

function DegreeRow({
  degree,
  placedCount,
  onEdit,
}: {
  degree: DegreeDto
  // undefined mientras cargan (o fallan) las asignaturas: se pinta "—" en vez de un 0 falso.
  placedCount: number | undefined
  onEdit: () => void
}) {
  const deleteDegree = useDeleteDegreeAction()

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="max-w-72">
        <div className="truncate font-medium">{degree.name}</div>
      </TableCell>
      <TableCell className="max-w-60 truncate text-muted-foreground">{degree.university || "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{degree.years}</TableCell>
      <TableCell className="text-right tabular-nums">{placedCount ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {degree.id != null && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/dashboard/degrees/${degree.id}`} aria-label={`Ver el plan de ${degree.name}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <AdminMenu
            className="border-0 bg-transparent shadow-none"
            label={degree.name ?? "grado"}
            onEdit={onEdit}
            onDelete={() => deleteDegree(degree)}
            deleteTitle="¿Eliminar este grado?"
            deleteDescription={DELETE_DEGREE_DESCRIPTION}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function AdminDegreesPage() {
  // Proteger esta ruta de administración
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const enabled = isAuthenticated && isAdmin

  const { data: degrees, isLoading, isError } = useDegrees(enabled)
  // Catálogo completo: el nº de asignaturas colocadas por grado se cuenta aquí, en cliente.
  const { data: subjects } = useSubjects({}, enabled)
  const { data: unassigned, isLoading: unassignedLoading, isError: unassignedError } = useSubjects(
    { unassigned: true },
    enabled,
  )

  // undefined = diálogo cerrado; null = alta; DegreeDto = edición.
  const [editingDegree, setEditingDegree] = useState<DegreeDto | null | undefined>(undefined)
  const [assigning, setAssigning] = useState<SubjectDetailDto | null>(null)

  const placedCounts = useMemo(() => {
    if (!subjects) return undefined
    const counts = new Map<number, number>()
    for (const subject of subjects) {
      for (const placement of subject.placements ?? []) {
        if (placement.degreeId != null) counts.set(placement.degreeId, (counts.get(placement.degreeId) ?? 0) + 1)
      }
    }
    return counts
  }, [subjects])

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

  return (
    <PageContainer>
      <PageHeader
        title="Grados"
        description="Crea y edita los grados y sus cursos. Las asignaturas se colocan en cada curso editando la asignatura."
        actions={
          <Button className="cursor-pointer" onClick={() => setEditingDegree(null)}>
            <Plus className="h-4 w-4" />
            Nuevo grado
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2" aria-label="Cargando grados">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los grados. Inténtalo de nuevo.</p>
      ) : degrees && degrees.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {degrees.length} {degrees.length === 1 ? "grado" : "grados"}
          </p>
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grado</TableHead>
                  <TableHead>Universidad</TableHead>
                  <TableHead className="text-right">Cursos</TableHead>
                  <TableHead className="text-right">Asignaturas</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {degrees.map((degree) => (
                  <DegreeRow
                    key={degree.id}
                    degree={degree}
                    placedCount={placedCounts ? (placedCounts.get(degree.id ?? -1) ?? 0) : undefined}
                    onEdit={() => setEditingDegree(degree)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No hay grados todavía.</p>
        </div>
      )}

      <section className="mt-12 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Asignaturas sin clasificar</h2>
            {unassigned && unassigned.length > 0 && <Badge variant="secondary">{unassigned.length}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Asignaturas que no están colocadas en ningún grado. Asígnalas a un grado y un curso para que aparezcan en su
            plan de estudios.
          </p>
        </div>

        {unassignedLoading ? (
          <div className="space-y-2" aria-label="Cargando asignaturas sin clasificar">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : unassignedError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircleIcon className="h-4 w-4" />
            No se pudieron cargar las asignaturas sin clasificar.
          </p>
        ) : unassigned && unassigned.length > 0 ? (
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {unassigned.map((subject) => (
              <li key={subject.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{subject.name}</div>
                  {subject.description && (
                    <div className="truncate text-sm text-muted-foreground">{subject.description}</div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="shrink-0 cursor-pointer" onClick={() => setAssigning(subject)}>
                  Asignar a grados
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Todas las asignaturas están asignadas a algún grado.
          </p>
        )}
      </section>

      <DegreeFormDialog
        open={editingDegree !== undefined}
        onOpenChange={(open) => !open && setEditingDegree(undefined)}
        degree={editingDegree ?? undefined}
      />
      <SubjectFormDialog
        open={assigning != null}
        onOpenChange={(open) => !open && setAssigning(null)}
        subject={assigning ?? undefined}
      />
    </PageContainer>
  )
}
