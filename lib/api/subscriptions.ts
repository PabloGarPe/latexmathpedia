import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type SubjectSubscriptionDto = components["schemas"]["SubjectSubscriptionDto"];
export type CourseSubscriptionDto = components["schemas"]["CourseSubscriptionDto"];

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

// Suscripciones a curso (grado + año [+ cuatrimestre]) del usuario. `semester: null` = año
// entero (cualquier cuatrimestre y las anuales). Por (grado, año) hay o la del año entero o las
// de cuatrimestre, nunca ambas. Ordenadas por grado, año y cuatrimestre; [] si no hay ninguna.
export async function getMyCourseSubscriptions() {
  const { data, response } = await apiClient.GET("/me/subscriptions/courses");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar tus cursos");
  return data;
}

// Suscribirse a un curso suscribe a las asignaturas colocadas *ahora* en (grado, año[, cuatri-
// mestre]) y además recuerda la suscripción: las que un admin coloque después en el curso se
// suscriben solas (las anuales, solo si es el año entero). Sin `semester` entran todas (también
// las anuales); con él, solo las de ese cuatrimestre. Un curso vacío también admite suscripción.
// 404 si el grado no existe; 400 si `year` no está en 1..years o `semester` no es 1 ni 2.
export type CourseRef = { degreeId: number; year: number; semester?: number };

// Idempotente. Devuelve las suscripciones a todas las asignaturas del curso (nuevas y previas);
// [] si el curso no tiene asignaturas todavía.
export async function subscribeToCourse({ degreeId, year, semester }: CourseRef) {
  const { data, response } = await apiClient.PUT("/me/subscriptions/degree/{degreeId}/year/{year}", {
    params: { path: { degreeId, year }, query: { semester } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo suscribir al curso");
  return data;
}

// Idempotente (204). Ojo: da de baja de las asignaturas del curso aunque también estén en otro
// curso/grado al que el usuario siga suscrito, y olvida la suscripción al curso. Sin `semester`
// borra también las de sus cuatrimestres; con él, estando suscrito al año entero, queda suscrito
// solo al otro cuatrimestre.
export async function unsubscribeFromCourse({ degreeId, year, semester }: CourseRef) {
  const { response } = await apiClient.DELETE("/me/subscriptions/degree/{degreeId}/year/{year}", {
    params: { path: { degreeId, year }, query: { semester } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo cancelar la suscripción al curso");
}
