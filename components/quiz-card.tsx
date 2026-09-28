"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge";
import type { QuizDto } from "@/lib/api/quizzes";
import { formatDate } from "@/lib/utils";

export function QuizCard({ quiz }: { quiz: QuizDto }) {
  return (
    <Link href={`/dashboard/quizzes/${quiz.id}`}>
      <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md hover:scale-102">
        <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors duration-200">
            {quiz.name}
          </CardTitle>
          <QuizDifficultyBadge difficulty={quiz.difficulty} />
        </CardHeader>
        <CardContent className="p-4 pt-2 grow">
          {quiz.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-col items-start gap-2">
          {(quiz.subject?.name || quiz.subjectUnit?.name) && (
            <div className="flex flex-wrap gap-2">
              {quiz.subject?.name && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {quiz.subject.name}
                </span>
              )}
              {quiz.subjectUnit?.name && (
                <span className="text-xs bg-secondary/10 text-primary px-2 py-0.5 rounded-full">
                  {quiz.subjectUnit.name}
                </span>
              )}
            </div>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(quiz.lastTimeEdited)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
