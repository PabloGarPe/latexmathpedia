"use client";

import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, type ChatRequest } from "@/lib/api/chatbot";

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (body: ChatRequest) => sendChatMessage(body),
  });
}
