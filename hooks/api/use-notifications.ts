"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createAnnouncement,
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  updateNotificationPreferences,
  type CreateAnnouncementDto,
  type NotificationDto,
  type NotificationPreferenceDto,
  type PageNotificationDto,
  type UpdateNotificationPreferenceItem,
} from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

export const NOTIFICATIONS_PAGE_SIZE = 20;
// Tamaño del desplegable de la campanita (la página completa pagina de 20 en 20).
export const NOTIFICATIONS_POPOVER_SIZE = 10;

const UNREAD_POLL_MS = 60_000;

// 401 = sesión caducada: reintentar no sirve de nada.
const retryUnlessUnauthorized = (failures: number, error: unknown) =>
  !(error instanceof ApiError && error.status === 401) && failures < 2;

// Contador de la campanita. Barato (no toca la cuenta): cada 60 s solo con la pestaña visible,
// y se refresca al volver a ella.
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: retryUnlessUnauthorized,
  });
}

// Primera página (desplegable). Se pide solo cuando se abre (`enabled`).
export function useNotifications(unreadOnly: boolean, size: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly, size),
    queryFn: () => getNotifications({ unreadOnly, page: 0, size }),
    enabled,
    // Se abre el desplegable para ver lo último: siempre se refresca al montar.
    refetchOnMount: "always",
    retry: retryUnlessUnauthorized,
  });
}

// Página completa: scroll infinito.
export function useInfiniteNotifications(unreadOnly: boolean, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(unreadOnly),
    queryFn: ({ pageParam }) =>
      getNotifications({ unreadOnly, page: pageParam, size: NOTIFICATIONS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last === false ? (last.number ?? 0) + 1 : undefined),
    enabled,
    retry: retryUnlessUnauthorized,
  });
}

type CachedList = PageNotificationDto | InfiniteData<PageNotificationDto>;

// Aplica `fn` a cada notificación cacheada (devolver null la quita) en listas simples e
// infinitas, para que el cambio se vea al instante sin esperar al servidor.
function patchCachedLists(queryClient: QueryClient, fn: (n: NotificationDto) => NotificationDto | null) {
  const patchPage = (page: PageNotificationDto): PageNotificationDto => ({
    ...page,
    content: (page.content ?? []).flatMap((n) => {
      const next = fn(n);
      return next ? [next] : [];
    }),
  });
  queryClient.setQueriesData<CachedList>({ queryKey: queryKeys.notifications.lists() }, (old) => {
    if (!old) return old;
    return "pages" in old ? { ...old, pages: old.pages.map(patchPage) } : patchPage(old);
  });
}

// Tras cualquier acción se refrescan listas y contador. Un 404 (ya borrada) se resuelve solo:
// la refetch ya no la trae.
function useNotificationMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  optimistic?: (queryClient: QueryClient, variables: TVariables) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (variables: TVariables) => {
      optimistic?.(queryClient, variables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}

export function useMarkRead() {
  return useNotificationMutation(
    (id: number) => markNotificationRead(id),
    (qc, id) => patchCachedLists(qc, (n) => (n.id === id ? { ...n, read: true } : n)),
  );
}

export function useMarkUnread() {
  return useNotificationMutation(
    (id: number) => markNotificationUnread(id),
    (qc, id) => patchCachedLists(qc, (n) => (n.id === id ? { ...n, read: false } : n)),
  );
}

export function useMarkAllRead() {
  return useNotificationMutation(
    () => markAllNotificationsRead(),
    (qc) => {
      patchCachedLists(qc, (n) => ({ ...n, read: true }));
      qc.setQueryData(queryKeys.notifications.unreadCount(), 0);
    },
  );
}

export function useDeleteNotification() {
  return useNotificationMutation(
    (id: number) => deleteNotification(id),
    (qc, id) => patchCachedLists(qc, (n) => (n.id === id ? null : n)),
  );
}

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: getNotificationPreferences,
    enabled,
    retry: retryUnlessUnauthorized,
  });
}

// Guarda al cambiar cada interruptor: se pinta el cambio al momento, se vuelve atrás si falla
// y, al responder, se sustituye la caché por la matriz completa que devuelve el backend.
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const key = queryKeys.notifications.preferences();
  return useMutation({
    mutationFn: (changes: UpdateNotificationPreferenceItem[]) => updateNotificationPreferences(changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferenceDto[]>(key);
      queryClient.setQueryData<NotificationPreferenceDto[]>(key, (old) =>
        old?.map((row) => {
          const change = changes.find((c) => c.type === row.type && c.channel === row.channel);
          return change
            ? { ...row, enabled: change.enabled, scope: change.scope !== undefined ? change.scope : row.scope }
            : row;
        }),
      );
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (matrix) => {
      queryClient.setQueryData(key, matrix);
    },
  });
}

export function useCreateAnnouncement() {
  return useMutation({
    mutationFn: (body: CreateAnnouncementDto) => createAnnouncement(body),
  });
}
