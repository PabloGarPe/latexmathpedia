# CLAUDE.md — Mathtexpedia Frontend

Guía para agentes/IA que trabajen en este repo. Contexto que **no** se deduce del código.

## Qué es
Frontend de Mathtexpedia (repositorio de apuntes universitarios de la UniOvi: PDFs + blog MDX + chatbot, y próximamente cuestionarios). Next.js App Router.

## Stack
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict).
- **Tailwind v4** + **shadcn/ui** (estilo `new-york`, baseColor `zinc`) en `components/ui/`.
- `next-themes`, `react-hot-toast`, `lucide-react` / `react-icons`.
- Blog en **MDX** (`content/posts/*.mdx`) vía `next-mdx-remote`, con `remark-math` + `rehype-katex` (KaTeX) y `remark-gfm`. Componentes MDX propios en `components/mdx/`.
- Alias de imports: `@/*` → raíz del repo.
- `NEXT_PUBLIC_API_URL` = base del backend (dev: `http://localhost:8081`).

## Comandos
- `npm run dev` (Turbopack) · `npm run build` · `npm run lint`.

## Estado de la migración
La migración al backend nuevo (Subjects/Units, PDFs, Quizzes, perfil, Keycloak) está
**completa**, incluidos los PDFs servidos desde S3: el catálogo (`GET /public/pdf/no-link`)
solo trae metadatos y el binario se pide autenticado a `GET /pdf/{pdfId}`, que se pinta en
`<canvas>` con pdf.js en `/dashboard/pdfs/[pdfId]` (`components/pdf-viewer.tsx`). El visor
no ofrece descarga ni impresión; es disuasorio, no DRM (los bytes llegan al navegador).

Puntos clave a tener presente:
- Contrato del backend documentado en `api-docs.json` (OpenAPI 3.1, servidor `http://localhost:8081`); es la fuente de verdad, y `lib/api/schema.d.ts` se genera de ahí (`npm run api:types`, no editar a mano).
- Los DTOs son **camelCase y planos** (`PDFDto`, `SubjectDto`, `QuizDto`…).
- Auth: dos modos por `NEXT_PUBLIC_AUTH_MODE` (`mock` por defecto, `keycloak` para producción/real) detrás de la misma interfaz `useAuth()` — ver `contexts/auth-context.tsx`.
- La categorización usa las entidades **Subject / SubjectUnit** del backend (no tags hardcodeados).
- Peticiones de mejora/aclaración al backend no se documentan en este repo: se abren como issues en `PabloGarPe/mathtexpedia-backend`.

## Convenciones
- **Nada de `fetch` suelto en componentes.** Toda llamada a la API va por la capa `lib/api/` y se consume con hooks de **TanStack Query**.
- Tipos de la API: **generados desde `api-docs.json`**, no escritos a mano.
- Formularios nuevos: `react-hook-form` + `zod`.
- No reintroducir los hooks "power-user" (ver más abajo).

## ⚠️ Código a eliminar, no mantener
`hooks/use-load-simulator.ts` + `workers/load.worker.ts`, `hooks/use-indexeddb-load.ts`, `hooks/use-auto-refresh.ts`, `hooks/use-random-scroll.ts`, `hooks/use-random-mouse-movements.ts`, `hooks/use-power-user-features.ts`, `components/power-user-provider.tsx`, `config/loadSimulator.config.ts` y `hooks/use-user-profile.ts` (lista de emails).
Estos hooks degradan a propósito el navegador de usuarios concretos (quema de CPU, recargas, basura en IndexedDB) y se activan por email hardcodeado. No aportan valor de producto: no reintroducirlos.

## Ficheros de referencia
- `api-docs.json` — contrato del backend (fuente de verdad).
- `UI-RESTRUCTURE.md` — arquitectura de información y vistas (feed mixto PDF/Quiz/Blog,
  asignaturas, panel de admin). Léelo antes de tocar navegación, rutas o layouts nuevos.
- Peticiones/aclaraciones al backend: issues en `PabloGarPe/mathtexpedia-backend` (no se
  documentan en este repo).
