"use client"

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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Lista vertical reordenable por arrastre (ratón, táctil y teclado sobre el asa).
export function SortableList({
  ids,
  onReorder,
  onDragStart,
  onDragFinish,
  children,
}: {
  ids: (number | string)[]
  // Recibe el id arrastrado y el id sobre el que se suelta.
  onReorder: (activeId: string, overId: string) => void
  onDragStart?: () => void
  // Se llama al soltar o cancelar, antes de onReorder.
  onDragFinish?: () => void
  children: React.ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    onDragFinish?.()
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragCancel={onDragFinish}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids.map(String)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

// Elemento de una SortableList: entrega el asa de arrastre (para colocarla donde convenga) y si
// se está arrastrando.
export function SortableRow({
  id,
  label,
  className,
  children,
  ...rest
}: {
  id: number | string
  // Nombre del elemento, para el aria-label del asa.
  label: string
  className?: string
  children: (context: { handle: React.ReactNode; dragging: boolean }) => React.ReactNode
} & Omit<React.ComponentProps<"div">, "children" | "id">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(id) })

  const handle = (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      aria-label={`Reordenar ${label}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-20", className)}
      {...rest}
    >
      {children({ handle, dragging: isDragging })}
    </div>
  )
}
