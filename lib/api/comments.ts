import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type CommentDto = components["schemas"]["CommentDto"];
export type CommentPageDto = components["schemas"]["CommentPageDto"];
export type CommentContextDto = components["schemas"]["CommentContextDto"];
export type CommentConfigDto = components["schemas"]["CommentConfigDto"];
export type CommentLikeDto = components["schemas"]["CommentLikeDto"];
export type CreateCommentDto = components["schemas"]["CreateCommentDto"];
export type AdminCommentDto = components["schemas"]["AdminCommentDto"];
export type AdminCommentPageDto = components["schemas"]["AdminCommentPageDto"];
export type ModerationStatusDto = components["schemas"]["ModerationStatusDto"];

// Estado de un comentario (sin el null que admite CommentDto.status cuando available=false).
export type CommentStatus = NonNullable<CommentDto["status"]>;
// Categoría de moderación (motivo de rechazo / propuesta de la IA).
export type ModerationCategory = NonNullable<CommentDto["moderationCategory"]>;
// Motivo de una denuncia de usuario.
export type ReportReason = components["schemas"]["ReportCommentDto"]["reason"];
// Estados que acepta la cola de admin (el back da 400 con cualquier otro).
export type AdminQueueStatus = Extract<CommentStatus, "PENDING" | "REVIEW" | "HIDDEN" | "REJECTED">;

// Máximo de ids por petición a GET /me/comment-likes (el back da 400 con más).
export const COMMENT_LIKES_CHUNK = 100;

// Códigos del 400 de POST /pdf/{pdfId}/comments. El schema no los tipa (documenta el cuerpo
// como CommentDto), así que se listan aquí; el servidor es quien manda.
export type CommentErrorCode = "EMPTY" | "TOO_LONG" | "LINKS_NOT_ALLOWED" | "IMAGES_NOT_ALLOWED" | "HTML_NOT_ALLOWED";

const COMMENT_ERROR_CODES: readonly string[] = [
  "EMPTY",
  "TOO_LONG",
  "LINKS_NOT_ALLOWED",
  "IMAGES_NOT_ALLOWED",
  "HTML_NOT_ALLOWED",
];

// 400 de validación del texto: conserva el `code` del cuerpo para que la UI lo mapee a un mensaje
// (ver commentErrorMessage en lib/comments.ts).
export class CommentValidationError extends ApiError {
  code: CommentErrorCode;

  constructor(code: CommentErrorCode) {
    super(400, `Comentario no válido: ${code}`);
    this.name = "CommentValidationError";
    this.code = code;
  }
}

// Los arrays van como `1,2,3` (style=form, explode=false), que es lo que documenta el back;
// openapi-fetch por defecto los repetiría (`ids=1&ids=2`).
const COMMA_ARRAYS = { array: { style: "form", explode: false } } as const;

/* ------------------------------ Lectura pública ------------------------------ */

