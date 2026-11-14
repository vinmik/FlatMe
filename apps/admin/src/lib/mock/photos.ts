/**
 * Procedurally generated interior "photos" (SVG data URIs) for the mock backend.
 * Self-contained so demo mode works offline and under a strict CSP (img-src data:).
 */

const WALLS = ["#f5efe6", "#e8f1f2", "#f3e9e2", "#eef0f7", "#f6f3ea", "#e9efe7", "#f4ebf1"];
const FLOORS = ["#c9a27e", "#b98d67", "#d8c3a5", "#9c7b5b", "#cfc6bb", "#a8907a"];
const ACCENTS = ["#0891b2", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f"];
const SKIES = [
  ["#7dd3fc", "#e0f2fe"],
  ["#fdba74", "#fef3c7"],
  ["#93c5fd", "#f0f9ff"],
  ["#c4b5fd", "#fce7f3"],
];

function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.abs(n) % arr.length] as T;
}

function windowSvg(x: number, sky: readonly string[], id: string): string {
  return `<defs><linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect x="${x}" y="90" width="220" height="200" rx="6" fill="url(#s${id})" stroke="#fff" stroke-width="10"/>
<path d="M${x} 230 l40-40 30 25 45-60 50 55 25-20 30 40 v60 h-220z" fill="#64748b" opacity=".35"/>
<rect x="${x + 105}" y="90" width="10" height="200" fill="#fff"/>
<rect x="${x - 20}" y="80" width="40" height="230" rx="4" fill="#ffffff" opacity=".5"/>`;
}

function plant(x: number, accent: string): string {
  return `<rect x="${x}" y="470" width="44" height="50" rx="6" fill="${accent}" opacity=".85"/>
<ellipse cx="${x + 10}" cy="440" rx="18" ry="34" fill="#15803d" transform="rotate(-20 ${x + 10} 440)"/>
<ellipse cx="${x + 34}" cy="436" rx="18" ry="38" fill="#16a34a" transform="rotate(18 ${x + 34} 436)"/>
<ellipse cx="${x + 22}" cy="420" rx="14" ry="40" fill="#22c55e"/>`;
}

function living(accent: string): string {
  return `<rect x="300" y="380" width="380" height="120" rx="26" fill="${accent}"/>
<rect x="320" y="330" width="340" height="90" rx="24" fill="${accent}" opacity=".85"/>
<rect x="340" y="390" width="140" height="40" rx="12" fill="#fff" opacity=".25"/>
<rect x="500" y="390" width="140" height="40" rx="12" fill="#fff" opacity=".25"/>
<rect x="330" y="500" width="14" height="30" fill="#334155"/><rect x="636" y="500" width="14" height="30" fill="#334155"/>
<rect x="250" y="545" width="300" height="16" rx="8" fill="#334155" opacity=".7"/>
<circle cx="720" cy="150" r="34" fill="#fde68a" opacity=".9"/><rect x="716" y="180" width="8" height="150" fill="#475569"/>`;
}

function bedroom(accent: string): string {
  return `<rect x="290" y="300" width="360" height="110" rx="14" fill="#475569"/>
<rect x="270" y="400" width="400" height="120" rx="16" fill="#f8fafc"/>
<rect x="270" y="440" width="400" height="80" rx="16" fill="${accent}"/>
<rect x="310" y="370" width="120" height="50" rx="14" fill="#fff"/><rect x="510" y="370" width="120" height="50" rx="14" fill="#fff"/>
<rect x="690" y="430" width="70" height="90" rx="8" fill="#94a3b8"/><circle cx="725" cy="405" r="22" fill="#fde68a"/>`;
}

function kitchen(accent: string): string {
  return `<rect x="60" y="400" width="680" height="130" rx="8" fill="#e2e8f0"/>
<rect x="60" y="392" width="680" height="16" rx="4" fill="#334155"/>
${[0, 1, 2, 3, 4].map((i) => `<rect x="${80 + i * 132}" y="420" width="116" height="96" rx="6" fill="${accent}" opacity=".9"/><rect x="${126 + i * 132}" y="440" width="24" height="5" rx="2" fill="#fff"/>`).join("")}
${[0, 1, 2].map((i) => `<rect x="${380 + i * 120}" y="110" width="104" height="120" rx="6" fill="${accent}" opacity=".75"/>`).join("")}
<rect x="190" y="350" width="60" height="42" rx="6" fill="#64748b"/><circle cx="560" cy="372" r="18" fill="#f97316"/>`;
}

function balcony(accent: string, sky: readonly string[], id: string): string {
  const buildings = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => {
      const h = 120 + ((i * 53) % 140);
      return `<rect x="${i * 120}" y="${380 - h}" width="96" height="${h}" fill="#475569" opacity="${0.35 + (i % 3) * 0.15}"/>`;
    })
    .join("");
  return `<defs><linearGradient id="b${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="800" height="420" fill="url(#b${id})"/>${buildings}
<rect y="380" width="800" height="220" fill="#d6d3d1"/>
${Array.from({ length: 17 }, (_, i) => `<rect x="${i * 50}" y="330" width="8" height="130" fill="#334155"/>`).join("")}
<rect y="322" width="800" height="12" fill="#334155"/>
<rect x="520" y="470" width="140" height="70" rx="10" fill="${accent}"/>`;
}

const KINDS = ["living", "bedroom", "kitchen", "balcony"] as const;

export function roomPhoto(seed: number, index: number): string {
  const wall = pick(WALLS, seed + index);
  const floor = pick(FLOORS, seed * 3 + index);
  const accent = pick(ACCENTS, seed * 7 + index * 3);
  const sky = pick(SKIES, seed + index * 5);
  const kind = pick(KINDS, seed + index);
  const id = `${seed}-${index}`;
  let scene: string;
  if (kind === "balcony") {
    scene = balcony(accent, sky, id);
  } else {
    const base = `<rect width="800" height="600" fill="${wall}"/><rect y="520" width="800" height="80" fill="${floor}"/><rect y="514" width="800" height="8" fill="#ffffff" opacity=".6"/>`;
    const win = kind === "kitchen" ? windowSvg(110, sky, id).replace(/height="200"/, 'height="160"') : windowSvg(40, sky, id);
    const body = kind === "living" ? living(accent) : kind === "bedroom" ? bedroom(accent) : kitchen(accent);
    scene = `${base}${win}${body}${kind !== "kitchen" ? plant(80, accent) : ""}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">${scene}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s*\n\s*/g, ""))}`;
}
