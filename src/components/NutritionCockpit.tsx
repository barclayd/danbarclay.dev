import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bike,
  Coffee,
  Dumbbell,
  Minus,
  Mountain,
  Plus,
  type LucideIcon,
} from "lucide-react";

/* ---------------------------------- data ---------------------------------- */

type PhaseId = "reverse" | "maintain" | "bulk";
type DayId = "rest" | "gym" | "short" | "long";

type Phase = { id: PhaseId; name: string; sub: string; tag: string };
type Day = {
  id: DayId;
  name: string;
  sub: string;
  off: number;
  p: number;
  f: number;
  Icon: LucideIcon;
};

const PHASES: Phase[] = [
  { id: "reverse",  name: "Reverse",            sub: "Now → late June", tag: "Find maintenance" },
  { id: "maintain", name: "Maintain & Perform", sub: "Jul → mid-Oct",   tag: "Hold ~71kg · ride well" },
  { id: "bulk",     name: "Lean Bulk",          sub: "Nov → Feb",       tag: "Build in the gym" },
];

const DAYS: Day[] = [
  { id: "rest",  name: "Rest / Commute", sub: "",        off: 0,   p: 145, f: 80, Icon: Coffee },
  { id: "gym",   name: "Gym",            sub: "",        off: 75,  p: 150, f: 80, Icon: Dumbbell },
  { id: "short", name: "Short Ride",     sub: "< 2 hrs", off: 400, p: 150, f: 82, Icon: Bike },
  { id: "long",  name: "Long Ride",      sub: "3 hrs +", off: 850, p: 155, f: 88, Icon: Mountain },
];

const BODY_KG = 71;

const STORAGE_KEY = "cockpit-v1";

const defaultPhase = (): PhaseId => {
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 5) return "reverse";
  if (m >= 6 && (m < 9 || (m === 9 && day <= 15))) return "maintain";
  if (m >= 10 || m <= 1) return "bulk";
  return "maintain";
};

const GUIDANCE: Record<PhaseId, string> = {
  reverse:  "Climbing ~125 kcal/week off your 2,050 cut base. Keep stepping up until your 7-day average weight holds flat — that week's number is your true maintenance. A flat-feeling gym session means you're still under it.",
  maintain: "Parked at maintenance. Periodise carbs to ride volume, hold protein. With 4 lifts/week and good leanness, slow recomp is on the table — muscle up, fat down, scale roughly still.",
  bulk:     "+300 over maintenance for muscle. Aim for ~0.25 kg/week on the 7-day average; faster is mostly fat. The extra fuel rides on carbs for the 5–6 gym sessions. Recheck every 2–3 weeks.",
};

