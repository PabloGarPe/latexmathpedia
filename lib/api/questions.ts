import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export { ApiError };

export type QuestionDto = components["schemas"]["QuestionDto"];
export type CreateQuestionDto = components["schemas"]["CreateQuestionDto"];
export type UpdateQuestionDto = components["schemas"]["UpdateQuestionDto"];

export async function createQuestion(body: CreateQuestionDto) {
  const { data, error, response } = await apiClient.POST("/question/create", { body });
  if (error) throw new ApiError(response.status, "No se pudo crear la pregunta");
  return data;
}

export async function updateQuestion(id: number, body: UpdateQuestionDto) {
  const { data, error, response } = await apiClient.PUT("/question/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar la pregunta");
  return data;
}

export async function deleteQuestion(id: number) {
  const { error, response } = await apiClient.DELETE("/question/delete/{id}", {
    params: { path: { id } },
  });
  if (error) throw new ApiError(response.status, "No se pudo eliminar la pregunta");
}

// No estaba en la lista original de T-17 parte 2, pero el editor necesita las opciones de
// cada pregunta y este GET (tag "Question" en api-docs.json, no "Option") es el único que
// las trae.
export async function getQuestionOptions(id: number) {
  const { data, error } = await apiClient.GET("/question/{id}/options", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}
