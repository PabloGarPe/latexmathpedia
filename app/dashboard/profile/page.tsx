"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles, UserRound } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AvatarSection } from "@/components/profile/avatar-section"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useMe, useUpdateMe } from "@/hooks/api/use-profile"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import { PROFILE_LIMITS, USERNAME_PATTERN } from "@/lib/api/profile"

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
})

type ProfileFormValues = z.infer<typeof profileSchema>

// PUT /me es un reemplazo completo: se envía todo y lo vacío va como null (el back lo borra).
const emptyToNull = (value: string) => value.trim() || null

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
    }
  }, [me, isIncomplete, givenName, familyName])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values,
  })

  const bioLength = watch("bio").length

  const onSubmit = async (formValues: ProfileFormValues) => {
    try {
      await updateMe.mutateAsync({
        username: formValues.username.trim(),
        firstName: emptyToNull(formValues.firstName),
        lastName: emptyToNull(formValues.lastName),
        bio: emptyToNull(formValues.bio),
        university: emptyToNull(formValues.university),
        studies: emptyToNull(formValues.studies),
      })
      toast.success("Perfil actualizado correctamente.")
      reset(formValues)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("username", { type: "server", message: "Ese nombre de usuario ya está en uso" })
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

          <SettingsRow label="Universidad" htmlFor="university" stacked>
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

          <SettingsRow label="Estudios" htmlFor="studies" description="Por ejemplo, Grado en Matemáticas." stacked>
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
    </>
  )
}
