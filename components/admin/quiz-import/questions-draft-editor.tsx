"use client"

import { memo, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, Plus, RotateCcw, Trash, X } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  CLAMPED_RICH_TEXT_CLASS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
} from "@/components/admin/quiz-editor/constants"
import { Segmented } from "@/components/admin/quiz-editor/segmented"
import { SortableList, SortableRow } from "@/components/admin/quiz-editor/sortable"
import { RichText, RichTextEditor } from "@/components/rich-text"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  collectQuestionIssues,
  newQuestionDraft,
  trueFalseOptions,
  type DraftIssue,
  type QuestionType,
  type QuizDraft,
} from "@/lib/quiz-import"
import { cn } from "@/lib/utils"

// Editor de la lista de preguntas de un borrador de importación (QuizDraft), conectado a un form de
// react-hook-form. Vive DENTRO de un <FormProvider> (useFormContext) y no recibe `control` por
// props: las tarjetas, el cuerpo y las filas de opciones están a 3-4 niveles y todos necesitan el
// control; el contexto evita pasarlo por cada uno y deja el uso en una línea:
//
//   const form = useForm<QuizDraft>({ resolver: zodResolver(quizDraftSchema(mode)), defaultValues: draft })
//   <FormProvider {...form}><QuestionsDraftEditor ref={editorRef} /></FormProvider>
//
// Cada pregunta es una tarjeta plegable. Los editores (RichTextEditor, uno por enunciado, opción y
// explicación) SOLO se montan al desplegar la tarjeta: con 50 preguntas no hay cientos de textareas
// ni de previsualizaciones KaTeX. Las tarjetas con problemas salen desplegadas (hasta
// MAX_AUTO_OPEN, para no montarlas todas si el JSON está lleno de errores). Las tarjetas son
// `memo` y leen su pregunta con `useWatch`: teclear en una solo repinta esa tarjeta.
//
// Se reordenan arrastrando el asa (dnd-kit, como el editor de cuestionarios; también con teclado) o
// con los botones subir/bajar, que sirven en táctil y para listas largas.
// `ref` (React 19, como prop) expone `focusQuestion(index)`: despliega y lleva a esa pregunta.

const MAX_AUTO_OPEN = 10
const TYPE_OPTIONS = QUESTION_TYPES.map((type) => ({ value: type, label: QUESTION_TYPE_LABEL[type] }))

export interface QuestionsDraftEditorHandle {
  /** Despliega la pregunta (índice 0-based) y se desplaza hasta ella. */
  focusQuestion: (index: number) => void
}

const cardDomId = (fieldId: string) => `draft-question-${fieldId}`
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// "Pregunta 3 · opción 2" + "el texto está vacío" → "Opción 2: el texto está vacío" (dentro de la
// pregunta ya se sabe cuál es). Los de la pregunta entera → "Falta marcar la respuesta correcta".
function issueText(issue: DraftIssue) {
  const where = issue.label.split(" · ")[1]
  return where ? `${capitalize(where)}: ${issue.message}` : capitalize(issue.message)
}

/* ------------------------------------------------------------------ */
/* Cuerpo de una pregunta (solo montado al desplegar)                  */
/* ------------------------------------------------------------------ */

