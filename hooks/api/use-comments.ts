"use client";

import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  approveComment,
  COMMENT_LIKES_CHUNK,
  createComment,
  deleteComment,
  getAdminCommentQueue,
  getCommentConfig,
  getCommentContext,
  getCommentReplies,
  getModerationStatus,
  getMyCommentLikes,
  getMyComments,
  getRootComments,
  likeComment,
  rejectComment,
  reportComment,
  unlikeComment,
  type AdminQueueStatus,
  type CommentDto,
  type CommentPageDto,
  type CreateCommentDto,
  type ModerationCategory,
  type ReportReason,
} from "@/lib/api/comments";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/contexts/auth-context";
import { queryKeys } from "@/lib/query/keys";

export const COMMENTS_PAGE_SIZE = 20;
export const ADMIN_COMMENTS_PAGE_SIZE = 20;

const CONFIG_STALE_TIME = 10 * 60 * 1000;
// Las listas públicas se refrescan al volver a la pestaña, pero no en cada montaje.
const LIST_STALE_TIME = 30 * 1000;
const LIKES_STALE_TIME = 60 * 1000;
// Sondeo de "mis comentarios" mientras haya alguno PENDING (la IA suele tardar 5-15 s) y corte:
// pasados ~2 min sin resolverse es que la IA está caída y deja de tener sentido insistir.
const MY_COMMENTS_POLL_MS = 5_000;
const MY_COMMENTS_POLL_TIMEOUT_MS = 2 * 60 * 1000;
const MODERATION_STATUS_POLL_MS = 60_000;

// 401 = sesión caducada: reintentar no sirve de nada.
const retryUnlessUnauthorized = (failures: number, error: unknown) =>
  !(error instanceof ApiError && error.status === 401) && failures < 2;

const isStatus = (error: unknown, ...statuses: number[]) =>
  error instanceof ApiError && statuses.includes(error.status);

/* ------------------------------ Lectura pública ------------------------------ */

// Longitud máxima y PENDING por usuario. Casi nunca cambia: caché larga.
export function useCommentConfig() {
  return useQuery({
    queryKey: queryKeys.comments.config(),
    queryFn: getCommentConfig,
    staleTime: CONFIG_STALE_TIME,
  });
}

// Raíces del PDF (más recientes primero). `data.pages[0].total` es el nº de raíces (no cuenta
// respuestas). Siguiente página con `fetchNextPage` mientras `hasNextPage`.
export function useRootComments(pdfId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments.roots(pdfId),
    queryFn: ({ pageParam }) => getRootComments(pdfId, pageParam, COMMENTS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? (last.page ?? 0) + 1 : undefined),
    enabled: enabled && Number.isFinite(pdfId),
    staleTime: LIST_STALE_TIME,
  });
}

// Respuestas de una raíz (más antiguas primero). Pasa `enabled` a true al desplegar el hilo.
// El pdfId solo cuelga la clave de su PDF para poder invalidarlas juntas.
export function useCommentReplies(pdfId: number, rootId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments.repliesOf(pdfId, rootId),
    queryFn: ({ pageParam }) => getCommentReplies(rootId, pageParam, COMMENTS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? (last.page ?? 0) + 1 : undefined),
    enabled,
    staleTime: LIST_STALE_TIME,
  });
}

// Comentario destacado ({ root, target }) de `?comment=ID`. Con null no pide nada. Un 404 (no
// existe o ya no está publicado) es definitivo: sin reintentos, la UI solo baja a la sección.
export function useCommentContext(commentId: number | null) {
  return useQuery({
    queryKey: queryKeys.comments.context(commentId ?? -1),
    queryFn: () => getCommentContext(commentId as number),
    enabled: commentId !== null && Number.isFinite(commentId),
    staleTime: LIST_STALE_TIME,
    retry: (failures, error) => !isStatus(error, 404) && failures < 1,
  });
}

/* ------------------------------ Mis comentarios ------------------------------ */

// Ids de los PENDING unidos por comas ("" si no hay ninguno): identifica "el conjunto en espera".
const pendingIdsKey = (comments?: CommentDto[]) =>
  (comments ?? [])
    .filter((c) => c.status === "PENDING")
    .map((c) => c.id)
    .sort()
    .join(",");

