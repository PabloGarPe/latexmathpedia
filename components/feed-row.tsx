"use client";

import { useRef, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const ROW_CARD_WIDTH = "w-64 sm:w-72";

function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className={`h-72 shrink-0 ${ROW_CARD_WIDTH}`} />
      ))}
    </div>
  );
}

type FeedRowProps<T> = {
  title: string;
  icon: LucideIcon;
  query: UseQueryResult<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string | number;
  // La hilera personal se oculta si falla (en modo mock el back da 401 siempre); las
  // públicas muestran un fallo aislado con reintento.
  hideOnError?: boolean;
};

// Hilera tipo "Netflix": carrusel horizontal con scroll-snap, genérica sobre el tipo de
// recurso (PDFs, cuestionarios). Se oculta si llega vacía (p. ej. "Lo más visto" justo tras
// desplegar, cuando aún no hay vistas, o "Los más hechos" hasta el primer intento).
export function FeedRow<T>({
  title,
  icon: Icon,
  query,
  renderItem,
  getKey,
  hideOnError = false,
}: FeedRowProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data, isPending, isError, refetch, isRefetching } = query;

  if (isError && hideOnError) return null;
  if (!isPending && !isError && (data?.length ?? 0) === 0) return null;

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          {title}
        </h3>
        {data && data.length > 0 && (
          <div className="hidden gap-1 md:flex">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scrollByPage(-1)} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scrollByPage(1)} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <RowSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <span>No se pudo cargar esta sección.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
        >
          {data?.map((item, index) => (
            <div key={getKey(item, index)} className={`shrink-0 snap-start ${ROW_CARD_WIDTH}`}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default FeedRow;
