"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import PdfViewer from "@/components/pdf-viewer"
import { ContentUnavailable } from "@/components/content-unavailable"
import { ApiError } from "@/lib/api/errors"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useInvalidatePdfViews, usePdfContent, usePdfs } from "@/hooks/api/use-pdfs"
import { useToast } from "@/hooks/use-toast"
import { UserAvatar } from "@/components/user-avatar"
import { authorLabel } from "@/lib/content/types"

export default function PdfViewerPage() {
  const params = useParams<{ pdfId: string }>()
  const pdfId = Number(params.pdfId)
  const toast = useToast()

  // GET /pdf/{pdfId} requiere JWT; sin sesión, el hook redirige al login con ?redirect.
  const { isAuthenticated, loading: authLoading } = useProtectedRoute()

  // No hay endpoint de metadatos de un solo PDF: se sacan del catálogo (normalmente ya en
  // caché si se llega desde el feed o la ficha de asignatura).
  const { data: pdfs } = usePdfs()
  const pdf = pdfs?.find((p) => p.id === pdfId)
  const authors = pdf?.authors ?? []

  const { data: content, isLoading, isError, error: contentError } = usePdfContent(pdfId, isAuthenticated)
  const notFound = contentError instanceof ApiError && contentError.status === 404

  // Abrir el PDF suma una vista: al llegar el binario se marcan como obsoletos el viewCount
  // y las hileras del feed, para que al volver se refresquen (si no, lo hace el staleTime).
  const invalidatePdfViews = useInvalidatePdfViews()
  const hasContent = content != null
  useEffect(() => {
    if (hasContent) invalidatePdfViews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasContent, pdfId])

  useEffect(() => {
    if (isError && !notFound) toast.error("Error al cargar el PDF.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (notFound) {
    return <ContentUnavailable backHref="/dashboard/subjects" backLabel="Ver asignaturas" />
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-4">
      <header className="space-y-2">
        {pdf?.subject?.id != null && (
          <Link
            href={`/dashboard/subjects/${pdf.subject.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {pdf.subject.name}
            {pdf.subjectUnit?.name && ` · ${pdf.subjectUnit.name}`}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{pdf?.name ?? "Documento"}</h1>
        {authors.length > 0 && (
          // Principal primero. Los nombres no son enlaces: no hay perfil público de otros usuarios.
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {authors.map((author, index) => (
              <li key={author.id ?? index} className="flex items-center gap-1.5">
                <UserAvatar user={author} className="h-6 w-6 text-xs" />
                <span className={author.username ? "text-foreground" : "italic"}>{authorLabel(author)}</span>
                {index === 0 && authors.length > 1 && <span className="text-xs">(principal)</span>}
              </li>
            ))}
          </ul>
        )}
        {pdf?.description && <p className="line-clamp-2 text-muted-foreground">{pdf.description}</p>}
      </header>

      {isError ? (
        <p className="py-8 text-center text-destructive">
          No se pudo cargar el PDF. Puede que ya no exista.
        </p>
      ) : isLoading || !content ? (
        <div className="h-[70vh] animate-pulse rounded-md bg-muted" />
      ) : (
        <PdfViewer
          data={content}
          // Cabecera del dashboard + título/autores de arriba: el visor ocupa el resto de la
          // ventana para que el scroll vertical quede dentro de él.
          className="h-[calc(100dvh-var(--header-height)-14rem)]"
        />
      )}
    </div>
  )
}
