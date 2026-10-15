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
