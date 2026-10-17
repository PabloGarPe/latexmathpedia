import { memo } from "react";
import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import NextLink from "next/link";
import { ImageIcon } from "lucide-react";
import "katex/dist/katex.min.css";

import { cn } from "@/lib/utils";
import { normalizeMathDelimiters } from "@/lib/rich-text";
import { remarkNoImages } from "./remark-images";

/**
 * Renderer de texto enriquecido (Markdown + LaTeX). Sin hooks: sirve en server y client components.
 *
 * Seguro para contenido de usuarios: no hay HTML crudo (sin rehype-raw; el HTML que se escriba se
 * muestra como texto literal, no con `skipHtml`, para no perder cosas como "a<b y c>d"), los enlaces
 * solo admiten http/https/mailto y rutas relativas, y las imágenes no se cargan (se pintan como
 * enlace).
 *
 * El texto HEREDA el color del contenedor (no se usa `prose`): código, bordes y enlaces se derivan de
 * `currentColor`, así que se ve igual sobre fondo claro, oscuro o `bg-primary`.
 */
export interface RichTextProps {
    /** Markdown con LaTeX: `$…$`, `$$…$$`, `\(…\)` y `\[…\]`. */
    content: string;
    /**
     * - `full`: texto largo (enunciados, explicaciones): párrafos, listas, tablas, bloques de código…
     * - `compact`: frases cortas (opciones, cabeceras, chat, comentarios). Solo emite `span`, así que
     *   es válido dentro de `<label>` o `<button>`.
     */
    variant?: "full" | "compact";
    /**
     * Con `false` los enlaces se pintan como `<span>` subrayado, para poder meter el texto dentro de
     * un `<button>`/`<label>` sin anidar elementos interactivos.
     */
    interactive?: boolean;
    className?: string;
}

type Variant = NonNullable<RichTextProps["variant"]>;

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkNoImages];
// Con throwOnError false una fórmula rota se pinta como texto subrayado en su sitio y el resto sigue
// visible. El color de error de KaTeX (#cc0000) no tiene contraste sobre bg-primary: se hereda.
const REHYPE_PLUGINS: NonNullable<React.ComponentProps<typeof Markdown>["rehypePlugins"]> = [
    [rehypeKatex, { throwOnError: false, strict: false, trust: false, errorColor: "inherit" }],
];

/** Como el transform por defecto, pero solo http, https y mailto (o rutas relativas). */
function safeUrlTransform(url: string): string {
    const safe = defaultUrlTransform(url);
    if (/^[a-z][a-z0-9+.-]*:/i.test(safe) && !/^(https?|mailto):/i.test(safe)) return "";
    return safe;
}

const LINK_CLASS =
    "underline decoration-current/50 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current";
const INLINE_CODE_CLASS = "rounded bg-current/10 px-1 py-0.5 font-mono text-[0.85em]";
const CELL_CLASS = "border border-current/20 px-2 py-1 align-top";

