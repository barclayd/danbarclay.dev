import fs from "node:fs";
import path from "node:path";
import type { ContributionsData, Project } from "./types";

// Single source for the four products. Every page (home sequence, work bands,
// about rows, product pages, nav) reads its copy from here.

export type ProductKey = "promptly" | "keepfresh" | "stitch" | "onair";
type Stat = [value: string, label: string];

export type Product = {
  key: ProductKey;
  n: string;
  name: string;
  href: `/${ProductKey}`;
  accent: string;
  category: string;
  /** Short tag for the mobile menu. */
  navTag: string;
  tagline: string;
  intro: string;
  specs: Stat[];
  problem: string;
  solution: string;
  stack: string[];
  site: string;
  siteLabel: string;
  repo: string;
  status: string;
  /** GitHub repos that feed the product's commit chart. */
  slugs: string[];
  /** Alt text for the product shot. */
  shot: string;
  /** object-position for the shot when a full-bleed crop cuts it down, e.g. on phones. */
  shotFocus: string;
  /** Home products sequence. */
  seq: { category: string; copy: string; stats: Stat[] };
  /** Work page band. */
  band: { category: string; copy: string; stats: Stat[] };
  /** About "Now building" row. */
  row: { desc: string; metric: string; label: string };
};

export const ORDER: ProductKey[] = ["promptly", "keepfresh", "stitch", "onair"];

