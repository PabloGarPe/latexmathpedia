"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuiz,
  deleteQuiz,
  getAllQuizzes,
  getMyAttempts,
  getPublicQuizzes,
  getQuiz,
  getRecentQuizzes,
  getRecentSubscribedQuizzes,
  getTopQuizzes,
  getQuizForAttempt,
  getMyStats,
  getQuizLeaderboard,
  getQuizQuestions,
  getQuizStats,
  importQuiz,
  setQuizVisibility,
  submitQuizAttempt,
  updateQuiz,
  type CreateQuizDto,
  type QuizExportableDto,
  type SubmitQuizAttemptDto,
  type UpdateQuizDto,
} from "@/lib/api/quizzes";
import { useAuth } from "@/contexts/auth-context";
import { queryKeys } from "@/lib/query/keys";

export const QUIZ_ROW_LIMIT = 10;

// Las hileras públicas cambian despacio: 2 min de staleTime evita refetch al cambiar de pestaña.
const ROW_STALE_TIME = 2 * 60 * 1000;

export function useRecentQuizzes(limit = QUIZ_ROW_LIMIT, enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes.recent(limit),
    queryFn: () => getRecentQuizzes(limit),
    enabled,
    staleTime: ROW_STALE_TIME,
  });
}

// Hilera "Novedades de mis asignaturas" (solo con sesión; [] si no hay suscripciones).
export function useRecentSubscribedQuizzes(limit = QUIZ_ROW_LIMIT, enabled = true) {
  const { isAuthenticated, email } = useAuth();
  return useQuery({
    queryKey: queryKeys.quizzes.recentSubscribed(email, limit),
    queryFn: () => getRecentSubscribedQuizzes(limit),
    enabled: enabled && isAuthenticated,
    staleTime: ROW_STALE_TIME,
    retry: 1,
  });
}

export function useTopQuizzes(limit = QUIZ_ROW_LIMIT, enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes.top(limit),
    queryFn: () => getTopQuizzes(limit),
    enabled,
    staleTime: ROW_STALE_TIME,
  });
}

export function usePublicQuizzes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes.all(),
    queryFn: getPublicQuizzes,
    enabled,
  });
}

// Listado del admin (incluye ocultos). Clave propia para no mezclarse con el público.
export function useAllQuizzes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes.catalog(),
    queryFn: getAllQuizzes,
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
    // El intento ya está guardado cuando responde el back, así que refrescar ahora trae el
    // attemptCount actualizado sin carrera. Se excluye ["quizzes", id, "attempt"]: está activo
    // en la pantalla de resultado y volver a pedirlo cambiaría las preguntas bajo los pies.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizzes.all(),
        predicate: (query) => query.queryKey[2] !== "attempt",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
    },
  });
}

export function useMyAttempts(page: number, size = 10) {
  return useQuery({
    queryKey: queryKeys.attempts.page(page, size),
    queryFn: () => getMyAttempts(page, size),
    // Al cambiar de página se sigue viendo la anterior hasta que llega la nueva (sin parpadeo).
    placeholderData: keepPreviousData,
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

// Cambia el estado de publicación. Invalida todo lo de cuestionarios (listados, hileras y
// asignaturas) porque lo que ve el alumno cambia.
export function useSetQuizVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visible }: { id: number; visible: boolean }) => setQuizVisibility(id, visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
    },
  });
}
