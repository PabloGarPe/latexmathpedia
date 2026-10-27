import { CommentValidationError } from "@/lib/api/comments";
import type { CommentErrorCode, CommentStatus, ModerationCategory, ReportReason } from "@/lib/api/comments";
import { ApiError } from "@/lib/api/errors";

/* ------------------------------------------------------------------ */
/* Texto del comentario                                                */
/* ------------------------------------------------------------------ */

// Longitud máxima mientras carga GET /public/comments/config (el servidor manda).
export const DEFAULT_COMMENT_MAX_LENGTH = 2000;

// Puntos de código Unicode, como cuenta el back: un emoji es 1 aquí y 2 con `texto.length`.
export function countCodePoints(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    count++;
    const high = text.charCodeAt(i);
    // Par sustituto (high + low) = un solo punto de código.
    if (high >= 0xd800 && high <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) i++;
    }
  }
  return count;
}

// Lo que hace el back antes de validar: NFC y fuera caracteres de control (salvo saltos de línea
// y tabulaciones) y de ancho cero.
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​‌‍⁠﻿]/g;
export function normalizeCommentBody(text: string): string {
  return text.normalize("NFC").replace(CONTROL_CHARS_RE, "");
}

// Las fórmulas se tapan antes de buscar enlaces/HTML: `$a<b$` o `$[0,1](x)$` son texto válido.
const MATH_RE = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]/;
const MD_LINK_RE = /\[[^\]]*\]\([^)]*\)/;
const AUTOLINK_RE = /<(?:https?:\/\/|mailto:|www\.)[^<>\s]+>/i;
const BARE_URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/i;
// Etiqueta de apertura/cierre real (`<b>`, `</div>`, `<a href="…">`), comentario o declaración.
const HTML_TAG_RE = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>|<!--|<![a-z]|<\?/i;

/**
 * Replica las reglas de texto del back antes de enviar. Devuelve el código del primer problema
 * o `null` si el texto es válido. Orientativa: si el servidor discrepa, su respuesta manda
 * (CommentValidationError). `maxLength` en puntos de código.
 */
export function validateCommentBody(text: string, maxLength: number): CommentErrorCode | null {
  const body = normalizeCommentBody(text);
  if (body.trim() === "") return "EMPTY";
  if (countCodePoints(body) > maxLength) return "TOO_LONG";

  const outsideMath = body.replace(MATH_RE, " ");
  // Imágenes antes que enlaces: `![a](b)` también casaría como enlace.
  if (IMAGE_RE.test(outsideMath)) return "IMAGES_NOT_ALLOWED";
  if (MD_LINK_RE.test(outsideMath) || AUTOLINK_RE.test(outsideMath) || BARE_URL_RE.test(outsideMath)) {
    return "LINKS_NOT_ALLOWED";
  }
  if (HTML_TAG_RE.test(outsideMath)) return "HTML_NOT_ALLOWED";
  return null;
}

/* ------------------------------------------------------------------ */
/* Mensajes de error                                                   */
/* ------------------------------------------------------------------ */

const ERROR_MESSAGES: Record<CommentErrorCode, string> = {
  EMPTY: "Escribe algo antes de enviar.",
  TOO_LONG: "El comentario es demasiado largo.",
  LINKS_NOT_ALLOWED: "No se permiten enlaces en los comentarios.",
  IMAGES_NOT_ALLOWED: "No se permiten imágenes en los comentarios.",
  HTML_NOT_ALLOWED: "No se permite código HTML en los comentarios.",
};

export function commentErrorMessage(code: string | null | undefined): string {
  return (code && ERROR_MESSAGES[code as CommentErrorCode]) || "El comentario no es válido.";
}

export interface CommentErrorContext {
  // CommentConfigDto.maxPendingPerUser, para el mensaje del 429.
  maxPendingPerUser?: number;
}

/**
 * Mensaje para un fallo de `useCreateComment`: mapea el `code` del 400 y los status habituales
 * (403 sin username, 409 comentario respondido ya no publicado, 429 demasiados en revisión).
 * El 403 pide completar el perfil: la UI puede añadir el enlace a /dashboard/profile.
 */
