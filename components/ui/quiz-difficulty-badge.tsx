import { Badge } from "@/components/ui/badge"

export const QUIZ_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const

export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Fácil",
  MEDIUM: "Media",
  HARD: "Difícil",
}

const DIFFICULTY_CLASS: Record<string, string> = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-transparent",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-transparent",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 border-transparent",
}

export function QuizDifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null
  return (
    <Badge className={DIFFICULTY_CLASS[difficulty] ?? ""}>
      {DIFFICULTY_LABEL[difficulty] ?? difficulty}
    </Badge>
  )
}
