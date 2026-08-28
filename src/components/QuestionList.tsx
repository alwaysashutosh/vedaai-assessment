"use client";

import type { ExtractedQuestion, QuestionMapping } from "@/lib/types";

type Props = {
  questions: ExtractedQuestion[];
  mappings: Record<string, QuestionMapping>;
  activeQuestionId: string | null;
  expandedIds: Set<string>;
  onSelect: (questionId: string) => void;
  onToggleExpand: (questionId: string) => void;
};

function scoreBadgeClasses(mapping: QuestionMapping | undefined) {
  if (!mapping || mapping.status === "unanswered") {
    return "bg-zinc-100 text-zinc-400";
  }
  if (mapping.marksAwarded == null || mapping.marksMax == null) {
    return "bg-zinc-100 text-zinc-500";
  }
  const ratio = mapping.marksMax > 0 ? mapping.marksAwarded / mapping.marksMax : 0;
  if (ratio >= 0.8) return "bg-emerald-100 text-emerald-700";
  if (ratio >= 0.4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

export default function QuestionList({
  questions,
  mappings,
  activeQuestionId,
  expandedIds,
  onSelect,
  onToggleExpand,
}: Props) {
  return (
    <div className="flex flex-col divide-y divide-zinc-100">
      {questions.map((q) => {
        const mapping = mappings[q.id];
        const isActive = activeQuestionId === q.id;
        const isExpanded = expandedIds.has(q.id);
        const isUnanswered = !mapping || mapping.status === "unanswered";

        return (
          <div
            key={q.id}
            className={`px-4 py-3 transition-colors ${
              isActive ? "bg-orange-50" : "hover:bg-zinc-50"
            } ${isActive ? "border-l-2 border-[var(--veda-orange)]" : "border-l-2 border-transparent"}`}
          >
            <button
              type="button"
              onClick={() => onSelect(q.id)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-[var(--veda-orange)] text-white"
                    : "bg-zinc-800 text-white"
                }`}
              >
                {q.number}
              </span>

              <span className="flex-1 min-w-0">
                {q.subpart && (
                  <span className="mr-1 text-xs font-medium text-zinc-400">
                    ({q.subpart})
                  </span>
                )}
                <span className="text-sm text-zinc-800">{q.text}</span>
                {isUnanswered && (
                  <span className="ml-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 align-middle">
                    Not answered
                  </span>
                )}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${scoreBadgeClasses(mapping)}`}
                >
                  {mapping?.marksAwarded != null && mapping?.marksMax != null
                    ? `${mapping.marksAwarded}/${mapping.marksMax}`
                    : "—"}
                </span>
                <ChevronIcon
                  className={`h-4 w-4 text-zinc-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(q.id);
                  }}
                />
              </span>
            </button>

            {isExpanded && mapping?.feedback && (
              <div className="ml-9 mt-2 rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold text-zinc-700">
                  AI Feedback
                </p>
                <p className="mt-1 text-xs text-zinc-500">{mapping.feedback}</p>
              </div>
            )}
            {isExpanded && !mapping?.feedback && (
              <div className="ml-9 mt-2 rounded-lg border border-dashed border-zinc-200 p-3">
                <p className="text-xs text-zinc-400">
                  No answer found for this question.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChevronIcon({
  className,
  onClick,
}: {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onClick={onClick}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
