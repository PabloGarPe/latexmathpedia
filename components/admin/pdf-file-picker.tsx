"use client"

import { useRef, useState } from "react"
import { FileText, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name)
}

export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Selector de UN fichero PDF para sustituir el contenido de uno existente. Sin elegir nada, el
// back conserva el fichero actual. Sustituye al <input type="file"> nativo, que en el panel
// lateral quedaba como una caja con el texto del navegador.
export function PdfFilePicker({
  value,
  onChange,
  onReject,
  disabled,
}: {
  value: File | null
  onChange: (file: File | null) => void
  onReject?: (message: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (!isPdfFile(file)) {
      onReject?.("El fichero debe ser un PDF.")
      return
    }
    onChange(file)
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf"
      className="hidden"
      onChange={(event) => {
        pick(Array.from(event.target.files ?? []))
        event.target.value = ""
      }}
    />
  )

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(value.size)} · sustituirá al fichero actual al guardar
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 cursor-pointer"
          aria-label="Quitar el fichero elegido"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
        {input}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) pick(Array.from(event.dataTransfer.files))
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors",
        "hover:border-primary/60 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none",
        dragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <RefreshCw className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Sustituir el fichero</p>
        <p className="text-xs text-muted-foreground">
          Arrastra un PDF o haz clic. Si no eliges ninguno se conserva el actual.
        </p>
      </div>
      {input}
    </div>
  )
}
