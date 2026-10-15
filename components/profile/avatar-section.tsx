"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Trash2, Upload } from "lucide-react"
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth } from "@/contexts/auth-context"
import { useDeleteAvatar, useMe, useUploadAvatar } from "@/hooks/api/use-profile"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api/errors"
import { AVATAR_MAX_BYTES, AVATAR_MAX_PX, AVATAR_MIME_TYPES, AVATAR_MIN_PX } from "@/lib/api/profile"

function readDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error("No se pudo leer la imagen"))
    image.src = url
  })
}

// Valida la foto elegida antes de abrir el recorte (mismos límites que el back). Devuelve el
// mensaje de error, o null si es válida.
async function validateAvatarFile(file: File, url: string): Promise<string | null> {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Solo se admiten imágenes JPEG o PNG."
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return `La imagen pesa demasiado: el máximo es ${AVATAR_MAX_BYTES / (1024 * 1024)} MB.`
  }
  try {
    const { width, height } = await readDimensions(url)
    if (width < AVATAR_MIN_PX || height < AVATAR_MIN_PX) {
      return `La imagen es demasiado pequeña: mínimo ${AVATAR_MIN_PX} × ${AVATAR_MIN_PX} píxeles.`
    }
    if (width > AVATAR_MAX_PX || height > AVATAR_MAX_PX) {
      return `La imagen es demasiado grande: máximo ${AVATAR_MAX_PX} × ${AVATAR_MAX_PX} píxeles.`
    }
  } catch {
    return "No se pudo leer la imagen. Prueba con otra."
  }
  return null
}

function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 413) return "La imagen es demasiado grande."
    if (error.status === 400) return "La imagen no es válida. Usa un JPEG o PNG de tamaño razonable."
  }
  return "No se pudo subir la foto de perfil."
}

// Sección "Foto de perfil": subir/cambiar (con recorte cuadrado en cliente) y eliminar.
export function AvatarSection() {
  const { isAuthenticated, email } = useAuth()
  const toast = useToast()
  const { data: me } = useMe(isAuthenticated)
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  // Object URL de la foto elegida pendiente de recorte; null = sin diálogo abierto.
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  // Libera el object URL cuando cambia o se desmonta la sección.
  useEffect(() => {
    if (!pendingUrl) return
    return () => URL.revokeObjectURL(pendingUrl)
  }, [pendingUrl])

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Vaciar el input permite volver a elegir el mismo fichero tras un error.
    event.target.value = ""
    if (!file) return

    const url = URL.createObjectURL(file)
    const problem = await validateAvatarFile(file, url)
    if (problem) {
      URL.revokeObjectURL(url)
      toast.error(problem)
      return
    }
    setPendingUrl(url)
  }

  const handleConfirm = async (blob: Blob) => {
    try {
      await uploadAvatar.mutateAsync({ file: blob, filename: "avatar.jpg" })
      toast.success("Foto de perfil actualizada.")
      setPendingUrl(null)
    } catch (error) {
      toast.error(uploadErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAvatar.mutateAsync()
      toast.success("Foto de perfil eliminada.")
    } catch {
      toast.error("No se pudo eliminar la foto de perfil.")
    }
  }

  const hasAvatar = Boolean(me?.hasAvatar)

  return (
    <>
      <SettingsSection
        title="Foto de perfil"
        description="Se muestra junto a tu nombre de usuario. JPEG o PNG, hasta 2 MB."
        icon={Camera}
      >
        <SettingsRow label="Tu foto" description="Podrás recortarla antes de subirla.">
          <div className="flex items-center gap-4">
            <UserAvatar
              user={me ?? {}}
              fallbackLabel={email}
              initialsLength={2}
              className="h-20 w-20 text-2xl"
            />
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={AVATAR_MIME_TYPES.join(",")}
                className="hidden"
                onChange={handleFile}
              />
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={!me || uploadAvatar.isPending}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {hasAvatar ? "Cambiar foto" : "Subir foto"}
              </Button>
              {hasAvatar && (
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  disabled={deleteAvatar.isPending}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

      <AvatarCropDialog
        key={pendingUrl ?? "closed"}
        imageUrl={pendingUrl}
        uploading={uploadAvatar.isPending}
        onCancel={() => setPendingUrl(null)}
        onConfirm={handleConfirm}
        onError={toast.error}
      />
    </>
  )
}
