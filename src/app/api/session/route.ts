import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPageCount } from "@/lib/rasterize";
import { pruneOldSessions, saveSession } from "@/lib/store";
import { runPipeline } from "@/lib/pipeline";
import type { ExamSession } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB, matches Figma copy

export async function POST(req: NextRequest) {
  pruneOldSessions();

  const form = await req.formData();
  const questionPaperFile = form.get("questionPaper");
  const answerSheetFile = form.get("answerSheet");

  if (!(questionPaperFile instanceof File) || !(answerSheetFile instanceof File)) {
    return NextResponse.json(
      { error: "Both questionPaper and answerSheet files are required." },
      { status: 400 }
    );
  }

  for (const [name, f] of [
    ["questionPaper", questionPaperFile],
    ["answerSheet", answerSheetFile],
  ] as const) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${name} exceeds the 10MB limit.` },
        { status: 400 }
      );
    }
  }

  try {
    const [qBytesRaw, aBytesRaw] = await Promise.all([
      questionPaperFile.arrayBuffer(),
      answerSheetFile.arrayBuffer(),
    ]);
    const qBytes = Buffer.from(qBytesRaw);
    const aBytes = Buffer.from(aBytesRaw);

    let questionPageCount: number;
    let answerPageCount: number;
    try {
      [questionPageCount, answerPageCount] = await Promise.all([
        getPageCount(qBytes, questionPaperFile.type, questionPaperFile.name),
        getPageCount(aBytes, answerSheetFile.type, answerSheetFile.name),
      ]);
    } catch {
      return NextResponse.json(
        {
          error:
            "Couldn't read one of the uploaded files. Make sure both are valid, unencrypted PDF or image files and try again.",
        },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const session: ExamSession = {
      id,
      status: "uploaded",
      error: null,
      createdAt: Date.now(),
      questionPaper: {
        fileName: questionPaperFile.name,
        mimeType: questionPaperFile.type,
        bytes: qBytes,
        pageCount: questionPageCount,
      },
      answerSheet: {
        fileName: answerSheetFile.name,
        mimeType: answerSheetFile.type,
        bytes: aBytes,
        pageCount: answerPageCount,
      },
      questions: [],
      answerBlocks: [],
      mappings: [],
      unmatchedAnswers: [],
      summary: null,
    };

    saveSession(session);

    // Blocks until extraction, mapping, and grading all finish — the
    // client shows a staged progress screen for the duration.
    await runPipeline(id);

    return NextResponse.json({
      id,
      questionPaperPages: questionPageCount,
      answerSheetPages: answerPageCount,
    });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Something went wrong while processing your files. Please try again.",
      },
      { status: 500 }
    );
  }
}
