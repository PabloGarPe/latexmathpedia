import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Contador compacto a partir de 1000 ("1,2k", "3M"). Trunca en vez de redondear para que
// 1999 no se vea como "2k"; sin decimal cuando sería ",0".
export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value < 1000) return String(Math.max(0, Math.trunc(value || 0)))
  const [divisor, suffix] = value >= 1_000_000 ? [1_000_000, "M"] : [1000, "k"]
  const scaled = Math.floor((value / divisor) * 10) / 10
  return `${String(scaled).replace(".", ",")}${suffix}`
}

// Formato de fecha compartido por las tarjetas de contenido y las tablas de admin
// (antes duplicado casi idéntico en 6 sitios distintos).
export function formatDate(iso?: string): string {
  if (!iso) return "-"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// "hace 5 min", "ayer"… para listas de actividad. Pasada una semana, fecha normal.
export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
  if (abs < 60) return "ahora"
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour")
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), "day")
  return formatDate(iso)
}
