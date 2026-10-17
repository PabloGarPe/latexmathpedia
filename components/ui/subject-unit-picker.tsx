"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useSubjects, useSubjectUnits } from "@/hooks/api/use-subjects"

const GENERAL_UNIT_VALUE = "__general__"

// Búsqueda sin distinguir mayúsculas ni acentos ("calculo" encuentra "Cálculo"), todas las palabras
// del texto buscado deben aparecer. cmdk puntúa `value` + `keywords`; aquí el `value` es el id (único)
// y solo se busca en `keywords` (el nombre), así que escribir "3" no filtra por el id.
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

function searchByName(_value: string, search: string, keywords?: string[]): number {
  const haystack = normalize((keywords ?? []).join(" "))
  return normalize(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
    ? 1
    : 0
}

// Dentro de un Dialog modal de Radix, `modal` en el Popover hace que este tenga su propio bloqueo de
// scroll (react-remove-scroll con el contenido del popover como "shard"). Sin él, el del Dialog
// bloquea la rueda y el táctil sobre la lista del popover (que se pinta en un portal, fuera del
// Dialog) y solo se podría elegir con el teclado lo que cabe sin scroll.
// El ancho sigue al del botón, y la lista nunca pasa del alto disponible en pantalla.
const POPOVER_CONTENT_CLASS = "w-(--radix-popover-trigger-width) min-w-56 p-0"
const LIST_CLASS = "max-h-[min(18rem,var(--radix-popover-content-available-height))]"

type SubjectUnitPickerProps = {
  subjectId: number | null
  subjectUnitId: number | null
  onSubjectChange: (subjectId: number | null) => void
  onSubjectUnitChange: (subjectUnitId: number | null) => void
  // Asignatura y tema en columna también en pantallas anchas (para contenedores estrechos, como una
  // tarjeta lateral). Por defecto van en fila desde `md`.
  stacked?: boolean
}

// Combobox de Asignatura/Tema alimentado por Subject/SubjectUnit (useSubjects/useSubjectUnits),
// reemplaza al objeto `categories` hardcodeado que antes vivía duplicado en el admin de PDFs
// y en PDFAccordionCard.
export function SubjectUnitPicker({
  subjectId,
  subjectUnitId,
  onSubjectChange,
  onSubjectUnitChange,
  stacked = false,
}: SubjectUnitPickerProps) {
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [unitOpen, setUnitOpen] = useState(false)

  const { data: subjects } = useSubjects()
  const { data: units } = useSubjectUnits(subjectId)

  const selectedSubject = subjects?.find((subject) => subject.id === subjectId)
  const selectedUnit = units?.find((unit) => unit.id === subjectUnitId)

  return (
    <div className={cn(stacked ? "grid grid-cols-[minmax(0,1fr)] gap-4" : "md:flex md:flex-row md:gap-6")}>
      <div className={cn("min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)] gap-2", !stacked && "mb-4 md:mb-0")}>
        <Label>Asignatura</Label>
        <Popover modal open={subjectOpen} onOpenChange={setSubjectOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={subjectOpen}
              className="w-full justify-between cursor-pointer"
            >
              <span className="truncate">{selectedSubject?.name || "Selecciona una asignatura"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={POPOVER_CONTENT_CLASS}>
            <Command filter={searchByName}>
              <CommandInput placeholder="Buscar asignatura..." />
              <CommandList className={LIST_CLASS}>
                <CommandEmpty>No se encontraron asignaturas.</CommandEmpty>
                <CommandGroup>
                  {subjects?.map((subject) => (
                    <CommandItem
                      key={subject.id}
                      value={String(subject.id)}
                      keywords={[subject.name ?? ""]}
                      onSelect={() => {
                        onSubjectChange(subject.id ?? null)
                        onSubjectUnitChange(null)
                        setSubjectOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          subjectId === subject.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {subject.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)] gap-2">
        <Label>Tema (opcional)</Label>
        <Popover modal open={unitOpen && subjectId != null} onOpenChange={setUnitOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={unitOpen}
              className="w-full justify-between cursor-pointer"
              disabled={subjectId == null}
            >
              <span className="truncate">
                {selectedUnit?.name ||
                  (subjectId != null ? "General (sin tema)" : "Primero selecciona una asignatura")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={POPOVER_CONTENT_CLASS}>
            <Command filter={searchByName}>
              <CommandInput placeholder="Buscar tema..." />
              <CommandList className={LIST_CLASS}>
                <CommandEmpty>No se encontraron temas.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={GENERAL_UNIT_VALUE}
                    keywords={["general", "sin tema"]}
                    onSelect={() => {
                      onSubjectUnitChange(null)
                      setUnitOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", subjectUnitId == null ? "opacity-100" : "opacity-0")}
                    />
                    General (sin tema)
                  </CommandItem>
                  {units?.map((unit) => (
                    <CommandItem
                      key={unit.id}
                      value={String(unit.id)}
                      keywords={[unit.name ?? ""]}
                      onSelect={() => {
                        onSubjectUnitChange(unit.id ?? null)
                        setUnitOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          subjectUnitId === unit.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {unit.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
