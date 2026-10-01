"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, updateMe, type UpdateUserAccountDto } from "@/lib/api/profile";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}

// Sincroniza la cuenta del backend al iniciar sesión / registrarse: `GET /me` aprovisiona el
// UserAccount si es el primer acceso y, si aún no tiene nombre, `PUT /me` (updateMe) le pone
// el nombre que trae Keycloak. No se sobrescribe un nombre ya configurado por el usuario.
// Se ejecuta una sola vez por usuario (`userKey`) mientras dure la pestaña.
export function useSyncUserAccount(userKey: string | undefined, fallbackName: string) {
  const queryClient = useQueryClient();
  const syncedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userKey || syncedFor.current === userKey) return;
    syncedFor.current = userKey;

    (async () => {
      try {
        const me = await queryClient.fetchQuery({ queryKey: queryKeys.profile.me(), queryFn: getMe });
        const name = fallbackName.trim();
        if (!me?.name?.trim() && name) {
          const updated = await updateMe({ name });
          queryClient.setQueryData(queryKeys.profile.me(), updated);
        }
      } catch (error) {
        // Se reintenta en el próximo login/recarga; no bloquea la navegación.
        syncedFor.current = undefined;
        console.error("No se pudo sincronizar la cuenta de usuario con el backend:", error);
      }
    })();
  }, [userKey, fallbackName, queryClient]);
}

