"use client"

import { useEffect, useState } from "react"
import { AlertCircleIcon, Search } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import PDFAccordionCard from "@/components/ui/PDFAccordionCard"
import { SubjectUnitPicker } from "@/components/ui/subject-unit-picker"
import {
  AuthorEmailsField,
  authorsSchema,
  emptyAuthors,
  toAuthorEmails,
} from "@/components/ui/author-emails-field"
import { useToast } from "@/hooks/use-toast";
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useCreatePdf, usePdfs } from "@/hooks/api/use-pdfs"
import { pdfMutationErrorMessage } from "@/lib/api/pdfs"

const createPdfSchema = z
  .object({
    name: z.string().min(1, "El título es obligatorio"),
    // FileList del <input type="file">; z.custom para no referenciar FileList en SSR.
    file: z
      .custom<FileList>()
      .refine((files) => files?.length === 1, "Selecciona un fichero PDF")
      .refine((files) => files?.[0]?.type === "application/pdf", "El fichero debe ser un PDF"),
    description: z.string().optional(),
    subjectId: z.number().nullable(),
    subjectUnitId: z.number().nullable(),
    authors: authorsSchema,
  })
  .refine((data) => data.subjectId != null, {
    message: "Selecciona una asignatura",
    path: ["subjectId"],
  })

type CreatePdfFormValues = z.infer<typeof createPdfSchema>

const emptyFormValues: CreatePdfFormValues = {
  name: "",
  file: undefined as unknown as FileList,
  description: "",
  subjectId: null,
  subjectUnitId: null,
  authors: emptyAuthors,
}

export default function AdminPdfsPage() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("")

  // Proteger esta ruta de administración
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute();

  const { data: pdfs, isLoading: pdfsLoading, isError: pdfsError } = usePdfs(isAuthenticated && isAdmin)
  const createPdf = useCreatePdf()

  useEffect(() => {
    if (pdfsError) {
      toast.error("Error al cargar los PDFs.")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfsError])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreatePdfFormValues>({
    resolver: zodResolver(createPdfSchema),
    defaultValues: emptyFormValues,
  })

  const subjectIdValue = watch("subjectId")
  const subjectUnitIdValue = watch("subjectUnitId")

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Si no está autenticado o no es admin, el hook maneja la redirección
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const filteredPdfs = (pdfs ?? []).filter((pdf) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      pdf.name?.toLowerCase().includes(term) ||
      pdf.description?.toLowerCase().includes(term) ||
      pdf.subject?.name?.toLowerCase().includes(term) ||
      pdf.subjectUnit?.name?.toLowerCase().includes(term) ||
      pdf.author?.toLowerCase().includes(term) ||
      pdf.coauthors?.some((coauthor) => coauthor.toLowerCase().includes(term))
    )
  })

  const onSubmit = async (values: CreatePdfFormValues) => {
    try {
      await createPdf.mutateAsync({
        data: {
          name: values.name,
          description: values.description || undefined,
          subjectId: values.subjectId as number,
          subjectUnitId: values.subjectUnitId,
          authorEmails: toAuthorEmails(values.authors),
        },
        file: values.file[0],
      })
      toast.success("PDF creado exitosamente.");
      reset(emptyFormValues)
    } catch (error) {
      toast.error(pdfMutationErrorMessage(error, "Error al crear el PDF."));
    }
  };

  return (
    <div className="p-8 w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6">Administración de Contenidos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Subir un nuevo PDF</CardTitle>
          <CardDescription>Completa el formulario para agregar un nuevo documento PDF a la plataforma.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="title">Título del documento</Label>
                <Input
                  id="title"
                  placeholder="Ej: Teorema de Pitágoras - Demostración y aplicaciones"
                  className="w-full"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pdfFile">Fichero PDF</Label>
                <Input
                  id="pdfFile"
                  type="file"
                  accept="application/pdf"
                  className="w-full cursor-pointer"
                  {...register("file")}
                />
                {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input id="description" className="w-full" {...register("description")} />
              </div>

              <AuthorEmailsField
                control={control}
                register={register}
                errors={errors.authors}
                idPrefix="new-pdf"
              />

              <Separator className="my-4" />

              <SubjectUnitPicker
                subjectId={subjectIdValue ?? null}
                subjectUnitId={subjectUnitIdValue ?? null}
                onSubjectChange={(id) => {
                  setValue("subjectId", id, { shouldValidate: true })
                  setValue("subjectUnitId", null)
                }}
                onSubjectUnitChange={(id) => setValue("subjectUnitId", id)}
              />
              {errors.subjectId && (
                <p className="text-sm text-destructive">{errors.subjectId.message}</p>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => reset(emptyFormValues)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} className="cursor-pointer" disabled={isSubmitting}>
            Subir PDF
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gestión de PDFs existentes</CardTitle>
          <CardDescription>Busca, edita o elimina documentos PDF ya subidos a la plataforma.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos por título, asignatura, tema o autor..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  className="absolute right-0 top-0 h-full rounded-l-none px-3"
                  onClick={() => setSearchTerm("")}
                >
                  <span className="sr-only">Borrar</span>
                  <span>×</span>
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {pdfsLoading ? (
                <p>Cargando PDFs...</p>
              ) : pdfsError ? (
                <p className="text-destructive">No se pudieron cargar los PDFs. Inténtalo de nuevo.</p>
              ) : filteredPdfs.length > 0 ? (
                filteredPdfs.map((pdf) => <PDFAccordionCard key={pdf.id} pdf={pdf} />)
              ) : searchTerm ? (
                <div className="text-center py-6">
                  <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                  <p>No se encontraron resultados para &quot;{searchTerm}&quot;</p>
                  <p className="text-sm text-muted-foreground mt-1">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <p>No hay PDFs existentes todavía.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
