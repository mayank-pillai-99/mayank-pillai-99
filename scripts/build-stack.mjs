// Builds assets/stack.svg: the tech stack as grouped chips with brand logos.
// Logos come from Simple Icons (CC0) and are inlined as paths, so the SVG
// needs no external images when GitHub serves it as an <img>.
// Run: npm run stack

import { mkdirSync, writeFileSync } from "node:fs";
import * as icons from "simple-icons";
import { C, MONO, cutPath, esc, gridPattern } from "./theme.mjs";

const GROUPS = [
  { label: "AI / ML", color: C.neural, items: ["Python", "PyTorch", "Hugging Face", "LangChain", "FAISS", "Gradio"] },
  { label: "FRONTEND", color: C.forge, items: ["TypeScript", "Next.js", "React", "Tailwind CSS", "Redux"] },
  {
    label: "BACKEND & DATA",
    color: C.cyan,
    items: ["Node.js", "Express", "Fastify", "Socket.io", "PostgreSQL", "MongoDB", "Redis", "Prisma"],
  },
  { label: "TOOLING", color: C.ink, items: ["Docker", "GitHub Actions", "Vitest", "Playwright", "Vercel", "Render"] },
];

const byTitle = new Map(
  Object.values(icons)
    .filter((i) => i && i.title && i.path)
    .map((i) => [i.title.toLowerCase(), i])
);

/** Dark brand colours (Next.js, Vercel, Express…) would vanish on the dark panel. */
function visible(hex) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.28 ? C.ink : `#${hex}`;
}

const W = 1200;
const PAD = 32;
const LABEL_W = 186;
const CHIP_H = 34;
const GAP = 8;
const ROW_GAP = 22;
const ICON = 16;
const CHAR_W = 8.1; // monospace 13px with letter-spacing .5

function chip(name, x, y, delay) {
  const icon = byTitle.get(name.toLowerCase());
  const textW = name.length * CHAR_W;
  const w = Math.round(13 + ICON + 9 + textW + 13);
  const glyph = icon
    ? `<path transform="translate(13 ${(CHIP_H - ICON) / 2}) scale(${ICON / 24})" fill="${visible(icon.hex)}" d="${icon.path}"/>`
    : `<rect x="14" y="${(CHIP_H - ICON) / 2}" width="${ICON}" height="${ICON}" fill="${C.line}"/>
       <text x="${14 + ICON / 2}" y="${CHIP_H / 2 + 4}" text-anchor="middle" font-family="${MONO}" font-size="9.5" font-weight="700" fill="${C.ink}">${esc(name.slice(0, 2).toUpperCase())}</text>`;
  const svg = `<g transform="translate(${x} ${y})"><g class="in" style="animation-delay:${delay.toFixed(2)}s">
    <path d="${cutPath(0.5, 0.5, w - 1, CHIP_H - 1, 8)}" fill="${C.panel2}" stroke="${C.line}"/>
    ${glyph}
    <text x="${13 + ICON + 9}" y="${CHIP_H / 2 + 4.5}" font-family="${MONO}" font-size="13" letter-spacing=".5" fill="${C.ink}">${esc(name)}</text>
  </g></g>`;
  return { svg, w };
}

function build() {
  const parts = [];
  let y = 76;
  let n = 0;
  const left = PAD + LABEL_W;
  const right = W - PAD;

  GROUPS.forEach((g, gi) => {
    const rowTop = y;
    let x = left;
    for (const name of g.items) {
      const probe = chip(name, 0, 0, 0);
      if (x + probe.w > right) {
        x = left;
        y += CHIP_H + GAP;
      }
      parts.push(chip(name, x, y, 0.1 + n++ * 0.035).svg);
      x += probe.w + GAP;
    }
    parts.push(`<g transform="translate(${PAD} ${rowTop})"><g class="in" style="animation-delay:${(0.05 + gi * 0.08).toFixed(2)}s">
    <rect x="0" y="${CHIP_H / 2 - 5}" width="10" height="10" fill="${g.color}"/>
    <text x="20" y="${CHIP_H / 2 + 4.5}" font-family="${MONO}" font-size="12.5" font-weight="700" letter-spacing="2.4" fill="${C.ink}">${esc(g.label)}</text>
  </g></g>`);
    y += CHIP_H;
    if (gi < GROUPS.length - 1) {
      parts.push(`<rect x="${PAD}" y="${y + ROW_GAP / 2}" width="${W - PAD * 2}" height="1" fill="${C.line}" opacity=".6"/>`);
      y += ROW_GAP;
    }
  });

  const H = y + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tech stack: ${esc(GROUPS.flatMap((g) => g.items).join(", "))}">
<title>Tech stack</title>
<defs>${gridPattern("grid")}</defs>
<style>
  .in { animation: in .6s cubic-bezier(.22,1,.36,1) both; }
  @keyframes in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
<path d="${cutPath(1, 1, W - 2, H - 2, 18)}" fill="${C.arena}" stroke="${C.line}" stroke-width="2"/>
<path d="${cutPath(1, 1, W - 2, H - 2, 18)}" fill="url(#grid)"/>
<rect x="1" y="1" width="${W - 20}" height="3" fill="${C.forge}"/>
<g font-family="${MONO}" font-size="12" letter-spacing="2.4">
  <polygon points="32,24 96,24 88,44 24,44" fill="${C.forge}"/>
  <text x="38" y="38.5" font-weight="700" fill="${C.arena}">STACK</text>
  <text x="108" y="38.5" fill="${C.dim}">WHAT I BUILD AND SHIP WITH</text>
</g>
${parts.join("\n")}
</svg>
`;
}

mkdirSync("assets", { recursive: true });
writeFileSync("assets/stack.svg", build());
console.log("wrote assets/stack.svg");
