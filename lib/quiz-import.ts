/**
 * Importación de cuestionarios desde JSON: parseo tolerante, validación con las reglas EXACTAS del
 * backend y modelo de borrador para el formulario. Lógica pura (sin React ni DOM): sirve en la
 * página de importación, en "Añadir preguntas desde JSON" del editor y en scripts de prueba.
 *
 * Por qué se valida aquí: los 400 del back llegan con el cuerpo VACÍO, así que no dicen qué falló.
 * Todo lo que el back rechazaría se detecta antes de enviar y se señala con su ubicación.
 *
 * Reglas del back (POST /quiz/import y POST /quiz/{id}/questions/import):
 *  - cuestionario: nombre obligatorio, dificultad obligatoria, descripción ≤ 500, ≥ 1 pregunta;
 *  - pregunta: texto no vacío; MULTIPLE_CHOICE ≥ 2 opciones; TRUE_FALSE exactamente 2; en ambos
 *    casos exactamente 1 opción correcta; opciones con texto no vacío;
 *  - las `position` del JSON se ignoran (se numera por orden de la lista); explanation vacía → null.
 */
import { z } from "zod";
import type { OptionExportableDto, QuestionExportableDto, QuizExportableDto } from "@/lib/api/quizzes";

/* ------------------------------------------------------------------ */
/* Modelo de borrador                                                  */
/* ------------------------------------------------------------------ */

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DESCRIPTION_MAX = 500;

/** "quiz": cuestionario completo (página de importación). "questions": solo preguntas (añadir a uno existente). */
export type ImportMode = "quiz" | "questions";

export interface OptionDraft {
    text: string;
    correct: boolean;
}

export interface QuestionDraft {
    text: string;
    /** `null` si el JSON traía un tipo desconocido o ninguno: se señala como problema hasta que se elija. */
    type: QuestionType | null;
    /** Cadena vacía = sin explicación. */
    explanation: string;
    options: OptionDraft[];
}

/** Sin positions: el orden es el del array. */
export interface QuizDraft {
    name: string;
    description: string;
    /** `null` hasta que se elija (un JSON de solo preguntas no la trae). */
    difficulty: Difficulty | null;
    questions: QuestionDraft[];
}

export const TRUE_FALSE_LABELS = ["Verdadero", "Falso"] as const;

/** Opciones de una pregunta Verdadero/Falso, sin ninguna marcada como correcta. */
export function trueFalseOptions(): OptionDraft[] {
    return TRUE_FALSE_LABELS.map((text) => ({ text, correct: false }));
}

/** Pregunta en blanco para "Añadir pregunta" (4 opciones vacías en opción múltiple, como el composer). */
export function newQuestionDraft(type: QuestionType = "MULTIPLE_CHOICE"): QuestionDraft {
    return {
        text: "",
        type,
        explanation: "",
        options:
            type === "TRUE_FALSE"
                ? trueFalseOptions()
                : Array.from({ length: 4 }, () => ({ text: "", correct: false })),
    };
}

export function emptyDraft(): QuizDraft {
    return { name: "", description: "", difficulty: null, questions: [] };
}

/* ------------------------------------------------------------------ */
/* Validación (mismas reglas que el back)                              */
/* ------------------------------------------------------------------ */

export interface DraftIssue {
    /** Ruta en el borrador, p. ej. ["questions", 2, "options", 1, "text"]. */
    path: (string | number)[];
    /** Índice (0-based) de la pregunta afectada, o null si es del cuestionario. */
    questionIndex: number | null;
    /** Dónde: "Pregunta 3 · opción 2", "Pregunta 5" o "" (cuestionario). */
    label: string;
    /** Qué falla, en minúscula inicial: "el texto está vacío". */
    message: string;
    /** Mensaje completo y legible: "Pregunta 3 · opción 2: el texto está vacío". */
    full: string;
}

