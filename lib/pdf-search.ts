import type { PDFDocumentProxy } from "pdfjs-dist";

// Búsqueda de texto sobre el contenido de un PDF sin capa de texto seleccionable: se leen
// los textItems con pdf.js y los aciertos se devuelven como rectángulos en fracciones (0-1)
// del ancho/alto de la página, de modo que se pintan igual a cualquier zoom.

export type PageSize = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type SearchMatch = { page: number; rects: Rect[] };

type RawTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};

type PageText = {
  text: string;
  spans: { start: number; end: number; item: RawTextItem }[];
  convert: (rect: number[]) => number[];
  size: PageSize;
};

export type PageTextCache = Map<number, PageText>;

// Sin tildes y en minúsculas, conservando la longitud (1 carácter -> 1 carácter) para que
// los índices del texto normalizado valgan sobre el original.
export function normalizeForSearch(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    out += value[i].normalize("NFD").charAt(0).toLowerCase().charAt(0) || value[i];
  }
  return out;
}

async function loadPageText(
  doc: PDFDocumentProxy,
  pageIndex: number,
  cache: PageTextCache,
): Promise<PageText> {
  const cached = cache.get(pageIndex);
  if (cached) return cached;

  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  let text = "";
  const spans: PageText["spans"] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || raw.str.length === 0) {
      continue;
    }
    const item = raw as RawTextItem;
    const start = text.length;
    text += normalizeForSearch(item.str);
    spans.push({ start, end: text.length, item });
    if (item.hasEOL) text += " ";
  }

  const result: PageText = {
    text,
    spans,
    convert: (rect) => viewport.convertToViewportRectangle(rect),
    size: { width: viewport.width, height: viewport.height },
  };
  cache.set(pageIndex, result);
  return result;
}

function matchRects(pageText: PageText, start: number, end: number): Rect[] {
  const rects: Rect[] = [];
  const { width: pageW, height: pageH } = pageText.size;

  for (const span of pageText.spans) {
    if (span.end <= start || span.start >= end) continue;
    const { item } = span;
    const length = span.end - span.start;
    const from = (Math.max(start, span.start) - span.start) / length;
    const to = (Math.min(end, span.end) - span.start) / length;

    const itemHeight = item.height || Math.abs(item.transform[3]);
    const x0 = item.transform[4] + item.width * from;
    const x1 = item.transform[4] + item.width * to;
    const baseline = item.transform[5];

    const [ax, ay, bx, by] = pageText.convert([x0, baseline - itemHeight * 0.2, x1, baseline + itemHeight * 0.85]);
    rects.push({
      left: Math.min(ax, bx) / pageW,
      top: Math.min(ay, by) / pageH,
      width: Math.abs(bx - ax) / pageW,
      height: Math.abs(by - ay) / pageH,
    });
  }
  return rects;
}

const MAX_MATCHES = 500;

export async function searchPdf(
  doc: PDFDocumentProxy,
  query: string,
  cache: PageTextCache,
  isCancelled: () => boolean,
): Promise<SearchMatch[]> {
  const needle = normalizeForSearch(query.trim());
  if (needle.length < 2) return [];

  const matches: SearchMatch[] = [];
  for (let page = 0; page < doc.numPages; page++) {
    const pageText = await loadPageText(doc, page, cache);
    if (isCancelled()) return matches;

    let index = pageText.text.indexOf(needle);
    while (index !== -1) {
      const rects = matchRects(pageText, index, index + needle.length);
      if (rects.length > 0) matches.push({ page, rects });
      if (matches.length >= MAX_MATCHES) return matches;
      index = pageText.text.indexOf(needle, index + needle.length);
    }
  }
  return matches;
}

export type OutlineNode = {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
};

// Índice (0-based) de la página a la que apunta un destino del índice del PDF, o null si es
// un enlace externo / no se puede resolver.
export async function resolveOutlinePage(
  doc: PDFDocumentProxy,
  dest: OutlineNode["dest"],
): Promise<number | null> {
  try {
    const explicit = typeof dest === "string" ? await doc.getDestination(dest) : dest;
    if (!explicit || explicit.length === 0) return null;
    const target = explicit[0];
    if (typeof target === "number") return target;
    if (target && typeof target === "object") {
      return await doc.getPageIndex(target as Parameters<PDFDocumentProxy["getPageIndex"]>[0]);
    }
    return null;
  } catch {
    return null;
  }
}
