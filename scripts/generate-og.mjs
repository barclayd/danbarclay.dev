#!/usr/bin/env bun
/**
 * Build-time generator for /og.png — the social share card for danbarclay.dev.
 *
 * Renders an SVG composition in the site's amber/charcoal aesthetic and
 * rasterises to a 1200x630 PNG via sharp. Embeds the local avatar as base64
 * so the image is self-contained and reproducible at build time.
 *
 * Outputs:
 *   public/og.png   — Open Graph / Twitter primary image (1200x630)
 *   public/og.jpg   — JPG fallback for picky scrapers
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

const avatarPath = resolve(publicDir, "dan-barclay.webp");
const avatarBuf = readFileSync(avatarPath);

// Resize + duotone the avatar to match the site treatment. Two-tone charcoal->cream.
const avatarTreated = await sharp(avatarBuf)
  .resize(380, 380, { fit: "cover" })
  .greyscale()
  .linear(1.05, -8)
  .modulate({ brightness: 0.95 })
  .tint("#d6c8b0")
  .png()
  .toBuffer();

const avatarB64 = avatarTreated.toString("base64");

const W = 1200;
const H = 630;

// SVG composition. Pure SVG so sharp can rasterise without a browser.
// Colors mirror src/styles/global.css @theme tokens exactly.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14181c"/>
      <stop offset="100%" stop-color="#0e1114"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </radialGradient>
    <linearGradient id="amberSweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8c5e24"/>
      <stop offset="50%" stop-color="#e89a3c"/>
      <stop offset="100%" stop-color="#ffb44c"/>
    </linearGradient>
    <pattern id="scanlines" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="1" fill="rgba(255,255,255,0.018)"/>
    </pattern>
    <clipPath id="avatarClip">
      <rect x="80" y="125" width="380" height="380"/>
    </clipPath>
  </defs>

  <!-- Backdrop -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#scanlines)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- Top amber sweep — the brand's signature 1px scanline -->
  <rect x="0" y="0" width="${W}" height="2" fill="url(#amberSweep)"/>

  <!-- Top system rail -->
  <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" fill="#6a6d72" letter-spacing="3">
    <rect x="60" y="50" width="8" height="8" fill="#e89a3c"/>
    <text x="80" y="58">DANBARCLAY.DEV · TERMINAL/00</text>
    <text x="${W - 60}" y="58" text-anchor="end" fill="#e89a3c">STATUS · NOMINAL</text>
  </g>

  <!-- Avatar with checker frame -->
  <g>
    <!-- checker frame (12px border via two overlapping rects with offset pattern) -->
    <rect x="68" y="113" width="404" height="404" fill="#2b3138"/>
    <rect x="74" y="119" width="392" height="392" fill="#14181c"/>
    <image
      x="80" y="125" width="380" height="380"
      href="data:image/png;base64,${avatarB64}"
      clip-path="url(#avatarClip)"
      preserveAspectRatio="xMidYMid slice"/>
    <!-- subtle amber scan overlay across the avatar -->
    <rect x="80" y="125" width="380" height="380" fill="url(#scanlines)" opacity="0.6"/>
    <!-- corner ticks -->
    <rect x="80" y="125" width="10" height="10" fill="#e89a3c"/>
    <rect x="450" y="125" width="10" height="10" fill="#e89a3c"/>
    <rect x="80" y="495" width="10" height="10" fill="#e89a3c"/>
    <rect x="450" y="495" width="10" height="10" fill="#e89a3c"/>
  </g>

  <!-- Right-hand text block -->
  <g>
    <!-- profile label -->
    <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" fill="#6a6d72" letter-spacing="3">
      <rect x="520" y="135" width="28" height="2" fill="#e89a3c"/>
      <text x="560" y="142">PROFILE · ONLINE</text>
    </g>

    <!-- Big name -->
    <text
      x="520" y="240"
      font-family="Chakra Petch, system-ui, sans-serif"
      font-size="116" font-weight="600"
      fill="#ecedee" letter-spacing="-2">DAN</text>
    <text
      x="520" y="356"
      font-family="Chakra Petch, system-ui, sans-serif"
      font-size="116" font-weight="600"
      fill="#ecedee" letter-spacing="-2">BARCLAY</text>

    <!-- Role line -->
    <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="18" fill="#d6d8da" letter-spacing="3.5">
      <text x="520" y="412">ENGINEERING LEAD</text>
      <text x="800" y="412" fill="#2b3138">/</text>
      <text x="820" y="412">FOUNDER</text>
      <text x="990" y="412" fill="#2b3138">/</text>
      <text x="1010" y="412">LONDON</text>
    </g>

    <!-- Tagline -->
    <text
      x="520" y="468"
      font-family="Chakra Petch, system-ui, sans-serif"
      font-size="24" font-weight="400"
      fill="#6a6d72">Building Promptly and KeepFresh.</text>
    <text
      x="520" y="500"
      font-family="Chakra Petch, system-ui, sans-serif"
      font-size="24" font-weight="400"
      fill="#6a6d72">A decade of product engineering.</text>
  </g>

  <!-- Bottom rail -->
  <line x1="60" y1="555" x2="${W - 60}" y2="555" stroke="#1f2429" stroke-width="1"/>
  <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" fill="#6a6d72" letter-spacing="3">
    <rect x="60" y="582" width="8" height="8" fill="#e89a3c"/>
    <text x="80" y="590">LIVE</text>
    <text x="180" y="590">LAT 51.5074°N · LON 0.1278°W</text>
    <text x="${W - 60}" y="590" text-anchor="end" fill="#d6d8da">DANBARCLAY.DEV</text>
  </g>
</svg>`;

const pngBuf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(resolve(publicDir, "og.png"), pngBuf);

const jpgBuf = await sharp(Buffer.from(svg)).jpeg({ quality: 88, progressive: true }).toBuffer();
writeFileSync(resolve(publicDir, "og.jpg"), jpgBuf);

console.log(`[og] wrote public/og.png (${pngBuf.length} bytes) and public/og.jpg (${jpgBuf.length} bytes)`);
