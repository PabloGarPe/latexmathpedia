"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FILTER_ALL = "__all__";

type Ref = { id?: number; name?: string } | null | undefined;

export type SortOption<T> = { key: string; label: string; compare: (a: T, b: T) => number };

type Options<T> = {
  items: T[];
  getSubject: (item: T) => Ref;
  getUnit: (item: T) => Ref;
  sortOptions: SortOption<T>[];
  // Filtro extra propio de cada tipo (p. ej. dificultad en cuestionarios). Debe ser estable
  // (useCallback) o se recalcula la lista en cada render.
  predicate?: (item: T) => boolean;
};

// Filtros y orden en cliente compartidos por los "Explorar todo" de PDFs y cuestionarios.
// Las opciones de asignatura/tema salen de los propios elementos, así que no hace falta otra
// llamada y nunca se ofrece una combinación sin resultados.
export function useCatalogFilters<T>({ items, getSubject, getUnit, sortOptions, predicate }: Options<T>) {
  const [subject, setSubjectState] = useState(FILTER_ALL);
  const [unit, setUnit] = useState(FILTER_ALL);
  const [sort, setSort] = useState(sortOptions[0].key);

  const subjects = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of items) {
      const s = getSubject(item);
      if (s?.id != null) byId.set(s.id, s.name ?? "");
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [items, getSubject]);

  const units = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of items) {
      const u = getUnit(item);
      if (u?.id == null) continue;
      if (subject !== FILTER_ALL && String(getSubject(item)?.id) !== subject) continue;
      byId.set(u.id, u.name ?? "");
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [items, subject, getSubject, getUnit]);

  const visible = useMemo(() => {
    const compare = (sortOptions.find((o) => o.key === sort) ?? sortOptions[0]).compare;
    return items
      .filter((item) => subject === FILTER_ALL || String(getSubject(item)?.id) === subject)
      .filter((item) => unit === FILTER_ALL || String(getUnit(item)?.id) === unit)
      .filter((item) => predicate?.(item) ?? true)
      .sort(compare);
  }, [items, subject, unit, sort, sortOptions, getSubject, getUnit, predicate]);

  function setSubject(value: string) {
    setSubjectState(value);
    setUnit(FILTER_ALL); // el tema elegido puede no pertenecer a la nueva asignatura
  }

  return { subject, setSubject, unit, setUnit, sort, setSort, subjects, units, visible, sortOptions };
}

type FilterBarState = {
  subject: string;
  setSubject: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  subjects: [number, string][];
  units: [number, string][];
  // La barra solo pinta las opciones; la función de comparación la usa el hook.
  sortOptions: { key: string; label: string }[];
};

// Barra de selectores: asignatura, tema, [extra del tipo], orden.
export function CatalogFilterBar({
  filters,
  children,
}: {
  filters: FilterBarState;
  children?: ReactNode;
}) {
  const { subject, setSubject, unit, setUnit, sort, setSort, subjects, units, sortOptions } = filters;
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por asignatura">
          <SelectValue placeholder="Asignatura" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>Todas las asignaturas</SelectItem>
          {subjects.map(([id, name]) => (
            <SelectItem key={id} value={String(id)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={unit} onValueChange={setUnit} disabled={units.length === 0}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por tema">
          <SelectValue placeholder="Tema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>Todos los temas</SelectItem>
          {units.map(([id, name]) => (
            <SelectItem key={id} value={String(id)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Ordenar por">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
