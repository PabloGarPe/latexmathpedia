"use client"

import Link from "next/link"
import { Suspense, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch, type Control } from "react-hook-form"
import { AlertTriangle, ArrowLeft, CheckCircle2, FileJson, Loader2, RefreshCw, Upload } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DifficultyPicker } from "@/components/admin/difficulty-picker"
import { DraftTabs, type DraftTabsHandle } from "@/components/admin/quiz-import/draft-tabs"
import { JsonSourcePicker } from "@/components/admin/quiz-import/json-source-picker"
import { ParseWarnings } from "@/components/admin/quiz-import/parse-warnings"
import { useBeforeUnloadWarning, useDraftSubmit } from "@/components/admin/quiz-import/use-draft-submit"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useImportQuiz } from "@/hooks/api/use-quizzes"
import { useSubjects, useSubjectUnits } from "@/hooks/api/use-subjects"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import {
  DESCRIPTION_MAX,
  QUIZ_JSON_TEMPLATE,
  collectIssues,
  draftToExportable,
  parseQuizJson,
  quizDraftSchema,
  type DraftIssue,
  type QuizDraft,
} from "@/lib/quiz-import"
import { cn, isInternalPath } from "@/lib/utils"

const QUIZZES_HREF = "/dashboard/admin/quizzes"

