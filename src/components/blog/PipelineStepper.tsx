import { useState, type ReactNode } from "react";

type Row = { name: string; rrf: number; lexRank: number | null; vecRank: number | null };
type Props = {
  pedal: { lex: string[]; vec: string[]; lexLen: number; vecLen: number; naive: Row[]; fixed: Row[]; CANDIDATE_COUNT: number };
};

// ponytail: recorded from one uncached run of the deployed build for "a pedal bike".
const CHOICE = [
  ["Bicycle", 0.81, 0.96],
  ["Pushbike", 0.13, 0.94],
  ["Push Bike", 0.05, 0.9],
] as const;
const CONFIDENCE = 0.8;
const TIMINGS = [
  ["Embedding", 286],
  ["Retrieval", 4],
  ["Jev", 326],
] as const;

const TARGET = "Bicycle";
const k = "font-mono text-[9px] uppercase tracking-hud text-[var(--color-mute)]";

function Bar({ label, v, hot }: { label: string; v: number; hot?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 font-mono text-[11px]">
      <span className={hot ? "text-[var(--color-amber)]" : "text-[var(--color-text)]"}>{label}</span>
      <span className="h-2 bg-[var(--color-rule)]">
        <span
          className="block h-full transition-[width] duration-500"
          style={{ width: `${v * 100}%`, background: hot ? "var(--color-amber)" : "var(--color-mute)" }}
        />
      </span>
      <span className="text-right text-[var(--color-text-bright)]">{v.toFixed(2)}</span>
    </div>
  );
}

function List({ title, items, note }: { title: string; items: string[]; note: string }) {
  return (
    <div>
      <div className={k}>{title}</div>
      <ol className="mt-2 space-y-0.5 font-mono text-[11px]">
        {items.map((n, i) => (
          <li key={n} className={n === TARGET ? "text-[var(--color-amber)]" : "text-[var(--color-text)]"}>
            <span className="inline-block w-6 text-[var(--color-mute)]">{String(i + 1).padStart(2, "0")}</span>
            {n}
            {n === TARGET && " ←"}
          </li>
        ))}
      </ol>
      <p className="mt-2 font-display text-[13px] leading-snug text-[var(--color-mute)]">{note}</p>
    </div>
  );
}

