import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const doc = searchParams.get("doc"); // "question" | "answer"

  const file =
    doc === "question"
      ? session.questionPaper
      : doc === "answer"
      ? session.answerSheet
      : null;

  if (!file) {
    return NextResponse.json(
      { error: "doc must be 'question' or 'answer'." },
      { status: 400 }
    );
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
