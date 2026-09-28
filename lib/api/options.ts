import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type OptionDto = components["schemas"]["OptionDto"];
export type CreateOptionDto = components["schemas"]["CreateOptionDto"];
export type UpdateOptionDto = components["schemas"]["UpdateOptionDto"];

export async function createOption(body: CreateOptionDto) {
  const { data, error, response } = await apiClient.POST("/option/create", { body });
  if (error) throw new ApiError(response.status, "No se pudo crear la opción");
  return data;
}

export async function updateOption(id: number, body: UpdateOptionDto) {
  const { data, error, response } = await apiClient.PUT("/option/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar la opción");
  return data;
}

export async function deleteOption(id: number) {
  const { error, response } = await apiClient.DELETE("/option/delete/{id}", {
    params: { path: { id } },
  });
  if (error) throw new ApiError(response.status, "No se pudo eliminar la opción");
}
