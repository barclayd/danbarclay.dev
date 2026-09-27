// bun test src/components/blog
import { expect, test } from "bun:test";
import data from "../../data/jev-benchmark.json";
import { outcome, tally, tuneOnAnswers, type Dot } from "./playground";

const dots = data.dots as Dot[];

test("shipped thresholds reproduce every recorded production status", () => {
  for (const d of dots) {
    const o = outcome(d, 0.8, 0.8);
    expect([d.id, o === "correct" || o === "wrong" || o === "false_accept"]).toEqual([d.id, d.s === "matched"]);
  }
});

test("tally agrees with the benchmark summary", () => {
  const t = tally(dots, 0.8, 0.8);
  const s = data.summary.shipped;
  expect([t.correct, t.wrong, t.false_accept, t.abstain, t.rejected]).toEqual([
    s.correct_match, s.wrong_match, s.false_accept, s.abstain, s.correct_rejection,
  ]);
});

test("accepting everything lets the negatives through; tuning on answers does not", () => {
  expect(tally(dots, 0, 0).false_accept).toBeGreaterThan(0);
  const [tc, tf] = tuneOnAnswers(dots);
  const t = tally(dots, tc, tf);
  expect(t.false_accept + t.wrong).toBe(0);
  expect(t.correct).toBeGreaterThanOrEqual(tally(dots, 0.8, 0.8).correct);
});
