import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-_·".split("");

type Props = {
  text: string;
  /** Total scramble duration, ms. */
  duration?: number;
  /** Delay before scramble begins after entering viewport, ms. */
  delay?: number;
  /** How many random characters to cycle through per slot before locking. */
  cyclesPerChar?: number;
  /** Trigger only once, or repeat every time it re-enters view. */
  once?: boolean;
  /** Threshold for the IntersectionObserver. */
  threshold?: number;
  className?: string;
};

export default function ScrambleText({
  text,
  duration = 900,
  delay = 0,
  cyclesPerChar = 6,
  once = true,
  threshold = 0.5,
  className = "",
}: Props) {
  // Start with the real text so SSR + first paint render correctly for SEO/no-JS.
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;

    const run = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const chars = text.split("");
      const totalSlots = chars.length;
      const start = performance.now();
      const perSlot = duration / Math.max(1, totalSlots);

      function frame(now: number) {
        const elapsed = now - start;
        const out = chars.map((ch, i) => {
          if (ch === " " || ch === " " || ch === "\n") return ch;
          const slotStart = i * perSlot * 0.5; // overlap slots a bit
          const slotEnd = slotStart + perSlot * cyclesPerChar * 0.4;
          if (elapsed >= slotEnd) return ch;
          if (elapsed < slotStart) {
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        });
        setDisplay(out.join(""));
        if (elapsed < duration + 80) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          setDisplay(text);
          rafRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (once && fired.current) return;
            fired.current = true;
            window.setTimeout(run, delay);
            if (once) io.disconnect();
          }
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, duration, delay, cyclesPerChar, once, threshold]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  );
}
