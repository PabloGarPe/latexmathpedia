"use client"

import { useCallback, useState } from "react"
import Cropper, { type Area, type Point } from "react-easy-crop"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Lado máximo de la foto que se sube: el back la reduce a 256 px, así que 512 deja margen
// (pantallas HiDPI) sin mandar imágenes enormes.
const OUTPUT_MAX_PX = 512
const OUTPUT_QUALITY = 0.9
const MIN_ZOOM = 1
const MAX_ZOOM = 4

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("No se pudo leer la imagen"))
    image.src = src
  })
}

// Dibuja en un canvas la zona recortada (en píxeles de la imagen original) y la exporta a JPEG.
async function cropToJpeg(imageUrl: string, area: Area) {
  const image = await loadImage(imageUrl)
  const side = Math.max(1, Math.min(Math.round(area.width), OUTPUT_MAX_PX))
  const canvas = document.createElement("canvas")
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas no disponible")
  // JPEG no tiene transparencia: los PNG con fondo transparente quedarían en negro.
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, side, side)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, side, side)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
      "image/jpeg",
      OUTPUT_QUALITY,
    )
  })
}

// Recorte cuadrado de la foto de perfil. `imageUrl` es un object URL de la imagen elegida
// (null = diálogo cerrado). `onConfirm` recibe el JPEG recortado y debe subirlo; mientras tanto
// `uploading` bloquea los botones. Conviene montarlo con key={imageUrl} para que el recorte y el
// zoom empiecen limpios en cada foto. Si la generación del recorte falla, `onError` avisa.
export function AvatarCropDialog({
  imageUrl,
  uploading,
  onCancel,
  onConfirm,
  onError,
}: {
  imageUrl: string | null
  uploading: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  onError: (message: string) => void
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [area, setArea] = useState<Area | null>(null)
  const [working, setWorking] = useState(false)

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !area) return
    setWorking(true)
    try {
      onConfirm(await cropToJpeg(imageUrl, area))
    } catch {
      onError("No se pudo preparar la imagen. Prueba con otra.")
    } finally {
      setWorking(false)
    }
  }, [imageUrl, area, onConfirm, onError])

  const busy = uploading || working

  return (
    <Dialog open={imageUrl != null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(event) => busy && event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Recortar foto de perfil</DialogTitle>
          <DialogDescription>
            Arrastra para encuadrar y usa el zoom. Se mostrará en un círculo.
          </DialogDescription>
        </DialogHeader>

        {imageUrl && (
          <>
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="range"
                aria-label="Zoom"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" className="cursor-pointer" disabled={busy || !area} onClick={handleConfirm}>
            {busy ? "Subiendo…" : "Guardar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
