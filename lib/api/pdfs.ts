import { apiClient, getApiAccessToken } from "@/lib/api/client";
import { API_URL } from "@/lib/env";
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

// Hileras del feed. Todas devuelven PDFDto[] (con viewCount); limit por defecto 10, máx. 20.
export async function getRecentPdfs(limit: number) {
  const { data, response } = await apiClient.GET("/public/pdf/recent", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de PDFs");
  return data;
}

export async function getTopPdfs(limit: number) {
  const { data, response } = await apiClient.GET("/public/pdf/top", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de PDFs");
  return data;
}

// Requiere JWT (lo añade el middleware de apiClient); [] si el usuario aún no ha abierto nada.
// Un 401 llega con el cuerpo vacío (error === ""), así que se comprueba response.ok y no `error`.
export async function getMyTopPdfs(limit: number) {
  const { data, response } = await apiClient.GET("/pdf/top/me", {
    params: { query: { limit } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la hilera de PDFs");
  return data;
}

// Binario del PDF (application/pdf), servido por el back desde S3 sin exponer la URL.
// Requiere JWT: lo añade el middleware de apiClient.
export async function getPdfContent(pdfId: number) {
  const { data, response } = await apiClient.GET("/pdf/{pdfId}", {
    params: { path: { pdfId } },
    parseAs: "arrayBuffer",
  });
  // Con status para distinguir el 404 (borrado) de otros fallos.
  if (!response.ok || data === undefined) throw new ApiError(response.status, "No se pudo cargar el PDF");
  return data;
}

// create/update son multipart/form-data: parte "data" (JSON) + parte "file" (PDF). La parte
// "data" va como Blob application/json porque Spring (@RequestPart) la deserializa según su
// Content-Type.
function toPdfFormData(data: CreatePDFDto | UpdatePDFDto, file?: File) {
  const formData = new FormData();
  formData.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
  if (file) formData.append("file", file);
  return formData;
}

// Callback con la fracción enviada (0..1) de la subida.
export type UploadProgress = (fraction: number) => void;

// fetch no informa del progreso de una subida, así que create/update usan XMLHttpRequest. Es
// la excepción a apiClient y por eso vive aquí, en la capa lib/api, con el mismo Bearer.
function sendPdfForm(
  method: "POST" | "PUT",
  path: string,
  formData: FormData,
  failureMessage: string,
  onProgress?: UploadProgress,
) {
  return new Promise<PDFDto | undefined>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_URL}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    const token = getApiAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(xhr.status, failureMessage));
        return;
      }
      onProgress?.(1);
      try {
        resolve(xhr.responseText ? (JSON.parse(xhr.responseText) as PDFDto) : undefined);
      } catch {
        resolve(undefined);
      }
    };
    // Sin respuesta (red caída, CORS): status 0, lo que ningún caso de pdfMutationErrorMessage cubre.
    xhr.onerror = () => reject(new ApiError(0, failureMessage));
    xhr.send(formData);
  });
}

export function createPdf(data: CreatePDFDto, file: File, onProgress?: UploadProgress) {
  return sendPdfForm("POST", "/pdf/create", toPdfFormData(data, file), "No se pudo crear el PDF", onProgress);
}

export function updatePdf(pdfId: number, data: UpdatePDFDto, file?: File, onProgress?: UploadProgress) {
  return sendPdfForm(
    "PUT",
    `/pdf/update/${pdfId}`,
    toPdfFormData(data, file),
    "No se pudo actualizar el PDF",
    onProgress,
  );
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
