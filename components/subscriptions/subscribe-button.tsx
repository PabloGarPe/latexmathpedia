"use client"

import { Bell, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { useMySubscriptions, useSubscribedSubjectIds, useToggleSubscription } from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Botón de suscripción a una asignatura. Solo con sesión. Mientras carga la lista de suscripciones
// (o muta) queda deshabilitado; si la lista no se puede cargar (p. ej. modo mock, que da 401) se
// oculta, porque no sabríamos en qué estado está.
// - Por defecto: botón con texto ("Suscribirme" / "Suscrito", que al pasar el ratón pasa a
//   "Cancelar suscripción").
// - `compact`: solo icono, para tarjetas. Si se coloca dentro de un <Link>, ya detiene el clic.
export function SubscribeButton({
  subjectId,
  subjectName,
  compact = false,
  className,
}: {
  subjectId?: number | null
  subjectName?: string | null
  compact?: boolean
  className?: string
}) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const { isPending: loading, isError } = useMySubscriptions()
  const subscribedIds = useSubscribedSubjectIds()
  const toggle = useToggleSubscription()

  if (!isAuthenticated || subjectId == null || isError) return null

  const subscribed = subscribedIds.has(subjectId)
  const busy = loading || toggle.isPending
  const actionLabel = subscribed
    ? `Cancelar suscripción${subjectName ? ` de ${subjectName}` : ""}`
    : `Suscribirme${subjectName ? ` a ${subjectName}` : ""}`

  function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    toggle.mutate(
      { subjectId: subjectId as number, subscribed: !subscribed },
      {
        onSuccess: () =>
          toast.success(subscribed ? "Suscripción cancelada." : "Te has suscrito a la asignatura."),
        onError: () =>
          toast.error(
            subscribed ? "No se pudo cancelar la suscripción." : "No se pudo completar la suscripción.",
          ),
      },
    )
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={actionLabel}
            aria-pressed={subscribed}
            disabled={busy}
            onClick={handleClick}
            className={cn(
              "h-8 w-8 cursor-pointer bg-background/90 shadow-sm backdrop-blur",
              subscribed && "text-primary",
              className,
            )}
          >
            {subscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{subscribed ? "Suscrito · cancelar suscripción" : "Suscribirme"}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={subscribed ? "secondary" : "default"}
      aria-pressed={subscribed}
      disabled={busy}
      onClick={handleClick}
      className={cn("group/sub cursor-pointer", className)}
    >
      {subscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {/* Ambos textos ocupan la misma celda para que el botón no cambie de ancho al hacer hover. */}
      {subscribed ? (
        <span className="grid">
          <span className="col-start-1 row-start-1 group-hover/sub:invisible group-focus-visible/sub:invisible">
            Suscrito
          </span>
          <span className="invisible col-start-1 row-start-1 group-hover/sub:visible group-focus-visible/sub:visible">
            Cancelar suscripción
          </span>
        </span>
      ) : (
        "Suscribirme"
      )}
    </Button>
  )
}