/* --------------------------------- styles --------------------------------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap');

.cpk *{box-sizing:border-box;margin:0;padding:0;}
.cpk{
  --bg:#0c0d0f; --panel:#15171b; --panel2:#1c1f25; --line:#2a2e36;
  --ink:#f2f0ea; --mut:#868d97; --dim:#5a606a;
  --carb:#c8f135; --pro:#ff5d5b; --fat:#ffc24b;
  font-family:'Archivo',sans-serif;
  background:var(--bg); color:var(--ink);
  min-height:100vh; width:100%;
  padding:22px 16px 40px;
  position:relative; overflow:hidden;
}
.cpk::before{
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(60% 50% at 80% -5%, rgba(200,241,53,.10), transparent 70%),
    radial-gradient(50% 40% at -10% 110%, rgba(255,93,91,.07), transparent 70%);
}
.cpk::after{
  content:""; position:absolute; inset:0; pointer-events:none; opacity:.5;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:38px 38px; -webkit-mask-image:radial-gradient(120% 80% at 50% 0%,#000 30%,transparent 75%);
          mask-image:radial-gradient(120% 80% at 50% 0%,#000 30%,transparent 75%); opacity:.06;
}
.cpk .wrap{position:relative; max-width:520px; margin:0 auto; z-index:1;}
.cpk .fade{opacity:0; transform:translateY(10px); animation:rise .6s cubic-bezier(.2,.7,.2,1) forwards;}
@keyframes rise{to{opacity:1; transform:none;}}

.cpk .topline{display:flex; align-items:center; gap:8px; font:700 11px/1 'JetBrains Mono'; letter-spacing:.18em; color:var(--mut); text-transform:uppercase;}
.cpk .dot{width:7px; height:7px; border-radius:50%; background:var(--carb); box-shadow:0 0 10px var(--carb); animation:pulse 2.4s ease-in-out infinite;}
@keyframes pulse{50%{opacity:.35;}}
.cpk h1{font-family:'Archivo'; font-weight:900; font-size:34px; line-height:.95; letter-spacing:-.02em; margin:12px 0 2px;}
.cpk h1 em{font-style:normal; color:var(--carb);}
.cpk .date{font:500 12px/1 'JetBrains Mono'; color:var(--dim); letter-spacing:.04em;}

.cpk .label{font:700 10px/1 'JetBrains Mono'; letter-spacing:.2em; color:var(--mut); text-transform:uppercase; margin:26px 2px 10px; display:flex; align-items:center; gap:7px;}
.cpk .label .ln{flex:1; height:1px; background:var(--line);}

.cpk .phases{display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;}
.cpk .ph{background:var(--panel); border:1px solid var(--line); border-radius:13px; padding:13px 11px; text-align:left; cursor:pointer; transition:.22s; position:relative; overflow:hidden;}
.cpk .ph:hover{border-color:#3a404a;}
.cpk .ph .pn{font-weight:800; font-size:14px; letter-spacing:-.01em; line-height:1.05;}
.cpk .ph .ps{font:500 10px/1.3 'JetBrains Mono'; color:var(--mut); margin-top:5px;}
.cpk .ph.on{background:var(--panel2); border-color:var(--carb); box-shadow:0 0 0 1px var(--carb), 0 8px 24px -12px rgba(200,241,53,.5);}
.cpk .ph.on .pn{color:var(--carb);}
.cpk .ph .bar{position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--carb); transform:scaleY(0); transition:.25s; transform-origin:top;}
.cpk .ph.on .bar{transform:scaleY(1);}

.cpk .days{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.cpk .day{display:flex; align-items:center; gap:10px; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:12px; cursor:pointer; transition:.2s;}
.cpk .day:hover{border-color:#3a404a;}
.cpk .day .ic{width:34px; height:34px; flex:none; border-radius:9px; display:grid; place-items:center; background:var(--panel2); color:var(--mut); transition:.2s;}
.cpk .day .dn{font-weight:700; font-size:13px; line-height:1.05;}
.cpk .day .ds{font:500 9px/1 'JetBrains Mono'; color:var(--dim); margin-top:3px; letter-spacing:.05em;}
.cpk .day.on{background:var(--panel2); border-color:var(--ink);}
.cpk .day.on .ic{background:var(--carb); color:#101200;}

.cpk .readout{margin-top:26px; background:linear-gradient(180deg,var(--panel2),var(--panel)); border:1px solid var(--line); border-radius:20px; padding:22px; position:relative; overflow:hidden;}
.cpk .readout .ph-tag{position:absolute; top:16px; right:18px; font:700 9px/1 'JetBrains Mono'; letter-spacing:.16em; text-transform:uppercase; color:var(--carb); border:1px solid rgba(200,241,53,.4); border-radius:999px; padding:5px 9px;}
.cpk .kcal-l{font:700 10px/1 'JetBrains Mono'; letter-spacing:.2em; color:var(--mut); text-transform:uppercase;}
.cpk .kcal{font-family:'JetBrains Mono'; font-weight:800; font-size:62px; line-height:.9; letter-spacing:-.03em; margin:6px 0 2px;}
.cpk .kcal small{font-size:18px; color:var(--dim); font-weight:500; letter-spacing:0; margin-left:4px;}
.cpk .ppk{font:500 11px/1 'JetBrains Mono'; color:var(--mut);}
.cpk .ppk b{color:var(--ink); font-weight:700;}

.cpk .mbar{display:flex; height:11px; border-radius:6px; overflow:hidden; margin:20px 0 16px; background:#0c0d0f; border:1px solid var(--line);}
.cpk .mbar span{height:100%; transition:width .35s cubic-bezier(.3,.8,.3,1);}

.cpk .macros{display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;}
.cpk .macro{background:var(--bg); border:1px solid var(--line); border-radius:13px; padding:13px 12px;}
.cpk .macro .mt{display:flex; align-items:center; gap:6px; font:700 10px/1 'JetBrains Mono'; letter-spacing:.1em; text-transform:uppercase; color:var(--mut);}
.cpk .macro .sw{width:9px; height:9px; border-radius:3px;}
.cpk .macro .mg{font-family:'JetBrains Mono'; font-weight:800; font-size:27px; line-height:1; margin-top:9px; letter-spacing:-.02em;}
.cpk .macro .mg i{font-style:normal; font-size:13px; color:var(--dim); font-weight:500;}
.cpk .macro .mk{font:500 10px/1 'JetBrains Mono'; color:var(--dim); margin-top:5px;}

.cpk .stepper{display:flex; align-items:center; justify-content:space-between; background:var(--panel); border:1px solid var(--line); border-radius:13px; padding:11px 13px; margin-top:10px;}
.cpk .stepper.off{opacity:.4; pointer-events:none;}
.cpk .stepper .sl{font:600 11px/1.3 'JetBrains Mono'; color:var(--mut); letter-spacing:.04em;}
.cpk .stepper .sl b{display:block; color:var(--ink); font-weight:700; font-size:12px; margin-bottom:2px; letter-spacing:.1em; text-transform:uppercase;}
.cpk .ctrls{display:flex; align-items:center; gap:10px;}
.cpk .sb{width:34px; height:34px; border-radius:9px; border:1px solid var(--line); background:var(--panel2); color:var(--ink); display:grid; place-items:center; cursor:pointer; transition:.15s;}
.cpk .sb:hover{border-color:var(--carb); color:var(--carb);}
.cpk .sv{font-family:'JetBrains Mono'; font-weight:800; font-size:18px; min-width:78px; text-align:center;}
.cpk .sv i{font-style:normal; font-size:11px; color:var(--dim); font-weight:500;}

.cpk .note{margin-top:16px; background:var(--panel); border:1px solid var(--line); border-left:3px solid var(--carb); border-radius:11px; padding:13px 14px; font-size:13px; line-height:1.5; color:#cfd3d9;}
.cpk .fuel{margin-top:10px; background:rgba(255,194,75,.07); border:1px solid rgba(255,194,75,.3); border-radius:11px; padding:12px 14px; font-size:12.5px; line-height:1.45; color:#f0d79a; display:flex; gap:9px;}
.cpk .fuel b{color:var(--fat);}
.cpk .foot{margin-top:22px; text-align:center; font:500 10px/1.5 'JetBrains Mono'; color:var(--dim); letter-spacing:.03em;}
`;

/* ------------------------------- component -------------------------------- */

