"use client"

import { useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { AlertTriangle, CheckCircle2, Eye, Loader2, Plus, RefreshCw } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DraftTabs, type DraftTabsHandle } from "@/components/admin/quiz-import/draft-tabs"
import { JsonSourcePicker } from "@/components/admin/quiz-import/json-source-picker"
import { ParseWarnings } from "@/components/admin/quiz-import/parse-warnings"
import { useBeforeUnloadWarning, useDraftSubmit } from "@/components/admin/quiz-import/use-draft-submit"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useImportQuestions } from "@/hooks/api/use-quizzes"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import type { QuestionDto } from "@/lib/api/questions"
import { collectIssues, draftQuestionsToExportable, quizDraftSchema, type QuizDraft } from "@/lib/quiz-import"

// Panel lateral "Añadir preguntas desde JSON" del editor de un cuestionario existente
// (`POST /quiz/{id}/questions/import`: añade al final, todo o nada, no cambia la visibilidad).
//
// Es un Sheet y no un Dialog porque se editan varias preguntas largas (enunciado, opciones,
// explicación con Markdown/LaTeX): necesita altura completa con scroll propio y un pie fijo con el
// resumen y el botón, y es el mismo patrón que `PdfSheet`. En móvil ocupa toda la pantalla.
//
// Paso 1: elegir el JSON (JsonSourcePicker). Paso 2: editar el borrador (DraftTabs, formulario o
// JSON) y añadir. Se monta el formulario al cargar y se descarta al cerrar, así cada apertura
// empieza limpia. Los 400 del back llegan sin cuerpo: se valida antes con las mismas reglas.

interface LoadedDraft {
  draft: QuizDraft
  warnings: string[]
  /** Cambia en cada carga: reinicia el formulario (defaultValues solo se leen al montar). */
  key: number
}

