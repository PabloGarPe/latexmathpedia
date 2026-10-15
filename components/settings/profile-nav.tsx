"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BookOpen, ListChecks, Shield, UserRound, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Secciones del perfil, cada una en su ruta. Para añadir una: crear `app/dashboard/profile/<x>/page.tsx`
// y añadirla aquí.
export const PROFILE_SECTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/profile", label: "Perfil", icon: UserRound },
  { href: "/dashboard/profile/subjects", label: "Mis asignaturas", icon: BookOpen },
  { href: "/dashboard/profile/notifications", label: "Notificaciones", icon: Bell },
  { href: "/dashboard/profile/account", label: "Cuenta y seguridad", icon: Shield },
  { href: "/dashboard/profile/activity", label: "Actividad", icon: ListChecks },
]

// Lateral en pantallas anchas; en móvil, fila con scroll horizontal.
export function ProfileNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones del perfil" className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {PROFILE_SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
