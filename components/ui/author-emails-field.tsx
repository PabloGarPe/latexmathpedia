"use client"

import { Plus, X } from "lucide-react"
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Autores de un PDF tal cual los pide el back (CreatePDFDto/UpdatePDFDto.authorEmails): lista
// ordenada de emails de usuarios existentes, el primero es el autor principal y el resto
// coautores. useFieldArray necesita objetos, de ahí { email } en vez de string[].
export const authorsSchema = z
  .array(
    z.object({
      email: z.string().trim().min(1, "El email es obligatorio").email("Debe ser un email válido"),
    }),
  )
  .min(1, "Indica al menos el autor principal")
  .refine(
    (authors) => new Set(authors.map((a) => a.email.trim().toLowerCase())).size === authors.length,
    "Hay emails de autor repetidos",
  )

export type AuthorsFieldValues = { authors: { email: string }[] }

export const emptyAuthors: AuthorsFieldValues["authors"] = [{ email: "" }]

export function toAuthorEmails(authors: AuthorsFieldValues["authors"]): string[] {
  return authors.map((a) => a.email.trim())
}

type AuthorEmailsFieldProps<T extends AuthorsFieldValues> = {
  control: Control<T>
  register: UseFormRegister<T>
  errors?: FieldErrors<AuthorsFieldValues>["authors"]
  idPrefix: string
}

export function AuthorEmailsField<T extends AuthorsFieldValues>(props: AuthorEmailsFieldProps<T>) {
  // Los formularios que lo usan tienen más campos; aquí solo se toca "authors".
  const control = props.control as unknown as Control<AuthorsFieldValues>
  const register = props.register as unknown as UseFormRegister<AuthorsFieldValues>
  const { errors, idPrefix } = props
  const { fields, append, remove } = useFieldArray({ control, name: "authors" })

  return (
    <div className="grid gap-3">
      <div>
        <Label>Autores</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Emails de usuarios registrados. El primero es el autor principal.
        </p>
      </div>

      {fields.map((field, index) => {
        const id = `${idPrefix}-author-${index}`
        const fieldError = errors?.[index]?.email
        return (
          <div key={field.id} className="grid gap-1.5">
            <Label htmlFor={id} className="text-xs text-muted-foreground font-normal">
              {index === 0 ? "Autor principal" : `Coautor ${index}`}
            </Label>
            <div className="flex gap-2">
              <Input
                id={id}
                type="email"
                placeholder={index === 0 ? "autor@ejemplo.com" : "coautor@ejemplo.com"}
                className="w-full"
                {...register(`authors.${index}.email`)}
              />
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer shrink-0"
                  aria-label={`Quitar coautor ${index}`}
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError.message}</p>}
          </div>
        )
      })}

      {/* Errores de la lista entera (vacía, repetidos): zod los cuelga de "root" o del propio array */}
      {(errors?.root?.message ?? errors?.message) && (
        <p className="text-sm text-destructive">{errors?.root?.message ?? errors?.message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer w-fit"
        onClick={() => append({ email: "" })}
      >
        <Plus className="h-4 w-4" />
        Añadir coautor
      </Button>
    </div>
  )
}
