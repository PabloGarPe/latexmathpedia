"use client"

import { useState } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import { Check, Loader2, Plus, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SortableList, SortableRow } from "@/components/admin/quiz-editor/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useCreateOption,
  useDeleteOption,
  useReorderOptions,
  useSetCorrectOption,
  useUpdateOption,
} from "@/hooks/api/use-options"
import { useToast } from "@/hooks/use-toast"
import type { OptionDto } from "@/lib/api/options"
import { cn } from "@/lib/utils"

function OptionRow({
  option,
  questionId,
  previousCorrect,
}: {
  option: OptionDto
  questionId: number
  previousCorrect?: OptionDto
}) {
  const toast = useToast()
  const updateOption = useUpdateOption()
  const deleteOption = useDeleteOption()
  const setCorrect = useSetCorrectOption()
  const [text, setText] = useState(option.text ?? "")
  const [confirming, setConfirming] = useState(false)

  // Se guarda al salir del campo o con Intro; Escape descarta el cambio.
  const save = async () => {
    const next = text.trim()
    if (next === (option.text ?? "") || option.id == null) return
    if (!next) {
      setText(option.text ?? "")
      return
    }
    try {
      await updateOption.mutateAsync({
        id: option.id,
        body: { text: next, position: option.position, questionId, correct: option.correct },
      })
    } catch {
      setText(option.text ?? "")
      toast.error("No se pudo guardar la opción.")
    }
  }

  const markCorrect = async () => {
    if (option.correct) return
    try {
      await setCorrect.mutateAsync({ questionId, option, previous: previousCorrect })
    } catch {
      toast.error("No se pudo marcar la opción correcta.")
    }
  }

  const remove = async () => {
    if (option.id == null) return
    try {
      await deleteOption.mutateAsync({ id: option.id, questionId })
    } catch {
      toast.error("No se pudo eliminar la opción.")
    }
  }

  return (
    <SortableRow id={option.id as number} label={option.text ?? "opción"}>
      {({ handle, dragging }) => (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg border bg-background py-1.5 pl-1 pr-2 transition-colors",
            option.correct && "border-green-500/60 bg-green-500/5",
            dragging && "shadow-lg",
          )}
        >
          {handle}
          <button
            type="button"
            role="radio"
            aria-checked={option.correct}
            aria-label={option.correct ? "Respuesta correcta" : "Marcar como respuesta correcta"}
            title={option.correct ? "Respuesta correcta" : "Marcar como correcta"}
            onClick={markCorrect}
            disabled={setCorrect.isPending}
            className={cn(
              "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
              option.correct
                ? "border-green-500 bg-green-500 text-white"
                : "border-muted-foreground/40 text-transparent hover:border-green-500 hover:text-green-500/60",
            )}
          >
            {setCorrect.isPending ? <Loader2 className="h-3 w-3 animate-spin text-current" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <Input
            value={text}
            aria-label="Texto de la opción"
            className="h-8 border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-input focus-visible:bg-background"
            onChange={(event) => setText(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
              if (event.key === "Escape") {
                setText(option.text ?? "")
                event.currentTarget.blur()
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
            aria-label="Eliminar opción"
            disabled={deleteOption.isPending}
            onClick={() => setConfirming(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="¿Eliminar esta opción?"
            description={
              option.correct
                ? "Es la respuesta correcta: la pregunta quedará sin ninguna marcada hasta que elijas otra."
                : "Esta acción no se puede deshacer."
            }
            onConfirm={remove}
          />
        </div>
      )}
    </SortableRow>
  )
}

// Opciones de una pregunta: marcar la correcta (círculo), editar el texto en línea, reordenar
// arrastrando y añadir nuevas.
export function OptionList({
  questionId,
  type,
  options,
}: {
  questionId: number
  type: string | undefined
  // Ya ordenadas por posición.
  options: OptionDto[]
}) {
  const toast = useToast()
  const createOption = useCreateOption()
  const reorder = useReorderOptions()
  const [draft, setDraft] = useState("")
  const correct = options.find((option) => option.correct)
  const nextPosition = options.reduce((max, option) => Math.max(max, option.position ?? 0), 0) + 1
  const isTrueFalse = type === "TRUE_FALSE"
  // Verdadero/Falso se crea de golpe (o completa si falta una); solo en opción múltiple se añaden libres.
  const showAdd = isTrueFalse ? options.length > 0 && options.length < 2 : true

  const add = async (text: string, correctValue = false, position = nextPosition) => {
    await createOption.mutateAsync({ questionId, text, position, correct: correctValue })
  }

  const handleAdd = async () => {
    const text = draft.trim()
    if (!text) return
    try {
      await add(text)
      setDraft("")
    } catch {
      toast.error("No se pudo añadir la opción.")
    }
  }

  const createTrueFalse = async () => {
    try {
      await add("Verdadero", true, 1)
      await add("Falso", false, 2)
    } catch {
      toast.error("No se pudieron crear las opciones.")
    }
  }

  const handleReorder = (activeId: string, overId: string) => {
    const from = options.findIndex((option) => String(option.id) === activeId)
    const to = options.findIndex((option) => String(option.id) === overId)
    if (from < 0 || to < 0) return
    reorder.mutate(
      { questionId, options: arrayMove(options, from, to) },
      { onError: () => toast.error("No se pudo reordenar las opciones.") },
    )
  }

  return (
    <div className="space-y-3">
      {options.length > 0 ? (
        <SortableList ids={options.map((option) => option.id as number)} onReorder={handleReorder}>
          <div className="space-y-2">
            {options.map((option) => (
              <OptionRow key={option.id} option={option} questionId={questionId} previousCorrect={correct} />
            ))}
          </div>
        </SortableList>
      ) : isTrueFalse ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Esta pregunta aún no tiene opciones.</p>
          <Button type="button" size="sm" className="cursor-pointer" onClick={createTrueFalse} disabled={createOption.isPending}>
            Crear Verdadero y Falso
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Esta pregunta aún no tiene opciones. Añade al menos dos y marca la correcta.
        </p>
      )}

      {showAdd && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleAdd()
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Añadir otra opción…"
            aria-label="Texto de la nueva opción"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="shrink-0 cursor-pointer"
            disabled={!draft.trim() || createOption.isPending}
          >
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
        </form>
      )}
    </div>
  )
}
