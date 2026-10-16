"use client";

import { CatalogFilterBar, useCatalogFilters, type SortOption } from "@/components/catalog-filters";
import ContentCard from "@/components/content-card";
import type { DisplayPdf } from "@/lib/content/types";
import { compareByRating } from "@/lib/pdf-rating";

const SORT_OPTIONS: SortOption<DisplayPdf>[] = [
  {
    key: "recent",
    label: "Más recientes",
    compare: (a, b) =>
      new Date(b.lastTimeEdited || 0).getTime() - new Date(a.lastTimeEdited || 0).getTime(),
  },
  { key: "popular", label: "Más vistos", compare: (a, b) => b.viewCount - a.viewCount },
  {
    key: "rating",
    label: "Mejor valorados",
    compare: (a, b) => compareByRating(a.rating, b.rating) || b.viewCount - a.viewCount,
  },
  {
    key: "name",
    label: "Nombre (A-Z)",
    compare: (a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
  },
];

// Los PDFs no tienen dificultad, así que solo hay asignatura, tema y orden.
const getSubject = (pdf: DisplayPdf) => ({ id: pdf.subjectId, name: pdf.subjectName });
const getUnit = (pdf: DisplayPdf) => ({ id: pdf.subjectUnitId, name: pdf.subjectUnitName });

type Props = {
  pdfs: DisplayPdf[];
  isLoading: boolean;
  emptyMessage: string;
};

// "Explorar todo" de PDFs: catálogo completo (GET /public/pdf/no-link) con filtros y orden en
// cliente, mismo comportamiento que <QuizExplorer>.
export function PdfExplorer({ pdfs, isLoading, emptyMessage }: Props) {
  const filters = useCatalogFilters({ items: pdfs, getSubject, getUnit, sortOptions: SORT_OPTIONS });

  return (
    <section aria-label="Explorar todo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Explorar todo</h3>
        <CatalogFilterBar filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse bg-muted rounded-lg h-40"></div>
            ))
          : filters.visible.map((pdf) => (
              <ContentCard key={pdf.id} item={{ kind: "pdf", data: pdf }} />
            ))}
      </div>
      {!isLoading && filters.visible.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export default PdfExplorer;
