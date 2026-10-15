"use client"

import { useId, useMemo, useRef, useState } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import { AlertCircle, Loader2, Plus, Search, Star, UserSearch, X } from "lucide-react"
import { useController, type Control, type FieldErrors } from "react-hook-form"
import { z } from "zod"
import { SortableList, SortableRow } from "@/components/admin/quiz-editor/sortable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserSearch } from "@/hooks/api/use-users"
import { USER_SEARCH_MIN_CHARS } from "@/lib/api/users"
import { cn } from "@/lib/utils"

// Autores de un PDF tal cual los pide el back (CreatePDFDto/UpdatePDFDto.authorEmails): lista
// ordenada de emails de usuarios existentes, el primero es el autor principal y el resto
// coautores. Además del email se guarda el nombre (solo para pintarlo; no se envía).
const authorSchema = z.object({
  email: z.string().trim().min(1, "El email es obligatorio").email("Debe ser un email válido"),
  name: z.string().nullish(),
})

const noRepeats = (authors: { email: string }[]) =>
  new Set(authors.map((a) => a.email.trim().toLowerCase())).size === authors.length

export const authorsSchema = z
  .array(authorSchema)
  .min(1, "Indica al menos el autor principal")
  .refine(noRepeats, "Hay autores repetidos")

// Autores propios de un fichero de la cola de subida: lista vacía = usa los del lote.
export const ownAuthorsSchema = z.array(authorSchema).refine(noRepeats, "Hay autores repetidos")

export type AuthorValue = { email: string; name?: string | null }
export type AuthorsFieldValues = { authors: AuthorValue[] }

export const emptyAuthors: AuthorValue[] = []

export function toAuthorEmails(authors: AuthorValue[]): string[] {
  return authors.map((a) => a.email.trim())
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// El back busca sin distinguir mayúsculas ni tildes: el resaltado hace lo mismo, letra a letra
// para que los índices coincidan con el texto original.
const fold = (text: string) =>
  text
    .split("")
    .map((char) => char.normalize("NFD")[0].toLowerCase())
    .join("")

function Highlight({ text, term }: { text: string; term: string }) {
  const needle = fold(term.trim())
  const index = needle ? fold(text).indexOf(needle) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  )
}

// Un color estable por persona, para reconocerla de un vistazo (clases completas: Tailwind las
// necesita escritas tal cual).
const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
]

function AuthorAvatar({ author, className }: { author: AuthorValue; className?: string }) {
  const label = (author.name?.trim() || author.email).charAt(0).toUpperCase()
  const hash = [...author.email].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        AVATAR_TONES[hash % AVATAR_TONES.length],
        className,
      )}
    >
      {label}
    </span>
  )
}

type Suggestion = AuthorValue & { manual?: boolean }

type AuthorEmailsFieldProps<T extends AuthorsFieldValues> = {
  control: Control<T>
  errors?: FieldErrors<AuthorsFieldValues>["authors"]
  idPrefix: string
  // Ruta de la lista dentro del formulario ("authors" por defecto; p. ej. "items.0.authors"
  // para los autores propios de un fichero de la cola de subida).
  name?: string
}

