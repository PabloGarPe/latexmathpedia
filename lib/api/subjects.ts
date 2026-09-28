import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type SubjectDto = components["schemas"]["SubjectDto"];
export type SubjectUnitDto = components["schemas"]["SubjectUnitDto"];
export type CreateSubjectDto = components["schemas"]["CreateSubjectDto"];
export type UpdateSubjectDto = components["schemas"]["UpdateSubjectDto"];
export type CreateSubjectUnitDto = components["schemas"]["CreateSubjectUnitDto"];
export type UpdateSubjectUnitDto = components["schemas"]["UpdateSubjectUnitDto"];

// Re-exportada por compatibilidad: el resto del código (SubjectAccordionCard, admin/pdfs,
// admin/subjects) la importa desde aquí. La definición vive en lib/api/errors.ts para que
// otros recursos (quizzes, profile) puedan usarla sin depender de este módulo.
export { ApiError };

export async function getSubjects() {
  const { data, error } = await apiClient.GET("/subject");
  if (error) throw error;
  return data;
}

export async function getSubject(id: number) {
  const { data, error } = await apiClient.GET("/subject/{id}", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function getSubjectUnits(subjectId: number) {
  const { data, error } = await apiClient.GET("/subject/{id}/units", {
    params: { path: { id: subjectId } },
  });
  if (error) throw error;
  return data;
}

export async function getSubjectPdfs(subjectId: number) {
  const { data, error } = await apiClient.GET("/subject/{id}/pdfs", {
    params: { path: { id: subjectId } },
  });
  if (error) throw error;
  return data;
}

// A diferencia de getSubjectPdfs, este endpoint sí exige sesión (401 documentado en
// api-docs.json) -- el hook correspondiente en use-subjects.ts lo gatea con isAuthenticated.
export async function getSubjectQuizzes(subjectId: number) {
  const { data, error } = await apiClient.GET("/subject/{id}/quizzes", {
    params: { path: { id: subjectId } },
  });
  if (error) throw error;
  return data;
}

export async function createSubject(body: CreateSubjectDto) {
  const { data, error, response } = await apiClient.POST("/subject/create", { body });
  if (error) throw new ApiError(response.status, "No se pudo crear la asignatura");
  return data;
}

export async function updateSubject(id: number, body: UpdateSubjectDto) {
  const { data, error, response } = await apiClient.PUT("/subject/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar la asignatura");
  return data;
}

export async function deleteSubject(id: number) {
  const { error, response } = await apiClient.DELETE("/subject/delete/{id}", {
    params: { path: { id } },
  });
  if (error) throw new ApiError(response.status, "No se pudo eliminar la asignatura");
}

export async function createSubjectUnit(subjectId: number, body: CreateSubjectUnitDto) {
  const { data, error, response } = await apiClient.POST("/subject/{subjectId}/unit/create", {
    params: { path: { subjectId } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo crear el tema");
  return data;
}

export async function updateSubjectUnit(id: number, body: UpdateSubjectUnitDto) {
  const { data, error, response } = await apiClient.PUT("/subject/unit/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar el tema");
  return data;
}

export async function deleteSubjectUnit(id: number) {
  const { error, response } = await apiClient.DELETE("/subject/unit/delete/{id}", {
    params: { path: { id } },
  });
  if (error) throw new ApiError(response.status, "No se pudo eliminar el tema");
}
