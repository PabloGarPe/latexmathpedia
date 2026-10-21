"use client"

import { useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  isCourseSubscribed,
  useMyCourseSubscriptions,
  useMySubscriptions,
  useToggleCourseSubscription,
} from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Suscribirse a un curso (grado + año [+ cuatrimestre]) o darse de baja. El back recuerda la
// suscripción al curso: suscribe a las asignaturas de ahora y a las que se coloquen después, y
// el estado sale de ahí (useMyCourseSubscriptions), no de cruzar las asignaturas del curso, así
// que también vale en cursos vacíos. Solo con sesión; si la lista de cursos no se puede cargar
// (p. ej. modo mock, que da 401) se oculta, como SubscribeButton.
export function CourseSubscribeButton({
  degreeId,
  year,
  semester,
  size = "sm",
  variant,
  className,
  label,
}: {
  degreeId: number
  year: number
  semester?: number
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  label?: string
}) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const { data: courses, isPending, isError: coursesError } = useMyCourseSubscriptions()
  const { isError: subjectsError } = useMySubscriptions()
  const toggle = useToggleCourseSubscription()

  if (!isAuthenticated || coursesError || subjectsError) return null

  const busy = isPending || toggle.isPending
  const subscribed = isCourseSubscribed(courses ?? [], { degreeId, year, semester })

  function run(subscribe: boolean) {
    toggle.mutate(
      { degreeId, year, semester, subscribed: subscribe },
      {
        onSuccess: (subscriptions) =>
          toast.success(
            !subscribe
              ? "Te has dado de baja de este curso."
              : subscriptions && subscriptions.length > 0
                ? `Te has suscrito a las ${subscriptions.length} asignaturas de este curso. Las que se añadan también se suscribirán.`
                : "Te has suscrito a este curso. Recibirás sus asignaturas cuando se añadan.",
          ),
        onError: () =>
          toast.error(
            subscribe ? "No se pudo completar la suscripción al curso." : "No se pudo completar la baja del curso.",
          ),
      },
    )
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant ?? (subscribed ? "outline" : "default")}
        disabled={busy}
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

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Darte de baja de este curso?"
        description="Se cancelará tu suscripción a las asignaturas de este curso, aunque alguna también esté en otro curso o grado al que sigas suscrito, y dejarás de recibir las asignaturas que se añadan."
        confirmLabel="Darme de baja"
        onConfirm={() => run(false)}
      />
    </>
  )
}