// Raíces del PDF, de la más reciente a la más antigua. `page` desde 0.
export async function getRootComments(pdfId: number, page: number, size: number) {
  const { data, response } = await apiClient.GET("/public/pdf/{pdfId}/comments", {
    params: { path: { pdfId }, query: { page, size } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar los comentarios");
  return data;
}

// Respuestas publicadas de una raíz, de la más antigua a la más reciente. 404 si no es una raíz.
export async function getCommentReplies(commentId: number, page: number, size: number) {
  const { data, response } = await apiClient.GET("/public/pdf/comments/{commentId}/replies", {
    params: { path: { commentId }, query: { page, size } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar las respuestas");
  return data;
}

// Raíz + comentario pedido, para enlazar a uno concreto sin paginar. 404 si no existe o ya no
// está publicado: la UI entonces solo baja a la sección.
export async function getCommentContext(commentId: number) {
  const { data, response } = await apiClient.GET("/public/pdf/comments/{commentId}/context", {
    params: { path: { commentId } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar el comentario");
  return data;
}

export async function getCommentConfig() {
  const { data, response } = await apiClient.GET("/public/comments/config");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la configuración de comentarios");
  return data;
}

/* ------------------------------ Autenticados ------------------------------ */

// Crea el comentario (202, queda en PENDING y solo lo ve su autor). Un 400 con `code` se lanza
// como CommentValidationError; el resto, como ApiError con su status (403 sin username, 404,
// 409 el comentario respondido ya no está publicado, 429 demasiados PENDING).
export async function createComment(pdfId: number, body: CreateCommentDto) {
  const { data, error, response } = await apiClient.POST("/pdf/{pdfId}/comments", {
    params: { path: { pdfId } },
    body,
  });
  if (response.status === 400) {
    // El tipo del error es el DTO de éxito (ver api-docs.json): lo único fiable es el `code`.
    const code = (error as unknown as { code?: unknown } | undefined)?.code;
    if (typeof code === "string" && COMMENT_ERROR_CODES.includes(code)) {
      throw new CommentValidationError(code as CommentErrorCode);
    }
  }
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo publicar el comentario");
  return data;
}

// Mis comentarios del PDF (sin borrados), con status y moderationCategory.
export async function getMyComments(pdfId: number) {
  const { data, response } = await apiClient.GET("/pdf/{pdfId}/comments/me", {
    params: { path: { pdfId } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar tus comentarios");
  return data;
}

// 204 e idempotente. Autor o admin (403 si no); 404 si no existe.
export async function deleteComment(commentId: number) {
  const { response } = await apiClient.DELETE("/comments/{commentId}", {
    params: { path: { commentId } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo eliminar el comentario");
}

// 204 e idempotente. 403 si es propio, 404, 409 si no está publicado.
export async function reportComment(commentId: number, reason: ReportReason) {
  const { response } = await apiClient.POST("/comments/{commentId}/report", {
    params: { path: { commentId } },
    body: { reason },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo enviar la denuncia");
}

// Idempotente; devuelve el likeCount ya recalculado. 403 si es propio, 404, 409 si no está publicado.
export async function likeComment(commentId: number) {
  const { data, response } = await apiClient.PUT("/comments/{commentId}/like", {
    params: { path: { commentId } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo dar me gusta");
  return data;
}

// Idempotente y siempre permitido; devuelve el likeCount ya recalculado.
export async function unlikeComment(commentId: number) {
  const { data, response } = await apiClient.DELETE("/comments/{commentId}/like", {
    params: { path: { commentId } },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo quitar el me gusta");
  return data;
}

// Ids (de los pedidos) que le gustan al usuario. Máx. COMMENT_LIKES_CHUNK por petición: para más
// ids, trocear (lo hace useCommentLikes).
export async function getMyCommentLikes(commentIds: number[]) {
  if (commentIds.length === 0) return [];
  if (commentIds.length > COMMENT_LIKES_CHUNK) {
    throw new ApiError(400, `Máximo ${COMMENT_LIKES_CHUNK} ids por petición`);
  }
  const { data, response } = await apiClient.GET("/me/comment-likes", {
    params: { query: { commentIds } },
    querySerializer: COMMA_ARRAYS,
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar tus me gusta");
  return data;
}

/* ------------------------------ Admin ------------------------------ */

// Cola de moderación. `statuses` vacío = el valor por defecto del back (REVIEW,HIDDEN).
export async function getAdminCommentQueue(statuses: AdminQueueStatus[], page: number, size: number) {
  const { data, response } = await apiClient.GET("/admin/comments", {
    params: { query: { ...(statuses.length > 0 ? { status: statuses } : {}), page, size } },
    querySerializer: COMMA_ARRAYS,
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la cola de moderación");
  return data;
}

// 204. Restaura también ocultos y falsos positivos. 404, 409.
export async function approveComment(commentId: number) {
  const { response } = await apiClient.POST("/admin/comments/{commentId}/approve", {
    params: { path: { commentId } },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo aprobar el comentario");
}

// 204. 404, 409.
export async function rejectComment(commentId: number, category: ModerationCategory) {
  const { response } = await apiClient.POST("/admin/comments/{commentId}/reject", {
    params: { path: { commentId } },
    body: { category },
  });
  if (!response.ok) throw new ApiError(response.status, "No se pudo rechazar el comentario");
}

export async function getModerationStatus() {
  const { data, response } = await apiClient.GET("/admin/comments/moderation-status");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar el estado de la moderación");
  return data;
}