const NutritionCockpit = () => {
  const [phase, setPhase] = useState<PhaseId>(defaultPhase());
  const [dayId, setDayId] = useState<DayId>("rest");
  const [week, setWeek] = useState(1);
  const [maint, setMaint] = useState(2500);
  const [loaded, setLoaded] = useState(false);

  // load persisted calibration
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.maint === "number") setMaint(s.maint);
        if (typeof s.week === "number") setWeek(s.week);
      }
    } catch {
      /* fall back to defaults */
    }
    setLoaded(true);
  }, []);

  // persist calibration
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ maint, week }));
    } catch {
      /* ignore */
    }
  }, [maint, week, loaded]);

  const day = DAYS.find((d) => d.id === dayId) ?? DAYS[0];

  const { total, protein, fat, carbs, pK, fK, cK } = useMemo(() => {
    const baseline = phase === "reverse" ? 2050 + 125 * week : phase === "maintain" ? maint : maint + 300;
    const total = baseline + day.off;
    const protein = day.p + (phase === "bulk" ? 5 : 0);
    const fat = day.f + (phase === "bulk" ? 8 : 0);
    const carbs = Math.max(0, Math.round((total - protein * 4 - fat * 9) / 4));
    return { total, protein, fat, carbs, pK: protein * 4, fK: fat * 9, cK: carbs * 4 };
  }, [phase, week, maint, day]);

  const sum = pK + fK + cK || 1;
  const phaseObj = PHASES.find((p) => p.id === phase) ?? PHASES[0];
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const isRide = dayId === "short" || dayId === "long";

  return (
    <div className="cpk">
      <style>{css}</style>
      <div className="wrap">
        <div className="fade" style={{ animationDelay: ".02s" }}>
          <div className="topline"><span className="dot" /> Fuel Cockpit · 71kg</div>
          <h1>FUEL <em>PLAN</em></h1>
          <div className="date">{dateStr}</div>
        </div>

        <div className="fade" style={{ animationDelay: ".08s" }}>
          <div className="label">Phase <span className="ln" /></div>
          <div className="phases">
            {PHASES.map((p) => (
              <div key={p.id} className={`ph${phase === p.id ? " on" : ""}`} onClick={() => setPhase(p.id)}>
                <span className="bar" />
                <div className="pn">{p.name}</div>
                <div className="ps">{p.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fade" style={{ animationDelay: ".14s" }}>
          <div className={`stepper${phase !== "reverse" ? " off" : ""}`}>
            <div className="sl"><b>Reverse Week</b>{phase === "reverse" ? "Step up once the 7-day avg flattens" : "Only in the reverse phase"}</div>
            <div className="ctrls">
              <button className="sb" onClick={() => setWeek((w) => Math.max(1, w - 1))}><Minus size={16} /></button>
              <div className="sv">W{week}</div>
              <button className="sb" onClick={() => setWeek((w) => Math.min(10, w + 1))}><Plus size={16} /></button>
            </div>
          </div>

          <div className={`stepper${phase === "reverse" ? " off" : ""}`}>
            <div className="sl"><b>Rest-day Maintenance</b>Calibrate from your scale trend</div>
            <div className="ctrls">
              <button className="sb" onClick={() => setMaint((m) => Math.max(1800, m - 50))}><Minus size={16} /></button>
              <div className="sv">{maint}<i> kcal</i></div>
              <button className="sb" onClick={() => setMaint((m) => Math.min(3500, m + 50))}><Plus size={16} /></button>
            </div>
          </div>
        </div>

        <div className="fade" style={{ animationDelay: ".2s" }}>
          <div className="label">Day Type <span className="ln" /></div>
          <div className="days">
            {DAYS.map((d) => (
              <div key={d.id} className={`day${dayId === d.id ? " on" : ""}`} onClick={() => setDayId(d.id)}>
                <div className="ic"><d.Icon size={18} /></div>
                <div>
                  <div className="dn">{d.name}</div>
                  {d.sub && <div className="ds">{d.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fade readout" style={{ animationDelay: ".26s" }}>
          <div className="ph-tag">{phaseObj.tag}</div>
          <div className="kcal-l">Daily Target</div>
          <div className="kcal">{total.toLocaleString()}<small>kcal</small></div>
          <div className="ppk">Protein <b>{(protein / BODY_KG).toFixed(2)} g/kg</b> · carbs flex to fuel the work</div>

          <div className="mbar">
            <span style={{ width: `${(pK / sum) * 100}%`, background: "var(--pro)" }} />
            <span style={{ width: `${(cK / sum) * 100}%`, background: "var(--carb)" }} />
            <span style={{ width: `${(fK / sum) * 100}%`, background: "var(--fat)" }} />
          </div>

          <div className="macros">
            <div className="macro">
              <div className="mt"><span className="sw" style={{ background: "var(--pro)" }} /> Protein</div>
              <div className="mg">{protein}<i> g</i></div>
              <div className="mk">{Math.round(pK)} kcal</div>
            </div>
            <div className="macro">
              <div className="mt"><span className="sw" style={{ background: "var(--carb)" }} /> Carbs</div>
              <div className="mg">{carbs}<i> g</i></div>
              <div className="mk">{Math.round(cK)} kcal</div>
            </div>
            <div className="macro">
              <div className="mt"><span className="sw" style={{ background: "var(--fat)" }} /> Fat</div>
              <div className="mg">{fat}<i> g</i></div>
              <div className="mk">{Math.round(fK)} kcal</div>
            </div>
          </div>
        </div>

        <div className="fade" style={{ animationDelay: ".32s" }}>
          <div className="note">{GUIDANCE[phase]}</div>
          {isRide && (
            <div className="fuel">
              <Activity size={16} style={{ flex: "none", marginTop: 1 }} />
              <div><b>On the bike:</b> 60–90 g carbs / hour — this is on top of the totals above and is the biggest lever on a long day.</div>
            </div>
          )}
        </div>

        <div className="fade foot" style={{ animationDelay: ".38s" }}>
          Protein &amp; fat are floors · carbs fill the rest · calibration saved automatically
        </div>
      </div>
    </div>
  );
};

export default NutritionCockpit;
