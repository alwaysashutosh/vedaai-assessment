// PDFs are never rasterized server-side — page.render() via @napi-rs/canvas
// crashes natively on this stack. Files go to Gemini as raw bytes (it reads
// PDFs directly) and the browser renders pages for display via pdfjs's
// browser build. Only page counts are read here, which needs no rendering.

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs's Node "fake worker" path resolves workerSrc with a bare
  // dynamic import() at runtime; the package's own relative default
  // ("./pdf.worker.mjs") doesn't resolve once bundled, so point it at
  // the real bare specifier instead.
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  return pdfjs;
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const pdfjs = await loadPdfjs();
  // pdfjs rejects Node Buffer (a Uint8Array subclass) with a strict
  // constructor check — copy into a plain Uint8Array.
  const plainBytes = new Uint8Array(bytes);
  const loadingTask = pdfjs.getDocument({ data: plainBytes });
  const doc = await loadingTask.promise;
  const count = doc.numPages;
  await loadingTask.destroy();
  return count;
}

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function isPdf(mimeType: string, fileName: string) {
  return (
    mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")
  );
}

export function isSupportedImage(mimeType: string) {
  return SUPPORTED_IMAGE_TYPES.has(mimeType);
}

export async function getPageCount(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string
): Promise<number> {
  if (isPdf(mimeType, fileName)) {
    return getPdfPageCount(bytes);
  }
  if (isSupportedImage(mimeType)) {
    return 1;
  }
  throw new Error(`Unsupported file type: ${mimeType || fileName}`);
}