function issue(path: (string | number)[], label: string, message: string): DraftIssue {
    const questionIndex = path[0] === "questions" && typeof path[1] === "number" ? path[1] : null;
    const full = label ? `${label}: ${message}` : message.charAt(0).toUpperCase() + message.slice(1);
    return { path, questionIndex, label, message, full };
}

/** Problemas de UNA pregunta (index 0-based), sin los del cuestionario. */
export function collectQuestionIssues(question: QuestionDraft, index: number): DraftIssue[] {
    const issues: DraftIssue[] = [];
    const label = `Pregunta ${index + 1}`;
    const path = ["questions", index];
    const options = question.options ?? [];

    if (!question.text?.trim()) issues.push(issue([...path, "text"], label, "el enunciado está vacío"));
    if (question.type == null) issues.push(issue([...path, "type"], label, "elige el tipo de pregunta"));

    if (question.type === "TRUE_FALSE") {
        if (options.length !== 2) {
            issues.push(
                issue([...path, "options"], label, `Verdadero/Falso necesita exactamente 2 opciones (tiene ${options.length})`)
            );
        }
    } else if (options.length < 2) {
        issues.push(issue([...path, "options"], label, `necesita al menos 2 opciones (tiene ${options.length})`));
    }

    options.forEach((option, j) => {
        if (!option.text?.trim()) {
            issues.push(issue([...path, "options", j, "text"], `${label} · opción ${j + 1}`, "el texto está vacío"));
        }
    });

    // Con 0 opciones ya se avisa de que faltan: no se añade además "falta la correcta".
    if (options.length > 0) {
        const correct = options.filter((option) => option.correct).length;
        if (correct === 0) {
            issues.push(issue([...path, "options"], label, "falta marcar la respuesta correcta"));
        } else if (correct > 1) {
            issues.push(
                issue([...path, "options"], label, `hay ${correct} opciones marcadas como correctas y solo puede haber una`)
            );
        }
    }
    return issues;
}

/**
 * Todos los problemas del borrador. En mode "questions" solo cuentan las preguntas (los metadatos
 * del cuestionario no se envían).
 */
export function collectIssues(draft: QuizDraft, mode: ImportMode = "quiz"): DraftIssue[] {
    const issues: DraftIssue[] = [];
    if (mode === "quiz") {
        if (!draft.name?.trim()) issues.push(issue(["name"], "", "el nombre es obligatorio"));
        if (draft.difficulty == null) issues.push(issue(["difficulty"], "", "elige una dificultad"));
        const length = (draft.description ?? "").trim().length;
        if (length > DESCRIPTION_MAX) {
            issues.push(
                issue(["description"], "", `la descripción no puede pasar de ${DESCRIPTION_MAX} caracteres (tiene ${length})`)
            );
        }
    }
    const questions = draft.questions ?? [];
    if (questions.length === 0) issues.push(issue(["questions"], "", "añade al menos una pregunta"));
    questions.forEach((question, index) => issues.push(...collectQuestionIssues(question, index)));
    return issues;
}

const questionShape = z.object({
    text: z.string(),
    type: z.enum(QUESTION_TYPES).nullable(),
    explanation: z.string(),
    options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
});

const draftShape = z.object({
    name: z.string(),
    description: z.string(),
    difficulty: z.enum(DIFFICULTIES).nullable(),
    questions: z.array(questionShape),
});

// Las reglas viven en collectIssues (una sola fuente para el esquema y para la UI): el esquema solo
// comprueba la forma y delega en ella con superRefine, así que corre aunque haya textos vacíos.
function schemaFor(mode: ImportMode) {
    return draftShape.superRefine((draft, ctx) => {
        for (const found of collectIssues(draft, mode)) {
            ctx.addIssue({ code: "custom", path: found.path, message: found.full });
        }
    });
}

const SCHEMAS = { quiz: schemaFor("quiz"), questions: schemaFor("questions") } as const;

