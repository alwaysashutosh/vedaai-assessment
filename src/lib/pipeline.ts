import { getSession, saveSession } from "./store";
import {
  extractAnswerBlocks,
  extractQuestions,
  mapAndGrade,
} from "./gemini";
import type {
  AnswerBlock,
  ExtractedQuestion,
  QuestionMapping,
  UnmatchedAnswer,
} from "./types";

function fail(sessionId: string, message: string) {
  const session = getSession(sessionId);
  if (!session) return;
  session.status = "error";
  session.error = message;
  saveSession(session);
}

export async function runPipeline(sessionId: string) {
  const session = getSession(sessionId);
  if (!session) return;

  try {
    session.status = "extracting_questions";
    saveSession(session);
    const rawQuestions = await extractQuestions(
      session.questionPaper.bytes,
      session.questionPaper.mimeType
    );

    if (rawQuestions.length === 0) {
      fail(
        sessionId,
        "Couldn't detect any questions in the question paper. Make sure the file is a clear, readable scan and try again."
      );
      return;
    }

    const questions: ExtractedQuestion[] = rawQuestions.map((q, i) => ({
      id: `q_${i}_${q.number}${q.subpart ?? ""}`.replace(/\s+/g, ""),
      number: q.number,
      subpart: q.subpart,
      label: q.label,
      text: q.text,
      marks: q.marks ?? null,
      page: q.page,
      bbox: q.bbox
        ? {
            page: q.bbox.page,
            ymin: q.bbox.ymin,
            xmin: q.bbox.xmin,
            ymax: q.bbox.ymax,
            xmax: q.bbox.xmax,
          }
        : null,
      order: i,
    }));

    session.questions = questions;
    session.status = "extracting_answers";
    saveSession(session);

    const rawAnswers = await extractAnswerBlocks(
      session.answerSheet.bytes,
      session.answerSheet.mimeType
    );
    const answerBlocks: AnswerBlock[] = rawAnswers.map((a, i) => ({
      id: `a_${i}`,
      page: a.page,
      bbox: {
        page: a.bbox.page,
        ymin: a.bbox.ymin,
        xmin: a.bbox.xmin,
        ymax: a.bbox.ymax,
        xmax: a.bbox.xmax,
      },
      transcribedText: a.transcribedText,
      visibleLabel: a.visibleLabel,
    }));

    session.answerBlocks = answerBlocks;
    session.status = "mapping_grading";
    saveSession(session);

    const result = await mapAndGrade(
      questions.map((q) => ({
        id: q.id,
        label: q.label,
        text: q.text,
        marks: q.marks,
      })),
      answerBlocks.map((a) => ({
        id: a.id,
        page: a.page,
        transcribedText: a.transcribedText,
        visibleLabel: a.visibleLabel,
      }))
    );

    const answerBlockIds = new Set(answerBlocks.map((a) => a.id));
    const questionIds = new Set(questions.map((q) => q.id));

    const mappings: QuestionMapping[] = questions.map((q) => {
      const m = result.mappings.find((x) => x.questionId === q.id);
      if (!m) {
        return {
          questionId: q.id,
          status: "unanswered",
          answerBlockIds: [],
          confidence: 1,
          marksAwarded: 0,
          marksMax: q.marks,
          isCorrect: false,
          feedback: null,
        };
      }
      return {
        questionId: q.id,
        status: m.status === "unmatched" ? "unanswered" : m.status,
        answerBlockIds: m.answerBlockIds.filter((id) =>
          answerBlockIds.has(id)
        ),
        confidence: m.confidence ?? 0.5,
        marksAwarded: m.marksAwarded,
        marksMax: m.marksMax ?? q.marks,
        isCorrect: m.isCorrect,
        feedback: m.feedback,
      };
    });

    const mappedAnswerIds = new Set(mappings.flatMap((m) => m.answerBlockIds));
    const unmatchedAnswers: UnmatchedAnswer[] = [
      ...result.unmatchedAnswers.filter((u) => answerBlockIds.has(u.answerBlockId)),
      ...answerBlocks
        .filter((a) => !mappedAnswerIds.has(a.id))
        .filter((a) => !result.unmatchedAnswers.some((u) => u.answerBlockId === a.id))
        .map((a) => ({ answerBlockId: a.id, reason: "No matching question found." })),
    ].filter((u, i, arr) => arr.findIndex((x) => x.answerBlockId === u.answerBlockId) === i);

    void questionIds;

    const answeredCount = mappings.filter((m) => m.status === "answered").length;
    const unansweredCount = mappings.filter((m) => m.status === "unanswered").length;
    const totalMarks = mappings.reduce(
      (sum, m) => sum + (m.marksMax ?? 0),
      0
    );
    const marksAwarded = mappings.reduce(
      (sum, m) => sum + (m.marksAwarded ?? 0),
      0
    );

    session.mappings = mappings;
    session.unmatchedAnswers = unmatchedAnswers;
    session.summary = {
      totalMarks: totalMarks || null,
      marksAwarded: totalMarks ? marksAwarded : null,
      answeredCount,
      unansweredCount,
      overallFeedback: result.overallFeedback ?? null,
    };
    session.status = "done";
    saveSession(session);
  } catch (err) {
    console.error("Pipeline error", err);
    fail(sessionId, err instanceof Error ? err.message : "Unknown error");
  }
}
