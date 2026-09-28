"use client"

import { useState } from "react"
import { AlertCircleIcon, Search } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SubjectAccordionCard } from "@/components/ui/SubjectAccordionCard"
import { useToast } from "@/hooks/use-toast"
import { useAdminRoute } from "@/hooks/use-protected-route"
import { useCreateSubject, useSubjects } from "@/hooks/api/use-subjects"
import { conflictMessage } from "@/lib/api/errors"

const createSubjectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
})

type CreateSubjectFormValues = z.infer<typeof createSubjectSchema>

const emptyFormValues: CreateSubjectFormValues = {
  name: "",
  description: "",
}

export default function AdminSubjectsPage() {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  // Proteger esta ruta de administración
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminRoute()

  const { data: subjects, isLoading: subjectsLoading } = useSubjects()
  const createSubject = useCreateSubject()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubjectFormValues>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: emptyFormValues,
  })

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Si no está autenticado o no es admin, el hook maneja la redirección
  if (!isAuthenticated || !isAdmin) {
    return null
  }

  const filteredSubjects = (subjects ?? []).filter((subject) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      subject.name?.toLowerCase().includes(term) ||
      subject.description?.toLowerCase().includes(term)
    )
  })

  const onSubmit = async (values: CreateSubjectFormValues) => {
    try {
      await createSubject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
      })
      toast.success("Asignatura creada exitosamente.")
      reset(emptyFormValues)
    } catch (error) {
      toast.error(conflictMessage(error, "Error al crear la asignatura."))
    }
  }

  return (
    <div className="p-8 w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6">Administración de Asignaturas</h1>
      <Card>
        <CardHeader>
          <CardTitle>Crear una nueva asignatura</CardTitle>
          <CardDescription>Completa el formulario para añadir una asignatura al catálogo.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej: Cálculo Diferencial e Integral"
                className="w-full"
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input id="description" className="w-full" {...register("description")} />
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
            Crear asignatura
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gestión de asignaturas existentes</CardTitle>
          <CardDescription>Busca, edita o elimina asignaturas y sus temas.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar asignaturas por nombre o descripción..."
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
              {subjectsLoading ? (
                <p>Cargando asignaturas...</p>
              ) : filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <SubjectAccordionCard key={subject.id} subject={subject} />
                ))
              ) : searchTerm ? (
                <div className="text-center py-6">
                  <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                  <p>No se encontraron resultados para &quot;{searchTerm}&quot;</p>
                  <p className="text-sm text-muted-foreground mt-1">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <p>No hay asignaturas existentes todavía.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
