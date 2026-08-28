"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Props = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  onRendered?: (size: { width: number; height: number }) => void;
};

// Renders a single PDF page to a canvas at the container's width, entirely
// client-side (browser Canvas API — no native bindings, no server work).
export default function PdfPageCanvas({ doc, pageNumber, onRendered }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const page = await doc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = canvasRef.current?.parentElement?.clientWidth || 800;
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      if (!cancelled) {
        setRendering(false);
        onRendered?.({ width: viewport.width, height: viewport.height });
      }
    }

    render();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber]);

  return (
    <div className="relative w-full">
      {rendering && (
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">
          Rendering page…
        </div>
      )}
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}
