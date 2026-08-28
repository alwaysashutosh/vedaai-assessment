"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, active: false, href: null },
  { label: "My Classroom", icon: ClassroomIcon, active: false, href: null },
  { label: "Assignments", icon: AssignmentsIcon, active: false, href: null },
  { label: "Exams", icon: ExamsIcon, active: true, href: "/" },
  { label: "My Library", icon: LibraryIcon, active: false, href: null },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between bg-white border-r border-zinc-200 p-4">
      <div>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold">
            V
          </div>
          <span className="text-lg font-semibold tracking-tight">VedaAI</span>
        </div>

        <Link
          href="/"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          <SparkleIcon className="h-4 w-4 text-[var(--veda-orange)]" />
          AI Teacher&apos;s Toolkit
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ) : (
              <div
                key={item.label}
                title="Coming soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                  Soon
                </span>
              </div>
            )
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
          DPS
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Delhi Public School</p>
          <p className="truncate text-xs text-zinc-500">Bokaro Steel City</p>
        </div>
      </div>
    </aside>
  );
}

function iconProps(className?: string) {
  return {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function ClassroomIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" />
    </svg>
  );
}
function AssignmentsIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M8 4h8a1 1 0 0 1 1 1v15l-5-3-5 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function ExamsIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}
function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2c.3 3.6 1.2 5.5 3 7 1.8 1.5 4 2.2 7 2.5-3 .3-5.2 1-7 2.5-1.8 1.5-2.7 3.4-3 7-.3-3.6-1.2-5.5-3-7-1.8-1.5-4-2.2-7-2.5 3-.3 5.2-1 7-2.5 1.8-1.5 2.7-3.4 3-7Z" />
    </svg>
  );
}
