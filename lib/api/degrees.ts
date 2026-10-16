import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type DegreeDto = components["schemas"]["DegreeDto"];
export type CreateDegreeDto = components["schemas"]["CreateDegreeDto"];
export type UpdateDegreeDto = components["schemas"]["UpdateDegreeDto"];
export type CurriculumDto = components["schemas"]["CurriculumDto"];
export type CurriculumYearDto = components["schemas"]["CurriculumYearDto"];
export type CurriculumSubjectDto = components["schemas"]["CurriculumSubjectDto"];

// Mismas reglas que el back (CreateDegreeDto/UpdateDegreeDto). Un año no es una entidad: es un
// entero de 1 a `years`.
export const DEGREE_LIMITS = { name: 150, university: 150, minYears: 1, maxYears: 10 } as const;

// Consulta: pública (/public/degree*), sin token.

// Ordenados por nombre y universidad (los que no tienen universidad, primero); [] si no hay.
export async function getDegrees() {
  const { data, error } = await apiClient.GET("/public/degree");
  if (error) throw error;
  return data ?? [];
}

export async function getDegree(id: number) {
  const { data, error, response } = await apiClient.GET("/public/degree/{id}", {
    params: { path: { id } },
  });
  if (error || !data) throw new ApiError(response.status, "No se pudo cargar el grado");
  return data;
}

// Sin filtros trae todos los años 1..years, también los vacíos. 404 si el grado no existe;
// 400 si `year` no está en 1..years o `semester` no es 1 ni 2.
export async function getCurriculum(id: number, filters: { year?: number; semester?: number } = {}) {
  const { data, error, response } = await apiClient.GET("/public/degree/{id}/curriculum", {
    params: { path: { id }, query: filters },
  });
  if (error || !data) throw new ApiError(response.status, "No se pudo cargar el plan de estudios");
  return data;
}

// Administración (ADMIN). 409 tiene varios significados según la operación, así que el
// llamador elige el texto por contexto (ApiError.status):
// - create/update: ya existe un grado con ese nombre y universidad (sin distinguir mayúsculas).
// - update: además, si se reducen los años y hay asignaturas colocadas en los que desaparecen.
// - delete: tiene asignaturas colocadas (hay que quitarlas antes editando cada asignatura).

export async function createDegree(body: CreateDegreeDto) {
  const { data, error, response } = await apiClient.POST("/degree/create", { body });
  if (error || !data) throw new ApiError(response.status, "No se pudo crear el grado");
  return data;
}

// Reemplaza todos los campos.
export async function updateDegree(id: number, body: UpdateDegreeDto) {
  const { data, error, response } = await apiClient.PUT("/degree/update/{id}", {
    params: { path: { id } },
    body,
  });
  if (error || !data) throw new ApiError(response.status, "No se pudo actualizar el grado");
  return data;
}

export async function deleteDegree(id: number) {
  const { response } = await apiClient.DELETE("/degree/delete/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo eliminar el grado");
}
