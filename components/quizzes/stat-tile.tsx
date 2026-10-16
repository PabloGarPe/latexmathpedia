import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Cifra con icono y etiqueta para las estadísticas de cuestionarios (ficha y perfil).
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  // Explicación breve de la cifra, debajo de la etiqueta.
  hint?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border bg-card p-4", className)}>
      <Icon className="h-4 w-4 text-purple-500" />
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  )
}
