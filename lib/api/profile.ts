import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type UserAccountDto = components["schemas"]["UserAccountDto"];
export type UpdateUserAccountDto = components["schemas"]["UpdateUserAccountDto"];

export async function getMe() {
  const { data, error } = await apiClient.GET("/me");
  if (error) throw error;
  return data;
}

export async function updateMe(body: UpdateUserAccountDto) {
  const { data, error, response } = await apiClient.PUT("/me", { body });
  if (error) throw new ApiError(response.status, "No se pudo actualizar el perfil");
  return data;
}

