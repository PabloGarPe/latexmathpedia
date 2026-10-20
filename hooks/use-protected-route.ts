import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isInternalPath } from '@/lib/utils';

/**
 * Hook para proteger rutas que requieren autenticación
 * Redirige automáticamente al login si el usuario no está autenticado
 */
export const useProtectedRoute = (redirectTo: string = '/auth/login') => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Esperar a que termine de cargar la verificación de autenticación
    if (!loading) {
      if (!isAuthenticated) {
        // Guardar la URL actual para redirigir después del login
        const currentPath = window.location.pathname;
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
        router.push(redirectUrl);
      }
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  return { isAuthenticated, loading };
};

/**
 * Hook para proteger rutas de administración
 * Requiere tanto autenticación como permisos de admin
 */
export const useAdminRoute = (redirectTo: string = '/auth/login') => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Esperar a que termine de cargar la verificación de autenticación
    if (!loading) {
      if (!isAuthenticated) {
        // Guardar la URL actual para redirigir después del login
        const currentPath = window.location.pathname;
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
        router.push(redirectUrl);
      } else if (!isAdmin) {
        // Si está autenticado pero no es admin, redirigir al dashboard
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin, loading, router, redirectTo]);

  return { isAuthenticated, isAdmin, loading };
};

/**
 * Hook para rutas de autenticación (login, register)
 * Redirige al dashboard si el usuario ya está autenticado
 */
export const useAuthRoute = (redirectTo: string = '/dashboard') => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Verificar si hay una URL de redirección en los parámetros
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');
      
      // Solo se respeta ?redirect= si es una ruta interna (evita la redirección abierta)
      if (isInternalPath(redirectPath)) {
        router.push(redirectPath);
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  return { isAuthenticated, loading };
};