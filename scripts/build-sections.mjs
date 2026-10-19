// Builds the themed README sections:
//   assets/about.svg            the intro panel
//   assets/project-<slug>.svg   one card per featured project (screenshot embedded)
// Run: npm run sections

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadAnton, measure, textPath } from "./font.mjs";
import { C, MONO, cutPath, esc, gridPattern } from "./theme.mjs";

// ---------- content ----------

const ABOUT = {
  headline: [
    [{ t: "I BUILD LLM-POWERED SYSTEMS", c: C.ink }],
    [
      { t: "AND ", c: C.ink },
      { t: "FULL-STACK PRODUCTS THAT SHIP.", c: C.forge },
    ],
  ],
  sub: "B.TECH ARTIFICIAL INTELLIGENCE · NEWTON SCHOOL OF TECHNOLOGY · 2024–28",
  rows: [
    {
      tag: "BITS PILANI '26",
      color: C.neural,
      text: "Built an offline, multilingual voice-and-text → PostGIS SQL search engine. Qwen2.5-Coder-7B hit a 78% zero-shot pass rate on my 186-query benchmark.",
    },
    {
      tag: "BUILDING",
      color: C.forge,
      text: "Codebase Copilot: ask any TS/JS repo a question, get answers cited to the file and line.",
    },
    { tag: "LOOKING FOR", color: C.cyan, text: "AI engineering and full-stack internships." },
  ],
  stats: [
    { v: "9.45", l: "CGPA" },
    { v: "78%", l: "ZERO-SHOT TEXT-TO-SQL" },
    { v: "200+", l: "TESTS ON HITBOX" },
    { v: "160+", l: "LEETCODE SOLVED" },
  ],
};

export const PROJECTS = [
  {
    slug: "copilot",
    name: "Codebase Copilot",
    kicker: "FULL-STACK · AI",
    date: "SEP 2026",
    color: C.forge,
    image: "copilot-landing.webp",
    fit: "cover",
    impact: "Parses a repo into a code graph and answers questions with hybrid retrieval (pgvector + full-text, RRF) and cited sources.",
    stack: ["TypeScript", "Next.js", "Fastify", "pgvector", "Redis", "BullMQ", "tree-sitter"],
    live: true,
  },
  {
    slug: "hitbox",
    name: "Hitbox",
    kicker: "FULL-STACK",
    date: "DEC 2025",
    color: C.forge,
    image: "hitbox-home.webp",
    fit: "cover",
    impact: "Social platform for gamers with explainable recommendations. 200+ tests, zero WCAG 2.1 AA violations.",
    stack: ["Next.js", "Express", "MongoDB", "zod", "Vitest"],
    live: true,
  },
  {
    slug: "spatial",
    name: "Spatial Search",
    kicker: "AI · BITS PILANI",
    date: "JUL 2026",
    color: C.neural,
    image: "spatial.webp",
    fit: "contain",
    impact: "Offline multilingual voice/text → PostGIS SQL via an LLM intent router with a RAG fallback. 78% zero-shot.",
    stack: ["Python", "PostGIS", "LangChain", "FAISS", "SeamlessM4T"],
    live: false,
  },
  {
    slug: "bookconnect",
    name: "BookConnect",
    kicker: "FULL-STACK",
    date: "OCT 2025",
    color: C.cyan,
    image: "bookconnect.webp",
    fit: "cover",
    impact: "Real-time social network for readers with instant messaging and a discovery feed.",
    stack: ["MongoDB", "Express", "React", "Node.js", "Socket.io"],
    live: true,
  },
];

// ---------- helpers ----------

const MONO_W = 0.61; // monospace advance per font-size unit

function wrap(text, size, maxW) {
  const perLine = Math.floor(maxW / (size * MONO_W));
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function monoLines(lines, x, y, size, lh, fill) {
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * lh}" font-family="${MONO}" font-size="${size}" fill="${fill}">${esc(l)}</text>`)
    .join("\n");
}

const CSS = `<style>
  .in { animation: in .7s cubic-bezier(.22,1,.36,1) both; }
  @keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .wipe { animation: wipe .6s cubic-bezier(.22,1,.36,1) both; }
  @keyframes wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  .pulse { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>`;

