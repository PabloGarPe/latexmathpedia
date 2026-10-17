import { RichText } from "@/components/rich-text";

interface MessageContentProps {
    content: string;
}

/**
 * Contenido de una burbuja del chat. Usa el renderer de texto enriquecido (Markdown + LaTeX): el
 * texto hereda el color de la burbuja (`text-primary-foreground` / `text-foreground`), así que se ve
 * bien en claro y oscuro. Los enlaces de Markdown, con o sin paréntesis, los resuelve CommonMark;
 * no se inyecta HTML crudo.
 */
export function MessageContent({ content }: MessageContentProps) {
    return <RichText content={content} variant="compact" className="text-sm" />;
}
