import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Bloques de las pantallas de ajustes del perfil. Añadir un campo nuevo a una sección es añadir
// una <SettingsRow>; una sección nueva es otra <SettingsSection> (y, si merece pantalla propia,
// una entrada en `PROFILE_SECTIONS` de components/settings/profile-nav.tsx).

export function SettingsSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  // Hueco a la derecha de la cabecera (p. ej. un botón "Restablecer todo").
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  )
}

// Fila de ajuste: etiqueta + descripción a la izquierda y el control a la derecha (en móvil el
// control baja debajo del texto). Con `stacked` el control ocupa todo el ancho (formularios).
export function SettingsRow({
  label,
  description,
  htmlFor,
  stacked,
  children,
  className,
}: {
  label: ReactNode
  description?: ReactNode
  htmlFor?: string
  stacked?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex gap-3 py-4 first:pt-0 last:pb-0",
        stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
          {label}
        </label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className={cn("shrink-0", stacked && "w-full")}>{children}</div>}
    </div>
  )
}
