"use client"

import * as React from "react"
import {
  BookOpen,
  ClipboardList,
  Command,
  GraduationCap,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MessageSquare,
  Newspaper,
  Send,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSubjects } from "@/components/nav-subjects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useModerationStatus } from "@/hooks/api/use-comments"
import { formatCompactCount } from "@/lib/utils"
import { useSearch } from "@/contexts/search-context"
import Link from "next/link"
import logo from '@/public/icon.png'

const dataSubjectsCatalog = {
  subjectsCatalog: [
    {
      title: "Asignaturas",
      url: "/dashboard/subjects",
      icon: BookOpen,
      isActive: false,
    },
    {
      title: "Grados",
      url: "/dashboard/degrees",
      icon: GraduationCap,
      isActive: false,
    },
  ],
}

const dataQuizzes = {
  quizzes: [
    {
      title: "Cuestionarios",
      url: "/dashboard/quizzes",
      icon: ListChecks,
      isActive: false,
    },
  ],
}

const dataBlog = {
  blog: [
    {
      title: "Blog",
      url: "/dashboard/blog",
      icon: Newspaper,
      isActive: false,
    },
  ],
}

const data = {
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

const dataAdminPanel = {
  adminPanel: [
    {
      title: "Grados",
      url: "/dashboard/admin/degrees",
      icon: GraduationCap,
      isActive: false,
    },
    {
      title: "PDFs",
      url: "/dashboard/admin/pdfs",
      icon: Command,
      isActive: false,
    },
    {
      title: "Cuestionarios",
      url: "/dashboard/admin/quizzes",
      icon: ClipboardList,
      isActive: false,
    },
    {
      title: "Comentarios",
      url: "/dashboard/admin/comments",
      icon: MessageSquare,
      isActive: false,
    },
    {
      title: "Avisos",
      url: "/dashboard/admin/announcements",
      icon: Megaphone,
      isActive: false,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin, email, displayName, isAuthenticated } = useAuth();
  const { setSearchQuery } = useSearch();
  const showAdmin = isAuthenticated && isAdmin;
  const { data: moderation } = useModerationStatus(showAdmin);

  // Comentarios por revisar y, si la IA no responde, un punto ámbar (los nuevos esperan a un admin).
  const reviewCount = moderation?.reviewCount ?? 0;
  const aiDown = moderation?.aiAvailable === false;
  const commentsBadge =
    reviewCount > 0 || aiDown ? (
      <span className="flex items-center gap-1">
        {aiDown && (
          <>
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="sr-only">Moderación automática caída. </span>
          </>
        )}
        {reviewCount > 0 && (
          <>
            {formatCompactCount(reviewCount)}
            <span className="sr-only"> por revisar</span>
          </>
        )}
      </span>
    ) : null;
  const adminItems = dataAdminPanel.adminPanel.map((item) =>
    item.url === "/dashboard/admin/comments" ? { ...item, badge: commentsBadge } : item,
  );

  const dataUser = {
    name: displayName || (email ? email.split('@')[0] : 'Usuario'),
    email: email || ''
  }

  const handleLogoClick = () => {
    // Limpiar la búsqueda al volver al inicio
    setSearchQuery("");
  }



  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>

            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="flex items-center space-x-2" onClick={handleLogoClick}>
                <img src={logo.src} alt="Logo" className="h-10 w-12 rounded-lg" />
                <div className="flex flex-col text-left">
                  <span className="truncate font-medium text-lg">MathTexpedia</span>
                  <span className="truncate text-sm text-gray-500">Apuntes bien guarrones</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={dataSubjectsCatalog.subjectsCatalog} title="Catálogo" />
        <NavSubjects />
        <NavMain items={dataQuizzes.quizzes} title="Cuestionarios" />
        <NavMain items={dataBlog.blog} title="Blog" />
        {/* Solo mostrar admin panel si está autenticado y es admin */}
        {showAdmin && <NavMain items={adminItems} title="Admin Panel" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={dataUser} />
      </SidebarFooter>
    </Sidebar>
  )
}