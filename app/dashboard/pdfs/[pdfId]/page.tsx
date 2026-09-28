"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import PdfViewer from "@/components/pdf-viewer"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { usePdfContent, usePdfs } from "@/hooks/api/use-pdfs"
import { useToast } from "@/hooks/use-toast"
import { formatPdfAuthors } from "@/lib/content/types"

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
  const authors = formatPdfAuthors(pdf?.author, pdf?.coauthors)

  const { data: content, isLoading, isError } = usePdfContent(pdfId, isAuthenticated)

  useEffect(() => {
    if (isError) toast.error("Error al cargar el PDF.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
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
        {authors && <p className="text-sm text-muted-foreground">Por {authors}</p>}
        {pdf?.description && <p className="text-muted-foreground">{pdf.description}</p>}
      </header>

      {isError ? (
        <p className="py-8 text-center text-destructive">
          No se pudo cargar el PDF. Puede que ya no exista.
        </p>
      ) : isLoading || !content ? (
        <div className="h-[70vh] animate-pulse rounded-md bg-muted" />
      ) : (
        <PdfViewer data={content} />
      )}
    </div>
  )
}