export function commentCreateErrorMessage(error: unknown, ctx: CommentErrorContext = {}): string {
  if (error instanceof CommentValidationError) return commentErrorMessage(error.code);
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "No se puede responder a ese comentario.";
      case 401:
        return "Tu sesión ha caducado o tu cuenta no está activa.";
      case 403:
        return "Completa tu perfil (nombre de usuario) para poder comentar.";
      case 404:
        return "El PDF o el comentario al que respondes ya no existe.";
      case 409:
        return "Ese comentario ya no está publicado.";
      case 429: {
        const n = ctx.maxPendingPerUser;
        return n
          ? `Ya tienes ${n} ${n === 1 ? "comentario" : "comentarios"} en revisión, espera a que se publiquen.`
          : "Ya tienes varios comentarios en revisión, espera a que se publiquen.";
      }
    }
  }
  return "No se pudo enviar el comentario. Inténtalo de nuevo.";
}

// El 403 de crear (perfil sin username) lleva a /dashboard/profile.
export const isProfileIncompleteError = (error: unknown) => error instanceof ApiError && error.status === 403;

/** Mensaje para borrar / denunciar / dar me gusta / moderar (acciones sobre un comentario existente). */
export function commentActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 403:
        return "No tienes permiso para hacer eso con este comentario.";
      case 404:
        return "Ese comentario ya no existe.";
      case 409:
        return "Ese comentario ya no está publicado.";
    }
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

// Estado visto por el autor (sus propios comentarios).
export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  PENDING: "En revisión",
  REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  REJECTED: "No publicado",
  HIDDEN: "Oculto temporalmente, pendiente de revisión",
  DELETED: "Eliminado",
};

export const commentStatusLabel = (status: CommentStatus | null | undefined) =>
  status ? COMMENT_STATUS_LABELS[status] : "";

// Estados que se muestran en "Tus comentarios": todo lo propio que aún no está en el hilo público.
export const isUnpublishedStatus = (status: CommentStatus | null | undefined) =>
  status === "PENDING" || status === "REVIEW" || status === "REJECTED" || status === "HIDDEN";

// Motivo legible de un rechazo (o categoría propuesta por la IA en el admin).
export const MODERATION_CATEGORY_LABELS: Record<ModerationCategory, string> = {
  HATE_SPEECH: "Discurso de odio",
  HARASSMENT: "Acoso o insultos",
  SEXUAL_CONTENT: "Contenido sexual",
  VIOLENCE_OR_THREATS: "Violencia o amenazas",
  ILLEGAL_ACTIVITY: "Actividad ilegal",
  SPAM: "Spam o publicidad",
  PERSONAL_DATA: "Datos personales",
  OTHER: "Otro motivo",
};

export const MODERATION_CATEGORIES = Object.keys(MODERATION_CATEGORY_LABELS) as ModerationCategory[];

export const moderationCategoryLabel = (category: ModerationCategory | null | undefined) =>
  category ? MODERATION_CATEGORY_LABELS[category] : "";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  HATE: "Odio o discriminación",
  HARASSMENT: "Acoso o insultos",
  ILLEGAL: "Contenido ilegal",
  SEXUAL: "Contenido sexual",
  SPAM: "Spam o publicidad",
  OTHER: "Otro motivo",
};

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

// Acepta string porque AdminCommentDto.reportReasons es un mapa con claves libres (el catálogo
// puede crecer): lo desconocido se muestra tal cual.
export const reportReasonLabel = (reason: string) => REPORT_REASON_LABELS[reason as ReportReason] ?? reason;

/* ------------------------------------------------------------------ */
/* Enlaces                                                             */
/* ------------------------------------------------------------------ */

/** `/dashboard/pdfs/{pdfId}?comment={id}#comments` (sin `?comment` si no hay id). */
export function commentHref(pdfId: number, commentId?: number | null): string {
  const query = commentId != null ? `?comment=${commentId}` : "";
  return `/dashboard/pdfs/${pdfId}${query}#comments`;
}

/* ------------------------------------------------------------------ */
/* Páginas                                                             */
/* ------------------------------------------------------------------ */

/** Aplana las páginas de una query infinita (comentarios o cola de admin) en una lista. */
export function flattenPages<T>(data: { pages: { items?: T[] }[] } | undefined): T[] {
  return data?.pages.flatMap((page) => page.items ?? []) ?? [];
}
