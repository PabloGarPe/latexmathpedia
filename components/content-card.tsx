import PDFCard from "@/components/pdf-card";
import BlogCard from "@/components/blog-card";
import { QuizCard } from "@/components/quiz-card";
import { CONTENT_TYPES } from "@/lib/content/registry";
import { formatPdfAuthors, type ContentItem } from "@/lib/content/types";
import { formatDate } from "@/lib/utils";

// Insignia de tipo (icono + texto corto) compartida por los 3 tipos de tarjeta, para que
// el grid "Todo" se pueda escanear aunque mezcle PDFs/Cuestionarios/Blog. Se superpone en
// la esquina superior en vez de tocar el layout interno de cada tarjeta (ver
// UI-RESTRUCTURE.md §2/§5.2: el registro centraliza esto para no repetirlo por tipo).
function TypeBadge({ kind }: { kind: ContentItem["kind"] }) {
  const meta = CONTENT_TYPES[kind];
  const Icon = meta.icon;
  return (
    <div
      className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm ${meta.accentClass}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </div>
  );
}

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <div className="relative h-full">
      <TypeBadge kind={item.kind} />
      {item.kind === "pdf" && (
        <PDFCard
          title={item.data.title}
          href={CONTENT_TYPES.pdf.href(item)}
          date={formatDate(item.data.lastTimeEdited)}
          subjectName={item.data.subjectName}
          subjectUnitName={item.data.subjectUnitName}
          authors={formatPdfAuthors(item.data.author, item.data.coauthors)}
        />
      )}
      {item.kind === "quiz" && <QuizCard quiz={item.data} />}
      {item.kind === "blog" && (
        <BlogCard
          title={item.data.title}
          description={item.data.description}
          date={item.data.date}
          estimatedReadTime={item.data.estimatedReadTime}
          tags={item.data.tags}
          link={item.data.slug}
        />
      )}
    </div>
  );
}

export default ContentCard;
