"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { AnswerBlock, BBox } from "@/lib/types";
import PdfPageCanvas from "./PdfPageCanvas";

type Props = {
  sessionId: string;
  mimeType: string;
  pageCount: number;
  answerBlocks: AnswerBlock[];
  activeBlockIds: string[];
  unmatchedBlockIds: Set<string>;
};

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 25;

function bboxStyle(b: BBox) {
  return {
    top: `${b.ymin / 10}%`,
    left: `${b.xmin / 10}%`,
    width: `${(b.xmax - b.xmin) / 10}%`,
    height: `${(b.ymax - b.ymin) / 10}%`,
  };
}

function isPdfMime(mimeType: string) {
  return mimeType === "application/pdf";
}

export default function AnswerSheetViewer({
  sessionId,
  mimeType,
  pageCount,
  answerBlocks,
  activeBlockIds,
  unmatchedBlockIds,
}: Props) {
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activeSet = useMemo(() => new Set(activeBlockIds), [activeBlockIds]);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const fileUrl = `/api/session/${sessionId}/file?doc=answer`;
  const isPdf = isPdfMime(mimeType);

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;

    import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ url: fileUrl }).promise;
      if (!cancelled) setPdfDoc(doc);
    });

    return () => {
      cancelled = true;
    };
  }, [isPdf, fileUrl]);

  useEffect(() => {
    if (activeBlockIds.length > 0) {
      activeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      const page = answerBlocks.find((b) => activeSet.has(b.id))?.page;
      if (page) setCurrentPage(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlockIds]);

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  function goToPage(page: number) {
    const clamped = Math.min(Math.max(page, 1), pageCount);
    setCurrentPage(clamped);
    pageRefs.current[clamped]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-10 text-center text-xs text-zinc-600">
            {zoom}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          >
            +
          </button>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30"
            >
              ‹
            </button>
            Page {currentPage} of {pageCount}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex flex-col gap-4">
        <div style={{ width: `${zoom}%` }} className="flex flex-col gap-4">
          {pages.map((page) => {
            const blocksOnPage = answerBlocks.filter((b) => b.page === page);
            return (
              <div
                key={page}
                ref={(el) => {
                  pageRefs.current[page] = el;
                }}
                className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                {isPdf ? (
                  pdfDoc ? (
                    <PdfPageCanvas doc={pdfDoc} pageNumber={page} />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-xs text-zinc-400">
                      Loading PDF…
                    </div>
                  )
                ) : (
                  <img
                    src={fileUrl}
                    alt={`Answer sheet page ${page}`}
                    className="block w-full select-none"
                    draggable={false}
                  />
                )}
                {blocksOnPage.map((block) => {
                  const isActive = activeSet.has(block.id);
                  const isUnmatched = unmatchedBlockIds.has(block.id);
                  return (
                    <div
                      key={block.id}
                      ref={isActive ? activeRef : undefined}
                      className={`absolute rounded-sm transition-all duration-200 ${
                        isActive
                          ? "border-[3px] border-[var(--veda-orange)] bg-orange-400/10 shadow-[0_0_0_3px_rgba(244,112,58,0.15)]"
                          : isUnmatched
                          ? "border border-dashed border-red-300"
                          : "border border-transparent"
                      }`}
                      style={bboxStyle(block.bbox)}
                      title={block.visibleLabel ?? undefined}
                    >
                      {isActive && (
                        <span className="absolute -top-6 left-0 rounded bg-[var(--veda-orange)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Answer
                        </span>
                      )}
                    </div>
                  );
                })}
                <span className="absolute right-2 top-2 rounded bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-white">
                  Page {page} of {pageCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
