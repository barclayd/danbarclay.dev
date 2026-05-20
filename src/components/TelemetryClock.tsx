import { useEffect, useState } from "react";

function fmtUTC(d: Date) {
  const iso = d.toISOString();
  // 2026.05.11 / 14:23:07 UTC
  const date = iso.slice(0, 10).replace(/-/g, ".");
  const time = iso.slice(11, 19);
  return `${date} / ${time} UTC`;
}

export default function TelemetryClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="font-mono text-[11px] tabular-nums text-[var(--color-text)]"
      suppressHydrationWarning
    >
      {now ? fmtUTC(now) : "----.--.-- / --:--:-- UTC"}
    </span>
  );
}
