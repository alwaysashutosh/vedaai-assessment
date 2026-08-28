"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  accent: string;
  file: File | null;
  onFile: (file: File | null) => void;
};

const ACCEPTED = ".pdf,image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

export default function UploadCard({ label, accent, file, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    onFile(f);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragOver
          ? "border-[var(--veda-orange)] bg-orange-50"
          : "border-zinc-300 bg-white hover:border-zinc-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {file ? (
        <>
          <button
            type="button"
            aria-label="Remove file"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-white text-xs"
          >
            &#10005;
          </button>
          <div className="flex h-10 w-8 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white">
            PDF
          </div>
          <p className="max-w-[220px] truncate text-sm font-medium">
            {file.name}
          </p>
          <p className="text-xs text-zinc-500">
            {(file.size / (1024 * 1024)).toFixed(1)}MB
          </p>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <UploadIcon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">
            Upload <span style={{ color: accent }}>{label}</span>
          </p>
          <p className="text-xs text-zinc-400">Max 10MB &middot; PDF, JPG, PNG</p>
          {sizeError && (
            <p className="text-xs text-red-500">File exceeds 10MB limit.</p>
          )}
        </>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
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
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
