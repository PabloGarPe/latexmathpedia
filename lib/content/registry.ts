import { FileIcon, ListChecks, Newspaper, type LucideIcon } from "lucide-react";
import type { ContentItem } from "@/lib/content/types";

type ContentTypeMeta = {
  label: string;
  icon: LucideIcon;
  // Clases de acento para la insignia de tipo en la esquina de la tarjeta, mismo patrón
  // bg-*-100 dark:bg-*-900 que ya usa pdf-card.tsx.
  accentClass: string;
  // Ruta de detalle del recurso.
  href: (item: ContentItem) => string;
};

export const CONTENT_TYPES: Record<ContentItem["kind"], ContentTypeMeta> = {
  pdf: {
    label: "PDF",
    icon: FileIcon,
    accentClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    href: (item) => (item.kind === "pdf" ? `/dashboard/pdfs/${item.data.id}` : ""),
  },
  quiz: {
    label: "Cuestionario",
    icon: ListChecks,
    accentClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    href: (item) => (item.kind === "quiz" ? `/dashboard/quizzes/${item.data.id}` : ""),
  },
  blog: {
    label: "Artículo",
    icon: Newspaper,
    accentClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    href: (item) => (item.kind === "blog" ? `/dashboard/blog/${item.data.slug}` : ""),
  },
};