function QuestionBody({ index, issues }: { index: number; issues: DraftIssue[] }) {
  const { control, setValue, setFocus } = useFormContext<QuizDraft>()
  const { fields, append, remove, replace } = useFieldArray({ control, name: `questions.${index}.options` })
  const type = useWatch({ control, name: `questions.${index}.type` })
  const options = useWatch({ control, name: `questions.${index}.options` })
  const baseId = useId()

  const isTrueFalse = type === "TRUE_FALSE"

  const changeType = (next: QuestionType) => {
    if (next === type) return
    setValue(`questions.${index}.type`, next, { shouldDirty: true })
    // Verdadero/Falso son siempre dos opciones: se sustituyen las que hubiera (sin correcta marcada).
    if (next === "TRUE_FALSE") replace(trueFalseOptions())
  }

  const markCorrect = (target: number) => {
    fields.forEach((_, j) => setValue(`questions.${index}.options.${j}.correct`, j === target, { shouldDirty: true }))
  }

  return (
    <div className="space-y-5 border-t px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{issueText(issue)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${baseId}-text`}>Enunciado</Label>
        <Controller
          control={control}
          name={`questions.${index}.text`}
          render={({ field }) => (
            <RichTextEditor
              {...field}
              id={`${baseId}-text`}
              variant="full"
              minRows={2}
              aria-invalid={issues.some((issue) => issue.path[2] === "text")}
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <Label>Tipo de pregunta</Label>
        <Segmented
          label="Tipo de pregunta"
          value={type ?? null}
          onChange={changeType}
          options={TYPE_OPTIONS}
          className="w-fit"
        />
      </div>

      <div className="grid gap-2">
        <Label>Opciones</Label>
        <p className="-mt-1 text-xs text-muted-foreground">
          {isTrueFalse
            ? "Verdadero/Falso tiene exactamente 2 opciones. Pulsa el círculo de la correcta."
            : "Pulsa el círculo de la respuesta correcta. Intro pasa a la siguiente opción (o crea una); Mayús+Intro es salto de línea."}
        </p>
        <div role="radiogroup" aria-label="Opciones de respuesta" className="space-y-2">
          {fields.map((field, j) => {
            const correct = options?.[j]?.correct === true
            const invalid = issues.some((issue) => issue.path[2] === "options" && issue.path[3] === j)
            return (
              <div
                key={field.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg border bg-background py-1.5 pl-2 pr-1.5",
                  correct && "border-green-500/60 bg-green-500/5",
                  invalid && "border-destructive/50",
                )}
              >
                {/* El radio y la X bajan para quedar a la altura de la primera línea de texto: encima del
                    textarea va la barra de formato compacta (h-6 + gap-1.5). */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={correct}
                  aria-label={`Marcar la opción ${j + 1} como correcta`}
                  onClick={() => markCorrect(j)}
                  className={cn(
                    "mt-[2.1875rem] flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
                    correct
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/40 text-transparent hover:border-green-500 hover:text-green-500/60",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <Controller
                  control={control}
                  name={`questions.${index}.options.${j}.text`}
                  render={({ field: textField }) => (
                    <RichTextEditor
                      {...textField}
                      variant="compact"
                      placeholder={`Opción ${j + 1}`}
                      aria-label={`Texto de la opción ${j + 1}`}
                      aria-invalid={invalid && !textField.value.trim()}
                      className="min-w-0 flex-1"
                      textareaClassName="border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-input focus-visible:bg-background"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
                        event.preventDefault()
                        if (j < fields.length - 1) setFocus(`questions.${index}.options.${j + 1}.text`)
                        else if (!isTrueFalse) append({ text: "", correct: false })
                      }}
                    />
                  )}
                />
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-[1.9375rem] h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar la opción ${j + 1}`}
                    onClick={() => remove(j)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isTrueFalse && (
            <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => append({ text: "", correct: false })}>
              <Plus className="h-4 w-4" />
              Añadir opción
            </Button>
          )}
          {isTrueFalse && fields.length !== 2 && (
            <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => replace(trueFalseOptions())}>
              <RotateCcw className="h-4 w-4" />
              Restablecer a Verdadero / Falso
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${baseId}-explanation`}>Explicación (opcional)</Label>
        <Controller
          control={control}
          name={`questions.${index}.explanation`}
          render={({ field }) => (
            <RichTextEditor
              {...field}
              id={`${baseId}-explanation`}
              variant="full"
              minRows={2}
              placeholder="Se muestra al corregir, tanto si acierta como si falla."
            />
          )}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tarjeta de pregunta                                                 */
/* ------------------------------------------------------------------ */

interface QuestionCardProps {
  id: string
  index: number
  total: number
  open: boolean
  onToggle: (id: string) => void
  onMove: (index: number, delta: -1 | 1) => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
}

const QuestionCard = memo(function QuestionCard({
  id,
  index,
  total,
  open,
  onToggle,
  onMove,
  onDuplicate,
  onRemove,
}: QuestionCardProps) {
  const { control } = useFormContext<QuizDraft>()
  const question = useWatch({ control, name: `questions.${index}` })
  const issues = useMemo(() => (question ? collectQuestionIssues(question, index) : []), [question, index])
  const hasIssues = issues.length > 0
  const number = index + 1

  return (
    <SortableRow id={id} label={`pregunta ${number}`}>
      {({ handle, dragging }) => (
        <div
          id={cardDomId(id)}
          className={cn(
            "scroll-mt-24 rounded-xl border bg-card shadow-sm transition-shadow",
            open && !hasIssues && "ring-1 ring-purple-500/30",
            hasIssues && "border-destructive/50 ring-1 ring-destructive/20",
            dragging && "shadow-xl",
          )}
        >
          <div className="flex items-center gap-0.5 p-1.5 pr-2 sm:gap-1 sm:p-2 sm:pr-3">
            {handle}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggle(id)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:gap-3 sm:px-2"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                  hasIssues
                    ? "bg-destructive/15 text-destructive"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-100",
                )}
              >
                {number}
              </span>
              <span className="min-w-0 flex-1">
                {/* Recortado a 2 líneas; una fórmula en bloque se corta por el overflow-hidden del clamp. */}
                <span className="line-clamp-2 overflow-hidden font-medium">
                  {question?.text?.trim() ? (
                    <RichText variant="compact" interactive={false} content={question.text} className={CLAMPED_RICH_TEXT_CLASS} />
                  ) : (
                    <span className="font-normal italic text-muted-foreground">Sin enunciado</span>
                  )}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{question?.type ? QUESTION_TYPE_LABEL[question.type] : "Sin tipo"}</span>
                  <span>
                    {question?.options?.length ?? 0} {question?.options?.length === 1 ? "opción" : "opciones"}
                  </span>
                  {hasIssues ? (
                    <span className="inline-flex items-center gap-1 font-medium text-destructive" title={issues.map(issueText).join("\n")}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {issues.length === 1 ? "1 problema" : `${issues.length} problemas`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Lista
                    </span>
                  )}
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 cursor-pointer text-muted-foreground sm:inline-flex"
              aria-label={`Subir la pregunta ${number}`}
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 cursor-pointer text-muted-foreground sm:inline-flex"
              aria-label={`Bajar la pregunta ${number}`}
              disabled={index === total - 1}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
              aria-label={`Duplicar la pregunta ${number}`}
              onClick={() => onDuplicate(index)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
              aria-label={`Eliminar la pregunta ${number}`}
              onClick={() => onRemove(index)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>

          {/* La clave incluye el índice: si la pregunta cambia de sitio, el cuerpo se remonta y su
              useFieldArray anidado apunta a la ruta nueva. */}
          {open && (
            <>
              <QuestionBody key={`${id}:${index}`} index={index} issues={issues} />
              {/* En móvil no caben subir/bajar en la cabecera: aquí. */}
              <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 sm:px-5">
                <div className="flex gap-1 sm:invisible">
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" disabled={index === 0} onClick={() => onMove(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                    Subir
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" disabled={index === total - 1} onClick={() => onMove(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                    Bajar
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => onToggle(id)}>
                  <ChevronUp className="h-4 w-4" />
                  Plegar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </SortableRow>
  )
})

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

function DraftSummary({ onJump }: { onJump: (index: number) => void }) {
  const { control } = useFormContext<QuizDraft>()
  const questions = useWatch({ control, name: "questions" })
  const withIssues = useMemo(
    () => (questions ?? []).flatMap((question, i) => (collectQuestionIssues(question, i).length > 0 ? [i] : [])),
    [questions],
  )
  const total = questions?.length ?? 0

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-live="polite">
      <span className="font-medium">
        {total} {total === 1 ? "pregunta" : "preguntas"}
      </span>
      <span aria-hidden className="text-muted-foreground">
        ·
      </span>
      {withIssues.length > 0 ? (
        <>
          <span className="inline-flex items-center gap-1 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {withIssues.length} con problemas
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {withIssues.slice(0, 24).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Ir a la pregunta ${i + 1}`}
                className="inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-md bg-destructive/10 px-1.5 text-xs font-semibold tabular-nums text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {i + 1}
              </button>
            ))}
            {withIssues.length > 24 && <span className="text-xs text-muted-foreground">…</span>}
          </span>
        </>
      ) : total > 0 ? (
        <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Sin problemas
        </span>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function QuestionsDraftEditor({
  className,
  ref,
}: {
  className?: string
  /** React 19: ref como prop. */
  ref?: React.Ref<QuestionsDraftEditorHandle>
}) {
  const { control, getValues } = useFormContext<QuizDraft>()
  const { fields, append, insert, move, remove } = useFieldArray({ control, name: "questions" })
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  // Al arrastrar, las tarjetas abiertas (muy altas) se pliegan y al soltar se restauran.
  const openBeforeDrag = useRef<Set<string> | null>(null)
  // Tarjetas ya evaluadas para el auto-despliegue (por id de campo).
  const seenIds = useRef(new Set<string>())
  // Índice de la pregunta recién creada/duplicada, para desplegarla cuando aparezca en `fields`.
  const pendingOpen = useRef<number | null>(null)

  // Última lista de campos, para los callbacks estables de las tarjetas (memo) sin recrearlos.
  const fieldsRef = useRef(fields)
  useEffect(() => {
    fieldsRef.current = fields
  }, [fields])

  const scrollToCard = useCallback((fieldId: string) => {
    // Dos frames: el primero monta el cuerpo desplegado, el segundo ya tiene la altura final.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(cardDomId(fieldId))?.scrollIntoView({ behavior: "smooth", block: "start" }),
      ),
    )
  }, [])

  const openCard = useCallback((fieldId: string) => {
    setOpenIds((prev) => (prev.has(fieldId) ? prev : new Set(prev).add(fieldId)))
  }, [])

  const focusQuestion = useCallback(
    (index: number) => {
      const id = fieldsRef.current[index]?.id
      if (!id) return
      openCard(id)
      scrollToCard(id)
    },
    [openCard, scrollToCard],
  )

  useImperativeHandle(ref, () => ({ focusQuestion }), [focusQuestion])

  // Las preguntas con problemas salen desplegadas (las primeras MAX_AUTO_OPEN de las nuevas).
  useEffect(() => {
    const toOpen: string[] = []
    fields.forEach((field, i) => {
      if (seenIds.current.has(field.id)) return
      seenIds.current.add(field.id)
      const question = getValues(`questions.${i}`)
      if (question && toOpen.length < MAX_AUTO_OPEN && collectQuestionIssues(question, i).length > 0) toOpen.push(field.id)
    })
    if (toOpen.length > 0) setOpenIds((prev) => new Set([...prev, ...toOpen]))
  }, [fields, getValues])

  useEffect(() => {
    const index = pendingOpen.current
    if (index == null) return
    pendingOpen.current = null
    const id = fields[index]?.id
    if (!id) return
    openCard(id)
    scrollToCard(id)
  }, [fields, openCard, scrollToCard])

  const handleToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const handleMove = useCallback((index: number, delta: -1 | 1) => move(index, index + delta), [move])

  const handleDuplicate = useCallback(
    (index: number) => {
      const copy = structuredClone(getValues(`questions.${index}`))
      pendingOpen.current = index + 1
      insert(index + 1, copy, { shouldFocus: false })
    },
    [getValues, insert],
  )

  const handleRequestRemove = useCallback(
    (index: number) => {
      const question = getValues(`questions.${index}`)
      const empty =
        !question?.text?.trim() &&
        !question?.explanation?.trim() &&
        (question?.options ?? []).every((option) => !option.text.trim())
      // Una pregunta vacía se quita sin preguntar; con contenido, se confirma.
      if (empty) remove(index)
      else setRemoveIndex(index)
    },
    [getValues, remove],
  )

  const handleAdd = () => {
    pendingOpen.current = fields.length
    append(newQuestionDraft(), { shouldFocus: false })
  }

  const handleReorder = (activeId: string, overId: string) => {
    const from = fields.findIndex((field) => field.id === activeId)
    const to = fields.findIndex((field) => field.id === overId)
    if (from >= 0 && to >= 0) move(from, to)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <DraftSummary onJump={focusQuestion} />

      {fields.length > 0 ? (
        <SortableList
          ids={fields.map((field) => field.id)}
          onReorder={handleReorder}
          onDragStart={() => {
            openBeforeDrag.current = openIds
            setOpenIds(new Set())
          }}
          onDragFinish={() => {
            if (openBeforeDrag.current) setOpenIds(openBeforeDrag.current)
            openBeforeDrag.current = null
          }}
        >
          <div className="space-y-3">
            {fields.map((field, index) => (
              <QuestionCard
                key={field.id}
                id={field.id}
                index={index}
                total={fields.length}
                open={openIds.has(field.id)}
                onToggle={handleToggle}
                onMove={handleMove}
                onDuplicate={handleDuplicate}
                onRemove={handleRequestRemove}
              />
            ))}
          </div>
        </SortableList>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay preguntas. Añade la primera o cambia el JSON de origen.
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm font-medium text-muted-foreground transition-colors hover:border-purple-500/60 hover:bg-purple-500/5 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Añadir pregunta
      </button>

      <ConfirmDialog
        open={removeIndex != null}
        onOpenChange={(open) => !open && setRemoveIndex(null)}
        title={`¿Eliminar la pregunta ${(removeIndex ?? 0) + 1}?`}
        description="Se quita del borrador (no se ha importado nada todavía). Esta acción no se puede deshacer."
        onConfirm={() => {
          if (removeIndex != null) remove(removeIndex)
          setRemoveIndex(null)
        }}
      />
    </div>
  )
}
