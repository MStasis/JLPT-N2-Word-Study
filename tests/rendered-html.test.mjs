import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  createStudyRecordsBackup,
  parseStudyRecordsBackup,
} from "../app/study-records.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Kotoba Loop without starter preview metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Kotoba Loop/);
  assert.match(html, /단어장을 펼치는 중/);
  assert.match(html, /N5부터 N2까지 학습할 단어/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
  assert.match(html, /\/og\.png/);
});

test("ships a complete, unique N5-N2 vocabulary dataset", async () => {
  const payload = JSON.parse(
    await readFile(new URL("../public/data/vocabulary.json", import.meta.url), "utf8"),
  );
  const words = payload.words;
  const ids = new Set(words.map((word) => word.id));
  const levels = new Set(words.map((word) => word.level));

  assert.equal(words.length, 5333);
  assert.equal(ids.size, words.length);
  assert.deepEqual([...levels].sort(), ["N2", "N3", "N4", "N5"]);
  assert.ok(words.every((word) => word.expression && word.reading && word.meaning));
  assert.ok(words.every((word) => word.kind === "kanji" || word.kind === "kana"));
  assert.ok(words.some((word) => word.radicals.length > 0));
});

test("removes the disposable starter surface", async () => {
  const [files, page, layout, packageJson] = await Promise.all([
    readdir(new URL("../app/", import.meta.url)),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.ok(!files.includes("_sites-preview"));
  assert.match(page, /<StudyApp \/>/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /Kotoba Loop/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("exports and validates portable study records", () => {
  const state = {
    rounds: [
      {
        id: "round-1",
        number: 1,
        createdAt: "2026-08-12T00:00:00.000Z",
        wordIds: ["n5-1", "n5-2"],
      },
    ],
    attempts: [
      {
        id: "attempt-1",
        createdAt: "2026-08-12T00:05:00.000Z",
        wordIds: ["n5-1", "n5-2"],
        correct: 2,
        total: 3,
      },
    ],
  };
  const backup = createStudyRecordsBackup(state, "2026-08-12T01:00:00.000Z");

  assert.deepEqual(parseStudyRecordsBackup(JSON.stringify(backup)), state);
  assert.throws(
    () => parseStudyRecordsBackup('{"format":"not-kotoba-loop"}'),
    /올바른 기록 파일/,
  );
  assert.throws(() => parseStudyRecordsBackup("not-json"), /JSON 형식/);
});
