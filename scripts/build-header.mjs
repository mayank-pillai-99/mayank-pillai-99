// Builds assets/header.svg and assets/divider.svg.
// Display text is converted to paths so it renders without web fonts
// (GitHub serves README images as <img>, which blocks external fonts).
// Run: npm run header

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import opentype from "opentype.js";
import { C, MONO, hazardPattern, gridPattern } from "./theme.mjs";

const FONT_URL = "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf";
const FONT_PATH = ".cache/Anton-Regular.ttf";

async function loadAnton() {
  if (!existsSync(FONT_PATH)) {
    mkdirSync(".cache", { recursive: true });
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`font download failed: ${res.status}`);
    writeFileSync(FONT_PATH, Buffer.from(await res.arrayBuffer()));
  }
  const buf = await readFile(FONT_PATH);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/** One path per glyph so each letter can animate on its own. */
function glyphs(font, text, x, baseline, size) {
  const out = [];
  let cx = x;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (ch !== " ") out.push({ ch, d: g.getPath(cx, baseline, size).toPathData(2) });
    cx += (g.advanceWidth / font.unitsPerEm) * size;
  }
  return { paths: out, width: cx - x };
}

const W = 1200;
const H = 340;
const PAD = 64;

function header(font) {
  const size = 160;
  const baseline = 240;
  const first = glyphs(font, "MAYANK", PAD, baseline, size);
  const gap = size * 0.22;
  const last = glyphs(font, "PILLAI", PAD + first.width + gap, baseline, size);
  const nameRight = PAD + first.width + gap + last.width;

  let i = 0;
  const letter = (p, fill) =>
    `<path class="rise" style="animation-delay:${(0.15 + i++ * 0.045).toFixed(3)}s" fill="${fill}" d="${p.d}"/>`;

  const tagW = 178;
  const mpX = W - PAD - 92;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Mayank Pillai</title>
<desc id="d">AI Engineer and Full-Stack Developer. Now shipping Codebase Copilot.</desc>
<defs>
  ${gridPattern("grid")}
  ${hazardPattern("hz", C.forge)}
  <clipPath id="nameClip"><rect x="0" y="${baseline - size * 0.92}" width="${W}" height="${size * 0.95}"/></clipPath>
  <linearGradient id="glow" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.forge}" stop-opacity="0.16"/>
    <stop offset="0.55" stop-color="${C.forge}" stop-opacity="0"/>
  </linearGradient>
</defs>
<style>
  .rise { animation: rise .9s cubic-bezier(.22,1,.36,1) both; }
  @keyframes rise { from { transform: translateY(${Math.round(size)}px); } to { transform: none; } }
  .wipe { animation: wipe .6s cubic-bezier(.22,1,.36,1) .05s both; }
  @keyframes wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  .fade { animation: fade .6s ease-out both; }
  @keyframes fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .bar { transform-origin: ${PAD}px 0; animation: bar 1.1s cubic-bezier(.22,1,.36,1) .5s both; }
  @keyframes bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .stripe { animation: stripe 6s linear infinite; }
  @keyframes stripe { to { transform: translateX(-56px); } }
  .pulse { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .2; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
<rect width="${W}" height="${H}" fill="${C.arena}"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>

<g class="stripe"><rect x="0" y="0" width="${W + 56}" height="10" fill="url(#hz)"/></g>
<rect x="0" y="${H - 5}" width="${W}" height="5" fill="url(#hz)"/>

<g class="wipe">
  <polygon points="${PAD + 8},40 ${PAD + tagW},40 ${PAD + tagW - 8},66 ${PAD},66" fill="${C.neural}"/>
  <text x="${PAD + 20}" y="58" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="3.5" fill="${C.arena}">AI ENGINEER</text>
</g>
<text class="fade" style="animation-delay:.25s" x="${PAD + tagW + 18}" y="58" font-family="${MONO}" font-size="15" letter-spacing="3.5" fill="${C.dim}">FULL-STACK DEVELOPER</text>

<g clip-path="url(#nameClip)">
  ${first.paths.map((p) => letter(p, C.ink)).join("\n  ")}
  ${last.paths.map((p) => letter(p, C.forge)).join("\n  ")}
</g>

<rect x="${PAD}" y="${baseline + 22}" width="${nameRight - PAD}" height="2" fill="${C.line}"/>
<rect class="bar" x="${PAD}" y="${baseline + 22}" width="${nameRight - PAD}" height="2" fill="${C.forge}"/>

<g class="fade" style="animation-delay:.9s" font-family="${MONO}" font-size="14" letter-spacing="2.5">
  <circle class="pulse" cx="${PAD + 5}" cy="${baseline + 63}" r="4.5" fill="${C.forge}"/>
  <text x="${PAD + 20}" y="${baseline + 68}" fill="${C.dim}">NOW SHIPPING <tspan fill="${C.ink}" font-weight="700">CODEBASE COPILOT</tspan></text>
  <text x="${W - PAD}" y="${baseline + 68}" text-anchor="end" fill="${C.dim}">LLM SYSTEMS · TEXT-TO-SQL · RAG · NEXT.JS</text>
</g>

<g class="fade" style="animation-delay:.6s">
  <polygon points="${mpX + 10},36 ${mpX + 92},36 ${mpX + 82},80 ${mpX},80" fill="${C.forge}"/>
  ${glyphs(font, "MP", mpX + 17, 74, 46).paths.map((p) => `<path fill="${C.arena}" d="${p.d}"/>`).join("")}
</g>
</svg>
`;
}

function divider() {
  const w = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="24" viewBox="0 0 ${w} 24" aria-hidden="true">
<defs>${hazardPattern("hz", C.forge, 10)}</defs>
<rect x="0" y="9" width="96" height="6" fill="url(#hz)"/>
<rect x="116" y="11.5" width="${w - 150}" height="1" fill="${C.line}"/>
<polygon points="${w - 12},6 ${w - 6},12 ${w - 12},18 ${w - 18},12" fill="${C.forge}"/>
</svg>
`;
}

const font = await loadAnton();
mkdirSync("assets", { recursive: true });
writeFileSync("assets/header.svg", header(font));
writeFileSync("assets/divider.svg", divider());
console.log("wrote assets/header.svg, assets/divider.svg");
