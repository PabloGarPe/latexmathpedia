import { BellOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function NotificationsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1 p-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsEmpty({ unreadOnly }: { unreadOnly?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BellOff className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium">{unreadOnly ? "Estás al día" : "No tienes notificaciones"}</p>
      <p className="text-xs text-muted-foreground">
        {unreadOnly
          ? "No tienes notificaciones sin leer."
          : "Aquí aparecerán las novedades de contenido y los avisos."}
      </p>
    </div>
  )
}

export function NotificationsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">No se pudieron cargar las notificaciones.</p>
      <Button variant="outline" size="sm" className="cursor-pointer" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  )
}
