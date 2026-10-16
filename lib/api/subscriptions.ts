import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type SubjectSubscriptionDto = components["schemas"]["SubjectSubscriptionDto"];

// Asignaturas a las que está suscrito el usuario (requieren JWT). El catálogo público no lleva
// la marca de suscrito: se cruza con esta lista.

// Ordenada por nombre de asignatura; [] si no hay ninguna.
export async function getMySubscriptions() {
  const { data, response } = await apiClient.GET("/me/subscriptions");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar tus asignaturas");
  return data;
}

// Idempotente: si ya estaba suscrito devuelve la suscripción existente. 404 si la asignatura no existe.
export async function subscribe(subjectId: number) {
  const { data, response } = await apiClient.PUT("/me/subscriptions/{subjectId}", {
    params: { path: { subjectId } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo suscribir a la asignatura");
  return data;
}

// Idempotente: 204 también si no estaba suscrito.
export async function unsubscribe(subjectId: number) {
  const { response } = await apiClient.DELETE("/me/subscriptions/{subjectId}", {
    params: { path: { subjectId } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo cancelar la suscripción");
}

// Suscribirse a un curso entero = suscripciones normales a las asignaturas colocadas *ahora* en
// (grado, año[, cuatrimestre]); es una foto fija, no hay suscripción "al curso". Sin `semester`
// entran todas (también las anuales); con él, solo las de ese cuatrimestre.
// 404 si el grado no existe; 400 si `year` no está en 1..years o `semester` no es 1 ni 2.
export type CourseRef = { degreeId: number; year: number; semester?: number };

// Idempotente. Devuelve las suscripciones a todas las asignaturas del curso (nuevas y previas).
export async function subscribeToCourse({ degreeId, year, semester }: CourseRef) {
  const { data, response } = await apiClient.PUT("/me/subscriptions/degree/{degreeId}/year/{year}", {
    params: { path: { degreeId, year }, query: { semester } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo suscribir al curso");
  return data;
}

// Idempotente (204). Ojo: da de baja de las asignaturas del curso aunque también estén en otro
// curso/grado al que el usuario siga suscrito.
export async function unsubscribeFromCourse({ degreeId, year, semester }: CourseRef) {
  const { response } = await apiClient.DELETE("/me/subscriptions/degree/{degreeId}/year/{year}", {
    params: { path: { degreeId, year }, query: { semester } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo cancelar la suscripción al curso");
}
