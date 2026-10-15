"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOption,
  deleteOption,
  updateOption,
  type CreateOptionDto,
  type OptionDto,
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

function toBody(option: OptionDto, questionId: number, overrides: Partial<UpdateOptionDto> = {}): UpdateOptionDto {
  return {
    text: option.text ?? "",
    position: option.position,
    questionId,
    correct: option.correct,
    ...overrides,
  };
}

// Marcar una opción como correcta. El back no lo hace de forma atómica, así que las dos
// escrituras van en secuencia (nunca hay dos "correct: true" a la vez) y, si la segunda falla,
// se restaura la anterior para no dejar la pregunta sin respuesta correcta.
export function useSetCorrectOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questionId,
      option,
      previous,
    }: {
      questionId: number;
      option: OptionDto;
      previous?: OptionDto;
    }) => {
      if (option.id == null) return;
      const hasPrevious = previous?.id != null && previous.id !== option.id;
      if (hasPrevious) await updateOption(previous!.id as number, toBody(previous!, questionId, { correct: false }));
      try {
        await updateOption(option.id, toBody(option, questionId, { correct: true }));
      } catch (error) {
        if (hasPrevious) await updateOption(previous!.id as number, toBody(previous!, questionId, { correct: true }));
        throw error;
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.options(variables.questionId) });
    },
  });
}

// Reordenar opciones tras arrastrar (mismo esquema que useReorderQuestions).
export function useReorderOptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, options }: { questionId: number; options: OptionDto[] }) =>
      Promise.all(
        options.flatMap((option, index) =>
          option.id != null && option.position !== index + 1
            ? [updateOption(option.id, toBody(option, questionId, { position: index + 1 }))]
            : [],
        ),
      ),
    onMutate: async ({ questionId, options }) => {
      const key = queryKeys.questions.options(questionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OptionDto[]>(key);
      queryClient.setQueryData<OptionDto[]>(
        key,
        options.map((option, index) => ({ ...option, position: index + 1 })),
      );
      return { previous };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(queryKeys.questions.options(variables.questionId), context?.previous);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.options(variables.questionId) });
    },
  });
}
