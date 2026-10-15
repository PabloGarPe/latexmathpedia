"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PdfBatchForm } from "@/components/admin/pdf-batch-form"
import { PdfEditForm } from "@/components/admin/pdf-edit-form"
import type { PDFDto } from "@/lib/api/pdfs"

// Qué abre el panel: subir PDFs (con la asignatura/tema de partida) o editar uno existente.
export type PdfSheetTarget =
  | { mode: "create"; subjectId: number | null; subjectUnitId: number | null }
  | { mode: "edit"; pdf: PDFDto }

// Panel lateral único para crear (varios a la vez) y editar PDFs, desde la ficha de una
// asignatura o desde /admin/pdfs. `target` null = cerrado.
export function PdfSheet({
  target,
  onOpenChange,
}: {
  target: PdfSheetTarget | null
  onOpenChange: (open: boolean) => void
}) {
  // Mientras se sube no se puede cerrar el panel (se perdería la cola y el progreso).
  const [busy, setBusy] = useState(false)

  return (
    <Sheet
      open={target != null}
      onOpenChange={(open) => {
        if (!open && busy) return
        onOpenChange(open)
      }}
    >
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{target?.mode === "edit" ? "Editar PDF" : "Subir PDFs"}</SheetTitle>
          <SheetDescription>
            {target?.mode === "edit"
              ? "Cambia los datos del documento o sustituye el fichero."
              : "Arrastra uno o varios ficheros, revisa sus datos y súbelos de una vez."}
          </SheetDescription>
        </SheetHeader>
        {/* Se monta al abrir y se desmonta al cerrar, así cada apertura empieza con un formulario limpio. */}
        {target?.mode === "create" && (
          <PdfBatchForm
            initialSubjectId={target.subjectId}
            initialSubjectUnitId={target.subjectUnitId}
            onBusyChange={setBusy}
            onDone={() => onOpenChange(false)}
          />
        )}
        {target?.mode === "edit" && (
          <PdfEditForm
            key={target.pdf.id}
            pdf={target.pdf}
            onBusyChange={setBusy}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
