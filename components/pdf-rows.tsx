"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Flame, History, Sparkles, type LucideIcon } from "lucide-react";
import ContentCard from "@/components/content-card";
import FeedRow from "@/components/feed-row";
import { useAuth } from "@/contexts/auth-context";
import { useMyTopPdfs, useRecentPdfs, useTopPdfs } from "@/hooks/api/use-pdfs";
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
