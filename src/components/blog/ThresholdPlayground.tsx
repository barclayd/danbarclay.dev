import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import NumberFlow from "@number-flow/react";
import { outcome, tally, tuneOnAnswers, type Dot, type Outcome } from "./playground";

type Props = {
  dots: Dot[];
  shipped: [number, number];
  legacy: { precision: number; coverage: number };
};

const RED = "#d9614c";
const STYLE: Record<Outcome, { fill: string; stroke: string; label: string }> = {
  correct: { fill: "var(--color-amber)", stroke: "var(--color-amber)", label: "Correct match" },
  wrong: { fill: RED, stroke: RED, label: "Wrong match" },
  false_accept: { fill: "rgba(217,97,76,0.25)", stroke: RED, label: "Matched something it shouldn't" },
  abstain: { fill: "var(--color-mute)", stroke: "var(--color-mute)", label: "Valid, but left uncertain" },
  rejected: { fill: "transparent", stroke: "var(--color-mute)", label: "Correctly declined" },
};

export default function ThresholdPlayground({ dots, shipped, legacy }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tc, setTc] = useState(shipped[0]);
  const [tf, setTf] = useState(shipped[1]);
  const [hover, setHover] = useState<null | { d: Dot; x: number; y: number }>(null);
  const tuned = useMemo(() => tuneOnAnswers(dots), [dots]);
  const t = tally(dots, tc, tf);
  const isTuned = tc === tuned[0] && tf === tuned[1];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Dismiss the tooltip on a tap outside the chart.
  useEffect(() => {
    if (!hover) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setHover(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [hover]);

  const m = { top: 12, right: 12, bottom: 30, left: 40 };
  const plotH = width < 520 ? 240 : 300;
  const laneH = 34;
  const innerW = Math.max(0, width - m.left - m.right);
  // ponytail: axes zoomed to where the answers live; anything lower pins to the edge (clamp).
  const x = scaleLinear().domain([0.3, 1]).range([0, innerW]).clamp(true);
  const y = scaleLinear().domain([0.2, 1]).range([plotH, 0]).clamp(true);
  const laneY = plotH + m.bottom + laneH / 2;
  const height = m.top + plotH + m.bottom + laneH + 8;

  const plotted = dots.map((d) => ({
    d,
    o: outcome(d, tc, tf),
    // Repetitions of the same query land on top of each other; nudge them apart.
    cx: x(d.c) + (d.rep - 2) * 3,
    cy: d.f === null ? laneY : y(d.f),
  }));

  const presets: { label: string; v: [number, number] }[] = [
    { label: `Shipped · ${shipped[0].toFixed(2)} / ${shipped[1].toFixed(2)}`, v: shipped },
    { label: "Accept anything · 0 / 0", v: [0, 0] },
    { label: `Tuned on the answers · ${tuned[0].toFixed(2)} / ${tuned[1].toFixed(2)}`, v: tuned },
  ];

  return (
    <div className="font-mono text-[11px] uppercase tracking-hud text-[var(--color-mute)]">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const on = tc === p.v[0] && tf === p.v[1];
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setTc(p.v[0]);
                setTf(p.v[1]);
              }}
              aria-pressed={on}
              className={`border px-3 py-2 text-[10px] uppercase tracking-hud transition-colors ${
                on
                  ? "border-[var(--color-amber-dim)] bg-[rgba(232,154,60,0.08)] text-[var(--color-amber)]"
                  : "border-[var(--color-rule-strong)] text-[var(--color-mute)] hover:text-[var(--color-text)]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(
          [
            ["Choice confidence ≥", tc, setTc],
            ["Fit probability ≥", tf, setTf],
          ] as const
        ).map(([label, v, set]) => (
          <label key={label} className="block">
            <span className="flex justify-between">
              <span>{label}</span>
              <span className="text-[var(--color-amber)]">{v.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={v}
              onChange={(e) => set(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-amber)]"
            />
          </label>
        ))}
      </div>

      <div ref={wrapRef} className="relative mt-5 w-full" style={{ overflow: "clip" }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="block"
            role="img"
            aria-label={`Scatter of ${dots.length} recorded answers by Choice confidence and fit. ${t.correct} correct matches, ${t.false_accept + t.wrong} bad accepts at these thresholds.`}
            style={{ touchAction: "pan-y" }}
          >
            <g transform={`translate(${m.left},${m.top})`}>
              <rect width={innerW} height={plotH} fill="none" stroke="var(--color-rule)" shapeRendering="crispEdges" />
              {[0.4, 0.6, 0.8].map((v) => (
                <g key={v} stroke="var(--color-rule)" strokeDasharray="2 4">
                  <line x1={x(v)} x2={x(v)} y1={0} y2={plotH} />
                  <line x1={0} x2={innerW} y1={y(v)} y2={y(v)} />
                </g>
              ))}
              {/* Accept region */}
              <rect
                x={x(tc)}
                y={0}
                width={Math.max(0, innerW - x(tc))}
                height={y(tf)}
                fill="rgba(232,154,60,0.07)"
                stroke="var(--color-amber-dim)"
                strokeDasharray="4 3"
              />
              <text x={x(tc) + 6} y={y(tf) - 6} fontSize={9} fill="var(--color-amber)" letterSpacing="0.12em">
                AUTO-MATCH
              </text>
              {[0.4, 0.6, 0.8, 1].map((v) => (
                <text key={v} x={x(v)} y={plotH + 14} textAnchor={v === 1 ? "end" : "middle"} fontSize={9} fill="var(--color-mute)">
                  {v.toFixed(1)}
                </text>
              ))}
              {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <text key={v} x={-6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--color-mute)">
                  {v.toFixed(1)}
                </text>
              ))}
              <text x={innerW / 2} y={plotH + 26} textAnchor="middle" fontSize={9} fill="var(--color-mute)" letterSpacing="0.12em">
                CHOICE CONFIDENCE →
              </text>
              <text transform={`translate(-30 ${plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize={9} fill="var(--color-mute)" letterSpacing="0.12em">
                FIT (NOUL) →
              </text>
              {/* no_match lane: fixed by the 0.3 fit floor, untouched by the sliders */}
              <rect x={0} y={laneY - laneH / 2} width={innerW} height={laneH} fill="var(--color-panel)" stroke="var(--color-rule)" />
              <text x={6} y={laneY - laneH / 2 + 11} fontSize={8} fill="var(--color-mute)" letterSpacing="0.12em">
                NO_MATCH · EVERY FIT &lt; 0.3 · SLIDERS DON'T APPLY
              </text>
              {plotted.map(({ d, o, cx, cy }) => {
                const s = STYLE[o];
                const active = hover?.d === d;
                const r = active ? 6.5 : 4.5;
                return (
                  <g
                    key={`${d.id}-${d.rep}`}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ d, x: cx + m.left, y: cy + m.top })}
                    onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                    onClick={() => setHover({ d, x: cx + m.left, y: cy + m.top })}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={cx} cy={d.f === null ? cy + 4 : cy} r={11} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={d.f === null ? cy + 4 : cy}
                      r={r}
                      fill={s.fill}
                      fillOpacity={o === "correct" ? 0.75 : 1}
                      stroke={s.stroke}
                      strokeWidth={o === "false_accept" ? 2 : 1.25}
                      style={{ transition: "fill 200ms, stroke 200ms" }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-[min(280px,80vw)] border border-[var(--color-rule-strong)] bg-[var(--color-panel)] p-3 normal-case tracking-normal shadow-lg"
            style={{
              left: Math.min(Math.max(8, hover.x - 140), Math.max(8, width - 288)),
              top: hover.y > 160 ? hover.y - 12 : hover.y + 16,
              transform: hover.y > 160 ? "translateY(-100%)" : undefined,
            }}
          >
            <div className="font-display text-[13px] leading-snug text-[var(--color-text-bright)]">“{hover.d.q}”</div>
            <div className="mt-1.5 text-[9px] uppercase tracking-hud text-[var(--color-mute)]">
              {hover.d.cat} · run {hover.d.rep} · expected {hover.d.exp === "match" ? "a match" : "no match"}
            </div>
            <div className="mt-2 text-[10px]" style={{ color: STYLE[outcome(hover.d, tc, tf)].stroke }}>
              {STYLE[outcome(hover.d, tc, tf)].label}
            </div>
            {hover.d.top ? (
              <table className="mt-2 w-full text-[10px] text-[var(--color-text)]">
                <thead className="text-[9px] uppercase text-[var(--color-mute)]">
                  <tr>
                    <th className="text-left font-normal">candidate</th>
                    <th className="text-right font-normal">p</th>
                    <th className="text-right font-normal">fit</th>
                  </tr>
                </thead>
                <tbody>
                  {[[hover.d.top, hover.d.p, hover.d.f] as const, ...hover.d.alt].map(([n, p, f]) => (
                    <tr key={n}>
                      <td className="truncate pr-2">{n}</td>
                      <td className="text-right">{p?.toFixed(2)}</td>
                      <td className="text-right">{f?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mt-2 text-[10px] text-[var(--color-mute)]">
                Confidence {hover.d.c.toFixed(2)}, but no candidate cleared the 0.3 fit floor.
              </div>
            )}
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[9px]">
        {(Object.keys(STYLE) as Outcome[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.8" fill={STYLE[k].fill} stroke={STYLE[k].stroke} strokeWidth={k === "false_accept" ? 1.8 : 1.2} />
            </svg>
            {STYLE[k].label}
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-2 gap-px bg-[var(--color-rule)] sm:grid-cols-4" aria-live="polite">
        {(
          [
            ["Correct matches", t.correct, t.positives, false],
            ["Bad accepts", t.wrong + t.false_accept, t.accepted, t.wrong + t.false_accept > 0],
            ["Left uncertain", t.abstain, t.positives, false],
            ["Declined correctly", t.rejected, t.negatives, false],
          ] as const
        ).map(([k, v, of, bad]) => (
          <div key={k} className="bg-[var(--color-void)] px-3 py-3">
            <div className="text-[9px]">{k}</div>
            <div className="mt-1 text-lg" style={{ color: bad ? RED : "var(--color-text-bright)" }}>
              <NumberFlow value={v} />
              <span className="text-[11px] text-[var(--color-mute)]"> / {of}</span>
            </div>
          </div>
        ))}
        {(
          [
            ["Precision", t.precision, legacy.precision],
            ["Coverage", t.coverage, legacy.coverage],
          ] as const
        ).map(([k, v, ref]) => (
          <div key={k} className="col-span-1 bg-[var(--color-void)] px-3 py-3 sm:col-span-2">
            <div className="text-[9px]">{k}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-lg text-[var(--color-amber)]">
                <NumberFlow value={v} format={{ style: "percent", maximumFractionDigits: 1 }} />
              </span>
              <span className="text-[10px]">legacy {(ref * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {isTuned && (
        <p className="mt-4 border-l border-[var(--color-amber-dim)] pl-3 font-display text-sm normal-case leading-relaxed tracking-normal text-[var(--color-text)]">
          Perfect score. It's also a trap: these thresholds were found by searching against this exact set
          of answers, and they sit right on the edge of the data. The next query that looks like “something to sit
          on” won't be so polite.
        </p>
      )}
    </div>
  );
}
