"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSubjectUnits } from "@/hooks/api/use-subjects"

const GENERAL = "__general__"

// Selector compacto de tema de una asignatura ya elegida (el combobox de
// SubjectUnitPicker es demasiado grande para repetirlo por cada fichero de una cola).
export function UnitSelect({
  subjectId,
  value,
  onChange,
  id,
}: {
  subjectId: number | null
  value: number | null
  onChange: (unitId: number | null) => void
  id?: string
}) {
  const { data: units } = useSubjectUnits(subjectId)

  return (
    <Select
      value={value == null ? GENERAL : String(value)}
      onValueChange={(next) => onChange(next === GENERAL ? null : Number(next))}
      disabled={subjectId == null}
    >
      <SelectTrigger id={id} className="w-full cursor-pointer">
        <SelectValue placeholder="General (sin tema)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GENERAL}>General (sin tema)</SelectItem>
        {units?.map((unit) => (
          <SelectItem key={unit.id} value={String(unit.id)}>
            {unit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
