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

type SubjectUnitPickerProps = {
  subjectId: number | null
  subjectUnitId: number | null
  onSubjectChange: (subjectId: number | null) => void
  onSubjectUnitChange: (subjectUnitId: number | null) => void
}

// Combobox de Asignatura/Tema alimentado por Subject/SubjectUnit (useSubjects/useSubjectUnits),
// reemplaza al objeto `categories` hardcodeado que antes vivía duplicado en el admin de PDFs
// y en PDFAccordionCard.
export function SubjectUnitPicker({
  subjectId,
  subjectUnitId,
  onSubjectChange,
  onSubjectUnitChange,
}: SubjectUnitPickerProps) {
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [unitOpen, setUnitOpen] = useState(false)

  const { data: subjects } = useSubjects()
  const { data: units } = useSubjectUnits(subjectId)

  const selectedSubject = subjects?.find((subject) => subject.id === subjectId)
  const selectedUnit = units?.find((unit) => unit.id === subjectUnitId)

  return (
    <div className="md:flex md:flex-row md:gap-6">
      <div className="flex-1 grid gap-2 mb-4 md:mb-0">
        <Label>Asignatura</Label>
        <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={subjectOpen}
              className="w-full justify-between cursor-pointer"
            >
              {selectedSubject?.name || "Selecciona una asignatura"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar asignatura..." />
              <CommandList>
                <CommandEmpty>No se encontraron asignaturas.</CommandEmpty>
                <CommandGroup>
                  {subjects?.map((subject) => (
                    <CommandItem
                      key={subject.id}
                      value={subject.name}
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

      <div className="flex-1 grid gap-2">
        <Label>Tema (opcional)</Label>
        <Popover open={unitOpen && subjectId != null} onOpenChange={setUnitOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={unitOpen}
              className="w-full justify-between cursor-pointer"
              disabled={subjectId == null}
            >
              {selectedUnit?.name ||
                (subjectId != null ? "General (sin tema)" : "Primero selecciona una asignatura")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar tema..." />
              <CommandList>
                <CommandEmpty>No se encontraron temas.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={GENERAL_UNIT_VALUE}
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
                      value={unit.name}
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
