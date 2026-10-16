import type { PdfRatingSummaryDto } from "@/lib/api/pdfs";

// Mismo umbral que la hilera "Mejor valorados" del back: con menos votos el porcentaje engaña.
export const MIN_VOTES_TO_SHOW = 3;

export const ratingVotes = (summary?: PdfRatingSummaryDto) =>
  (summary?.likeCount ?? 0) + (summary?.dislikeCount ?? 0);

// Porcentaje entero de 👍 sobre el total, o null si hay menos de MIN_VOTES_TO_SHOW votos.
export function positiveRatio(summary?: PdfRatingSummaryDto): number | null {
  const votes = ratingVotes(summary);
  if (votes < MIN_VOTES_TO_SHOW) return null;
  return Math.round(((summary?.likeCount ?? 0) / votes) * 100);
}

// Para ordenar en cliente: `score` (límite inferior de Wilson) desc y, a igualdad, más 👍 primero.
// `score` sirve para ordenar, nunca para mostrarse como nota: con pocos votos es bajo a propósito.
export const compareByRating = (a?: PdfRatingSummaryDto, b?: PdfRatingSummaryDto) =>
  (b?.score ?? 0) - (a?.score ?? 0) || (b?.likeCount ?? 0) - (a?.likeCount ?? 0);
