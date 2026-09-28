# Reestructuración visual y de arquitectura de información

Escrito para: agentes/desarrolladores que implementen o extiendan la navegación y vistas del
frontend sobre la capa de datos ya migrada (Subjects/Units, PDFs, Quizzes vía TanStack Query
+ tipos generados del OpenAPI).

> Este documento **no** trata de refactor de código, sino de
> **qué páginas existen, cómo se navega entre ellas y cómo se organiza visualmente el
> contenido** ahora que el catálogo deja de ser "PDFs con un tag" y pasa a ser
> **Asignaturas → Temas → {PDFs, Cuestionarios, Blog, (futuro: lo que sea)}**.
> Se mantiene shadcn/ui (estilo `new-york`) y el shell actual (sidebar + header + footer);
> se añaden componentes shadcn donde faltan y se reorganiza el contenido dentro de ese shell.

---

## 1. Problema de fondo

Hoy la IA está construida alrededor de un único tipo de contenido (PDF) clasificado por un
tag hardcodeado de 2 letras. Eso ya no encaja:

- El backend modela **`Subject` → `SubjectUnit`**, y de ahí cuelgan **PDFs y Cuestionarios**
  (`/subject/{id}/pdfs`, `/subject/{id}/quizzes`, `/subject/unit/{id}/quizzes`…).
- El feed principal debe mostrar **varios tipos de recurso mezclados** (PDF, Cuestionario,
  Blog) y el usuario menciona que **en el futuro habrá más tipos**.
- Hoy no existe ninguna vista para "ver las asignaturas", solo un filtro lateral que aplica
  sobre una lista plana de PDFs ya cargados en cliente.
- El panel de admin gestiona PDFs y usuarios, pero no hay UI para Asignaturas/Temas ni para
  Cuestionarios/Preguntas/Opciones — toda esa gestión no existe todavía.

La solución no es "una página más": es tratar el **tipo de recurso** como un eje de primer
nivel en la IA (como ya lo es en el backend), y diseñar el sistema para que añadir un tipo
nuevo en el futuro sea *configuración*, no *reescritura*.

---

## 2. Modelo de contenido en el frontend

Se introduce un concepto puramente de UI: el **`ContentItem`**, una unión discriminada que
homogeneiza lo que hoy son tres cosas distintas (PDF de la API, Quiz de la API, post MDX local):

```ts
type ContentItem =
  | { kind: "pdf";   data: PDFDto | PDFNoLinkDto }
  | { kind: "quiz";  data: QuizDto }
  | { kind: "blog";  data: BlogPostMeta } // frontmatter de content/posts
  // futuro: | { kind: "video"; data: ... } | { kind: "flashcards"; data: ... }
```

Y un **registro de tipos** (`lib/content/registry.ts`) que centraliza todo lo que varía por
tipo, para que el resto de la UI (feed, sidebar, buscador) no tenga que conocer los detalles:

```ts
type ContentTypeMeta = {
  label: string;              // "PDF", "Cuestionario", "Artículo"
  icon: LucideIcon;           // FileIcon, ListChecksIcon, NewspaperIcon
  accentClass: string;        // color de la insignia de tipo
  href: (item: ContentItem) => string; // ruta de detalle
  requiresAuth: boolean;      // PDF sí, blog no, quiz sí
};

const CONTENT_TYPES: Record<ContentItem["kind"], ContentTypeMeta> = { ... };
```

**Por qué esto importa:** añadir un cuarto tipo de recurso en el futuro implica añadir una
entrada aquí + un componente de tarjeta + (si aplica) un hook de datos — no tocar el feed,
la barra lateral ni el buscador, que iteran sobre `ContentItem[]` de forma genérica.

Esto se apoya en la capa de datos ya migrada (TanStack Query + tipos generados del OpenAPI)
para Subjects/PDFs/Quizzes.

---

## 3. Mapa de rutas propuesto

