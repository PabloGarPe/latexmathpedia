import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type NotificationDto = components["schemas"]["NotificationDto"];
export type PageNotificationDto = components["schemas"]["PageNotificationDto"];
export type NotificationPreferenceDto = components["schemas"]["NotificationPreferenceDto"];
export type UpdateNotificationPreferenceItem = components["schemas"]["Item"];
export type CreateAnnouncementDto = components["schemas"]["CreateAnnouncementDto"];

// Todas las llamadas comprueban `response.ok` y no `error`: un 401/404 sin cuerpo llega con
// `error` vacío.

export async function getUnreadCount() {
  const { data, response } = await apiClient.GET("/notifications/unread-count");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar el contador de notificaciones");
  return data.count ?? 0;
}

// `page` y `size` son planos en la query (no hay `pageable` anidado en este endpoint).
export async function getNotifications(params: { unreadOnly: boolean; page: number; size: number }) {
  const { data, response } = await apiClient.GET("/notifications", {
    params: { query: params },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar las notificaciones");
  return data;
}

export async function markNotificationRead(id: number) {
  const { response } = await apiClient.PATCH("/notifications/{id}/read", { params: { path: { id } } });
  if (!response.ok) throw new ApiError(response.status, "No se pudo marcar la notificación como leída");
}

export async function markNotificationUnread(id: number) {
  const { response } = await apiClient.PATCH("/notifications/{id}/unread", { params: { path: { id } } });
  if (!response.ok) throw new ApiError(response.status, "No se pudo marcar la notificación como no leída");
}

export async function markAllNotificationsRead() {
  const { data, response } = await apiClient.PATCH("/notifications/read-all");
  if (!response.ok) throw new ApiError(response.status, "No se pudieron marcar las notificaciones como leídas");
  return data?.updated ?? 0;
}

export async function deleteNotification(id: number) {
  const { response } = await apiClient.DELETE("/notifications/{id}", { params: { path: { id } } });
  if (!response.ok) throw new ApiError(response.status, "No se pudo eliminar la notificación");
}

export async function getNotificationPreferences() {
  const { data, response } = await apiClient.GET("/notifications/preferences");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron cargar las preferencias");
  return data;
}

// Cambio parcial; devuelve la matriz completa ya actualizada.
export async function updateNotificationPreferences(preferences: UpdateNotificationPreferenceItem[]) {
  const { data, response } = await apiClient.PUT("/notifications/preferences", {
    body: { preferences },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudieron guardar las preferencias");
  return data;
}

// Solo ADMIN. Responde 202 sin cuerpo (el reparto es asíncrono). El 404 indica que algún email
// no corresponde a ningún usuario.
export async function createAnnouncement(body: CreateAnnouncementDto) {
  const { response } = await apiClient.POST("/notifications/announcements", { body });
  if (!response.ok) {
    const message =
      response.status === 404
        ? "Algún destinatario no corresponde a ningún usuario"
        : response.status === 400
          ? "El aviso no es válido: revisa los campos"
          : "No se pudo enviar el aviso";
    throw new ApiError(response.status, message);
  }
}
