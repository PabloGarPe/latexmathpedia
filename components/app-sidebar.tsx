"use client"

import * as React from "react"
import {
  BookOpen,
  ClipboardList,
  Command,
  LifeBuoy,
  ListChecks,
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
      title: "PDFs",
      url: "/dashboard/admin/pdfs",
      icon: Command,
      isActive: false,
    },
    {
      title: "Asignaturas",
      url: "/dashboard/admin/subjects",
      icon: BookOpen,
      isActive: false,
    },
    {
      title: "Cuestionarios",
      url: "/dashboard/admin/quizzes",
      icon: ClipboardList,
      isActive: false,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin, email, displayName, isAuthenticated } = useAuth();
  const { setSearchQuery } = useSearch();

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
        <NavSubjects title="Apuntes" />
        <NavMain items={dataQuizzes.quizzes} title="Cuestionarios" />
        <NavMain items={dataBlog.blog} title="Blog" />
        {/* Solo mostrar admin panel si está autenticado y es admin */}
        {isAuthenticated && isAdmin && (
          <NavMain items={dataAdminPanel.adminPanel} title="Admin Panel" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={dataUser} />
      </SidebarFooter>
    </Sidebar>
  )
}