/**
 * Utilidades puras del texto enriquecido (Markdown + LaTeX). Sin dependencias de React para poder
 * usarlas en server components, en el editor y en tests.
 */

/* ------------------------------------------------------------------ */
/* Delimitadores LaTeX: \( … \) y \[ … \]  →  $ … $ y $$ … $$          */
/* ------------------------------------------------------------------ */

// Un hueco sin líneas en blanco: evita que un `\(` suelto se trague medio documento.
const NO_BLANK_LINE = String.raw`(?:(?!\n[ \t]*\n)[\s\S])`;
const INLINE_PAREN_RE = new RegExp(String.raw`(?<!\\)\\\((${NO_BLANK_LINE}+?)(?<!\\)\\\)`, "g");
const BRACKET_RE = new RegExp(String.raw`(?<!\\)\\\[(${NO_BLANK_LINE}+?)(?<!\\)\\\]`, "g");
// Línea de apertura de un bloque de código vallado (``` o ~~~).
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;
// Código inline: una tanda de backticks y su cierre con la misma longitud.
const INLINE_CODE_RE = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;

// `$$…$$` solo en su línea: remark-math lo trata como fórmula en línea; lo pasamos a bloque.
const LONE_DISPLAY_RE = /^[ \t]*\$\$([^\n$]+?)\$\$[ \t]*$/gm;

function convertMathDelimiters(text: string): string {
    text = text.replace(LONE_DISPLAY_RE, (_m, inner: string) => `$$\n${inner.trim()}\n$$`);
    if (!text.includes("\\")) return text;

    let out = text.replace(BRACKET_RE, (match, inner: string, offset: number, whole: string) => {
        if (inner.includes("$")) return match;
        const lineStart = whole.lastIndexOf("\n", offset - 1) + 1;
        const lineEndIdx = whole.indexOf("\n", offset + match.length);
        const lineEnd = lineEndIdx === -1 ? whole.length : lineEndIdx;
        const alone =
            whole.slice(lineStart, offset).trim() === "" &&
            whole.slice(offset + match.length, lineEnd).trim() === "";
        // Sola en su línea: bloque `$$` clásico. En medio de un párrafo: `$$…$$` en una línea.
        if (alone) return `$$\n${inner.trim()}\n$$`;
        return `$$${inner.replace(/\s*\n\s*/g, " ").trim()}$$`;
    });

    out = out.replace(INLINE_PAREN_RE, (match, inner: string) =>
        inner.includes("$") ? match : `$${inner.replace(/\s*\n\s*/g, " ").trim()}$`
    );
    return out;
}

/** Aplica la conversión solo fuera del código inline. */
function convertOutsideInlineCode(text: string): string {
    let result = "";
    let last = 0;
    for (const m of text.matchAll(INLINE_CODE_RE)) {
        result += convertMathDelimiters(text.slice(last, m.index));
        result += m[0];
        last = m.index + m[0].length;
    }
    return result + convertMathDelimiters(text.slice(last));
}

/**
 * Prepara el Markdown para remark-math: convierte `\(…\)` en `$…$` y `\[…\]` en `$$…$$`, y un
 * `$$…$$` que ocupa toda su línea en un bloque `$$\n…\n$$` (fórmula centrada). No toca el interior
 * de bloques de código vallados ni de código inline.
 */
export function normalizeMathDelimiters(md: string): string {
    if (!md.includes("$$") && !md.includes("\\(") && !md.includes("\\[")) return md;

    const lines = md.split("\n");
    const out: string[] = [];
    let chunk: string[] = [];
    let fence: { char: string; len: number } | null = null;

    const flush = () => {
        if (chunk.length) out.push(convertOutsideInlineCode(chunk.join("\n")));
        chunk = [];
    };

    for (const line of lines) {
        if (fence) {
            out.push(line);
            const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
            if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null;
            continue;
        }
        const open = FENCE_OPEN_RE.exec(line);
        if (open) {
            flush();
            fence = { char: open[1][0], len: open[1].length };
            out.push(line);
            continue;
        }
        chunk.push(line);
    }
    flush();
    return out.join("\n");
}

/* ------------------------------------------------------------------ */
/* Texto plano                                                          */
/* ------------------------------------------------------------------ */

/**
 * Quita la sintaxis Markdown básica (énfasis, enlaces, encabezados, listas, código) y deja el LaTeX
 * fuente sin los `$`. Pensado para aria-labels, labels de drag & drop, toasts…
 */
