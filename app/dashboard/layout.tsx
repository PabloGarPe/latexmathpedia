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
            <SidebarInset className="flex flex-col">
              <div className="flex-1">
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
