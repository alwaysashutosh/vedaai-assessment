import { GoogleGenAI, Type } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local (see .env.local.example)."
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export const MODEL = "gemini-2.5-flash";

// Gemini calls occasionally fail transiently (network blip, empty/malformed
// response, rate limit) — one retry with a short backoff covers the common
// case without masking a genuinely broken prompt or file.
async function withRetry<T>(
  fn: () => Promise<T>,
  isEmpty: (result: T) => boolean,
  attempts = 2
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      if (!isEmpty(result) || i === attempts - 1) return result;
      lastErr = new Error("Gemini returned an empty result.");
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

function filePart(bytes: Buffer, mimeType: string) {
  return {
    inlineData: {
      mimeType,
      data: bytes.toString("base64"),
    },
  };
}

const bboxSchema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    page: { type: Type.INTEGER },
    ymin: { type: Type.INTEGER },
    xmin: { type: Type.INTEGER },
    ymax: { type: Type.INTEGER },
    xmax: { type: Type.INTEGER },
  },
  required: ["page", "ymin", "xmin", "ymax", "xmax"],
};

const QUESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          subpart: { type: Type.STRING, nullable: true },
          label: { type: Type.STRING },
          text: { type: Type.STRING },
          marks: { type: Type.NUMBER, nullable: true },
          page: { type: Type.INTEGER },
          bbox: bboxSchema,
        },
        required: ["number", "subpart", "label", "text", "page", "bbox"],
      },
    },
  },
  required: ["questions"],
};

const QUESTION_EXTRACTION_PROMPT = `You are analyzing a scanned exam question paper (a PDF or image, one or more pages, in order).

Extract EVERY question in the exact printed order, top to bottom, page by page.

Rules:
- Treat labelled sub-parts as SEPARATE entries. Example: "11 (a)" and "11 (b)" are two separate questions, each with number="11", subpart="a"/"b".
- If a question has no sub-part, subpart is null and label is just the number, e.g. "5".
- "label" is the human-readable display label exactly as printed, e.g. "11 (a)" or "5".
- Preserve the ORIGINAL printed numbering exactly as shown (do not renumber).
- "text" is the full question text (include any sub-context / passage needed to understand it, but do not include the printed number itself).
- "marks" is the marks allotted if printed (e.g. "[5]" or "(5 marks)"), else null.
- "bbox" is the bounding box of the question's text block on its page, normalized to a 0-1000 scale as [ymin, xmin, ymax, xmax] (top-left origin), using the SAME convention as Gemini's object detection. Set page to the 1-indexed page number the question appears on. If you truly cannot localize it, use bbox: null.
- Return questions in printed/reading order.`;

export type RawQuestion = {
  number: string;
  subpart: string | null;
  label: string;
  text: string;
  marks: number | null;
  page: number;
  bbox: {
    page: number;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  } | null;
};

export async function extractQuestions(
  fileBytes: Buffer,
  mimeType: string
): Promise<RawQuestion[]> {
  return withRetry(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: QUESTION_EXTRACTION_PROMPT },
              filePart(fileBytes, mimeType),
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: QUESTIONS_SCHEMA,
        },
      });

      const parsed = JSON.parse(res.text ?? "{}");
      return (parsed.questions ?? []) as RawQuestion[];
    },
    (questions) => questions.length === 0
  );
}

const ANSWERS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answerBlocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          page: { type: Type.INTEGER },
          bbox: {
            type: Type.OBJECT,
            properties: {
              page: { type: Type.INTEGER },
              ymin: { type: Type.INTEGER },
              xmin: { type: Type.INTEGER },
              ymax: { type: Type.INTEGER },
              xmax: { type: Type.INTEGER },
            },
            required: ["page", "ymin", "xmin", "ymax", "xmax"],
          },
          transcribedText: { type: Type.STRING },
          visibleLabel: { type: Type.STRING, nullable: true },
        },
        required: ["page", "bbox", "transcribedText", "visibleLabel"],
      },
    },
  },
  required: ["answerBlocks"],
};

const ANSWER_EXTRACTION_PROMPT = `You are analyzing a scanned student answer sheet (a PDF or image, one or more pages, in order). The content is usually handwritten, but may occasionally be typed/printed — process either case the same way.

Segment the content into ANSWER BLOCKS — contiguous regions of writing that belong to one answer. A single answer may span multiple blocks if it continues on a later page or is written in a separate section; each contiguous region is its own block.

For each block:
- "transcribedText" is your best-effort transcription of the content (include diagrams/formulas as a brief textual description if not transcribable verbatim, e.g. "[diagram of a plant cell]").
- "visibleLabel" is the question number the student wrote next to/above the answer (e.g. "Q2", "11 b", "3"), exactly as written, or null if the student wrote no visible label.
- "bbox" is the bounding box of the ENTIRE answer region (including any diagrams) on its page, normalized to a 0-1000 scale as [ymin, xmin, ymax, xmax] (top-left origin). Set bbox.page and the top-level "page" to the 1-indexed page number.
- Process pages in order, top to bottom within each page.
- Include blocks even if the student's label doesn't match any real question, or has no label at all — do not discard or skip anything written on the sheet.
- Every page has at least one answer block unless it is completely blank. Do not return an empty list if there is any writing at all on the pages.`;

