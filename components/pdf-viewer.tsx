"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, ListTree, Maximize, Minimize, Minus, Plus, Search, X } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resolveOutlinePage,
  searchPdf,
  type OutlineNode,
  type PageSize,
  type PageTextCache,
  type Rect,
  type SearchMatch,
} from "@/lib/pdf-search";
import { cn } from "@/lib/utils";

// Visor de solo lectura. El PDF se pinta página a página en <canvas> con pdf.js en vez de
// usar el visor nativo del navegador (iframe/embed), que trae botón de descargar/imprimir y
// expone el fichero tal cual. Además se bloquean menú contextual, arrastre, Ctrl/Cmd+S/P e
// impresión. Es disuasorio, no DRM: los bytes llegan al navegador y alguien con DevTools
// puede sacarlos. Impedirlo de verdad exige que el back sirva páginas rasterizadas.

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
// Relleno del contenedor de páginas y hueco entre ellas (px). Las posiciones de cada página
// se calculan con estos valores, así que tienen que coincidir con el layout de abajo.
const PAGE_PADDING = 16;
const PAGE_GAP = 16;
const DEFAULT_RATIO = 1.414;

async function loadPdfjs() {
  // Import dinámico: pdf.js usa APIs de navegador (DOMMatrix...) y rompe en SSR.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}

type Highlight = { rect: Rect; active: boolean };

function PdfPage({
  doc,
  pageNumber,
  width,
  height,
  highlights,
  root,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  height: number;
  highlights: Highlight[];
  // Contenedor con scroll: tiene que ser el root del observer para que rootMargin adelante
  // el render también dentro de él.
  root: HTMLElement | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  // Solo se renderizan las páginas cerca del viewport: apuntes de cientos de páginas no
  // deberían pintar todo de golpe.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { root, rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible || width <= 0) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });

      const scale = width / baseViewport.width;
      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * outputScale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      renderTask = page.render({ canvas, viewport });
      try {
        await renderTask.promise;
      } catch {
        // RenderingCancelledException al cambiar zoom o desmontar: se ignora.
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, width, visible]);

  return (
    <div
      ref={containerRef}
      className="relative bg-white shadow-md"
      style={{ width, height }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {highlights.map(({ rect, active }, i) => (
        <div
          key={i}
          className={cn(
            "pointer-events-none absolute rounded-[2px]",
            active ? "bg-orange-400/40 ring-2 ring-orange-500" : "bg-yellow-300/50",
          )}
          style={{
            left: `${rect.left * 100}%`,
            top: `${rect.top * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

function OutlineList({
  nodes,
  depth = 0,
  onSelect,
}: {
  nodes: OutlineNode[];
  depth?: number;
  onSelect: (node: OutlineNode) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node, i) => (
        <OutlineItem key={`${depth}-${i}`} node={node} depth={depth} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function OutlineItem({
  node,
  depth,
  onSelect,
}: {
  node: OutlineNode;
  depth: number;
  onSelect: (node: OutlineNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.items.length > 0;

  return (
    <li>
      <div className="flex items-start gap-0.5" style={{ paddingLeft: depth * 12 }}>
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? "Contraer" : "Expandir"}
            className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 hover:bg-muted"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          className="flex-1 cursor-pointer rounded px-1.5 py-0.5 text-left text-sm leading-snug hover:bg-muted"
          onClick={() => onSelect(node)}
        >
          {node.title}
        </button>
      </div>
      {hasChildren && open && <OutlineList nodes={node.items} depth={depth + 1} onSelect={onSelect} />}
    </li>
  );
}

export function PdfViewer({ data, className }: { data: ArrayBuffer; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  // Pantalla completa nativa; si el navegador no la soporta sobre un div (p. ej. iPhone) se
  // cae a un overlay fixed que ocupa toda la ventana.
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [overlayFullscreen, setOverlayFullscreen] = useState(false);
  const isFullscreen = nativeFullscreen || overlayFullscreen;
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeMatch, setActiveMatch] = useState(0);
  const textCache = useRef<PageTextCache>(new Map());
  // Posición relativa de scroll a restaurar tras cambiar el zoom (la altura total cambia).
  const scrollAnchor = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // En pdf.js 6 el documento se libera a través de su loading task.
    let task: PDFDocumentLoadingTask | undefined;
    textCache.current = new Map();

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;
        // pdf.js transfiere (desengancha) el buffer al worker; se le pasa una copia para no
        // invalidar el que guarda TanStack Query.
        task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
        const loaded = await task.promise;
        if (cancelled) return;

        // Tamaño de la primera página como provisional para todas; se afina enseguida con el
        // real de cada una para que las posiciones de scroll (índice, búsqueda) sean estables.
        const first = (await loaded.getPage(1)).getViewport({ scale: 1 });
        if (cancelled) return;
        setSizes(Array.from({ length: loaded.numPages }, () => ({ width: first.width, height: first.height })));
        setDoc(loaded);

        loaded
          .getOutline()
          .then((nodes) => {
            if (!cancelled && nodes) setOutline(nodes as OutlineNode[]);
          })
          .catch(() => {});

        const real: PageSize[] = [];
        for (let i = 1; i <= loaded.numPages; i++) {
          const viewport = (await loaded.getPage(i)).getViewport({ scale: 1 });
          if (cancelled) return;
          real.push({ width: viewport.width, height: viewport.height });
        }
        setSizes(real);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [data]);

  useEffect(() => {
    if (!scroller) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller]);

  // Atajos de guardar/imprimir del navegador. Se escucha en window porque el foco puede no
  // estar dentro del visor.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "s" || key === "p")) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onChange = () => setNativeFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // El overlay no tiene el Esc nativo del navegador: se replica.
  useEffect(() => {
    if (!overlayFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlayFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayFullscreen]);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setOverlayFullscreen(false);
      return;
    }
    try {
      await rootRef.current?.requestFullscreen();
    } catch {
      setOverlayFullscreen(true);
    }
  };

  const preventDefault = useCallback((e: React.SyntheticEvent) => e.preventDefault(), []);

  const pageWidth = Math.max(0, Math.min(containerWidth - PAGE_PADDING * 2, isFullscreen ? 1200 : 900) * zoom);

  // Alto y posición vertical (top) de cada página dentro del contenedor con scroll.
  const layout = useMemo(() => {
    const heights = sizes.map((size) => pageWidth * (size.width > 0 ? size.height / size.width : DEFAULT_RATIO));
    const tops: number[] = [];
    let y = PAGE_PADDING;
    for (const h of heights) {
      tops.push(y);
      y += h + PAGE_GAP;
    }
    return { heights, tops };
  }, [sizes, pageWidth]);

  useLayoutEffect(() => {
    if (!scroller || scrollAnchor.current == null) return;
    scroller.scrollTop = scrollAnchor.current * scroller.scrollHeight;
    scrollAnchor.current = null;
  }, [scroller, pageWidth]);

  const changeZoom = (next: number) => {
    if (scroller && scroller.scrollHeight > 0) {
      scrollAnchor.current = scroller.scrollTop / scroller.scrollHeight;
    }
    setZoom(next);
  };

  const scrollToY = useCallback(
    (top: number) => scroller?.scrollTo({ top: Math.max(0, top), behavior: "auto" }),
    [scroller],
  );

  const goToPage = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), Math.max(layout.tops.length - 1, 0));
      const top = layout.tops[clamped];
      if (top != null) scrollToY(top - PAGE_PADDING / 2);
    },
    [layout.tops, scrollToY],
  );

  // Página actual = la última cuyo inicio queda por encima del primer tercio del visor.
  const onScroll = useCallback(() => {
    if (!scroller || layout.tops.length === 0) return;
    const probe = scroller.scrollTop + scroller.clientHeight / 3;
    let lo = 0;
    let hi = layout.tops.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (layout.tops[mid] <= probe) lo = mid;
      else hi = mid - 1;
    }
    setCurrentPage(lo + 1);
    setPageInput(String(lo + 1));
  }, [scroller, layout.tops]);

  // Búsqueda con debounce; cada cambio de texto cancela la anterior.
  useEffect(() => {
    if (!doc) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchPdf(doc, trimmed, textCache.current, () => cancelled);
        if (cancelled) return;
        setMatches(found);
        setActiveMatch(0);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, query]);

  // Lleva el scroll al acierto activo.
  useEffect(() => {
    const match = matches[activeMatch];
    if (!match) return;
    const top = layout.tops[match.page];
    if (top == null) return;
    const rectTop = Math.min(...match.rects.map((r) => r.top)) * layout.heights[match.page];
    scrollToY(top + rectTop - (scroller?.clientHeight ?? 400) / 3);
    // Solo debe saltar al cambiar de acierto, no al hacer zoom (eso lo gestiona el ancla).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, activeMatch]);

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    matches.forEach((match, index) => {
      const list = map.get(match.page) ?? [];
      for (const rect of match.rects) list.push({ rect, active: index === activeMatch });
      map.set(match.page, list);
    });
    return map;
  }, [matches, activeMatch]);

  const stepMatch = (delta: 1 | -1) => {
    if (matches.length === 0) return;
    setActiveMatch((i) => (i + delta + matches.length) % matches.length);
  };

  const onOutlineSelect = async (node: OutlineNode) => {
    if (!doc) return;
    const index = await resolveOutlinePage(doc, node.dest);
    if (index != null) goToPage(index);
  };

  const submitPage = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number.parseInt(pageInput, 10);
    if (Number.isFinite(n)) goToPage(n - 1);
    else setPageInput(String(currentPage));
  };

  const numPages = doc?.numPages ?? 0;
  const hasOutline = outline.length > 0;

  return (
    // El scroll vertical vive en el contenedor del visor (alto acotado), no en la página entera.
    <div
      ref={rootRef}
      className={cn(
        "flex h-[80dvh] min-h-105 flex-col overflow-hidden rounded-lg border bg-card print:hidden",
        className,
        isFullscreen && "h-dvh! rounded-none border-0",
        overlayFullscreen && "fixed inset-0 z-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        {hasOutline && (
          <Button
            variant={outlineOpen ? "secondary" : "ghost"}
            size="icon"
            aria-label="Índice del documento"
            aria-pressed={outlineOpen}
            className="cursor-pointer"
            onClick={() => setOutlineOpen((o) => !o)}
          >
            <ListTree className="h-4 w-4" />
          </Button>
        )}

        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stepMatch(e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Buscar en el documento"
            aria-label="Buscar en el documento"
            disabled={!doc}
            className="h-8 pl-7 pr-7 text-sm"
          />
          {query && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {query.trim().length >= 2 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="min-w-16 text-center tabular-nums">
              {searching
                ? "Buscando..."
                : matches.length > 0
                  ? `${activeMatch + 1} de ${matches.length}${matches.length >= 500 ? "+" : ""}`
                  : "Sin resultados"}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" aria-label="Anterior" disabled={matches.length === 0} onClick={() => stepMatch(-1)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" aria-label="Siguiente" disabled={matches.length === 0} onClick={() => stepMatch(1)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <form onSubmit={submitPage} className="flex items-center gap-1 text-sm text-muted-foreground">
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
              onBlur={() => setPageInput(String(currentPage))}
              inputMode="numeric"
              aria-label="Ir a la página"
              disabled={!doc}
              className="h-8 w-12 px-1 text-center text-sm tabular-nums"
            />
            <span className="tabular-nums">/ {numPages || "-"}</span>
          </form>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alejar"
            className="cursor-pointer"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => changeZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Acercar"
            className="cursor-pointer"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => changeZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className="cursor-pointer"
            disabled={!doc}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {hasOutline && outlineOpen && (
          <aside className="w-56 shrink-0 overflow-y-auto border-r bg-background p-2 sm:w-72">
            <p className="px-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Índice
            </p>
            <OutlineList nodes={outline} onSelect={onOutlineSelect} />
          </aside>
        )}

        <div
          ref={setScroller}
          onScroll={onScroll}
          className="min-w-0 flex-1 select-none overflow-auto bg-muted/40"
          onContextMenu={preventDefault}
          onDragStart={preventDefault}
        >
          {error ? (
            <p className="py-8 text-center text-destructive">No se pudo abrir el documento.</p>
          ) : doc ? (
            <div
              className="mx-auto flex w-max flex-col items-center"
              style={{ gap: PAGE_GAP, padding: PAGE_PADDING }}
            >
              {layout.heights.map((height, i) => (
                <PdfPage
                  key={i + 1}
                  doc={doc}
                  pageNumber={i + 1}
                  width={pageWidth}
                  height={height}
                  highlights={highlightsByPage.get(i) ?? []}
                  root={scroller}
                />
              ))}
            </div>
          ) : (
            <div className="m-4 h-[60vh] animate-pulse rounded-md bg-muted" />
          )}
        </div>
      </div>
    </div>
  );
}

export default PdfViewer;
