"use client";

import { Flame, Sparkles } from "lucide-react";
import FeedRow from "@/components/feed-row";
import { QuizCard } from "@/components/quiz-card";
import { useRecentQuizzes, useTopQuizzes } from "@/hooks/api/use-quizzes";

// Orden fijo: Novedades, Los más hechos. Ambas son públicas (sin hilera personal) y cada una
// es su propia query, así que cargan y fallan por separado. "Los más hechos" llega vacía
// hasta el primer intento y entonces se oculta sola.
export function QuizRows() {
  const recent = useRecentQuizzes();
  const top = useTopQuizzes();
  return (
    <div className="space-y-8">
      <FeedRow
        title="Novedades"
        icon={Sparkles}
        query={recent}
        getKey={(quiz, index) => quiz.id ?? index}
        renderItem={(quiz) => <QuizCard quiz={quiz} />}
      />
      <FeedRow
        title="Los más hechos"
        icon={Flame}
        query={top}
        getKey={(quiz, index) => quiz.id ?? index}
        renderItem={(quiz) => <QuizCard quiz={quiz} />}
      />
    </div>
  );
}

export default QuizRows;
