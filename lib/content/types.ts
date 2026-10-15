import type { AuthorDto } from "@/lib/api/profile";
import type { QuizDto } from "@/lib/api/quizzes";
import type { components } from "@/lib/api/schema";
import type { BlogPostMeta } from "@/lib/content/posts";

// Shape normalizado de un PDF para la UI. El contenido nunca viene en el DTO: se abre en el
// visor (/dashboard/pdfs/[id]), que lo pide autenticado. Vive aquí (no en dashboard-feed.tsx)
// para que registry.ts y content-card.tsx también puedan importarlo.
export type DisplayPdf = {
  id: number;
  title: string;
  lastTimeEdited: string;
  subjectId?: number;
  subjectUnitId?: number;
  subjectName?: string;
  subjectUnitName?: string;
  // Principal primero, luego coautores. Vacío en PDFs antiguos sin autores.
  authors: AuthorDto[];
  viewCount: number;
};

// Unión discriminada que homogeneiza los tres tipos de recurso que hoy mezcla el feed
// (ver UI-RESTRUCTURE.md §2). Añadir un cuarto tipo implica extender esta unión + el
// registro en registry.ts + un componente de tarjeta, sin tocar el feed en sí.
export type ContentItem =
  | { kind: "pdf"; data: DisplayPdf }
  | { kind: "quiz"; data: QuizDto }
  | { kind: "blog"; data: BlogPostMeta };

// Normaliza un PDFDto crudo (GET /public/pdf/no-link o GET /subject/{id}/pdfs) al shape que
// usa la UI.
export function toDisplayPdf(pdf: components["schemas"]["PDFDto"], fallbackId: number): DisplayPdf {
  return {
    id: pdf.id ?? fallbackId,
    title: pdf.name ?? "",
    lastTimeEdited: pdf.lastTimeEdited ?? "",
    subjectId: pdf.subject?.id,
    subjectUnitId: pdf.subjectUnit?.id,
    subjectName: pdf.subject?.name,
    subjectUnitName: pdf.subjectUnit?.name,
    authors: pdf.authors ?? [],
    viewCount: pdf.viewCount ?? 0,
  };
}

const listFormat = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

export const AUTHOR_WITHOUT_PROFILE = "Autor sin perfil";

// Nombre público de un autor; si aún no ha completado el perfil, un texto genérico (nunca el email).
export const authorLabel = (author: AuthorDto) => author.username?.trim() || AUTHOR_WITHOUT_PROFILE;

// "ada" · "ada, con alan y grace". PDFs antiguos sin autores -> cadena vacía (el llamador no
// pinta nada). Varios coautores sin perfil se agrupan ("2 autores sin perfil") para que el
// texto siga siendo legible.
export function formatPdfAuthors(authors: AuthorDto[] = []): string {
  const [main, ...rest] = authors;
  if (!main) return "";
  const named = rest.filter((a) => a.username?.trim()).map((a) => a.username!.trim());
  const anonymous = rest.length - named.length;
  const parts = anonymous === 0 ? named : [...named, anonymous === 1 ? "un autor sin perfil" : `${anonymous} autores sin perfil`];
  return parts.length > 0 ? `${authorLabel(main)}, con ${listFormat.format(parts)}` : authorLabel(main);
}
