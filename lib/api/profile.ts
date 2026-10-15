import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type UserAccountDto = components["schemas"]["UserAccountDto"];
export type UpdateUserAccountDto = components["schemas"]["UpdateUserAccountDto"];
export type AuthorDto = components["schemas"]["AuthorDto"];

// Mismas reglas que el back (UpdateUserAccountDto). El username es único sin distinguir
// mayúsculas, pero eso solo se sabe al guardar (409): no hay endpoint de disponibilidad.
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;
export const PROFILE_LIMITS = { name: 100, bio: 280, university: 150, studies: 150 } as const;

// Foto de perfil: lo que acepta PUT /me/avatar. El back recorta a cuadrado y reduce a 256 px.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIN_PX = 64;
export const AVATAR_MAX_PX = 6000;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export async function getMe() {
  const { data, error } = await apiClient.GET("/me");
  if (error) throw error;
  return data;
}

// Reemplazo completo: un campo opcional que no se envíe (o vaya en blanco) se borra, así que
// el formulario manda siempre todos los valores. 409 = username ya en uso (ApiError.status).
export async function updateMe(body: UpdateUserAccountDto) {
  const { data, error, response } = await apiClient.PUT("/me", { body });
  if (error || !response.ok || !data) throw new ApiError(response.status, "No se pudo actualizar el perfil");
  return data;
}

// multipart/form-data con la parte "file". Devuelve el perfil con hasAvatar/avatarUpdatedAt nuevos.
export async function uploadAvatar(file: Blob, filename = "avatar.jpg") {
  const { data, response } = await apiClient.PUT("/me/avatar", {
    body: { file: "" },
    bodySerializer: () => {
      const form = new FormData();
      form.append("file", file, filename);
      return form;
    },
  });
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo subir la foto de perfil");
  return data;
}

// Idempotente: si no había foto no hace nada.
export async function deleteAvatar() {
  const { data, response } = await apiClient.DELETE("/me/avatar");
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo eliminar la foto de perfil");
  return data;
}

// La foto requiere JWT, así que no vale como `src` de <img>: se pide con el token y se pinta
// como blob. null = sin foto (404: no tiene, usuario inactivo o inexistente).
export async function getAvatar(userId: number, signal?: AbortSignal): Promise<Blob | null> {
  const { data, response } = await apiClient.GET("/users/{userId}/avatar", {
    params: { path: { userId } },
    parseAs: "blob",
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok || !data) throw new ApiError(response.status, "No se pudo cargar la foto de perfil");
  return data as Blob;
}
