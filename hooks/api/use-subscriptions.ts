"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getMySubscriptions,
  subscribe,
  subscribeToCourse,
  unsubscribe,
  unsubscribeFromCourse,
  type CourseRef,
} from "@/lib/api/subscriptions";
import { queryKeys } from "@/lib/query/keys";

// Una única query de suscripciones; el resto (¿está suscrito?, sidebar, hileras) se deriva de
// ella. Solo con sesión; sin reintentos largos (en modo mock el back responde 401).
export function useMySubscriptions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscriptions.all(),
    queryFn: getMySubscriptions,
    enabled: isAuthenticated,
    retry: 1,
  });
}

// Ids de las asignaturas suscritas (vacío sin sesión o mientras carga).
export function useSubscribedSubjectIds(): Set<number> {
  const { data } = useMySubscriptions();
  return useMemo(
    () => new Set((data ?? []).map((s) => s.subject?.id).filter((id): id is number => id != null)),
    [data],
  );
}

// Suscribirse / darse de baja. Ambos son idempotentes en el back, así que un doble clic no
// rompe nada. Tras cambiar, se refrescan la lista y las hileras "de mis asignaturas".
function useInvalidateSubscriptions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all() });
    queryClient.invalidateQueries({ queryKey: ["pdfs", "recent-subscribed"] });
    queryClient.invalidateQueries({ queryKey: ["quizzes", "recent-subscribed"] });
  };
}

export function useToggleSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ subjectId, subscribed }: { subjectId: number; subscribed: boolean }) =>
      subscribed ? subscribe(subjectId).then(() => undefined) : unsubscribe(subjectId),
    onSettled: invalidate,
  });
}

// Suscribirse / darse de baja de un curso entero (grado + año [+ cuatrimestre]). Es una foto
// fija de las asignaturas colocadas ahora; el estado "suscrito al curso" se deriva cruzando las
// asignaturas del curso con useSubscribedSubjectIds.
export function useToggleCourseSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ subscribed, ...course }: CourseRef & { subscribed: boolean }) =>
      subscribed ? subscribeToCourse(course).then(() => undefined) : unsubscribeFromCourse(course),
    onSettled: invalidate,
  });
}
