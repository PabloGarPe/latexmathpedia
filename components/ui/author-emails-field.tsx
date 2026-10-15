"use client"

import { useMemo } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import { Star, X } from "lucide-react"
import { useController, type Control, type FieldErrors } from "react-hook-form"
import { z } from "zod"
import { SortableList, SortableRow } from "@/components/admin/quiz-editor/sortable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { describeUser, UserSearchCombobox, type UserOption } from "@/components/ui/user-search-combobox"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

// Autores de un PDF tal cual los pide el back (CreatePDFDto/UpdatePDFDto.authorEmails): lista
// ordenada de emails de usuarios existentes, el primero es el autor principal y el resto
// coautores. Además del email se guardan los datos de perfil (solo para pintarlo; no se envían).
const authorSchema = z.object({
  email: z.string().trim().min(1, "El email es obligatorio").email("Debe ser un email válido"),
  id: z.number().nullish(),
  username: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  hasAvatar: z.boolean().nullish(),
  avatarUpdatedAt: z.string().nullish(),
})

const noRepeats = (authors: { email: string }[]) =>
  new Set(authors.map((a) => a.email.trim().toLowerCase())).size === authors.length

export const authorsSchema = z
  .array(authorSchema)
  .min(1, "Indica al menos el autor principal")
  .refine(noRepeats, "Hay autores repetidos")

// Autores propios de un fichero de la cola de subida: lista vacía = usa los del lote.
export const ownAuthorsSchema = z.array(authorSchema).refine(noRepeats, "Hay autores repetidos")

export type AuthorValue = UserOption
export type AuthorsFieldValues = { authors: AuthorValue[] }

export const emptyAuthors: AuthorValue[] = []

export function toAuthorEmails(authors: AuthorValue[]): string[] {
  return authors.map((a) => a.email.trim())
}

type AuthorEmailsFieldProps<T extends AuthorsFieldValues> = {
  control: Control<T>
  errors?: FieldErrors<AuthorsFieldValues>["authors"]
  idPrefix: string
  // Ruta de la lista dentro del formulario ("authors" por defecto; p. ej. "items.0.authors"
  // para los autores propios de un fichero de la cola de subida).
  name?: string
}

// Elegir autores buscando por usuario, nombre o email entre los usuarios registrados (GET /users/search,
// solo admin). Teclado: ↑↓ para moverse, Intro para añadir, Esc para cerrar.
export function AuthorEmailsField<T extends AuthorsFieldValues>(props: AuthorEmailsFieldProps<T>) {
  // Los formularios que lo usan tienen más campos; aquí solo se toca "authors".
  const control = props.control as unknown as Control<AuthorsFieldValues>
  const { errors, idPrefix } = props
  const name = (props.name ?? "authors") as "authors"
  const { field } = useController({ control, name })
  const authors: AuthorValue[] = field.value ?? []

  const searchId = `${idPrefix}-author-search`
  const taken = useMemo(() => new Set(authors.map((a) => a.email.trim().toLowerCase())), [authors])

  const move = (from: number, to: number) => field.onChange(arrayMove(authors, from, to))
  const remove = (index: number) => field.onChange(authors.filter((_, i) => i !== index))

  const rootError = errors?.root?.message ?? errors?.message

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor={searchId}>Autores</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Busca por usuario, nombre o email entre los usuarios registrados. El primero es el autor principal.
        </p>
      </div>

      <UserSearchCombobox
        id={searchId}
        taken={taken}
        invalid={!!rootError}
        onSelect={(user) => field.onChange([...authors, user])}
      />

      {authors.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          Todavía no hay autores. El primero que añadas será el principal.
        </p>
      ) : (
        <SortableList
          ids={authors.map((a) => a.email.trim().toLowerCase())}
          onReorder={(activeId, overId) => {
            const ids = authors.map((a) => a.email.trim().toLowerCase())
            move(ids.indexOf(activeId), ids.indexOf(overId))
          }}
        >
          <div className="space-y-2">
            {authors.map((author, index) => {
              const { primary: display, secondary } = describeUser(author)
              const fieldError = errors?.[index]?.email
              return (
                <div key={author.email.trim().toLowerCase()} className="grid gap-1">
                  <SortableRow id={author.email.trim().toLowerCase()} label={display}>
                    {({ handle, dragging }) => (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border bg-card py-1.5 pr-1.5 transition-shadow animate-in fade-in-0 slide-in-from-top-1 duration-200",
                          authors.length > 1 ? "pl-1" : "pl-2.5",
                          index === 0 && "border-primary/40 bg-primary/5",
                          dragging && "shadow-lg",
                        )}
                      >
                        {authors.length > 1 && handle}
                        <UserAvatar user={author} fallbackLabel={author.email} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{display}</p>
                            <Badge
                              variant={index === 0 ? "default" : "secondary"}
                              className="shrink-0 px-2 py-0 text-[10px] font-medium"
                            >
                              {index === 0 ? "Principal" : "Coautor"}
                            </Badge>
                          </div>
                          {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
                        </div>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-amber-500"
                            aria-label={`Hacer autor principal a ${display}`}
                            title="Hacer autor principal"
                            onClick={() => move(index, 0)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Quitar a ${display}`}
                          title="Quitar"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </SortableRow>
                  {fieldError && <p className="text-sm text-destructive">{fieldError.message}</p>}
                </div>
              )
            })}
          </div>
        </SortableList>
      )}

      {/* Errores de la lista entera (vacía, repetidos): zod los cuelga de "root" o del propio array */}
      {rootError && <p className="text-sm text-destructive">{rootError}</p>}
    </div>
  )
}
