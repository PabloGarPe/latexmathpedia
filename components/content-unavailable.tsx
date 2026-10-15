import Link from "next/link"
import { ArrowLeft, FileX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/page-shell"

// Estado de "no se puede mostrar" para fichas de contenido (cuestionario, PDF…). Un 404 puede
// significar que se borró, que está oculto o que nunca existió: para el usuario es lo mismo.
export function ContentUnavailable({
  title = "Este contenido ya no está disponible",
  description = "Puede que se haya eliminado o que todavía no esté publicado.",
  backHref = "/dashboard",
  backLabel = "Volver al inicio",
}: {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <PageContainer className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileX2 className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" asChild>
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </Button>
    </PageContainer>
  )
}
