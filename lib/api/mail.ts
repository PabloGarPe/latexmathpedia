import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Mail = components["schemas"]["Mail"];

// El remitente se rellena en el backend a partir del usuario autenticado si `from` no se indica.
export async function sendMail(body: Mail) {
  const { error } = await apiClient.POST("/mail/send", { body });
  if (error) throw error;
}
