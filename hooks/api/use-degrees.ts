"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDegree,
  deleteDegree,
  getCurriculum,
  getDegree,
  getDegrees,
  updateDegree,
  type CreateDegreeDto,
  type UpdateDegreeDto,
} from "@/lib/api/degrees";
import { queryKeys } from "@/lib/query/keys";

export function useDegrees(enabled = true) {
  return useQuery({
    queryKey: queryKeys.degrees.all(),
    queryFn: getDegrees,
    enabled,
  });
}

export function useDegree(degreeId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.degrees.detail(degreeId ?? -1),
    queryFn: () => getDegree(degreeId as number),
    enabled: degreeId != null,
  });
}

export function useCurriculum(
  degreeId: number | null | undefined,
  filters: { year?: number; semester?: number } = {},
) {
  return useQuery({
    queryKey: queryKeys.degrees.curriculum(degreeId ?? -1, filters),
    queryFn: () => getCurriculum(degreeId as number, filters),
    enabled: degreeId != null,
  });
}

// Un cambio de grado (nombre, universidad, años) se ve también en las colocaciones de las
// asignaturas (degreeName/university) y en el perfil (degree embebido; reducir años o borrar
// el grado vacía currentYear/degree de los usuarios afectados).
function useInvalidateDegreeQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.degrees.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
  };
}

export function useCreateDegree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDegreeDto) => createDegree(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.degrees.all() });
    },
  });
}

export function useUpdateDegree() {
  const invalidate = useInvalidateDegreeQueries();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateDegreeDto }) => updateDegree(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteDegree() {
  const invalidate = useInvalidateDegreeQueries();
  return useMutation({
    mutationFn: (id: number) => deleteDegree(id),
    onSuccess: invalidate,
  });
}
