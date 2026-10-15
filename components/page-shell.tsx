import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Marco común de las páginas de listado del dashboard (feed, asignaturas, cuestionarios, blog…).
// Replica el contenedor del feed (`DashboardFeed`): mismo relleno y mismo ancho máximo, para que
// al cambiar de pestaña el contenido no "salte" de sitio.
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-8 max-w-325 mx-auto", className)} {...props} />
}

// Cabecera estándar: título al estilo del feed (text-2xl), descripción opcional y hueco para
// acciones/filtros a la derecha.
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-center justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
