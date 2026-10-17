"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertCircleIcon, Download, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { QuizFormDialog } from "@/components/admin/quiz-form-dialog"
import { QuizVisibilityToggle, isQuizHidden } from "@/components/admin/quiz-visibility"
import { QuizDifficultyBadge } from "@/components/ui/quiz-difficulty-badge"
import { useToast } from "@/hooks/use-toast"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useDeleteQuiz, useAllQuizzes } from "@/hooks/api/use-quizzes"
import { exportQuiz, type QuizDto } from "@/lib/api/quizzes"
import { formatDate } from "@/lib/utils"

function CreateQuizButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className="cursor-pointer" onClick={() => setOpen(true)}>
        Crear cuestionario
      </Button>
      <QuizFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function QuizRow({ quiz }: { quiz: QuizDto }) {
  const toast = useToast()
  const deleteQuiz = useDeleteQuiz()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (quiz.id == null) return
    setIsExporting(true)
    try {
      const exportable = await exportQuiz(quiz.id)
      const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${quiz.name ?? "cuestionario"}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("No se pudo exportar el cuestionario.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    if (quiz.id == null) return
    try {
      await deleteQuiz.mutateAsync(quiz.id)
      toast.success("Cuestionario eliminado correctamente.")
    } catch (error) {
      toast.error("Error al eliminar el cuestionario.")
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-medium">
        {quiz.name}
        {isQuizHidden(quiz) && <span className="sr-only"> (oculto)</span>}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {quiz.subject?.name && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {quiz.subject.name}
            </span>
          )}
          {quiz.subjectUnit?.name && (
            <span className="text-xs bg-secondary/10 text-primary px-2 py-0.5 rounded-full">
              {quiz.subjectUnit.name}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <QuizDifficultyBadge difficulty={quiz.difficulty} />
      </TableCell>
      <TableCell>
        <QuizVisibilityToggle quiz={quiz} variant="switch" />
      </TableCell>
      <TableCell>{formatDate(quiz.lastTimeEdited)}</TableCell>
      <TableCell className="text-right space-x-1">
        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={handleExport} disabled={isExporting}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="cursor-pointer" asChild>
          <Link href={`/dashboard/admin/quizzes/${quiz.id}`}>Editar</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="cursor-pointer" disabled={deleteQuiz.isPending}>
              Borrar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este cuestionario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer y eliminará también sus preguntas y opciones.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="cursor-pointer" onClick={handleDelete}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export default function AdminQuizzesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all")
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const { data: quizzes, isLoading: quizzesLoading } = useAllQuizzes(isAuthenticated && isAdmin)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  const hiddenCount = (quizzes ?? []).filter(isQuizHidden).length
  const filteredQuizzes = (quizzes ?? []).filter((quiz) => {
    if (statusFilter === "published" && isQuizHidden(quiz)) return false
    if (statusFilter === "hidden" && !isQuizHidden(quiz)) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      quiz.name?.toLowerCase().includes(term) ||
      quiz.subject?.name?.toLowerCase().includes(term) ||
      quiz.subjectUnit?.name?.toLowerCase().includes(term)
    )
  })

  return (
    <PageContainer>
      <PageHeader
        title="Cuestionarios"
        description="Vista global: busca, crea, importa, exporta o edita cualquier cuestionario."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="cursor-pointer" asChild>
              <Link href="/dashboard/admin/quizzes/import">
                <Upload className="h-4 w-4" />
                Importar JSON
              </Link>
            </Button>
            <CreateQuizButton />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Cuestionarios existentes</CardTitle>
          <CardDescription>Busca, edita, exporta o elimina cuestionarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="published">Publicados</TabsTrigger>
                <TabsTrigger value="hidden">Ocultos{hiddenCount > 0 ? ` (${hiddenCount})` : ""}</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              Los cuestionarios nuevos se crean ocultos: publícalos cuando tengan preguntas.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, asignatura o tema..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {quizzesLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cuestionarios...</p>
          ) : filteredQuizzes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Asignatura/Tema</TableHead>
                    <TableHead>Dificultad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última edición</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuizzes.map((quiz) => (
                    <QuizRow key={quiz.id} quiz={quiz} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : searchTerm || statusFilter !== "all" ? (
            <div className="text-center py-6">
              <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
              <p>
                {searchTerm ? <>No se encontraron resultados para &quot;{searchTerm}&quot;</> : "No hay cuestionarios en este estado."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay cuestionarios todavía.</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
