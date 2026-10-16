"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, GraduationCap, Plus } from "lucide-react"
import { AdminMenu } from "@/components/admin/admin-menu"
import { DegreeFormDialog, DELETE_DEGREE_DESCRIPTION, useDeleteDegreeAction } from "@/components/admin/degree-form-dialog"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useDegrees } from "@/hooks/api/use-degrees"
import { useMe } from "@/hooks/api/use-profile"
import type { DegreeDto } from "@/lib/api/degrees"
import { getSubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

export default function DegreesCatalogPage() {
  const { isAuthenticated } = useAuth()
  const { editing } = useEditMode()
  const { data: degrees, isLoading } = useDegrees()
  const { data: me } = useMe(isAuthenticated)
  const deleteDegree = useDeleteDegreeAction()
  // `{}` = nuevo grado; con `degree` = editar ese.
  const [dialog, setDialog] = useState<{ degree?: DegreeDto } | null>(null)

  const myDegreeId = me?.degree?.id ?? null
  // El grado del perfil va primero; el resto conserva el orden del back (nombre y universidad).
  const sorted = useMemo(() => {
    const list = degrees ?? []
    if (myDegreeId == null) return list
    return [...list.filter((d) => d.id === myDegreeId), ...list.filter((d) => d.id !== myDegreeId)]
  }, [degrees, myDegreeId])

  return (
    <PageContainer>
      <PageHeader
        title="Grados"
        description="Elige un grado para ver su plan de estudios, curso a curso."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditModeToggle />
            {editing && (
              <Button size="sm" className="cursor-pointer" onClick={() => setDialog({})}>
                <Plus className="h-4 w-4" />
                Nuevo grado
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-muted rounded-xl h-44"></div>
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div className={GRID}>
          {sorted.map((degree) => {
            const theme = getSubjectTheme(degree.id)
            const mine = degree.id != null && degree.id === myDegreeId
            const years = degree.years ?? 0
            return (
              <div key={degree.id} className="relative h-full">
                {editing && (
                  <AdminMenu
                    className="absolute right-3 top-3 z-10"
                    label={degree.name ?? "grado"}
                    onEdit={() => setDialog({ degree })}
                    onDelete={() => deleteDegree(degree)}
                    deleteTitle={`¿Eliminar "${degree.name}"?`}
                    deleteDescription={DELETE_DEGREE_DESCRIPTION}
                  />
                )}
                <Link href={`/dashboard/degrees/${degree.id}`} className="group block h-full">
                  <div
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
                      mine && "border-primary/40 ring-1 ring-primary/20",
                    )}
                  >
                    <div className={cn("relative h-24 shrink-0 overflow-hidden bg-linear-to-br", theme.gradient)}>
                      <GraduationCap className={cn("absolute -bottom-4 right-3 h-20 w-20 -rotate-12", theme.watermark)} />
                      <div
                        className={cn(
                          "absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl shadow-sm",
                          theme.tile,
                        )}
                      >
                        <GraduationCap className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex grow flex-col gap-1.5 p-4">
                      {mine && <Badge className="w-fit">Tu grado</Badge>}
                      <h3 className={cn("text-base font-semibold leading-snug transition-colors", theme.hoverText)}>
                        {degree.name}
                      </h3>
                      {degree.university && <p className="text-sm text-muted-foreground">{degree.university}</p>}
                      <p className="text-xs text-muted-foreground">
                        {years} {years === 1 ? "curso" : "cursos"}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-foreground/70 transition-all group-hover:gap-2 group-hover:text-foreground">
                        Ver plan de estudios
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay grados disponibles todavía.</p>
      )}

      <DegreeFormDialog
        open={dialog != null}
        onOpenChange={(open) => !open && setDialog(null)}
        degree={dialog?.degree}
      />
    </PageContainer>
  )
}
