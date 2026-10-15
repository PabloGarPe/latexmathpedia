// Color de acento por asignatura. El backend no guarda color, así que se deriva del id: la misma
// asignatura se ve igual en el catálogo y en su ficha. Las clases van escritas enteras (no
// construidas) para que Tailwind las detecte.
export type SubjectTheme = {
  // Fondo degradado de cabeceras y tarjetas.
  gradient: string
  // Icono grande decorativo del fondo.
  watermark: string
  // Recuadro del icono principal.
  tile: string
  // Píldora de color (contadores, número de tema).
  chip: string
  // Barra lateral del tema abierto (sobre un elemento con `before:`).
  bar: string
  // Color del texto al pasar el ratón por el título.
  hoverText: string
}

const THEMES: SubjectTheme[] = [
  {
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent dark:from-violet-500/30 dark:via-violet-500/10",
    watermark: "text-violet-500/15",
    tile: "bg-violet-500 text-white",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    bar: "data-[state=open]:before:bg-violet-500",
    hoverText: "group-hover:text-violet-600 dark:group-hover:text-violet-300",
  },
  {
    gradient: "from-sky-500/20 via-sky-500/10 to-transparent dark:from-sky-500/30 dark:via-sky-500/10",
    watermark: "text-sky-500/15",
    tile: "bg-sky-500 text-white",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "data-[state=open]:before:bg-sky-500",
    hoverText: "group-hover:text-sky-600 dark:group-hover:text-sky-300",
  },
  {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-500/30 dark:via-emerald-500/10",
    watermark: "text-emerald-500/15",
    tile: "bg-emerald-500 text-white",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    bar: "data-[state=open]:before:bg-emerald-500",
    hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-300",
  },
  {
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent dark:from-amber-500/30 dark:via-amber-500/10",
    watermark: "text-amber-500/15",
    tile: "bg-amber-500 text-white",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bar: "data-[state=open]:before:bg-amber-500",
    hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-300",
  },
  {
    gradient: "from-rose-500/20 via-rose-500/10 to-transparent dark:from-rose-500/30 dark:via-rose-500/10",
    watermark: "text-rose-500/15",
    tile: "bg-rose-500 text-white",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    bar: "data-[state=open]:before:bg-rose-500",
    hoverText: "group-hover:text-rose-600 dark:group-hover:text-rose-300",
  },
  {
    gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent dark:from-cyan-500/30 dark:via-cyan-500/10",
    watermark: "text-cyan-500/15",
    tile: "bg-cyan-500 text-white",
    chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    bar: "data-[state=open]:before:bg-cyan-500",
    hoverText: "group-hover:text-cyan-600 dark:group-hover:text-cyan-300",
  },
]

export function getSubjectTheme(subjectId: number | undefined): SubjectTheme {
  const index = Math.abs(subjectId ?? 0) % THEMES.length
  return THEMES[index]
}
