"use client"

import { useSyncExternalStore } from "react"
import { Link2, Share2 } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// En el servidor no hay navigator: se pinta el desplegable y se cambia al montar si hay Web Share API.
const subscribe = () => () => {}
const canUseWebShare = () => typeof navigator.share === "function"

// Botón "Compartir" de un cuestionario: menú nativo del sistema si existe (móvil) y, si no,
// desplegable con WhatsApp y "Copiar enlace". El enlace siempre es la ficha del cuestionario.
export function ShareQuizButton({
  quizId,
  text,
  size,
  className,
}: {
  quizId: number
  // Mensaje que acompaña al enlace (reto, nota...).
  text: string
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}) {
  const toast = useToast()
  const webShare = useSyncExternalStore(subscribe, canUseWebShare, () => false)

  const quizUrl = () => `${window.location.origin}/dashboard/quizzes/${quizId}`

  const share = async () => {
    try {
      await navigator.share({ text, url: quizUrl() })
    } catch (error) {
      // AbortError = el usuario cerró el menú de compartir: no es un fallo.
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.error("No se pudo compartir el cuestionario.")
    }
  }

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(`${text} ${quizUrl()}`)
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer")
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(quizUrl())
      toast.success("Enlace copiado al portapapeles.")
    } catch {
      toast.error("No se pudo copiar el enlace.")
    }
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("cursor-pointer gap-2", className)}
      onClick={webShare ? share : undefined}
    >
      <Share2 className="h-4 w-4" />
      Compartir
    </Button>
  )

  if (webShare) return trigger

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem className="cursor-pointer" onSelect={shareOnWhatsApp}>
          <FaWhatsapp />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={copyLink}>
          <Link2 />
          Copiar enlace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
