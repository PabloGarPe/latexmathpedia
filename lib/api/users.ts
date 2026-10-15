import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type AuthorCandidateDto = components["schemas"]["AuthorCandidateDto"];

// El back devuelve [] con menos de 2 caracteres: ni siquiera se le llama.
export const USER_SEARCH_MIN_CHARS = 2;

// Solo ADMIN. `signal` deja que TanStack Query cancele la petición anterior cuando se teclea
// más. Se comprueba response.ok y no `error`: un 401 sin cuerpo llega con `error` vacío.
export async function searchUsers(q: string, signal?: AbortSignal, limit = 8) {
  const { data, response } = await apiClient.GET("/users/search", {
    params: { query: { q, limit } },
    signal,
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo buscar usuarios");
  return data;
}