```
/dashboard                                  Feed principal (mixto: PDF/Quiz/Blog)
/dashboard/subjects                         Catálogo de asignaturas
/dashboard/subjects/[subjectId]             Detalle de asignatura (temas + contenido)
/dashboard/quizzes                          Catálogo de cuestionarios
/dashboard/quizzes/[quizId]                 Ficha del cuestionario (intro + histórico propio)
/dashboard/quizzes/[quizId]/attempt         Resolución del cuestionario
/dashboard/quizzes/[quizId]/attempts/[id]   Resultado de un intento concreto
/dashboard/blog                             Índice de blog (ya existe)
/dashboard/blog/[slug]                      Post de blog (ya existe)
/dashboard/profile                          Perfil (ya existe) + pestaña "Mis intentos"
/dashboard/billing                          (ya existe, sin cambios)
/dashboard/contact/*  /dashboard/legal/*    (ya existen, sin cambios)

/dashboard/admin                            Índice del panel (tarjetas por sección)
/dashboard/admin/subjects                   CRUD Asignaturas + Temas
/dashboard/admin/pdfs                       CRUD PDFs (adaptado a Subject/Unit)
/dashboard/admin/quizzes                    Listado de cuestionarios (+ crear, + importar)
/dashboard/admin/quizzes/[quizId]           Editor de cuestionario (metadatos + preguntas + opciones)
```

Notas de diseño de rutas:
- **No se crea `/dashboard/subjects/[id]/units/[unitId]` como ruta aparte.** Los temas de una
  asignatura se muestran como acordeón *dentro* de `/dashboard/subjects/[subjectId]`
  (ver §5.2). Menos rutas, menos saltos de página, y el backend ya devuelve
  `/subject/{id}/units` + `/subject/unit/{id}/quizzes` de forma barata para hidratar cada
  panel del acordeón bajo demanda (o todo junto si el volumen es pequeño).
- El intento de cuestionario (`/attempt`) va en su propia ruta para poder salir/entrar sin
  perder el layout de "modo examen" (ver §6.2), distinto del layout informativo de la ficha.
- `/dashboard/quizzes/[quizId]/attempts/[id]` es opcional en v1: si no se persiste
  `attemptId` navegable, basta con mostrar el resultado inline tras el `submit` sin ruta
  propia. Se deja documentado por si se quiere compartir/revisitar un resultado.

---

## 4. Sidebar: de lista hardcodeada a árbol dinámico

**Hoy:** `app-sidebar.tsx` tiene un objeto `data.navMain` con "Matemáticas"/"Software" y sus
subcategorías escritas a mano, más un grupo "Blogs" con 4 enlaces hardcodeados que nunca
cambian, más un `dataAdminPanel` con 2 entradas.

**Propuesta:**

```
[Logo] MathTexpedia
──────────────────────────
Inicio                          → /dashboard
Asignaturas                     → /dashboard/subjects
  ▸ Matemáticas                 (de useSubjects(), expandible)
      Análisis y Cálculo        (de useSubjectUnits(subjectId))
      Álgebra y Geometría
      ...
  ▸ Software
      ...
Cuestionarios                   → /dashboard/quizzes
Blog                            → /dashboard/blog
──────────────────────────
Soporte / Feedback               (igual que hoy)
──────────────────────────
[si isAdmin] Panel de Admin
  Asignaturas   → /dashboard/admin/subjects
  PDFs          → /dashboard/admin/pdfs
  Cuestionarios → /dashboard/admin/quizzes
──────────────────────────
[Usuario / avatar]
```

Cambios concretos:
- **`data.navMain` deja de ser estático**: `AppSidebar` consume `useSubjects()` y, al
  expandir una asignatura, `useSubjectUnits(subjectId)` (o se precargan todos los temas de
  una vez si el catálogo es pequeño — a decidir con el volumen real de asignaturas).
