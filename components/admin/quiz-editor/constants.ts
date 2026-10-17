import type { OptionDto } from "@/lib/api/options"

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE"] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Opción múltiple",
  TRUE_FALSE: "Verdadero / Falso",
}

// El back guarda `position` pero no ordena por ella: el orden se aplica siempre en el cliente.
export function sortByPosition<T extends { id?: number; position?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.id ?? 0) - (b.id ?? 0))
}

// Una pregunta solo se puede contestar si tiene al menos dos opciones y una marcada como correcta.
// `null` = aún no se han cargado las opciones.
export function questionIssue(options: OptionDto[] | undefined): string | null {
  if (!options) return null
  if (options.length < 2) return "Necesita al menos 2 opciones"
  if (!options.some((option) => option.correct)) return "Falta marcar la respuesta correcta"
  return null
}

// Para pintar un enunciado con RichText compact dentro de un resumen recortado (line-clamp): las
// fórmulas en bloque pasan a fluir en línea y sin scroll propio, y lo que sobra lo corta el clamp.
export const CLAMPED_RICH_TEXT_CLASS =
  "[&_.katex-display]:my-0 [&_.katex-display]:inline-block [&_.katex-display]:overflow-hidden [&_.katex-display]:align-middle"
