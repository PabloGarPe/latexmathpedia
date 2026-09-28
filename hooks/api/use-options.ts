"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOption,
  deleteOption,
  updateOption,
  type CreateOptionDto,
  type UpdateOptionDto,
} from "@/lib/api/options";
import { queryKeys } from "@/lib/query/keys";

export function useCreateOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOptionDto) => createOption(body),
    onSuccess: (_data, body) => {
      if (body.questionId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.questions.options(body.questionId) });
      }
    },
  });
}

export function useUpdateOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateOptionDto }) => updateOption(id, body),
    onSuccess: (_data, variables) => {
      if (variables.body.questionId != null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.questions.options(variables.body.questionId),
        });
      }
    },
  });
}

export function useDeleteOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; questionId: number }) => deleteOption(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.options(variables.questionId) });
    },
  });
}
