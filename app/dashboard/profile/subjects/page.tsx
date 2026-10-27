"use client"

import Link from "next/link"
import { BookOpen, GraduationCap, Layers, RefreshCw } from "lucide-react"
import { CourseSubscribeButton } from "@/components/subscriptions/course-subscribe-button"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"
import { useMyCourseSubscriptions, useMySubscriptions, useToggleSubscription } from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import { curriculumHref, formatDegree, formatSemesterLong, formatYear, formatYearLong } from "@/lib/degrees"
import { formatDate } from "@/lib/utils"

// Atajo al curso del perfil: suscribirse (o darse de baja) de todas sus asignaturas de una vez.
function CurrentCourseSection() {
  const { isAuthenticated } = useAuth()
  const { data: me, isLoading } = useMe(isAuthenticated)
  const degree = me?.degree
  const year = me?.currentYear

  // Si /me falla (modo mock, 401) no hay nada que proponer.
  if (isLoading || !me) return null

  return (
    <SettingsSection
      title="Tu curso"
      icon={GraduationCap}
      description="Suscríbete de una vez a todas las asignaturas de tu curso."
    >
      {degree?.id != null && year != null ? (
        <SettingsRow
          label={`${formatYear(year)} de ${degree.name}`}
          description={degree.university ?? undefined}
        >
          <div className="flex flex-wrap items-center gap-2">
            <CourseSubscribeButton degreeId={degree.id} year={year} />
            <Button asChild variant="outline" size="sm">
              <Link href={curriculumHref(degree.id, year)}>Ver el plan de estudios</Link>
            </Button>
          </div>
        </SettingsRow>
      ) : degree?.id != null ? (
        <SettingsRow
          label={degree.name}
          description={
            <>
              Indica tu curso en tu <Link href="/dashboard/profile" className="underline">perfil</Link> para
              suscribirte a él con un clic, o elige las asignaturas en el plan de estudios.
            </>
          }
        >
          <Button asChild variant="outline" size="sm">
            <Link href={curriculumHref(degree.id)}>Ver el plan de estudios</Link>
          </Button>
        </SettingsRow>
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige tu grado y tu curso en tu{" "}
          <Link href="/dashboard/profile" className="underline">
            perfil
          </Link>{" "}
          para suscribirte a sus asignaturas con un clic.
        </p>
      )}
    </SettingsSection>
  )
}

// Cursos a los que está suscrito (los que recibirán solos las asignaturas que se coloquen en
// ellos). Sin ninguno, o si la lista falla (modo mock, 401), no se pinta nada.
function CourseSubscriptionsSection() {
  const { data } = useMyCourseSubscriptions()
  if (!data || data.length === 0) return null

  return (
    <SettingsSection
      title="Mis cursos"
      icon={Layers}
      description="Las asignaturas que se añadan a estos cursos te suscribirán automáticamente."
    >
      {data.map((course) => {
        const degree = course.degree
        if (degree?.id == null || course.year == null) return null
        // semester null = año entero (cualquier cuatrimestre y las anuales).
        const when = course.semester == null ? formatYearLong(course.year) : `${formatYearLong(course.year)} · ${formatSemesterLong(course.semester)}`
        return (
          <SettingsRow
            key={`${degree.id}-${course.year}-${course.semester ?? "all"}`}
            label={
              <Link href={curriculumHref(degree.id, course.year)} className="hover:underline">
                {when}
              </Link>
            }
            description={`${formatDegree(degree)} · Suscrito desde ${formatDate(course.subscribedAt)}`}
          >
            <CourseSubscribeButton
              degreeId={degree.id}
              year={course.year}
              semester={course.semester ?? undefined}
              variant="outline"
            />
          </SettingsRow>
        )
      })}
    </SettingsSection>
  )
}

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
    <>
      <CurrentCourseSection />
      <CourseSubscriptionsSection />
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
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/subjects">Explorar asignaturas</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/degrees">Ver los grados</Link>
              </Button>
            </div>
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
    </>
  )
}
