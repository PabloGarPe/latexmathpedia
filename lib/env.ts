// Variables de entorno públicas (accesibles desde cliente y servidor).
// Next.js solo inyecta las NEXT_PUBLIC_* si se leen de forma literal, por eso no se
// accede a process.env de forma dinámica.

const DEV_DEFAULT_API_URL = "http://localhost:8081";

function resolveApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (value && value.length > 0) {
    return value.replace(/\/+$/, "");
  }

  // No lanzar nunca en build/prerender (SSR/SSG) ni en servidor: reventaría `next build`
  // o cualquier página server-rendered en cuanto faltase la variable, incluida en CI.
  // Solo avisamos en el navegador y en producción, sin romper nada.
  if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
    console.warn(
      "NEXT_PUBLIC_API_URL no está definida; usando el valor por defecto de desarrollo " +
        `(${DEV_DEFAULT_API_URL}). Configúrala en el entorno (ver .env.example).`
    );
  }

  return DEV_DEFAULT_API_URL;
}

export const API_URL = resolveApiUrl();

// Selector de modo de autenticación (ver contexts/auth-context.tsx):
// - "mock" (por defecto): auth 100% local, sin Keycloak, para poder desarrollar/probar
//   sin depender de un servidor Keycloak levantado.
// - "keycloak": auth real vía Auth.js + Keycloak (ver auth.ts), requiere las variables
//   AUTH_SECRET/AUTH_URL/KEYCLOAK_* del .env.example.
export type AuthMode = "mock" | "keycloak";

export const AUTH_MODE: AuthMode =
  process.env.NEXT_PUBLIC_AUTH_MODE === "keycloak" ? "keycloak" : "mock";