function QuestionsWorkspace({
  initial,
  warnings,
  quizId,
  existingCount,
  published,
  onChangeSource,
  onCancel,
  onDone,
}: {
  initial: QuizDraft
  warnings: string[]
  quizId: number
  /** Preguntas que ya tiene el cuestionario (las nuevas van detrás). */
  existingCount: number
  /** Visible para los alumnos: lo añadido se ve al instante. */
  published: boolean
  onChangeSource: () => void
  onCancel: () => void
  onDone: (created: QuestionDto[]) => void
}) {
  const toast = useToast()
  const importQuestions = useImportQuestions()
  const tabsRef = useRef<DraftTabsHandle>(null)
  const [confirmChange, setConfirmChange] = useState(false)

  const form = useForm<QuizDraft>({ resolver: zodResolver(quizDraftSchema("questions")), defaultValues: initial })
  const draft = useWatch({ control: form.control }) as QuizDraft
  const issues = collectIssues(draft, "questions")
  const count = draft.questions?.length ?? 0

  const { submit } = useDraftSubmit({
    form,
    mode: "questions",
    tabsRef,
    jumpToIssue: (issue) => tabsRef.current?.focusIssue(issue),
    onValid: async (values) => {
      try {
        const created = await importQuestions.mutateAsync({
          quizId,
          questions: draftQuestionsToExportable(values.questions),
        })
        toast.success(
          `${created.length === 1 ? "Pregunta añadida" : `${created.length} preguntas añadidas`}${
            published ? ": ya las ven los alumnos." : "."
          }`,
        )
        onDone(created)
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "No se pudieron añadir las preguntas.")
      }
    },
  })

  const requestChangeSource = () => {
    if (form.formState.isDirty || tabsRef.current?.hasUnsyncedChanges()) setConfirmChange(true)
    else onChangeSource()
  }

  const pending = importQuestions.isPending
  const where =
    existingCount > 0
      ? `al final (después de la pregunta ${existingCount})`
      : "como primeras preguntas del cuestionario"

  return (
    <FormProvider {...form}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <ParseWarnings warnings={warnings} />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={requestChangeSource}>
            <RefreshCw className="h-4 w-4" />
            Cambiar JSON
          </Button>
        </div>
        <DraftTabs ref={tabsRef} mode="questions" />
      </div>

      {/* Pie fijo: qué se va a hacer, qué falta y el botón. */}
      <div className="space-y-3 border-t bg-background p-4">
        {published && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Este cuestionario está publicado: las preguntas serán visibles para los alumnos al momento.</span>
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-muted-foreground">
              {count === 0
                ? "No hay preguntas que añadir."
                : `${count === 1 ? "1 pregunta se añadirá" : `${count} preguntas se añadirán`} ${where}.`}
            </p>
            {issues.length === 0 ? (
              count > 0 && (
                <p className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Todo correcto
                </p>
              )
            ) : (
              <button
                type="button"
                onClick={() => tabsRef.current?.focusIssue(issues[0])}
                className="flex max-w-full cursor-pointer items-start gap-1.5 text-left text-amber-600 hover:underline dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {issues.length === 1 ? "Falta 1 cosa" : `Faltan ${issues.length} cosas`}: {issues[0].full}
                </span>
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button type="button" variant="ghost" className="cursor-pointer" disabled={pending} onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              variant={issues.length === 0 && count > 0 ? "default" : "outline"}
              // Con problemas no se deshabilita: al pulsar lleva al primero (y se entiende por qué no añade).
              aria-disabled={issues.length > 0}
              disabled={pending || count === 0}
              onClick={() => void submit()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Añadiendo…" : count === 1 ? "Añadir 1 pregunta" : `Añadir ${count} preguntas`}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmChange}
        onOpenChange={setConfirmChange}
        title="¿Cambiar el JSON?"
        description="Has editado el borrador y esos cambios se perderán."
        confirmLabel="Cambiar JSON"
        onConfirm={() => {
          setConfirmChange(false)
          onChangeSource()
        }}
      />
    </FormProvider>
  )
}

export function ImportQuestionsSheet({
  open,
  onOpenChange,
  quizId,
  existingCount,
  published,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quizId: number
  existingCount: number
  published: boolean
  /** Preguntas recién creadas (con id), p. ej. para llevar a la primera. */
  onImported?: (created: QuestionDto[]) => void
}) {
  const [loaded, setLoaded] = useState<LoadedDraft | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const loadCount = useRef(0)

  // Al abrir se empieza de cero (se resetea durante el render, no al cerrar, para no ver el paso 1
  // un instante mientras el panel se desliza hacia fuera).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setLoaded(null)
  }

  // Aviso del navegador al cerrar/recargar con un borrador sin añadir.
  useBeforeUnloadWarning(open && loaded != null)

  const close = () => {
    setConfirmClose(false)
    onOpenChange(false)
  }
  // Con borrador cargado se pide confirmación (Esc, clic fuera, la X y "Cancelar" pasan por aquí).
  const requestClose = () => (loaded ? setConfirmClose(true) : close())

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <SheetContent className="w-full gap-0 sm:max-w-3xl">
          <SheetHeader className="pr-12">
            <SheetTitle>Importar preguntas desde JSON</SheetTitle>
            <SheetDescription>
              {loaded
                ? "Revisa y edita las preguntas. No se añade nada hasta que pulses Añadir."
                : "Carga un JSON con preguntas (o un cuestionario completo) y se añadirán al final de este."}
            </SheetDescription>
          </SheetHeader>
          {loaded ? (
            <QuestionsWorkspace
              key={loaded.key}
              initial={loaded.draft}
              warnings={loaded.warnings}
              quizId={quizId}
              existingCount={existingCount}
              published={published}
              onChangeSource={() => setLoaded(null)}
              onCancel={requestClose}
              onDone={(created) => {
                close()
                onImported?.(created)
              }}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <JsonSourcePicker
                mode="questions"
                onLoaded={(draft, warnings) => setLoaded({ draft, warnings, key: ++loadCount.current })}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="¿Cerrar sin añadir las preguntas?"
        description="El borrador no se ha enviado y se perderá."
        confirmLabel="Cerrar"
        onConfirm={close}
      />
    </>
  )
}