/** Esquema zod del borrador (resolver de react-hook-form). Los mensajes llevan la ruta legible. */
export function quizDraftSchema(mode: ImportMode = "quiz") {
    return SCHEMAS[mode];
}

/* ------------------------------------------------------------------ */
/* Conversión a/desde el formato del back                              */
/* ------------------------------------------------------------------ */

function questionToExportable(question: QuestionDraft, position: number): QuestionExportableDto {
    if (question.type == null) throw new Error("Pregunta sin tipo: valida el borrador antes de exportarlo.");
    const explanation = question.explanation.trim();
    return {
        text: question.text.trim(),
        position,
        type: question.type,
        ...(explanation && { explanation }),
        options: question.options.map(
            (option, j): OptionExportableDto => ({ text: option.text.trim(), correct: option.correct, position: j + 1 })
        ),
    };
}

/** Preguntas del borrador listas para el body de `POST /quiz/{id}/questions/import` (positions 1..n). */
export function draftQuestionsToExportable(questions: QuestionDraft[]): QuestionExportableDto[] {
    return questions.map((question, i) => questionToExportable(question, i + 1));
}

/** Body de `POST /quiz/import` (positions 1..n). Lanza si falta tipo/dificultad: valida antes. */
export function draftToExportable(draft: QuizDraft): QuizExportableDto {
    if (draft.difficulty == null) throw new Error("Cuestionario sin dificultad: valida el borrador antes de exportarlo.");
    const description = draft.description.trim();
    return {
        name: draft.name.trim(),
        ...(description && { description }),
        difficulty: draft.difficulty,
        questions: draftQuestionsToExportable(draft.questions),
    };
}

/**
 * JSON bonito del borrador, con la misma forma que el export del back (intercambiable). En mode
 * "questions" solo se serializa `{ questions: [...] }`. Tolera borradores incompletos (sin tipo o
 * sin dificultad): es lo que se ve en la pestaña JSON mientras se edita.
 */
export function draftToJson(draft: QuizDraft, mode: ImportMode = "quiz"): string {
    const questions = draft.questions.map((question, i) => {
        const explanation = question.explanation.trim();
        return {
            text: question.text,
            position: i + 1,
            type: question.type ?? undefined,
            ...(explanation && { explanation: question.explanation }),
            options: question.options.map((option, j) => ({ text: option.text, correct: option.correct, position: j + 1 })),
        };
    });
    const body =
        mode === "questions"
            ? { questions }
            : {
                  name: draft.name,
                  ...(draft.description && { description: draft.description }),
                  difficulty: draft.difficulty ?? undefined,
                  questions,
              };
    return JSON.stringify(body, null, 2);
}

/* ------------------------------------------------------------------ */
/* Parseo tolerante                                                    */
/* ------------------------------------------------------------------ */

export interface ParseError {
    message: string;
    /** 1-based; ausentes si el motor no da la posición. */
    line?: number;
    column?: number;
    /** Desplazamiento en el texto (para colocar el cursor). */
    position?: number;
    /** Ayuda extra (p. ej. las barras invertidas de LaTeX). */
    hint?: string;
}

export type ParseResult =
    | { draft: QuizDraft; warnings: string[]; error?: undefined }
    | { error: ParseError; draft?: undefined; warnings?: undefined };

/** Línea y columna (1-based) de un desplazamiento en el texto. */
export function positionToLineColumn(text: string, position: number): { line: number; column: number } {
    const clamped = Math.max(0, Math.min(position, text.length));
    let line = 1;
    let lineStart = 0;
    for (let i = 0; i < clamped; i++) {
        if (text.charCodeAt(i) === 10) {
            line++;
            lineStart = i + 1;
        }
    }
    return { line, column: clamped - lineStart + 1 };
}

