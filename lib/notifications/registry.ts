import { Bell, BookOpen, Megaphone, UserRound, type LucideIcon } from "lucide-react"
import type { NotificationDto } from "@/lib/api/notifications"

// Todo lo que varía por tipo de notificación vive aquí. El catálogo del backend puede crecer, así
// que los lookups son `Record<string, …>` con fallback: un tipo/categoría/canal nuevo nunca rompe.

type CategoryMeta = {
  // Título de sección en la pantalla de preferencias.
  sectionTitle: string
  sectionDescription: string
  icon: LucideIcon
  // Clases completas (Tailwind las necesita escritas tal cual).
  toneClass: string
}

const CATEGORIES: Record<string, CategoryMeta> = {
  CONTENT: {
    sectionTitle: "Novedades de contenido",
    sectionDescription: "Avisos cuando se añade o cambia contenido de la plataforma.",
    icon: BookOpen,
    toneClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  PERSONAL: {
    sectionTitle: "Para ti",
    sectionDescription: "Avisos que te afectan directamente.",
    icon: UserRound,
    toneClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  SYSTEM: {
    sectionTitle: "Sistema",
    sectionDescription: "Avisos de la plataforma.",
    icon: Megaphone,
    toneClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
}

const FALLBACK_CATEGORY: CategoryMeta = {
  sectionTitle: "Otras notificaciones",
  sectionDescription: "",
  icon: Bell,
  toneClass: "bg-muted text-muted-foreground",
}

export function categoryMeta(category?: string | null): CategoryMeta {
  return (category && CATEGORIES[category]) || FALLBACK_CATEGORY
}

// Orden de las secciones en preferencias; las categorías desconocidas van al final.
const CATEGORY_ORDER = Object.keys(CATEGORIES)
export function compareCategories(a: string, b: string) {
  const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length)
  return rank(a) - rank(b)
}

const CHANNELS: Record<string, { label: string; description: string }> = {
  IN_APP: { label: "En la web", description: "Campanita de la plataforma" },
  EMAIL: { label: "Correo", description: "Mensaje a tu email" },
}

export function channelMeta(channel: string) {
  return CHANNELS[channel] ?? { label: channel, description: "" }
}

const SCOPES: Record<string, string> = {
  ALL: "Todo",
  SUBSCRIBED: "Solo mis asignaturas",
}

export function scopeLabel(scope: string) {
  return SCOPES[scope] ?? scope
}

// Ruta interna segura: empieza por "/" y no por "//", sin "\". Defensa en profundidad: el
// backend ya lo valida, pero nunca se navega a algo que no sea una ruta del propio front.
export function isInternalPath(link?: string | null): link is string {
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//") && !link.includes("\\")
}

// Destino de una notificación, o null si solo hay que marcarla como leída.
export function notificationHref(n: NotificationDto): string | null {
  switch (n.resourceType) {
    case "PDF":
      if (n.resourceId != null) return `/dashboard/pdfs/${n.resourceId}`
      break
    case "QUIZ":
      if (n.resourceId != null) return `/dashboard/quizzes/${n.resourceId}`
      break
    case "SUBJECT":
      if (n.resourceId != null) return `/dashboard/subjects/${n.resourceId}`
      break
    case "SUBJECT_UNIT":
      if (n.subjectId != null) return `/dashboard/subjects/${n.subjectId}`
      break
  }
  return isInternalPath(n.link) ? n.link : null
}
