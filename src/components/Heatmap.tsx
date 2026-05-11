import { useMemo, useRef, useState } from "react";
import type { ContributionDay, ContributionsData } from "../lib/types";

const CELL = 12;
const GAP = 3;
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function cellColor(level: 0 | 1 | 2 | 3 | 4) {
  return [
    "var(--color-cell-0)",
    "var(--color-cell-1)",
    "var(--color-cell-2)",
    "var(--color-cell-3)",
    "var(--color-cell-4)",
  ][level];
}

function fmtDate(iso: string) {
  return iso.replace(/-/g, ".");
}

type Props = {
  data: ContributionsData;
};

type Hover = {
  day: ContributionDay;
  x: number;
  y: number;
} | null;

export default function Heatmap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);

  // Build 7-row x N-col grid. Each day sits at row=getUTCDay(date), col=weekIndex.
  const { weeks, weekCount, monthLabels } = useMemo(() => {
    const days = data.days;
    if (days.length === 0)
      return { weeks: [] as ContributionDay[][], weekCount: 0, monthLabels: [] as { col: number; label: string }[] };

    // Align first column to the first Sunday at or before the first day.
    const firstDate = new Date(days[0].date + "T00:00:00Z");
    const offset = firstDate.getUTCDay(); // 0 = Sunday
    const padded: (ContributionDay | null)[] = Array.from({ length: offset }, () => null).concat(days);

    const weeks: (ContributionDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }

    // Month labels: first column whose Sunday belongs to that month.
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < weeks.length; c++) {
      const firstDay = weeks[c].find((d) => d !== null);
      if (!firstDay) continue;
      const m = new Date(firstDay.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col: c, label: MONTHS[m] });
        lastMonth = m;
      }
    }

    return { weeks: weeks as ContributionDay[][], weekCount: weeks.length, monthLabels };
  }, [data]);

  const width = weekCount * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  return (
    <div ref={containerRef} className="relative">
      {/* Month axis */}
      <div
        className="relative mb-1 font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)]"
        style={{ height: 14, width }}
      >
        {monthLabels.map((m) => (
          <span
            key={m.col}
            className="absolute top-0"
            style={{ left: m.col * (CELL + GAP) }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Day axis */}
        <div
          className="grid font-mono text-[9px] uppercase tracking-hud text-[var(--color-mute)]"
          style={{ gridTemplateRows: `repeat(7, ${CELL + GAP}px)`, height }}
        >
          <span></span>
          <span className="leading-none">MON</span>
          <span></span>
          <span className="leading-none">WED</span>
          <span></span>
          <span className="leading-none">FRI</span>
          <span></span>
        </div>

        {/* Cell grid */}
        <div
          className="relative overflow-x-auto"
          onMouseLeave={() => setHover(null)}
        >
          <svg
            width={width}
            height={height}
            role="grid"
            aria-label={`GitHub contributions, ${data.total} in the past year`}
          >
            {weeks.map((col, ci) =>
              col.map((day, ri) => {
                if (!day) return null;
                const x = ci * (CELL + GAP);
                const y = ri * (CELL + GAP);
                return (
                  <rect
                    key={`${day.date}`}
                    className="hud-cell heatmap-cell"
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={cellColor(day.level)}
                    style={{ ["--col-index" as string]: ci.toString() }}
                    role="img"
                    aria-label={`${day.date}, ${day.count} contributions`}
                    tabIndex={day.count > 0 ? 0 : -1}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget as SVGRectElement;
                      const rect = target.getBoundingClientRect();
                      const wrap = containerRef.current?.getBoundingClientRect();
                      if (!wrap) return;
                      setHover({
                        day,
                        x: rect.left - wrap.left + CELL / 2,
                        y: rect.top - wrap.top,
                      });
                    }}
                    onFocus={(e) => {
                      const target = e.currentTarget as SVGRectElement;
                      const rect = target.getBoundingClientRect();
                      const wrap = containerRef.current?.getBoundingClientRect();
                      if (!wrap) return;
                      setHover({
                        day,
                        x: rect.left - wrap.left + CELL / 2,
                        y: rect.top - wrap.top,
                      });
                    }}
                    onBlur={() => setHover(null)}
                  />
                );
              })
            )}
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: hover.x,
                top: hover.y - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="relative border border-[var(--color-rule-strong)] bg-[var(--color-void)] px-3 py-2 shadow-[0_0_12px_rgba(0,0,0,0.6)]">
                <div className="font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)]">
                  {fmtDate(hover.day.date)}
                </div>
                <div className="font-mono text-sm tabular-nums text-[var(--color-amber)]">
                  {hover.day.count} {hover.day.count === 1 ? "PUSH" : "PUSHES"}
                </div>
                {/* Pointer tick */}
                <div
                  className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[var(--color-rule-strong)] bg-[var(--color-void)]"
                  aria-hidden="true"
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)]">
        <span>LOW</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className="block h-3 w-3"
              style={{ background: cellColor(l as 0 | 1 | 2 | 3 | 4) }}
            ></span>
          ))}
        </div>
        <span>HIGH</span>
      </div>
    </div>
  );
}