function shell(w, h, accent, kicker, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs>${gridPattern("grid")}</defs>
${CSS}
<path d="${cutPath(1, 1, w - 2, h - 2, 18)}" fill="${C.arena}" stroke="${C.line}" stroke-width="2"/>
<path d="${cutPath(1, 1, w - 2, h - 2, 18)}" fill="url(#grid)"/>
<rect x="1" y="1" width="${w - 20}" height="3" fill="${accent}"/>
${kicker}
${body}
</svg>
`;
}

function kickerTag(x, y, tag, text, color) {
  const tw = tag.length * (12 * MONO_W + 2.4) + 26;
  return `<g class="wipe" font-family="${MONO}" font-size="12" letter-spacing="2.4">
  <polygon points="${x + 8},${y} ${x + tw},${y} ${x + tw - 8},${y + 20} ${x},${y + 20}" fill="${color}"/>
  <text x="${x + 14}" y="${y + 14.5}" font-weight="700" fill="${C.arena}">${esc(tag)}</text>
  ${text ? `<text x="${x + tw + 12}" y="${y + 14.5}" fill="${C.dim}">${esc(text)}</text>` : ""}
</g>`;
}

// ---------- about ----------

function about(font) {
  const W = 860;
  const PAD = 32;
  const parts = [];
  let y = 104;
  const H1 = 44;

  ABOUT.headline.forEach((line, li) => {
    let x = PAD;
    const segs = line.map((s) => {
      const p = textPath(font, s.t, x, y, H1, s.c);
      x += measure(font, s.t, H1);
      return p;
    });
    parts.push(`<g class="in" style="animation-delay:${(0.1 + li * 0.1).toFixed(2)}s">${segs.join("")}</g>`);
    y += H1 * 1.08;
  });

  parts.push(`<text class="in" style="animation-delay:.3s" x="${PAD}" y="${y + 2}" font-family="${MONO}" font-size="11.5" letter-spacing="1.6" fill="${C.dim}">${esc(ABOUT.sub)}</text>`);
  y += 26;
  parts.push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="1" fill="${C.line}"/>`);
  y += 30;

  const TAG_W = 150;
  const textX = PAD + TAG_W + 18;
  ABOUT.rows.forEach((r, i) => {
    const lines = wrap(r.text, 13.5, W - PAD - textX);
    parts.push(`<g class="in" style="animation-delay:${(0.4 + i * 0.1).toFixed(2)}s">
  <polygon points="${PAD + 7},${y - 15} ${PAD + TAG_W},${y - 15} ${PAD + TAG_W - 7},${y + 5} ${PAD},${y + 5}" fill="${r.color}"/>
  <text x="${PAD + 14}" y="${y - 0.5}" font-family="${MONO}" font-size="11" font-weight="700" letter-spacing="1.8" fill="${C.arena}">${esc(r.tag)}</text>
  ${monoLines(lines, textX, y, 13.5, 21, C.ink)}
</g>`);
    y += lines.length * 21 + 16;
  });

  y += 6;
  parts.push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="1" fill="${C.line}"/>`);
  y += 18;

  const cellW = (W - PAD * 2) / ABOUT.stats.length;
  ABOUT.stats.forEach((s, i) => {
    const x = PAD + i * cellW;
    parts.push(`<g class="in" style="animation-delay:${(0.75 + i * 0.07).toFixed(2)}s">
  ${textPath(font, s.v, x, y + 36, 38, i === 1 ? C.forge : C.ink)}
  <text x="${x}" y="${y + 56}" font-family="${MONO}" font-size="10.5" letter-spacing="1.8" fill="${C.dim}">${esc(s.l)}</text>
