"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuiz,
  deleteQuiz,
  getMyAttempts,
  getPublicQuizzes,
  getQuiz,
  getQuizForAttempt,
  getMyStats,
  getQuizLeaderboard,
  getQuizQuestions,
  getQuizStats,
  importQuiz,
  submitQuizAttempt,
  updateQuiz,
  type CreateQuizDto,
  type QuizExportableDto,
  type SubmitQuizAttemptDto,
  type UpdateQuizDto,
} from "@/lib/api/quizzes";
import { queryKeys } from "@/lib/query/keys";

export function usePublicQuizzes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes.all(),
    queryFn: getPublicQuizzes,
    enabled,
  });
}

export function useQuiz(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(id ?? -1),
    queryFn: () => getQuiz(id as number),
    enabled: id != null,
  });
}

export function useQuizForAttempt(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(id ?? -1),
    queryFn: () => getQuizForAttempt(id as number),
    enabled: id != null,
  });
}

export function useSubmitQuizAttempt(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitQuizAttemptDto) => submitQuizAttempt(quizId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts.all() });
    },
  });
}

export function useMyAttempts(page: number, size = 10) {
  return useQuery({
    queryKey: queryKeys.attempts.page(page, size),
    queryFn: () => getMyAttempts(page, size),
  });
}

export function useMyStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.attempts.stats(),
    queryFn: getMyStats,
    enabled,
  });
}

export function useQuizStats(quizId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.stats(quizId ?? -1),
    queryFn: () => getQuizStats(quizId as number),
    enabled: quizId != null,
  });
}

export function useQuizLeaderboard(quizId: number | null | undefined, page: number, size = 10) {
  return useQuery({
    queryKey: queryKeys.quizzes.leaderboard(quizId ?? -1, page, size),
    queryFn: () => getQuizLeaderboard(quizId as number, page, size),
    enabled: quizId != null,
  });
}

// --- Administración (T-17 parte 2) ---

export function useQuizQuestions(quizId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.questions(quizId ?? -1),
    queryFn: () => getQuizQuestions(quizId as number),
    enabled: quizId != null,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateQuizDto) => createQuiz(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateQuizDto }) => updateQuiz(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}

export function useImportQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subjectId,
      subjectUnitId,
      body,
    }: {
      subjectId: number;
      subjectUnitId: number | null;
      body: QuizExportableDto;
    }) => importQuiz(subjectId, subjectUnitId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}