/**
 * Mis comentarios del PDF con su estado (incluye los ya publicados). Sondea cada 5 s mientras
 * haya alguno PENDING y, si pasan ~2 min sin resolverse, deja de hacerlo y `pollingTimedOut`
 * pasa a true (la UI muestra "En revisión, puede tardar un poco más"). Un comentario nuevo en
 * PENDING reinicia el reloj. Cuando uno pasa a PUBLISHED se invalidan raíces y respuestas del PDF.
 * Extras sobre la query: `hasPending`, `pollingTimedOut` y `unpublished` (los que van en
 * "Tus comentarios": PENDING/REVIEW/REJECTED/HIDDEN).
 */
export function useMyComments(pdfId: number, enabled = true) {
  const { isAuthenticated, email } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.comments.mine(email, pdfId);
  // Conjunto de PENDING cuyo plazo de sondeo ya venció.
  const [expiredFor, setExpiredFor] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const previous = queryClient.getQueryData<CommentDto[]>(key);
      const next = await getMyComments(pdfId);
      // Todavía no está en el caché, así que `previous` es la foto anterior: si alguno ha pasado
      // a PUBLISHED, ya forma parte del hilo público.
      if (previous) {
        const before = new Map(previous.map((c) => [c.id, c.status]));
        const published = next.some(
          (c) => c.status === "PUBLISHED" && before.has(c.id) && before.get(c.id) !== "PUBLISHED",
        );
        if (published) {
          queryClient.invalidateQueries({ queryKey: queryKeys.comments.roots(pdfId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(pdfId) });
        }
      }
      return next;
    },
    enabled: enabled && isAuthenticated && Number.isFinite(pdfId),
    refetchInterval: (q) => {
      const pending = pendingIdsKey(q.state.data);
      return pending !== "" && pending !== expiredFor ? MY_COMMENTS_POLL_MS : false;
    },
    refetchIntervalInBackground: false,
    retry: retryUnlessUnauthorized,
  });

  const pendingKey = pendingIdsKey(query.data);
  useEffect(() => {
    if (pendingKey === "") return;
    const timer = setTimeout(() => setExpiredFor(pendingKey), MY_COMMENTS_POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingKey]);

  const unpublished = useMemo(
    () =>
      (query.data ?? []).filter(
        (c) => c.status === "PENDING" || c.status === "REVIEW" || c.status === "REJECTED" || c.status === "HIDDEN",
      ),
    [query.data],
  );

  return {
    ...query,
    hasPending: pendingKey !== "",
    pollingTimedOut: pendingKey !== "" && expiredFor === pendingKey,
    unpublished,
  };
}

/* ------------------------------ Likes ------------------------------ */

const sortedUnique = (ids: number[]) => [...new Set(ids)].filter(Number.isFinite).sort((a, b) => a - b);
const toIdSet = (ids: number[]): ReadonlySet<number> => new Set(ids);

/**
 * Cuáles de los `ids` visibles le gustan al usuario, como `ReadonlySet<number>` (`data`). Trocea
 * a 100 ids por petición. Al cargar más páginas cambian los ids y se vuelve a pedir, pero se
 * mantiene el resultado anterior mientras tanto (no parpadean los corazones).
 */
export function useCommentLikes(ids: number[], enabled = true) {
  const { isAuthenticated, email } = useAuth();
  const sorted = sortedUnique(ids);
  const idsKey = sorted.join(",");
  return useQuery({
    queryKey: queryKeys.comments.likesFor(email, idsKey),
    queryFn: async () => {
      const chunks: number[][] = [];
      for (let i = 0; i < sorted.length; i += COMMENT_LIKES_CHUNK) {
        chunks.push(sorted.slice(i, i + COMMENT_LIKES_CHUNK));
      }
      return (await Promise.all(chunks.map(getMyCommentLikes))).flat();
    },
    select: toIdSet,
    enabled: enabled && isAuthenticated && sorted.length > 0,
    placeholderData: keepPreviousData,
    staleTime: LIKES_STALE_TIME,
    retry: retryUnlessUnauthorized,
  });
}