export const PRODUCTS: Record<ProductKey, Product> = {
  promptly: {
    key: "promptly",
    n: "01",
    name: "Promptly",
    href: "/promptly",
    accent: "oklch(0.72 0.16 285)",
    category: "B2B SaaS · LLM prompt CMS",
    navTag: "AI CMS",
    tagline: "The CMS powering the next wave of AI development.",
    intro:
      "Your prompts don't belong in your codebase. They belong with the domain experts who know how to write them.",
    specs: [
      ["100+", "Companies in production"],
      ["B2B", "SaaS"],
      ["TypeScript", "End to end"],
      ["1 call", "Typed SDK fetch"],
    ],
    problem:
      "AI features ship with prompts hard-coded in application repos. Every change to wording, tone or behaviour waits on an engineer, a code review and a deploy, while the people who know the domain (support, marketing, legal, product) can't touch the prompt that defines how the AI speaks for the company.",
    solution:
      "A CMS built for prompts: versioned, environment-scoped and type-safe at runtime through the Promptly SDK. Domain experts write and release prompts in the dashboard. Engineers consume them with a single typed function call.",
    stack: [
      "TypeScript end to end",
      "Typed prompt-fetching SDK with caching",
      "Hosted at promptlycms.com",
      "Zero-config integration for product teams",
    ],
    site: "https://promptlycms.com",
    siteLabel: "promptlycms.com",
    repo: "https://github.com/barclayd/promptly",
    status: "Live · Used by 100+ companies",
    slugs: ["promptly", "promptly-package"],
    shot: "Promptly's prompt editor, with system and user prompts and their variables",
    shotFocus: "78% 50%",
    seq: {
      category: "B2B SaaS · LLM prompt CMS",
      copy: "The CMS powering the next wave of AI development. Domain experts author, version and ship prompts without a code deploy.",
      stats: [
        ["100+", "Companies in production"],
        ["TS", "End to end"],
        ["1 call", "Typed SDK fetch"],
      ],
    },
    band: {
      category: "B2B SaaS · LLM prompt CMS",
      copy: "The CMS powering the next wave of AI development. Domain experts author, version and ship prompts without a code deploy.",
      stats: [
        ["100+", "Companies in production"],
        ["TS", "End to end"],
      ],
    },
    row: {
      desc: "The CMS powering the next wave of AI development. It hands LLM prompts back to the domain experts who write them.",
      metric: "100+",
      label: "Companies",
    },
  },
  keepfresh: {
    key: "keepfresh",
    n: "02",
    name: "KeepFresh",
    href: "/keepfresh",
    accent: "oklch(0.72 0.16 150)",
    category: "iOS · Lifestyle",
    navTag: "iOS",
    tagline: "An iOS app working to end food waste for good.",
    intro: "Know what's in the fridge, and get a nudge just before it spoils.",
    specs: [
      ["77K+", "Downloads"],
      ["Daily", "Hundreds of households"],
      ["Swift", "Native iOS"],
      ["Edge", "Cloudflare backend"],
    ],
    problem:
      "A third of the food households buy is thrown away, mostly because someone forgot what was in the fridge or how long it had been there. Existing trackers are tedious to maintain, so nobody sticks with them.",
    solution:
      "A native iOS app designed around the fewest possible taps to add an item, with smart expiry inference and push notifications that fire just before things go off. Built in Swift and hardened by daily use.",
    stack: [
      "iOS · Swift · SwiftUI",
      "Backend · Hono.js on Cloudflare Workers",
      "Storage · Cloudflare D1",
      "Scheduled runners for expiry alerts",
    ],
    site: "https://keepfre.sh",
    siteLabel: "keepfre.sh",
    repo: "https://github.com/barclayd/keepfresh-ios",
    status: "Live on the App Store · 77,000+ downloads",
    slugs: ["keepfresh-ios", "keepfresh-api"],
    shot: "The KeepFresh app icon, a halved avocado",
    shotFocus: "73% 46%",
    seq: {
      category: "iOS · Lifestyle",
      copy: "An iOS app working to end food waste for good. Households track groceries and catch what's about to expire.",
      stats: [
        ["77K+", "Downloads"],
        ["Daily", "Hundreds of households"],
        ["Swift", "Native iOS"],
      ],
    },
    band: {
      category: "iOS · Lifestyle",
      copy: "An iOS app working to end food waste for good. Households track groceries and catch what's about to expire.",
      stats: [
        ["77K+", "Downloads"],
        ["Daily", "Hundreds of households"],
      ],
    },
    row: {
      desc: "A Swift-built iOS app working to end food waste for good. Tracks grocery inventory and flags what's about to expire.",
      metric: "77K+",
      label: "Downloads",
    },
  },
  stitch: {
    key: "stitch",
    n: "03",
    name: "Stitch",
    href: "/stitch",
    accent: "oklch(0.72 0.16 70)",
    category: "Free web app · Strava",
    navTag: "Web",
    tagline: "Combine split Strava rides into one activity, for free.",
    intro:
      "Preview the route and the gaps, download a GPX backup, then confirm the upload. It never deletes an activity.",
    specs: [
      ["Free", "Forever"],
      ["2–8", "Rides per stitch"],
      ["24h", "Preview retention"],
      ["Sep 26", "Launched"],
    ],
    problem:
      "Rides get split. A café stop, a dead battery or a device that drops the recording halfway up a climb, and one ride lands on Strava as two or three fragments. Strava can't join them, and the workarounds mean hand-editing GPX files and hoping the timestamps survive.",
    solution:
      "Connect Strava, pick two to eight rides, and Stitch previews the joined route with every gap left visible. Timestamps, GPS, elevation, heart rate and cadence are preserved. Download the merged GPX and a backup of the originals, then confirm the upload in one explicit step.",
    stack: [
      "TypeScript · Remix 3",
      "Cloudflare Workers · Durable Objects (SQLite)",
      "Strava OAuth and webhooks",
      "Encrypted per-athlete storage, previews purged after 24h",
    ],
    site: "https://stravastitch.com",
    siteLabel: "stravastitch.com",
    repo: "https://github.com/barclayd/strava-stitch",
    status: "Live · Launched September 2026",
    slugs: ["strava-stitch"],
    shot: "Stitch joining two activity routes into one",
    shotFocus: "50% 70%",
    seq: {
      category: "Free web app · Strava",
      copy: "Combine split Strava rides into one activity. Preview the route and gaps, download a GPX backup, then confirm the upload.",
      stats: [
        ["Free", "Forever"],
        ["2–8", "Rides per stitch"],
        ["Sep 26", "Launched"],
      ],
    },
    band: {
      category: "Web · Strava",
      copy: "Combine split Strava rides into one activity, for free. Preview the route and gaps, download a GPX backup, then confirm the upload.",
      stats: [
        ["2–8", "Rides per stitch"],
        ["Free", "Launched Sep 2026"],
      ],
    },
    row: {
      desc: "A free web app that combines split Strava rides into one activity. It never deletes anything.",
      metric: "Free",
      label: "Since Sep 2026",
    },
  },
  onair: {
    key: "onair",
    n: "04",
    name: "On Air",
    href: "/onair",
    accent: "oklch(0.72 0.16 25)",
    category: "macOS · Dictation",
    navTag: "macOS",
    tagline: "A free-forever Wispr Flow alternative for Mac.",
    intro:
      "Hold fn, speak, let go. The transcript lands in whatever you were typing in, with a soft red glow as the only interface.",
    specs: [
      ["Free", "Forever"],
      ["fn", "Hold to talk"],
      ["RAM", "Audio never hits disk"],
      ["Oct 26", "Launched"],
    ],
    problem:
      "Speaking is faster than typing, and when you steer AI coding agents all day, typing prompts is the bottleneck. Most dictation tools get in the way with a floating window, a menu, a timer or a subscription. Then they paste into the wrong place or overwrite your clipboard.",
    solution:
      "Hold fn and speak. Audio streams to OpenAI live transcription while a red glow rises with your voice. Let go and the text is pasted into the field you started in. If focus has moved, it waits in the menu bar instead. Your clipboard is restored and audio never touches the disk.",
    stack: [
      "Swift 6 · SwiftUI · native menu-bar app",
      "OpenAI live transcription, your own key in Keychain",
      "Developer ID signed and notarised",
      "Site on Remix 3 · Cloudflare Workers",
    ],
    site: "https://useonair.app",
    siteLabel: "useonair.app",
    repo: "https://github.com/barclayd/on-air",
    status: "Live · Launched October 2026",
    slugs: ["on-air"],
    shot: "On Air dictating into Notes on a MacBook",
    shotFocus: "72% 50%",
    seq: {
      category: "macOS · Dictation",
      copy: "A free-forever Wispr Flow alternative for Mac. Hold fn, speak, let go, and the transcript lands wherever you were typing.",
      stats: [
        ["fn", "Hold to talk"],
        ["Free", "Forever"],
        ["Oct 26", "Launched"],
      ],
    },
    band: {
      category: "macOS · Dictation",
      copy: "A free-forever Wispr Flow alternative for developers coding with AI by voice. Hold fn, speak, let go.",
      stats: [
        ["fn", "Hold to talk"],
        ["Free", "Launched Oct 2026"],
      ],
    },
    row: {
      desc: "A free-forever Wispr Flow alternative for Mac. Hold fn, speak, let go, and the transcript lands wherever you were typing.",
      metric: "Free",
      label: "Since Oct 2026",
    },
  },
};

