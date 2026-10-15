"use client";

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";
import { BellRing } from "lucide-react";
import FeedRow from "@/components/feed-row";
import { useAuth } from "@/contexts/auth-context";
import { useMySubscriptions } from "@/hooks/api/use-subscriptions";

const TITLE = "Novedades de mis asignaturas";

// Primera hilera del feed ("Novedades de mis asignaturas"), común a PDFs y cuestionarios. Solo con
// sesión. Sin suscripciones -> aviso compacto con enlace al catálogo; con suscripciones pero sin
// novedades, o si falla (en modo mock el back da 401) -> se oculta; mientras carga, skeleton normal.
export function SubscribedFeedRow<T>({
  query,
  renderItem,
  getKey,
}: {
  query: UseQueryResult<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string | number;
}) {
  const { isAuthenticated } = useAuth();
  const subscriptions = useMySubscriptions();

  if (!isAuthenticated || subscriptions.isError) return null;

  if (subscriptions.isSuccess && subscriptions.data.length === 0) {
    return (
      <section
        aria-label={TITLE}
        className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        <BellRing className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Suscríbete a tus asignaturas para ver aquí sus novedades.{" "}
          <Link href="/dashboard/subjects" className="font-medium text-foreground underline-offset-4 hover:underline">
            Ver asignaturas
          </Link>
        </p>
      </section>
    );
  }

  return (
    <FeedRow title={TITLE} icon={BellRing} query={query} hideOnError getKey={getKey} renderItem={renderItem} />
  );
}

export default SubscribedFeedRow;
