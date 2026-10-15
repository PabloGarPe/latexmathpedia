"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles, UserRound } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useMe, useUpdateMe } from "@/hooks/api/use-profile"
import { useToast } from "@/hooks/use-toast"

const updateNameSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
})

type UpdateNameFormValues = z.infer<typeof updateNameSchema>

// Datos personales. Los campos de perfil que lleguen (bio, titulación, curso…) se añaden aquí
// como nuevas <SettingsRow> dentro de esta sección o de otra <SettingsSection>.
export default function ProfilePage() {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const { data: me, isLoading } = useMe(isAuthenticated)
  const updateMe = useUpdateMe()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    values: { name: me?.name ?? "" },
  })

  const onSubmit = async (values: UpdateNameFormValues) => {
    try {
      await updateMe.mutateAsync({ name: values.name })
      toast.success("Nombre actualizado correctamente.")
      reset(values)
    } catch {
      toast.error("No se pudo actualizar el nombre.")
    }
  }

  return (
    <>
      {!isLoading && me?.profileCompletedAt == null && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Completa tu perfil</AlertTitle>
          <AlertDescription>
            Todavía no has puesto tu nombre. Añádelo abajo para que aparezca en tus cuestionarios y en el
            resto de la plataforma.
          </AlertDescription>
        </Alert>
      )}

      <SettingsSection
        title="Datos personales"
        description="Cómo apareces en la plataforma."
        icon={UserRound}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <SettingsRow label="Nombre" htmlFor="name" stacked>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1.5">
                <Input id="name" autoComplete="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting || !isDirty}>
                Guardar
              </Button>
            </div>
          </SettingsRow>
        </form>
      </SettingsSection>
    </>
  )
}