// Aplica `fn` a cada comentario cacheado (raíces, respuestas, mis comentarios y contexto) para
// que el cambio se vea al instante en cualquier sitio donde aparezca.
function patchCachedComments(queryClient: QueryClient, commentId: number, fn: (c: CommentDto) => CommentDto) {
  const patchOne = (c?: CommentDto) => (c && c.id === commentId ? fn(c) : c);
  const patchPage = (page: CommentPageDto): CommentPageDto => ({ ...page, items: page.items?.map(patchOne) as CommentDto[] });
  queryClient.setQueriesData<unknown>({ queryKey: queryKeys.comments.pdfs() }, (old: unknown) => {
    if (!old) return old;
    if (Array.isArray(old)) return old.map(patchOne); // mis comentarios
    const infinite = old as { pages?: CommentPageDto[] };
    return infinite.pages ? { ...infinite, pages: infinite.pages.map(patchPage) } : old;
  });
  queryClient.setQueriesData<{ root?: CommentDto; target?: CommentDto }>(
    { queryKey: ["comments", "context"] },
    (old) => (old ? { root: patchOne(old.root), target: patchOne(old.target) } : old),
  );
}

// Marca/desmarca el id en todas las consultas de likes del usuario.
function setCachedLiked(queryClient: QueryClient, userKey: string, commentId: number, liked: boolean) {
  queryClient.setQueriesData<number[]>({ queryKey: queryKeys.comments.likes(userKey) }, (old) => {
    if (!old) return old;
    const without = old.filter((id) => id !== commentId);
    return liked ? [...without, commentId] : without;
  });
}

/**
 * Me gusta / quitar me gusta. Variables: `{ commentId, liked }` con el estado DESEADO. Es
 * optimista (set de likes y likeCount en todas las páginas cacheadas), vuelve atrás si falla y
 * al responder fija el `likeCount` real devuelto por el back. No se puede dar like al propio (403).
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const { email } = useAuth();
  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: number; liked: boolean }) =>
      liked ? likeComment(commentId) : unlikeComment(commentId),
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.likes(email) });
      const wasLiked = queryClient
        .getQueriesData<number[]>({ queryKey: queryKeys.comments.likes(email) })
        .some(([, ids]) => ids?.includes(commentId));
      const delta = liked === wasLiked ? 0 : liked ? 1 : -1;
      setCachedLiked(queryClient, email, commentId, liked);
      if (delta !== 0) {
        patchCachedComments(queryClient, commentId, (c) => ({ ...c, likeCount: Math.max(0, (c.likeCount ?? 0) + delta) }));
      }
      return { wasLiked, delta };
    },
    onError: (error, { commentId }, context) => {
      if (context) {
        setCachedLiked(queryClient, email, commentId, context.wasLiked);
        if (context.delta !== 0) {
          patchCachedComments(queryClient, commentId, (c) => ({
            ...c,
            likeCount: Math.max(0, (c.likeCount ?? 0) - context.delta),
          }));
        }
      }
      // 404/409: el comentario ya no está publicado; se relee para que desaparezca.
      if (isStatus(error, 404, 409)) queryClient.invalidateQueries({ queryKey: queryKeys.comments.pdfs() });
    },
    onSuccess: (data, { commentId }) => {
      if (typeof data.likeCount === "number") {
        patchCachedComments(queryClient, commentId, (c) => ({ ...c, likeCount: data.likeCount }));
      }
      if (typeof data.liked === "boolean") setCachedLiked(queryClient, email, commentId, data.liked);
    },
  });
}

/* ------------------------------ Escritura ------------------------------ */

/**
 * Publica un comentario o respuesta. Variables: `{ body, replyToId? }`. Al 202 (queda PENDING) lo
 * añade a "mis comentarios" del PDF, lo que arranca el sondeo. Errores: CommentValidationError
 * (400 con `code`) o ApiError (403 sin username, 404, 409, 429); ver commentCreateErrorMessage.
 */
