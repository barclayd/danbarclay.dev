// Site motion engine, ported from the design handoff's site-motion.js.
// Everything is driven by data attributes so pages stay static HTML:
//   data-reveal="up|fade|rise|track|wipe|wipex|line|scale|draw|cell"
//   data-delay, data-dur, data-stagger (on a parent)
//   data-count (+ data-decimals, data-prefix, data-suffix)
//   data-loop="breathe|pulse|glow|drift"
//   data-sequence (+ data-seq-panel, data-seq-bar, data-seq-label)
//   data-scrollscale, data-parallax, data-magnetic

declare global {
  interface Window {
    DBMotion?: { scan: (root?: ParentNode) => void; ease: string };
  }
}

type Keyframes = Keyframe[];
type El = HTMLElement & { __count?: boolean; __list?: Element[] };

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.7, 0, 0.2, 1)";

const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => reducedQuery.matches;

const KF: Record<string, (el: Element) => Keyframes> = {
  up: () => [
    { opacity: 0, transform: "translate3d(0,56px,0)", filter: "blur(12px)" },
    { opacity: 1, transform: "translate3d(0,0,0)", filter: "blur(0px)" },
  ],
  fade: () => [{ opacity: 0 }, { opacity: 1 }],
  rise: () => [{ transform: "translate3d(0,115%,0)" }, { transform: "translate3d(0,0,0)" }],
  track: (el) => {
    const ls = getComputedStyle(el).letterSpacing;
    return [
      { opacity: 0, letterSpacing: "0.9em", filter: "blur(14px)" },
      { opacity: 1, letterSpacing: ls === "normal" ? "0px" : ls, filter: "blur(0px)" },
    ];
  },
  wipe: () => [{ clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
  wipex: () => [{ clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
  line: () => [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
  scale: () => [
    { opacity: 0, transform: "scale(1.14)", filter: "blur(24px)" },
    { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
  ],
  draw: () => [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
  cell: () => [
    { opacity: 0, transform: "scale(0)" },
    { opacity: 1, transform: "scale(1)" },
  ],
};

const DUR: Record<string, number> = {
  up: 1200,
  fade: 1000,
  rise: 1300,
  track: 1900,
  wipe: 1600,
  wipex: 1600,
  line: 1800,
  scale: 2000,
  draw: 2400,
  cell: 700,
};

const LOOPS: Record<string, { kf: Keyframes; dur: number }> = {
  breathe: { kf: [{ transform: "scale(0.9)" }, { transform: "scale(1.08)" }, { transform: "scale(0.9)" }], dur: 9000 },
  pulse: { kf: [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], dur: 2200 },
  glow: { kf: [{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], dur: 3800 },
  drift: {
    kf: [
      { transform: "translate3d(-3%,0,0)" },
      { transform: "translate3d(3%,-2%,0)" },
      { transform: "translate3d(-3%,0,0)" },
    ],
    dur: 18000,
  },
};

// Clipped reveals start fully hidden, so they never report as intersecting;
// observe their parent instead.
const CLIPS = new Set(["rise", "wipe", "wipex", "cell", "line"]);

const num = (el: Element, name: string) => +(el.getAttribute(name) ?? "") || 0;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

const seen = new WeakSet<Element>();
const anims = new WeakMap<Element, Animation>();
const proxies = new WeakMap<Element, Element[]>();
let io: IntersectionObserver | null = null;

function delayFor(el: Element) {
  let d = num(el, "data-delay");
  const g = el.parentElement?.closest<El>("[data-stagger]");
  if (g) {
    if (!g.__list) g.__list = [...g.querySelectorAll("[data-reveal]")];
    let i = g.__list.indexOf(el);
    if (i < 0) {
      g.__list = [...g.querySelectorAll("[data-reveal]")];
      i = g.__list.indexOf(el);
    }
    d += num(g, "data-delay") + Math.max(0, i) * (num(g, "data-stagger") || 60);
  }
  return d;
}

function fmt(el: Element, n: number) {
  const dec = num(el, "data-decimals");
  return (
    (el.getAttribute("data-prefix") ?? "") +
    n.toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
    (el.getAttribute("data-suffix") ?? "")
  );
}

function count(el: El) {
  const to = num(el, "data-count");
  const dec = num(el, "data-decimals");
  const dur = num(el, "data-dur") || 2400;
  const t0 = performance.now() + num(el, "data-delay");
  const step = (t: number) => {
    const p = clamp((t - t0) / dur);
    const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    const v = to * e;
    el.textContent = fmt(el, dec ? Math.round(v * 10 ** dec) / 10 ** dec : Math.round(v));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function trigger(el: El) {
  const list = proxies.get(el);
  if (list) {
    proxies.delete(el);
    list.forEach((t) => anims.get(t)?.play());
  }
  anims.get(el)?.play();
  if (el.__count) {
    el.__count = false;
    count(el);
  }
}

function getIO() {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        trigger(en.target as El);
        io!.unobserve(en.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  return io;
}

function observeFor(el: Element, type: string) {
  let target = el;
  if (CLIPS.has(type) && el.parentElement) {
    target = el.parentElement;
    const list = proxies.get(target) ?? [];
    list.push(el);
    proxies.set(target, list);
  }
  getIO().observe(target);
}

// ---- Products sequence -------------------------------------------------------

type Seq = { el: HTMLElement; cur: number | null; panels: HTMLElement[]; bars: HTMLElement[]; labels: HTMLElement[] };
const seqs = new Set<Seq>();
let seqRunning = false;

function seqTarget(s: Seq) {
  const r = s.el.getBoundingClientRect();
  const range = r.height - innerHeight;
  return range > 0 ? clamp(-r.top / range) : 0;
}

function seqApply(s: Seq, t: number) {
  const N = s.panels.length;
  const sv = t * (N - 1);
  const red = reduced();
  s.panels.forEach((p, i) => {
    let local = sv - i;
    if ((i === 0 && local < 0) || (i === N - 1 && local > 0)) local = 0;
    const d = Math.abs(local);
    const vis = red ? (d < 0.5 ? 1 : 0) : clamp(1 - (d - 0.16) / 0.3);
    const x = red ? 0 : 1 - vis;
    const dir = local < 0 ? -x : x;
    p.style.setProperty("--vis", vis.toFixed(3));
    p.style.setProperty("--x", x.toFixed(3));
    p.style.setProperty("--dir", dir.toFixed(3));
    p.style.visibility = vis < 0.002 ? "hidden" : "visible";
    p.style.pointerEvents = vis > 0.5 ? "auto" : "none";
    s.labels[i]?.style.setProperty("--on", vis.toFixed(3));
  });
  s.bars.forEach((b, i) => b.style.setProperty("--fill", clamp(t * N - i).toFixed(3)));
}

function seqTick() {
  let again = false;
  const red = reduced();
  for (const s of seqs) {
    if (!s.el.isConnected) {
      seqs.delete(s);
      continue;
    }
    const target = seqTarget(s);
    s.cur = s.cur == null || red ? target : s.cur + (target - s.cur) * 0.12;
    if (Math.abs(target - s.cur) > 0.0004) again = true;
    else s.cur = target;
    seqApply(s, s.cur);
  }
  seqRunning = again;
  if (again) requestAnimationFrame(seqTick);
}

function kickSeq() {
  if (!seqRunning && seqs.size) {
    seqRunning = true;
    requestAnimationFrame(seqTick);
  }
}

// ---- Scroll-linked transforms -----------------------------------------------

const scrollEls = new Set<HTMLElement>();
let ticking = false;

function onScroll() {
  kickSeq();
  if (ticking || !scrollEls.size) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = innerHeight;
    for (const el of scrollEls) {
      if (!el.isConnected) {
        scrollEls.delete(el);
        continue;
      }
      const r = el.getBoundingClientRect();
      if (el.hasAttribute("data-scrollscale")) {
        const from = num(el, "data-scrollscale") || 0.86;
        const p = clamp((vh - r.top) / (vh * 0.85));
        const e = 1 - Math.pow(1 - p, 3);
        el.style.transform = `scale(${(from + (1 - from) * e).toFixed(4)})`;
        el.style.borderRadius = `${((1 - e) * 28).toFixed(1)}px`;
      }
      if (el.hasAttribute("data-parallax")) {
        const f = num(el, "data-parallax") || 0.1;
        const c = r.top + r.height / 2 - vh / 2;
        el.style.transform = `translate3d(0,${(-c * f).toFixed(1)}px,0)`;
      }
    }
  });
}

// ---- Scan --------------------------------------------------------------------

function scan(root: ParentNode = document) {
  const red = reduced();

  root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (red) return;
    const type = el.getAttribute("data-reveal") || "up";
    const a = el.animate((KF[type] ?? KF.up)(el), {
      duration: num(el, "data-dur") || DUR[type] || 1200,
      delay: delayFor(el),
      easing: EASE,
      fill: "both",
    });
    a.pause();
    // Drop the finished animation so filters and transforms stop holding layers.
    a.onfinish = () => a.cancel();
    anims.set(el, a);
    if (el.getBoundingClientRect().bottom < 0) {
      a.finish();
      return;
    }
    observeFor(el, type);
  });

  root.querySelectorAll<El>("[data-count]").forEach((el) => {
    if (seen.has(el)) return;
    const v = el.getAttribute("data-count");
    if (v === null || v === "" || isNaN(+v)) return;
    seen.add(el);
    if (red) {
      el.textContent = fmt(el, +v);
      return;
    }
    el.textContent = fmt(el, 0);
    el.__count = true;
    getIO().observe(el);
  });

  root.querySelectorAll<HTMLElement>("[data-loop]").forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const loop = LOOPS[el.getAttribute("data-loop") ?? ""];
    if (red || !loop) return;
    el.animate(loop.kf, {
      duration: num(el, "data-dur") || loop.dur,
      iterations: Infinity,
      easing: "ease-in-out",
      delay: num(el, "data-delay"),
    });
  });

  root.querySelectorAll<HTMLElement>("[data-sequence]").forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    seqs.add({
      el,
      cur: null,
      panels: [...el.querySelectorAll<HTMLElement>("[data-seq-panel]")],
      bars: [...el.querySelectorAll<HTMLElement>("[data-seq-bar]")],
      labels: [...el.querySelectorAll<HTMLElement>("[data-seq-label]")],
    });
  });

  root.querySelectorAll<HTMLElement>("[data-scrollscale],[data-parallax]").forEach((el) => {
    if (seen.has(el) || red) return;
    seen.add(el);
    scrollEls.add(el);
  });

  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (red || !matchMedia("(pointer: fine)").matches) return;
    const base = "background-color .3s, color .3s, border-color .3s, opacity .3s";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transition = `transform .3s ${EASE}, ${base}`;
      el.style.transform = `translate3d(${(dx * 0.16).toFixed(1)}px,${(dy * 0.3).toFixed(1)}px,0)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = `transform 1s ${EASE}, ${base}`;
      el.style.transform = "translate3d(0,0,0)";
    });
  });

  onScroll();
}

// ---- Page curtain ------------------------------------------------------------
// The first lift is CSS (see .curtain in global.css) so it covers the very
// first paint. This handles internal navigation and bfcache restores.

function initCurtain() {
  const c = document.querySelector<HTMLElement>(".curtain");
  const line = c?.querySelector<HTMLElement>(".curtain__line");
  if (!c || !line) return;

  const cancelAll = () => {
    c.getAnimations().forEach((a) => a instanceof CSSAnimation || a.cancel());
    line.getAnimations().forEach((a) => a instanceof CSSAnimation || a.cancel());
  };

  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    cancelAll();
    if (reduced()) return;
    line.animate(
      [
        { transform: "scaleX(0)", opacity: 1 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.55 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: 1000, easing: EASE, fill: "both" },
    );
    c.animate([{ clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)" }], {
      duration: 1200,
      delay: 480,
      easing: EASE,
      fill: "both",
    });
  });

  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced()) return;
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-no-curtain")) return;
      let u: URL;
      try {
        u = new URL(a.getAttribute("href")!, location.href);
      } catch {
        return;
      }
      if (u.origin !== location.origin) return;
      // Same page (including hash jumps) and non-page files navigate normally.
      if (u.pathname === location.pathname && u.search === location.search) return;
      if (/\.(?!html?$)[a-z0-9]+$/i.test(u.pathname)) return;
      e.preventDefault();
      cancelAll();
      line.style.opacity = "0";
      const an = c.animate([{ clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }], {
        duration: 750,
        easing: EASE_IN_OUT,
        fill: "both",
      });
      an.onfinish = () => {
        line.style.opacity = "";
        location.href = u.href;
      };
    },
    true,
  );
}

addEventListener("scroll", onScroll, { passive: true, capture: true });
addEventListener("resize", onScroll);

scan();
initCurtain();
document.documentElement.classList.add("motion-ready");
window.DBMotion = { scan, ease: EASE };