const positiveInt = (value: string | null) => {
  const parsed = Number(value)
  return value != null && Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

// Solo rutas internas del dashboard: evita que `?returnTo=` sirva de redirección abierta.
const safeReturnTo = (value: string | null) =>
  isInternalPath(value) && value.startsWith("/dashboard") ? value : null

// Elemento de la lista "qué falta": o un problema del borrador, o la asignatura sin elegir.
type Pending = { kind: "issue"; issue: DraftIssue } | { kind: "subject" }
const pendingText = (item: Pending) => (item.kind === "issue" ? item.issue.full : "Selecciona una asignatura")

/* ------------------------------------------------------------------ */
/* Datos del cuestionario (tarjeta lateral)                            */
/* ------------------------------------------------------------------ */

function DescriptionCounter({ control }: { control: Control<QuizDraft> }) {
  const description = useWatch({ control, name: "description" }) ?? ""
  const length = description.trim().length
  return (
    <span className={cn("text-xs tabular-nums text-muted-foreground", length > DESCRIPTION_MAX && "font-medium text-destructive")}>
      {length}/{DESCRIPTION_MAX}
    </span>
  )
}

function ImportActions({
  control,
  subjectId,
  variant,
  attempted,
  pending,
  publish,
  onImport,
  onJump,
}: {
  control: Control<QuizDraft>
  subjectId: number | null
  variant: "card" | "bar"
  attempted: boolean
  pending: boolean
  publish: boolean
  onImport: () => void
  onJump: (item: Pending) => void
}) {
  const draft = useWatch({ control }) as QuizDraft
  const items: Pending[] = [
    ...(subjectId == null ? [{ kind: "subject" } as const] : []),
    ...collectIssues(draft, "quiz").map((issue): Pending => ({ kind: "issue", issue })),
  ]
  const ready = items.length === 0
  const label = publish ? "Importar y publicar" : "Importar"

  const button = (
    <Button
      type="button"
      variant={ready ? "default" : "outline"}
      className={cn("cursor-pointer", variant === "card" ? "w-full" : "shrink-0")}
      // Con problemas no se deshabilita: al pulsar lleva al primero (y se entiende por qué no importa).
      aria-disabled={!ready}
      disabled={pending}
      onClick={onImport}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {pending ? "Importando…" : label}
    </Button>
  )

  if (variant === "bar") {
    return (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={ready}
          onClick={() => onJump(items[0])}
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-left text-sm",
            ready ? "text-green-600 dark:text-green-400" : "cursor-pointer text-amber-600 dark:text-amber-400",
          )}
        >
          {ready ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span className="truncate">{ready ? "Listo para importar" : `Faltan ${items.length} cosas`}</span>
        </button>
        {button}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {ready ? (
        <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Todo correcto: listo para importar.
        </p>
      ) : (
        <div className={cn("rounded-lg border px-3 py-2 text-sm", attempted ? "border-destructive/40 bg-destructive/5" : "bg-muted/40")}>
          <p className={cn("flex items-center gap-2 font-medium", attempted ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {items.length === 1 ? "Falta 1 cosa por resolver" : `Faltan ${items.length} cosas por resolver`}
          </p>
          <ul className="mt-1.5 space-y-1">
            {items.slice(0, 5).map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onJump(item)}
                  className="cursor-pointer text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {pendingText(item)}
                </button>
              </li>
            ))}
            {items.length > 5 && <li className="text-muted-foreground">…y {items.length - 5} más</li>}
          </ul>
        </div>
      )}
      {button}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Paso 2: edición del borrador                                        */
/* ------------------------------------------------------------------ */

function ImportWorkspace({
  initial,
  warnings,
  initialSubjectId,
  initialSubjectUnitId,
  importedRef,
  onChangeSource,
}: {
  initial: QuizDraft
  warnings: string[]
  initialSubjectId: number | null
  initialSubjectUnitId: number | null
  /** Se pone a true al importar, para que el aviso de salida no salte en la navegación posterior. */
  importedRef: React.RefObject<boolean>
  onChangeSource: () => void
}) {
  const toast = useToast()
  const router = useRouter()
  const importQuiz = useImportQuiz()
  const tabsRef = useRef<DraftTabsHandle>(null)

  const form = useForm<QuizDraft>({ resolver: zodResolver(quizDraftSchema("quiz")), defaultValues: initial })
  const { register, setValue, setFocus, control, formState } = form
  // Se vigilan los tres campos del lateral para repintar sus errores y el nombre mientras se teclea.
  const [currentName, , difficulty] = useWatch({ control, name: ["name", "description", "difficulty"] })

  // Ubicación y publicación no son contenido del JSON: viven aparte del borrador.
  const [pickedSubjectId, setSubjectId] = useState<number | null>(initialSubjectId)
  const [pickedUnitId, setSubjectUnitId] = useState<number | null>(initialSubjectUnitId)
  const [publish, setPublish] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState<QuizDraft | null>(null)
  const [confirmChange, setConfirmChange] = useState(false)

  // Un ?subjectId=/?subjectUnitId= que ya no existe se descarta en vez de fallar al importar (se
  // deriva en cada render, sin copiar a estado, y solo una vez cargados los listados).
  const { data: subjects } = useSubjects()
  const subjectId =
    subjects && pickedSubjectId != null && !subjects.some((subject) => subject.id === pickedSubjectId) ? null : pickedSubjectId
  const { data: units } = useSubjectUnits(subjectId)
  const subjectUnitId =
    subjectId == null || (units && pickedUnitId != null && !units.some((unit) => unit.id === pickedUnitId)) ? null : pickedUnitId

  const nameIssue = (path: string) => (attempted ? collectIssues(form.getValues(), "quiz").find((i) => i.path[0] === path) : undefined)

  const jumpTo = (item: Pending) => {
    if (item.kind === "subject") {
      document.getElementById("import-location")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    const { issue } = item
    if (issue.questionIndex != null) {
      tabsRef.current?.focusIssue(issue)
      return
    }
    const field = issue.path[0]
    if (field === "name" || field === "description") setFocus(field)
    else if (field === "difficulty") document.getElementById("import-difficulty")?.scrollIntoView({ behavior: "smooth", block: "center" })
    else document.getElementById("import-editor")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const doImport = async (values: QuizDraft) => {
    try {
      const created = await importQuiz.mutateAsync({
        subjectId: subjectId as number,
        subjectUnitId,
        publish,
        body: draftToExportable(values),
      })
      importedRef.current = true
      toast.success(
        publish
          ? "Importado y publicado. Se ha notificado a los usuarios."
          : "Importado como oculto. Revísalo y publícalo cuando esté listo.",
      )
      router.push(`${QUIZZES_HREF}/${created.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo importar el cuestionario.")
    }
  }

  // Validar + saltar al primer problema + pasar el JSON al form: común con "Añadir preguntas" del editor.
  const { attempted, submit: handleImport } = useDraftSubmit({
    form,
    mode: "quiz",
    tabsRef,
    jumpToIssue: (issue) => jumpTo({ kind: "issue", issue }),
    onValid: (values) => {
      if (subjectId == null) {
        jumpTo({ kind: "subject" })
        return
      }
      // Publicar notifica a TODOS los usuarios y no se deshace: pide confirmación.
      if (publish) setConfirmPublish(values)
      else return doImport(values)
    },
  })

  const requestChangeSource = () => {
    if (formState.isDirty || tabsRef.current?.hasUnsyncedChanges()) setConfirmChange(true)
    else onChangeSource()
  }

  const actionProps = {
    control,
    subjectId,
    attempted,
    pending: importQuiz.isPending,
    publish,
    onImport: () => void handleImport(),
    onJump: jumpTo,
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <ParseWarnings warnings={warnings} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* En móvil la tarjeta de datos va primero (order-first); en desktop, a la derecha y fija. */}
          <aside className="order-first space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-last lg:max-h-[calc(100vh-var(--header-height)-2rem)] lg:overflow-y-auto">
            <Card>
              <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
                <CardTitle className="text-base">Datos del cuestionario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
                <div className="grid gap-2">
                  <Label htmlFor="import-name">Nombre</Label>
                  <Input
                    id="import-name"
                    placeholder="Ej: Test de límites y continuidad"
                    aria-invalid={nameIssue("name") != null}
                    {...register("name")}
                  />
                  {nameIssue("name") && (
                    <p className="text-sm text-destructive">{nameIssue("name")?.full}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="import-description">Descripción (opcional)</Label>
                    <DescriptionCounter control={control} />
                  </div>
                  <Textarea
                    id="import-description"
                    rows={3}
                    placeholder="Qué se evalúa, a quién va dirigido… (texto plano)"
                    className="max-h-48 resize-none"
                    aria-invalid={nameIssue("description") != null}
                    {...register("description")}
                  />
                  {nameIssue("description") && (
                    <p className="text-sm text-destructive">{nameIssue("description")?.full}</p>
                  )}
                </div>

                <div id="import-difficulty" className="grid scroll-mt-24 gap-2">
                  <Label>Dificultad</Label>
                  <DifficultyPicker
                    value={difficulty ?? null}
                    onChange={(value) => setValue("difficulty", value, { shouldDirty: true })}
                  />
                  {nameIssue("difficulty") && (
                    <p className="text-sm text-destructive">{nameIssue("difficulty")?.full}</p>
                  )}
                </div>

                <div id="import-location" className="grid scroll-mt-24 gap-2">
                  <SubjectUnitPicker
                    stacked
                    subjectId={subjectId}
                    subjectUnitId={subjectUnitId}
                    onSubjectChange={(id) => {
                      setSubjectId(id)
                      setSubjectUnitId(null)
                    }}
                    onSubjectUnitChange={setSubjectUnitId}
                  />
                  {attempted && subjectId == null && (
                    <p className="text-sm text-destructive">Selecciona una asignatura</p>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-1">
                    <Label htmlFor="import-publish">Publicar al importar</Label>
                    <p className="text-xs text-muted-foreground">
                      {publish
                        ? "Se publica y se notifica a todos los usuarios al momento."
                        : "Queda oculto: se abre en el editor para que lo revises y lo publiques cuando quieras."}
                    </p>
                  </div>
                  <Switch id="import-publish" checked={publish} onCheckedChange={setPublish} className="mt-0.5" />
                </div>

                <div className="hidden lg:block">
                  <ImportActions {...actionProps} variant="card" />
                </div>
              </CardContent>
            </Card>
          </aside>

          <section id="import-editor" className="min-w-0 scroll-mt-24 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {currentName?.trim() ? <span className="font-medium text-foreground">{currentName.trim()}</span> : "Cuestionario sin nombre"}
              </p>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={requestChangeSource}>
                <RefreshCw className="h-4 w-4" />
                Cambiar JSON
              </Button>
            </div>
            <DraftTabs ref={tabsRef} mode="quiz" />
          </section>
        </div>

        {/* Barra de acción en móvil: siempre a mano mientras se recorre una lista larga. */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <ImportActions {...actionProps} variant="bar" />
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish != null}
        onOpenChange={(open) => !open && setConfirmPublish(null)}
        title="¿Importar y publicar ahora?"
        description="Se publicará al instante y se notificará a todos los usuarios. Si prefieres revisarlo antes, desactiva «Publicar al importar»: se importa oculto."
        confirmLabel="Importar y publicar"
        variant="default"
        onConfirm={() => {
          const values = confirmPublish
          setConfirmPublish(null)
          if (values) void doImport(values)
        }}
      />
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

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

interface LoadedDraft {
  draft: QuizDraft
  warnings: string[]
  /** Cambia en cada carga: reinicia el formulario (defaultValues solo se leen al montar). */
  key: number
}

function ImportQuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const [loaded, setLoaded] = useState<LoadedDraft | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const importedRef = useRef(false)
  const loadCount = useRef(0)

  const subjectId = positiveInt(searchParams.get("subjectId"))
  const subjectUnitId = subjectId != null ? positiveInt(searchParams.get("subjectUnitId")) : null
  const backHref = safeReturnTo(searchParams.get("returnTo")) ?? QUIZZES_HREF

  const load = (draft: QuizDraft, warnings: string[]) => {
    importedRef.current = false
    setLoaded({ draft, warnings, key: ++loadCount.current })
  }

  const startFromTemplate = () => {
    const result = parseQuizJson(QUIZ_JSON_TEMPLATE, "quiz")
    if (result.draft) load(result.draft, [])
  }

  // Aviso del navegador al cerrar/recargar con un borrador sin importar.
  useBeforeUnloadWarning(loaded != null, importedRef)

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }
  if (!isAuthenticated || !isAdmin) return null

  return (
    <PageContainer className="flex flex-col gap-6 p-4 sm:p-8">
      <Link
        href={backHref}
        onClick={(event) => {
          // Dentro de la app no salta `beforeunload`: con borrador se pide confirmación.
          if (loaded && !importedRef.current) {
            event.preventDefault()
            setConfirmLeave(true)
          }
        }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <PageHeader
        className="mb-0"
        title="Importar cuestionario"
        description={
          loaded
            ? "Revisa y edita el borrador. No se crea nada hasta que pulses Importar."
            : "Carga un JSON, revísalo y edítalo antes de importarlo."
        }
      />

      {loaded ? (
        <ImportWorkspace
          key={loaded.key}
          initial={loaded.draft}
          warnings={loaded.warnings}
          initialSubjectId={subjectId}
          initialSubjectUnitId={subjectUnitId}
          importedRef={importedRef}
          onChangeSource={() => setLoaded(null)}
        />
      ) : (
        <Card className="mx-auto max-w-3xl">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <JsonSourcePicker mode="quiz" onLoaded={load} />
            <div className="flex flex-col items-center gap-2 border-t pt-5 text-center">
              <p className="text-sm text-muted-foreground">¿Sin JSON a mano? Empieza con un ejemplo y edítalo.</p>
              <Button type="button" variant="secondary" className="cursor-pointer" onClick={startFromTemplate}>
                <FileJson className="h-4 w-4" />
                Empezar desde la plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="¿Salir sin importar?"
        description="El borrador no se ha importado y se perderá."
        confirmLabel="Salir"
        onConfirm={() => {
          setConfirmLeave(false)
          importedRef.current = true
          router.push(backHref)
        }}
      />
    </PageContainer>
  )
}

// `useSearchParams` en una página prerenderizada exige un límite de Suspense (si no, falla el build).
export default function ImportQuizPage() {
  return (
    <Suspense fallback={<PageContainer />}>
      <ImportQuizContent />
    </Suspense>
  )
}
