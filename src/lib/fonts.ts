import fs from "node:fs";
import path from "node:path";

// Hyperspace Race is the intended display face, but it is a commercial font.
// Only the licensed webfont is ever served: drop it into
// public/fonts/hyperspace-race/ as hyperspace-race-expanded.woff2 (and
// optionally hyperspace-race-expanded-light.woff2) and the build picks it up.
// Until then the site falls back to Michroma, which is wider than Hyperspace
// Race Expanded, so every layout sized for it also fits the real font.
const DIR = path.join(process.cwd(), "public", "fonts", "hyperspace-race");
const PUBLIC_DIR = "/fonts/hyperspace-race";

type Face = { file: string; weight: number; format: string };

function find(name: string, weight: number): Face | null {
  for (const [ext, format] of [
    ["woff2", "woff2"],
    ["woff", "woff"],
    ["otf", "opentype"],
  ] as const) {
    const file = `${name}.${ext}`;
    if (fs.existsSync(path.join(DIR, file))) return { file, weight, format };
  }
  return null;
}

const faces = [
  find("hyperspace-race-expanded", 400),
  find("hyperspace-race-expanded-light", 300),
].filter((f): f is Face => f !== null);

export const hasHyperspace = faces.some((f) => f.weight === 400);

// The stack is injected from Base rather than declared in CSS, so a copy of the
// font installed locally on a visitor's machine is never picked up by name.
export const displayFontCss = hasHyperspace
  ? faces
      .map(
        (f) =>
          `@font-face{font-family:"Hyperspace Race";font-style:normal;font-weight:${f.weight};font-display:swap;src:url("${PUBLIC_DIR}/${f.file}") format("${f.format}")}`,
      )
      .join("") + `html:root{--font-display:"Hyperspace Race",Michroma,sans-serif}`
  : "";

export const displayFontPreload = hasHyperspace
  ? `${PUBLIC_DIR}/${faces.find((f) => f.weight === 400)!.file}`
  : null;
