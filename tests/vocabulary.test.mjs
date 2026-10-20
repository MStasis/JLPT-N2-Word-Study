import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  indexWords,
  LEVELS,
  MIN_STUDY_COUNT,
  prioritizeUnseen,
  meaningsOverlap,
} from "../app/vocabulary.ts";

const payload = JSON.parse(await readFile(new URL("../public/data/vocabulary.json", import.meta.url), "utf8"));

test("retains every legacy word ID, including aliases for corrected duplicates", async () => {
  const legacyIds = JSON.parse(await readFile(new URL("fixtures/legacy-word-ids.json", import.meta.url), "utf8"));
  assert.equal(legacyIds.length, 5333);
  const index = indexWords(payload);
  for (const id of legacyIds) assert.ok(index.has(id), `Existing study record no longer resolves: ${id}`);
  for (const [oldId, newId] of Object.entries(payload.wordAliases ?? {})) {
    assert.equal(index.get(oldId)?.id, newId);
  }
});

test("every word has a substantive Japanese usage example and Korean meaning", () => {
  for (const word of payload.words) {
    assert.match(word.meaning, /[가-힣]/u, `${word.id}: missing Korean meaning`);
    assert.ok(word.example?.japanese?.length >= 4, `${word.id}: missing usage example`);
    assert.match(word.example.japanese, /[ぁ-んァ-ヶ一-龯]/u);
    assert.ok(word.example.source, `${word.id}: missing example attribution`);
    assert.doesNotMatch(word.example.japanese, /という(?:言葉|単語)を(?:覚|勉強)/u);
    assert.doesNotMatch(word.meaning, /어간의 하나|의미 없음|번역 필요|TODO/u);
  }
  for (const level of LEVELS) {
    assert.equal(payload.counts[level], payload.words.filter((word) => word.level === level).length);
  }
});

test("common mistranslations and malformed readings stay corrected", () => {
  const find = (expression, reading) => payload.words.find((word) => word.expression === expression && (!reading || word.reading === reading));
  assert.match(find("おととし").meaning, /재작년/);
  assert.match(find("一昨年", "いっさくねん").meaning, /재작년/);
  assert.doesNotMatch(find("四角い").meaning, /광장/);
  assert.equal(find("いただく").reading, "いただく");
  assert.match(find("いただく").meaning, /받다/);
  assert.match(find("バス").example.japanese, /駅まで行くバス/);
  assert.match(find("ボール").example.japanese, /ボールを投げ/);
  assert.match(find("ボルト").meaning, /전압/);
  assert.ok(!payload.words.some((word) => word.expression === "蒸す" && word.reading === "ふす"));
});

test("synonyms cannot appear as competing wrong meanings", () => {
  assert.ok(meaningsOverlap("효율, 능률", "능률"));
  assert.ok(meaningsOverlap("받다; 먹다; 마시다 (겸양어)", "먹다"));
  assert.ok(meaningsOverlap("소유하다", "소유"));
  assert.ok(!meaningsOverlap("효율, 능률", "아이디어"));
});

test("radicals distinguish original characters from their component shapes", () => {
  const all = payload.words.flatMap((word) => word.radicals);
  for (const radical of all) {
    assert.ok(radical.original && radical.variant && radical.meaning);
    assert.equal(radical.original, radical.original.normalize("NFKC"));
  }
  const has = (original, variant) => all.some((radical) => radical.original === original && radical.variant === variant);
  assert.ok(has("水", "氵"));
  assert.ok(has("人", "亻"));
  assert.ok(has("心", "忄"));
  assert.ok(has("手", "扌"));
  assert.ok(has("示", "礻"));
  assert.ok(has("衣", "衤"));
});

test("five-word sessions prefer unseen words without mutating existing records", () => {
  const pool = Array.from({ length: 8 }, (_, i) => ({ id: `${i}` }));
  const before = structuredClone(pool);
  const learned = new Set(["0", "1"]);
  const selected = prioritizeUnseen(pool, learned);
  assert.equal(MIN_STUDY_COUNT, 5);
  assert.equal(selected.slice(0, MIN_STUDY_COUNT).length, 5);
  assert.ok(selected.slice(0, 6).every((word) => !learned.has(word.id)));
  assert.deepEqual(pool, before);
  assert.equal(new Set(selected.map((word) => word.id)).size, pool.length);
});
