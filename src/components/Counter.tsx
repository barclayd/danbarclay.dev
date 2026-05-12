import NumberFlow, { continuous } from "@number-flow/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Stagger delay before the count-up begins, ms. */
  delay?: number;
  /** When true, count only fires after entering the viewport. */
  whenVisible?: boolean;
  /** Format the number — defaults to en-GB with thousands separators. */
  format?: Intl.NumberFormatOptions;
  className?: string;
  /** Optional locale, defaults to en-GB. */
  locale?: string;
};

export default function Counter({
  value,
  prefix,
  suffix,
  delay = 0,
  whenVisible = true,
  format,
  className = "",
  locale = "en-GB",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      setShown(value);
      return;
    }
    if (!whenVisible) {
      const t = window.setTimeout(() => {
        fired.current = true;
        setShown(value);
      }, delay);
      return () => window.clearTimeout(t);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true;
            window.setTimeout(() => setShown(value), delay);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, delay, whenVisible]);

  return (
    <span ref={ref} className={`inline-flex items-baseline tabular-nums ${className}`}>
      {prefix ? <span className="mr-0.5">{prefix}</span> : null}
      <NumberFlow
        value={shown}
        locales={locale}
        format={format}
        plugins={[continuous]}
        transformTiming={{ duration: 1100, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" }}
        spinTiming={{ duration: 1100, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" }}
        opacityTiming={{ duration: 300, easing: "ease-out" }}
        willChange
      />
      {suffix ? <span className="ml-0.5">{suffix}</span> : null}
    </span>
  );
}
