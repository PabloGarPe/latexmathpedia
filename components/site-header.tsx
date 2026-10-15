"use client"

import { ChevronRight, SidebarIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SearchForm } from "@/components/search-form"
import { useSearch } from "@/contexts/search-context" // Importar el contexto de búsqueda
import { usePdfs } from "@/hooks/api/use-pdfs"
import { useQuiz } from "@/hooks/api/use-quizzes"
import { useSubject } from "@/hooks/api/use-subjects"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { ModeToggle } from "./mode-toggle"

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Segmentos de la URL en inglés que se muestran traducidos.
const SEGMENT_LABELS: Record<string, string> = {
  subjects: "Asignaturas",
  quizzes: "Cuestionarios",
  pdfs: "PDFs",
}

type Crumb = { label: string; href: string }

// Los PDFs y cuestionarios cuelgan de una asignatura, así que su breadcrumb sigue esa jerarquía
// (Dashboard > Asignaturas > Asignatura > PDF) en lugar de la URL (/pdfs/12). Los hooks
// comparten caché con las propias pantallas, así que no suman peticiones salvo la primera vez.
function useCrumbs(pathSegments: string[]): Crumb[] {
  const idAfter = (parent: string) => {
    const i = pathSegments.indexOf(parent)
    const raw = i >= 0 ? pathSegments[i + 1] : undefined
    return raw && /^\d+$/.test(raw) ? Number(raw) : null
  }
  // Las rutas de admin conservan su breadcrumb por URL.
  const isAdmin = pathSegments.includes("admin")
  const subjectId = idAfter("subjects")
  const pdfId = isAdmin ? null : idAfter("pdfs")
  const quizId = isAdmin ? null : idAfter("quizzes")

  const subject = useSubject(subjectId)
  const pdfs = usePdfs(pdfId != null)
  // En admin (editor de cuestionario) el breadcrumb sigue la URL, pero con el nombre en vez del id.
  const quiz = useQuiz(isAdmin ? idAfter("quizzes") : quizId)
  const pdf = pdfs.data?.find((p) => p.id === pdfId)

  const byUrl = (labelOf: (segment: string, index: number) => string): Crumb[] =>
    pathSegments.map((segment, index) => ({
      label: labelOf(decodeURIComponent(segment), index),
      href: `/${pathSegments.slice(0, index + 1).join("/")}`,
    }))
  const entityName = (segment: string, index: number) => {
    const parent = pathSegments[index - 1]
    const name =
      parent === "subjects" ? subject.data?.name
      : parent === "quizzes" ? quiz.data?.name
      : undefined
    return name ?? SEGMENT_LABELS[segment] ?? capitalizeFirstLetter(segment)
  }

  const entity = pdfId != null ? pdf : quizId != null ? quiz.data : undefined
  if (pdfId == null && quizId == null) return byUrl(entityName)

  const root = pathSegments[0]
  const crumbs: Crumb[] = [
    { label: capitalizeFirstLetter(root), href: `/${root}` },
    { label: "Asignaturas", href: `/${root}/subjects` },
  ]
  if (entity?.subject?.id != null && entity.subject.name) {
    crumbs.push({ label: entity.subject.name, href: `/${root}/subjects/${entity.subject.id}` })
  }
  const entityHref = `/${pathSegments.slice(0, 3).join("/")}`
  crumbs.push({ label: entity?.name ?? pathSegments[2], href: entityHref })
  if (pathSegments[3] === "attempt") crumbs.push({ label: "Intento", href: `/${pathSegments.join("/")}` })
  return crumbs
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { setSearchQuery } = useSearch()
  const pathname = usePathname() // Obtener la ruta actual

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Dividir la ruta en segmentos para generar los breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean)
  const crumbs = useCrumbs(pathSegments)

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">MathTexpedia</BreadcrumbLink>
            </BreadcrumbItem>
            <ChevronRight size={13}/>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1

              return (
                <BreadcrumbItem key={crumb.href}>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                  {!isLast && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
        {/* Aviso de beta: siempre visible (también en móvil, donde el breadcrumb se oculta) y
            enlaza al formulario de contacto para reportar fallos. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/dashboard/contact/contact-us" aria-label="Versión beta: informar de un problema">
              <Badge
                variant="outline"
                className="shrink-0 border-amber-500/50 bg-amber-500/10 uppercase tracking-wide text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
              >
                Beta
              </Badge>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            Estamos en beta: puede haber fallos. ¿Has encontrado alguno? Cuéntanoslo.
          </TooltipContent>
        </Tooltip>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" onSearch={handleSearch} />
        <NotificationBell />
        <ModeToggle />
      </div>
    </header>
  )
}
