"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import QuestionList from "@/components/QuestionList";
import AnswerSheetViewer from "@/components/AnswerSheetViewer";
import ExtractingScreen from "@/components/ExtractingScreen";
import type {
  AnswerBlock,
  ExtractedQuestion,
  QuestionMapping,
  SessionStatus,
  UnmatchedAnswer,
} from "@/lib/types";

type SessionResponse = {
  id: string;
  status: SessionStatus;
  error: string | null;
  questionPaper: { fileName: string; mimeType: string; pageCount: number };
  answerSheet: { fileName: string; mimeType: string; pageCount: number };
  questions: ExtractedQuestion[];
  answerBlocks: AnswerBlock[];
  mappings: QuestionMapping[];
  unmatchedAnswers: UnmatchedAnswer[];
  summary: {
    totalMarks: number | null;
    marksAwarded: number | null;
    answeredCount: number;
    unansweredCount: number;
    overallFeedback: string | null;
  } | null;
};

export default function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<SessionResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<"questions" | "answers">(
    "questions"
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/session/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setFetchError(json.error);
        } else {
          setData(json);
          if (json.questions?.[0]) setActiveQuestionId(json.questions[0].id);
        }
      })
      .catch((err) => !cancelled && setFetchError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mappingsById = useMemo(() => {
    const map: Record<string, QuestionMapping> = {};
    for (const m of data?.mappings ?? []) map[m.questionId] = m;
    return map;
  }, [data]);

  const unmatchedBlockIds = useMemo(
    () => new Set((data?.unmatchedAnswers ?? []).map((u) => u.answerBlockId)),
    [data]
  );

  const activeAnswerBlockIds = activeQuestionId
    ? mappingsById[activeQuestionId]?.answerBlockIds ?? []
    : [];

  function toggleExpand(qid: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  const expandableIds = useMemo(
    () =>
      (data?.questions ?? [])
        .filter((q) => mappingsById[q.id]?.feedback)
        .map((q) => q.id),
    [data, mappingsById]
  );
  const allExpanded =
    expandableIds.length > 0 &&
    expandableIds.every((qid) => expandedIds.has(qid));

  function toggleExpandAll() {
    setExpandedIds(allExpanded ? new Set() : new Set(expandableIds));
  }

  function selectQuestion(qid: string) {
    setActiveQuestionId(qid);
    setMobileTab("answers");
  }

  if (fetchError) {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-sm font-medium text-red-600">{fetchError}</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
            >
              Upload new files
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!data || data.status !== "done") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            {data?.status === "error" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="text-sm font-medium text-red-600">
                  {data.error ?? "Something went wrong during processing."}
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
                >
                  Upload new files
                </Link>
              </div>
            ) : (
              <ExtractingScreen />
            )}
          </div>
        </main>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="flex flex-1">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/" className="flex items-center gap-2">
              <BackIcon className="h-4 w-4" />
              Exams
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="font-medium text-zinc-800">
              {data.answerSheet.fileName}
            </span>
          </div>

          {summary && (
            <div className="flex items-center gap-4 text-sm">
              {summary.totalMarks != null && (
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                  Score: {summary.marksAwarded} / {summary.totalMarks}
                </span>
              )}
              <span className="text-xs text-zinc-500">
                {summary.answeredCount} answered &middot; {summary.unansweredCount} unanswered
              </span>
            </div>
          )}
        </header>

        {summary?.overallFeedback && (
          <div className="mx-6 mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs font-semibold text-orange-700">
              Grading Summary
            </p>
            <p className="mt-1 text-sm text-orange-900">
              {summary.overallFeedback}
            </p>
          </div>
        )}

        {/* Mobile tab switcher */}
        <div className="mx-6 mt-4 flex rounded-full bg-zinc-100 p-1 text-sm font-medium md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("questions")}
            className={`flex-1 rounded-full py-1.5 ${
              mobileTab === "questions" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
          >
            Questions
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("answers")}
            className={`flex-1 rounded-full py-1.5 ${
              mobileTab === "answers" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
          >
            Answer Sheet
          </button>
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden px-6 py-4">
          <section
            className={`flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white ${
              mobileTab !== "questions" ? "hidden md:block" : ""
            }`}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold">
                Extracted Questions{" "}
                <span className="font-normal text-zinc-400">
                  (from question paper)
                </span>
              </p>
              <button
                type="button"
                onClick={toggleExpandAll}
                disabled={expandableIds.length === 0}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            </div>
            <QuestionList
              questions={data.questions}
              mappings={mappingsById}
              activeQuestionId={activeQuestionId}
              expandedIds={expandedIds}
              onSelect={selectQuestion}
              onToggleExpand={toggleExpand}
            />
          </section>

          <section
            className={`flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 ${
              mobileTab !== "answers" ? "hidden md:block" : ""
            }`}
          >
            <p className="mb-3 px-1 text-sm font-semibold">Answer Sheet</p>
            <AnswerSheetViewer
              sessionId={id}
              mimeType={data.answerSheet.mimeType}
              pageCount={data.answerSheet.pageCount}
              answerBlocks={data.answerBlocks}
              activeBlockIds={activeAnswerBlockIds}
              unmatchedBlockIds={unmatchedBlockIds}
            />

            {data.unmatchedAnswers.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-600">
                  Unmatched answers ({data.unmatchedAnswers.length})
                </p>
                <p className="mt-1 text-xs text-red-500">
                  Highlighted with a dashed outline above — these don&apos;t
                  correspond to any question on the paper.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
