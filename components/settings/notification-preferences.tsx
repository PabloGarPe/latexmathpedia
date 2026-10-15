"use client"

import { useMemo } from "react"
import Link from "next/link"
import { RefreshCw, RotateCcw } from "lucide-react"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/api/use-notifications"
import { useMySubscriptions } from "@/hooks/api/use-subscriptions"
import { useToast } from "@/hooks/use-toast"
import type { NotificationPreferenceDto, UpdateNotificationPreferenceItem } from "@/lib/api/notifications"
import { categoryMeta, channelMeta, compareCategories, scopeLabel } from "@/lib/notifications/registry"

// La pantalla se construye a partir de los datos del backend, sin asumir su forma actual:
//  - una sección por `category` y una fila por `type`;
//  - una columna por canal presente (hoy solo IN_APP; si llega EMAIL aparece sola);
//  - el selector de alcance solo sale si el tipo admite más de uno (`availableScopes.length > 1`).
// Cada cambio se guarda al momento (optimista, con vuelta atrás si falla).

type Row = NotificationPreferenceDto & { type: string; channel: string; category: string }

type TypeGroup = {
  type: string
  label: string
  description: string
  // Una celda por canal.
  cells: Row[]
}

const isComplete = (row: NotificationPreferenceDto): row is Row =>
  !!row.type && !!row.channel && !!row.category

export function NotificationPreferences() {
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()
  // Con alcance "Solo mis asignaturas" y sin suscripciones no llega ningún aviso: se avisa en línea.
  const subscriptions = useMySubscriptions()
  const hasNoSubscriptions = subscriptions.isSuccess && subscriptions.data.length === 0

  const { channels, categories } = useMemo(() => {
    const rows = (data ?? []).filter(isComplete)
    const channels = [...new Set(rows.map((r) => r.channel))]
    const byCategory = new Map<string, Map<string, TypeGroup>>()
    for (const row of rows) {
      const types = byCategory.get(row.category) ?? new Map<string, TypeGroup>()
      const group = types.get(row.type) ?? {
        type: row.type,
        label: row.label ?? row.type,
        description: row.description ?? "",
        cells: [],
      }
      group.cells.push(row)
      types.set(row.type, group)
      byCategory.set(row.category, types)
    }
    const categories = [...byCategory.entries()]
      .sort(([a], [b]) => compareCategories(a, b))
      .map(([category, types]) => ({ category, groups: [...types.values()] }))
    return { channels, categories }
  }, [data])

  const save = (changes: UpdateNotificationPreferenceItem[]) =>
    update.mutate(changes, {
      onError: () => toast.error("No se pudo guardar la preferencia. Inténtalo de nuevo."),
    })

  const toItem = (row: Row, patch: Partial<UpdateNotificationPreferenceItem>) =>
    ({ type: row.type, channel: row.channel, enabled: row.enabled ?? true, ...patch }) as UpdateNotificationPreferenceItem

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        {[0, 1].map((key) => (
          <Skeleton key={key} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
        <p className="text-sm text-muted-foreground">No se pudieron cargar tus preferencias.</p>
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  if (categories.length === 0) {
    return <p className="rounded-xl border p-10 text-center text-sm text-muted-foreground">No hay notificaciones configurables.</p>
  }

  const showChannelLabels = channels.length > 1

  return (
    <>
      {categories.map(({ category, groups }) => {
        const meta = categoryMeta(category)
        return (
          <SettingsSection
            key={category}
            title={meta.sectionTitle}
            description={meta.sectionDescription || undefined}
            icon={meta.icon}
          >
            {groups.map((group) => {
              const modified = group.cells.filter((c) => c.enabled !== c.defaultEnabled && c.defaultEnabled != null)
              return (
                <SettingsRow
                  key={group.type}
                  label={group.label}
                  description={
                    <>
                      {group.description}
                      {modified.length > 0 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-1 h-auto cursor-pointer gap-1 p-0 text-xs"
                          onClick={() => save(modified.map((c) => toItem(c, { enabled: c.defaultEnabled as boolean })))}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restablecer
                        </Button>
                      )}
                    </>
                  }
                >
                  <div className="flex items-start gap-6">
                    {group.cells.map((cell) => {
                      const channel = channelMeta(cell.channel)
                      const scopes = (cell.availableScopes ?? []) as string[]
                      return (
                        <div key={cell.channel} className="flex flex-col items-center gap-2">
                          <label className="flex flex-col items-center gap-1.5">
                            <span className={showChannelLabels ? "text-xs text-muted-foreground" : "sr-only"}>
                              {channel.label}
                            </span>
                            <Switch
                              checked={cell.enabled ?? true}
                              onCheckedChange={(enabled) => save([toItem(cell, { enabled })])}
                              aria-label={`${group.label} · ${channel.label}`}
                            />
                          </label>
                          {scopes.length > 1 && (
                            <Select
                              value={cell.scope ?? scopes[0]}
                              onValueChange={(scope) =>
                                save([toItem(cell, { scope: scope as UpdateNotificationPreferenceItem["scope"] })])
                              }
                            >
                              <SelectTrigger size="sm" aria-label={`Alcance de ${group.label}`} className="w-52">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {scopes.map((scope) => (
                                  <SelectItem key={scope} value={scope}>
                                    {scopeLabel(scope)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {hasNoSubscriptions && cell.scope === "SUBSCRIBED" && (
                            <p className="max-w-52 text-center text-xs text-amber-700 dark:text-amber-300">
                              No estás suscrito a ninguna asignatura.{" "}
                              <Link href="/dashboard/subjects" className="font-medium underline underline-offset-2">
                                Suscribirme
                              </Link>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </SettingsRow>
              )
            })}
          </SettingsSection>
        )
      })}

      <p className="text-xs text-muted-foreground">
        Desactivar un tipo solo afecta a las notificaciones nuevas: las que ya has recibido se conservan.
        Los avisos de la plataforma y el mensaje de bienvenida se envían siempre.
      </p>
    </>
  )
}
