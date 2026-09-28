import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type PDFDto = components["schemas"]["PDFDto"];
export type CreatePDFDto = components["schemas"]["CreatePDFDto"];
export type UpdatePDFDto = components["schemas"]["UpdatePDFDto"];

// Catálogo completo (solo metadatos). Es el único listado que expone el backend, tanto para
// usuarios anónimos como autenticados y admin; el contenido se pide aparte con getPdfContent.
export async function getPdfs() {
  const { data, error } = await apiClient.GET("/public/pdf/no-link");
  if (error) throw error;
  return data;
}

// Binario del PDF (application/pdf), servido por el back desde S3 sin exponer la URL.
// Requiere JWT: lo añade el middleware de apiClient.
export async function getPdfContent(pdfId: number) {
  const { data, error } = await apiClient.GET("/pdf/{pdfId}", {
    params: { path: { pdfId } },
    parseAs: "arrayBuffer",
  });
  if (error) throw error;
  return data;
}

// create/update son multipart/form-data: parte "data" (JSON) + parte "file" (PDF). La parte
// "data" va como Blob application/json porque Spring (@RequestPart) la deserializa según su
// Content-Type. El schema generado tipa "file" como string (format: binary), de ahí el cast.
function toPdfFormData(data: CreatePDFDto | UpdatePDFDto, file?: File) {
  const formData = new FormData();
  formData.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
  if (file) formData.append("file", file);
  return formData;
}

export async function createPdf(data: CreatePDFDto, file: File) {
  const { data: created, error, response } = await apiClient.POST("/pdf/create", {
    body: { data, file: file as unknown as string },
    bodySerializer: () => toPdfFormData(data, file),
  });
  if (error) throw new ApiError(response.status, "No se pudo crear el PDF");
  return created;
}

export async function updatePdf(pdfId: number, data: UpdatePDFDto, file?: File) {
  const { data: updated, error, response } = await apiClient.PUT("/pdf/update/{pdfId}", {
    params: { path: { pdfId } },
    body: { data, file: file as unknown as string | undefined },
    bodySerializer: () => toPdfFormData(data, file),
  });
  if (error) throw new ApiError(response.status, "No se pudo actualizar el PDF");
  return updated;
}

export async function deletePdf(pdfId: number) {
  const { error } = await apiClient.DELETE("/pdf/delete/{pdfId}", {
    params: { path: { pdfId } },
  });
  if (error) throw error;
}

// El back responde a los errores de create/update con el cuerpo vacío, así que solo el
// status distingue los casos (ver descripciones de 400/404/409 en api-docs.json).
export function pdfMutationErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.status) {
    case 400:
      return "Datos no válidos: revisa los autores (repetidos o email con varios usuarios) y el fichero.";
    case 404:
      return "Algún email de autor no corresponde a ningún usuario, o la asignatura/tema ya no existe.";
    case 409:
      return "Ya existe un PDF con ese nombre.";
    default:
      return fallback;
  }
}
