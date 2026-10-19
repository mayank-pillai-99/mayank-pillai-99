// Shared palette and SVG helpers, matching mayank-pillai.vercel.app.

export const C = {
  arena: "#0b0b0f",
  panel: "#15151c",
  panel2: "#1d1d27",
  line: "#2c2c3a",
  ink: "#f2f0e9",
  dim: "#a3a1b0",
  neural: "#ff2e63",
  forge: "#ffd400",
  cyan: "#00e5ff",
};

export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
export const SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";

/** 45° yellow/black hazard stripes. */
export function hazardPattern(id, color, size = 14) {
  return `<pattern id="${id}" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="${size * 2}" height="${size * 2}" fill="${C.arena}"/><rect width="${size}" height="${size * 2}" fill="${color}"/>
  </pattern>`;
}

/** Faint 48px grid, same as the site's .arena-grid. */
export function gridPattern(id) {
  return `<pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse">
    <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.045"/>
  </pattern>`;
}

/** Card outline with the site's cut corners (top-right and bottom-left). */
export function cutPath(x, y, w, h, c = 18) {
  return `M${x} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h}H${x + c}L${x} ${y + h - c}Z`;
}

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
