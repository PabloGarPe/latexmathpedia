"use client"

import Link from "next/link"
import { BookOpen, RefreshCw } from "lucide-react"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMySubscriptions, useToggleSubscription } from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

export default function ProfileSubjectsPage() {
  const toast = useToast()
  const { data, isLoading, isError, refetch, isRefetching } = useMySubscriptions()
  const toggle = useToggleSubscription()
  // Id de la asignatura cuya baja está en curso, para deshabilitar solo ese botón.
  const pendingId = toggle.isPending ? toggle.variables?.subjectId : undefined

  const handleUnsubscribe = (subjectId: number, name?: string) =>
    toggle.mutate(
      { subjectId, subscribed: false },
      {
        onSuccess: () => toast.success(name ? `Te has dado de baja de ${name}.` : "Suscripción cancelada."),
        onError: () => toast.error("No se pudo cancelar la suscripción. Inténtalo de nuevo."),
      },
    )

  return (
    <SettingsSection
      title="Mis asignaturas"
      icon={BookOpen}
      description="Las asignaturas a las que estás suscrito aparecen en la barra lateral, en tus novedades y en los avisos de «Solo mis asignaturas»."
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No se pudieron cargar tus asignaturas.</p>
          <Button variant="outline" size="sm" className="cursor-pointer" disabled={isRefetching} onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Todavía no estás suscrito a ninguna asignatura.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/subjects">Explorar asignaturas</Link>
          </Button>
        </div>
      ) : (
        data.map((subscription) => {
          const subject = subscription.subject
          if (!subject || subject.id == null) return null
          const subjectId = subject.id
          return (
            <SettingsRow
              key={subjectId}
              label={
                <Link href={`/dashboard/subjects/${subjectId}`} className="hover:underline">
                  {subject.name}
                </Link>
              }
              description={`Suscrito desde ${formatDate(subscription.subscribedAt)}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={pendingId === subjectId}
                onClick={() => handleUnsubscribe(subjectId, subject.name)}
              >
                Darme de baja
              </Button>
            </SettingsRow>
          )
        })
      )}
    </SettingsSection>
  )
}
