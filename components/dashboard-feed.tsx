"use client";

import { useEffect, useMemo, useState } from "react";
import ContentCard from "@/components/content-card";
import { PageContainer } from "@/components/page-shell";
import PdfExplorer from "@/components/pdf-explorer";
import PdfRows from "@/components/pdf-rows";
import QuizExplorer from "@/components/quiz-explorer";
import QuizRows from "@/components/quiz-rows";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearch } from "@/contexts/search-context"; // Importar el contexto de búsqueda
import { useToast } from "@/hooks/use-toast";
import { PDF_ROW_LIMIT, usePdfs, useRecentPdfs, useTopPdfs, useTopRatedPdfs } from "@/hooks/api/use-pdfs";
import {
  QUIZ_ROW_LIMIT,
  usePublicQuizzes,
  useRecentQuizzes,
  useTopQuizzes,
} from "@/hooks/api/use-quizzes";
import type { BlogPostMeta } from "@/lib/content/posts";
import { toDisplayPdf, type ContentItem, type DisplayPdf } from "@/lib/content/types";
import type { QuizDto } from "@/lib/api/quizzes";

// Función para normalizar texto (eliminar tildes y acentos)
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type TabKey = "pdf" | "quiz" | "blog";

const TAB_LABEL: Record<TabKey, string> = {
  pdf: "PDFs",
  quiz: "Cuestionarios",
  blog: "Blog",
};

function ContentGrid({
  items,
  isLoading,
  emptyMessage,
}: {
  items: ContentItem[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse bg-muted rounded-lg h-40"></div>
            ))
          : items.map((item) => (
              <ContentCard
                key={`${item.kind}-${item.kind === "blog" ? item.data.slug : item.data.id}`}
                item={item}
              />
            ))}
      </div>
      {!isLoading && items.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </>
  );
}