/** Desplazamiento de una línea/columna (1-based), el inverso de positionToLineColumn. */
export function lineColumnToPosition(text: string, line: number, column: number): number {
    let pos = 0;
    for (let l = 1; l < line; l++) {
        const next = text.indexOf("\n", pos);
        if (next === -1) return text.length;
        pos = next + 1;
    }
    return Math.min(pos + Math.max(0, column - 1), text.length);
}

const BACKSLASH_HINT =
    "En JSON las barras invertidas se escriben dobles: \"\\\\frac{1}{2}\" para escribir \\frac{1}{2}.";

function describeSyntaxError(text: string, error: unknown): ParseError {
    const raw = error instanceof Error ? error.message : String(error);
    let position: number | undefined;
    let line: number | undefined;
    let column: number | undefined;

    // V8: "... in JSON at position 45 (line 3 column 5)" (o solo "position 45" en versiones antiguas).
    // Firefox: "... at line 3 column 5 of the JSON data". Safari no da posición.
    const lc = /line (\d+) column (\d+)/i.exec(raw);
    const pos = /position (\d+)/i.exec(raw);
    if (pos) {
        position = Math.min(Number(pos[1]), text.length);
        ({ line, column } = positionToLineColumn(text, position));
    } else if (lc) {
        line = Number(lc[1]);
        column = Number(lc[2]);
        position = lineColumnToPosition(text, line, column);
    } else if (/unexpected end/i.test(raw)) {
        position = text.length;
        ({ line, column } = positionToLineColumn(text, position));
    }

    const where = line != null ? ` en la línea ${line}, columna ${column}` : "";
    const escapeProblem = /escape|control character/i.test(raw);
    return {
        message: `El JSON no es válido${where}. (${raw})`,
        line,
        column,
        position,
        hint: escapeProblem ? BACKSLASH_HINT : undefined,
    };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function asText(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

/** Ordena por `position` solo si TODOS la traen (entera) y son distintas; si no, respeta el orden del array. */
function sortedByPosition<T>(items: T[], positionOf: (item: T) => unknown): T[] {
    const positions = items.map(positionOf);
    const usable =
        items.length > 1 &&
        positions.every((p) => typeof p === "number" && Number.isFinite(p)) &&
        new Set(positions).size === positions.length;
    if (!usable) return items;
    return items
        .map((item, index) => ({ item, index, position: positions[index] as number }))
        .sort((a, b) => a.position - b.position || a.index - b.index)
        .map(({ item }) => item);
}

function parseOptions(raw: unknown, label: string, warnings: string[]): OptionDraft[] {
    if (raw == null) return [];
    if (!Array.isArray(raw)) {
        warnings.push(`${label}: «options» debería ser una lista; se ha ignorado.`);
        return [];
    }
    const options = sortedByPosition(raw, (item) => (isRecord(item) ? item.position : undefined));
    return options.map((item, j): OptionDraft => {
        if (typeof item === "string") return { text: item.trim(), correct: false };
        if (!isRecord(item)) {
            warnings.push(`${label} · opción ${j + 1}: no es un objeto; se ha dejado vacía.`);
            return { text: "", correct: false };
        }
        // `isCorrect` es un alias de `correct` (el back acepta ambos).
        const flag = item.correct ?? item.isCorrect;
        return { text: asText(item.text), correct: flag === true || flag === "true" };
    });
}

function parseQuestion(raw: unknown, index: number, warnings: string[]): QuestionDraft {
    const label = `Pregunta ${index + 1}`;
    if (!isRecord(raw)) {
        warnings.push(`${label}: no es un objeto; se ha dejado vacía.`);
        return newQuestionDraft();
    }

    let type: QuestionType | null = null;
    const rawType = typeof raw.type === "string" ? raw.type.trim().toUpperCase().replace(/[\s-]+/g, "_") : "";
    if ((QUESTION_TYPES as readonly string[]).includes(rawType)) {
        type = rawType as QuestionType;
    } else if (raw.type == null || rawType === "") {
        warnings.push(`${label}: no indica el tipo; elígelo en el formulario.`);
    } else {
        warnings.push(`${label}: tipo desconocido «${String(raw.type)}»; elígelo en el formulario.`);
    }

    let options = parseOptions(raw.options, label, warnings);
    if (type === "TRUE_FALSE" && options.length === 0) {
        options = trueFalseOptions();
        warnings.push(`${label}: Verdadero/Falso sin opciones; se han generado «Verdadero» y «Falso». Falta marcar la correcta.`);
    }

    return { text: asText(raw.text), type, explanation: asText(raw.explanation), options };
}

function parseDifficulty(value: unknown, warnings: string[]): Difficulty | null {
    if (value == null || value === "") return null;
    const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
    if ((DIFFICULTIES as readonly string[]).includes(normalized)) return normalized as Difficulty;
    warnings.push(`Dificultad desconocida «${String(value)}»; elige una en el formulario.`);
    return null;
}

/**
 * Convierte el texto de un JSON en un borrador, sin lanzar nunca. Acepta un cuestionario completo
 * (`QuizExportableDto`), `{ questions: [...] }` o un array suelto de preguntas.
 *  - mode "quiz": si solo vienen preguntas, nombre/descripción/dificultad quedan vacíos.
 *  - mode "questions": si viene un cuestionario completo se cogen sus preguntas y se avisa de que
 *    los metadatos se ignoran.
 * Los defectos recuperables van en `warnings`; los problemas de validación (opciones, correcta…) se
 * ven luego con `collectIssues`.
 */
export function parseQuizJson(text: string, mode: ImportMode = "quiz"): ParseResult {
    try {
        const source = text.replace(/^﻿/, "");
        if (source.trim() === "") return { error: { message: "No hay nada que cargar: el JSON está vacío." } };

        let root: unknown;
        try {
            root = JSON.parse(source);
        } catch (error) {
            return { error: describeSyntaxError(source, error) };
        }

        const warnings: string[] = [];
        let rawQuestions: unknown;
        let meta: Record<string, unknown> = {};

        if (Array.isArray(root)) {
            rawQuestions = root;
        } else if (isRecord(root) && Array.isArray(root.questions)) {
            rawQuestions = root.questions;
            meta = root;
        } else if (isRecord(root) && "text" in root && "options" in root) {
            rawQuestions = [root];
            warnings.push("El JSON es una sola pregunta; se ha cargado como una lista de una pregunta.");
        } else if (isRecord(root) && "questions" in root) {
            return { error: { message: "«questions» debe ser una lista de preguntas." } };
        } else {
            return {
                error: {
                    message:
                        "No reconozco el formato: se esperaba un cuestionario (objeto con «questions») o una lista de preguntas.",
                },
            };
        }

        const hasMeta = ["name", "description", "difficulty"].some((key) => key in meta);
        const draft: QuizDraft = emptyDraft();

        if (mode === "quiz") {
            draft.name = asText(meta.name);
            draft.description = asText(meta.description);
            draft.difficulty = parseDifficulty(meta.difficulty, warnings);
        } else if (hasMeta) {
            warnings.push("Se ignoran los datos del cuestionario (nombre, descripción, dificultad): solo se añaden sus preguntas.");
        }

        const questions = sortedByPosition(rawQuestions as unknown[], (item) => (isRecord(item) ? item.position : undefined));
        draft.questions = questions.map((raw, i) => parseQuestion(raw, i, warnings));
        return { draft, warnings };
    } catch (error) {
        // Red de seguridad: este parser no debe lanzar nunca.
        return { error: { message: `No se pudo leer el contenido (${error instanceof Error ? error.message : "error desconocido"}).` } };
    }
}

/* ------------------------------------------------------------------ */
/* Plantilla                                                           */
/* ------------------------------------------------------------------ */

// Se escribe como objeto y se serializa: JSON.stringify se encarga de escapar las barras invertidas
// del LaTeX (aquí con String.raw para leerlo tal cual se vería en el editor).
const TEMPLATE = {
    name: "Límites y continuidad: ejemplo",
    description: "Cuestionario de ejemplo con fórmulas LaTeX y explicaciones en Markdown. Sustituye su contenido por el tuyo.",
    difficulty: "MEDIUM",
    questions: [
        {
            text: String.raw`¿Cuánto vale el límite $\lim_{x \to 0} \frac{\sin x}{x}$?`,
            position: 1,
            type: "MULTIPLE_CHOICE",
            explanation: String.raw`Es el **límite notable** del seno: $\lim_{x \to 0} \frac{\sin x}{x} = 1$.`,
            options: [
                { text: "$0$", correct: false, position: 1 },
                { text: "$1$", correct: true, position: 2 },
                { text: String.raw`$\infty$`, correct: false, position: 3 },
                { text: "No existe", correct: false, position: 4 },
            ],
        },
        {
            text: "Toda función continua en un intervalo cerrado y acotado $[a, b]$ está acotada en él.",
            position: 2,
            type: "TRUE_FALSE",
            options: [
                { text: "Verdadero", correct: true, position: 1 },
                { text: "Falso", correct: false, position: 2 },
            ],
        },
        {
            text: String.raw`Si $f$ es continua en $[a, b]$ y derivable en $(a, b)$, ¿qué afirma el teorema del valor medio de Lagrange?`,
            position: 3,
            type: "MULTIPLE_CHOICE",
            explanation:
                String.raw`Existe $c \in (a, b)$ tal que:` +
                "\n\n" +
                String.raw`$$f'(c) = \frac{f(b) - f(a)}{b - a}$$` +
                "\n\n" +
                "Hipótesis a comprobar siempre:\n\n- continuidad en $[a, b]$\n- derivabilidad en $(a, b)$",
            options: [
                { text: String.raw`Existe $c$ con $f'(c) = \dfrac{f(b) - f(a)}{b - a}$`, correct: true, position: 1 },
                { text: "Existe $c$ con $f(c) = 0$", correct: false, position: 2 },
                { text: "La derivada es siempre constante", correct: false, position: 3 },
            ],
        },
    ],
};

/** Ejemplo de JSON de cuestionario completo (3 preguntas) con la forma del export del back. */
export const QUIZ_JSON_TEMPLATE = JSON.stringify(TEMPLATE, null, 2);

/** Plantilla según el modo: en "questions" solo `{ "questions": [...] }`. */
export function jsonTemplate(mode: ImportMode): string {
    return mode === "quiz" ? QUIZ_JSON_TEMPLATE : JSON.stringify({ questions: TEMPLATE.questions }, null, 2);
}

/* ------------------------------------------------------------------ */
/* Enlace a la página de importación                                   */
/* ------------------------------------------------------------------ */

export const QUIZ_IMPORT_HREF = "/dashboard/admin/quizzes/import";

/**
 * URL de la página de importación con la asignatura/tema preseleccionados y la ruta a la que vuelve
 * "Volver" (`returnTo`, solo rutas internas `/dashboard…`; la página descarta cualquier otra).
 */
export function quizImportHref({
    subjectId,
    subjectUnitId,
    returnTo,
}: {
    subjectId?: number | null;
    subjectUnitId?: number | null;
    returnTo?: string | null;
} = {}): string {
    const params = new URLSearchParams();
    if (subjectId != null) {
        params.set("subjectId", String(subjectId));
        // Un tema sin asignatura no tiene sentido: la página también lo ignora.
        if (subjectUnitId != null) params.set("subjectUnitId", String(subjectUnitId));
    }
    if (returnTo) params.set("returnTo", returnTo);
    const query = params.toString();
    return query ? `${QUIZ_IMPORT_HREF}?${query}` : QUIZ_IMPORT_HREF;
}
