/**
 * Plugin remark que elimina las imágenes del árbol: el texto enriquecido no carga imágenes remotas
 * (tracking, hotlinking; todavía no hay subida de imágenes).
 *
 * - `![alt](url)` suelta → enlace con el texto "Imagen: alt" (marcado con la clase `rt-image` para
 *   que el renderer le ponga un icono).
 * - Dentro de otro enlace, o `![alt][ref]` → solo el texto "Imagen: alt" (un `<a>` anidado sería HTML
 *   inválido).
 */

interface MdastNode {
    type: string;
    alt?: string | null;
    url?: string;
    title?: string | null;
    value?: string;
    children?: MdastNode[];
    data?: { hProperties?: Record<string, unknown> };
}

function imageLabel(alt?: string | null): string {
    const clean = (alt ?? "").trim();
    return clean ? `Imagen: ${clean}` : "Imagen";
}

function transform(node: MdastNode, insideLink: boolean): void {
    if (!node.children) return;
    const inLink = insideLink || node.type === "link" || node.type === "linkReference";

    node.children = node.children.map((child) => {
        if (child.type === "image" && !inLink && child.url) {
            return {
                type: "link",
                url: child.url,
                title: child.title ?? null,
                children: [{ type: "text", value: imageLabel(child.alt) }],
                data: { hProperties: { className: ["rt-image"] } },
            };
        }
        if (child.type === "image" || child.type === "imageReference") {
            return { type: "text", value: imageLabel(child.alt) };
        }
        transform(child, inLink);
        return child;
    });
}

export function remarkNoImages() {
    return (tree: MdastNode) => transform(tree, false);
}