export function toPlainText(md: string): string {
    // Protegemos con marcadores lo que no debe tocar la limpieza: código, `\$` y fórmulas.
    const saved: string[] = [];
    const keep = (s: string) => `\u0000${saved.push(s) - 1}\u0000`;

    let text = normalizeMathDelimiters(md)
        .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n([\s\S]*?)(?:\n {0,3}\1[`~]*[ \t]*(?=\n|$)|$)/gm, (_m, _f, code: string) =>
            keep(code)
        )
        .replace(INLINE_CODE_RE, (m) => keep(m.replace(/^`+\s?|\s?`+$/g, "")))
        .replace(/\\\$/g, () => keep("$"))
        .replace(/\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g, (_m, block?: string, inline?: string) =>
            keep((block ?? inline ?? "").trim())
        );

    text = text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^ {0,3}#{1,6}[ \t]+/gm, "")
        .replace(/^ {0,3}>[ \t]?/gm, "")
        .replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gm, "")
        .replace(/^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "")
        .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_m, a?: string, b?: string) => a ?? b ?? "")
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/\*(?!\s)(.+?)\*/g, "$1")
        .replace(/(?<![\w\u0000])_(?!\s)(.+?)_(?![\w\u0000])/g, "$1")
        .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1");

    return text
        .replace(/\u0000(\d+)\u0000/g, (_m, i: string) => saved[Number(i)])
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Heurística barata: ¿el texto parece usar algo más que texto plano? Sirve para decidir, p. ej., si
 * merece la pena mostrar una vista previa. Puede dar falsos positivos, nunca falsos negativos.
 */
export function hasRichSyntax(text: string): boolean {
    return /[$*_`~]|\\[(\[]|\n|\]\(|^\s{0,3}(?:#{1,6}\s|>|[-+]\s|\d+[.)]\s)/m.test(text);
}

/* ------------------------------------------------------------------ */
/* Inserción de formato (toolbar del editor)                            */
/* ------------------------------------------------------------------ */

export interface TextSelectionState {
    value: string;
    selectionStart: number;
    selectionEnd: number;
}

export type RichTextFormat = "bold" | "italic" | "code" | "list" | "math" | "mathBlock";

const WRAP_DELIMITERS: Record<"bold" | "italic" | "code" | "math", string> = {
    bold: "**",
    italic: "*",
    code: "`",
    math: "$",
};

function wrapSelection(state: TextSelectionState, delim: string, italic: boolean): TextSelectionState {
    const { value, selectionStart: start, selectionEnd: end } = state;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    // Alternar: la selección ya está rodeada por los delimitadores → se quitan.
    // En cursiva, un `**` pegado significa negrita, no cursiva.
    const surrounded =
        before.endsWith(delim) &&
        after.startsWith(delim) &&
        !(italic && (before.endsWith("**") || after.startsWith("**")));
    if (surrounded) {
        const s = start - delim.length;
        return {
            value: before.slice(0, s) + selected + after.slice(delim.length),
            selectionStart: s,
            selectionEnd: s + selected.length,
        };
    }
    // O la selección incluye los delimitadores.
    if (
        selected.length >= delim.length * 2 &&
        selected.startsWith(delim) &&
        selected.endsWith(delim) &&
        !(italic && selected.startsWith("**"))
    ) {
        const inner = selected.slice(delim.length, selected.length - delim.length);
        return { value: before + inner + after, selectionStart: start, selectionEnd: start + inner.length };
    }

    return {
        value: before + delim + selected + delim + after,
        selectionStart: start + delim.length,
        selectionEnd: end + delim.length,
    };
}

function toggleList(state: TextSelectionState): TextSelectionState {
    const { value, selectionStart, selectionEnd } = state;
    const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    // Si la selección termina justo al inicio de una línea, esa línea no cuenta.
    const effectiveEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
    const nextNl = value.indexOf("\n", effectiveEnd);
    const blockEnd = nextNl === -1 ? value.length : nextNl;

    const lines = value.slice(blockStart, blockEnd).split("\n");
    const allListed = lines.every((l) => /^- /.test(l));
    const newLines = lines.map((l) => (allListed ? l.slice(2) : `- ${l}`));
    const block = newLines.join("\n");
    const result = value.slice(0, blockStart) + block + value.slice(blockEnd);

    if (selectionStart === selectionEnd) {
        const delta = allListed ? -2 : 2;
        const pos = Math.max(blockStart, selectionStart + delta);
        return { value: result, selectionStart: pos, selectionEnd: pos };
    }
    return { value: result, selectionStart: blockStart, selectionEnd: blockStart + block.length };
}

function wrapBlockMath(state: TextSelectionState): TextSelectionState {
    const { value, selectionStart: start, selectionEnd: end } = state;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    // `$$` va en líneas propias: añadimos saltos solo si hacen falta.
    const lead = before === "" || before.endsWith("\n") ? "" : "\n";
    const trail = after === "" || after.startsWith("\n") ? "" : "\n";
    const open = `${lead}$$\n`;
    const inserted = `${open}${selected}\n$$${trail}`;
    return {
        value: before + inserted + after,
        selectionStart: start + open.length,
        selectionEnd: start + open.length + selected.length,
    };
}

/**
 * Aplica un formato a la selección de un textarea y devuelve el nuevo valor y la nueva selección.
 * Con selección envuelve (o desenvuelve, si ya estaba envuelta); sin selección inserta los
 * delimitadores con el cursor en medio.
 */
export function applyRichTextFormat(state: TextSelectionState, format: RichTextFormat): TextSelectionState {
    const clamp = (n: number) => Math.min(Math.max(n, 0), state.value.length);
    const start = clamp(Math.min(state.selectionStart, state.selectionEnd));
    const end = clamp(Math.max(state.selectionStart, state.selectionEnd));
    const normalized = { value: state.value, selectionStart: start, selectionEnd: end };

    switch (format) {
        case "list":
            return toggleList(normalized);
        case "mathBlock":
            return wrapBlockMath(normalized);
        default:
            return wrapSelection(normalized, WRAP_DELIMITERS[format], format === "italic");
    }
}
