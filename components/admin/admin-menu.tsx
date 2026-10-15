"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { cn } from "@/lib/utils"

// Menú "⋯" de una tarjeta o fila en modo edición: Editar y Eliminar (este con confirmación).
export function AdminMenu({
  label,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
  className,
}: {
  // Nombre del elemento, para el aria-label del botón.
  label: string
  onEdit: () => void
  onDelete: () => void | Promise<void>
  deleteTitle: string
  deleteDescription: React.ReactNode
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Acciones de ${label}`}
            className={cn("h-8 w-8 cursor-pointer bg-background/90 shadow-sm backdrop-blur", className)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem className="cursor-pointer" onSelect={onEdit}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onSelect={() => setConfirming(true)}
          >
            <Trash />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
      />
    </>
  )
}
