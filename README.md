# VedaAI — AI Assessment Extraction & Answer Mapping

A teacher uploads a question paper and a student's handwritten answer sheet
(PDF or image). The app extracts every question (preserving numbering and
splitting labelled sub-parts like `11 (a)` / `11 (b)`), reads the student's
answers, maps each answer to the question it belongs to, and grades it with
AI feedback. Clicking a question highlights the exact region of the answer
sheet where it was answered.

## Approach

**Pipeline:** `Upload → Extract questions → Extract answers → Map & grade`

1. **Upload** — the teacher uploads both files. Session data (files +
   extracted results) is held in a lightweight Redis key-value store, not a
   relational database, per the assignment's constraints.
2. **Question extraction** — the question paper (PDF or image) is sent to
   Gemini directly (it reads PDFs and images natively), which returns every
   question in printed order as structured JSON: number, sub-part, label,
   text, marks, page, and a bounding box.
3. **Answer extraction** — the answer sheet is sent to Gemini the same way.
   It segments the handwriting into answer blocks, transcribes each one,
   and returns any visible question label the student wrote plus a bounding
   box (normalized 0–1000, Gemini's native scale) for each block.
4. **Mapping & grading** — the extracted questions and answer blocks (as
   text, not images, to keep this call cheap) are sent to Gemini together.
   It matches each answer block to the question it actually answers (using
   content similarity, not just the order things appear in — so answers
   given out of order are handled correctly), groups multiple blocks under
   one question when an answer continues onto another page, flags answer
   blocks that don't correspond to any question, and produces a mark,
   correct/incorrect verdict, and short feedback per question plus an
   overall summary.

**Display:** the question list and the answer sheet are shown side by side.
Selecting a question highlights its matched answer region(s) directly on
the rendered answer sheet — including across multiple pages, when an answer
was split that way. Images render as-is; PDFs are rendered page-by-page in
the browser with `pdfjs-dist` (canvas-based, entirely client-side).

## AI model / API used

**Google Gemini — `gemini-2.5-flash`**, via the `@google/genai` SDK, on the
free tier. It was chosen because a single multimodal model can do OCR,
handwriting reading, layout-aware question parsing, and bounding-box
localization in one pass, which keeps the pipeline to three model calls
instead of stitching together separate OCR + LLM services.

## Tech stack

- **Next.js (App Router, TypeScript, Tailwind CSS)** — single deployable
  app, API routes handle upload and orchestrate the three Gemini calls.
- **Session store (Upstash Redis)** — an exam session (files, extracted
  questions/answers, mappings, grading) is stored as one JSON value keyed
  by session id, with a 1-hour TTL. Not a relational database: no schema,
  no queries, just a key-value cache — chosen over a plain in-process `Map`
  because serverless functions run multiple isolated instances, so
  in-process memory isn't visible across requests that land on different
  instances.
- **pdf-lib** — reads PDF page count on upload without rendering (pure JS,
  no native bindings, no canvas).
- **pdfjs-dist** — used client-side only, to render PDF pages to canvas in
  the browser for display.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # add your Gemini API key + Redis credentials
npm run dev
```

Get a free Gemini API key at https://aistudio.google.com/apikey. A free
Upstash Redis database can be created directly from the Vercel dashboard's
Storage tab (or at upstash.com) — it injects `KV_REST_API_URL` and
`KV_REST_API_TOKEN` automatically when deployed on Vercel.

## Assumptions & limitations

- **Single student, single attempt per session.** The assignment scope is
  one question paper + one answer sheet at a time; there's no batch upload
  or roster of students.
- **Not durable by design.** Sessions expire after a 1-hour TTL and there's
  no backup/export — acceptable per the assignment's "no database required"
  constraint, but not meant to be a permanent record.
- **Grading is AI-generated, not authoritative.** Marks, correctness, and
  feedback are Gemini's best judgment against the question text — there's
  no answer key input, so subjective or multi-valid-answer questions may
  be graded generously or strictly depending on how the model reads them.
- **Bounding boxes are AI-estimated,** not derived from OCR coordinates, so
  they're occasionally a few percent off from the exact ink — acceptable
  for "highlight the answer region" but not pixel-perfect.
- **10MB file size limit** per upload (matches the reference design).
- **Server-side PDF rasterization was deliberately avoided.** Rendering
  PDF pages to images server-side (via `pdfjs-dist` + a native canvas
  binding) caused a low-level native crash on Windows in this environment.
  Since Gemini reads PDFs natively anyway, the app never rasterizes PDFs
  on the server — it forwards the original file to Gemini for extraction
  and defers all visual rendering to the browser's own PDF/canvas support,
  which is both simpler and more portable across deployment targets.
