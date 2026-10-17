"use client"

import { useMemo, useRef } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { collectIssues, parseQuizJson, type ImportMode, type ParseError } from "@/lib/quiz-import"

// Pestaña JSON del borrador: textarea monoespaciada con el JSON actual. Al editar, se reparsea con
// retraso (300 ms) y debajo se ve si el JSON es válido (con línea y columna si no lo es), los
// avisos del parseo y cuántos problemas de validación tendrá en el formulario.
//
// Controlado: el contenedor (DraftTabs) pone el texto y decide cuándo pasarlo al formulario.
//   <DraftJsonEditor mode="questions" text={text} onTextChange={setText} blockedError={err} />
// `blockedError` es el error con el que el contenedor ha impedido salir de la pestaña (JSON
// inválido): se muestra destacado sin esperar al retraso.

const PARSE_DELAY_MS = 300

export function DraftJsonEditor({
  mode,
  text,
  onTextChange,
  blockedError,
  className,
}: {
  mode: ImportMode
  text: string
  onTextChange: (text: string) => void
  blockedError?: ParseError | null
  className?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounced = useDebouncedValue(text, PARSE_DELAY_MS)
  const pending = debounced !== text

  const result = useMemo(() => parseQuizJson(debounced, mode), [debounced, mode])
  const issueCount = useMemo(() => (result.error ? 0 : collectIssues(result.draft, mode).length), [result, mode])
  const error = result.error ?? null

  const goTo = (target: ParseError) => {
    const textarea = textareaRef.current
    if (!textarea || target.position == null) return
    textarea.focus()
    textarea.setSelectionRange(target.position, Math.min(target.position + 1, textarea.value.length))
    // Lleva la línea del error a la vista: el textarea no se desplaza solo al seleccionar.
    const line = (target.line ?? 1) - 1
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 16
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 2)
  }

  const shown = blockedError ?? (pending ? null : error)

  return (
    <div className={className}>
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        aria-label="JSON del borrador"
        aria-invalid={shown != null}
        className="max-h-[70vh] min-h-96 resize-y overflow-auto font-mono text-xs leading-relaxed whitespace-pre"
      />

      <div className="mt-3 space-y-3" aria-live="polite">
        {shown ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle className="line-clamp-none">
              {blockedError ? "Corrige el JSON para volver al formulario" : "JSON no válido"}
            </AlertTitle>
            <AlertDescription className="text-destructive/90">
              <p>{shown.message}</p>
              {shown.hint && <p>{shown.hint}</p>}
              {shown.position != null && (
                <Button type="button" variant="outline" size="sm" className="mt-1 cursor-pointer" onClick={() => goTo(shown)}>
                  Ir al error
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ) : !pending && result.draft ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>
              JSON válido · {result.draft.questions.length} {result.draft.questions.length === 1 ? "pregunta" : "preguntas"}
            </span>
            {issueCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                · {issueCount} {issueCount === 1 ? "problema" : "problemas"} de validación (los verás en el formulario)
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Comprobando…</p>
        )}

        {!pending && result.warnings && result.warnings.length > 0 && (
          <Alert>
            <Info />
            <AlertTitle className="line-clamp-none">Avisos al leer el JSON</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-0.5 pl-4">
                {result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
