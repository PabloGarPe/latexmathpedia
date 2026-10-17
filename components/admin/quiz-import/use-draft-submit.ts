"use client"

import { useEffect, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { DraftTabsHandle } from "@/components/admin/quiz-import/draft-tabs"
import { useToast } from "@/hooks/use-toast"
import { collectIssues, type DraftIssue, type ImportMode, type QuizDraft } from "@/lib/quiz-import"

// Piezas comunes a la página de importación y al panel "Añadir preguntas desde JSON" del editor.

// Flujo de "Importar": (1) marca el intento (para pintar los errores ya visibles), (2) pasa a
// formulario el JSON que se esté editando en la pestaña JSON (`commit()`; si no vale, se cancela con
// un aviso), (3) valida con la resolución zod del form y, si hay problemas, salta al primero.
// `onValid` recibe el borrador ya validado. Los 400 del back llegan sin cuerpo, por eso se valida
// aquí con las mismas reglas antes de enviar nada.
export function useDraftSubmit({
  form,
  mode,
  tabsRef,
  jumpToIssue,
  onValid,
}: {
  form: UseFormReturn<QuizDraft>
  mode: ImportMode
  tabsRef: React.RefObject<DraftTabsHandle | null>
  jumpToIssue: (issue: DraftIssue) => void
  onValid: (values: QuizDraft) => void | Promise<void>
}) {
  const toast = useToast()
  const [attempted, setAttempted] = useState(false)

  const submit = async () => {
    setAttempted(true)
    if (!tabsRef.current?.commit()) {
      toast.error("Corrige el JSON antes de importar.")
      return
    }
    await form.handleSubmit(
      onValid,
      () => {
        const first = collectIssues(form.getValues(), mode)[0]
        if (first) jumpToIssue(first)
      },
    )()
  }

  return { attempted, submit }
}

// Aviso nativo del navegador al cerrar/recargar con un borrador sin enviar. `bypassRef.current` a
// true lo desactiva (p. ej. justo después de importar, para la navegación posterior).
export function useBeforeUnloadWarning(active: boolean, bypassRef?: React.RefObject<boolean>) {
  useEffect(() => {
    if (!active) return
    const handler = (event: BeforeUnloadEvent) => {
      if (bypassRef?.current) return
      event.preventDefault()
      // Algunos navegadores antiguos exigen asignar returnValue.
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [active, bypassRef])
}
