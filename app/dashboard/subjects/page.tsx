"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Plus } from "lucide-react"
import { AdminMenu } from "@/components/admin/admin-menu"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { NameDialog } from "@/components/admin/name-dialog"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { SubscribeButton } from "@/components/subscriptions/subscribe-button"
import { Button } from "@/components/ui/button"
import { useEditMode } from "@/contexts/edit-mode-context"
import { useSubscribedSubjectIds } from "@/hooks/api/use-subscriptions"
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUpdateSubject,
} from "@/hooks/api/use-subjects"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import type { SubjectDto } from "@/lib/api/subjects"
import { getSubjectTheme } from "@/lib/subject-theme"
import { cn } from "@/lib/utils"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

export default function SubjectsCatalogPage() {
  const toast = useToast()
  const { editing } = useEditMode()
  const { data: subjects, isLoading } = useSubjects()
  const subscribedIds = useSubscribedSubjectIds()
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()
  // `{}` = nueva asignatura; con `subject` = editar esa.
  const [dialog, setDialog] = useState<{ subject?: SubjectDto } | null>(null)

  const handleDelete = async (subject: SubjectDto) => {
    if (subject.id == null) return
    try {
      await deleteSubject.mutateAsync(subject.id)
      toast.success("Asignatura eliminada.")
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? "No se puede eliminar: la asignatura todavía tiene temas. Elimínalos antes."
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
                    deleteDescription="Esta acción no se puede deshacer. Si la asignatura todavía tiene temas no se podrá eliminar: elimínalos antes."
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
      ) : (
        <p className="text-muted-foreground">No hay asignaturas disponibles todavía.</p>
      )}

      <NameDialog
        open={dialog != null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.subject ? "Editar asignatura" : "Nueva asignatura"}
        withDescription
        namePlaceholder="Ej: Cálculo Diferencial e Integral"
        initial={{ name: dialog?.subject?.name ?? "", description: dialog?.subject?.description ?? "" }}
        submitLabel={dialog?.subject ? "Guardar" : "Crear asignatura"}
        onSubmit={async (values) => {
          const body = { name: values.name, description: values.description || undefined }
          try {
            if (dialog?.subject?.id != null) {
              await updateSubject.mutateAsync({ id: dialog.subject.id, body })
              toast.success("Asignatura actualizada.")
            } else {
              await createSubject.mutateAsync(body)
              toast.success("Asignatura creada.")
            }
          } catch (error) {
            toast.error(
              error instanceof ApiError && error.status === 409
                ? "Ya existe una asignatura con ese nombre."
                : "No se pudo guardar la asignatura.",
            )
            throw error
          }
        }}
      />
    </PageContainer>
  )
}
