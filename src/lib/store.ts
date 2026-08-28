import type { ExamSession } from "./types";

// In-memory store, per the assignment's "no database required" constraint.
// Lives for the lifetime of the serverless instance / dev server process.
const globalForStore = globalThis as unknown as {
  __examSessions?: Map<string, ExamSession>;
};

export const sessions: Map<string, ExamSession> =
  globalForStore.__examSessions ?? new Map();
globalForStore.__examSessions = sessions;

const MAX_SESSIONS = 50;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function pruneOldSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
  if (sessions.size > MAX_SESSIONS) {
    const sorted = [...sessions.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );
    const toRemove = sorted.slice(0, sessions.size - MAX_SESSIONS);
    for (const [id] of toRemove) sessions.delete(id);
  }
}

export function getSession(id: string): ExamSession | undefined {
  return sessions.get(id);
}

export function saveSession(session: ExamSession) {
  sessions.set(session.id, session);
}
