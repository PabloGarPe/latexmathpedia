"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPdf,
  deletePdf,
  getPdfContent,
  getPdfs,
  updatePdf,
  type CreatePDFDto,
  type UpdatePDFDto,
} from "@/lib/api/pdfs";
import { queryKeys } from "@/lib/query/keys";

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
