"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Level = "N5" | "N4" | "N3" | "N2";
type Kind = "kanji" | "kana";
type Screen = "home" | "study" | "review" | "quiz" | "result" | "mistakes";
type QuizStage = "reading" | "meaning";

type Radical = {
  kanji: string;
  symbol: string;
  meaning: string;
};

type Word = {
  id: string;
  level: Level;
  expression: string;
  reading: string;
  meaning: string;
  kind: Kind;
  radicals: Radical[];
};

type VocabularyPayload = {
  version: string;
  source: string;
  counts: Record<Level, number>;
  words: Word[];
};

type StudyRound = {
  id: string;
  number: number;
  createdAt: string;
  wordIds: string[];
};

type QuizAttempt = {
  id: string;
  createdAt: string;
  wordIds: string[];
  correct: number;
  total: number;
};

type StoredState = {
  rounds: StudyRound[];
  attempts: QuizAttempt[];
};

const LEVELS: Level[] = ["N5", "N4", "N3", "N2"];
const STORAGE_KEY = "kotoba-loop-state-v1";

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function uniqueWords(values: Word[]): Word[] {
  return [...new Map(values.map((word) => [word.id, word])).values()];
}

function readStoredState(): StoredState {
  if (typeof window === "undefined") {
    return { rounds: [], attempts: [] };
  }
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : { rounds: [], attempts: [] };
  } catch {
    return { rounds: [], attempts: [] };
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Kotoba Loop</strong>
        <br />
        학습 기록은 현재 기기의 브라우저에만 저장됩니다.
      </div>
      <details className="source-details">
        <summary>데이터 출처와 안내</summary>
        <p>
          어휘 등급·표기·읽기는 Tanos/Open Anki JLPT, 한국어 뜻 일부는 한국어
          위키낱말사전, 한자 부수는 KANJIDIC2를 바탕으로 정리했습니다. JLPT
          주관 기관이 공개한 공식 어휘 목록이 아닌 학습용 참고 데이터입니다.
        </p>
      </details>
    </footer>
  );
}

function WordRuby({ word }: { word: Word }) {
  if (word.kind === "kanji") {
    return (
      <ruby>
        {word.expression}
        <rt>{word.reading}</rt>
      </ruby>
    );
  }
  return <ruby>{word.expression}</ruby>;
}

function MiniCard({ word }: { word: Word }) {
  return (
    <article className="mini-card">
      <div className="mini-card-top">
        <span className="level-badge">{word.level}</span>
        <span className="kind-badge">
          {word.kind === "kanji" ? "한자 단어" : "가나 단어"}
        </span>
      </div>
      <div className="mini-expression">
        {word.expression}
        <span>{word.reading}</span>
      </div>
      <p className="mini-meaning">{word.meaning}</p>
    </article>
  );
}

