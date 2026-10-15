"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchUsers, USER_SEARCH_MIN_CHARS } from "@/lib/api/users";
import { queryKeys } from "@/lib/query/keys";

const DEBOUNCE_MS = 280;

// Buscador de usuarios para elegir autores. Espera a que se deje de teclear, no consulta con
// menos de 2 caracteres y cancela la petición anterior (queryFn recibe el `signal`), así una
// respuesta lenta nunca pisa a otra más reciente.
export function useUserSearch(term: string) {
  const query = term.trim();
  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const canSearch = query.length >= USER_SEARCH_MIN_CHARS;

  const result = useQuery({
    queryKey: queryKeys.users.search(debounced.toLowerCase()),
    queryFn: ({ signal }) => searchUsers(debounced, signal),
    enabled: debounced.length >= USER_SEARCH_MIN_CHARS,
    staleTime: 60_000,
    retry: false,
    // Mientras llegan los resultados nuevos se siguen viendo los anteriores (atenuados).
    placeholderData: keepPreviousData,
  });

  return {
    canSearch,
    // Hay texto nuevo que aún no se ha enviado.
    waiting: canSearch && debounced !== query,
    isFetching: canSearch && result.isFetching,
    isError: canSearch && debounced === query && result.isError,
    data: canSearch ? result.data : undefined,
  };
}
