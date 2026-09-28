"use client"

// AUTH: soporta dos modos, elegidos por NEXT_PUBLIC_AUTH_MODE (ver lib/env.ts y
// .env.example). Ambos exponen exactamente la misma interfaz pública (`useAuth()`), así
// que ningún componente necesita saber en qué modo está la app.
//
// - "mock" (por defecto): sin backend/Keycloak. Tres identidades locales fijas
//   (admin/usuario/anónimo) alternables desde `nav-user.tsx`, persistidas en localStorage.
//   Como no hay JWT real, las llamadas a endpoints protegidos del backend devolverán 401
//   real aunque `isAuthenticated`/`isAdmin` sean `true` aquí — es un límite conocido y
//   aceptado mientras no haya Keycloak.
// - "keycloak": auth real vía Auth.js + Keycloak (ver auth.ts). El access token se
//   sincroniza automáticamente con `lib/api/client.ts` para
//   que todas las llamadas hechas con `apiClient` (TanStack Query) lleven el Bearer.

import { createContext, useContext, useCallback, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { AUTH_MODE } from '@/lib/env';
import { setApiAccessToken } from '@/lib/api/client';

type LoginOptions = {
  // URL a la que volver tras autenticarse
  redirectTo?: string;
  // Alias del Identity Provider configurado en Keycloak (p. ej. 'google'); ignorado en mock
  idpHint?: string;
};

export type MockIdentity = "admin" | "user" | "anonymous";

type AuthContextValue = {
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  email: string;
  displayName: string;
  accessToken?: string;
  login: (options?: LoginOptions) => Promise<void>;
  register: (options?: Pick<LoginOptions, 'redirectTo'>) => Promise<void>;
  changePassword: (options?: Pick<LoginOptions, 'redirectTo'>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  // Solo tienen sentido en modo mock; en modo keycloak quedan undefined.
  identity?: MockIdentity;
  setIdentity?: (identity: MockIdentity) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Modo mock (T-13)
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: Record<Exclude<MockIdentity, "anonymous">, { email: string; displayName: string }> = {
  admin: { email: "admin@local.test", displayName: "Admin (local)" },
  user: { email: "user@local.test", displayName: "Usuario (local)" },
};

const MOCK_IDENTITY_STORAGE_KEY = "mathtexpedia-mock-identity";

function isMockIdentity(value: unknown): value is MockIdentity {
  return value === "admin" || value === "user" || value === "anonymous";
}

function MockAuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [identity, setIdentityState] = useState<MockIdentity>('anonymous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MOCK_IDENTITY_STORAGE_KEY);
      if (isMockIdentity(stored)) {
        setIdentityState(stored);
      }
    } catch (error) {
      console.error('No se pudo leer la identidad mockeada de localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setIdentity = useCallback((next: MockIdentity) => {
    setIdentityState(next);
    try {
      localStorage.setItem(MOCK_IDENTITY_STORAGE_KEY, next);
    } catch (error) {
      console.error('No se pudo persistir la identidad mockeada en localStorage:', error);
    }
  }, []);

  const isAuthenticated = identity !== 'anonymous';
  const isAdmin = identity === 'admin';
  const email = identity === 'anonymous' ? '' : MOCK_ACCOUNTS[identity].email;
  const displayName = identity === 'anonymous' ? '' : MOCK_ACCOUNTS[identity].displayName;

  // No hay backend/Keycloak real detrás: entrar/registrarse simplemente adopta la
  // identidad de prueba "usuario" (usa el selector "Modo de prueba" del menú de usuario
  // para pasar a admin) y navega como lo haría un login real.
  const login = useCallback(
    async ({ redirectTo = '/dashboard' }: LoginOptions = {}) => {
      setIdentity('user');
      router.push(redirectTo);
    },
    [setIdentity, router]
  );

  const register = useCallback(
    async ({ redirectTo = '/dashboard' }: Pick<LoginOptions, 'redirectTo'> = {}) => {
      setIdentity('user');
      router.push(redirectTo);
    },
    [setIdentity, router]
  );

  const changePassword = useCallback(async () => {
    // No-op: en mock no hay contraseña real que cambiar.
  }, []);

  const logout = useCallback(async () => {
    setIdentity('anonymous');
    router.push('/dashboard');
  }, [setIdentity, router]);

  const checkAuth = useCallback(async () => {
    // No-op: el mock no tiene sesión de servidor que revalidar.
  }, []);

  const authFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      loading,
      isAdmin,
      email,
      displayName,
      identity,
      setIdentity,
      login,
      register,
      changePassword,
      logout,
      checkAuth,
      authFetch,
    }),
    [
      isAuthenticated,
      loading,
      isAdmin,
      email,
      displayName,
      identity,
      setIdentity,
      login,
      register,
      changePassword,
      logout,
      checkAuth,
      authFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Modo keycloak (T-10/T-11/T-12)
// ---------------------------------------------------------------------------

function KeycloakAuthState({ children }: PropsWithChildren) {
  const { data: session, status, update } = useSession();

  // Si Keycloak rechazó el refresh token la sesión ya no es válida
  const isAuthenticated = status === 'authenticated' && !session?.error;
  const accessToken = isAuthenticated ? session?.accessToken : undefined;

  // Sincroniza el cliente API (TanStack Query) con el access token vigente aquí, en el
  // cuerpo del render, en vez de en un useEffect: los efectos de un hijo (p. ej. la query de
  // TanStack Query que dispara un fetch nada más montar) pueden ejecutarse antes que el
  // efecto de este componente padre dentro del mismo commit, dejando una ventana en la que
  // esa petición sale sin Authorization. El render, en cambio, siempre ocurre de padres a
  // hijos, así que esto llega antes que cualquier efecto (propio o de los hijos).
  setApiAccessToken(accessToken);

  const login = useCallback(
    async ({ redirectTo = '/dashboard', idpHint }: LoginOptions = {}) => {
      await signIn('keycloak', { redirectTo }, idpHint ? { kc_idp_hint: idpHint } : undefined);
    },
    []
  );

  // Provider que abre directamente el formulario de registro de Keycloak (ver auth.ts)
  const register = useCallback(
    async ({ redirectTo = '/dashboard' }: Pick<LoginOptions, 'redirectTo'> = {}) => {
      await signIn('keycloak-register', { redirectTo });
    },
    []
  );

  // Application Initiated Action: Keycloak muestra el formulario de cambio de
  // contraseña y vuelve a la app al terminar
  const changePassword = useCallback(
    async ({ redirectTo = '/dashboard/profile' }: Pick<LoginOptions, 'redirectTo'> = {}) => {
      await signIn('keycloak', { redirectTo }, { kc_action: 'UPDATE_PASSWORD' });
    },
    []
  );

  const logout = useCallback(async () => {
    setApiAccessToken(undefined);
    await signOut({ redirect: false });
  }, []);

  const checkAuth = useCallback(async () => {
    await update();
  }, [update]);

  // fetch que envía el JWT de Keycloak como 'Authorization: Bearer' al backend. Se
  // mantiene para los componentes que aún no se han migrado a `lib/api/*` (TanStack
  // Query ya usa `lib/api/client.ts`, que se sincroniza solo vía el efecto de arriba).
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const withToken = (token?: string) => {
        const headers = new Headers(init.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers });
      };

      const response = await withToken(accessToken);
      if (response.status !== 401 || !accessToken) {
        return response;
      }

      // El token del cliente puede haber caducado: pedir la sesión otra vez hace
      // que el servidor lo renueve con el refresh token, y se reintenta una vez
      const refreshed = await update();
      if (!refreshed?.accessToken || refreshed.error || refreshed.accessToken === accessToken) {
        return response;
      }
      return withToken(refreshed.accessToken);
    },
    [accessToken, update]
  );

  const isAdmin = isAuthenticated && (session?.isAdmin ?? false);
  const email = isAuthenticated ? session?.user?.email ?? '' : '';
  const displayName = isAuthenticated ? session?.user?.name ?? '' : '';
  const loading = status === 'loading';

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      loading,
      isAdmin,
      email,
      displayName,
      accessToken,
      login,
      register,
      changePassword,
      logout,
      checkAuth,
      authFetch,
    }),
    [
      isAuthenticated,
      loading,
      isAdmin,
      email,
      displayName,
      accessToken,
      login,
      register,
      changePassword,
      logout,
      checkAuth,
      authFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function KeycloakAuthProvider({ children }: PropsWithChildren) {
  return (
    // Refrescar la sesión periódicamente para que el access token no caduque en el cliente
    <SessionProvider refetchInterval={4 * 60} refetchOnWindowFocus>
      <KeycloakAuthState>{children}</KeycloakAuthState>
    </SessionProvider>
  );
}

// ---------------------------------------------------------------------------
// Selector de modo
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: PropsWithChildren) =>
  AUTH_MODE === 'keycloak' ? (
    <KeycloakAuthProvider>{children}</KeycloakAuthProvider>
  ) : (
    <MockAuthProvider>{children}</MockAuthProvider>
  );

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
