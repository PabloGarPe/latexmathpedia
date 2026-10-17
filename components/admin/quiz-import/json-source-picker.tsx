"use client"

import { useRef, useState } from "react"
import { AlertCircle, Download, FileJson, Copy, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { jsonTemplate, parseQuizJson, type ImportMode, type ParseError, type QuizDraft } from "@/lib/quiz-import"
import { cn } from "@/lib/utils"

// Origen del JSON de una importación: arrastrar un .json, elegirlo con el botón o pegarlo, con la
// plantilla a mano (copiar/descargar). Al cargar, parsea (parseQuizJson) y entrega el borrador; si
// el JSON no es válido muestra el error con línea y columna y deja el texto en el área para
// corregirlo allí mismo.
//
// Uso (ambos modos):
//   <JsonSourcePicker mode="quiz" onLoaded={(draft, warnings) => ...} />
//   - mode "quiz": cuestionario completo (página de importación).
//   - mode "questions": solo preguntas (editor de un cuestionario existente); acepta también un
//     cuestionario completo y avisa de que se ignoran sus datos.
// `onLoaded` recibe el borrador y los avisos recuperables del parseo (no son errores).

const MAX_FILE_BYTES = 5 * 1024 * 1024

export function JsonSourcePicker({
  mode,
  onLoaded,
  disabled,
  className,
}: {
  mode: ImportMode
  onLoaded: (draft: QuizDraft, warnings: string[]) => void
  disabled?: boolean
  className?: string
}) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState("")
  const [error, setError] = useState<ParseError | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const load = (source: string) => {
    const result = parseQuizJson(source, mode)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    onLoaded(result.draft, result.warnings)
  }

  const readFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError({ message: `El archivo pesa demasiado (${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo son 5 MB).` })
      return
    }
    try {
      const content = await file.text()
      setText(content)
      setFileName(file.name)
      load(content)
    } catch {
      setError({ message: "No se pudo leer el archivo." })
    }
  }

  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0]
    if (file) void readFile(file)
  }

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(jsonTemplate(mode))
      toast.success("Plantilla copiada al portapapeles.")
    } catch {
      toast.error("No se pudo copiar. Usa «Descargar plantilla».")
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([jsonTemplate(mode)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = mode === "quiz" ? "plantilla-cuestionario.json" : "plantilla-preguntas.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  // Coloca el cursor del área de pegado en el error (el motor da el desplazamiento si puede).
  const goToError = () => {
    const textarea = textareaRef.current
    if (!textarea || error?.position == null) return
    textarea.focus()
    textarea.setSelectionRange(error.position, Math.min(error.position + 1, text.length))
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          // Salir hacia un hijo de la zona no cuenta como salir.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-purple-500 bg-purple-500/10" : "border-border bg-muted/20",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300">
          <FileJson className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Arrastra aquí un archivo .json</p>
          <p className="text-sm text-muted-foreground">
            {fileName ? `Último archivo: ${fileName}` : "Lo verás y podrás editarlo antes de importarlo."}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo JSON"
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files)
            // Permite volver a elegir el mismo archivo (p. ej. tras corregirlo).
            event.target.value = ""
          }}
        />
        <Button type="button" className="cursor-pointer" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Elegir archivo
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="json-source-text">o pega el JSON aquí</Label>
        <Textarea
          id="json-source-text"
          ref={textareaRef}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={mode === "quiz" ? '{ "name": "…", "difficulty": "EASY", "questions": [ … ] }' : '{ "questions": [ … ] }'}
          spellCheck={false}
          wrap="off"
          aria-invalid={error != null}
          className="max-h-72 min-h-32 resize-y overflow-auto font-mono text-xs whitespace-pre"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-1 text-sm">
            <Button type="button" variant="link" size="sm" className="h-auto cursor-pointer p-0" onClick={copyTemplate}>
              <Copy className="h-3.5 w-3.5" />
              Copiar plantilla
            </Button>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <Button type="button" variant="link" size="sm" className="h-auto cursor-pointer p-0" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            disabled={disabled || !text.trim()}
            onClick={() => load(text)}
          >
            Cargar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Los textos admiten Markdown y LaTeX. En JSON las barras invertidas se escriben dobles:{" "}
          <code>{String.raw`"$\\frac{1}{2}$"`}</code>.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle className="line-clamp-none">No se pudo cargar el JSON</AlertTitle>
          <AlertDescription className="text-destructive/90">
            <p>{error.message}</p>
            {error.hint && <p>{error.hint}</p>}
            {error.position != null && text && (
              <Button type="button" variant="outline" size="sm" className="mt-1 cursor-pointer" onClick={goToError}>
                Ir al error
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
