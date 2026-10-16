// Colores de una nota según el porcentaje de acierto (0-100). Los mismos umbrales en el anillo
// del resultado y en el historial del perfil, para que un 6 se vea igual en los dos sitios.
export type ScoreTone = "good" | "fair" | "poor"

export function scoreTone(percentage: number): ScoreTone {
  if (percentage >= 70) return "good"
  if (percentage >= 50) return "fair"
  return "poor"
}

export const SCORE_TONE_TEXT: Record<ScoreTone, string> = {
  good: "text-green-500",
  fair: "text-amber-500",
  poor: "text-red-500",
}

// Fondo suave + texto, para insignias con la nota.
export const SCORE_TONE_BADGE: Record<ScoreTone, string> = {
  good: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200",
  fair: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  poor: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200",
}

// Notas sobre 10 (score, adjustedScore, averageScore, bestScore).
export const formatScore = (score?: number | null) => (score != null ? score.toFixed(1) : "-")