</g>`);
  });
  y += 80;

  return shell(W, y, C.forge, kickerTag(PAD, 24, "ABOUT", "WHO I AM", C.forge), parts.join("\n"),
    "About Mayank: builds LLM-powered systems and full-stack products. BITS Pilani 2026 intern, building Codebase Copilot, looking for AI engineering and full-stack internships.");
}

// ---------- project cards ----------

const CARD_W = 420;
const THUMB = { x: 16, y: 40, w: 388, h: 196 };

function cardLayout(p) {
  const impact = wrap(p.impact, 12.5, CARD_W - 32);
  // Stack chips flow onto as many lines as needed
  const chips = [];
  let x = 16;
  let row = 0;
  for (const s of p.stack) {
    const w = s.length * 11 * MONO_W + 16;
    if (x + w > CARD_W - 16) {
      x = 16;
      row++;
    }
    chips.push({ s, x, row, w });
    x += w + 6;
  }
  return { impact, chips, rows: row + 1 };
}

function cardHeight(p) {
  const l = cardLayout(p);
  return THUMB.y + THUMB.h + 30 + 44 + l.impact.length * 19 + 12 + l.rows * 28 + 66;
}

function card(font, p, index, H) {
  const l = cardLayout(p);
  const img = readFileSync(`assets/src/${p.image}`).toString("base64");
  const parts = [];

  parts.push(`<clipPath id="thumb"><rect x="${THUMB.x}" y="${THUMB.y}" width="${THUMB.w}" height="${THUMB.h}"/></clipPath>`);
  parts.push(`<g class="in">
  <rect x="${THUMB.x}" y="${THUMB.y}" width="${THUMB.w}" height="${THUMB.h}" fill="${p.fit === "contain" ? "#ffffff" : C.panel2}"/>
  <image clip-path="url(#thumb)" x="${THUMB.x + (p.fit === "contain" ? 8 : 0)}" y="${THUMB.y + (p.fit === "contain" ? 8 : 0)}" width="${THUMB.w - (p.fit === "contain" ? 16 : 0)}" height="${THUMB.h - (p.fit === "contain" ? 16 : 0)}" preserveAspectRatio="${p.fit === "contain" ? "xMidYMid meet" : "xMidYMin slice"}" href="data:image/webp;base64,${img}" xlink:href="data:image/webp;base64,${img}"/>
  <rect x="${THUMB.x}" y="${THUMB.y + THUMB.h - 2}" width="${THUMB.w}" height="2" fill="${p.color}"/>
</g>`);

  let y = THUMB.y + THUMB.h + 30;
  parts.push(`<g class="in" style="animation-delay:.1s" font-family="${MONO}" font-size="11" letter-spacing="2">
  <text x="16" y="${y}" fill="${p.color}" font-weight="700">${esc(p.kicker)}</text>
  <text x="${CARD_W - 16}" y="${y}" text-anchor="end" fill="${C.dim}">${esc(p.date)}</text>
</g>`);
  y += 40;
  parts.push(`<g class="in" style="animation-delay:.15s">${textPath(font, p.name.toUpperCase(), 16, y, 32, C.ink)}</g>`);
  y += 26;
  parts.push(`<g class="in" style="animation-delay:.2s">${monoLines(l.impact, 16, y, 12.5, 19, C.dim)}</g>`);
  y += (l.impact.length - 1) * 19 + 22;

  parts.push(
    `<g class="in" style="animation-delay:.25s">` +
      l.chips
        .map(
          (c) => `<g transform="translate(${c.x.toFixed(1)} ${y + c.row * 28})">
    <rect width="${c.w.toFixed(1)}" height="22" fill="${C.panel2}" stroke="${C.line}"/>
    <text x="8" y="15" font-family="${MONO}" font-size="11" fill="${C.ink}">${esc(c.s)}</text>
  </g>`
        )
        .join("\n") +
      `</g>`
  );

  const footY = H - 22;
  parts.push(`<rect x="16" y="${footY - 22}" width="${CARD_W - 32}" height="1" fill="${C.line}"/>`);
  parts.push(`<g font-family="${MONO}" font-size="11.5" letter-spacing="2">
  ${
    p.live
      ? `<circle class="pulse" cx="21" cy="${footY - 4}" r="3.5" fill="${p.color}"/><text x="32" y="${footY}" fill="${C.ink}" font-weight="700">LIVE DEMO ↗</text>`
      : `<text x="16" y="${footY}" fill="${C.ink}" font-weight="700">SOURCE ↗</text>`
  }
  <text x="${CARD_W - 16}" y="${footY}" text-anchor="end" fill="${C.dim}">${String(index).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}</text>
</g>`);

  const tag = kickerTag(16, 12, "FEATURED", "", p.color);
  return shell(CARD_W, H, p.color, tag, parts.join("\n"), `${p.name}: ${p.impact} Stack: ${p.stack.join(", ")}.`);
}

// ---------- main ----------

const font = await loadAnton();
mkdirSync("assets", { recursive: true });
writeFileSync("assets/about.svg", about(font));
const H = Math.max(...PROJECTS.map(cardHeight));
PROJECTS.forEach((p, i) => writeFileSync(`assets/project-${p.slug}.svg`, card(font, p, i + 1, H)));
console.log(`wrote assets/about.svg and ${PROJECTS.length} project cards (${H}px tall)`);
