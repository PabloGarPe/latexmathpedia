"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubject,
  createSubjectUnit,
  deleteSubject,
  deleteSubjectUnit,
  getSubject,
  getSubjectPdfs,
  getSubjectQuizzes,
  getSubjects,
  getSubjectUnits,
  updateSubject,
  sortUnits,
  updateSubjectUnit,
  type CreateSubjectDto,
  type SubjectFilters,
  type SubjectUnitDto,
  type CreateSubjectUnitDto,
  type UpdateSubjectDto,
  type UpdateSubjectUnitDto,
} from "@/lib/api/subjects";
import { queryKeys } from "@/lib/query/keys";

// Sin filtros (o con todos vacíos), el catálogo completo bajo ["subjects"]; con filtros, su
// propia clave. Los campos undefined no cuentan como filtro.
export function useSubjects(filters: SubjectFilters = {}, enabled = true) {
  const active = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== false),
  ) as SubjectFilters;
  const filtered = Object.keys(active).length > 0;
  return useQuery({
    queryKey: filtered ? queryKeys.subjects.filtered(active) : queryKeys.subjects.all(),
    queryFn: () => getSubjects(active),
    enabled,
  });
}

export function useSubject(subjectId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(subjectId ?? -1),
    queryFn: () => getSubject(subjectId as number),
    enabled: subjectId != null,
  });
}

export function useSubjectUnits(subjectId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.subjects.units(subjectId ?? -1),
    queryFn: () => getSubjectUnits(subjectId as number),
    enabled: subjectId != null,
  });
}

export function useSubjectPdfs(subjectId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.subjects.pdfs(subjectId ?? -1),
    queryFn: () => getSubjectPdfs(subjectId as number),
    enabled: subjectId != null,
  });
}

// Requiere sesión (ver comentario en getSubjectQuizzes): pásale isAuthenticated como
// `enabled` desde el componente para que el anónimo simplemente no vea esta subsección.
export function useSubjectQuizzes(subjectId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subjects.quizzes(subjectId ?? -1),
    queryFn: () => getSubjectQuizzes(subjectId as number),
    enabled: subjectId != null && enabled,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubjectDto) => createSubject(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.degrees.all() });
    },
  });
}

// Los PDFs y cuestionarios denormalizan subject.name/subjectUnit.name en su propia
// respuesta (ver PDFDto/QuizDto), así que un rename/delete de asignatura o tema debe
// invalidar también esas cachés o se quedan mostrando el nombre antiguo hasta el próximo
// refetch natural. Lo mismo con los planes de estudio (embeben SubjectDto y dependen de las
// colocaciones).
function useInvalidateSubjectQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.degrees.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
  };
}

export function useUpdateSubject() {
  const invalidate = useInvalidateSubjectQueries();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateSubjectDto }) => updateSubject(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidateSubjectQueries();
  return useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: invalidate,
  });
}

export function useCreateSubjectUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, body }: { subjectId: number; body: CreateSubjectUnitDto }) =>
      createSubjectUnit(subjectId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.units(variables.subjectId) });
    },
  });
}

export function useUpdateSubjectUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; subjectId: number; body: UpdateSubjectUnitDto }) =>
      updateSubjectUnit(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.units(variables.subjectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}

export function useDeleteSubjectUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; subjectId: number }) => deleteSubjectUnit(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.units(variables.subjectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all() });
    },
  });
}

// Reordenar temas tras arrastrar: `units` es el orden final. Solo se escriben los que cambian
// de posición (1..N; el back no exige que sean únicas ni consecutivas). Optimista: la lista se
// recoloca al soltar y vuelve atrás si algún PUT falla.
export function useReorderSubjectUnits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ units }: { subjectId: number; units: SubjectUnitDto[] }) =>
      Promise.all(
        units.flatMap((unit, index) =>
          unit.id != null && unit.position !== index + 1
            ? [updateSubjectUnit(unit.id, { name: unit.name ?? "", position: index + 1 })]
            : [],
        ),
      ),
    onMutate: async ({ subjectId, units }) => {
      const key = queryKeys.subjects.units(subjectId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SubjectUnitDto[]>(key);
      queryClient.setQueryData<SubjectUnitDto[]>(
        key,
        sortUnits(units.map((unit, index) => ({ ...unit, position: index + 1 }))),
      );
      return { previous };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(queryKeys.subjects.units(variables.subjectId), context?.previous);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.units(variables.subjectId) });
    },
  });
}
