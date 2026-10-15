"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, ClipboardList, FileText } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { useAdminRoute } from "@/hooks/use-protected-route"

const SECTIONS = [
  {
    href: "/dashboard/admin/pdfs",
    title: "PDFs",
    description: "Todos los documentos en una tabla: busca, filtra por asignatura o tema, sube varios a la vez, edita o elimina.",
    icon: FileText,
  },
  {
    href: "/dashboard/admin/quizzes",
    title: "Cuestionarios",
    description: "Crea, importa y exporta cuestionarios, y edita sus preguntas y opciones.",
    icon: ClipboardList,
  },
]

function Admin() {
  const { isAuthenticated, isAdmin, loading } = useAdminRoute()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null // El hook maneja la redirección
  }

  return (
    <PageContainer>
      <PageHeader title="Panel de administración" description="Vistas globales para revisar y gestionar el contenido." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium transition-all group-hover:gap-2">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/dashboard/subjects"
        className="mt-6 flex items-start gap-3 rounded-xl border border-dashed p-5 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium text-foreground">Asignaturas y temas</span> ya no tienen página aparte: se
          crean, renombran, reordenan y eliminan desde <u>Asignaturas</u> activando el <b>Modo edición</b>.
        </span>
      </Link>
    </PageContainer>
  )
}

export default Admin
