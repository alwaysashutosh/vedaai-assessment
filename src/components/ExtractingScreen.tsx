"use client";

import { useEffect, useState } from "react";
import { SparkleIcon } from "./Sidebar";

const STAGES = [
  "Uploading files...",
  "Extracting questions from paper...",
  "Reading handwritten answers...",
  "Mapping answers to questions...",
  "Grading and generating feedback...",
];

// Purely cosmetic staged progress: the real work happens in one request,
// so this cycles through plausible stage labels while it's in flight.
export default function ExtractingScreen() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white py-24">
      <SparkleIcon className="h-10 w-10 text-[var(--veda-orange)] animate-sparkle" />
      <p className="text-lg font-semibold">Extracting...</p>
      <p className="text-sm text-zinc-500">{STAGES[stageIndex]}</p>
      <p className="text-xs text-zinc-400">This may take a while</p>
    </div>
  );
}
