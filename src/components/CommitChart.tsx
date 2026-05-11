import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { area, line, curveStepAfter } from "d3-shape";
import type { WeekPoint } from "../lib/types";

type Props = {
  weeks: WeekPoint[];
  height?: number;
};

export default function CommitChart({ weeks, height = 160 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<null | {
    week: WeekPoint;
    x: number;
    y: number;
  }>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWidth(Math.max(280, Math.floor(e.contentRect.width)));
      }
    });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  const margin = { top: 14, right: 14, bottom: 22, left: 36 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const { x, y, linePath, areaPath, maxY, ticks, lineLength } = useMemo(() => {
    if (weeks.length === 0) {
      return {
        x: null as null | ReturnType<typeof scaleTime<number, number>>,
        y: null as null | ReturnType<typeof scaleLinear<number, number>>,
        linePath: "",
        areaPath: "",
        maxY: 0,
        ticks: [] as { x: number; label: string }[],
        lineLength: 0,
      };
    }
    const points = weeks.map((w) => ({
      date: new Date(w.weekStart + "T00:00:00Z"),
      count: w.count,
    }));
    const xs = scaleTime()
      .domain([points[0].date, points[points.length - 1].date])
      .range([0, innerW]);
    const max = Math.max(1, ...points.map((p) => p.count));
    const ys = scaleLinear().domain([0, max]).range([innerH, 0]).nice();

    const lineGen = line<typeof points[0]>()
      .x((d) => xs(d.date))
      .y((d) => ys(d.count))
      .curve(curveStepAfter);
    const areaGen = area<typeof points[0]>()
      .x((d) => xs(d.date))
      .y0(innerH)
      .y1((d) => ys(d.count))
      .curve(curveStepAfter);

    // Month ticks across the domain.
    const startMs = points[0].date.getTime();
    const endMs = points[points.length - 1].date.getTime();
    const months: { x: number; label: string }[] = [];
    const cursor = new Date(points[0].date);
    cursor.setUTCDate(1);
    while (cursor.getTime() <= endMs) {
      if (cursor.getTime() >= startMs) {
        months.push({
          x: xs(cursor),
          label: cursor
            .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
            .toUpperCase(),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    // Limit tick count for narrow widths.
    const maxTicks = Math.max(4, Math.floor(innerW / 70));
    const stride = Math.max(1, Math.ceil(months.length / maxTicks));
    const tickList = months.filter((_, i) => i % stride === 0);

    const linePath = lineGen(points) || "";
    const areaPath = areaGen(points) || "";

    // Estimate path length for stroke-dasharray (rough: sum of segments).
    let lineLen = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = xs(points[i].date) - xs(points[i - 1].date);
      const dy = ys(points[i].count) - ys(points[i - 1].count);
      lineLen += Math.abs(dx) + Math.abs(dy);
    }

    return { x: xs, y: ys, linePath, areaPath, maxY: max, ticks: tickList, lineLength: Math.ceil(lineLen) };
  }, [weeks, innerW, innerH]);

  function handleMove(evt: React.MouseEvent<SVGSVGElement>) {
    if (!x || !svgRef.current || weeks.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = evt.clientX - rect.left - margin.left;
    if (px < 0 || px > innerW) {
      setHover(null);
      return;
    }
    const ms = x.invert(px).getTime();
    let nearestIdx = 0;
    let nearestDelta = Infinity;
    for (let i = 0; i < weeks.length; i++) {
      const d = Math.abs(new Date(weeks[i].weekStart + "T00:00:00Z").getTime() - ms);
      if (d < nearestDelta) {
        nearestDelta = d;
        nearestIdx = i;
      }
    }
    const w = weeks[nearestIdx];
    setHover({
      week: w,
      x: x(new Date(w.weekStart + "T00:00:00Z")) + margin.left,
      y: (y ? y(w.count) : 0) + margin.top,
    });
  }

  function fmtWeek(iso: string) {
    return iso.replace(/-/g, ".");
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-amber)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-amber)" stopOpacity="0.0" />
          </linearGradient>
          <pattern id="chart-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="var(--color-rule)" />
          </pattern>
        </defs>

        {/* Inner plot frame */}
        <rect
          x={margin.left}
          y={margin.top}
          width={innerW}
          height={innerH}
          fill="url(#chart-dots)"
          stroke="var(--color-rule)"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />

        {/* Y axis label (max) */}
        <text
          x={margin.left - 8}
          y={margin.top + 4}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize={9}
          fill="var(--color-mute)"
          style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
        >
          {maxY}
        </text>
        <text
          x={margin.left - 8}
          y={margin.top + innerH}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize={9}
          fill="var(--color-mute)"
          style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
        >
          0
        </text>
        <text
          x={margin.left - 8}
          y={margin.top + innerH / 2}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize={8}
          fill="var(--color-mute)"
          style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
          transform={`rotate(-90 ${margin.left - 24} ${margin.top + innerH / 2})`}
        >
          COMMITS/WK
        </text>

        {/* Horizontal rule at zero */}
        <line
          x1={margin.left}
          x2={margin.left + innerW}
          y1={margin.top + innerH}
          y2={margin.top + innerH}
          stroke="var(--color-rule-strong)"
          strokeWidth={1}
        />

        {/* Month ticks */}
        <g transform={`translate(${margin.left}, ${margin.top + innerH + 6})`}>
          {ticks.map((t, i) => (
            <g key={`${t.label}-${i}`} transform={`translate(${t.x}, 0)`}>
              <line y1={-innerH} y2={-2} stroke="var(--color-rule)" strokeDasharray="1 3" />
              <text
                y={12}
                fontFamily="var(--font-mono)"
                fontSize={9}
                fill="var(--color-mute)"
                textAnchor="middle"
                style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* Area fill */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <path
            d={areaPath}
            fill="url(#chart-fill)"
            className="chart-area"
          />
          {/* Line stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth={1.5}
            strokeLinejoin="miter"
            className="chart-line"
            style={{ ["--path-len" as string]: lineLength.toString() }}
          />
        </g>

        {/* Hover crosshair */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={margin.top}
              y2={margin.top + innerH}
              stroke="var(--color-amber-glow)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r={3}
              fill="var(--color-void)"
              stroke="var(--color-amber-glow)"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {/* Hover readout */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 border border-[var(--color-rule-strong)] bg-[var(--color-void)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-hud text-[var(--color-text)] shadow-[0_0_12px_rgba(0,0,0,0.6)]"
          style={{
            left: Math.min(hover.x + 10, width - 130),
            top: Math.max(margin.top, hover.y - 32),
          }}
        >
          <span className="text-[var(--color-mute)]">{fmtWeek(hover.week.weekStart)}</span>
          <span className="ml-2 text-[var(--color-amber)] tabular-nums">
            {hover.week.count} COMMITS
          </span>
        </div>
      )}
    </div>
  );
}
