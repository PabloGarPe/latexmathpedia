"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { GraduationCap, Sparkles, UserRound, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AvatarSection } from "@/components/profile/avatar-section"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CourseSubscribeButton } from "@/components/subscriptions/course-subscribe-button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useDegrees } from "@/hooks/api/use-degrees"
import { useMe, useUpdateMe } from "@/hooks/api/use-profile"
import { useToast } from "@/hooks/use-toast"
import type { DegreeDto } from "@/lib/api/degrees"
import { ApiError } from "@/lib/api/errors"
import { PROFILE_LIMITS, USERNAME_PATTERN } from "@/lib/api/profile"
import { curriculumHref, degreeYears, formatYear } from "@/lib/degrees"

const USERNAME_RULES =
  "De 3 a 30 caracteres: letras sin tilde, números, punto, guion y guion bajo (sin espacios)."

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`)

// Mismas reglas que el back (UpdateUserAccountDto).
const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "El nombre de usuario es obligatorio")
    .regex(USERNAME_PATTERN, USERNAME_RULES),
  firstName: optionalText(PROFILE_LIMITS.name),
  lastName: optionalText(PROFILE_LIMITS.name),
  bio: optionalText(PROFILE_LIMITS.bio),
  university: optionalText(PROFILE_LIMITS.university),
  studies: optionalText(PROFILE_LIMITS.studies),
  // Ids como string porque los Select de shadcn trabajan con strings; "" = sin grado / sin curso.
  // Se convierten a number | null al enviar.
  degreeId: z.string(),
  currentYear: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

// PUT /me es un reemplazo completo: se envía todo y lo vacío va como null (el back lo borra).
const emptyToNull = (value: string) => value.trim() || null

// Radix no admite "" como valor de un SelectItem: este centinela representa "sin grado" / "sin indicar".
const NONE = "none"

// Grado y curso con los que ofrecer suscribirse justo después de guardar.
type CourseOffer = { degreeId: number; year: number; degreeName: string }

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

// Datos personales y foto. El perfil se considera completo cuando hay username guardado
// (profileCompletedAt lo fija el back en el primer PUT correcto).
export default function ProfilePage() {
  const { isAuthenticated, givenName, familyName } = useAuth()
  const toast = useToast()
  const { data: me, isLoading } = useMe(isAuthenticated)
  const updateMe = useUpdateMe()
  const degreesQuery = useDegrees(isAuthenticated)
  const [offer, setOffer] = useState<CourseOffer | null>(null)
  // Solo con /me cargado: si falla (modo mock, 401) no se da el perfil por incompleto.
  const isIncomplete = me != null && me.profileCompletedAt == null

  // Valores iniciales desde /me. Si el perfil aún no está completo y no tiene nombre, se
  // precarga el de Keycloak, pero solo en el formulario: no se guarda hasta que el usuario pulse Guardar.
  const values = useMemo<ProfileFormValues>(() => {
    const prefill = me != null && isIncomplete && !me.firstName && !me.lastName
    return {
      username: me?.username ?? "",
      firstName: me?.firstName || (prefill && givenName) || "",
      lastName: me?.lastName || (prefill && familyName) || "",
      bio: me?.bio ?? "",
      university: me?.university ?? "",
      studies: me?.studies ?? "",
      degreeId: me?.degree?.id != null ? String(me.degree.id) : "",
      currentYear: me?.currentYear != null ? String(me.currentYear) : "",
    }
  }, [me, isIncomplete, givenName, familyName])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values,
  })

  const bioLength = watch("bio").length
  const degreeIdValue = watch("degreeId")
  const currentYearValue = watch("currentYear")

  // Si el grado del perfil no viniera en el catálogo (p. ej. aún cargando), se añade igualmente
  // para que el Select pueda mostrarlo.
  const degrees = useMemo<DegreeDto[]>(() => {
    const list = degreesQuery.data ?? []
    return me?.degree?.id != null && !list.some((degree) => degree.id === me.degree?.id)
      ? [...list, me.degree]
      : list
  }, [degreesQuery.data, me?.degree])
  const selectedDegree = degrees.find((degree) => String(degree.id) === degreeIdValue)
  const years = degreeYears(selectedDegree)

  // Al cambiar de grado se reinicia el curso: el anterior puede no existir en el nuevo.
  const handleDegreeChange = (value: string) => {
    setValue("degreeId", value === NONE ? "" : value, { shouldDirty: true })
    setValue("currentYear", "", { shouldDirty: true })
  }

  const onSubmit = async (formValues: ProfileFormValues) => {
    const degreeId = formValues.degreeId ? Number(formValues.degreeId) : null
    // El curso no se guarda sin grado (el back da 400).
    const currentYear = degreeId != null && formValues.currentYear ? Number(formValues.currentYear) : null
    const previousDegreeId = me?.degree?.id ?? null
    const previousYear = me?.currentYear ?? null
    setOffer(null)
    try {
      const updated = await updateMe.mutateAsync({
        username: formValues.username.trim(),
        firstName: emptyToNull(formValues.firstName),
        lastName: emptyToNull(formValues.lastName),
        bio: emptyToNull(formValues.bio),
        university: emptyToNull(formValues.university),
        studies: emptyToNull(formValues.studies),
        degreeId,
        currentYear,
      })
      toast.success("Perfil actualizado correctamente.")
      reset(formValues)
      // Se ofrece suscribirse al curso solo si hay grado y curso y alguno cambió: no tiene sentido
      // repetir la oferta cada vez que se edita el nombre.
      if (degreeId != null && currentYear != null && (degreeId !== previousDegreeId || currentYear !== previousYear)) {
        setOffer({
          degreeId,
          year: currentYear,
          degreeName: updated.degree?.name ?? selectedDegree?.name ?? "tu grado",
        })
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("username", { type: "server", message: "Ese nombre de usuario ya está en uso" })
      } else if (error instanceof ApiError && error.status === 404) {
        // El grado se borró mientras el formulario estaba abierto: se refresca el catálogo.
        setError("degreeId", { type: "server", message: "El grado elegido ya no existe." })
        void degreesQuery.refetch()
      } else if (error instanceof ApiError && error.status === 400 && currentYear != null) {
        setError("currentYear", { type: "server", message: "El curso elegido no existe en ese grado." })
      } else {
        toast.error("No se pudo actualizar el perfil. Revisa los campos e inténtalo de nuevo.")
      }
    }
  }

  return (
    <>
      {!isLoading && isIncomplete && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Completa tu perfil</AlertTitle>
          <AlertDescription>
            Elige tu nombre de usuario: es el que verán los demás en tus apuntes y en la plataforma. El resto de
            campos son opcionales.
          </AlertDescription>
        </Alert>
      )}

      <AvatarSection />

      <SettingsSection
        title="Datos personales"
        description="Cómo apareces en la plataforma."
        icon={UserRound}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="divide-y" noValidate>
          <SettingsRow label="Nombre de usuario" htmlFor="username" description={USERNAME_RULES} stacked>
            <div className="space-y-1.5">
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
              <FieldError message={errors.username?.message} />
            </div>
          </SettingsRow>

          <SettingsRow label="Nombre" htmlFor="firstName" stacked>
            <div className="space-y-1.5">
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                {...register("firstName")}
              />
              <FieldError message={errors.firstName?.message} />
            </div>
          </SettingsRow>

          <SettingsRow label="Apellidos" htmlFor="lastName" stacked>
            <div className="space-y-1.5">
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                {...register("lastName")}
              />
              <FieldError message={errors.lastName?.message} />
            </div>
          </SettingsRow>

          <SettingsRow label="Biografía" htmlFor="bio" description="Cuéntanos algo sobre ti." stacked>
            <div className="space-y-1.5">
              <Textarea id="bio" rows={3} aria-invalid={Boolean(errors.bio)} {...register("bio")} />
              <div className="flex items-start justify-between gap-2">
                <FieldError message={errors.bio?.message} />
                <span
                  className={`ml-auto text-xs ${
                    bioLength > PROFILE_LIMITS.bio ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {bioLength}/{PROFILE_LIMITS.bio}
                </span>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Grado"
            htmlFor="degreeId"
            description="Con tu grado te avisamos de las asignaturas nuevas y te sugerimos las de tu curso."
            stacked
          >
            <div className="space-y-1.5">
              <Select
                value={degreeIdValue || NONE}
                onValueChange={handleDegreeChange}
                disabled={!me || (degreesQuery.isPending && me?.degree == null)}
              >
                <SelectTrigger id="degreeId" className="w-full" aria-invalid={Boolean(errors.degreeId)}>
                  <SelectValue placeholder="Sin grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin grado</SelectItem>
                  {degrees.map((degree) => (
                    <SelectItem key={degree.id} value={String(degree.id)}>
                      <span>{degree.name}</span>
                      {degree.university && <span className="text-muted-foreground">· {degree.university}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {degreesQuery.isError && (
                <p className="text-sm text-muted-foreground">
                  No se pudo cargar la lista de grados. Puedes indicar tus estudios en los campos de texto.
                </p>
              )}
              <FieldError message={errors.degreeId?.message} />
            </div>
          </SettingsRow>

          <SettingsRow label="Curso" htmlFor="currentYear" stacked>
            <div className="space-y-1.5">
              <Select
                value={currentYearValue || NONE}
                onValueChange={(value) =>
                  setValue("currentYear", value === NONE ? "" : value, { shouldDirty: true })
                }
                disabled={!selectedDegree}
              >
                <SelectTrigger id="currentYear" className="w-full" aria-invalid={Boolean(errors.currentYear)}>
                  <SelectValue placeholder="Sin indicar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin indicar</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {formatYear(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.currentYear?.message} />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Universidad"
            htmlFor="university"
            description="Si tu grado no aparece en la lista, escríbelo aquí."
            stacked
          >
            <div className="space-y-1.5">
              <Input
                id="university"
                autoComplete="organization"
                aria-invalid={Boolean(errors.university)}
                {...register("university")}
              />
              <FieldError message={errors.university?.message} />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Estudios"
            htmlFor="studies"
            description="Por ejemplo, Grado en Matemáticas. Texto libre, independiente del grado de arriba."
            stacked
          >
            <div className="space-y-1.5">
              <Input id="studies" aria-invalid={Boolean(errors.studies)} {...register("studies")} />
              <FieldError message={errors.studies?.message} />
            </div>
          </SettingsRow>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={!me || isSubmitting || (!isIncomplete && !isDirty)}
            >
              Guardar
            </Button>
          </div>
        </form>
      </SettingsSection>

      {offer && (
        <Alert className="pr-12">
          <GraduationCap className="h-4 w-4" />
          <AlertTitle className="line-clamp-none">
            ¿Quieres suscribirte a las asignaturas de {formatYear(offer.year)} de {offer.degreeName}?
          </AlertTitle>
          <AlertDescription>
            <p>Recibirás sus novedades y las tendrás a mano en la barra lateral.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CourseSubscribeButton degreeId={offer.degreeId} year={offer.year} />
              <Button asChild variant="outline" size="sm">
                <Link href={curriculumHref(offer.degreeId, offer.year)}>Ver el plan de estudios</Link>
              </Button>
            </div>
          </AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 cursor-pointer"
            aria-label="Descartar"
            onClick={() => setOffer(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
    </>
  )
}
