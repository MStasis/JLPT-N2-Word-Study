export type StudyRound = {
  id: string;
  number: number;
  createdAt: string;
  wordIds: string[];
};

export type QuizAttempt = {
  id: string;
  createdAt: string;
  wordIds: string[];
  correct: number;
  total: number;
};

export type StoredState = {
  rounds: StudyRound[];
  attempts: QuizAttempt[];
};

type StudyRecordsBackup = {
  format: "kotoba-loop-study-records";
  version: 1;
  exportedAt: string;
  state: StoredState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStudyRound(value: unknown): value is StudyRound {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Number.isInteger(value.number) &&
    Number(value.number) > 0 &&
    isValidDate(value.createdAt) &&
    isStringArray(value.wordIds)
  );
}

function isQuizAttempt(value: unknown): value is QuizAttempt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isValidDate(value.createdAt) &&
    isStringArray(value.wordIds) &&
    Number.isInteger(value.correct) &&
    Number(value.correct) >= 0 &&
    Number.isInteger(value.total) &&
    Number(value.total) >= 0 &&
    Number(value.correct) <= Number(value.total)
  );
}

export function isStoredState(value: unknown): value is StoredState {
  return (
    isRecord(value) &&
    Array.isArray(value.rounds) &&
    value.rounds.every(isStudyRound) &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isQuizAttempt)
  );
}

export function createStudyRecordsBackup(
  state: StoredState,
  exportedAt = new Date().toISOString(),
): StudyRecordsBackup {
  return {
    format: "kotoba-loop-study-records",
    version: 1,
    exportedAt,
    state,
  };
}

export function parseStudyRecordsBackup(source: string): StoredState {
  let value: unknown;

  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("JSON 형식의 파일이 아닙니다.");
  }

  if (
    !isRecord(value) ||
    value.format !== "kotoba-loop-study-records" ||
    value.version !== 1 ||
    !isValidDate(value.exportedAt) ||
    !isStoredState(value.state)
  ) {
    throw new Error("Kotoba Loop에서 내보낸 올바른 기록 파일이 아닙니다.");
  }

  return value.state;
}
