"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getMyCourseSubscriptions,
  getMySubscriptions,
  subscribe,
  subscribeToCourse,
  unsubscribe,
  unsubscribeFromCourse,
  type CourseRef,
  type CourseSubscriptionDto,
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

// Suscripciones a curso (grado + año [+ cuatrimestre]). Mismas condiciones que la anterior.
export function useMyCourseSubscriptions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscriptions.courses(),
    queryFn: getMyCourseSubscriptions,
    enabled: isAuthenticated,
    retry: 1,
  });
}

// ¿Está cubierto el curso (grado, año[, cuatrimestre]) por alguna suscripción?
// - Sin `semester`: solo cuenta la del año entero.
// - Con `semester`: cuenta la del año entero o la de ese cuatrimestre.
export function isCourseSubscribed(
  courses: CourseSubscriptionDto[],
  { degreeId, year, semester }: CourseRef,
): boolean {
  return courses.some(
    (c) =>
      c.degree?.id === degreeId &&
      c.year === year &&
      (c.semester == null || (semester != null && c.semester === semester)),
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

// Suscribirse / darse de baja de un curso entero (grado + año [+ cuatrimestre]). El back recuerda
// la suscripción al curso (useMyCourseSubscriptions) y suscribe solo a las asignaturas que se
// coloquen después. Al suscribirse devuelve las suscripciones a las asignaturas del curso.
export function useToggleCourseSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ subscribed, ...course }: CourseRef & { subscribed: boolean }) =>
      subscribed ? subscribeToCourse(course) : unsubscribeFromCourse(course).then(() => undefined),
    onSettled: invalidate,
  });
}
