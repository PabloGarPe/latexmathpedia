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
export type ImportQuestionsDto = components["schemas"]["ImportQuestionsDto"];
export type QuizAttemptStatsDto = components["schemas"]["QuizAttemptStatsDto"];
export type LeaderboardEntryDto = components["schemas"]["LeaderboardEntryDto"];
export type PageLeaderboardEntryDto = components["schemas"]["PageLeaderboardEntryDto"];

// Catálogo completo para el panel de admin: `GET /quiz` devuelve también los ocultos (a un
// usuario normal solo los visibles). Los endpoints /public/quiz nunca devuelven ocultos.
export async function getAllQuizzes() {
  const { data, response } = await apiClient.GET("/quiz");
  if (!response.ok || data === undefined) throw new ApiError(response.status, "No se pudieron cargar los cuestionarios");
  return data;
}

// Publicar (true) u ocultar (false). 400 si se intenta publicar sin preguntas. Solo la primera
// publicación (`publishedAt` null) notifica a los usuarios.
export async function setQuizVisibility(id: number, visible: boolean) {
  const { data, response } = await apiClient.PATCH("/quiz/{id}/visibility", {
    params: { path: { id } },
    body: { visible },
  });
  if (!response.ok || data === undefined) {
    throw new ApiError(
      response.status,
      response.status === 400
        ? "Añade al menos una pregunta antes de publicar el cuestionario"
        : "No se pudo cambiar la visibilidad del cuestionario",
    );
  }
  return data;
}

export async function getPublicQuizzes() {
  const { data, error, response } = await apiClient.GET("/public/quiz");
  // Un 401/403 sin cuerpo llega con `error` vacío y `data` undefined: se comprueba el estado.
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

// Hileras del feed. Como en las de PDFs, se comprueba response.ok y no `error`: un cuerpo
// vacío en un fallo llega como "" (falsy) y la query acabaría con data undefined.
export async function getRecentQuizzes(limit: number) {
  const { data, response } = await apiClient.GET("/public/quiz/recent", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de cuestionarios");
  return data;
}

// Como getRecentQuizzes pero solo de las asignaturas suscritas (requiere JWT); [] sin
// suscripciones. Los ocultos solo llegan a los administradores.
export async function getRecentSubscribedQuizzes(limit: number) {
  const { data, response } = await apiClient.GET("/quiz/recent/subscribed", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de cuestionarios");
  return data;
}

export async function getTopQuizzes(limit: number) {
  const { data, response } = await apiClient.GET("/public/quiz/top", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de cuestionarios");
  return data;
}

export async function getQuiz(id: number) {
  const { data, error, response } = await apiClient.GET("/quiz/{id}", {
    params: { path: { id } },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

export async function getQuizForAttempt(id: number) {
  const { data, error, response } = await apiClient.GET("/quiz/{id}/attempt", {
    params: { path: { id } },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  // El back no ordena por `position`: se aplica aquí para que el orden que fija el editor sea el que ve quien lo hace.
  const byPosition = <T extends { position?: number }>(items: T[]) =>
    [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    ...data,
    questions: byPosition(data.questions ?? []).map((question) => ({
      ...question,
      options: byPosition(question.options ?? []),
    })),
  };
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
  const { data, error, response } = await apiClient.GET("/attempts", {
    params: { query: { pageable: { page, size } } },
    querySerializer: (query: { pageable?: { page?: number; size?: number } }) => {
      const search = new URLSearchParams();
      if (query.pageable?.page != null) search.set("page", String(query.pageable.page));
      if (query.pageable?.size != null) search.set("size", String(query.pageable.size));
      return search.toString();
    },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
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
  const { data, error, response } = await apiClient.GET("/quiz/{id}/questions", {
    params: { path: { id } },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

export async function exportQuiz(id: number) {
  const { data, error, response } = await apiClient.GET("/quiz/{id}/export", {
    params: { path: { id } },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

// Mensaje para un fallo de importación según el status. Los 400 del back llegan con el cuerpo VACÍO
// (no dicen qué regla falló), así que el front valida antes de enviar (lib/quiz-import.ts); este
// mensaje solo sale si aun así el back rechaza algo que el cliente dejó pasar.
function importErrorMessage(status: number, kind: "quiz" | "questions"): string {
  if (status === 400) {
    return kind === "quiz"
      ? "El backend ha rechazado el cuestionario: revisa que cada pregunta tenga el texto y las opciones " +
          "rellenos, exactamente una opción correcta (y solo dos opciones en Verdadero/Falso), y que la " +
          "descripción no pase de 500 caracteres."
      : "El backend ha rechazado las preguntas: revisa que cada una tenga el texto y las opciones rellenos " +
          "y exactamente una opción correcta (y solo dos opciones en Verdadero/Falso).";
  }
  if (status === 404) {
    return kind === "quiz"
      ? "La asignatura o el tema seleccionados ya no existen."
      : "El cuestionario ya no existe.";
  }
  if (status === 409) return "Ya existe un cuestionario con ese nombre.";
  if (status === 401 || status === 403) return "Tu sesión no tiene permiso para importar. Vuelve a iniciar sesión.";
  return kind === "quiz" ? "No se pudo importar el cuestionario." : "No se pudieron importar las preguntas.";
}

// `publish` va siempre explícito: true publica al momento y notifica a todos los usuarios; false lo
// deja oculto (se publica luego con setQuizVisibility). Se comprueba `response.ok` y no `error`: un
// 400 sin cuerpo llega con `error` vacío y no lanzaría.
export async function importQuiz(
  subjectId: number,
  subjectUnitId: number | null,
  publish: boolean,
  body: QuizExportableDto
) {
  const { data, response } = await apiClient.POST("/quiz/import", {
    params: { query: { subjectId, subjectUnitId: subjectUnitId ?? undefined, publish } },
    body,
  });
  if (!response.ok || !data) throw new ApiError(response.status, importErrorMessage(response.status, "quiz"));
  return data;
}

// Añade preguntas al final de un cuestionario existente (todo o nada, misma validación que
// importQuiz). No cambia la visibilidad ni notifica. Devuelve las preguntas creadas, en orden.
export async function importQuestions(quizId: number, questions: QuestionExportableDto[]) {
  const { data, response } = await apiClient.POST("/quiz/{id}/questions/import", {
    params: { path: { id: quizId } },
    body: { questions },
  });
  if (!response.ok || !data) throw new ApiError(response.status, importErrorMessage(response.status, "questions"));
  return data;
}

// Estadísticas DEL USUARIO AUTENTICADO en este quiz (no globales). Con totalAttempts === 0 el
// resto de valores son 0. Es la fuente del "mejor puntuación" de la ficha; no hace falta traer
// el histórico (/quiz/{id}/attempts, también solo propio y sin paginar).
export async function getQuizStats(id: number) {
  const { data, error, response } = await apiClient.GET("/quiz/{id}/stats", {
    params: { path: { id } },
  });
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

// Estadísticas agregadas de TODOS los intentos del usuario autenticado (distinto de
// getQuizStats, que es el rendimiento del usuario en un quiz concreto).
export async function getMyStats() {
  const { data, error, response } = await apiClient.GET("/attempts/stats");
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}

export async function getQuizLeaderboard(id: number, page: number, size: number) {
  const { data, error, response } = await apiClient.GET("/quiz/{id}/leaderboard", {
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
  if (error || !response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar la información del cuestionario");
  return data;
}