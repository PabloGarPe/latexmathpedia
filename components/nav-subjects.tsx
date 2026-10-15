"use client"

import { useState } from "react"
import { BookOpen, ChevronRight, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useMySubscriptions } from "@/hooks/api/use-subscriptions"
import { useSubjectUnits } from "@/hooks/api/use-subjects"
import type { SubjectDto } from "@/lib/api/subjects"

function SubjectNavItem({ subject }: { subject: SubjectDto }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Ahora que el clic navega a la ficha de asignatura (en vez de aplicar FilterContext), el
  // resaltado "activo" se deriva de la ruta actual, no de un filtro en memoria.
  const isActiveSubject =
    subject.id != null && pathname === `/dashboard/subjects/${subject.id}`
  const activeUnitId = isActiveSubject ? searchParams.get("unit") : null

  // Los temas solo se piden al expandir el desplegable de la asignatura (o si ya llegamos a
  // su ficha con la URL abierta), igual que en el admin -- pedirlos siempre por cada
  // asignatura del catálogo dispara 1+N peticiones en paralelo solo para pintar la sidebar.
  const [isOpen, setIsOpen] = useState(isActiveSubject)
  const { data: units } = useSubjectUnits(isOpen ? subject.id : null)

  // Clic en la asignatura: navega a su ficha (§4/§6.1 de UI-RESTRUCTURE.md) en vez de
  // filtrar el feed -- evita mantener dos formas de ver lo mismo.
  function handleClickSubject() {
    if (subject.id == null) return
    router.push(`/dashboard/subjects/${subject.id}`)
  }

  // Clic en un tema: también va a la ficha de asignatura, con ese tema ya expandido
  // (?unit=X), en vez de aplicar el filtro sobre /dashboard -- misma razón que arriba, y
  // así el tema muestra su contenido agrupado (PDFs + cuestionarios) en vez de mezclado en
  // el feed general.
  function handleClickUnit(unitId?: number) {
    if (subject.id == null || unitId == null) return
    router.push(`/dashboard/subjects/${subject.id}?unit=${unitId}`)
  }

  return (
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={subject.name}
          onClick={handleClickSubject}
          className={`cursor-pointer ${isActiveSubject ? "text-primary" : ""}`}
        >
          <BookOpen />
          <span>{subject.name}</span>
        </SidebarMenuButton>

        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="data-[state=open]:rotate-90">
            <ChevronRight />
            <span className="sr-only">Toggle</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {units && units.length > 0 ? (
            <SidebarMenuSub>
              {units.map((unit) => (
                <SidebarMenuSubItem key={unit.id}>
                  <SidebarMenuSubButton
                    onClick={() => handleClickUnit(unit.id)}
                    className={`cursor-pointer ${
                      unit.id != null && activeUnitId === String(unit.id)
                        ? "text-primary"
                        : ""
                    }`}
                  >
                    <span>{unit.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          ) : (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              {units ? "Sin temas todavía." : "Cargando temas..."}
            </p>
          )}
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

// La sidebar solo lista las asignaturas a las que el usuario está suscrito (el resto, en el
// catálogo). Sin sesión, sin suscripciones o si la lista no se puede cargar (modo mock: 401) se
// muestra una invitación a suscribirse; "Todas las asignaturas" va siempre.
export function NavSubjects({ title = "Mis asignaturas" }: { title?: string }) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const { data: subscriptions, isLoading } = useMySubscriptions()
  const subjects = (subscriptions ?? [])
    .map((subscription) => subscription.subject)
    .filter((subject): subject is SubjectDto => subject != null)
  const showHint = !isLoading && (!isAuthenticated || subjects.length === 0)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {isAuthenticated && isLoading && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-muted-foreground text-sm">Cargando asignaturas...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {isAuthenticated && subjects.map((subject) => (
          <SubjectNavItem key={subject.id} subject={subject} />
        ))}
        {showHint && (
          <SidebarMenuItem>
            <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              <Link href="/dashboard/subjects" className="underline-offset-2 hover:text-foreground hover:underline">
                Suscríbete a tus asignaturas
              </Link>{" "}
              para tenerlas aquí.
            </p>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Todas las asignaturas"
            className={pathname === "/dashboard/subjects" ? "text-primary" : ""}
          >
            <Link href="/dashboard/subjects">
              <LayoutGrid />
              <span>Todas las asignaturas</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
