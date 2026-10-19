// Anton display font, converted to SVG paths at build time.
// GitHub serves README images as <img>, which can't load web fonts.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import opentype from "opentype.js";

const FONT_URL = "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf";
const FONT_PATH = ".cache/Anton-Regular.ttf";

export async function loadAnton() {
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
export function glyphs(font, text, x, baseline, size) {
  const paths = [];
  let cx = x;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (ch !== " ") paths.push({ ch, d: g.getPath(cx, baseline, size).toPathData(2) });
    cx += (g.advanceWidth / font.unitsPerEm) * size;
  }
  return { paths, width: cx - x };
}

/** Whole string as a single path element. */
export function textPath(font, text, x, baseline, size, fill) {
  return `<path fill="${fill}" d="${font.getPath(text, x, baseline, size).toPathData(2)}"/>`;
}

export const measure = (font, text, size) => font.getAdvanceWidth(text, size);
