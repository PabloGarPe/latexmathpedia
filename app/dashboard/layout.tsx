"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { MainFooter } from "@/components/main-footer"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SearchProvider } from "@/contexts/search-context"
import { ChatWidget } from "@/components/chat-widget"

export const iframeHeight = "800px"

export const description = "A sidebar with a header and a search form."

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SearchProvider>
        <SidebarProvider className="flex flex-col min-h-screen">
          <SiteHeader />
          <div className="flex flex-1">
            <AppSidebar />
            {/* min-w-0: un hijo flex no baja de su ancho de contenido (min-width: auto), así que
                con el menú abierto y la ventana estrecha el contenido (rejilla, carruseles de
                PDFs) ensanchaba toda la página en vez de ajustarse al hueco junto a la barra. */}
            <SidebarInset className="flex min-w-0 flex-col">
              <div className="min-w-0 flex-1">
                {children}
              </div>
              <MainFooter />
            </SidebarInset>
          </div>
        </SidebarProvider>

        <ChatWidget />
      </SearchProvider>
    </div>
  )
}
