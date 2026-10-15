"use client";

import { Flame, Sparkles } from "lucide-react";
import FeedRow from "@/components/feed-row";
import { QuizCard } from "@/components/quiz-card";
import { SubscribedFeedRow } from "@/components/subscriptions/subscribed-feed-row";
import { useAuth } from "@/contexts/auth-context";
import { useRecentQuizzes, useRecentSubscribedQuizzes, useTopQuizzes } from "@/hooks/api/use-quizzes";

function SubscribedRow() {
  return (
    <SubscribedFeedRow
      query={useRecentSubscribedQuizzes()}
      getKey={(quiz, index) => quiz.id ?? index}
      renderItem={(quiz) => <QuizCard quiz={quiz} />}
    />
  );
}

// Orden fijo: Novedades de mis asignaturas (solo con sesión), Novedades, Los más hechos. Cada una
// es su propia query, así que cargan y fallan por separado. "Los más hechos" llega vacía
// hasta el primer intento y entonces se oculta sola.
export function QuizRows() {
  const { isAuthenticated } = useAuth();
  const recent = useRecentQuizzes();
  const top = useTopQuizzes();
  return (
    <div className="space-y-8">
      {isAuthenticated && <SubscribedRow />}
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
