"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { KeyRound, LogOut, Shield } from "lucide-react"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useMe } from "@/hooks/api/use-profile"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
}

export default function ProfileAccountPage() {
  const { email, logout, changePassword, isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [isChangingPwd, setIsChangingPwd] = useState(false)
  const { data: me } = useMe(isAuthenticated)

  const handleLogout = async () => {
    try {
      await logout()
      // Evita que datos de esta sesión (perfil, intentos, notificaciones) sobrevivan en caché.
      queryClient.clear()
      router.push("/auth/login")
      toast.success("Sesión cerrada exitosamente")
    } catch {
      toast.error("Error al cerrar sesión")
    }
  }

  const handlePwdChange = async () => {
    setIsChangingPwd(true)
    try {
      // Redirige a Keycloak; al terminar vuelve a esta página
      await changePassword()
    } catch {
      toast.error("Error al abrir el cambio de contraseña. Inténtalo de nuevo.")
      setIsChangingPwd(false)
    }
  }

  return (
    <>
      <SettingsSection title="Información de la cuenta" icon={Shield}>
        <SettingsRow label="Correo electrónico" description="Con él inicias sesión.">
          <span className="text-sm text-muted-foreground">{email}</span>
        </SettingsRow>
        <SettingsRow label="Estado">
          {me?.status ? (
            <Badge
              variant={me.status === "ACTIVE" ? "default" : me.status === "SUSPENDED" ? "destructive" : "secondary"}
            >
              {STATUS_LABEL[me.status] ?? me.status}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </SettingsRow>
        <SettingsRow label="Miembro desde">
          <span className="text-sm text-muted-foreground">{formatDate(me?.createdAt)}</span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Seguridad" icon={KeyRound}>
        <SettingsRow label="Contraseña" description="Serás redirigido a la página segura para cambiarla.">
          <Button variant="outline" className="cursor-pointer" onClick={handlePwdChange} disabled={isChangingPwd}>
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </Button>
        </SettingsRow>
        <SettingsRow label="Sesión" description="Cierra sesión en este dispositivo.">
          <Button variant="outline" className="cursor-pointer" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
