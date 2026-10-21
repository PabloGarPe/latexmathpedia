import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/errors";

export type Mail = components["schemas"]["Mail"];

// El remitente se rellena en el backend a partir del usuario autenticado si `from` no se indica.
export async function sendMail(body: Mail) {
  const { response } = await apiClient.POST("/mail/send", { body });
  if (!response.ok) throw new ApiError(response.status, "No se pudo enviar el mensaje");
}
