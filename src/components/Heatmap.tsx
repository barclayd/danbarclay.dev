import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContributionDay, ContributionsData } from "../lib/types";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT_GUTTER = 26;
const TOP_GUTTER = 16;
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
  col: number;
  row: number;
} | null;

export default function Heatmap({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);

  const { weeks, weekCount, monthLabels } = useMemo(() => {
    const days = data.days;
    if (days.length === 0)
      return {
        weeks: [] as (ContributionDay | null)[][],
        weekCount: 0,
        monthLabels: [] as { col: number; label: string }[],
      };

    const firstDate = new Date(days[0].date + "T00:00:00Z");
    const offset = firstDate.getUTCDay();
    const padded: (ContributionDay | null)[] = Array.from(
      { length: offset },
      () => null
    ).concat(days);

    const weeks: (ContributionDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }

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

    return { weeks, weekCount: weeks.length, monthLabels };
  }, [data]);

  const vbWidth = LEFT_GUTTER + weekCount * STEP;
  const vbHeight = TOP_GUTTER + 7 * STEP;

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg || weekCount === 0) return;
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / vbWidth;
      const vbX = (clientX - rect.left) / scale - LEFT_GUTTER;
      const vbY = (clientY - rect.top) / scale - TOP_GUTTER;
      if (vbX < 0 || vbY < 0) {
        setHover(null);
        return;
      }
      const col = Math.floor(vbX / STEP);
      const row = Math.floor(vbY / STEP);
      if (col < 0 || col >= weekCount || row < 0 || row > 6 || !weeks[col]) {
        setHover(null);
        return;
      }
      const day = weeks[col][row];
      if (!day) {
        setHover(null);
        return;
      }
      setHover({ day, col, row });
    },
    [weeks, weekCount, vbWidth]
  );

  // Dismiss tooltip on tap/click outside the heatmap (touch persistence).
  useEffect(() => {
    if (!hover) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setHover(null);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [hover]);

  const tooltipStyle = useMemo<React.CSSProperties | null>(() => {
    if (!hover || !svgRef.current || !wrapRef.current) return null;
    const svgRect = svgRef.current.getBoundingClientRect();
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const scale = svgRect.width / vbWidth;
    const cellCenterX =
      svgRect.left -
      wrapRect.left +
      (LEFT_GUTTER + hover.col * STEP + CELL / 2) * scale;
    const cellTopY =
      svgRect.top - wrapRect.top + (TOP_GUTTER + hover.row * STEP) * scale;
    return {
      left: `${cellCenterX}px`,
      top: `${cellTopY - 8}px`,
      transform: "translate(-50%, -100%)",
    };
  }, [hover, vbWidth]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="xMinYMid meet"
        className="block w-full"
        style={{ touchAction: "pan-y", height: "auto" }}
        role="grid"
        aria-label={`GitHub contributions, ${data.total} in the past year`}
        onPointerMove={(e) => {
          // Mouse hover OR active touch drag.
          if (e.pointerType === "mouse" || e.buttons > 0) {
            updateFromPointer(e.clientX, e.clientY);
          }
        }}
        onPointerDown={(e) => {
          (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerLeave={(e) => {
          // Only clear for mouse — touch users can scroll/pan past and tooltip persists.
          if (e.pointerType === "mouse") setHover(null);
        }}
        onPointerCancel={() => setHover(null)}
      >
        {/* Day-of-week labels — SVG text so they scale uniformly. */}
        {["", "MON", "", "WED", "", "FRI", ""].map((label, i) =>
          label ? (
            <text
              key={`d-${i}`}
              x={LEFT_GUTTER - 6}
              y={TOP_GUTTER + i * STEP + CELL - 2}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize={7}
              fill="var(--color-mute)"
              style={{ textTransform: "uppercase", letterSpacing: "0.18em" }}
            >
              {label}
            </text>
          ) : null
        )}

        {/* Month labels — embedded in SVG so they scale uniformly. */}
        {monthLabels.map((m) => (
          <text
            key={m.col}
            x={LEFT_GUTTER + m.col * STEP}
            y={TOP_GUTTER - 4}
            fontFamily="var(--font-mono)"
            fontSize={8}
            fill="var(--color-mute)"
            style={{ textTransform: "uppercase", letterSpacing: "0.18em" }}
          >
            {m.label}
          </text>
        ))}

        {/* Cells */}
        {weeks.map((col, ci) =>
          col.map((day, ri) => {
            if (!day) return null;
            const isHover = hover && hover.col === ci && hover.row === ri;
            return (
              <rect
                key={day.date}
                className="hud-cell heatmap-cell"
                x={LEFT_GUTTER + ci * STEP}
                y={TOP_GUTTER + ri * STEP}
                width={CELL}
                height={CELL}
                fill={cellColor(day.level)}
                style={{ ["--col-index" as string]: ci.toString() }}
                stroke={isHover ? "var(--color-amber-glow)" : undefined}
                strokeWidth={isHover ? 1 : 0}
                aria-label={`${day.date}, ${day.count} contributions`}
              />
            );
          })
        )}
      </svg>

      <div className="sr-only" aria-live="polite">
        {hover ? `${fmtDate(hover.day.date)}, ${hover.day.count} contributions` : ""}
      </div>

      {hover && tooltipStyle && (
        <div className="pointer-events-none absolute z-20" style={tooltipStyle}>
          <div className="relative border border-[var(--color-rule-strong)] bg-[var(--color-void)] px-3 py-2 shadow-[0_0_12px_rgba(0,0,0,0.6)]">
            <div className="font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)] whitespace-nowrap">
              {fmtDate(hover.day.date)}
            </div>
            <div className="font-mono text-sm tabular-nums text-[var(--color-amber)] whitespace-nowrap">
              {hover.day.count} {hover.day.count === 1 ? "CONTRIBUTION" : "CONTRIBUTIONS"}
            </div>
            <div
              className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[var(--color-rule-strong)] bg-[var(--color-void)]"
              aria-hidden="true"
            ></div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-hud text-[var(--color-mute)]">
        <span>LOW</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className="block h-3 w-3"
              style={{ background: cellColor(l as 0 | 1 | 2 | 3 | 4) }}
              aria-hidden="true"
            ></span>
          ))}
        </div>
        <span>HIGH</span>
      </div>
    </div>
  );
}
