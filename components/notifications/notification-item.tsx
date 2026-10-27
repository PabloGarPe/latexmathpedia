"use client"

import { Check, MoreHorizontal, Trash2, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeleteNotification, useMarkRead, useMarkUnread } from "@/hooks/api/use-notifications"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import type { NotificationDto } from "@/lib/api/notifications"
import { notificationHref, notificationVisual } from "@/lib/notifications/registry"
import { cn, formatRelativeTime } from "@/lib/utils"

// Lo que se ve de una notificación (icono por tipo o categoría, texto y punto de no leída). Lo comparte
// la lista y la vista previa del formulario de avisos de admin, para que se vean idénticas.
export function NotificationBody({
  type,
  category,
  title,
  message,
  createdAt,
  read,
}: {
  // Si el tipo tiene icono propio (p. ej. los comentarios), pisa al de la categoría.
  type?: string | null
  category?: string | null
  title?: string
  message?: string
  createdAt?: string | null
  read: boolean
}) {
  const { icon: Icon, toneClass } = notificationVisual(type, category)
  return (
    <>
      <span
        aria-hidden="true"
        className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneClass)}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className={cn("block text-sm leading-snug", read ? "font-medium" : "font-semibold")}>
          {!read && <span className="sr-only">Sin leer: </span>}
          {title}
        </span>
        {message && <span className="line-clamp-2 block text-sm text-muted-foreground">{message}</span>}
        <span className="block text-xs text-muted-foreground/80">{formatRelativeTime(createdAt)}</span>
      </span>
      {!read && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </>
  )
}

// Una notificación. Clic: marca como leída y navega (si tiene destino). El título y el mensaje
// llegan redactados del backend y se pintan tal cual. El menú "⋯" va como hermano del botón
// principal (un botón dentro de otro no es HTML válido).
export function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: NotificationDto
  // Se llama justo antes de navegar (p. ej. para cerrar el desplegable).
  onNavigate?: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const markRead = useMarkRead()
  const markUnread = useMarkUnread()
  const remove = useDeleteNotification()

  const { id, read, title, message, createdAt } = notification
  const href = notificationHref(notification)

  // Un 404 es "ya no existe": la refetch posterior la quita de la lista, no es un error.
  const fail = (action: string) => (error: unknown) => {
    if (!(error instanceof ApiError && error.status === 404)) toast.error(`No se pudo ${action}.`)
  }

  const open = () => {
    if (id == null) return
    // No se espera a la respuesta: la actualización optimista ya la marca como leída.
    if (!read) markRead.mutate(id, { onError: () => {} })
    if (href) {
      onNavigate?.()
      router.push(href)
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-1 rounded-lg transition-colors hover:bg-accent/60",
        !read && "bg-primary/5",
      )}
    >
      <button
        type="button"
        onClick={open}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          !href && read && "cursor-default",
        )}
      >
        <NotificationBody
          type={notification.type}
          category={notification.category}
          title={title}
          message={message}
          createdAt={createdAt}
          read={!!read}
        />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Acciones de la notificación"
            className="mt-2 mr-1 h-7 w-7 shrink-0 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {read ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => id != null && markUnread.mutate(id, { onError: fail("marcarla como no leída") })}
            >
              <Undo2 />
              Marcar como no leída
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => id != null && markRead.mutate(id, { onError: fail("marcarla como leída") })}
            >
              <Check />
              Marcar como leída
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onSelect={() => id != null && remove.mutate(id, { onError: fail("eliminarla") })}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
