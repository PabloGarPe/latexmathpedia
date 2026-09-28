// Variables de entorno de Keycloak. Solo se usan en el servidor (auth.ts): el
// client secret nunca debe llegar al navegador, no importar desde componentes cliente.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `${name} no está definida. Configúrala en el .env (ver .env.example).`
    );
  }
  return value;
}

export type KeycloakConfig = {
  url: string;
  realm: string;
  issuer: string;
  clientId: string;
  // Vacío si el cliente de Keycloak es público (publicClient: true)
  clientSecret?: string;
  adminRole: string;
};

// Se evalúa bajo demanda (en cada petición de auth) para que `next build`
// no falle en entornos donde aún no hay variables configuradas.
export function getKeycloakConfig(): KeycloakConfig {
  const url = required("KEYCLOAK_URL").replace(/\/+$/, "");
  const realm = required("KEYCLOAK_REALM");

  return {
    url,
    realm,
    issuer: `${url}/realms/${realm}`,
    clientId: required("KEYCLOAK_CLIENT_ID"),
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || undefined,
    adminRole: process.env.KEYCLOAK_ADMIN_ROLE || "ADMIN",
  };
}
