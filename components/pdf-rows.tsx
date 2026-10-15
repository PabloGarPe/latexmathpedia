"use client";

import { useRef } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, History, Sparkles, type LucideIcon } from "lucide-react";
import ContentCard from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useMyTopPdfs, useRecentPdfs, useTopPdfs } from "@/hooks/api/use-pdfs";
import type { PDFDto } from "@/lib/api/pdfs";
import { toDisplayPdf } from "@/lib/content/types";

const CARD_WIDTH = "w-64 sm:w-72";

function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className={`h-72 shrink-0 ${CARD_WIDTH}`} />
      ))}
    </div>
  );
}

type PdfRowProps = {
  title: string;
  icon: LucideIcon;
  query: UseQueryResult<PDFDto[]>;
  // La hilera personal se oculta si falla (en modo mock el back da 401 siempre); las
  // públicas muestran un fallo aislado con reintento.
  hideOnError?: boolean;
};

// Hilera tipo "Netflix": carrusel horizontal con scroll-snap. Se oculta si llega vacía
// (p. ej. "Lo más visto" justo tras desplegar, cuando aún no hay vistas).
function PdfRow({ title, icon: Icon, query, hideOnError = false }: PdfRowProps) {
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
          {data?.map((pdf, index) => (
            <div key={pdf.id ?? index} className={`shrink-0 snap-start ${CARD_WIDTH}`}>
              <ContentCard item={{ kind: "pdf", data: toDisplayPdf(pdf, index) }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentRow() {
  return <PdfRow title="Novedades" icon={Sparkles} query={useRecentPdfs()} />;
}

function TopRow() {
  return <PdfRow title="Lo más visto" icon={Flame} query={useTopPdfs()} />;
}

function MyTopRow() {
  return <PdfRow title="Tus más vistos" icon={History} query={useMyTopPdfs()} hideOnError />;
}

// Orden fijo: Novedades, Lo más visto, Tus más vistos (solo con sesión). Cada hilera es su
// propia query, así que cargan y fallan de forma independiente.
export function PdfRows() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="space-y-8">
      <RecentRow />
      <TopRow />
      {isAuthenticated && <MyTopRow />}
    </div>
  );
}

export default PdfRows;
