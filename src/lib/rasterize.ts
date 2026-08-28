import { PDFDocument } from "pdf-lib";

// PDFs are never rasterized server-side — page.render() via @napi-rs/canvas
// crashes natively on Windows, and pdfjs's Node worker/polyfill path is
// unreliable on Vercel's serverless runtime too. Files go to Gemini as raw
// bytes (it reads PDFs directly) and the browser renders pages for display
// via pdfjs's browser build. Page counts are read with pdf-lib, which parses
// PDF structure in pure JS — no canvas, no worker, no DOM polyfills.

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
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