- **Clic en asignatura/tema** ya no hace `setFilter(categoryString, subCategoryString)`
  sobre tags de texto: navega a `/dashboard?subjectId=X` o `/dashboard?subjectId=X&unitId=Y`
  (estado en la URL, no en Context — ver §5.1) **o**, alternativa más rica, navega
  directamente a `/dashboard/subjects/X` (la ficha de asignatura) en vez de filtrar el feed.
  Recomendado: clic en asignatura → ficha de asignatura (`/dashboard/subjects/X`); clic en
  "Inicio" → feed general. Es más consistente con "asignaturas como sección propia" que pide
  el usuario, y evita mantener dos formas de ver lo mismo (feed filtrado vs. ficha).
- **El grupo "Blogs" con 4 enlaces fijos se elimina.** Se sustituye por el enlace único
  "Blog" al índice (`/dashboard/blog`), que ya lista todo dinámicamente. Si se quiere lo
  fijo como acceso rápido, mejor un widget "Contenido reciente" en el propio feed que en la
  sidebar (menos ruido de navegación permanente).
  **✅ HECHO** — borrado `components/nav-projects.tsx` (sin otro consumidor, verificado con
  grep) y el objeto `data.projects` de `app-sidebar.tsx`; añadida la entrada "Blog" →
  `/dashboard/blog` (icono `Newspaper`, mismo patrón visual/componente `NavMain` que
  "Asignaturas"/"Cuestionarios") justo debajo de "Cuestionarios".
- **Admin panel** gana dos entradas (Asignaturas, Cuestionarios) y se reordena.

---

## 5. Feed principal (`/dashboard`)

### 5.1 Estado de filtro: de Context a URL

Hoy `FilterContext`/`SearchContext` guardan `categoryFilter`/`subCategoryFilter`/`searchQuery`
en memoria de React. Con más tipos de contenido y más ejes de filtro (asignatura, tema,
**tipo de recurso**, y para quizzes quizá dificultad), conviene mover esto a **query params**
(`?subjectId=&unitId=&type=&q=`) usando `nuqs` o `useSearchParams`/`router.replace`. Ventajas:
enlaces compartibles, back/forward del navegador funciona, y no hace falta un Context nuevo
por cada eje de filtro nuevo que aparezca en el futuro.

`FilterContext` y `SearchContext` se pueden retirar una vez migrado esto (o quedarse como
finos wrappers sobre `useSearchParams` si se prefiere no tocar toda la superficie de golpe).

### 5.2 Estructura visual

```
┌─────────────────────────────────────────────────────────┐
│  [Todo] [PDFs] [Cuestionarios] [Blog]      ← Tabs (nuevo)│
├─────────────────────────────────────────────────────────┤
│  (si hay filtro activo) "Bases de Datos › Tema 2"  [x]   │
├─────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │ PDF    │ │ Quiz   │ │ Blog   │ │ PDF    │   grid       │
│  │ card   │ │ card   │ │ card   │ │ card   │              │
│  └────────┘ └────────┘ └────────┘ └────────┘             │
└─────────────────────────────────────────────────────────┘
```

- **Tabs "Todo / PDFs / Cuestionarios / Blog"** (componente shadcn `Tabs`, no existe hoy —
  ver §8) controlan `type` en la URL. "Todo" intercala los tres tipos ordenados por fecha.
- El chip de asignatura/tema activo sustituye al actual `pageTitle` calculado a mano
  (`"Matemáticas: Análisis y Cálculo"`); se lee de los datos de `Subject`/`SubjectUnit`
  reales, no de un string de filtro.
- La tarjeta deja de ser `PDFCard`/`BlogCard` sueltas: se generaliza a `<ContentCard item={...} />`
  que por dentro renderiza `PdfCardBody`, `QuizCardBody` o `BlogCardBody` dentro del mismo
  `Card` shell (mismo alto, mismo footer con fecha, misma insignia de tipo arriba a la
  izquierda). Esto es lo que permite que el grid "Todo" se vea homogéneo aunque mezcle tipos.
