import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    error: session.error,
    questionPaper: {
      fileName: session.questionPaper.fileName,
      mimeType: session.questionPaper.mimeType,
      pageCount: session.questionPaper.pageCount,
    },
    answerSheet: {
      fileName: session.answerSheet.fileName,
      mimeType: session.answerSheet.mimeType,
      pageCount: session.answerSheet.pageCount,
    },
    questions: session.questions,
    answerBlocks: session.answerBlocks,
    mappings: session.mappings,
    unmatchedAnswers: session.unmatchedAnswers,
    summary: session.summary,
  });
}
