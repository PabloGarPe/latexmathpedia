"use client"

import { useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { useCurriculum } from "@/hooks/api/use-degrees"
import {
  useMySubscriptions,
  useSubscribedSubjectIds,
  useToggleCourseSubscription,
} from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Suscribirse a todas las asignaturas de un curso (grado + año [+ cuatrimestre]) o darse de
// baja de ellas. No existe una suscripción "al curso": es una foto fija de las asignaturas
// colocadas ahora, así que el estado se deriva cruzando `subjectIds` con las suscripciones del
// usuario (suscrito = todas, y al menos una). Solo con sesión; si la lista de suscripciones no
// se puede cargar (p. ej. modo mock, que da 401) se oculta, como SubscribeButton.
// - `subjectIds`: las asignaturas del curso si el llamador ya las tiene (p. ej. las visibles
//   con un filtro); si no, se piden con useCurriculum(degreeId, { year, semester }).
export function CourseSubscribeButton({
  degreeId,
  year,
  semester,
  subjectIds,
  size = "sm",
  variant,
  className,
  label,
}: {
  degreeId: number
  year: number
  semester?: number
  subjectIds?: number[]
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  label?: string
}) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const { isPending: loadingSubscriptions, isError } = useMySubscriptions()
  const subscribedIds = useSubscribedSubjectIds()
  const toggle = useToggleCourseSubscription()
  // Solo se pide el plan si el llamador no trae las asignaturas.
  const curriculum = useCurriculum(subjectIds ? null : degreeId, { year, semester })

  if (!isAuthenticated || isError) return null

  const ids =
    subjectIds ??
    (curriculum.data?.years ?? [])
      .flatMap((courseYear) => courseYear.subjects ?? [])
      .map((entry) => entry.subject?.id)
      .filter((id): id is number => id != null)

  const loadingSubjects = subjectIds == null && curriculum.isPending
  const busy = loadingSubscriptions || loadingSubjects || toggle.isPending
  const empty = !loadingSubjects && ids.length === 0
  const subscribed = ids.length > 0 && ids.every((id) => subscribedIds.has(id))

  function run(subscribe: boolean) {
    toggle.mutate(
      { degreeId, year, semester, subscribed: subscribe },
      {
        onSuccess: () =>
          toast.success(
            subscribe
              ? `Te has suscrito a las ${ids.length} asignaturas de este curso.`
              : "Te has dado de baja de este curso.",
          ),
        onError: () =>
          toast.error(
            subscribe ? "No se pudo completar la suscripción al curso." : "No se pudo completar la baja del curso.",
          ),
      },
    )
  }

  const button = (
    <Button
      type="button"
      size={size}
      variant={variant ?? (subscribed ? "outline" : "default")}
      disabled={busy || empty}
      onClick={() => (subscribed ? setConfirming(true) : run(true))}
      className={cn("cursor-pointer", className)}
    >
      {toggle.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {subscribed ? "Darme de baja de este curso" : (label ?? "Suscribirme a este curso")}
    </Button>
  )

  return (
    <>
      {empty ? (
        <Tooltip>
          {/* Un botón deshabilitado no dispara eventos: el tooltip va sobre un contenedor. */}
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-not-allowed">{button}</span>
          </TooltipTrigger>
          <TooltipContent>Este curso todavía no tiene asignaturas</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Darte de baja de este curso?"
        description="Se cancelará tu suscripción a las asignaturas de este curso, aunque alguna también esté en otro curso o grado al que sigas suscrito."
        confirmLabel="Darme de baja"
        onConfirm={() => run(false)}
      />
    </>
  )
}
