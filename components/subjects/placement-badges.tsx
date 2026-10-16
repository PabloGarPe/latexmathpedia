import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { SubjectPlacementInfoDto } from "@/lib/api/subjects"
import { curriculumHref, formatPlacement } from "@/lib/degrees"
import { cn } from "@/lib/utils"

// Dónde se cursa una asignatura, como badges "Grado · curso · cuatrimestre".
// - `full`: un badge por colocación (ficha de asignatura). Con `linked`, cada uno lleva al
//   plan de estudios del grado, anclado al curso.
// - `compact`: más pequeños y recortados a `max` (2 por defecto) con un "+N" para el resto
//   (tarjetas). Dentro de un <Link> hay que dejar `linked` en false: no se anidan enlaces.
export function PlacementBadges({
  placements,
  variant = "full",
  linked = false,
  max,
  className,
}: {
  placements?: SubjectPlacementInfoDto[] | null
  variant?: "full" | "compact"
  linked?: boolean
  max?: number
  className?: string
}) {
  if (!placements || placements.length === 0) return null

  const compact = variant === "compact"
  const limit = max ?? (compact ? 2 : placements.length)
  const visible = placements.slice(0, limit)
  const hidden = placements.slice(limit)

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1", className)}>
      {visible.map((placement) => {
        const badge = (
          <Badge
            variant={compact ? "outline" : "secondary"}
            title={placement.university ? `${placement.degreeName} · ${placement.university}` : undefined}
            className={cn("max-w-full", compact ? "px-1.5 py-0 text-[11px] font-medium" : "font-medium")}
          >
            <span className="truncate">{formatPlacement(placement)}</span>
          </Badge>
        )
        const key = `${placement.degreeId}-${placement.year}`
        return linked && placement.degreeId != null ? (
          <Link key={key} href={curriculumHref(placement.degreeId, placement.year)} className="max-w-full">
            {badge}
          </Link>
        ) : (
          <span key={key} className="inline-flex max-w-full">
            {badge}
          </span>
        )
      })}
      {hidden.length > 0 && (
        <Badge
          variant="outline"
          title={hidden.map(formatPlacement).join("\n")}
          className={cn("text-muted-foreground", compact ? "px-1.5 py-0 text-[11px] font-medium" : "font-medium")}
        >
          +{hidden.length}
        </Badge>
      )}
    </div>
  )
}
