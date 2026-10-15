import { useEffect, useState } from "react";

// Devuelve `value` con retraso: solo cambia cuando deja de cambiar durante `delay` ms.
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
