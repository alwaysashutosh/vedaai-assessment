import { Redis } from "@upstash/redis";
import type { ExamSession } from "./types";

// Sessions must survive across serverless function instances (Vercel runs
// multiple isolated instances of the same route; a plain in-process Map
// would make a session invisible to any request that lands on a different
// instance than the one that created it). Upstash Redis serves as a
// lightweight key-value store — not a database, no schema, no queries —
// which is the closest thing to "in-memory" that actually works across
// serverless instances.
//
// Vercel's Upstash integration injects KV_REST_API_URL / KV_REST_API_TOKEN
// rather than the UPSTASH_REDIS_REST_* names Redis.fromEnv() expects.
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  token:
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const SESSION_PREFIX = "exam-session:";

// Buffers don't survive JSON serialization — encode/decode at the boundary
// so the rest of the app can keep working with plain Buffer fields.
type SerializedFile = {
  fileName: string;
  mimeType: string;
  bytes: string; // base64
  pageCount: number;
};

type SerializedSession = Omit<
  ExamSession,
  "questionPaper" | "answerSheet"
> & {
  questionPaper: SerializedFile;
  answerSheet: SerializedFile;
};

function serialize(session: ExamSession): SerializedSession {
  return {
    ...session,
    questionPaper: {
      ...session.questionPaper,
      bytes: session.questionPaper.bytes.toString("base64"),
    },
    answerSheet: {
      ...session.answerSheet,
      bytes: session.answerSheet.bytes.toString("base64"),
    },
  };
}

function deserialize(data: SerializedSession): ExamSession {
  return {
    ...data,
    questionPaper: {
      ...data.questionPaper,
      bytes: Buffer.from(data.questionPaper.bytes, "base64"),
    },
    answerSheet: {
      ...data.answerSheet,
      bytes: Buffer.from(data.answerSheet.bytes, "base64"),
    },
  };
}

export async function getSession(id: string): Promise<ExamSession | undefined> {
  const data = await redis.get<SerializedSession>(SESSION_PREFIX + id);
  return data ? deserialize(data) : undefined;
}

export async function saveSession(session: ExamSession): Promise<void> {
  await redis.set(SESSION_PREFIX + session.id, serialize(session), {
    ex: SESSION_TTL_SECONDS,
  });
}

// Redis TTLs expire entries automatically, so there's nothing left for a
// prune step to do — kept as a no-op so call sites don't need to change.
export function pruneOldSessions() {}
