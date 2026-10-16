"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Flame, History, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";
import ContentCard from "@/components/content-card";
import FeedRow from "@/components/feed-row";
import { SubscribedFeedRow } from "@/components/subscriptions/subscribed-feed-row";
import { useAuth } from "@/contexts/auth-context";
import { useMyTopPdfs, useRecentPdfs, useRecentSubscribedPdfs, useTopPdfs, useTopRatedPdfs } from "@/hooks/api/use-pdfs";
import type { PDFDto } from "@/lib/api/pdfs";
import { toDisplayPdf } from "@/lib/content/types";

type PdfRowProps = {
  title: string;
  icon: LucideIcon;
  query: UseQueryResult<PDFDto[]>;
  hideOnError?: boolean;
};

function PdfRow({ title, icon, query, hideOnError }: PdfRowProps) {
  return (
    <FeedRow
      title={title}
      icon={icon}
      query={query}
      hideOnError={hideOnError}
      getKey={(pdf, index) => pdf.id ?? index}
      renderItem={(pdf, index) => <ContentCard item={{ kind: "pdf", data: toDisplayPdf(pdf, index) }} />}
    />
  );
}

function SubscribedRow() {
  return (
    <SubscribedFeedRow
      query={useRecentSubscribedPdfs()}
      getKey={(pdf, index) => pdf.id ?? index}
      renderItem={(pdf, index) => <ContentCard item={{ kind: "pdf", data: toDisplayPdf(pdf, index) }} />}
    />
  );
}

function RecentRow() {
  return <PdfRow title="Novedades" icon={Sparkles} query={useRecentPdfs()} />;
}

function TopRow() {
  return <PdfRow title="Lo más visto" icon={Flame} query={useTopPdfs()} />;
}

function TopRatedRow() {
  return <PdfRow title="Mejor valorados" icon={ThumbsUp} query={useTopRatedPdfs()} />;
}

function MyTopRow() {
  return <PdfRow title="Tus más vistos" icon={History} query={useMyTopPdfs()} hideOnError />;
}

// Orden fijo: Novedades de mis asignaturas (solo con sesión), Novedades, Lo más visto, Mejor
// valorados (vacía hasta que algún PDF llega al umbral de votos, y entonces FeedRow la oculta),
// Tus más vistos (solo con sesión). Cada hilera es su propia query, así que cargan y fallan de
// forma independiente.
export function PdfRows() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="space-y-8">
      {isAuthenticated && <SubscribedRow />}
      <RecentRow />
      <TopRow />
      <TopRatedRow />
      {isAuthenticated && <MyTopRow />}
    </div>
  );
}

export default PdfRows;