// Elegir autores buscando por nombre o email entre los usuarios registrados (GET /users/search,
// solo admin). Teclado: ↑↓ para moverse, Intro para añadir, Esc para cerrar.
export function AuthorEmailsField<T extends AuthorsFieldValues>(props: AuthorEmailsFieldProps<T>) {
  // Los formularios que lo usan tienen más campos; aquí solo se toca "authors".
  const control = props.control as unknown as Control<AuthorsFieldValues>
  const { errors, idPrefix } = props
  const name = (props.name ?? "authors") as "authors"
  const { field } = useController({ control, name })
  const authors: AuthorValue[] = field.value ?? []

  const searchId = `${idPrefix}-author-search`
  const listId = useId()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const [activeEmail, setActiveEmail] = useState<string | null>(null)

  const search = useUserSearch(text)
  const term = text.trim()
  const taken = useMemo(() => new Set(authors.map((a) => a.email.trim().toLowerCase())), [authors])

  const results: Suggestion[] = (search.data ?? [])
    .filter((user) => user.email && !taken.has(user.email.toLowerCase()))
    .map((user) => ({ email: user.email as string, name: user.name }))
  const hiddenByTaken = (search.data?.length ?? 0) - results.length

  // Si el buscador falla (sin conexión, sin permisos…) se deja añadir un email escrito a mano:
  // el back lo validará al guardar.
  const manual: Suggestion[] =
    search.isError && EMAIL_PATTERN.test(term) && !taken.has(term.toLowerCase())
      ? [{ email: term, name: null, manual: true }]
      : []
  const options = manual.length > 0 ? manual : results

  const activeIndex = Math.max(0, options.findIndex((option) => option.email === activeEmail))
  const busy = search.waiting || search.isFetching
  const showSkeleton = search.canSearch && busy && !search.data

  const move = (from: number, to: number) => field.onChange(arrayMove(authors, from, to))
  const remove = (index: number) => field.onChange(authors.filter((_, i) => i !== index))

  const add = (option: Suggestion) => {
    field.onChange([...authors, { email: option.email.trim(), name: option.name ?? null }])
    setText("")
    setActiveEmail(null)
    setOpen(false)
  }

  const step = (delta: number) => {
    if (options.length === 0) return
    const next = options[(activeIndex + delta + options.length) % options.length]
    setActiveEmail(next.email)
    document.getElementById(`${listId}-${next.email}`)?.scrollIntoView({ block: "nearest" })
  }

  const rootError = errors?.root?.message ?? errors?.message

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor={searchId}>Autores</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Busca por nombre o email entre los usuarios registrados. El primero es el autor principal.
        </p>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              value={text}
              autoComplete="off"
              spellCheck={false}
              placeholder="Buscar por nombre o email…"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].email}` : undefined}
              aria-invalid={rootError ? true : undefined}
              className="pl-9 pr-9"
              onChange={(event) => {
                setText(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault()
                  if (!open) setOpen(true)
                  else step(event.key === "ArrowDown" ? 1 : -1)
                } else if (event.key === "Enter") {
                  // Dentro de un formulario, Intro no debe enviarlo.
                  event.preventDefault()
                  if (open && options[activeIndex]) add(options[activeIndex])
                }
              }}
            />
            {busy && search.canSearch && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-1"
          // El foco se queda en el campo: ni al abrir, ni al cerrar, ni al pulsar una sugerencia.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
          }}
        >
          <div id={listId} role="listbox" aria-label="Usuarios encontrados" className="max-h-64 overflow-y-auto">
            {!search.canSearch ? (
              <Hint icon={UserSearch}>
                Escribe al menos {USER_SEARCH_MIN_CHARS} letras del nombre o del email.
              </Hint>
            ) : showSkeleton ? (
              <div className="space-y-1 p-1" aria-label="Buscando…">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-1 py-1.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : search.isError && manual.length === 0 ? (
              <Hint icon={AlertCircle}>
                No se pudo buscar ahora mismo. Si escribes el email completo podrás añadirlo igualmente.
              </Hint>
            ) : options.length === 0 ? (
              <Hint icon={UserSearch}>
                {hiddenByTaken > 0
                  ? "Ya has añadido a todos los usuarios que coinciden."
                  : busy
                    ? "Buscando…"
                    : `Nadie coincide con «${term}». Solo se pueden añadir usuarios registrados.`}
              </Hint>
            ) : (
              <div className={cn("transition-opacity", busy && "opacity-60")}>
                {options.map((option, index) => (
                  <div
                    key={option.email}
                    id={`${listId}-${option.email}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveEmail(option.email)}
                    onClick={() => add(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                      index === activeIndex && "bg-accent",
                    )}
                  >
                    <AuthorAvatar author={option} />
                    <div className="min-w-0 flex-1">
                      {option.manual ? (
                        <>
                          <p className="truncate text-sm font-medium">Añadir «{option.email}»</p>
                          <p className="truncate text-xs text-muted-foreground">Sin comprobar que exista</p>
                        </>
                      ) : (
                        <>
                          <p className="truncate text-sm font-medium">
                            <Highlight text={option.name || option.email} term={term} />
                          </p>
                          {option.name && (
                            <p className="truncate text-xs text-muted-foreground">
                              <Highlight text={option.email} term={term} />
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <Plus
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-opacity",
                        index === activeIndex ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

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
              const display = author.name?.trim() || author.email
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
                        <AuthorAvatar author={author} />
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
                          {author.name && (
                            <p className="truncate text-xs text-muted-foreground">{author.email}</p>
                          )}
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

function Hint({ icon: Icon, children }: { icon: typeof UserSearch; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-3 text-sm text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
