"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSetQuizVisibility } from "@/hooks/api/use-quizzes"
import { useToast } from "@/hooks/use-toast"
import type { QuizDto } from "@/lib/api/quizzes"
import { cn } from "@/lib/utils"

// `visible` llega siempre desde el backend nuevo; si faltara, se trata como publicado.
export const isQuizHidden = (quiz: Pick<QuizDto, "visible">) => quiz.visible === false

export function QuizStatusBadge({ quiz, className }: { quiz: Pick<QuizDto, "visible">; className?: string }) {
  return isQuizHidden(quiz) ? (
    <Badge variant="secondary" className={cn("gap-1", className)}>
      <EyeOff className="h-3 w-3" />
      Oculto
    </Badge>
  ) : (
    <Badge className={cn("gap-1 border-transparent bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300", className)}>
      <Eye className="h-3 w-3" />
      Publicado
    </Badge>
  )
}

// Publicar / ocultar un cuestionario. Publicar pide confirmación y deja claro si se avisará a
// los usuarios (solo la primera publicación notifica). `disabledReason` bloquea la acción de
// publicar con un tooltip (p. ej. "Añade al menos una pregunta"); el backend devuelve 400 igual.
export function QuizVisibilityToggle({
  quiz,
  variant,
  disabledReason,
}: {
  quiz: QuizDto
  variant: "switch" | "button"
  disabledReason?: string
}) {
  const toast = useToast()
  const setVisibility = useSetQuizVisibility()
  const [confirming, setConfirming] = useState(false)
  const hidden = isQuizHidden(quiz)
  const blocked = hidden && !!disabledReason
  const disabled = quiz.id == null || setVisibility.isPending || blocked

  const apply = async (visible: boolean) => {
    if (quiz.id == null) return
    try {
      await setVisibility.mutateAsync({ id: quiz.id, visible })
      toast.success(visible ? "Cuestionario publicado." : "Cuestionario oculto.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la visibilidad.")
    }
  }

  const onToggle = () => (hidden ? setConfirming(true) : void apply(false))

  const control =
    variant === "switch" ? (
      <label className="inline-flex cursor-pointer items-center gap-2">
        <Switch
          checked={!hidden}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={hidden ? `Publicar ${quiz.name ?? "cuestionario"}` : `Ocultar ${quiz.name ?? "cuestionario"}`}
        />
        <span className="sr-only sm:not-sr-only text-xs text-muted-foreground">{hidden ? "Oculto" : "Publicado"}</span>
      </label>
    ) : (
      <Button
        variant={hidden ? "default" : "outline"}
        size="sm"
        className="cursor-pointer"
        disabled={disabled}
        onClick={onToggle}
      >
        {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {hidden ? "Publicar" : "Ocultar"}
      </Button>
    )

  return (
    <>
      {blocked ? (
        <Tooltip>
          {/* El span recoge el hover: un control deshabilitado no emite eventos. */}
          <TooltipTrigger asChild>
            <span className="inline-flex">{control}</span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        control
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Publicar este cuestionario?"
        description={
          quiz.publishedAt == null
            ? "Será visible para todos los usuarios y se les avisará con una notificación."
            : "Volverá a ser visible para todos los usuarios. No se enviará un nuevo aviso, porque ya se publicó antes."
        }
        confirmLabel="Publicar"
        variant="default"
        onConfirm={() => apply(true)}
      />
    </>
  )
}
