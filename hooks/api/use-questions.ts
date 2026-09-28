"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  deleteQuestion,
  getQuestionOptions,
  updateQuestion,
  type CreateQuestionDto,
  type UpdateQuestionDto,
} from "@/lib/api/questions";
import { queryKeys } from "@/lib/query/keys";

export function useQuestionOptions(questionId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.questions.options(questionId ?? -1),
    queryFn: () => getQuestionOptions(questionId as number),
    enabled: questionId != null,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, body }: { quizId: number; body: CreateQuestionDto }) =>
      createQuestion(body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(variables.quizId) });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; quizId: number; body: UpdateQuestionDto }) =>
      updateQuestion(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(variables.quizId) });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; quizId: number }) => deleteQuestion(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(variables.quizId) });
    },
  });
}
