// Bounding boxes use Gemini's native normalized scale: 0-1000 across [ymin, xmin, ymax, xmax].
export type BBox = {
  page: number; // 1-indexed page number within the document
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

export type ExtractedQuestion = {
  id: string; // e.g. "q11a"
  number: string; // printed number, e.g. "11"
  subpart: string | null; // e.g. "a" | "b" | null
  label: string; // display label, e.g. "11 (a)" or "5"
  text: string;
  marks: number | null; // max marks if printed on the paper
  page: number;
  bbox: BBox | null;
  order: number; // printed order index, stable sort key
};

export type AnswerBlock = {
  id: string; // e.g. "a1"
  page: number;
  bbox: BBox;
  transcribedText: string;
  visibleLabel: string | null; // number the student wrote next to the answer, if any
};

export type MappingStatus = "answered" | "unanswered" | "unmatched";

export type QuestionMapping = {
  questionId: string;
  status: MappingStatus;
  answerBlockIds: string[]; // supports multi-page / multi-block answers
  confidence: number; // 0-1
  marksAwarded: number | null;
  marksMax: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
};

export type UnmatchedAnswer = {
  answerBlockId: string;
  reason: string;
};

export type SessionStatus =
  | "uploaded"
  | "extracting_questions"
  | "extracting_answers"
  | "mapping_grading"
  | "done"
  | "error";

export type ExamSession = {
  id: string;
  status: SessionStatus;
  error: string | null;
  createdAt: number;

  questionPaper: {
    fileName: string;
    mimeType: string; // "application/pdf" or an image/* type
    bytes: Buffer; // original uploaded file, unmodified
    pageCount: number;
  };
  answerSheet: {
    fileName: string;
    mimeType: string;
    bytes: Buffer;
    pageCount: number;
  };

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
