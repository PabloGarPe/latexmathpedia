import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type ChatRequest = components["schemas"]["ChatRequest"];
export type ChatResponse = components["schemas"]["ChatResponse"];
export type ChatMessage = components["schemas"]["ChatMessage"];
export type ChatResource = components["schemas"]["ChatResource"];

// Admite peticiones anónimas y autenticadas; apiClient añade el Bearer solo si hay sesión.
export async function sendChatMessage(body: ChatRequest) {
  const { data, error } = await apiClient.POST("/chatbot/chat", { body });
  if (error) throw error;
  return data;
}
