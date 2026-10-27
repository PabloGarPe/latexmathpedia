// Query keys centralizadas para TanStack Query.
// Las claves son jerárquicas: invalidar un prefijo (p. ej. ["subjects"]) invalida también
// las claves más específicas que cuelgan de él (p. ej. ["subjects", 3, "units"]).
export const queryKeys = {
  subjects: {
    all: () => ["subjects"] as const,
    // Catálogo filtrado (GET /public/subject con degreeId/year/semester/unassigned). Sin filtros
    // se usa `all()`. Cuelga de ["subjects"]: lo cubren las invalidaciones de asignaturas.
    filtered: (filters: { degreeId?: number; year?: number; semester?: number; unassigned?: boolean }) =>
      ["subjects", "filtered", filters] as const,
    detail: (subjectId: number) => ["subjects", subjectId] as const,
    units: (subjectId: number) => ["subjects", subjectId, "units"] as const,
    pdfs: (subjectId: number) => ["subjects", subjectId, "pdfs"] as const,
    quizzes: (subjectId: number) => ["subjects", subjectId, "quizzes"] as const,
  },
  // Grados y planes de estudio (públicos). El plan embebe SubjectDto, así que los cambios de
  // asignatura invalidan también ["degrees"].
  degrees: {
    all: () => ["degrees"] as const,
    detail: (degreeId: number) => ["degrees", degreeId] as const,
    curriculum: (degreeId: number, filters: { year?: number; semester?: number } = {}) =>
      ["degrees", degreeId, "curriculum", filters] as const,
  },
  pdfs: {
    all: () => ["pdfs"] as const,
    content: (pdfId: number) => ["pdfs", pdfId, "content"] as const,
    // Hileras del feed. "top" es prefijo de "top/me": invalidar ["pdfs","top"] cubre ambas.
    recent: (limit: number) => ["pdfs", "recent", limit] as const,
    // De mis asignaturas (por usuario). Cuelga de ["pdfs"]: lo cubren las invalidaciones de vistas.
    recentSubscribed: (userKey: string, limit: number) => ["pdfs", "recent-subscribed", userKey, limit] as const,
    top: (limit: number) => ["pdfs", "top", limit] as const,
    // Lleva el email del usuario en la clave para no servir la caché de otra sesión.
    topMe: (userKey: string, limit: number) => ["pdfs", "top", "me", userKey, limit] as const,
    // Hilera "Mejor valorados" (pública). Cuelga de ["pdfs"]: la cubren las invalidaciones de listas.
    topRated: (limit: number) => ["pdfs", "top-rated", limit] as const,
    // Valoración del PDF y mi voto (visor). Se gestiona aparte de las listas: ver useVotePdf.
    rating: (pdfId: number) => ["pdfs", pdfId, "rating"] as const,
  },
  quizzes: {
    all: () => ["quizzes"] as const,
    // Catálogo completo del admin (GET /quiz, incluye ocultos); distinto del público.
    catalog: () => ["quizzes", "catalog"] as const,
    // Hileras del feed (públicas, sin clave por usuario).
    recent: (limit: number) => ["quizzes", "recent", limit] as const,
    recentSubscribed: (userKey: string, limit: number) => ["quizzes", "recent-subscribed", userKey, limit] as const,
    top: (limit: number) => ["quizzes", "top", limit] as const,
    detail: (quizId: number) => ["quizzes", quizId] as const,
    attempt: (quizId: number) => ["quizzes", quizId, "attempt"] as const,
    questions: (quizId: number) => ["quizzes", quizId, "questions"] as const,
    stats: (quizId: number) => ["quizzes", quizId, "stats"] as const,
    leaderboard: (quizId: number, page: number, size: number) => ["quizzes", quizId, "leaderboard", page, size] as const,
  },
  questions: {
    options: (questionId: number) => ["questions", questionId, "options"] as const,
  },
  attempts: {
    all: () => ["attempts"] as const,
    page: (page: number, size: number) => ["attempts", page, size] as const,
    stats: () => ["attempts", "stats"] as const,
  },
  profile: {
    me: () => ["profile", "me"] as const,
  },
  // Foto de perfil (blob). La versión (avatarUpdatedAt) va en la clave: al cambiar se descarga
  // de nuevo. Invalidar ["avatar", userId] cubre todas las versiones de un usuario.
  avatars: {
    user: (userId: number) => ["avatar", userId] as const,
    version: (userId: number, version: string) => ["avatar", userId, version] as const,
  },
  // Asignaturas suscritas del usuario de la sesión (se vacía con queryClient.clear() al salir).
  subscriptions: {
    all: () => ["me", "subscriptions"] as const,
    // Cuelga de `all()`: invalidar las suscripciones a asignaturas refresca también las de curso.
    courses: () => ["me", "subscriptions", "courses"] as const,
  },
  // Por usuario: al cerrar sesión se vacía la caché (queryClient.clear()).
  notifications: {
    all: () => ["notifications"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    // Prefijo de todos los listados (desplegable y página completa).
    lists: () => ["notifications", "list"] as const,
    list: (unreadOnly: boolean, size: number) => ["notifications", "list", unreadOnly, size] as const,
    // Página completa (scroll infinito).
    infinite: (unreadOnly: boolean) => ["notifications", "list", "infinite", unreadOnly] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
  // Comentarios de PDFs. Todo lo público de un PDF cuelga de pdf(pdfId): invalidarlo refresca
  // raíces, respuestas y "mis comentarios" de ese PDF a la vez (pdfs() = el de todos los PDFs).
  // Fuera de esa rama: contexto (por comentario), likes (por usuario), config y admin (cola +
  // estado de moderación). Las de usuario llevan su email (como topMe) para no mezclar sesiones.
  comments: {
    all: () => ["comments"] as const,
    pdfs: () => ["comments", "pdf"] as const,
    pdf: (pdfId: number) => ["comments", "pdf", pdfId] as const,
    // Raíces paginadas (infinita).
    roots: (pdfId: number) => ["comments", "pdf", pdfId, "roots"] as const,
    // Respuestas de una raíz (infinita). Prefijo: replies(pdfId) cubre todas las del PDF.
    replies: (pdfId: number) => ["comments", "pdf", pdfId, "replies"] as const,
    repliesOf: (pdfId: number, rootId: number) => ["comments", "pdf", pdfId, "replies", rootId] as const,
    mine: (userKey: string, pdfId: number) => ["comments", "pdf", pdfId, "mine", userKey] as const,
    // Comentario destacado ({ root, target }); público.
    context: (commentId: number) => ["comments", "context", commentId] as const,
    config: () => ["comments", "config"] as const,
    // Ids que le gustan al usuario. Prefijo likes(userKey) cubre todas las consultas del usuario;
    // `idsKey` son los ids pedidos, ordenados y unidos por comas.
    likes: (userKey: string) => ["comments", "likes", userKey] as const,
    likesFor: (userKey: string, idsKey: string) => ["comments", "likes", userKey, idsKey] as const,
    // Prefijo de la cola y del estado de moderación (invalidarlo refresca ambos).
    admin: () => ["comments", "admin"] as const,
    // `statusesKey`: estados ordenados y unidos por comas.
    adminQueue: (statusesKey: string) => ["comments", "admin", "queue", statusesKey] as const,
    moderationStatus: () => ["comments", "admin", "moderation-status"] as const,
  },
  users: {
    search: (term: string) => ["users", "search", term] as const,
  },
} as const;
