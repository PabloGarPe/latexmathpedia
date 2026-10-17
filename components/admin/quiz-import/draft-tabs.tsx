"use client"

import { useImperativeHandle, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import { DraftJsonEditor } from "@/components/admin/quiz-import/draft-json-editor"
import {
  QuestionsDraftEditor,
  type QuestionsDraftEditorHandle,
} from "@/components/admin/quiz-import/questions-draft-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  draftToJson,
  parseQuizJson,
  type DraftIssue,
  type ImportMode,
  type ParseError,
  type QuizDraft,
} from "@/lib/quiz-import"

// Contenedor "Formulario | JSON" del borrador, reutilizable en ambos modos. Debe estar dentro de un
// <FormProvider> de QuizDraft (lo usan QuestionsDraftEditor y este para leer/resetear el form).
//
//   <FormProvider {...form}><DraftTabs ref={tabsRef} mode="quiz" /></FormProvider>
//
// Sincronización:
//  - Formulario → JSON: al abrir la pestaña se serializa el estado actual del form.
//  - JSON → Formulario: si el JSON es válido se hace `reset` del form con el borrador nuevo (con
//    keepDefaultValues, así `formState.isDirty` sigue comparando con el borrador original); si no, se
//    impide el cambio y se muestra el error. Si el texto no se tocó, no se resetea (se conservan las
//    tarjetas desplegadas). En mode "questions" el reset solo cambia las preguntas.
//
// Mientras se está en la pestaña JSON el form puede ir por detrás del texto: antes de leer el form
// (importar) hay que llamar a `commit()`, que lo pasa al form y devuelve false si el JSON no vale.
// `ref` (React 19, como prop) expone esa API.

export interface DraftTabsHandle {
  /** Pasa el JSON al formulario si se está en la pestaña JSON. false si el JSON no es válido. */
  commit: () => boolean
  /** true si en la pestaña JSON hay texto editado que todavía no está en el formulario. */
  hasUnsyncedChanges: () => boolean
  /** Despliega y lleva a la pregunta del problema (volviendo antes al formulario si hace falta). */
  focusIssue: (issue: DraftIssue) => void
}

type Tab = "form" | "json"

export function DraftTabs({
  mode,
  className,
  ref,
}: {
  mode: ImportMode
  className?: string
  /** React 19: ref como prop. */
  ref?: React.Ref<DraftTabsHandle>
}) {
  const { getValues, reset } = useFormContext<QuizDraft>()
  const editorRef = useRef<QuestionsDraftEditorHandle>(null)
  const [tab, setTab] = useState<Tab>("form")
  const [jsonText, setJsonText] = useState("")
  // Texto con el que se entró en la pestaña JSON: si no cambia, volver no resetea nada.
  const baseline = useRef("")
  const [blockedError, setBlockedError] = useState<ParseError | null>(null)

  const goToJson = () => {
    const text = draftToJson(getValues(), mode)
    baseline.current = text
    setJsonText(text)
    setBlockedError(null)
    setTab("json")
  }

  // Devuelve false (y se queda en JSON) si el texto no es válido.
  const goToForm = (): boolean => {
    if (jsonText !== baseline.current) {
      const result = parseQuizJson(jsonText, mode)
      if (result.error) {
        setBlockedError(result.error)
        return false
      }
      reset(mode === "quiz" ? result.draft : { ...getValues(), questions: result.draft.questions }, {
        keepDefaultValues: true,
      })
      baseline.current = jsonText
    }
    setBlockedError(null)
    setTab("form")
    return true
  }

  const handleTabChange = (next: string) => {
    if (next === tab) return
    if (next === "json") goToJson()
    else goToForm()
  }

  // Sin lista de dependencias: el objeto se rehace tras cada render y sus métodos ven siempre el
  // estado actual (pestaña y texto), que es lo que necesita quien llama justo antes de importar.
  useImperativeHandle(ref, () => ({
    commit: () => tab === "form" || goToForm(),
    hasUnsyncedChanges: () => tab === "json" && jsonText !== baseline.current,
    focusIssue: (issue) => {
      if (issue.questionIndex == null) return
      if (tab === "json" && !goToForm()) return
      const index = issue.questionIndex
      // Dos frames: el primero deja montar el formulario (y los campos nuevos tras un reset).
      requestAnimationFrame(() => requestAnimationFrame(() => editorRef.current?.focusQuestion(index)))
    },
  }))

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className={className}>
      <TabsList>
        <TabsTrigger value="form" className="cursor-pointer px-4">
          Formulario
        </TabsTrigger>
        <TabsTrigger value="json" className="cursor-pointer px-4">
          JSON
        </TabsTrigger>
      </TabsList>
      {/* forceMount: al volver del JSON sin cambios se conservan las tarjetas desplegadas. */}
      <TabsContent value="form" forceMount className="data-[state=inactive]:hidden">
        <QuestionsDraftEditor ref={editorRef} />
      </TabsContent>
      <TabsContent value="json">
        <DraftJsonEditor mode={mode} text={jsonText} onTextChange={(text) => {
            setJsonText(text)
            setBlockedError(null)
          }}
          blockedError={blockedError} />
      </TabsContent>
    </Tabs>
  )
}
