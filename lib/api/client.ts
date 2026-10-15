import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { API_URL } from "@/lib/env";

export const apiClient = createClient<paths>({ baseUrl: API_URL });

// Token de acceso actual (JWT de Keycloak), si lo hay. Lo mantiene sincronizado
// `contexts/auth-context.tsx` (modo "keycloak") en cada cambio de sesión; en modo "mock"
// nunca se llama, así que las peticiones van sin Authorization (los endpoints protegidos
// del backend devolverán 401 real en modo mock, es esperado).
let currentAccessToken: string | undefined;

export function setApiAccessToken(token: string | undefined) {
  currentAccessToken = token;
}

// Para las peticiones que no pasan por apiClient (subidas con progreso, ver lib/api/pdfs.ts).
export function getApiAccessToken() {
  return currentAccessToken;
}

apiClient.use({
  onRequest({ request }) {
    if (currentAccessToken) {
      request.headers.set("Authorization", `Bearer ${currentAccessToken}`);
    }
    return request;
  },
});
