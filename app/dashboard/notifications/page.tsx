"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCheck, Loader2, Settings } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { NotificationItem } from "@/components/notifications/notification-item"
import {
  NotificationsEmpty,
  NotificationsError,
  NotificationsSkeleton,
} from "@/components/notifications/notification-states"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInfiniteNotifications, useMarkAllRead, useUnreadCount } from "@/hooks/api/use-notifications"
import { useProtectedRoute } from "@/hooks/use-protected-route"

export default function NotificationsPage() {
  const { isAuthenticated, loading: authLoading } = useProtectedRoute()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const unreadOnly = filter === "unread"

  const { data: unreadCount = 0 } = useUnreadCount(isAuthenticated)
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteNotifications(unreadOnly, isAuthenticated)
  const markAllRead = useMarkAllRead()
  const items = data?.pages.flatMap((page) => page.content ?? []) ?? []

  // Scroll infinito: al acercarse el final de la lista se pide la página siguiente. El botón
  // "Cargar más" sigue ahí para teclado y por si el observador no dispara.
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: "200px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="Notificaciones"
        description={unreadCount > 0 ? `Tienes ${unreadCount} sin leer.` : "Estás al día."}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como leídas
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/profile/notifications">
                <Settings className="h-4 w-4" />
                Preferencias
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">No leídas{unreadCount > 0 ? ` (${unreadCount})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-xl border bg-card p-1">
        {isLoading ? (
          <NotificationsSkeleton rows={6} />
        ) : isError ? (
          <NotificationsError onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <NotificationsEmpty unreadOnly={unreadOnly} />
        ) : (
          <>
            {items.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
            {hasNextPage && (
              <div ref={sentinel} className="flex justify-center p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  )
}
