"use client"

import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AiStatusNotice } from "@/components/admin/comment-moderation/ai-status"
import { CommentQueue } from "@/components/admin/comment-moderation/comment-queue"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminCommentQueue, useModerationStatus } from "@/hooks/api/use-comments"
import { useAdminRoute } from "@/hooks/use-protected-route"
import type { AdminQueueStatus } from "@/lib/api/comments"
import { formatCompactCount } from "@/lib/utils"

const REVIEW_STATUSES: AdminQueueStatus[] = ["REVIEW", "HIDDEN"]
const PENDING_STATUSES: AdminQueueStatus[] = ["PENDING"]
const REJECTED_STATUSES: AdminQueueStatus[] = ["REJECTED"]

type TabKey = "review" | "pending" | "rejected"
const DEFAULT_TAB: TabKey = "review"
const isTabKey = (value: string | null): value is TabKey =>
  value === "review" || value === "pending" || value === "rejected"

function Count({ value }: { value?: number }) {
  if (!value) return null
  return (
    <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums">{formatCompactCount(value)}</span>
  )
}

// `useSearchParams` en una página prerenderizada exige un límite de Suspense (si no, falla el build).
export default function AdminCommentsPage() {
  return (
    <Suspense fallback={<PageContainer />}>
      <AdminComments />
    </Suspense>
  )
}

function AdminComments() {
  const { isAuthenticated, isAdmin, loading } = useAdminRoute()
  const enabled = isAuthenticated && isAdmin
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const tab: TabKey = isTabKey(tabParam) ? tabParam : DEFAULT_TAB

  const { data: status } = useModerationStatus(enabled)
  // Misma clave que la pestaña "Para revisar": se comparte caché, no hay petición extra. Se usa su
  // total y no `reviewCount`, que no incluye los ocultos por denuncias.
  const review = useAdminCommentQueue(REVIEW_STATUSES, enabled)
  const reviewTotal = review.data?.pages[0]?.total

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === DEFAULT_TAB) params.delete("tab")
    else params.set("tab", next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!enabled) {
    return null // El hook maneja la redirección
  }

  return (
    <PageContainer>
      <PageHeader
        title="Comentarios"
        description="Revisa los comentarios marcados por la IA o denunciados, y los que esperan con la moderación automática caída."
      />

      <AiStatusNotice status={status} />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="review" className="cursor-pointer">
            Para revisar
            <Count value={reviewTotal} />
          </TabsTrigger>
          <TabsTrigger value="pending" className="cursor-pointer">
            Pendientes de IA
            <Count value={status?.pendingCount} />
          </TabsTrigger>
          <TabsTrigger value="rejected" className="cursor-pointer">
            Rechazados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          <CommentQueue
            statuses={REVIEW_STATUSES}
            emptyTitle="No hay comentarios pendientes de revisión 🎉"
            emptyDescription="Aquí aparecerán los comentarios dudosos para la IA y los ocultos por denuncias."
          />
        </TabsContent>
        <TabsContent value="pending">
          <CommentQueue
            statuses={PENDING_STATUSES}
            emptyTitle="Ningún comentario espera a la IA"
            emptyDescription="Si la moderación automática se cae, los comentarios nuevos esperarán aquí."
          />
        </TabsContent>
        <TabsContent value="rejected">
          <CommentQueue
            statuses={REJECTED_STATUSES}
            emptyTitle="No hay comentarios rechazados"
            emptyDescription="Si algún rechazo fue un falso positivo, puedes aprobarlo desde aquí."
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
