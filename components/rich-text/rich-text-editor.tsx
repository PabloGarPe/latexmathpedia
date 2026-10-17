"use client";

import { useCallback, useDeferredValue, useRef, useState } from "react";
import { Bold, CircleHelp, Code, Italic, List, Sigma, SquareSigma, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyRichTextFormat, hasRichSyntax, type RichTextFormat } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { MarkdownHelp } from "./markdown-help";
import { RichText } from "./rich-text";

/**
 * Editor de texto enriquecido: textarea de texto plano (Markdown + LaTeX) con barra de formato y
 * vista previa en vivo debajo. Controlado.
 *
 * Con react-hook-form, vía `Controller` (el `ref` llega al textarea, así que `setFocus` funciona):
 *
 *   <Controller control={control} name="statement" render={({ field, fieldState }) => (
 *     <RichTextEditor {...field} aria-invalid={fieldState.invalid} />
 *   )} />
 */
export interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
    /** Se llama después de los atajos del editor (Ctrl/Cmd+B, I, E, M), que se tragan su evento. */
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    id?: string;
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    "aria-invalid"?: React.AriaAttributes["aria-invalid"];
    "aria-label"?: string;
    "aria-describedby"?: string;
    /** Líneas mínimas del textarea (crece solo con el contenido). Por defecto 1 en compact. */
    minRows?: number;
    /**
     * - `full`: enunciados, explicaciones (barra siempre visible, preview siempre que haya texto).
     * - `compact`: opciones de respuesta (barra discreta que aparece con el foco; preview solo si el
     *   texto usa sintaxis).
     */
    variant?: "full" | "compact";
    /** Clases del contenedor. */
    className?: string;
    textareaClassName?: string;
    /** React 19: ref como prop, hacia el `<textarea>`. */
    ref?: React.Ref<HTMLTextAreaElement>;
}

const TOOLS: { format: RichTextFormat; label: string; shortcut?: string; icon: LucideIcon }[] = [
    { format: "bold", label: "Negrita", shortcut: "B", icon: Bold },
    { format: "italic", label: "Cursiva", shortcut: "I", icon: Italic },
    { format: "code", label: "Código", shortcut: "E", icon: Code },
    { format: "list", label: "Lista", icon: List },
    { format: "math", label: "Fórmula en línea", shortcut: "M", icon: Sigma },
    { format: "mathBlock", label: "Fórmula en bloque", icon: SquareSigma },
];

const SHORTCUTS: Record<string, RichTextFormat> = { b: "bold", i: "italic", e: "code", m: "math" };

export function RichTextEditor({
    value,
    onChange,
    onBlur,
    onKeyDown,
    id,
    name,
    placeholder,
    disabled,
    autoFocus,
    "aria-invalid": ariaInvalid,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    minRows,
    variant = "full",
    className,
    textareaClassName,
    ref,
}: RichTextEditorProps) {
    const compact = variant === "compact";
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const deferredValue = useDeferredValue(value);

    const setRefs = useCallback(
        (el: HTMLTextAreaElement | null) => {
            innerRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
        },
        [ref]
    );

    const applyFormat = (format: RichTextFormat) => {
        const ta = innerRef.current;
        if (!ta || disabled) return;
        const next = applyRichTextFormat(
            { value: ta.value, selectionStart: ta.selectionStart, selectionEnd: ta.selectionEnd },
            format
        );

        // Reemplazamos solo el tramo que cambia con execCommand para conservar el deshacer (Ctrl+Z)
        // del navegador; si no está disponible, caemos al onChange directo.
        const old = ta.value;
        let prefix = 0;
        while (prefix < old.length && prefix < next.value.length && old[prefix] === next.value[prefix]) prefix++;
        let suffix = 0;
        while (
            suffix < old.length - prefix &&
            suffix < next.value.length - prefix &&
            old[old.length - 1 - suffix] === next.value[next.value.length - 1 - suffix]
        ) {
            suffix++;
        }
        const inserted = next.value.slice(prefix, next.value.length - suffix);

        ta.focus();
        ta.setSelectionRange(prefix, old.length - suffix);
        let done = false;
        try {
            done = inserted === "" ? document.execCommand("delete") : document.execCommand("insertText", false, inserted);
        } catch {
            done = false;
        }
        if (!done || ta.value !== next.value) onChange(next.value);

        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(next.selectionStart, next.selectionEnd);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
            const format = SHORTCUTS[e.key.toLowerCase()];
            if (format) {
                e.preventDefault();
                applyFormat(format);
                return;
            }
        }
        onKeyDown?.(e);
    };

    const rows = minRows ?? (compact ? 1 : undefined);
    const showPreview = value.trim() !== "" && (!compact || hasRichSyntax(value));
    const stale = deferredValue !== value;
    const buttonClass = compact ? "size-6" : "size-7";
    const iconClass = compact ? "size-3.5" : "size-4";

    return (
        <div className={cn("group/rte flex flex-col gap-1.5", className)}>
            {/* En compact la barra ocupa siempre su hueco y solo cambia de opacidad: si apareciera al
                enfocar, el layout saltaría y se podrían perder clics en lo que hay debajo (p. ej.
                "Añadir opción") al desenfocar. */}
            <div
                role="toolbar"
                aria-label="Formato de texto"
                className={cn(
                    "flex items-center gap-0.5",
                    compact &&
                        "h-6 opacity-0 transition-opacity group-focus-within/rte:opacity-100 group-hover/rte:opacity-100 data-[help-open=true]:opacity-100"
                )}
                data-help-open={helpOpen}
            >
                {TOOLS.map(({ format, label, shortcut, icon: Icon }) => (
                    <Tooltip key={format}>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={buttonClass}
                                aria-label={label}
                                disabled={disabled}
                                // En compact son 6 botones por opción: se manejan con ratón o atajos.
                                tabIndex={compact ? -1 : undefined}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyFormat(format)}
                            >
                                <Icon className={iconClass} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{shortcut ? `${label} (Ctrl/⌘+${shortcut})` : label}</TooltipContent>
                    </Tooltip>
                ))}
                <Popover open={helpOpen} onOpenChange={setHelpOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(buttonClass, "ml-auto")}
                                    aria-label="Ayuda de formato"
                                >
                                    <CircleHelp className={iconClass} />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">Ayuda de formato</TooltipContent>
                    </Tooltip>
                    <PopoverContent align="end" className="max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
                        <MarkdownHelp />
                    </PopoverContent>
                </Popover>
            </div>

            <Textarea
                ref={setRefs}
                id={id}
                name={name}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                rows={rows}
                aria-invalid={ariaInvalid}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={handleKeyDown}
                // field-sizing-content ignora `rows`: fijamos el mínimo con la unidad `lh`
                // (alto de línea + padding vertical + bordes).
                style={rows ? { minHeight: `calc(${rows}lh + ${compact ? "0.75rem" : "1rem"} + 2px)` } : undefined}
                className={cn("resize-none", compact && "py-1.5 text-sm", textareaClassName)}
            />

            {showPreview && (
                <div
                    className={cn(
                        "min-w-0 rounded-md border border-dashed bg-muted/30",
                        compact ? "px-2 py-1" : "px-3 py-2"
                    )}
                >
                    <p className="mb-1 text-xs text-muted-foreground">Vista previa</p>
                    <RichText
                        content={deferredValue}
                        variant={variant}
                        // Enlaces sin navegación: perder lo escrito por un clic sería peor que útil.
                        interactive={false}
                        className={cn("text-sm transition-opacity", stale && "opacity-60")}
                    />
                </div>
            )}
        </div>
    );
}