export const PRODUCT_LIST = ORDER.map((k) => PRODUCTS[k]);

export const nextProduct = (key: ProductKey) => PRODUCTS[ORDER[(ORDER.indexOf(key) + 1) % ORDER.length]];

/** Accent with an alpha channel, e.g. for CTA glows. */
export const withAlpha = (accent: string, a: number) => accent.replace(")", ` / ${a})`);

// Product imagery is optional: drop a 16:9 shot into public/work/<key>.webp
// and every page that shows the product picks it up. Without one, the image
// slot falls back to an accent-lit gradient. Full-bleed backgrounds prefer a
// dark-toned <key>-bg.webp when there is one (e.g. for a light-themed shot).
export function shotFor(key: ProductKey, use: "screen" | "bg" = "screen"): string | null {
  const has = (name: string) => fs.existsSync(path.join(process.cwd(), "public", "work", `${name}.webp`));
  if (use === "bg" && has(`${key}-bg`)) return `/work/${key}-bg.webp`;
  return has(key) ? `/work/${key}.webp` : null;
}

// ---- Product commit chart (1000 × 300) ---------------------------------------

export function buildChart(list: Project[], slugs: string[]) {
  const map: Record<string, number> = {};
  let repos = 0;
  for (const p of list) {
    if (!slugs.includes(p.slug)) continue;
    repos++;
    for (const w of p.weeks ?? []) map[w.weekStart] = (map[w.weekStart] ?? 0) + w.count;
  }
  const keys = Object.keys(map).sort();
  if (!keys.length) return null;
  const vals = keys.map((k) => map[k]);
  const n = Math.max(2, keys.length);
  const max = Math.max(1, ...vals);
  const line = vals
    .map((v, i) => (i ? "L" : "M") + ((i / (n - 1)) * 1000).toFixed(1) + "," + (296 - (v / max) * 280).toFixed(1))
    .join("");
  const ticks: { label: string; left: string }[] = [];
  let lastLabel = "";
  keys.forEach((k, i) => {
    const d = new Date(k + "T00:00:00Z");
    const label = ["Jan", "Apr", "Jul", "Oct"][Math.floor(d.getUTCMonth() / 3)] + " " + String(d.getUTCFullYear()).slice(2);
    if (d.getUTCMonth() % 3 === 0 && d.getUTCDate() <= 7 && label !== lastLabel && i / (n - 1) < 0.94) {
      ticks.push({ label, left: ((i / (n - 1)) * 100).toFixed(2) + "%" });
      lastLabel = label;
    }
  });
  return {
    line,
    area: line + "L1000,300L0,300Z",
    total: vals.reduce((a, b) => a + b, 0),
    peak: max,
    repos,
    ticks,
  };
}

