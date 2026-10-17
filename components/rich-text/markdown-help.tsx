import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

// Sintaxis → se pinta con el propio renderer, así la chuleta nunca se desincroniza de lo que hace.
const ROWS: { label: string; source: string }[] = [
    { label: "Negrita", source: "**negrita**" },
    { label: "Cursiva", source: "*cursiva*" },
    { label: "Código", source: "`código`" },
    { label: "Lista", source: "- uno\n- dos" },
    { label: "Enlace", source: "[texto](https://ejemplo.com)" },
    { label: "Fórmula en línea", source: "$x^2 + 1$" },
    { label: "Fórmula en bloque", source: "$$\n\\frac{a}{b}\n$$" },
    { label: "Dólar literal", source: "cuesta \\$5" },
];

/** Chuleta breve de la sintaxis admitida por `RichText`. */
export function MarkdownHelp({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-3 text-sm", className)}>
            <p className="font-medium">Formato del texto</p>
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                {ROWS.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="sr-only">{row.label}</dt>
                        <dd className="min-w-0">
                            <code className="block whitespace-pre-wrap break-all rounded bg-muted px-1.5 py-1 font-mono text-xs">
                                {row.source}
                            </code>
                        </dd>
                        <dd className="min-w-0">
                            <RichText content={row.source} variant="compact" interactive={false} />
                        </dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs text-muted-foreground">
                También valen <code className="font-mono">{"\\( … \\)"}</code> y{" "}
                <code className="font-mono">{"\\[ … \\]"}</code> para las fórmulas. Para escribir un{" "}
                <code className="font-mono">$</code> literal usa <code className="font-mono">{"\\$"}</code>.
            </p>
            <p className="text-xs text-muted-foreground">
                Atajos: Ctrl/⌘ + B negrita, I cursiva, E código, M fórmula.
            </p>
        </div>
    );
}
