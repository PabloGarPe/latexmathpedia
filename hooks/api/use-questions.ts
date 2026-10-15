"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  deleteQuestion,
  getQuestionOptions,
  updateQuestion,
  type CreateQuestionDto,
  type QuestionDto,
  type UpdateQuestionDto,
} from "@/lib/api/questions";
import type { OptionDto } from "@/lib/api/options";
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

// Opciones de varias preguntas a la vez (el editor necesita saber de todas si están completas).
// Comparten clave con useQuestionOptions, así que no duplican peticiones ni caché.
export function useQuestionsOptions(questionIds: number[]) {
  const results = useQueries({
    queries: questionIds.map((id) => ({
      queryKey: queryKeys.questions.options(id),
      queryFn: () => getQuestionOptions(id),
    })),
  });
  const byQuestion = new Map<number, OptionDto[]>();
  questionIds.forEach((id, index) => {
    const data = results[index]?.data;
    if (data) byQuestion.set(id, data);
  });
  return { byQuestion, isLoading: results.some((result) => result.isLoading) };
}

// Reordenar preguntas tras arrastrar: `questions` es el orden final. Solo se escriben las que
// cambian de posición (1..N). Optimista: la lista se recoloca al soltar y vuelve atrás si algún
// PUT falla.
export function useReorderQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, questions }: { quizId: number; questions: QuestionDto[] }) =>
      Promise.all(
        questions.flatMap((question, index) =>
          question.id != null && question.position !== index + 1
            ? [
                updateQuestion(question.id, {
                  text: question.text ?? "",
                  type: question.type as UpdateQuestionDto["type"],
                  explanation: question.explanation ?? undefined,
                  position: index + 1,
                  quizId,
                }),
              ]
            : [],
        ),
      ),
    onMutate: async ({ quizId, questions }) => {
      const key = queryKeys.quizzes.questions(quizId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<QuestionDto[]>(key);
      queryClient.setQueryData<QuestionDto[]>(
        key,
        questions.map((question, index) => ({ ...question, position: index + 1 })),
      );
      return { previous };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(queryKeys.quizzes.questions(variables.quizId), context?.previous);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(variables.quizId) });
    },
  });
}
