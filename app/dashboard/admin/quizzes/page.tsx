"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AlertCircleIcon, Download, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import { QuizDifficultyBadge, DIFFICULTY_LABEL, QUIZ_DIFFICULTIES } from "@/components/ui/quiz-difficulty-badge"
import { useToast } from "@/hooks/use-toast"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useCreateQuiz, useDeleteQuiz, useImportQuiz, usePublicQuizzes } from "@/hooks/api/use-quizzes"
import { exportQuiz, type QuizDto, type QuizExportableDto } from "@/lib/api/quizzes"
import { conflictMessage } from "@/lib/api/errors"
import { formatDate } from "@/lib/utils"

const createQuizSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    difficulty: z.enum(QUIZ_DIFFICULTIES),
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type CreateQuizFormValues = z.infer<typeof createQuizSchema>

const emptyCreateValues: CreateQuizFormValues = {
  name: "",
  description: "",
  difficulty: "EASY",
  subjectId: null,
  subjectUnitId: null,
}

const importQuizSchema = z
  .object({
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type ImportQuizFormValues = z.infer<typeof importQuizSchema>

function CreateQuizDialog() {
  const toast = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const createQuiz = useCreateQuiz()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuizFormValues>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: emptyCreateValues,
  })

  const subjectIdValue = watch("subjectId")
  const subjectUnitIdValue = watch("subjectUnitId")
  const difficultyValue = watch("difficulty")

  const onSubmit = async (values: CreateQuizFormValues) => {
    try {
      const created = await createQuiz.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        difficulty: values.difficulty,
        subjectId: values.subjectId as number,
        subjectUnitId: values.subjectUnitId,
      })
      toast.success("Cuestionario creado. Ahora puedes añadirle preguntas.")
      setOpen(false)
      reset(emptyCreateValues)
      if (created?.id != null) {
        router.push(`/dashboard/admin/quizzes/${created.id}`)
      }
    } catch (error) {
      toast.error(conflictMessage(error, "Error al crear el cuestionario."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">Crear cuestionario</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear cuestionario</DialogTitle>
          <DialogDescription>
            Datos mínimos para empezar; podrás añadir preguntas justo después.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="quiz-name">Nombre</Label>
            <Input id="quiz-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quiz-description">Descripción (opcional)</Label>
            <Input id="quiz-description" {...register("description")} />
          </div>
          <div className="grid gap-2">
            <Label>Dificultad</Label>
            <Select value={difficultyValue} onValueChange={(value) => setValue("difficulty", value as CreateQuizFormValues["difficulty"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUIZ_DIFFICULTIES.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {DIFFICULTY_LABEL[difficulty]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SubjectUnitPicker
            subjectId={subjectIdValue ?? null}
            subjectUnitId={subjectUnitIdValue ?? null}
            onSubjectChange={(id) => {
              setValue("subjectId", id, { shouldValidate: true })
              setValue("subjectUnitId", null)
            }}
            onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
          />
          {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}

          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting || createQuiz.isPending}>
              Crear y editar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ImportQuizDialog() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileContentRef = useRef<QuizExportableDto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importQuiz = useImportQuiz()

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ImportQuizFormValues>({
    resolver: zodResolver(importQuizSchema),
    defaultValues: { subjectId: null, subjectUnitId: null },
  })

  const subjectIdValue = watch("subjectId")
  const subjectUnitIdValue = watch("subjectUnitId")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      fileContentRef.current = JSON.parse(text) as QuizExportableDto
      setFileName(file.name)
    } catch (error) {
      fileContentRef.current = null
      setFileName(null)
      toast.error("El archivo no es un JSON válido.")
    }
  }

  const onSubmit = async (values: ImportQuizFormValues) => {
    if (!fileContentRef.current) {
      toast.error("Selecciona primero un archivo JSON para importar.")
      return
    }
    try {
      await importQuiz.mutateAsync({
        subjectId: values.subjectId as number,
        subjectUnitId: values.subjectUnitId,
        body: fileContentRef.current,
      })
      toast.success("Cuestionario importado correctamente.")
      setOpen(false)
      reset({ subjectId: null, subjectUnitId: null })
      fileContentRef.current = null
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      toast.error(conflictMessage(error, "Error al importar el cuestionario."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="cursor-pointer">
          <Upload className="h-4 w-4" />
          Importar JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar cuestionario</DialogTitle>
          <DialogDescription>
            El JSON no incluye asignatura ni tema: selecciónalos aquí para el cuestionario importado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="import-file">Archivo JSON</Label>
            <Input id="import-file" type="file" accept="application/json" ref={fileInputRef} onChange={handleFileChange} />
            {fileName && <p className="text-xs text-muted-foreground">Seleccionado: {fileName}</p>}
          </div>
          <SubjectUnitPicker
            subjectId={subjectIdValue ?? null}
            subjectUnitId={subjectUnitIdValue ?? null}
            onSubjectChange={(id) => {
              setValue("subjectId", id, { shouldValidate: true })
              setValue("subjectUnitId", null)
            }}
            onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
          />
          {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}

          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting || importQuiz.isPending}>
              Importar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <TableRow>
      <TableCell className="font-medium">{quiz.name}</TableCell>
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
      <TableCell>{formatDate(quiz.lastTimeEdited)}</TableCell>
      <TableCell className="text-right space-x-1">
        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={handleExport} disabled={isExporting}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="cursor-pointer" asChild>
          <a href={`/dashboard/admin/quizzes/${quiz.id}`}>Editar</a>
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
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()
  const { data: quizzes, isLoading: quizzesLoading } = usePublicQuizzes(isAuthenticated && isAdmin)

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

  const filteredQuizzes = (quizzes ?? []).filter((quiz) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      quiz.name?.toLowerCase().includes(term) ||
      quiz.subject?.name?.toLowerCase().includes(term) ||
      quiz.subjectUnit?.name?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="p-8 w-full mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Administración de Cuestionarios</h1>
        <div className="flex gap-2">
          <ImportQuizDialog />
          <CreateQuizDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuestionarios existentes</CardTitle>
          <CardDescription>Busca, edita, exporta o elimina cuestionarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          ) : searchTerm ? (
            <div className="text-center py-6">
              <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
              <p>No se encontraron resultados para &quot;{searchTerm}&quot;</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay cuestionarios todavía.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
