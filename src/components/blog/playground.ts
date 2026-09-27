// Re-gates recorded production answers under different thresholds.
// Mirrors the service's decideMatch: no_match (every fit < 0.3) is fixed,
// otherwise a match needs confidence >= tc AND the top candidate's fit >= tf.
export type Dot = {
  id: string;
  rep: number;
  cat: string;
  q: string;
  exp: "match" | "abstain";
  s: "matched" | "uncertain" | "no_match";
  c: number;
  f: number | null;
  p: number | null;
  top: string | null;
  ok: boolean | null;
  alt: [string, number, number][];
};

export type Outcome = "correct" | "wrong" | "false_accept" | "abstain" | "rejected";

export function outcome(d: Dot, tc: number, tf: number): Outcome {
  const accepted = d.s !== "no_match" && d.f !== null && d.c >= tc && d.f >= tf;
  if (!accepted) return d.exp === "match" ? "abstain" : "rejected";
  if (d.exp === "abstain") return "false_accept";
  return d.ok ? "correct" : "wrong";
}

export function tally(dots: Dot[], tc: number, tf: number) {
  const t = { correct: 0, wrong: 0, false_accept: 0, abstain: 0, rejected: 0 };
  for (const d of dots) t[outcome(d, tc, tf)]++;
  const accepted = t.correct + t.wrong + t.false_accept;
  const positives = t.correct + t.wrong + t.abstain;
  return {
    ...t,
    accepted,
    positives,
    negatives: t.false_accept + t.rejected,
    precision: accepted ? t.correct / accepted : 1,
    coverage: positives ? t.correct / positives : 0,
  };
}

// The "cheat": search every threshold pair for the most correct matches with
// zero bad accepts, preferring the strictest pair. It can only do this because
// it has seen the answers - which is exactly the overfitting the post warns about.
export function tuneOnAnswers(dots: Dot[]): [number, number] {
  let best: [number, number] = [0.8, 0.8];
  let bestScore = -Infinity;
  for (let i = 100; i >= 0; i--) {
    for (let j = 100; j >= 0; j--) {
      const t = tally(dots, i / 100, j / 100);
      const score = t.correct - 1000 * (t.wrong + t.false_accept);
      if (score > bestScore) [bestScore, best] = [score, [i / 100, j / 100]];
    }
  }
  return best;
}
