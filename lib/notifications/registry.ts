import { Bell, BookOpen, Megaphone, MessageSquare, UserRound, type LucideIcon } from "lucide-react"
import type { NotificationDto } from "@/lib/api/notifications"
import { commentHref } from "@/lib/comments"
import { isInternalPath } from "@/lib/utils"

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

// Icono propio por tipo, que pisa al de la categoría (los comentarios son PERSONAL o SYSTEM
// según el tipo, pero conviene que se reconozcan de un vistazo). Los tipos sin entrada usan el
// de su categoría.
const TYPE_VISUALS: Record<string, Pick<CategoryMeta, "icon" | "toneClass">> = {
  COMMENT_REPLY: { icon: MessageSquare, toneClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  COMMENT_ON_PDF: { icon: MessageSquare, toneClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  COMMENT_REJECTED: { icon: MessageSquare, toneClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  COMMENT_REVIEW_PENDING: { icon: MessageSquare, toneClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
}

export function notificationVisual(type?: string | null, category?: string | null) {
  return (type && TYPE_VISUALS[type]) || categoryMeta(category)
}

const CHANNELS: Record<string, { label: string; description: string }> = {
  IN_APP: { label: "En la web", description: "Campanita de la plataforma" },
  EMAIL: { label: "Correo", description: "Mensaje a tu email" },
}

export function channelMeta(channel: string) {
  return CHANNELS[channel] ?? { label: channel, description: "" }
}

const SCOPES: Record<string, string> = {
  ALL: "Todas las asignaturas",
  SUBSCRIBED: "Solo mis asignaturas",
}

export function scopeLabel(scope: string) {
  return SCOPES[scope] ?? scope
}

// Destino de una notificación, o null si solo hay que marcarla como leída.
export function notificationHref(n: NotificationDto): string | null {
  switch (n.type) {
    // resourceId es el PDF; el comentario va aparte en `commentId`.
    case "COMMENT_REPLY":
    case "COMMENT_ON_PDF":
      if (n.resourceId != null) return commentHref(n.resourceId, n.commentId)
      break
    // Sin id: el comentario rechazado no se puede ver en el hilo, el autor lo tiene en «Tus comentarios».
    case "COMMENT_REJECTED":
      if (n.resourceId != null) return commentHref(n.resourceId)
      break
    // La cola no filtra por comentario.
    case "COMMENT_REVIEW_PENDING":
      return "/dashboard/admin/comments"
  }
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
