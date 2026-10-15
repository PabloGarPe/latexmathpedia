"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPdf,
  deletePdf,
  getMyTopPdfs,
  getPdfContent,
  getPdfs,
  getRecentPdfs,
  getTopPdfs,
  updatePdf,
  type CreatePDFDto,
  type UpdatePDFDto,
} from "@/lib/api/pdfs";
import { useAuth } from "@/contexts/auth-context";
import { queryKeys } from "@/lib/query/keys";

export const PDF_ROW_LIMIT = 10;

// Las hileras públicas cambian despacio: 2 min de staleTime evita refetch al cambiar de pestaña.
const ROW_STALE_TIME = 2 * 60 * 1000;

export function useRecentPdfs(limit = PDF_ROW_LIMIT) {
  return useQuery({
    queryKey: queryKeys.pdfs.recent(limit),
    queryFn: () => getRecentPdfs(limit),
    staleTime: ROW_STALE_TIME,
  });
}

export function useTopPdfs(limit = PDF_ROW_LIMIT) {
  return useQuery({
    queryKey: queryKeys.pdfs.top(limit),
    queryFn: () => getTopPdfs(limit),
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

// Tras abrir un PDF cambian viewCount y las hileras. Se invalida todo lo que cuelga de
// ["pdfs"] salvo el binario (["pdfs", id, "content"]), que está activo en el visor y se
// volvería a pedir (contando otra vista).
export function useInvalidatePdfViews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pdfs.all(),
      predicate: (query) => query.queryKey[2] !== "content",
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
    mutationFn: ({ data, file }: { data: CreatePDFDto; file: File }) => createPdf(data, file),
    onSuccess: invalidate,
  });
}

export function useUpdatePdf() {
  const invalidate = useInvalidatePdfQueries();
  return useMutation({
    mutationFn: ({ pdfId, data, file }: { pdfId: number; data: UpdatePDFDto; file?: File }) =>
      updatePdf(pdfId, data, file),
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