function buildComponents(variant: Variant, interactive: boolean): Components {
    const compact = variant === "compact";

    // Bloque: <div>/<p>… en "full"; <span class="block"> en "compact" (contenido phrasing).
    const block = (full: keyof React.JSX.IntrinsicElements, className: string, compactClassName = className) => {
        const Tag = (compact ? "span" : full) as "div";
        const cls = compact ? cn("block", compactClassName) : className;
        const BlockEl: React.FC<{ children?: React.ReactNode }> = ({ children }) => <Tag className={cls}>{children}</Tag>;
        return BlockEl;
    };
    const heading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6", className: string) =>
        block(tag, className, "my-1 font-semibold");

    const A: Components["a"] = ({ href, children, className }) => {
        const isImage = typeof className === "string" && className.includes("rt-image");
        const content = (
            <>
                {isImage && <ImageIcon aria-hidden className="mr-1 inline size-[1em] -translate-y-px" />}
                {children}
            </>
        );
        if (!href || !interactive) return <span className={LINK_CLASS}>{content}</span>;
        if (href.startsWith("/") && !href.startsWith("//")) {
            return (
                <NextLink href={href} className={LINK_CLASS}>
                    {content}
                </NextLink>
            );
        }
        if (href.startsWith("#")) {
            return (
                <a href={href} className={LINK_CLASS}>
                    {content}
                </a>
            );
        }
        return (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
                {content}
            </a>
        );
    };

    return {
        a: A,
        // Las imágenes ya las convierte remarkNoImages; esto es solo una red de seguridad.
        img: () => null,
        // Casillas de las listas de tareas GFM: texto en vez de <input>, que dentro de un
        // <label>/<button> sería otro control interactivo.
        input: ({ checked }) => (
            <span role="img" aria-label={checked ? "Hecho" : "Pendiente"} className="mr-1.5">
                {checked ? "☑" : "☐"}
            </span>
        ),
        p: block("p", "my-2", "my-1.5 whitespace-pre-line"),
        h1: heading("h1", "mt-3 mb-1.5 text-lg font-semibold leading-snug"),
        h2: heading("h2", "mt-3 mb-1.5 text-base font-semibold leading-snug"),
        h3: heading("h3", "mt-2 mb-1 text-sm font-semibold"),
        h4: heading("h4", "mt-2 mb-1 text-sm font-semibold"),
        h5: heading("h5", "mt-2 mb-1 text-sm font-semibold"),
        h6: heading("h6", "mt-2 mb-1 text-sm font-semibold"),
        blockquote: block("blockquote", "my-2 border-l-2 border-current/30 pl-3", "my-1 border-l-2 border-current/30 pl-3"),
        hr: compact
            ? () => <span role="separator" className="my-2 block border-t border-current/20" />
            : () => <hr className="my-3 border-current/20" />,
        ul: compact
            ? ({ className, children }) => (
                  <span
                      role="list"
                      className={cn(
                          "my-1 block list-disc pl-5",
                          typeof className === "string" && className.includes("contains-task-list") && "list-none pl-0"
                      )}
                  >
                      {children}
                  </span>
              )
            : ({ className, children }) => (
                  <ul
                      className={cn(
                          "my-2 list-disc space-y-0.5 pl-5 [&_ol]:my-1 [&_ul]:my-1",
                          typeof className === "string" && className.includes("contains-task-list") && "list-none pl-0"
                      )}
                  >
                      {children}
                  </ul>
              ),
        ol: compact
            ? ({ children }) => (
                  <span role="list" className="my-1 block list-decimal pl-5">
                      {children}
                  </span>
              )
            : ({ start, children }) => (
                  <ol start={start} className="my-2 list-decimal space-y-0.5 pl-5 [&_ol]:my-1 [&_ul]:my-1">
                      {children}
                  </ol>
              ),
        li: compact
            ? ({ children }) => (
                  <span role="listitem" className="list-item pl-0.5 marker:text-current/70">
                      {children}
                  </span>
              )
            : ({ children }) => <li className="pl-0.5 marker:text-current/70">{children}</li>,
        // El <pre> de react-markdown envuelve a un <code>; el fondo lo pone el contenedor.
        pre: compact
            ? ({ children }) => (
                  <span className="my-1 block overflow-x-auto whitespace-pre rounded-md bg-current/10 px-2 py-1 font-mono text-[0.85em] [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]">
                      {children}
                  </span>
              )
            : ({ children }) => (
                  <pre className="my-2 overflow-x-auto rounded-md bg-current/10 p-3 font-mono text-[0.85em] leading-relaxed [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]">
                      {children}
                  </pre>
              ),
        code: ({ className, children }) => <code className={cn(INLINE_CODE_CLASS, className)}>{children}</code>,
        table: ({ children }) => {
            const table = <table className="w-full border-collapse text-[0.92em]">{children}</table>;
            return compact ? (
                <span className="my-1 block overflow-x-auto">{table}</span>
            ) : (
                <div className="my-2 overflow-x-auto">{table}</div>
            );
        },
        th: ({ style, children }) => (
            <th style={style} className={cn(CELL_CLASS, "bg-current/5 text-left font-semibold")}>
                {children}
            </th>
        ),
        td: ({ style, children }) => (
            <td style={style} className={cn(CELL_CLASS, "text-left")}>
                {children}
            </td>
        ),
        // Notas al pie de GFM: <section> sería un bloque dentro de contenido phrasing.
        ...(compact && { section: block("div", "") }),
    };
}

const COMPONENTS: Record<Variant, Record<"interactive" | "static", Components>> = {
    full: { interactive: buildComponents("full", true), static: buildComponents("full", false) },
    compact: { interactive: buildComponents("compact", true), static: buildComponents("compact", false) },
};

const WRAPPER_CLASS = cn(
    "min-w-0 max-w-full break-words text-inherit",
    // Sin margen arriba/abajo del primer/último bloque: el contenedor decide el espaciado.
    "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
    // Fórmulas en bloque: scroll horizontal propio (globals.css fuerza `scroll`) sin ensanchar nada.
    "[&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-0.5",
    // Fórmula rota: subrayado ondulado en su sitio (el color se hereda).
    "[&_.katex-error]:underline [&_.katex-error]:decoration-wavy"
);

function RichTextImpl({ content, variant = "full", interactive = true, className }: RichTextProps) {
    const Wrapper = variant === "compact" ? "span" : "div";
    return (
        <Wrapper className={cn(WRAPPER_CLASS, variant === "compact" && "block", className)}>
            <Markdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={COMPONENTS[variant][interactive ? "interactive" : "static"]}
                urlTransform={safeUrlTransform}
            >
                {normalizeMathDelimiters(content)}
            </Markdown>
        </Wrapper>
    );
}

export const RichText = memo(RichTextImpl);
