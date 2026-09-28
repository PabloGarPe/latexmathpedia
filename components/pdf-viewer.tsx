"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";

// Visor de solo lectura. El PDF se pinta página a página en <canvas> con pdf.js en vez de
// usar el visor nativo del navegador (iframe/embed), que trae botón de descargar/imprimir y
// expone el fichero tal cual. Además se bloquean menú contextual, arrastre, Ctrl/Cmd+S/P e
// impresión. Es disuasorio, no DRM: los bytes llegan al navegador y alguien con DevTools
// puede sacarlos. Impedirlo de verdad exige que el back sirva páginas rasterizadas.

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

async function loadPdfjs() {
  // Import dinámico: pdf.js usa APIs de navegador (DOMMatrix...) y rompe en SSR.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}

function PdfPage({
  doc,
  pageNumber,
  width,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.414);

  // Solo se renderizan las páginas cerca del viewport: apuntes de cientos de páginas no
  // deberían pintar todo de golpe.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || width <= 0) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      setAspectRatio(baseViewport.height / baseViewport.width);

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
      style={{ width, height: width * aspectRatio }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

export function PdfViewer({ data }: { data: ArrayBuffer }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        // pdf.js transfiere (desengancha) el buffer al worker; se le pasa una copia para no
        // invalidar el que guarda TanStack Query.
        loaded = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
          .promise;
        if (cancelled) {
          loaded.destroy();
          return;
        }
        setDoc(loaded);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [data]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const preventDefault = useCallback((e: React.SyntheticEvent) => e.preventDefault(), []);

  const pageWidth = Math.max(0, Math.min(containerWidth, 900) * zoom);

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-md border bg-background/95 px-3 py-2 backdrop-blur">
        <span className="text-sm text-muted-foreground">
          {doc ? `${doc.numPages} páginas` : "Cargando documento..."}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alejar"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Acercar"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="w-full overflow-x-auto select-none"
        onContextMenu={preventDefault}
        onDragStart={preventDefault}
      >
        {error ? (
          <p className="py-8 text-center text-destructive">No se pudo abrir el documento.</p>
        ) : doc ? (
          <div className="mx-auto flex w-max flex-col items-center gap-4 pb-8">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} pageNumber={i + 1} width={pageWidth} />
            ))}
          </div>
        ) : (
          <div className="mx-auto h-[70vh] max-w-225 animate-pulse rounded-md bg-muted" />
        )}
      </div>
    </div>
  );
}

export default PdfViewer;
