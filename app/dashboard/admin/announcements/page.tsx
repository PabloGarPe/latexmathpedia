"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Megaphone, Send, Users, UsersRound, X } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { NotificationBody } from "@/components/notifications/notification-item"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar, UserSearchCombobox, type UserOption } from "@/components/ui/user-search-combobox"
import { useCreateAnnouncement } from "@/hooks/api/use-notifications"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useToast } from "@/hooks/use-toast"
import { isInternalPath } from "@/lib/notifications/registry"
import { cn } from "@/lib/utils"

const TITLE_MAX = 120
const MESSAGE_MAX = 500
const LINK_MAX = 300

// Mismas reglas que el backend (CreateAnnouncementDto). El 404 por emails desconocidos se evita
// eligiendo destinatarios solo del buscador.
const announcementSchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(TITLE_MAX, `Máximo ${TITLE_MAX} caracteres`),
    message: z.string().trim().min(1, "El mensaje es obligatorio").max(MESSAGE_MAX, `Máximo ${MESSAGE_MAX} caracteres`),
    link: z
      .string()
      .trim()
      .max(LINK_MAX, `Máximo ${LINK_MAX} caracteres`)
      .refine((value) => value === "" || isInternalPath(value), "Debe ser una ruta interna que empiece por «/», como /dashboard"),
    audience: z.enum(["all", "some"]),
    recipients: z.array(z.object({ email: z.string(), name: z.string().nullish() })),
  })
  .refine((values) => values.audience === "all" || values.recipients.length > 0, {
    path: ["recipients"],
    message: "Elige al menos un destinatario",
  })

type AnnouncementValues = z.infer<typeof announcementSchema>

const DEFAULTS: AnnouncementValues = { title: "", message: "", link: "", audience: "all", recipients: [] }

export default function AdminAnnouncementsPage() {
  const { isAuthenticated, isAdmin, loading } = useAdminRoute()
  const toast = useToast()
  const createAnnouncement = useCreateAnnouncement()
  const [pending, setPending] = useState<AnnouncementValues | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<AnnouncementValues>({ resolver: zodResolver(announcementSchema), defaultValues: DEFAULTS })

  const values = watch()

  const send = async (data: AnnouncementValues) => {
    try {
      await createAnnouncement.mutateAsync({
        title: data.title,
        message: data.message,
        link: data.link || null,
        recipientEmails: data.audience === "some" ? data.recipients.map((r) => r.email) : undefined,
      })
      toast.success("Aviso enviado. Puede tardar un instante en aparecer.")
      reset(DEFAULTS)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el aviso.")
    } finally {
      setPending(null)
    }
  }

  // A todos los usuarios no tiene vuelta atrás: se pide confirmación. A destinatarios concretos, no.
  const onSubmit = (data: AnnouncementValues) => (data.audience === "all" ? setPending(data) : send(data))

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) return null

  return (
    <PageContainer>
      <PageHeader
        title="Avisos"
        description="Envía una notificación a todos los usuarios o solo a algunos. Les aparecerá en la campanita."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              Nuevo aviso
            </CardTitle>
            <CardDescription>Los avisos se entregan siempre: los usuarios no pueden desactivarlos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="title">Título</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {values.title.length}/{TITLE_MAX}
                  </span>
                </div>
                <Input id="title" placeholder="Mantenimiento programado" aria-invalid={!!errors.title} {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="message">Mensaje</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {values.message.length}/{MESSAGE_MAX}
                  </span>
                </div>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="El sábado la plataforma estará en mantenimiento de 2:00 a 4:00."
                  aria-invalid={!!errors.message}
                  {...register("message")}
                />
                {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="link">Enlace (opcional)</Label>
                <Input id="link" placeholder="/dashboard" aria-invalid={!!errors.link} {...register("link")} />
                <p className="text-xs text-muted-foreground">
                  Ruta interna a la que lleva el aviso al pulsarlo. Sin enlace, solo se marca como leído.
                </p>
                {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
              </div>

              <div className="grid gap-3">
                <Label>Destinatarios</Label>
                <Controller
                  control={control}
                  name="audience"
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                      {[
                        { value: "all", label: "Todos los usuarios", hint: "Usuarios activos, incluido tú", icon: UsersRound },
                        { value: "some", label: "Usuarios concretos", hint: "Los eliges por nombre o email", icon: Users },
                      ].map(({ value, label, hint, icon: Icon }) => (
                        <label
                          key={value}
                          htmlFor={`audience-${value}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            field.value === value ? "border-primary/50 bg-primary/5" : "hover:bg-accent/50",
                          )}
                        >
                          <RadioGroupItem id={`audience-${value}`} value={value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {label}
                            </span>
                            <span className="block text-xs text-muted-foreground">{hint}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                />

                {values.audience === "some" && (
                  <Controller
                    control={control}
                    name="recipients"
                    render={({ field }) => {
                      const recipients = field.value as UserOption[]
                      const taken = new Set(recipients.map((r) => r.email.toLowerCase()))
                      return (
                        <div className="grid gap-3">
                          <UserSearchCombobox
                            id="recipient-search"
                            taken={taken}
                            invalid={!!errors.recipients}
                            onSelect={(user) => field.onChange([...recipients, user])}
                          />
                          {recipients.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                              {recipients.map((user) => {
                                const display = user.name?.trim() || user.email
                                return (
                                  <li
                                    key={user.email}
                                    className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2 text-sm animate-in fade-in-0 zoom-in-95"
                                  >
                                    <UserAvatar author={user} className="h-6 w-6 text-xs" />
                                    <span className="max-w-48 truncate" title={user.email}>
                                      {display}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Quitar a ${display}`}
                                      className="cursor-pointer rounded-full text-muted-foreground hover:text-destructive"
                                      onClick={() => field.onChange(recipients.filter((r) => r.email !== user.email))}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                          {errors.recipients && (
                            <p className="text-sm text-destructive">{errors.recipients.message ?? errors.recipients.root?.message}</p>
                          )}
                        </div>
                      )
                    }}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="cursor-pointer" disabled={createAnnouncement.isPending}>
                  <Send className="h-4 w-4" />
                  Enviar aviso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
            <CardDescription>Así lo verán en la campanita.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-3">
              <NotificationBody
                category="SYSTEM"
                title={values.title.trim() || "Título del aviso"}
                message={values.message.trim() || "El mensaje del aviso aparecerá aquí."}
                createdAt={new Date().toISOString()}
                read={false}
              />
            </div>
            {values.link.trim() && isInternalPath(values.link.trim()) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Al pulsarlo llevará a <code className="rounded bg-muted px-1 py-0.5">{values.link.trim()}</code>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pending != null}
        onOpenChange={(open) => !open && setPending(null)}
        title="¿Enviar el aviso a todos los usuarios?"
        description="Se entregará a todos los usuarios activos y no se puede retirar una vez enviado."
        confirmLabel="Enviar a todos"
        variant="default"
        onConfirm={() => (pending ? send(pending) : undefined)}
      />
    </PageContainer>
  )
}