export function useCreateComment(pdfId: number) {
  const queryClient = useQueryClient();
  const { email } = useAuth();
  return useMutation({
    mutationFn: (variables: CreateCommentDto) => createComment(pdfId, variables),
    onSuccess: (created) => {
      queryClient.setQueryData<CommentDto[]>(queryKeys.comments.mine(email, pdfId), (old) => [...(old ?? []), created]);
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.mine(email, pdfId) });
    },
    onError: (error) => {
      // El comentario al que se respondía ya no existe / no está publicado: refrescar el hilo.
      if (isStatus(error, 404, 409)) queryClient.invalidateQueries({ queryKey: queryKeys.comments.pdf(pdfId) });
    },
  });
}

// Tras borrar/moderar cambian las listas públicas del PDF (todas si no se sabe cuál), el
// contexto de cualquier comentario y la cola de admin con su estado.
export function useInvalidateComments() {
  const queryClient = useQueryClient();
  return (pdfId?: number) => {
    queryClient.invalidateQueries({
      queryKey: pdfId !== undefined ? queryKeys.comments.pdf(pdfId) : queryKeys.comments.pdfs(),
    });
    queryClient.invalidateQueries({ queryKey: ["comments", "context"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.comments.admin() });
  };
}

/**
 * Borra un comentario (autor o admin). Variables: `{ commentId, pdfId }`. Idempotente. Refresca
 * las listas del PDF (una raíz con respuestas pasa a `available=false`) y la cola de admin.
 */
export function useDeleteComment() {
  const invalidate = useInvalidateComments();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; pdfId: number }) => deleteComment(commentId),
    onSettled: (_data, _error, { pdfId }) => invalidate(pdfId),
  });
}

/**
 * Denuncia un comentario. Variables: `{ commentId, reason }`. Idempotente. Errores: 403 propio,
 * 404, 409 no publicado (en esos dos últimos se refrescan las listas).
 */
export function useReportComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, reason }: { commentId: number; reason: ReportReason }) =>
      reportComment(commentId, reason),
    onError: (error) => {
      if (isStatus(error, 404, 409)) queryClient.invalidateQueries({ queryKey: queryKeys.comments.pdfs() });
    },
  });
}

/* ------------------------------ Admin ------------------------------ */

/**
 * Cola de moderación (infinita, 20 por página). `statuses` vacío = el valor por defecto del back
 * (REVIEW + HIDDEN). `data.pages[0].total` es el total de la cola para esos estados.
 */
export function useAdminCommentQueue(statuses: AdminQueueStatus[], enabled = true) {
  const sorted = [...new Set(statuses)].sort();
  return useInfiniteQuery({
    queryKey: queryKeys.comments.adminQueue(sorted.join(",")),
    queryFn: ({ pageParam }) => getAdminCommentQueue(sorted, pageParam, ADMIN_COMMENTS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? (last.page ?? 0) + 1 : undefined),
    enabled,
    retry: retryUnlessUnauthorized,
  });
}

/**
 * Estado de la moderación: `aiAvailable`, `nextCheckAt`, `pendingCount`, `reviewCount`. Cada 60 s
 * solo con la pestaña visible (como useUnreadCount). Pasa `enabled = isAdmin`.
 */
export function useModerationStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.comments.moderationStatus(),
    queryFn: getModerationStatus,
    enabled,
    refetchInterval: MODERATION_STATUS_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: retryUnlessUnauthorized,
  });
}

// `pdfId` es opcional: con él solo se refresca ese PDF; sin él, las listas de todos.
export function useApproveComment() {
  const invalidate = useInvalidateComments();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; pdfId?: number }) => approveComment(commentId),
    // onSettled: un 404/409 también indica que la cola está desfasada.
    onSettled: (_data, _error, { pdfId }) => invalidate(pdfId),
  });
}

export function useRejectComment() {
  const invalidate = useInvalidateComments();
  return useMutation({
    mutationFn: ({ commentId, category }: { commentId: number; category: ModerationCategory; pdfId?: number }) =>
      rejectComment(commentId, category),
    onSettled: (_data, _error, { pdfId }) => invalidate(pdfId),
  });
}
