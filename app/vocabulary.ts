export type Level = "N5" | "N4" | "N3" | "N2" | "N1";
export type Kind = "kanji" | "kana";

export type Radical = {
  kanji: string;
  symbol: string;
  meaning: string;
  original: string;
  variant: string;
};

export type Example = {
  japanese: string;
  korean?: string;
  source: string;
  sourceId?: string;
};

export type Word = {
  id: string;
  level: Level;
  expression: string;
  reading: string;
  meaning: string;
  meaningDetail?: string;
  kind: Kind;
  radicals: Radical[];
  example: Example;
};

export type VocabularyPayload = {
  version: string;
  source: string;
  counts: Record<Level, number>;
  words: Word[];
  wordAliases?: Record<string, string>;
};

export const LEVELS: Level[] = ["N5", "N4", "N3", "N2", "N1"];
export const MIN_STUDY_COUNT = 5;
export const MAX_STUDY_COUNT = 50;

// A listed synonym must not become a wrong answer just because the full label differs.
export function meaningsOverlap(left: string, right: string): boolean {
  const senses = (value: string) => value.replace(/\([^)]*\)|（[^）]*）/gu, "")
    .split(/[,;·/]|\s+또는\s+/u)
    .map((sense) => sense.replace(/[^가-힣A-Za-z0-9]/gu, ""))
    .filter(Boolean);
  return senses(left).some((a) => senses(right).some((b) =>
    a === b || (Math.min(a.length, b.length) >= 2 && (a.includes(b) || b.includes(a))),
  ));
}

export function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

// Keep unseen words first without changing the supplied pool or learned records.
export function prioritizeUnseen<T extends { id: string }>(pool: T[], learned: Set<string>): T[] {
  return [
    ...shuffle(pool.filter((word) => !learned.has(word.id))),
    ...shuffle(pool.filter((word) => learned.has(word.id))),
  ];
}

export function uniqueWords(values: Word[]): Word[] {
  return [...new Map(values.map((word) => [word.id, word])).values()];
}

export function indexWords(data: VocabularyPayload | null): Map<string, Word> {
  const index = new Map((data?.words ?? []).map((word) => [word.id, word]));
  for (const [legacyId, currentId] of Object.entries(data?.wordAliases ?? {})) {
    const word = index.get(currentId);
    if (word) index.set(legacyId, word);
  }
  return index;
}
