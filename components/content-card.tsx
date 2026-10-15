import PDFCard from "@/components/pdf-card";
import BlogCard from "@/components/blog-card";
import { QuizCard } from "@/components/quiz-card";
import { CONTENT_TYPES } from "@/lib/content/registry";
import { formatPdfAuthors, type ContentItem } from "@/lib/content/types";
import { formatDate } from "@/lib/utils";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <div className="relative h-full">
      {item.kind === "pdf" && (
        <PDFCard
          title={item.data.title}
          href={CONTENT_TYPES.pdf.href(item)}
          date={formatDate(item.data.lastTimeEdited)}
          subjectName={item.data.subjectName}
          subjectUnitName={item.data.subjectUnitName}
          authors={formatPdfAuthors(item.data.author, item.data.coauthors)}
          viewCount={item.data.viewCount}
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
