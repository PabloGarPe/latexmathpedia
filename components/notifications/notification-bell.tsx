"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Settings } from "lucide-react"
import { NotificationItem } from "@/components/notifications/notification-item"
import {
  NotificationsEmpty,
  NotificationsError,
  NotificationsSkeleton,
} from "@/components/notifications/notification-states"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import {
  NOTIFICATIONS_POPOVER_SIZE,
  useMarkAllRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/api/use-notifications"
import { cn } from "@/lib/utils"

function BellPanel({ unreadCount, onClose }: { unreadCount: number; onClose: () => void }) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, isLoading, isError, refetch } = useNotifications(unreadOnly, NOTIFICATIONS_POPOVER_SIZE)
  const markAllRead = useMarkAllRead()
  const items = data?.content ?? []

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Notificaciones</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer gap-1 px-2 text-xs"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Marcar todas como leídas
        </Button>
      </div>

      <div className="flex gap-1 border-b px-3 py-2" role="group" aria-label="Filtrar notificaciones">
        {[
          { value: false, label: "Todas" },
          { value: true, label: "No leídas" },
        ].map((option) => (
          <Button
            key={option.label}
            variant={unreadOnly === option.value ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={unreadOnly === option.value}
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => setUnreadOnly(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto p-1">
        {isLoading ? (
          <NotificationsSkeleton />
        ) : isError ? (
          <NotificationsError onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <NotificationsEmpty unreadOnly={unreadOnly} />
        ) : (
          items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onNavigate={onClose} />
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link href="/dashboard/notifications" onClick={onClose}>
            Ver todas
          </Link>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/dashboard/profile/notifications" onClick={onClose} aria-label="Preferencias de notificaciones">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preferencias</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}

// Campanita del header. Solo con sesión: sin token los endpoints devuelven 401. El contador se
// refresca solo (polling en useUnreadCount); la lista se pide al abrir.
export function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const { data: count = 0 } = useUnreadCount(isAuthenticated)

  if (!isAuthenticated) return null

  const label = count > 0 ? `Notificaciones, ${count} sin leer` : "Notificaciones"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0 cursor-pointer" aria-label={label}>
              <Bell className="h-4 w-4" />
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white",
                  )}
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notificaciones</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-1.5rem))] p-0">
        <BellPanel unreadCount={count} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
