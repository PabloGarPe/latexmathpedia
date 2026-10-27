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
- Las pantallas de Keycloak (login/registro/recuperar contraseña) se ven con un tema propio que vive en el **repo del backend** (`keycloak/themes/mathtexpedia`, solo CSS + textos; copia los tokens de `app/globals.css` y `public/logo.png`, así que si cambia el diseño hay que actualizarlo allí). El frontend sigue redirigiendo a Keycloak: no hay formularios de credenciales propios.
- Gestión de contenido del admin: **"Modo edición"** sobre las vistas normales (asignaturas, temas, PDFs, cuestionarios; ver `UI-RESTRUCTURE.md` §7), más las vistas globales `/dashboard/admin/pdfs`, `/dashboard/admin/quizzes` y `/dashboard/admin/comments` (moderación). No hay página aparte de asignaturas.
- **Valoraciones de PDFs**: 👍/👎, un voto por usuario y PDF, anónimas. Se vota solo en el visor, solo tras abrir el PDF y sin ser autor (el `GET` de rating se pide cuando ha llegado el binario). Las tarjetas muestran el % de 👍 a partir de 3 votos y nunca `score`, que es solo para ordenar; hilera "Mejor valorados" (`/public/pdf/top-rated`) y orden en "Explorar todo". Helpers en `lib/pdf-rating.ts`.
- **Notificaciones in-app**: campanita en el header (`components/notifications/`, contador con polling de 60 s solo con la pestaña visible), página completa `/dashboard/notifications`, preferencias por tipo × canal en `/dashboard/profile/notifications` y avisos de admin en `/dashboard/admin/announcements`. Los textos vienen redactados del backend; icono y destino se resuelven en `lib/notifications/registry.ts` con fallback para tipos/categorías/canales nuevos (el catálogo del backend crece).
- **Perfil = ajustes por secciones**: cada sección es una ruta bajo `/dashboard/profile` (Perfil, Notificaciones, Cuenta y seguridad, Actividad), registradas en `components/settings/profile-nav.tsx` y construidas con `SettingsSection`/`SettingsRow`. Los campos de perfil futuros se añaden como filas.
- **Cuestionarios con visibilidad**: `POST /quiz/create` los crea ocultos; el admin publica/oculta con `PATCH /quiz/{id}/visibility`. El listado del admin usa `GET /quiz` (incluye ocultos); los `/public/quiz*` nunca los devuelven. Un cuestionario oculto da 404 al alumno (se pinta `ContentUnavailable`).
- **Importación de cuestionarios por JSON**: página `/dashboard/admin/quizzes/import` (query `subjectId`/`subjectUnitId`/`returnTo`; formulario + pestaña JSON; `publish` opcional, oculto por defecto) y "Importar preguntas (JSON)" en el editor, que añade al final con `POST /quiz/{id}/questions/import`. Accesos en la lista de admin, en las secciones de la ficha de asignatura (modo edición) y en el diálogo de crear. Lógica en `lib/quiz-import.ts` + `components/admin/quiz-import/`; el front valida con las mismas reglas que el back (`collectIssues`) porque los 400 llegan sin body.
- La categorización usa las entidades **Subject / SubjectUnit** del backend (no tags hardcodeados).
- **Grados y colocaciones**: un grado (`DegreeDto`) tiene `years` cursos (enteros `1..years`, no hay entidad Año). Una asignatura puede estar colocada en 0..N grados (`placements`, con `year` y `semester` 1/2/`null` = anual), y las colocaciones solo se editan dentro del alta/edición de la asignatura (`SubjectFormDialog`). En el update, `placements` ausente conserva las actuales y una lista (también `[]`) **reemplaza todas**: precargarlas siempre. `SubjectDto` (embebido en PDFs, cuestionarios…) no las trae; `SubjectDetailDto` (`/public/subject*`) sí. Vistas: `/dashboard/degrees` (+ plan de estudios por años con "Suscribirme a este curso": el back recuerda la suscripción al curso (`GET /me/subscriptions/courses`, `semester: null` = año entero) y suscribe solo a las asignaturas que el admin coloque después; el estado del botón sale de esa lista, no de cruzar asignaturas, y vale también en cursos vacíos), `/dashboard/admin/degrees` (CRUD + asignaturas sin clasificar), filtros grado → año → cuatrimestre en `/dashboard/subjects` (en la URL, preseleccionados con el grado del perfil) y grado/curso en el perfil (`PUT /me` también reemplaza `degreeId`/`currentYear`). Formato de años/cuatrimestres en `lib/degrees.ts`.
- **Comentarios en PDFs**: hilo bajo el visor (`#comments` en `/dashboard/pdfs/[pdfId]`, `components/comments/`) y cola de moderación del admin (`/dashboard/admin/comments`, `components/admin/comment-moderation/`, pestañas en `?tab=`; contadores en la tarjeta de `/dashboard/admin` y badge en el sidebar). Capa en `lib/api/comments.ts`, hooks en `hooks/api/use-comments.ts` y helpers/etiquetas/validación en `lib/comments.ts`. Los comentarios **nacen `PENDING`** y solo los ve su autor ("Tus comentarios", con sondeo corto del `GET /pdf/{pdfId}/comments/me`); la IA los publica, los manda a `REVIEW` o los rechaza, y si cae esperan en `PENDING` hasta que un admin los resuelva (`GET /admin/comments/moderation-status`, sondeo de 60 s con pestaña visible). Las denuncias ocultan (`HIDDEN`) y el admin restaura con "aprobar". Los likes del usuario no vienen en los listados públicos: se piden aparte a `GET /me/comment-likes` (troceado a 100 ids). Para enlazar a un comentario: `?comment=ID` + `GET /public/pdf/comments/{id}/context` (404 si no está publicado: solo se baja a la sección); `commentHref` y el registry de notificaciones lo usan. La longitud máxima de `/public/comments/config` se cuenta en puntos de código, no en `length`.
- **Texto enriquecido (Markdown + LaTeX)**: `components/rich-text/` — `RichText` (`full` para textos largos, `compact` para frases/opciones/chat; hereda el color del contenedor, sin `prose`), `RichTextEditor` (controlado, toolbar + vista previa en vivo; con RHF vía `Controller`) y helpers puros en `lib/rich-text.ts`. El backend guarda el texto plano. Es seguro para contenido de usuarios (sin HTML crudo, sin imágenes remotas, enlaces solo http/https/mailto/relativos), así que es lo que usan los comentarios de PDFs, los cuestionarios y el chatbot (`MessageContent`).
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
