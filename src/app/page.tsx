"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import UploadCard from "@/components/UploadCard";
import ExtractingScreen from "@/components/ExtractingScreen";

export default function Home() {
  const router = useRouter();
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerSheet, setAnswerSheet] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!questionPaper && !!answerSheet && !submitting;

  async function startMapping() {
    if (!questionPaper || !answerSheet) return;
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("questionPaper", questionPaper);
      form.append("answerSheet", answerSheet);

      const res = await fetch("/api/session", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      router.push(`/exam/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      <Sidebar />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <BackIcon className="h-4 w-4" />
            <DocIcon className="h-4 w-4" />
            Exams
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          {submitting ? (
            <div className="flex w-full max-w-2xl">
              <ExtractingScreen />
            </div>
          ) : (
            <div className="w-full max-w-2xl rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-200/60 p-10 text-center">
              <h1 className="text-2xl font-bold">
                Upload{" "}
                <span className="rounded bg-orange-100 px-2 py-0.5 text-[var(--veda-orange)]">
                  Question Paper &amp; Answer Sheet
                </span>
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Upload both files to get started
              </p>

              <div className="mx-auto my-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-orange-200 bg-white text-3xl">
                📝
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <UploadCard
                  label="Question Paper"
                  accent="var(--veda-orange)"
                  file={questionPaper}
                  onFile={setQuestionPaper}
                />
                <UploadCard
                  label="Answer Sheet"
                  accent="var(--veda-orange)"
                  file={answerSheet}
                  onFile={setAnswerSheet}
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={startMapping}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Start Mapping
                <ArrowIcon className="h-4 w-4" />
              </button>

              <p className="mt-3 text-xs text-zinc-400">
                Once both files are uploaded, you&apos;ll be able to map
                answers with questions
              </p>
            </div>
          )}
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
function DocIcon({ className }: { className?: string }) {
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
      <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
