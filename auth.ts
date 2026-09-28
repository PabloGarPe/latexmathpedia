import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";
import { getKeycloakConfig, type KeycloakConfig } from "@/lib/env.server";

// Margen para renovar el access token un poco antes de que caduque
const REFRESH_MARGIN_SECONDS = 30;

type KeycloakTokenPayload = {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

function decodeJwtPayload(jwt: string): KeycloakTokenPayload {
  try {
    const payload = jwt.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

// Admin si tiene el rol en el realm o en el propio cliente
function hasAdminRole(accessToken: string, kc: KeycloakConfig): boolean {
  const payload = decodeJwtPayload(accessToken);
  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = payload.resource_access?.[kc.clientId]?.roles ?? [];
  return [...realmRoles, ...clientRoles].includes(kc.adminRole);
}

// Parámetros de autenticación del cliente para las llamadas directas a Keycloak.
// Un cliente público solo envía client_id; uno confidencial también el secret.
function clientCredentials(kc: KeycloakConfig): Record<string, string> {
  return kc.clientSecret
    ? { client_id: kc.clientId, client_secret: kc.clientSecret }
    : { client_id: kc.clientId };
}

async function refreshAccessToken(token: JWT, kc: KeycloakConfig): Promise<JWT> {
  try {
    const response = await fetch(`${kc.issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        ...clientCredentials(kc),
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw data;
    }

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      isAdmin: hasAdminRole(data.access_token, kc),
      error: undefined,
    };
  } catch (error) {
    console.error("Error al renovar el token de Keycloak:", error);
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const kc = getKeycloakConfig();

  const keycloakOptions = {
    clientId: kc.clientId,
    issuer: kc.issuer,
    // Cliente público: sin secret, protegido con PKCE
    ...(kc.clientSecret
      ? { clientSecret: kc.clientSecret }
      : { client: { token_endpoint_auth_method: "none" as const }, checks: ["pkce" as const, "state" as const] }),
  };

  return {
    providers: [
      Keycloak(keycloakOptions),
      // Mismo cliente, pero entrando por el endpoint de registro de Keycloak para
      // mostrar directamente el formulario de alta (Keycloak 26.0 ignora prompt=create)
      Keycloak({
        ...keycloakOptions,
        id: "keycloak-register",
        name: "Keycloak (registro)",
        authorization: {
          url: `${kc.issuer}/protocol/openid-connect/registrations`,
          params: { scope: "openid profile email" },
        },
      }),
    ],
    pages: {
      signIn: "/auth/login",
      error: "/auth/login",
    },
    callbacks: {
      async jwt({ token, account }) {
        // Primer login: guardar los tokens de Keycloak
        if (account) {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            isAdmin: account.access_token
              ? hasAdminRole(account.access_token, kc)
              : false,
          };
        }

        if (
          token.expiresAt &&
          Date.now() < (token.expiresAt - REFRESH_MARGIN_SECONDS) * 1000
        ) {
          return token;
        }

        if (!token.refreshToken) {
          return { ...token, error: "RefreshTokenError" };
        }

        return refreshAccessToken(token, kc);
      },
      async session({ session, token }) {
        session.accessToken = token.accessToken;
        session.isAdmin = token.isAdmin ?? false;
        session.error = token.error;
        return session;
      },
    },
    events: {
      // Cerrar también la sesión en Keycloak para que no vuelva a entrar sin pedir credenciales
      async signOut(message) {
        const token = "token" in message ? message.token : null;
        if (!token?.refreshToken) return;

        try {
          await fetch(`${kc.issuer}/protocol/openid-connect/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              ...clientCredentials(kc),
              refresh_token: token.refreshToken,
            }),
          });
        } catch (error) {
          console.error("Error al cerrar la sesión en Keycloak:", error);
        }
      },
    },
  };
});
