"use client"

import { Eye, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEditMode } from "@/contexts/edit-mode-context"

// Solo lo ve el admin. Encendido, las asignaturas, temas, PDFs y cuestionarios muestran sus
// controles de gestión.
export function EditModeToggle() {
  const { canEdit, editing, setEditing } = useEditMode()
  if (!canEdit) return null

  return (
    <Button
      type="button"
      size="sm"
      variant={editing ? "default" : "outline"}
      aria-pressed={editing}
      className="cursor-pointer"
      onClick={() => setEditing(!editing)}
    >
      {editing ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {editing ? "Modo edición: activado" : "Modo edición"}
    </Button>
  )
}
