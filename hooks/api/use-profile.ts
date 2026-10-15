"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAvatar,
  getAvatar,
  getMe,
  updateMe,
  uploadAvatar,
  type UpdateUserAccountDto,
  type UserAccountDto,
} from "@/lib/api/profile";
import { queryKeys } from "@/lib/query/keys";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: getMe,
    enabled,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserAccountDto) => updateMe(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile.me(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}

// Tras subir o borrar la foto: el perfil trae el avatarUpdatedAt nuevo y la clave del blob cambia.
function useAvatarMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<UserAccountDto>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile.me(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      if (updated.id != null) queryClient.invalidateQueries({ queryKey: queryKeys.avatars.user(updated.id) });
    },
  });
}

export function useUploadAvatar() {
  return useAvatarMutation(({ file, filename }: { file: Blob; filename?: string }) => uploadAvatar(file, filename));
}

export function useDeleteAvatar() {
  return useAvatarMutation(() => deleteAvatar());
}

// Blob de la foto de un usuario, o null si no tiene. Solo se pide si hay sesión y el usuario
// tiene foto (hasAvatar). Con la versión (avatarUpdatedAt) en la clave, el blob no caduca por
// tiempo; sin ella (AuthorCandidateDto no la trae) se revalida pasado un rato (el back
// responde 304 si no ha cambiado).
export function useAvatarBlob(
  userId: number | null | undefined,
  version: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.avatars.version(userId ?? -1, version ?? "latest"),
    queryFn: ({ signal }) => getAvatar(userId as number, signal),
    enabled: enabled && userId != null,
    staleTime: version ? Infinity : 5 * 60 * 1000,
    retry: false,
  });
}

// Al iniciar sesión o registrarse: `GET /me` aprovisiona el UserAccount en el back si es el
// primer acceso. Ya no se escribe nada: el username lo elige el usuario en /dashboard/profile
// (el back marca el perfil como completo en el primer PUT /me). Una vez por usuario y pestaña.
export function useSyncUserAccount(userKey: string | undefined) {
  const queryClient = useQueryClient();
  const syncedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userKey || syncedFor.current === userKey) return;
    syncedFor.current = userKey;

    queryClient.fetchQuery({ queryKey: queryKeys.profile.me(), queryFn: getMe }).catch((error) => {
      // Se reintenta en el próximo login/recarga; no bloquea la navegación.
      syncedFor.current = undefined;
      console.error("No se pudo sincronizar la cuenta de usuario con el backend:", error);
    });
  }, [userKey, queryClient]);
}
