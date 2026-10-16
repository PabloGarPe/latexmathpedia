import PDFCard from "@/components/pdf-card";
import BlogCard from "@/components/blog-card";
import { QuizCard } from "@/components/quiz-card";
import { CONTENT_TYPES } from "@/lib/content/registry";
import { formatPdfAuthors, type ContentItem } from "@/lib/content/types";
import { formatDate } from "@/lib/utils";

// `actions`: controles de gestión del admin (modo edición), superpuestos en la esquina
// superior izquierda de la tarjeta -- la derecha la usa la insignia de dificultad de los quizzes.
export function ContentCard({ item, actions }: { item: ContentItem; actions?: React.ReactNode }) {
  return (
    <div className="relative h-full">
      {actions && <div className="absolute left-3 top-3 z-10">{actions}</div>}
      {item.kind === "pdf" && (
        <PDFCard
          title={item.data.title}
          href={CONTENT_TYPES.pdf.href(item)}
          date={formatDate(item.data.lastTimeEdited)}
          subjectName={item.data.subjectName}
          subjectUnitName={item.data.subjectUnitName}
          authors={formatPdfAuthors(item.data.authors)}
          viewCount={item.data.viewCount}
          rating={item.data.rating}
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