- **Insignia de tipo** (icono + texto pequeño, esquina superior): PDF (icono documento),
  Cuestionario (icono lista con check), Blog (icono artículo). Color por `accentClass` del
  registro (§2), reutilizando el patrón de color ya usado en `pdf-card.tsx`
  (`bg-*-100 dark:bg-*-900`).
- **Tarjeta de Cuestionario** añade lo que un PDF no tiene: badge de dificultad
  (`EASY`/`MEDIUM`/`HARD` → verde/ámbar/rojo, mismo patrón visual), y CTA distinto según
  estado: "Empezar" (sin intentos previos) / "Reintentar" (con intentos) — esto último
  requiere saber si el usuario tiene intentos para ese quiz, ver §7 sobre el histórico.

### 5.3 Búsqueda

El buscador de `site-header.tsx` sigue funcionando igual a nivel de interacción, pero debe
buscar sobre **los tres tipos de `ContentItem`** por nombre/título, no solo sobre PDFs. Con
pocos cientos de elementos, filtrar en cliente (como hoy) sigue siendo razonable; si el
catálogo crece mucho, ver la propuesta de endpoint de búsqueda en
[mathtexpedia-backend#98](https://github.com/PabloGarPe/mathtexpedia-backend/issues/98).

---

## 6. Nuevas vistas de usuario

### 6.1 Catálogo y ficha de asignatura

- **`/dashboard/subjects`**: grid de tarjetas simples (nombre, descripción,
  recuento de temas si se añade el campo — ver
  [mathtexpedia-backend#95](https://github.com/PabloGarPe/mathtexpedia-backend/issues/95)).
  Es la puerta de entrada
  para quien no quiere usar la sidebar (por ejemplo en móvil, donde la sidebar colapsa).
- **`/dashboard/subjects/[subjectId]`**: cabecera con nombre + descripción de la asignatura;
  debajo, **acordeón de Temas** (componente shadcn `Accordion` — ver §8). Cada tema, al
  abrirse, carga (o muestra ya precargado) sus PDFs y cuestionarios como una versión
  compacta de `ContentCard` (lista, no grid, para no repetir la cabecera visual en cada
  tema). Se incluye una sección "General" (sin tema asociado) para los PDFs/quizzes que
  cuelgan directamente de la asignatura (`subjectUnitId: null`).
- Esta página es la que sustituye a "filtrar el feed por categoría": es más rica porque
  agrupa por tema explícitamente en vez de aplanar todo en un grid con un título encima.

### 6.2 Cuestionarios: catálogo, ficha, intento y resultado

- **`/dashboard/quizzes`**: mismo patrón que `/dashboard/blog` hoy — grid de tarjetas,
  filtro por asignatura/dificultad (Select o chips arriba).
- **`/dashboard/quizzes/[quizId]`**: ficha informativa — nombre, descripción, dificultad,
  asignatura/tema, número de preguntas (si se expone, ver
  [mathtexpedia-backend#95](https://github.com/PabloGarPe/mathtexpedia-backend/issues/95)), y **si el
  usuario ya tiene intentos**, un resumen ("Tu mejor puntuación: 8/10") con enlace a
  `/dashboard/profile` (histórico) y botón **"Empezar"/"Volver a intentar"**.
- **`/dashboard/quizzes/[quizId]/attempt`**: layout distinto, "modo examen" — sin sidebar de
  navegación (o con ella colapsada por defecto), barra de **progreso** (`Progress` de
  shadcn — no existe hoy, ver §8) tipo "Pregunta 3/10", una pregunta a la vez o todas en
  scroll continuo (recomendado: todas en scroll, con la barra de progreso reflejando
  cuántas están respondidas — más simple de implementar y de revisar antes de enviar).
  Cada pregunta usa `RadioGroup` (shadcn, no existe hoy) para las opciones — el DTO no
  contempla multi-respuesta (`correct: boolean` por opción, una sola correcta esperada).
  Botón "Enviar" deshabilitado hasta contestar todas (o permitir enviar parcial, hay que
  decidir con producto: el DTO de respuesta soporta `unansweredQuestions`, así que el
  backend ya tolera envíos parciales).
- **Resultado tras enviar**: no hace falta navegar a otra URL necesariamente — se puede
  reemplazar el contenido de `/attempt` por la vista de resultado (usa el mismo
  `QuizAttemptResultDto` que ya trae `correctOptionId`/`explanation` por pregunta). Mostrar:
  puntuación grande arriba, y debajo cada pregunta con su opción marcada, la correcta si
  falló, y la `explanation` en un cuadro (se puede reutilizar visualmente `DemBox`/`EjBox`
  del sistema MDX, o un simple `Alert` de shadcn).

### 6.3 Perfil: histórico de intentos

`/dashboard/profile` gana una sección/pestaña **"Mis cuestionarios"** que consume
`GET /attempts` (paginado). Tabla (`Table` ya existe) con columnas: cuestionario, puntuación,
fecha, enlace a "Ver detalle". Necesita **paginación** (el endpoint ya pagina vía
`Pageable`) — añadir componente `Pagination` de shadcn (no existe hoy, ver §8).

---

## 7. Panel de administración

### 7.1 Índice (`/dashboard/admin`)

Se amplía el grid de 2 tarjetas actual a 4: **PDFs, Asignaturas, Cuestionarios, Usuarios**
(mismo patrón visual que ya existe, solo más tarjetas).

### 7.2 Asignaturas y Temas (`/dashboard/admin/subjects`) — nuevo

Sigue el mismo patrón ya validado en `PDFAccordionCard.tsx`/`admin/pdfs/page.tsx`:
formulario de alta arriba (nombre + descripción) y, debajo, cada asignatura existente como
una tarjeta expandible (`Collapsible`/`Accordion`) con:
- Campos editables inline (nombre, descripción) + botón guardar/borrar (con
  **confirmación** — ver gap de UX en §7.5).
- Dentro, la lista de **Temas** de esa asignatura, cada uno editable (nombre, posición) y
  borrable, más un formulario para añadir un tema nuevo.
- El borrado de asignatura/tema con conflicto (409 si tiene temas/PDFs asociados) debe
  mostrarse como error claro, no como fallo silencioso (`toast.error` ya es el patrón usado).

### 7.3 Cuestionarios (`/dashboard/admin/quizzes`, `/dashboard/admin/quizzes/[quizId]`) — nuevo

Esta es la pieza de admin más grande y nueva.

- **Listado** (`/dashboard/admin/quizzes`): tabla o cards con nombre, asignatura/tema,
  dificultad, fecha de edición. Acciones: **Crear**, **Importar JSON** (usa
  `POST /quiz/import?subjectId=&subjectUnitId=`, con un `<input type="file">` que lee el
  JSON y lo manda), y por fila **Exportar** (`GET /quiz/{id}/export`, dispara descarga) y
  **Editar/Borrar**.
- **Editor** (`/dashboard/admin/quizzes/[quizId]`): una página con:
  1. Formulario de metadatos del quiz (nombre, descripción, dificultad `Select`,
     asignatura/tema `Combobox` ya usado en PDFs).
  2. **Lista de preguntas** como `Accordion`: cada pregunta muestra su texto, tipo
     (`MULTIPLE_CHOICE`/`TRUE_FALSE`), posición, explicación; al expandir, sus **opciones**
     (texto + posición + un `RadioGroup`/toggle para marcar cuál es la correcta — solo una
     activa a la vez, coherente con el modelo de datos).
  3. Botón "Añadir pregunta" / "Añadir opción" dentro de cada pregunta.
  4. Reordenar por `position`: en v1 basta con botones ↑/↓ que reescriban `position` de las
     preguntas/opciones afectadas (drag-and-drop es una mejora futura, no bloqueante).
- Este editor es denso: conviene que cada pregunta/opción gestione su propio estado "en
  edición" (como ya hace `PDFAccordionCard` con `pdfData` local) para no tener un único
  formulario gigante, y que los guardados sean granulares (`PATCH` por pregunta/opción vía
  mutaciones de TanStack Query) en vez de "guardar todo el quiz" de una vez.

### 7.4 PDFs (`/dashboard/admin/pdfs`) — adaptar, no rehacer

La UX actual (buscador, combobox de categoría/subcategoría, tarjetas expandibles) se
mantiene tal cual; solo cambia la **fuente de datos** de los combobox: en vez del objeto
`categories` hardcodeado, se listan `Subject` y, al elegir uno, sus `SubjectUnit`
(`useSubjects()`/`useSubjectUnits()`, los mismos hooks que usa la sidebar y la ficha de
asignatura — una sola fuente de verdad para toda la app).

### 7.5 Usuarios — eliminado

El listado de usuarios del admin se ha retirado: la gestión de usuarios y roles se hace
directamente desde Keycloak (ver
[mathtexpedia-backend#94](https://github.com/PabloGarPe/mathtexpedia-backend/issues/94)).

### 7.6 Gap de UX transversal en todo el admin: falta confirmación de borrado

Hoy **ningún borrado pide confirmación** (PDFs se borran al pulsar el icono, sin diálogo).
Con más entidades borrables (asignaturas, temas, preguntas, opciones, quizzes — varias con
reglas de conflicto 409 en el backend) esto es más arriesgado. Añadir `AlertDialog` de
shadcn (no existe hoy, ver §8) como patrón único de confirmación reutilizado en todas las
acciones destructivas del admin.

---

## 8. Componentes shadcn a añadir

| Componente | Para qué | Se instala con |
|---|---|---|
| `Tabs` | Feed por tipo de contenido; secciones en fichas de asignatura/quiz | `npx shadcn@latest add tabs` |
| `Accordion` | Temas dentro de asignatura; preguntas dentro de quiz (admin); sustituye el patrón `Collapsible` hecho a mano que hoy se repite en `PDFAccordionCard` | `add accordion` |
| `RadioGroup` | Selección de opción en el intento de quiz; marcar opción correcta en el editor admin | `add radio-group` |
| `Progress` | Barra de progreso al resolver un cuestionario | `add progress` |
| `Pagination` | Histórico de intentos (`/attempts`), y listados admin si crecen (usuarios, quizzes) | `add pagination` |
| `AlertDialog` | Confirmación de borrado en todo el admin (§7.6) | `add alert-dialog` |
| `Checkbox` | Solo si en el futuro se soportan preguntas de opción múltiple (hoy el modelo es de opción única) | `add checkbox` |

Todos son compatibles con el `components.json` ya configurado (`style: new-york`,
`baseColor: zinc`) y no requieren tocar el theme.

---

## 9. Fases de implementación (completadas)

1. **Cimientos compartidos**: registro de tipos de contenido (§2), componentes shadcn
   nuevos (§8), mover filtros a URL (§5.1).
2. **Sidebar dinámica + catálogo de asignaturas** (`/dashboard/subjects*`) — depende de
   `useSubjects`/`useSubjectUnits`. Sustituye el filtro por tags.
   **✅ HECHO** (catálogo de asignaturas — la sidebar dinámica ya estaba hecha de antes):
   - `/dashboard/subjects`: grid simple de `SubjectDto` (nombre + descripción), enlaza a la
     ficha. Pública, sin auth.
   - `/dashboard/subjects/[subjectId]`: cabecera (nueva `getSubject`/`useSubject`, `GET
     /subject/{id}`) + `Accordion` de Temas (`useSubjectUnits`). Cada tema lista sus PDFs
     (`useSubjectPdfs`, pública) y cuestionarios (nueva `getSubjectQuizzes`/
     `useSubjectQuizzes`, `GET /subject/{id}/quizzes` — **requiere sesión**, 401 documentado
     en `api-docs.json`) agrupados en cliente por `subjectUnit?.id`; sin tema van a una
     sección "General" antes del acordeón. Reutiliza `ContentCard` en modo lista (`flex
     flex-col`, no grid). Si el usuario no está autenticado, la subsección de cuestionarios
     de cada tema simplemente no se pide (`enabled: isAuthenticated`) ni se muestra, sin
     error visible. Un tema sin contenido visible se muestra igual, con "No hay contenido
     disponible" (puede tener cuestionarios que el anónimo no ve).
   - **Decisión sobre el clic en la sidebar** (`nav-subjects.tsx`): tanto el clic en
     asignatura como en tema dejan de aplicar `FilterContext` + navegar a `/dashboard`;
     ambos navegan a la ficha de asignatura (`/dashboard/subjects/[id]`, el tema además con
     `?unit=[unitId]` para abrir ese panel del acordeón ya expandido). Se eligió esta opción
     (frente a mantener el filtro sobre el feed) porque es la que recomienda este mismo
     documento en §4: una sola forma de "navegar por asignatura", no dos. Como consecuencia,
     el resaltado "activo" de la sidebar se recalculó a partir de la ruta actual
     (`usePathname`/`useSearchParams`) en vez de `FilterContext`, que ya no lo alimenta nadie
     desde la sidebar — `FilterContext` sigue existiendo y lo sigue leyendo
     `dashboard-feed.tsx` (§5), simplemente ya no tiene un emisor en la sidebar tras este
     cambio; sigue sin moverse a la URL (§5.1), fuera de alcance de esta ronda.
   - Enlace raíz "Asignaturas" añadido en la sidebar (`app-sidebar.tsx`, grupo "Catálogo",
     junto a "Cuestionarios") apuntando a `/dashboard/subjects`.
3. **Feed mixto** (`ContentCard`, Tabs por tipo) — depende de 1 y 2, y de que PDFs ya hablen
   el contrato nuevo (T-08).
4. **Admin de Asignaturas** (`/dashboard/admin/subjects`) y **PDFs adaptado** (T-09).
5. **Cuestionarios de usuario** (catálogo, ficha, intento, resultado, histórico en perfil) —
   depende de la capa de datos de quizzes (ya migrada).
6. **Admin de Cuestionarios** (editor de preguntas/opciones) — depende de 5.
7. **Confirmaciones de borrado (`AlertDialog`) en todo el admin** — transversal, se puede
   hacer en cualquier momento a partir de la fase 4.

**Estado de la fase 3 (feed mixto): ✅ HECHO.**
- `lib/content/types.ts` define `ContentItem`/`DisplayPdf` (movido desde `dashboard-feed.tsx`
  para que `registry.ts`/`content-card.tsx` lo compartan sin redefinirlo). `lib/content/registry.ts`
  centraliza `label`/`icon`/`accentClass`/`href` por `kind`.
- `components/content-card.tsx` es el despachador (`PDFCard`/`BlogCard`/`QuizCard` según
  `kind`), con la insignia de tipo superpuesta en la esquina superior izquierda vía el
  registro, sin tocar el layout interno de las 3 tarjetas. `QuizCard` (ya existía desde
  T-17) se amplió con una fecha en el pie para igualar el patrón visual de `PDFCard`/`BlogCard`.
- `components/dashboard-feed.tsx` usa `Tabs` (Todo/PDFs/Cuestionarios/Blog) sobre un
  `ContentItem[]` combinado; **no se movió el filtro a query params (§5.1)** — se mantuvo
  `FilterContext`/`SearchContext` tal cual, ya que no se pidió en esta ronda y hubiera sido
  un cambio de alcance mayor sin necesidad directa para las pestañas.
- **Filtro asignatura/tema**: aplica a PDFs y Cuestionarios (ambos tienen
  `subject`/`subjectUnit`); el Blog nunca se filtra por asignatura (ver §10 — no se inventó
  un campo `subject` en el frontmatter). Dentro de "Todo", si hay filtro de
  asignatura/tema activo, el blog se excluye de la mezcla (comentado en el código); la
  pestaña "Blog" propia siempre muestra todos los posts.
- **Búsqueda vs. filtro**: se mantuvo la precedencia que ya tenía el feed de PDFs
  (mutuamente excluyentes) — al escribir en el buscador se ignora el filtro de
  asignatura/tema y se busca sobre el universo completo de cada tipo; sin búsqueda activa,
  aplica el filtro. Aplica a los 3 tipos (`DisplayPdf.title`, `QuizDto.name`,
  `BlogPostMeta.title`) reutilizando `normalizeText`.
- **Se eliminó el recorte "últimos 8 PDFs"** que tenía la vista anterior sin pestañas
  (`pageTitle` fijo "Últimos apuntes"): con pestañas dedicadas, cada una lista todo lo que
  matchea el filtro/búsqueda activos, ordenado por fecha descendente; no se ha añadido
  paginación (fuera de alcance de esta ronda).

**Cierre de cabos sueltos (T-05, §4 "Blogs" → enlace único, punto 7 "AlertDialog en todo el
admin"): ✅ HECHO.**
- `next.config.ts`: eliminado el bloque `headers()` (CORS `Access-Control-Allow-*`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`) — eran headers de respuesta que solo
  tendrían sentido puestos por el backend, no por este propio Next.js sirviendo sus propias
  páginas. Queda solo `poweredByHeader: false`, `serverExternalPackages` e `images`. Ver
  Verificado que login/logout siguen funcionando igual en `AUTH_MODE=mock`/`keycloak` tras
  quitarlos. `proxy.ts` no se ha tocado (ya resuelto en el merge de Keycloak).
- `components/nav-projects.tsx` borrado (sin otro consumidor) junto con `data.projects` de
  `app-sidebar.tsx`; sustituido por una entrada "Blog" → `/dashboard/blog` con `NavMain`,
  mismo patrón visual que "Asignaturas"/"Cuestionarios".
- `components/ui/PDFAccordionCard.tsx`: el botón de borrar ahora abre un `AlertDialog`
  ("¿Eliminar este PDF?" / "Esta acción no se puede deshacer.") antes de invocar
  `handleDelete`, con el mismo patrón (trigger ghost+`Trash`, `AlertDialogAction` disparando
  la mutación) que ya usan `SubjectAccordionCard.tsx`/`QuizQuestionAccordion.tsx`. Con esto,
  el punto 7 de la lista de fases de arriba queda completo: todas las entidades del admin
  (asignaturas, temas, preguntas, opciones, cuestionarios, PDFs) confirman el borrado.

---

## 10. Decisiones para producto (no técnicas)

- **¿El Blog se vincula a Asignatura/Tema o se queda como sección independiente?** Hoy los
  posts MDX solo tienen `tags` libres en el frontmatter, sin relación con el modelo
  `Subject`/`SubjectUnit` del backend (el blog no tiene backend propio). Si se quiere que la
  ficha de asignatura también muestre posts de
  blog relacionados, hay que añadir un campo `subject`/`subjectId` al frontmatter de cada
  `.mdx` y mapearlo a mano (no hay forma automática de saberlo).
- **Intento de cuestionario: ¿pregunta a pregunta o todas en una página?** Recomendado
  "todas en scroll" por simplicidad de v1; si se prefiere una experiencia tipo examen más
  guiada (una pregunta, botón siguiente), es un cambio de UI aislado en
  `/dashboard/quizzes/[quizId]/attempt`, no afecta al resto del documento.
- **¿Se permite reintentar un cuestionario indefinidamente?** El backend no impone límite
  visible en el OpenAPI; si producto quiere limitar intentos, es una regla de negocio a
  definir con backend, no algo que el frontend deba inventar.
