import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export { ApiError };

export type QuizDto = components["schemas"]["QuizDto"];
export type QuizForAttemptDto = components["schemas"]["QuizForAttemptDto"];
export type QuestionForAttemptDto = components["schemas"]["QuestionForAttemptDto"];
export type OptionForAttemptDto = components["schemas"]["OptionForAttemptDto"];
export type SubmitQuizAttemptDto = components["schemas"]["SubmitQuizAttemptDto"];
export type AttemptAnswerSubmissionDto = components["schemas"]["AttemptAnswerSubmissionDto"];
export type QuizAttemptResultDto = components["schemas"]["QuizAttemptResultDto"];
export type AttemptAnswerResultDto = components["schemas"]["AttemptAnswerResultDto"];
export type QuizAttemptDto = components["schemas"]["QuizAttemptDto"];
export type PageQuizAttemptDto = components["schemas"]["PageQuizAttemptDto"];
export type CreateQuizDto = components["schemas"]["CreateQuizDto"];
export type UpdateQuizDto = components["schemas"]["UpdateQuizDto"];
export type QuizExportableDto = components["schemas"]["QuizExportableDto"];
export type QuestionExportableDto = components["schemas"]["QuestionExportableDto"];
export type OptionExportableDto = components["schemas"]["OptionExportableDto"];
export type QuizAttemptStatsDto = components["schemas"]["QuizAttemptStatsDto"];
export type LeaderboardEntryDto = components["schemas"]["LeaderboardEntryDto"];
export type PageLeaderboardEntryDto = components["schemas"]["PageLeaderboardEntryDto"];

export async function getPublicQuizzes() {
  const { data, error } = await apiClient.GET("/public/quiz");
  if (error) throw error;
  return data;
}

export async function getQuiz(id: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function getQuizForAttempt(id: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}/attempt", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function submitQuizAttempt(id: number, body: SubmitQuizAttemptDto) {
  const { data, error, response } = await apiClient.POST("/quiz/{id}/submit", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo enviar el intento del cuestionario");
  return data;
}

// El parámetro de la operación se llama "pageable" en el OpenAPI, pero Spring
// (PageableHandlerMethodArgumentResolver) espera page=&size= planos, no pageable[page]=
// como serializa por defecto openapi-fetch (style: "deepObject") para objetos anidados. Se
// fuerza aquí un querySerializer propio para esta llamada; sin él, la paginación es un no-op
// silencioso (confirmado leyendo node_modules/openapi-fetch/src/index.js).
export async function getMyAttempts(page: number, size: number) {
  const { data, error } = await apiClient.GET("/attempts", {
    params: { query: { pageable: { page, size } } },
    querySerializer: (query: { pageable?: { page?: number; size?: number } }) => {
      const search = new URLSearchParams();
      if (query.pageable?.page != null) search.set("page", String(query.pageable.page));
      if (query.pageable?.size != null) search.set("size", String(query.pageable.size));
      return search.toString();
    },
  });
  if (error) throw error;
  return data;
}

// --- Administración (T-17 parte 2) ---

export async function createQuiz(body: CreateQuizDto) {
  const { data, error, response } = await apiClient.POST("/quiz/create", { body });
  if (error) throw new ApiError(response.status, "No se pudo crear el cuestionario");
  return data;
}

export async function updateQuiz(id: number, body: UpdateQuizDto) {
  const { data, error, response } = await apiClient.PUT("/quiz/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar el cuestionario");
  return data;
}

export async function deleteQuiz(id: number) {
  const { error, response } = await apiClient.DELETE("/quiz/delete/{id}", {
    params: { path: { id } },
  });
  if (error) throw new ApiError(response.status, "No se pudo eliminar el cuestionario");
}

// QuestionDto (con explanation, sin ocultar la respuesta correcta) es distinto del
// QuestionForAttemptDto que ya usa la parte 1 para resolver el cuestionario.
export async function getQuizQuestions(id: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}/questions", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function exportQuiz(id: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}/export", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function importQuiz(
  subjectId: number,
  subjectUnitId: number | null,
  body: QuizExportableDto
) {
  const { data, error, response } = await apiClient.POST("/quiz/import", {
    params: { query: { subjectId, subjectUnitId: subjectUnitId ?? undefined } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo importar el cuestionario");
  return data;
}

export async function getQuizStats(id: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}/stats", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

// Estadísticas agregadas de TODOS los intentos del usuario autenticado (distinto de
// getQuizStats, que es el rendimiento del usuario en un quiz concreto).
export async function getMyStats() {
  const { data, error } = await apiClient.GET("/attempts/stats");
  if (error) throw error;
  return data;
}

export async function getQuizLeaderboard(id: number, page: number, size: number) {
  const { data, error } = await apiClient.GET("/quiz/{id}/leaderboard", {
    params: {
      path: { id },
      query: { pageable: { page, size } },
    },
    querySerializer: (query: { pageable?: { page?: number; size?: number } }) => {
      const search = new URLSearchParams();
      if (query.pageable?.page != null) search.set("page", String(query.pageable.page));
      if (query.pageable?.size != null) search.set("size", String(query.pageable.size));
      return search.toString();
    },
  });
  if (error) throw error;
  return data;
}