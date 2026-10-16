import type { DegreeDto } from "@/lib/api/degrees";
import type { SubjectPlacementInfoDto } from "@/lib/api/subjects";

// Textos y formato de grados, años y cuatrimestres, compartidos por formularios, badges, plan
// de estudios y perfil. Un año es un entero 1..years; el cuatrimestre, 1, 2 o null (anual o sin
// especificar).

export type Semester = 1 | 2 | null;

// "4.º"
export function formatYear(year: number): string {
  return `${year}.º`;
}

// "4.º curso"
export function formatYearLong(year: number): string {
  return `${formatYear(year)} curso`;
}

// Corto para badges: "1C" / "2C" / "Anual".
export function formatSemesterShort(semester: number | null | undefined): string {
  return semester === 1 || semester === 2 ? `${semester}C` : "Anual";
}

// Largo: "1.er cuatrimestre" / "2.º cuatrimestre" / "Anual".
export function formatSemesterLong(semester: number | null | undefined): string {
  if (semester === 1) return "1.er cuatrimestre";
  if (semester === 2) return "2.º cuatrimestre";
  return "Anual";
}

// Opciones del selector de cuatrimestre del formulario (null = anual / sin especificar). Los
// Select de shadcn trabajan con strings: SEMESTER_ANNUAL representa null.
export const SEMESTER_ANNUAL = "annual";
export const SEMESTER_OPTIONS: { value: string; label: string; semester: Semester }[] = [
  { value: SEMESTER_ANNUAL, label: "Anual / sin especificar", semester: null },
  { value: "1", label: "1.er cuatrimestre", semester: 1 },
  { value: "2", label: "2.º cuatrimestre", semester: 2 },
];

export function semesterFromValue(value: string): Semester {
  return value === "1" ? 1 : value === "2" ? 2 : null;
}

export function semesterToValue(semester: number | null | undefined): string {
  return semester === 1 || semester === 2 ? String(semester) : SEMESTER_ANNUAL;
}

// 1..years
export function degreeYears(degree: Pick<DegreeDto, "years"> | null | undefined): number[] {
  const years = degree?.years ?? 0;
  return Array.from({ length: years }, (_, index) => index + 1);
}

// "Grado en Matemáticas (Universidad de Oviedo)"; sin universidad, solo el nombre. Hay grados
// homónimos en universidades distintas: la universidad los distingue.
export function formatDegree(degree: Pick<DegreeDto, "name" | "university"> | null | undefined): string {
  if (!degree?.name) return "";
  return degree.university ? `${degree.name} (${degree.university})` : degree.name;
}

// "Grado en Matemáticas · 4.º · 1C"
export function formatPlacement(placement: SubjectPlacementInfoDto): string {
  const parts = [placement.degreeName ?? "Grado"];
  if (placement.year != null) parts.push(formatYear(placement.year));
  parts.push(formatSemesterShort(placement.semester));
  return parts.join(" · ");
}

// Ruta del plan de estudios (con ancla al año, si se indica).
export function curriculumHref(degreeId: number, year?: number | null): string {
  return year != null ? `/dashboard/degrees/${degreeId}#year-${year}` : `/dashboard/degrees/${degreeId}`;
}
