"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPdf,
  deletePdf,
  getMyTopPdfs,
  getPdfContent,
  getPdfs,
  getRecentPdfs,
  getPdfRating,
  getRecentSubscribedPdfs,
  getTopPdfs,
  getTopRatedPdfs,
  ratePdf,
  removePdfRating,
  updatePdf,
  type CreatePDFDto,
  type PdfRatingDto,
  type PdfVote,
  type UpdatePDFDto,
  type UploadProgress,
} from "@/lib/api/pdfs";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

export const PDF_ROW_LIMIT = 10;

// Las hileras públicas cambian despacio: 2 min de staleTime evita refetch al cambiar de pestaña.
const ROW_STALE_TIME = 2 * 60 * 1000;

export function useRecentPdfs(limit = PDF_ROW_LIMIT, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.recent(limit),
    queryFn: () => getRecentPdfs(limit),
    enabled,
    staleTime: ROW_STALE_TIME,
  });
}

export function useTopPdfs(limit = PDF_ROW_LIMIT, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.top(limit),
    queryFn: () => getTopPdfs(limit),
    enabled,
    staleTime: ROW_STALE_TIME,
  });
}

// Hilera "Mejor valorados" (pública); [] si ningún PDF llega al umbral de votos.
export function useTopRatedPdfs(limit = PDF_ROW_LIMIT, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.topRated(limit),
    queryFn: () => getTopRatedPdfs(limit),
    enabled,
    staleTime: ROW_STALE_TIME,
  });
}

// Solo con sesión; la clave incluye el email para no mezclar cachés entre usuarios. Sin
// reintentos largos: en modo mock el back responde 401 y no tiene sentido insistir.
export function useMyTopPdfs(limit = PDF_ROW_LIMIT) {
  const { isAuthenticated, email } = useAuth();
  return useQuery({
    queryKey: queryKeys.pdfs.topMe(email, limit),
    queryFn: () => getMyTopPdfs(limit),
    enabled: isAuthenticated,
    staleTime: ROW_STALE_TIME,
    retry: 1,
  });
}

// Hilera "Novedades de mis asignaturas" (solo con sesión; [] si no hay suscripciones).
export function useRecentSubscribedPdfs(limit = PDF_ROW_LIMIT, enabled = true) {
  const { isAuthenticated, email } = useAuth();
  return useQuery({
    queryKey: queryKeys.pdfs.recentSubscribed(email, limit),
    queryFn: () => getRecentSubscribedPdfs(limit),
    enabled: enabled && isAuthenticated,
    staleTime: ROW_STALE_TIME,
    retry: 1,
  });
}

// Tras abrir un PDF cambian viewCount y las hileras. Se invalida todo lo que cuelga de
// ["pdfs"] salvo el binario (["pdfs", id, "content"]), que está activo en el visor y se
// volvería a pedir (contando otra vista), y la valoración (["pdfs", id, "rating"]): el visor
// la activa justo al llegar el binario (se pediría dos veces) y tras votar ya se gestiona aparte.
export function useInvalidatePdfViews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pdfs.all(),
      predicate: (query) => query.queryKey[2] !== "content" && query.queryKey[2] !== "rating",
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
  };
}

export function usePdfs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.all(),
    queryFn: getPdfs,
    enabled,
  });
}

// El binario no se cachea más allá de la vista: gcTime 0 lo suelta en cuanto se desmonta
// el visor, para no dejar copias del PDF en memoria del QueryClient.
export function usePdfContent(pdfId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.content(pdfId),
    queryFn: () => getPdfContent(pdfId),
    enabled: enabled && Number.isFinite(pdfId),
    gcTime: 0,
    staleTime: Infinity,
  });
}

// Valoración del PDF y mi voto (requiere sesión). Se activa solo cuando ha llegado el binario:
// GET /pdf/{pdfId} es lo que registra la vista y, si rating se pidiera antes, llegaría con
// cannotVoteReason NOT_VIEWED. Sin reintentos largos: en modo mock el back responde 401.
export function usePdfRating(pdfId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.rating(pdfId),
    queryFn: () => getPdfRating(pdfId),
    enabled: enabled && Number.isFinite(pdfId),
    retry: 1,
  });
}

// Voto 👍/👎: `vote` null retira el voto (DELETE); si no, PUT (vota o cambia). Actualización
// optimista del contador y de myVote; `score` se deja como estaba hasta que responda el back.
export function useVotePdf(pdfId: number) {
  const queryClient = useQueryClient();
  const invalidateViews = useInvalidatePdfViews();
  const key = queryKeys.pdfs.rating(pdfId);
  return useMutation({
    mutationFn: async (vote: PdfVote | null): Promise<PdfRatingDto | undefined> => {
      if (vote !== null) return ratePdf(pdfId, vote);
      await removePdfRating(pdfId);
    },
    onMutate: async (vote) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PdfRatingDto>(key);
      if (previous) {
        const old = previous.myVote;
        const likeCount = (previous.rating?.likeCount ?? 0) - (old === "LIKE" ? 1 : 0) + (vote === "LIKE" ? 1 : 0);
        const dislikeCount =
          (previous.rating?.dislikeCount ?? 0) - (old === "DISLIKE" ? 1 : 0) + (vote === "DISLIKE" ? 1 : 0);
        queryClient.setQueryData<PdfRatingDto>(key, {
          ...previous,
          myVote: vote,
          rating: { ...previous.rating, likeCount, dislikeCount },
        });
      }
      return { previous };
    },
    onError: (error, _vote, context) => {
      queryClient.setQueryData(key, context?.previous);
      // 403: ya no puede votar (autor o PDF no abierto); se relee para obtener cannotVoteReason.
      if (error instanceof ApiError && error.status === 403) queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(key, data);
      // El 204 del DELETE no trae el resumen recalculado.
      else queryClient.invalidateQueries({ queryKey: key });
    },
    // Las listas llevan el `rating` de cada PDF, que acaba de cambiar.
    onSettled: invalidateViews,
  });
}

function useInvalidatePdfQueries() {
  const queryClient = useQueryClient();
  return () => {
    // Los prefijos son jerárquicos: esto invalida también los PDFs/temas por asignatura.
    queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
  };
}

export function useCreatePdf() {
  const invalidate = useInvalidatePdfQueries();
  return useMutation({
    mutationFn: ({ data, file, onProgress }: { data: CreatePDFDto; file: File; onProgress?: UploadProgress }) =>
      createPdf(data, file, onProgress),
    onSuccess: invalidate,
  });
}

export function useUpdatePdf() {
  const invalidate = useInvalidatePdfQueries();
  return useMutation({
    mutationFn: ({
      pdfId,
      data,
      file,
      onProgress,
    }: {
      pdfId: number;
      data: UpdatePDFDto;
      file?: File;
      onProgress?: UploadProgress;
    }) => updatePdf(pdfId, data, file, onProgress),
    onSuccess: invalidate,
  });
}

export function useDeletePdf() {
  const invalidate = useInvalidatePdfQueries();
  return useMutation({
    mutationFn: (pdfId: number) => deletePdf(pdfId),
    onSuccess: invalidate,
  });
}
