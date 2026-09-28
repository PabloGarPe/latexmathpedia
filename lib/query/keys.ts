// Query keys centralizadas para TanStack Query.
// Las claves son jerárquicas: invalidar un prefijo (p. ej. ["subjects"]) invalida también
// las claves más específicas que cuelgan de él (p. ej. ["subjects", 3, "units"]).
export const queryKeys = {
  subjects: {
    all: () => ["subjects"] as const,
    detail: (subjectId: number) => ["subjects", subjectId] as const,
    units: (subjectId: number) => ["subjects", subjectId, "units"] as const,
    pdfs: (subjectId: number) => ["subjects", subjectId, "pdfs"] as const,
    quizzes: (subjectId: number) => ["subjects", subjectId, "quizzes"] as const,
  },
  pdfs: {
    all: () => ["pdfs"] as const,
    content: (pdfId: number) => ["pdfs", pdfId, "content"] as const,
  },
  quizzes: {
    all: () => ["quizzes"] as const,
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
} as const;