export default function PipelineStepper({ pedal }: Props) {
  const [step, setStep] = useState(0);
  const [reserved, setReserved] = useState(false);
  const fused = (reserved ? pedal.fixed : pedal.naive).slice(0, pedal.CANDIDATE_COUNT + 2);
  const pos = fused.findIndex((r) => r.name === TARGET) + 1;
  const wheels = pedal.naive.find((r) => r.name === "Bike wheels (pair)");
  const bike = pedal.naive.find((r) => r.name === TARGET);

  const steps: { title: string; body: ReactNode }[] = [
    {
      title: "Query",
      body: (
        <div>
          <div className="font-display text-2xl text-[var(--color-text-bright)] sm:text-3xl">“a pedal bike”</div>
          <p className="mt-4 max-w-prose font-display text-[15px] leading-relaxed text-[var(--color-text)]">
            One line from a customer. The catalogue has 1,640 items, and a single Jev Choice can weigh at most
            255 options. So before Jev sees anything, code has to find a shortlist that contains the right answer.
          </p>
        </div>
      ),
    },
    {
      title: "Search",
      body: (
        <div className="grid gap-6 sm:grid-cols-2">
          <List
            title="Lexical · fuzzy text"
            items={pedal.lex}
            note={`Every hit contains “bike”. “Bicycle” doesn't, so it never appears: fuzzy search returned just ${pedal.lexLen} items.`}
          />
          <List
            title="Semantic · embeddings"
            items={pedal.vec}
            note={`Embeddings know a pedal bike is a bicycle: #5 of ${pedal.vecLen}.`}
          />
        </div>
      ),
    },
    {
      title: "Fusion",
      body: (
        <div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fusion method">
            {[
              [false, "Plain RRF"],
              [true, "Reserved slots"],
            ].map(([v, label]) => (
              <button
                key={String(label)}
                type="button"
                aria-pressed={reserved === v}
                onClick={() => setReserved(v as boolean)}
                className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-hud ${
                  reserved === v
                    ? "border-[var(--color-amber-dim)] bg-[rgba(232,154,60,0.08)] text-[var(--color-amber)]"
                    : "border-[var(--color-rule-strong)] text-[var(--color-mute)] hover:text-[var(--color-text)]"
                }`}
              >
                {label as string}
              </button>
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-hud text-[var(--color-amber)]">
              Bicycle · #{pos} of {pedal.CANDIDATE_COUNT}
            </span>
          </div>
          <ol className="mt-4 columns-2 gap-6 font-mono text-[10.5px] sm:columns-3">
            {fused.map((r, i) => (
              <li
                key={r.name}
                className={`break-inside-avoid truncate py-px ${
                  r.name === TARGET
                    ? "text-[var(--color-amber)]"
                    : i >= pedal.CANDIDATE_COUNT
                      ? "text-[var(--color-faint)] line-through"
                      : "text-[var(--color-text)]"
                }`}
              >
                <span className="inline-block w-6 text-[var(--color-mute)]">{String(i + 1).padStart(2, "0")}</span>
                {r.name}
              </li>
            ))}
          </ol>
          <p className="mt-4 font-display text-[14px] leading-relaxed text-[var(--color-text)]">
            {reserved ? (
              <>
                The fix: the top ten from each search are guaranteed a place before scores are compared. Bicycle
                moves up to #{pos}, and a search method's strongest opinion can no longer be outvoted.
              </>
            ) : (
              <>
                Reciprocal rank fusion scores each item 1/(60 + rank) per list and adds them up. Bicycle, #5 in one
                list, scores {bike?.rrf.toFixed(5)}. “Bike wheels (pair)”, #27 and #57, scores{" "}
                {wheels?.rrf.toFixed(5)}. Being in both lists, badly, beats being in one list, well. Today
                Bicycle survives at #{pos}, only because fuzzy search returned just {pedal.lexLen} items; in our
                first hybrid build it fell off the end.
              </>
            )}
          </p>
        </div>
      ),
    },
    {
      title: "Choice",
      body: (
        <div>
          <div className={k}>One request · 30 options · probabilities over the shortlist</div>
          <div className="mt-3 space-y-2">
            {CHOICE.map(([n, p]) => (
              <Bar key={n} label={n} v={p} hot={n === TARGET} />
            ))}
          </div>
          <p className="mt-4 font-display text-[14px] leading-relaxed text-[var(--color-text)]">
            Choice picks the best of what it was given, and says how sure it is: confidence {CONFIDENCE.toFixed(2)}.
            It will pick a best option even when none of them is any good, so this alone can't be the decision.
          </p>
        </div>
      ),
    },
    {
      title: "Fit",
      body: (
        <div>
          <div className={k}>Same request · 30 independent yes/no judgments</div>
          <div className="mt-3 space-y-2">
            {CHOICE.map(([n, , f]) => (
              <Bar key={n} label={n} v={f} hot={n === TARGET} />
            ))}
          </div>
          <p className="mt-4 font-display text-[14px] leading-relaxed text-[var(--color-text)]">
            Noul asks of each candidate: does the description support this entry? All three say yes. They're the
            same object catalogued three times, which is why Choice's probability is split between them.
          </p>
        </div>
      ),
    },
    {
      title: "Gate",
      body: (
        <div>
          <ul className="space-y-1.5 font-mono text-[11px] text-[var(--color-text)]">
            <li>✓ Selected option leads the distribution</li>
            <li>✓ Confidence {CONFIDENCE.toFixed(2)} ≥ 0.80</li>
            <li>✓ Fit {CHOICE[0][2].toFixed(2)} ≥ 0.80</li>
          </ul>
          <div className="mt-4 inline-flex items-center gap-3 border border-[var(--color-amber-dim)] bg-[rgba(232,154,60,0.08)] px-4 py-2 font-mono text-xs uppercase tracking-hud text-[var(--color-amber)]">
            matched · Bicycle
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {TIMINGS.map(([n, ms]) => (
              <div key={n}>
                <div className={k}>{n}</div>
                <div className="font-mono text-sm text-[var(--color-text-bright)]">{ms} ms</div>
              </div>
            ))}
          </div>
          <p className="mt-4 font-display text-[14px] leading-relaxed text-[var(--color-text)]">
            It cleared the confidence bar with nothing to spare. One more duplicate “bike” in the catalogue and
            this would have come back uncertain.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <ol className="grid grid-cols-6 gap-1" aria-label="Pipeline steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className="group block w-full text-left"
            >
              <span
                className={`block h-0.5 transition-colors ${i <= step ? "bg-[var(--color-amber)]" : "bg-[var(--color-rule-strong)]"}`}
              />
              <span
                className={`mt-1.5 block truncate font-mono text-[9px] uppercase tracking-hud ${
                  i === step ? "text-[var(--color-amber)]" : "text-[var(--color-mute)] group-hover:text-[var(--color-text)]"
                }`}
              >
                <span className="sm:hidden">{i + 1}</span>
                <span className="hidden sm:inline">
                  {i + 1} · {s.title}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div key={step} className="mt-5 min-h-[300px] motion-safe:animate-[boot-fade-in_300ms_var(--ease-hud)]" aria-live="polite">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-hud text-[var(--color-amber)] sm:hidden">
          {step + 1} · {steps[step].title}
        </div>
        {steps[step].body}
      </div>
      <div className="mt-5 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="border border-[var(--color-rule-strong)] px-4 py-2 font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)] enabled:hover:text-[var(--color-text)] disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="border border-[var(--color-amber-dim)] bg-[rgba(232,154,60,0.06)] px-4 py-2 font-mono text-[10px] uppercase tracking-hud text-[var(--color-amber)] enabled:hover:bg-[rgba(232,154,60,0.12)] disabled:opacity-40"
        >
          Next: {steps[Math.min(steps.length - 1, step + 1)].title} →
        </button>
      </div>
    </div>
  );
}