export type RawAnswerBlock = {
  page: number;
  bbox: {
    page: number;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  transcribedText: string;
  visibleLabel: string | null;
};

export async function extractAnswerBlocks(
  fileBytes: Buffer,
  mimeType: string
): Promise<RawAnswerBlock[]> {
  return withRetry(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: ANSWER_EXTRACTION_PROMPT },
              filePart(fileBytes, mimeType),
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: ANSWERS_SCHEMA,
        },
      });

      const parsed = JSON.parse(res.text ?? "{}");
      return (parsed.answerBlocks ?? []) as RawAnswerBlock[];
    },
    (blocks) => blocks.length === 0
  );
}

const MAPPING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mappings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ["answered", "unanswered", "unmatched"],
          },
          answerBlockIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER },
          marksAwarded: { type: Type.NUMBER, nullable: true },
          marksMax: { type: Type.NUMBER, nullable: true },
          isCorrect: { type: Type.BOOLEAN, nullable: true },
          feedback: { type: Type.STRING, nullable: true },
        },
        required: [
          "questionId",
          "status",
          "answerBlockIds",
          "confidence",
          "marksAwarded",
          "marksMax",
          "isCorrect",
          "feedback",
        ],
      },
    },
    unmatchedAnswers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          answerBlockId: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["answerBlockId", "reason"],
      },
    },
    overallFeedback: { type: Type.STRING },
  },
  required: ["mappings", "unmatchedAnswers", "overallFeedback"],
};

function buildMappingPrompt(
  questions: Array<{ id: string; label: string; text: string; marks: number | null }>,
  answerBlocks: Array<{
    id: string;
    page: number;
    transcribedText: string;
    visibleLabel: string | null;
  }>
) {
  return `You are grading a student's handwritten exam answer sheet against a question paper.

QUESTIONS (in printed order, each with a stable id):
${JSON.stringify(questions, null, 2)}

ANSWER BLOCKS transcribed from the student's answer sheet (in the order they appear, each with a stable id):
${JSON.stringify(answerBlocks, null, 2)}

Task:
1. Map each answer block to the question it actually answers, using content similarity AND any visible label the student wrote — the student may have answered out of order, so do not assume block order matches question order. A single question's answer may be spread across multiple consecutive blocks (e.g. continued on a later page) — group them under the same mapping via answerBlockIds.
2. Produce exactly one mapping entry per question in the QUESTIONS list:
   - status "answered": one or more answer blocks matched this question. Grade it: marksAwarded (0..marksMax), marksMax (use the question's marks if provided, else your own reasonable estimate out of 5), isCorrect (true/false — true only if the answer is essentially fully correct), and 1-2 sentence feedback specific to this answer.
   - status "unanswered": no answer block matches this question anywhere on the sheet. answerBlockIds: [], marksAwarded: 0, marksMax as above, isCorrect: false, feedback: null.
   - status "unmatched" should NOT be used on a per-question mapping (that's for leftover answer blocks below) — every question must be "answered" or "unanswered".
3. Any answer block that does not correspond to ANY question (e.g. stray notes, illegible scribble, rough work, or an answer whose labelled question doesn't exist on the paper) goes into "unmatchedAnswers" with a short reason. Every answer block id must appear in exactly one place: either inside some mapping's answerBlockIds, or in unmatchedAnswers — never both, never neither.
4. "confidence" (0-1) reflects how sure you are of the match for that question.
5. "overallFeedback" is a 2-4 sentence holistic summary of the student's performance across the whole paper.

Return valid JSON only, matching the schema.`;
}

type MappingResult = {
  mappings: Array<{
    questionId: string;
    status: "answered" | "unanswered" | "unmatched";
    answerBlockIds: string[];
    confidence: number;
    marksAwarded: number | null;
    marksMax: number | null;
    isCorrect: boolean | null;
    feedback: string | null;
  }>;
  unmatchedAnswers: Array<{ answerBlockId: string; reason: string }>;
  overallFeedback: string;
};

export async function mapAndGrade(
  questions: Array<{ id: string; label: string; text: string; marks: number | null }>,
  answerBlocks: Array<{
    id: string;
    page: number;
    transcribedText: string;
    visibleLabel: string | null;
  }>
): Promise<MappingResult> {
  return withRetry(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: buildMappingPrompt(questions, answerBlocks) }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: MAPPING_SCHEMA,
        },
      });

      return JSON.parse(res.text ?? "{}") as MappingResult;
    },
    // Only retry when the model failed to return a mapping at all — a
    // genuinely all-unanswered paper still produces one entry per question,
    // so an empty mappings array (with questions present) means a parse
    // failure, not a valid "nothing answered" result.
    (result) => questions.length > 0 && result.mappings.length === 0
  );
}