export function StudyApp() {
  const [data, setData] = useState<VocabularyPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedLevels, setSelectedLevels] = useState<Level[]>(["N5"]);
  const [selectedKinds, setSelectedKinds] = useState<Kind[]>(["kanji", "kana"]);
  const [studyCount, setStudyCount] = useState(20);
  const [rounds, setRounds] = useState<StudyRound[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [studyWords, setStudyWords] = useState<Word[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [reviewRoundIds, setReviewRoundIds] = useState<string[]>([]);
  const [reviewQuery, setReviewQuery] = useState("");
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStage, setQuizStage] = useState<QuizStage>("meaning");
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [wrongWordIds, setWrongWordIds] = useState<string[]>([]);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetch("/data/vocabulary.json")
      .then((response) => {
        if (!response.ok) throw new Error("단어 데이터를 불러오지 못했습니다.");
        return response.json();
      })
      .then((payload: VocabularyPayload) => setData(payload))
      .catch(() => setLoadError("단어 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));

    const timer = window.setTimeout(() => {
      const stored = readStoredState();
      setRounds(stored.rounds ?? []);
      setAttempts(stored.attempts ?? []);
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rounds, attempts }));
  }, [rounds, attempts, hasHydrated]);

  const wordsById = useMemo(
    () => new Map((data?.words ?? []).map((word) => [word.id, word])),
    [data],
  );

  const learnedIds = useMemo(
    () => new Set(rounds.flatMap((round) => round.wordIds)),
    [rounds],
  );

  const learnedCount = learnedIds.size;
  const allWords = useMemo(() => data?.words ?? [], [data]);

  const selectedPool = useMemo(
    () =>
      allWords.filter(
        (word) => selectedLevels.includes(word.level) && selectedKinds.includes(word.kind),
      ),
    [allWords, selectedKinds, selectedLevels],
  );

  const unseenCount = selectedPool.filter((word) => !learnedIds.has(word.id)).length;

  const currentStudyWord = studyWords[studyIndex];
  const currentQuizWord = quizWords[quizIndex];
  const totalQuizItems = useMemo(
    () => quizWords.reduce((sum, word) => sum + (word.kind === "kanji" ? 2 : 1), 0),
    [quizWords],
  );

  const roundWords = useMemo(() => {
    const ids = new Set(
      rounds
        .filter((round) => reviewRoundIds.includes(round.id))
        .flatMap((round) => round.wordIds),
    );
    return [...ids]
      .map((id) => wordsById.get(id))
      .filter((word): word is Word => Boolean(word));
  }, [reviewRoundIds, rounds, wordsById]);

  const filteredReviewWords = useMemo(() => {
    const query = reviewQuery.trim().toLocaleLowerCase();
    if (!query) return roundWords;
    const matchingRoundWordIds = new Set(
      rounds
        .filter(
          (round) =>
            reviewRoundIds.includes(round.id) &&
            `${round.number}회차 ${round.number}`.toLocaleLowerCase().includes(query),
        )
        .flatMap((round) => round.wordIds),
    );
    return roundWords.filter((word) =>
      matchingRoundWordIds.has(word.id) ||
      [word.expression, word.reading, word.meaning, word.level]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [reviewQuery, reviewRoundIds, roundWords, rounds]);

  const answerOptions = useMemo(() => {
    if (!currentQuizWord || !data) return [];
    const correct =
      quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning;
    const values = data.words
      .filter((word) => word.id !== currentQuizWord.id)
      .map((word) => (quizStage === "reading" ? word.reading : word.meaning))
      .filter((value) => value && value !== correct);
    const distractors = shuffle([...new Set(values)]).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }, [currentQuizWord, data, quizStage]);

  function toggleLevel(level: Level) {
    setSelectedLevels((current) =>
      current.includes(level)
        ? current.length === 1
          ? current
          : current.filter((value) => value !== level)
        : [...current, level],
    );
  }

  function toggleKind(kind: Kind) {
    setSelectedKinds((current) =>
      current.includes(kind)
        ? current.length === 1
          ? current
          : current.filter((value) => value !== kind)
        : [...current, kind],
    );
  }

  function goHome() {
    setScreen("home");
    setActiveRoundId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openReview() {
    setReviewRoundIds(rounds.map((round) => round.id));
    setReviewQuery("");
    setScreen("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startStudy() {
    if (!data || selectedPool.length === 0) return;
    const unseen = shuffle(selectedPool.filter((word) => !learnedIds.has(word.id)));
    const studied = shuffle(selectedPool.filter((word) => learnedIds.has(word.id)));
    setStudyWords([...unseen, ...studied].slice(0, Math.min(studyCount, selectedPool.length)));
    setStudyIndex(0);
    setActiveRoundId(null);
    setScreen("study");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveCurrentRound(): string {
    if (activeRoundId) return activeRoundId;
    const id = `round-${Date.now()}`;
    const nextRound: StudyRound = {
      id,
      number: rounds.reduce((max, round) => Math.max(max, round.number), 0) + 1,
      createdAt: new Date().toISOString(),
      wordIds: studyWords.map((word) => word.id),
    };
    setRounds((current) => [...current, nextRound]);
    setActiveRoundId(id);
    return id;
  }

  function finishStudy(quizNow: boolean) {
    saveCurrentRound();
    if (quizNow) {
      beginQuiz(studyWords);
    } else {
      goHome();
    }
  }

  function beginQuiz(values: Word[]) {
    const nextWords = shuffle(uniqueWords(values));
    if (nextWords.length === 0) return;
    setQuizWords(nextWords);
    setQuizIndex(0);
    setQuizStage(nextWords[0].kind === "kanji" ? "reading" : "meaning");
    setQuizCorrect(0);
    setWrongWordIds([]);
    setAnswerLocked(false);
    setSelectedAnswer("");
    setScreen("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeQuiz(nextCorrect: number, nextWrongIds: string[]) {
    const nextResult = { correct: nextCorrect, total: totalQuizItems };
    setResult(nextResult);
    setWrongWordIds(nextWrongIds);
    setAttempts((current) => [
      ...current,
      {
        id: `attempt-${Date.now()}`,
        createdAt: new Date().toISOString(),
        wordIds: quizWords.map((word) => word.id),
        ...nextResult,
      },
    ]);
    setScreen("result");
  }

  function moveToNextWord(nextCorrect: number, nextWrongIds: string[]) {
    if (quizIndex + 1 >= quizWords.length) {
      completeQuiz(nextCorrect, nextWrongIds);
      return;
    }
    const nextIndex = quizIndex + 1;
    const nextWord = quizWords[nextIndex];
    setQuizIndex(nextIndex);
    setQuizStage(nextWord.kind === "kanji" ? "reading" : "meaning");
    setSelectedAnswer("");
    setAnswerLocked(false);
  }

  function submitAnswer(answer: string) {
    if (!currentQuizWord || answerLocked) return;
    const correctAnswer =
      quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning;
    const isCorrect = answer === correctAnswer;
    const nextCorrect = quizCorrect + (isCorrect ? 1 : 0);
    const nextWrongIds = isCorrect
      ? wrongWordIds
      : [...new Set([...wrongWordIds, currentQuizWord.id])];

    setSelectedAnswer(answer);
    setAnswerLocked(true);
    setQuizCorrect(nextCorrect);
    setWrongWordIds(nextWrongIds);

    window.setTimeout(() => {
      if (quizStage === "reading" && isCorrect) {
        setQuizStage("meaning");
        setSelectedAnswer("");
        setAnswerLocked(false);
      } else {
        moveToNextWord(nextCorrect, nextWrongIds);
      }
    }, 620);
  }

  const wrongWords = wrongWordIds
    .map((id) => wordsById.get(id))
    .filter((word): word is Word => Boolean(word));

  const header = (
    <header className="topbar">
      <button className="brand" type="button" onClick={goHome} aria-label="홈으로 이동">
        <span className="brand-mark">語</span>
        <span className="brand-copy">
          <strong>KOTOBA LOOP</strong>
          <small>JLPT QUICK STUDY</small>
        </span>
      </button>
      <div className="top-actions">
        <span className="round-pill">{rounds.length}회 학습</span>
        {screen !== "home" && (
          <button className="ghost-button" type="button" onClick={goHome}>
            홈
          </button>
        )}
        <button className="ghost-button" type="button" onClick={openReview}>
          복습
        </button>
      </div>
    </header>
  );

  if (!data) {
    return (
      <main className="app-shell">
        {header}
        <div className="loading-state">
          <div>
            <strong>{loadError ? "불러오기에 실패했습니다" : "단어장을 펼치는 중"}</strong>
            {loadError || "N5부터 N2까지 학습할 단어를 준비하고 있어요."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {header}

      {screen === "home" && (
        <>
          <section className="hero-grid">
            <div>
              <p className="eyebrow">Fast recall, steady progress</p>
              <h1 className="hero-title">
                보고, 고르고,
                <br />
                <em>전부 맞힐 때까지.</em>
              </h1>
              <p className="hero-copy">
                N5부터 N2까지 필요한 만큼만 빠르게 보고, 4지선다 퀴즈로 바로
                확인하세요. 틀린 단어는 다시 루프에 들어옵니다.
              </p>
              <div className="hero-stats" aria-label="학습 통계">
                <div className="stat-chip">
                  <strong>{data.words.length.toLocaleString("ko-KR")}</strong>
                  <span>전체 단어</span>
                </div>
                <div className="stat-chip">
                  <strong>{learnedCount.toLocaleString("ko-KR")}</strong>
                  <span>학습 완료</span>
                </div>
                <div className="stat-chip">
                  <strong>{attempts.length}</strong>
                  <span>퀴즈 도전</span>
                </div>
              </div>
            </div>

            <section className="setup-panel" aria-labelledby="setup-title">
              <div className="setup-heading">
                <span>NEW SESSION</span>
                <h2 id="setup-title">이번 학습을 설정하세요</h2>
              </div>

              <div className="field-group">
                <div className="field-label">
                  <span>JLPT 단계</span>
                  <span>복수 선택 가능</span>
                </div>
                <div className="choice-row">
                  {LEVELS.map((level) => (
                    <label className="choice-chip" key={level}>
                      <input
                        type="checkbox"
                        checked={selectedLevels.includes(level)}
                        onChange={() => toggleLevel(level)}
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <div className="field-label">
                  <span>단어 종류</span>
                  <span>한 가지 이상 선택</span>
                </div>
                <div className="choice-row">
                  <label className="choice-chip wide">
                    <input
                      type="checkbox"
                      checked={selectedKinds.includes("kanji")}
                      onChange={() => toggleKind("kanji")}
                    />
                    漢 한자 단어
                  </label>
                  <label className="choice-chip wide">
                    <input
                      type="checkbox"
                      checked={selectedKinds.includes("kana")}
                      onChange={() => toggleKind("kana")}
                    />
                    あ 가나 단어
                  </label>
                </div>
              </div>

              <div className="field-group">
                <div className="field-label">
                  <label htmlFor="study-count">한 번에 공부할 단어</label>
                  <span>새 단어 {unseenCount.toLocaleString("ko-KR")}개 남음</span>
                </div>
                <div className="slider-row">
                  <input
                    id="study-count"
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={studyCount}
                    onChange={(event) => setStudyCount(Number(event.target.value))}
                    style={
                      {
                        "--range-progress": `${((studyCount - 10) / 40) * 100}%`,
                      } as CSSProperties
                    }
                  />
                  <output className="range-value" htmlFor="study-count">
                    {studyCount}
                  </output>
                </div>
              </div>

              <div className="setup-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={startStudy}
                  disabled={selectedPool.length === 0}
                >
                  학습 시작 <span aria-hidden="true">→</span>
                </button>
                <button className="secondary-button" type="button" onClick={openReview}>
                  복습
                </button>
              </div>
              {loadError && <div className="error-banner">{loadError}</div>}
            </section>
          </section>
        </>
      )}

      {screen === "study" && currentStudyWord && (
        <section className="page-wrap">
          <div className="page-head">
            <div>
              <p className="eyebrow">Study round</p>
              <h1>천천히 보고, 빠르게 넘기기</h1>
              <p>
                {studyIndex + 1} / {studyWords.length}번째 단어
              </p>
            </div>
          </div>
          <div className="progress-shell" aria-label="학습 진행도">
            <div
              className="progress-fill"
              style={{ width: `${((studyIndex + 1) / studyWords.length) * 100}%` }}
            />
          </div>

          <div className="study-layout">
            <article className="word-card">
              <div className="word-meta">
                <span className="level-badge">{currentStudyWord.level}</span>
                <span className="kind-badge">
                  {currentStudyWord.kind === "kanji" ? "한자 단어" : "가나 단어"}
                </span>
              </div>
              <div className="word-expression">
                <WordRuby word={currentStudyWord} />
              </div>
              <div className="meaning-box">
                <small>MEANING</small>
                <strong>{currentStudyWord.meaning}</strong>
              </div>
            </article>

            <aside className="radical-panel">
              <h2>부수 노트</h2>
              <p>단어에 포함된 한자의 대표 부수를 함께 확인하세요.</p>
              {currentStudyWord.radicals.length > 0 ? (
                <div className="radical-list">
                  {currentStudyWord.radicals.map((radical) => (
                    <div className="radical-item" key={`${radical.kanji}-${radical.symbol}`}>
                      <span className="radical-symbol">{radical.symbol}</span>
                      <span className="radical-copy">
                        <strong>{radical.kanji}의 대표 부수</strong>
                        <span>{radical.meaning}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>이 단어에는 표시할 한자 부수 정보가 없습니다.</p>
              )}
            </aside>
          </div>

          <div className="card-actions">
            <div className="button-pair">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setStudyIndex((index) => Math.max(0, index - 1))}
                disabled={studyIndex === 0}
              >
                이전
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setStudyIndex((index) => Math.min(studyWords.length - 1, index + 1))
                }
                disabled={studyIndex === studyWords.length - 1}
              >
                다음
              </button>
            </div>
            <div className="button-pair">
              <button className="secondary-button" type="button" onClick={() => finishStudy(false)}>
                학습 종료
              </button>
              <button className="primary-button" type="button" onClick={() => finishStudy(true)}>
                바로 풀어보기
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "review" && (
        <section className="page-wrap">
          <div className="page-head">
            <div>
              <p className="eyebrow">Review library</p>
              <h1>회차별 복습</h1>
              <p>배운 단어를 찾거나 원하는 회차만 골라 다시 풀어보세요.</p>
            </div>
          </div>

          {rounds.length === 0 ? (
            <div className="empty-state">
              <div>
                <strong>아직 저장된 회차가 없습니다</strong>
                먼저 단어를 한 번 학습하면 이곳에 카드가 쌓입니다.
                <div style={{ marginTop: 18 }}>
                  <button className="primary-button" type="button" onClick={goHome}>
                    첫 학습 시작하기
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="review-toolbar">
                <input
                  className="search-input"
                  type="search"
                  value={reviewQuery}
                  onChange={(event) => setReviewQuery(event.target.value)}
                  placeholder="한자, 읽는 법, 뜻으로 검색"
                  aria-label="학습한 단어 검색"
                />
                <div className="button-pair">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setReviewRoundIds(
                        reviewRoundIds.length === rounds.length ? [] : rounds.map((round) => round.id),
                      )
                    }
                  >
                    {reviewRoundIds.length === rounds.length ? "전체 해제" : "전체 선택"}
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => beginQuiz(roundWords)}
                    disabled={roundWords.length === 0}
                  >
                    선택 회차 퀴즈
                  </button>
                </div>
              </div>

              <div className="round-selector" aria-label="학습 회차 선택">
                {rounds.map((round) => (
                  <label className="round-check" key={round.id}>
                    <input
                      type="checkbox"
                      checked={reviewRoundIds.includes(round.id)}
                      onChange={() =>
                        setReviewRoundIds((current) =>
                          current.includes(round.id)
                            ? current.filter((id) => id !== round.id)
                            : [...current, round.id],
                        )
                      }
                    />
                    {round.number}회차 · {formatDate(round.createdAt)} · {round.wordIds.length}개
                  </label>
                ))}
              </div>

              {filteredReviewWords.length > 0 ? (
                <div className="review-grid">
                  {filteredReviewWords.map((word) => (
                    <MiniCard word={word} key={word.id} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div>
                    <strong>표시할 단어가 없습니다</strong>
                    회차를 선택하거나 검색어를 바꿔보세요.
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {screen === "quiz" && currentQuizWord && (
        <section className="quiz-wrap">
          <div className="quiz-status">
            <div className="progress-shell" aria-label="퀴즈 진행도">
              <div
                className="progress-fill"
                style={{ width: `${((quizIndex + 1) / quizWords.length) * 100}%` }}
              />
            </div>
            <span className="quiz-count">남은 단어 {quizWords.length - quizIndex}개</span>
            <span className="quiz-count">정답 {quizCorrect}개</span>
          </div>

          <article className="quiz-card">
            <div className="quiz-prompt">
              <small>{quizStage === "reading" ? "READING" : "MEANING"}</small>
              <h1>{currentQuizWord.expression}</h1>
              <p>
                {quizStage === "reading"
                  ? "이 단어는 어떻게 읽을까요?"
                  : "가장 알맞은 한국어 뜻을 고르세요."}
              </p>
            </div>
            <div className="answers-grid">
              {answerOptions.map((answer, index) => {
                const correctAnswer =
                  quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning;
                const stateClass = answerLocked
                  ? answer === correctAnswer
                    ? "correct"
                    : answer === selectedAnswer
                      ? "wrong"
                      : ""
                  : "";
                return (
                  <button
                    className={`answer-button ${stateClass}`}
                    type="button"
                    key={`${answer}-${index}`}
                    onClick={() => submitAnswer(answer)}
                    disabled={answerLocked}
                  >
                    <span className="answer-index">{index + 1}</span>
                    {answer}
                  </button>
                );
              })}
            </div>
            <div
              className={`feedback-line ${
                answerLocked
                  ? selectedAnswer ===
                    (quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning)
                    ? "good"
                    : "bad"
                  : ""
              }`}
              aria-live="polite"
            >
              {answerLocked
                ? selectedAnswer ===
                  (quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning)
                  ? "정답입니다. 다음으로 넘어갑니다."
                  : `아쉬워요. 정답은 “${
                      quizStage === "reading" ? currentQuizWord.reading : currentQuizWord.meaning
                    }”입니다.`
                : "하나를 선택하면 바로 다음 단계로 넘어갑니다."}
            </div>
          </article>
        </section>
      )}

      {screen === "result" && (
        <section className="page-wrap">
          <div className="result-card">
            <div className="result-orbit">
              {result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0}%
            </div>
            <h1>{wrongWords.length === 0 ? "완벽한 한 바퀴!" : "한 바퀴 완료"}</h1>
            <p>
              {wrongWords.length === 0
                ? "모든 항목을 맞혔습니다. 다음 단어로 넘어가도 좋아요."
                : `틀린 단어 ${wrongWords.length}개만 다시 묶어서 빠르게 반복해 보세요.`}
            </p>
            <div className="score-grid">
              <div className="score-box">
                <strong>{result.total}</strong>
                <span>총 채점 항목</span>
              </div>
              <div className="score-box">
                <strong>{result.correct}</strong>
                <span>맞힌 항목</span>
              </div>
              <div className="score-box">
                <strong>{wrongWords.length}</strong>
                <span>다시 볼 단어</span>
              </div>
            </div>
            <div className="result-actions">
              {wrongWords.length > 0 && (
                <>
                  <button className="secondary-button" type="button" onClick={() => setScreen("mistakes")}>
                    틀린 단어 보기
                  </button>
                  <button className="primary-button" type="button" onClick={() => beginQuiz(wrongWords)}>
                    오답만 재도전
                  </button>
                </>
              )}
              <button className="secondary-button" type="button" onClick={() => beginQuiz(quizWords)}>
                전체 다시 풀기
              </button>
              <button className="secondary-button" type="button" onClick={goHome}>
                홈으로
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "mistakes" && (
        <section className="page-wrap">
          <div className="page-head">
            <div>
              <p className="eyebrow">Mistake review</p>
              <h1>틀린 단어 다시 보기</h1>
              <p>헷갈린 단어만 짧게 확인하고 바로 재도전하세요.</p>
            </div>
            <div className="button-pair">
              <button className="secondary-button" type="button" onClick={() => setScreen("result")}>
                결과로
              </button>
              <button className="primary-button" type="button" onClick={() => beginQuiz(wrongWords)}>
                오답 퀴즈
              </button>
            </div>
          </div>
          <div className="review-grid">
            {wrongWords.map((word) => (
              <MiniCard word={word} key={word.id} />
            ))}
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
