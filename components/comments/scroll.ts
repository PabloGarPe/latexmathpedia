export const COMMENTS_SECTION_ID = "comments"

// Baja hasta la sección de comentarios. `smooth` respeta prefers-reduced-motion. El margen que
// deja la cabecera fija lo pone el `scroll-mt` de la propia sección.
export function scrollToCommentsSection(smooth: boolean): boolean {
  const el = document.getElementById(COMMENTS_SECTION_ID)
  if (!el) return false
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" })
  return true
}
