import { useEffect, useRef, useState } from "react";
import { scaleLinear, scaleLog } from "d3-scale";

type Build = { key: string; label: string; sub: string; cost: number; tokens: string; correct: string; hot?: boolean };
type Lane = { label: string; ms: number[]; p50: number; p95: number; hot?: boolean };
type Props = { builds: Build[]; lanes: Lane[] };

const tick = "font-mono text-[9px] uppercase tracking-hud";

export default function CostLatencyChart({ builds, lanes }: Props) {
  const [tab, setTab] = useState<"cost" | "latency">("cost");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const legacy = builds[0].cost;
  const maxCost = Math.max(...builds.map((b) => b.cost));

  const m = { left: width < 520 ? 72 : 110, right: 12 };
  const laneH = 46;
  const innerW = Math.max(0, width - m.left - m.right);
  const x = scaleLog().domain([200, 5000]).range([0, innerW]);
  const h = lanes.length * laneH + 34;

  return (
    <div>
      <div className="flex gap-1" role="tablist" aria-label="Chart view">
        {(
          [
            ["cost", "Cost per 1,000 queries"],
            ["latency", "Latency per request"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-hud transition-colors ${
              tab === v
                ? "border-[var(--color-amber-dim)] bg-[rgba(232,154,60,0.08)] text-[var(--color-amber)]"
                : "border-[var(--color-rule-strong)] text-[var(--color-mute)] hover:text-[var(--color-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="mt-5 w-full" role="tabpanel">
        {tab === "cost" ? (
          <div>
            <ul className="space-y-4">
              {builds.map((b) => (
                <li key={b.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`font-display text-[15px] ${b.hot ? "text-[var(--color-amber)]" : "text-[var(--color-text-bright)]"}`}>
                      {b.label} <span className="text-[13px] text-[var(--color-mute)]">· {b.sub}</span>
                    </span>
                    <span className="font-mono text-sm text-[var(--color-text-bright)]">${b.cost.toFixed(2)}</span>
                  </div>
                  <div className="relative mt-1.5 h-3 bg-[var(--color-rule)]">
                    {/* Legacy reference */}
                    <div
                      className="absolute -inset-y-1 z-10 border-l border-dashed border-[var(--color-text)]"
                      style={{ left: `${(legacy / maxCost) * 100}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(b.cost / maxCost) * 100}%`,
                        background: b.hot ? "var(--color-amber)" : b.key === "legacy" ? "var(--color-mute)" : "var(--color-amber-dim)",
                      }}
                    />
                  </div>
                  <div className={`mt-1 ${tick} text-[var(--color-mute)]`}>
                    {b.tokens} · {b.correct}
                  </div>
                </li>
              ))}
            </ul>
            <div className={`mt-3 ${tick} text-[var(--color-mute)]`}>Dashed line: legacy cost</div>
          </div>
        ) : (
          width > 0 && (
            <svg width={width} height={h} className="block" role="img" aria-label="Per-request latency by build, log scale">
              <g transform={`translate(${m.left},8)`}>
                {/* TypeSafe's published response-time range, for reference */}
                <rect x={x(200)} width={x(500) - x(200)} y={0} height={lanes.length * laneH} fill="rgba(232,154,60,0.05)" />
                <text x={x(500) - 4} y={10} textAnchor="end" fontSize={8} fill="var(--color-amber-dim)" letterSpacing="0.1em">
                  ≤ 500 MS
                </text>
                {[250, 500, 1000, 2000, 4000].map((v) => (
                  <g key={v}>
                    <line x1={x(v)} x2={x(v)} y1={0} y2={lanes.length * laneH} stroke="var(--color-rule)" strokeDasharray="2 4" />
                    <text x={x(v)} y={lanes.length * laneH + 14} textAnchor="middle" fontSize={9} fill="var(--color-mute)">
                      {v >= 1000 ? `${v / 1000}s` : `${v}ms`}
                    </text>
                  </g>
                ))}
                {lanes.map((l, li) => {
                  const cy = li * laneH + laneH / 2;
                  const jitter = scaleLinear().domain([0, 1]).range([-12, 12]);
                  return (
                    <g key={l.label}>
                      <text x={-10} y={cy - 2} textAnchor="end" fontSize={10} fill={l.hot ? "var(--color-amber)" : "var(--color-text)"}>
                        {l.label}
                      </text>
                      <text x={-10} y={cy + 10} textAnchor="end" fontSize={8} fill="var(--color-mute)" letterSpacing="0.08em">
                        P50 {l.p50.toLocaleString("en-GB")}
                      </text>
                      {l.ms.map((ms, i) => (
                        <circle
                          key={i}
                          cx={x(Math.min(5000, Math.max(200, ms)))}
                          // Deterministic jitter so dots don't stack on one line.
                          cy={cy + jitter(((i * 0.618034) % 1 + 1) % 1)}
                          r={2.4}
                          fill={l.hot ? "var(--color-amber)" : "var(--color-mute)"}
                          fillOpacity={0.55}
                        />
                      ))}
                      {[
                        [l.p50, 1],
                        [l.p95, 0.5],
                      ].map(([v, o]) => (
                        <line
                          key={o}
                          x1={x(v)}
                          x2={x(v)}
                          y1={cy - 17}
                          y2={cy + 17}
                          stroke="var(--color-text-bright)"
                          strokeOpacity={o}
                          strokeWidth={o === 1 ? 2 : 1}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            </svg>
          )
        )}
        {tab === "latency" && (
          <div className={`mt-2 ${tick} text-[var(--color-mute)]`}>
            Each dot is one request · bold tick p50 · faint tick p95 · log scale
          </div>
        )}
      </div>
    </div>
  );
}