export function DashboardFeed({ posts }: { posts: BlogPostMeta[] }) {
  const toast = useToast();
  const { searchQuery } = useSearch();
  const [activeTab, setActiveTab] = useState<TabKey>("pdf");

  const normalizedSearch = normalizeText(searchQuery.trim());
  const isSearching = normalizedSearch !== "";

  // Prioridad de carga, por pestaña: primero las hileras de arriba (Novedades / Lo más visto /
  // Mejor valorados / Los más hechos, ligeras y lo primero que ve el usuario); el catálogo completo, que
  // alimenta "Explorar todo", espera a que esas resuelvan para no competir por las
  // conexiones. Mismas claves que usan <PdfRows>/<QuizRows>, así que no se duplican
  // peticiones. Solo se pide lo de la pestaña activa. Si el usuario busca, el catálogo hace
  // falta ya y no se espera.
  const pdfTab = activeTab === "pdf";
  const quizTab = activeTab === "quiz";

  const recentPdfs = useRecentPdfs(PDF_ROW_LIMIT, pdfTab);
  const topPdfs = useTopPdfs(PDF_ROW_LIMIT, pdfTab);
  const topRatedPdfs = useTopRatedPdfs(PDF_ROW_LIMIT, pdfTab);
  const pdfRowsSettled = !recentPdfs.isPending && !topPdfs.isPending && !topRatedPdfs.isPending;

  const recentQuizzes = useRecentQuizzes(QUIZ_ROW_LIMIT, quizTab);
  const topQuizzes = useTopQuizzes(QUIZ_ROW_LIMIT, quizTab);
  const quizRowsSettled = !recentQuizzes.isPending && !topQuizzes.isPending;

  // El catálogo de PDFs es público y solo trae metadatos; el contenido lo pide el visor con
  // sesión. isPending (no isLoading): mientras la query está diferida isLoading es false y la
  // rejilla enseñaría "sin resultados" en vez del esqueleto.
  const pdfsQuery = usePdfs(pdfTab && (pdfRowsSettled || isSearching));
  const pdfsLoading = pdfsQuery.isPending;

  // Mismo endpoint público que usa el catálogo de /dashboard/quizzes, sin depender de auth.
  const quizzesQuery = usePublicQuizzes(quizTab && (quizRowsSettled || isSearching));
  const quizzesLoading = quizzesQuery.isPending;

  useEffect(() => {
    if (pdfsQuery.error) {
      toast.error("Error al cargar los PDFs.");
    }
    if (quizzesQuery.error) {
      toast.error("Error al cargar los cuestionarios.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfsQuery.error, quizzesQuery.error]);

  const allPdfs: DisplayPdf[] = useMemo(
    () => (pdfsQuery.data ?? []).map((pdf, index) => toDisplayPdf(pdf, index)),
    [pdfsQuery.data],
  );

  const allQuizzes: QuizDto[] = useMemo(() => quizzesQuery.data ?? [], [quizzesQuery.data]);

  // El filtro por asignatura/tema del feed general se retiró: la sidebar (nav-subjects.tsx)
  // ahora navega directamente a la ficha de asignatura (/dashboard/subjects/[id]), que ya
  // agrupa PDFs y cuestionarios por tema — no hace falta mantener dos formas de ver lo
  // mismo. Aquí solo queda la búsqueda como filtro (de la pestaña activa); los cuestionarios
  // añaden además sus filtros propios dentro de <QuizExplorer>.
  const pdfsToShow = useMemo(() => {
    if (!isSearching) return allPdfs;
    return allPdfs.filter((pdf) =>
      [pdf.title, ...pdf.authors.map((author) => author.username ?? "")].some((text) =>
        normalizeText(text).includes(normalizedSearch),
      ),
    );
  }, [allPdfs, isSearching, normalizedSearch]);

  const quizzesToShow = useMemo(() => {
    if (!isSearching) return allQuizzes;
    return allQuizzes.filter((quiz) => normalizeText(quiz.name ?? "").includes(normalizedSearch));
  }, [allQuizzes, isSearching, normalizedSearch]);

  const blogTabToShow = useMemo(() => {
    if (!isSearching) return posts;
    return posts.filter((post) => normalizeText(post.title).includes(normalizedSearch));
  }, [posts, isSearching, normalizedSearch]);

  const blogItems: ContentItem[] = useMemo(
    () => blogTabToShow.map((data) => ({ kind: "blog" as const, data })),
    [blogTabToShow],
  );

  const countByTab: Record<TabKey, number> = {
    pdf: pdfsToShow.length,
    quiz: quizzesToShow.length,
    blog: blogItems.length,
  };

  const pageTitle = isSearching
    ? `Resultados para: "${searchQuery}" (${countByTab[activeTab]} encontrados)`
    : TAB_LABEL[activeTab];

  return (
    <PageContainer>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h2 className="text-2xl font-bold">{pageTitle}</h2>
          <TabsList>
            <TabsTrigger value="pdf">PDFs</TabsTrigger>
            <TabsTrigger value="quiz">Cuestionarios</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pdf">
          <div className="mt-4 space-y-8">
            {/* Hileras solo sin búsqueda; al buscar se muestran los resultados planos. */}
            {!isSearching && <PdfRows />}
            <PdfExplorer
              pdfs={pdfsToShow}
              isLoading={pdfsLoading}
              emptyMessage="No se encontraron apuntes para esta categoría"
            />
          </div>
        </TabsContent>
        <TabsContent value="quiz">
          <div className="mt-4 space-y-8">
            {!isSearching && <QuizRows />}
            <QuizExplorer
              quizzes={quizzesToShow}
              isLoading={quizzesLoading}
              emptyMessage="No se encontraron cuestionarios para esta categoría"
            />
          </div>
        </TabsContent>
        <TabsContent value="blog">
          <ContentGrid
            items={blogItems}
            isLoading={false}
            emptyMessage="No se encontraron artículos"
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

export default DashboardFeed;
