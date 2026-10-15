"use client";

import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ApiError } from "@/lib/api/errors";

// Un 401/403/404 no se arregla reintentando (sesión caducada, sin permiso, borrado u oculto):
// se muestra el estado de error al momento en vez de tras los reintentos por defecto.
const NO_RETRY_STATUSES = [401, 403, 404];
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && NO_RETRY_STATUSES.includes(error.status)) return false;
  return failureCount < 3;
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: shouldRetry,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
