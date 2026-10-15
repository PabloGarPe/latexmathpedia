"use client";

import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge";
import type { QuizDto } from "@/lib/api/quizzes";
import { formatDate } from "@/lib/utils";

// Banda superior decorativa. En el feed ("Todo") la insignia de tipo de ContentCard se
// superpone sobre su esquina izquierda, así que aquí no se pone nada a la izquierda y el
// título empieza siempre por debajo de la banda: no hay solapamiento posible.
export function QuizCard({ quiz }: { quiz: QuizDto }) {
  return (
    <Link href={`/dashboard/quizzes/${quiz.id}`} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative h-14 shrink-0 overflow-hidden bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent dark:from-purple-500/30 dark:via-fuchsia-500/15">
          <ListChecks className="absolute -bottom-3 left-1/2 h-16 w-16 -rotate-12 text-purple-500/15" />
          <div className="absolute right-3 top-3">
            <QuizDifficultyBadge difficulty={quiz.difficulty} />
          </div>
        </div>

        <div className="flex grow flex-col gap-2 p-4">
          <h3 className="text-base font-semibold leading-snug transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-300">
            {quiz.name}
          </h3>
          {quiz.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{quiz.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {(quiz.subject?.name || quiz.subjectUnit?.name) && (
            <div className="flex flex-wrap gap-1.5">
              {quiz.subject?.name && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/60 dark:text-purple-100">
                  {quiz.subject.name}
                </span>
              )}
              {quiz.subjectUnit?.name && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {quiz.subjectUnit.name}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{formatDate(quiz.lastTimeEdited)}</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground/70 transition-all group-hover:gap-2 group-hover:text-foreground">
              Empezar
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