// ---- GitHub activity heatmap -------------------------------------------------

export const HEAT_LEVELS = [
  "rgba(255,255,255,0.05)",
  "rgba(255,255,255,0.16)",
  "rgba(255,255,255,0.34)",
  "rgba(255,255,255,0.6)",
  "#f2f2ef",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildActivity(data: ContributionsData) {
  const days = data.days;
  const pad = days.length ? new Date(days[0].date + "T00:00:00Z").getUTCDay() : 0;
  const cells: ({ level: number; delay: number; title: string } | null)[] = Array(pad).fill(null);
  const months: { label: string; col: number }[] = [];
  let peak = 0;
  let streak = 0;
  let run = 0;
  days.forEach((d, i) => {
    const k = i + pad;
    const col = Math.floor(k / 7);
    const row = k % 7;
    const dt = new Date(d.date + "T00:00:00Z");
    if (dt.getUTCDate() === 1) months.push({ label: MONTHS[dt.getUTCMonth()], col: col + 1 });
    cells.push({ level: d.level, delay: col * 16 + row * 24, title: `${d.count} contributions · ${d.date}` });
    peak = Math.max(peak, d.count);
    run = d.count > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  });
  const total = data.total;
  return {
    cells,
    months,
    cols: Math.ceil(cells.length / 7),
    total,
    avg: days.length ? +(total / days.length).toFixed(1) : 0,
    peak,
    streak,
    k: +(total / 1000).toFixed(1),
  };
}

// ---- Repositories list -------------------------------------------------------

const DESC: Record<string, string> = {
  promptly: "The CMS for LLM prompts. Domain experts write, version and ship them without a deploy.",
  "on-air": "Native macOS dictation. Hold fn, speak, let go.",
};

function slugInfo(slug: string): Product | null {
  if (slug.startsWith("keepfresh")) return PRODUCTS.keepfresh;
  if (slug.startsWith("promptly")) return PRODUCTS.promptly;
  if (slug.startsWith("on-air")) return PRODUCTS.onair;
  if (slug.includes("stitch")) return PRODUCTS.stitch;
  return null;
}

export function buildProjects(list: Project[]) {
  return [...list]
    .sort((a, b) => a.index - b.index)
    .map((p, i) => {
      const weeks = p.weeks ?? [];
      const n = Math.max(2, weeks.length);
      const max = Math.max(1, ...weeks.map((w) => w.count));
      const line = weeks
        .map((w, j) => (j ? "L" : "M") + ((j / (n - 1)) * 300).toFixed(1) + "," + (58 - (w.count / max) * 54).toFixed(1))
        .join("");
      const y0 = new Date(p.createdAt).getUTCFullYear();
      const yy = new Date(p.pushedAt).getUTCFullYear();
      const product = slugInfo(p.slug);
      return {
        idx: String(i + 1).padStart(2, "0"),
        name: p.displayName,
        desc: DESC[p.slug] ?? p.description,
        accent: product?.accent ?? "#f2f2ef",
        href: product?.href ?? p.url,
        external: !product,
        line: line || "M0,58",
        area: (line || "M0,58") + "L300,60L0,60Z",
        years: y0 === yy ? String(y0) : `${y0}–${yy}`,
        commits: (p.totalCommits ?? weeks.reduce((a, w) => a + w.count, 0)).toLocaleString("en-GB"),
        language: p.language ?? "—",
      };
    });
}
