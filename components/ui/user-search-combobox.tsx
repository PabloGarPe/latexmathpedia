"use client"

import { useId, useRef, useState } from "react"
import { AlertCircle, Loader2, Plus, Search, UserSearch } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { useUserSearch } from "@/hooks/api/use-users"
import { USER_SEARCH_MIN_CHARS } from "@/lib/api/users"
import { cn } from "@/lib/utils"

// Un usuario elegible: el email es lo que se envía al back; el resto (lo que devuelve
// GET /users/search) es solo para pintarlo. Sin username = no ha completado el perfil.
export type UserOption = {
  email: string
  id?: number | null
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  hasAvatar?: boolean | null
  avatarUpdatedAt?: string | null
}

export const fullNameOf = (user: Pick<UserOption, "firstName" | "lastName">) =>
  [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")

// Cómo se rotula a un usuario en las vistas del admin. Aquí sí se permite el email (es el
// buscador del admin y es lo que se envía): principal = username (o el email si no tiene
// perfil); secundario = "Nombre Apellidos" y el email cuando no es ya el principal.
export function describeUser(user: UserOption) {
  const username = user.username?.trim()
  const secondary = [fullNameOf(user), username ? user.email : ""].filter(Boolean).join(" · ")
  return { primary: username || user.email, secondary: secondary || null }
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

type Suggestion = UserOption & { manual?: boolean }

// Buscador de usuarios registrados (GET /users/search, solo admin) con desplegable de
// sugerencias. Teclado: ↑↓ para moverse, Intro para añadir, Esc para cerrar. No guarda la
// selección: llama a `onSelect` y quien lo usa decide qué hacer (autores de un PDF,
// destinatarios de un aviso…). `taken` son los emails (en minúsculas) que ya no se ofrecen.
export function UserSearchCombobox({
  id,
  taken,
  onSelect,
  invalid,
  placeholder = "Buscar por usuario, nombre o email…",
}: {
  id: string
  taken: ReadonlySet<string>
  onSelect: (user: UserOption) => void
  invalid?: boolean
  placeholder?: string
}) {
  const listId = useId()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const [activeEmail, setActiveEmail] = useState<string | null>(null)

  const search = useUserSearch(text)
  const term = text.trim()

  const results: Suggestion[] = (search.data ?? [])
    .filter((user) => user.email && !taken.has(user.email.toLowerCase()))
    .map((user) => ({
      email: user.email as string,
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      hasAvatar: user.hasAvatar,
    }))
  const hiddenByTaken = (search.data?.length ?? 0) - results.length

  // Si el buscador falla (sin conexión, sin permisos…) se deja añadir un email escrito a mano:
  // el back lo validará al guardar.
  const manual: Suggestion[] =
    search.isError && EMAIL_PATTERN.test(term) && !taken.has(term.toLowerCase())
      ? [{ email: term, manual: true }]
      : []
  const options = manual.length > 0 ? manual : results

  const activeIndex = Math.max(0, options.findIndex((option) => option.email === activeEmail))
  const busy = search.waiting || search.isFetching
  const showSkeleton = search.canSearch && busy && !search.data

  const add = (option: Suggestion) => {
    const { manual: _manual, ...user } = option
    onSelect({ ...user, email: option.email.trim() })
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={text}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].email}` : undefined}
            aria-invalid={invalid ? true : undefined}
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
              Escribe al menos {USER_SEARCH_MIN_CHARS} letras del usuario, el nombre o el email.
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
                  <UserAvatar user={option} fallbackLabel={option.email} />
                  <div className="min-w-0 flex-1">
                    {option.manual ? (
                      <>
                        <p className="truncate text-sm font-medium">Añadir «{option.email}»</p>
                        <p className="truncate text-xs text-muted-foreground">Sin comprobar que exista</p>
                      </>
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium">
                          <Highlight text={option.username?.trim() || option.email} term={term} />
                        </p>
                        {(fullNameOf(option) || option.username?.trim()) && (
                          <p className="truncate text-xs text-muted-foreground">
                            {fullNameOf(option) && <Highlight text={fullNameOf(option)} term={term} />}
                            {fullNameOf(option) && option.username?.trim() && " · "}
                            {option.username?.trim() && <Highlight text={option.email} term={term} />}
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
