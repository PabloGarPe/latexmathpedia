"use client"

import {
  BadgeCheck,
  Bell,
  Check,
  ChevronsUpDown,
  CreditCard,
  LogOut,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth, type MockIdentity } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"
import { AUTH_MODE } from "@/lib/env"
import Link from "next/link"

const TEST_MODE_OPTIONS: { value: MockIdentity; label: string }[] = [
  { value: "admin", label: "Admin (local)" },
  { value: "user", label: "Usuario (local)" },
  { value: "anonymous", label: "Anónimo" },
]

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
  }
}) {
  const { isMobile } = useSidebar()
  const { isAuthenticated, login, logout, identity, setIdentity } = useAuth();
  const queryClient = useQueryClient()
  // En modo mock /me da 401: `me` queda undefined y se usa el nombre que llega por props
  // (displayName de Keycloak, o la parte local del email).
  const { data: me } = useMe(isAuthenticated)
  const name = me?.username || user.name
  // El selector "Modo de prueba" solo tiene sentido en modo mock (setIdentity no existe
  // en modo keycloak). En modo keycloak, sin sesión mostramos el botón de login real.
  const isMockMode = AUTH_MODE !== "keycloak" && Boolean(setIdentity)

  if (!isMockMode && !isAuthenticated) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => login()}
          >
            Iniciar sesión
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const handleLogOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    } finally {
      // Sin esto, la caché de TanStack Query (datos de admin, perfil, etc.) sobrevive al
      // logout y puede llegar a mostrarse a la siguiente persona que use el mismo navegador.
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <UserAvatar
                user={me ?? {}}
                fallbackLabel={name}
                initialsLength={2}
                className="rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{isAuthenticated ? name : "Invitado"}</span>
                <span className="truncate text-xs">{isAuthenticated ? user.email : "Modo anónimo"}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {isAuthenticated && (
              <>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserAvatar
                      user={me ?? {}}
                      fallbackLabel={name}
                      initialsLength={2}
                      className="rounded-lg"
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <Link href="/dashboard/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <BadgeCheck />
                      <span>Perfil</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/notifications">
                    <DropdownMenuItem className="cursor-pointer">
                      <Bell />
                      <span>Notificaciones</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/billing">
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard />
                      <span>Donar</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            {isMockMode && setIdentity && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Modo de prueba
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {TEST_MODE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className="cursor-pointer justify-between"
                      onClick={() => setIdentity(option.value)}
                    >
                      <span>{option.label}</span>
                      {identity === option.value && <Check className="size-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            {isAuthenticated && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogOut}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
