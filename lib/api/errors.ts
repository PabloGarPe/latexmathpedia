// El body de error que documenta api-docs.json para varios 409/401 reutiliza por error el
// DTO de éxito del recurso como schema de error; lo único fiable para distinguir esos casos
// (p. ej. un 409 de conflicto) es el status HTTP de la respuesta, así que lo llevamos aquí.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Antes duplicada en admin/quizzes, admin/quizzes/[quizId] y SubjectAccordionCard: los 409
// de conflicto (nombre duplicado, etc.) traen un mensaje del backend que vale la pena
// mostrar tal cual; cualquier otro error usa el mensaje genérico del propio caller.
export function conflictMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 409) {
    return error.message;
  }
  return fallback;
}
