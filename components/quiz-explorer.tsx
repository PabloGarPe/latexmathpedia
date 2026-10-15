"use client";

import { useCallback, useState } from "react";
import {
  CatalogFilterBar,
  FILTER_ALL,
  useCatalogFilters,
  type SortOption,
} from "@/components/catalog-filters";
import { QuizCard } from "@/components/quiz-card";
import { DIFFICULTY_LABEL, QUIZ_DIFFICULTIES } from "@/components/ui/quiz-difficulty-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuizDto } from "@/lib/api/quizzes";

const SORT_OPTIONS: SortOption<QuizDto>[] = [
  {
    key: "recent",
    label: "Más recientes",
    compare: (a, b) =>
      new Date(b.lastTimeEdited ?? 0).getTime() - new Date(a.lastTimeEdited ?? 0).getTime(),
  },
  { key: "popular", label: "Más hechos", compare: (a, b) => (b.attemptCount ?? 0) - (a.attemptCount ?? 0) },
  {
    key: "name",
    label: "Nombre (A-Z)",
    compare: (a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es", { sensitivity: "base" }),
  },
];

const getSubject = (quiz: QuizDto) => quiz.subject;
const getUnit = (quiz: QuizDto) => quiz.subjectUnit;

type Props = {
  quizzes: QuizDto[];
  isLoading: boolean;
  emptyMessage: string;
};

// "Explorar todo" de cuestionarios: el catálogo completo (GET /public/quiz) con filtros por
// asignatura, tema y dificultad, y orden por recientes / más hechos / nombre, todo en cliente.
export function QuizExplorer({ quizzes, isLoading, emptyMessage }: Props) {
  const [difficulty, setDifficulty] = useState(FILTER_ALL);
  const predicate = useCallback(
    (quiz: QuizDto) => difficulty === FILTER_ALL || quiz.difficulty === difficulty,
    [difficulty],
  );
  const filters = useCatalogFilters({ items: quizzes, getSubject, getUnit, sortOptions: SORT_OPTIONS, predicate });

  return (
    <section aria-label="Explorar todo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Explorar todo</h3>
        <CatalogFilterBar filters={filters}>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por dificultad">
              <SelectValue placeholder="Dificultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Toda dificultad</SelectItem>
              {QUIZ_DIFFICULTIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {DIFFICULTY_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogFilterBar>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse bg-muted rounded-lg h-40"></div>
            ))
          : filters.visible.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} />)}
      </div>
      {!isLoading && filters.visible.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export default QuizExplorer;
