// Draws the profile stats cards from the GitHub GraphQL API.
// No third-party card servers: the workflow runs this and commits the SVGs.
// Env: GITHUB_TOKEN (or GH_TOKEN / STATS_TOKEN), optional STATS_USER.
// Run: npm run cards

import { mkdirSync, writeFileSync } from "node:fs";
import { C, MONO, SANS, cutPath, esc, gridPattern } from "./theme.mjs";

const USER = process.env.STATS_USER || "mayank-pillai-99";
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("Set GITHUB_TOKEN (or GH_TOKEN / STATS_TOKEN).");
  process.exit(1);
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    name
    createdAt
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, privacy: PUBLIC) {
      totalCount
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function fetchUser() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-cards" },
    body: JSON.stringify({ query: QUERY, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors || !json.data?.user) {
    throw new Error(`GitHub API error: ${res.status} ${JSON.stringify(json.errors ?? json.message ?? "")}`);
  }
  return json.data.user;
}

// ---------- numbers ----------

function streaks(days) {
  // Today may have no contributions yet; it shouldn't break the current streak.
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  return { current, longest };
}

// Notebook outputs (images, logs) inflate byte counts, so they would swamp real code.
const IGNORED_LANGS = new Set(["Jupyter Notebook"]);

function topLanguages(repos, n = 5) {
  const totals = new Map();
  for (const r of repos) {
    for (const e of r.languages.edges) {
      if (IGNORED_LANGS.has(e.node.name)) continue;
      const t = totals.get(e.node.name) ?? { size: 0, color: e.node.color || C.dim };
      t.size += e.size;
      totals.set(e.node.name, t);
    }
  }
  const all = [...totals.entries()].sort((a, b) => b[1].size - a[1].size);
  const sum = all.reduce((s, [, v]) => s + v.size, 0) || 1;
  const top = all.slice(0, n).map(([name, v]) => ({ name, color: v.color, pct: (v.size / sum) * 100 }));
  const rest = 100 - top.reduce((s, l) => s + l.pct, 0);
  if (rest > 0.5) top.push({ name: "Other", color: C.line, pct: rest });
  return top;
}

const fmt = (n) => n.toLocaleString("en-US");

// ---------- shared card chrome ----------

const CARD_CSS = `<style>
  .in { animation: in .7s cubic-bezier(.22,1,.36,1) both; }
  @keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .grow { animation: grow 1s cubic-bezier(.22,1,.36,1) both; }
  @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  .grow-x { animation: growx 1.1s cubic-bezier(.22,1,.36,1) .2s both; }
  @keyframes growx { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>`;

function frame(w, h, kicker, accent, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${gridPattern("grid")}</defs>
${CARD_CSS}
<path d="${cutPath(1, 1, w - 2, h - 2, 18)}" fill="${C.arena}" stroke="${C.line}" stroke-width="2"/>
<path d="${cutPath(1, 1, w - 2, h - 2, 18)}" fill="url(#grid)"/>
<rect x="1" y="1" width="${w - 20}" height="3" fill="${accent}"/>
<g font-family="${MONO}" font-size="12" letter-spacing="2.4">
  <polygon points="32,24 ${32 + kicker.tag.length * 10 + 24},24 ${32 + kicker.tag.length * 10 + 16},44 24,44" fill="${accent}"/>
  <text x="38" y="38.5" font-weight="700" fill="${C.arena}">${esc(kicker.tag)}</text>
  <text x="${32 + kicker.tag.length * 10 + 36}" y="38.5" fill="${C.dim}">${esc(kicker.text)}</text>
</g>
${body}
</svg>
`;
}

// ---------- cards ----------

function statsCard(u, s) {
  const cc = u.contributionsCollection;
  const days = cc.contributionCalendar.weeks.flatMap((wk) => wk.contributionDays);
  const activeDays = days.filter((d) => d.contributionCount > 0).length;
  const bestWeek = Math.max(0, ...cc.contributionCalendar.weeks.map((wk) => wk.contributionDays.reduce((a, d) => a + d.contributionCount, 0)));
  const w = 560;
  const h = 250;
  const big = [
    { v: fmt(cc.contributionCalendar.totalContributions), l: "CONTRIBUTIONS", note: "LAST 12 MONTHS" },
    { v: `${s.current}`, l: "CURRENT STREAK", note: `LONGEST ${s.longest} DAYS` },
  ];
  const small = [
    { v: fmt(cc.totalCommitContributions), l: "COMMITS" },
    { v: fmt(activeDays), l: "ACTIVE DAYS" },
    { v: fmt(u.repositories.totalCount), l: "PUBLIC REPOS" },
    { v: fmt(bestWeek), l: "BEST WEEK" },
  ];
  const bigCells = big
    .map(
      (b, i) => `<g transform="translate(${32 + i * 260} 104)"><g class="in" style="animation-delay:${0.1 + i * 0.1}s">
    <text font-family="${SANS}" font-size="46" font-weight="800" fill="${i === 0 ? C.forge : C.ink}">${esc(b.v)}${i === 1 ? `<tspan font-size="18" fill="${C.dim}" dx="6">DAYS</tspan>` : ""}</text>
    <text y="24" font-family="${MONO}" font-size="12" letter-spacing="2.4" fill="${C.ink}">${b.l}</text>
    <text y="42" font-family="${MONO}" font-size="11" letter-spacing="2" fill="${C.dim}">${esc(b.note)}</text>
  </g></g>`
    )
    .join("\n");
  const smallCells = small
    .map(
      (c, i) => `<g transform="translate(${32 + i * 128} 206)"><g class="in" style="animation-delay:${0.3 + i * 0.07}s">
    <text font-family="${SANS}" font-size="24" font-weight="700" fill="${C.ink}">${esc(c.v)}</text>
    <text y="20" font-family="${MONO}" font-size="10.5" letter-spacing="1.8" fill="${C.dim}">${c.l}</text>
  </g></g>`
    )
    .join("\n");
  const body = `${bigCells}
<rect x="32" y="166" width="${w - 64}" height="1" fill="${C.line}"/>
${smallCells}`;
  return frame(w, h, { tag: "STATS", text: "GITHUB · SEASON SO FAR" }, C.forge, body, `${u.name ?? USER} GitHub stats`);
}

function langsCard(langs) {
  const w = 560;
  const h = 250;
  const barX = 32;
  const barW = w - 64;
  let x = barX;
  const segs = langs
    .map((l) => {
      const sw = Math.max(2, (l.pct / 100) * barW);
      const r = `<rect x="${x.toFixed(1)}" y="72" width="${(sw - 2).toFixed(1)}" height="14" fill="${l.color}"/>`;
      x += sw;
      return r;
    })
    .join("");
  const legend = langs
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return `<g transform="translate(${32 + col * 256} ${120 + row * 36})"><g class="in" style="animation-delay:${0.25 + i * 0.06}s">
    <rect y="-10" width="10" height="10" fill="${l.color}"/>
    <text x="20" font-family="${SANS}" font-size="15" font-weight="600" fill="${C.ink}">${esc(l.name)}</text>
    <text x="${236}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.dim}">${l.pct.toFixed(1)}%</text>
  </g></g>`;
    })
    .join("\n");
  const body = `<g class="grow-x" style="transform-origin:${barX}px 0">${segs}</g>
${legend}`;
  return frame(w, h, { tag: "LANGS", text: "BY CODE SIZE · PUBLIC REPOS" }, C.neural, body, "Most used languages");
}

function yearCard(weeks, total) {
  const w = 1136;
  const h = 250;
  const chartX = 32;
  const chartY = 70;
  const chartW = w - 64;
  const chartH = 120;
  const sums = weeks.map((wk) => ({
    start: wk.contributionDays[0].date,
    n: wk.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
  }));
  const max = Math.max(1, ...sums.map((s) => s.n));
  const step = chartW / sums.length;
  const bw = Math.max(3, step - 4);
  const bars = sums
    .map((s, i) => {
      const bh = s.n === 0 ? 2 : Math.max(4, (s.n / max) * chartH);
      const bx = chartX + i * step + (step - bw) / 2;
      return `<rect x="${bx.toFixed(1)}" y="${(chartY + chartH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${s.n === 0 ? C.line : C.forge}" opacity="${s.n === 0 ? 1 : (0.45 + 0.55 * (s.n / max)).toFixed(2)}"/>`;
    })
    .join("");
  // Rolling 4-week average as a pulse line
  const avg = sums.map((_, i) => {
    const win = sums.slice(Math.max(0, i - 3), i + 1);
    return win.reduce((a, s) => a + s.n, 0) / win.length;
  });
  const line = avg
    .map((v, i) => `${i ? "L" : "M"}${(chartX + i * step + step / 2).toFixed(1)} ${(chartY + chartH - (v / max) * chartH).toFixed(1)}`)
    .join(" ");
  const months = [];
  let last = "";
  sums.forEach((s, i) => {
    const m = new Date(`${s.start}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    if (m !== last) {
      if (i > 0) months.push(`<text x="${(chartX + i * step).toFixed(1)}" y="${chartY + chartH + 24}" font-family="${MONO}" font-size="11" letter-spacing="1.5" fill="${C.dim}">${m}</text>`);
      last = m;
    }
  });
  const best = sums.reduce((a, s) => (s.n > a.n ? s : a), sums[0]);
  const body = `<text x="${w - 32}" y="38.5" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${C.dim}"><tspan fill="${C.forge}" font-weight="700">${fmt(total)}</tspan> CONTRIBUTIONS · BEST WEEK <tspan fill="${C.ink}" font-weight="700">${best.n}</tspan></text>
<rect x="${chartX}" y="${chartY + chartH}" width="${chartW}" height="1" fill="${C.line}"/>
<g class="grow" style="transform-origin:0 ${chartY + chartH}px">${bars}</g>
<path class="in" style="animation-delay:.6s" d="${line}" fill="none" stroke="${C.neural}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
${months.join("")}`;
  return frame(w, h, { tag: "PULSE", text: "WEEKLY CONTRIBUTIONS · LAST 12 MONTHS" }, C.forge, body, "Weekly contributions over the last year");
}

// ---------- main ----------

const user = await fetchUser();
const days = user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const s = streaks(days);
const langs = topLanguages(user.repositories.nodes);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/stats.svg", statsCard(user, s));
writeFileSync("assets/langs.svg", langsCard(langs));
writeFileSync("assets/year.svg", yearCard(user.contributionsCollection.contributionCalendar.weeks, user.contributionsCollection.contributionCalendar.totalContributions));
console.log(
  `wrote stats/langs/year · ${user.contributionsCollection.contributionCalendar.totalContributions} contributions · streak ${s.current}/${s.longest} · ${langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}`
);
