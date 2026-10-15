"use client"

import { DIFFICULTY_LABEL, QUIZ_DIFFICULTIES } from "@/components/ui/quiz-difficulty-badge"
import { cn } from "@/lib/utils"

type Difficulty = (typeof QUIZ_DIFFICULTIES)[number]

// Clases escritas enteras para que Tailwind las detecte.
const STYLE: Record<Difficulty, { dot: string; selected: string }> = {
  EASY: { dot: "bg-green-500", selected: "border-green-500 bg-green-500/10" },
  MEDIUM: { dot: "bg-amber-500", selected: "border-amber-500 bg-amber-500/10" },
  HARD: { dot: "bg-red-500", selected: "border-red-500 bg-red-500/10" },
}

// Selector segmentado de dificultad (tres opciones: no merece un desplegable).
export function DifficultyPicker({
  value,
  onChange,
  disabled,
}: {
  value: Difficulty
  onChange: (value: Difficulty) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Dificultad" className="grid grid-cols-3 gap-2">
      {QUIZ_DIFFICULTIES.map((difficulty) => {
        const selected = value === difficulty
        return (
          <button
            key={difficulty}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(difficulty)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
              selected ? STYLE[difficulty].selected : "text-muted-foreground",
            )}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", STYLE[difficulty].dot)} />
            {DIFFICULTY_LABEL[difficulty]}
          </button>
        )
      })}
    </div>
  )
}
