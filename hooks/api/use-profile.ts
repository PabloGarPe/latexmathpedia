"use client";

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

