// Avatar : portrait en buste dessiné en SVG (visage, coiffure, pilosité, lunettes, boucles d'oreilles, haut, fond).
// Les réglages sont un objet JSON (profiles.avatar). Les anciennes valeurs restent valides, et toute valeur
// inconnue ou manquante retombe sur la valeur par défaut : un avatar déjà enregistré s'affiche toujours.
// Repère : viewBox 0 0 200 200, axe du visage en x = 100, yeux à y = 104, menton vers y = 153.
import { AV, DEFAULT_AVATAR } from './catalog.js';

let uid = 0;
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const P = (x, y) => `${f1(x)} ${f1(y)}`;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Miroir gauche/droite d'un tracé écrit en coordonnées absolues (M L C Q uniquement).
const mirror = (d) => { let i = 0; return d.replace(/-?\d+(\.\d+)?/g, (n) => (i++ % 2 === 0 ? f1(200 - Number(n)) : n)); };
const both = (d) => d + ' ' + mirror(d);
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, color, w, op = 1, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" ${extra}/>`;

// Points le long d'une ellipse (angles en degrés, 270 = haut).
const ell = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((a0 + (a1 - a0) * i / n) * Math.PI) / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
// Bord bouclé : relie les points en bombant chaque segment (amp > 0 : vers la gauche du sens de parcours).
function bumpy(pts, amp) {
  let d = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    d += ` Q${P((x0 + x1) / 2 + (dy / L) * amp, (y0 + y1) / 2 - (dx / L) * amp)} ${P(x1, y1)}`;
  }
  return d;
}
const moveTo = (p) => `M${P(p[0], p[1])}`;
// Petites boucles (texture des cheveux frisés), positions fixes pour un dessin stable.
function curls(spots, color, op, r = 2.6, w = 1.2) {
  return line(spots.map(([x, y], i) => {
    const s = i % 2 ? 1 : -1;
    return `M${P(x - r, y)} Q${P(x - r, y - r * 1.3)} ${P(x, y - r * 1.1)} Q${P(x + r * 1.1, y - r * 0.9)} ${P(x + r * 0.5 * s + r * 0.3, y + r * 0.2)}`;
  }).join(' '), color, w, op);
}
// Semis de points dans une ellipse (texture), pseudo-aléatoire mais toujours identique.
function scatter(cx, cy, rx, ry, n, seed = 7, yMax = 999) {
  const out = []; let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let k = 0; out.length < n && k < n * 6; k++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    if (y < yMax) out.push([x, y]);
  }
  return out;
}

/* ---------- réglages ---------- */
export function normalizeAvatar(a) {
  const src = a && typeof a === 'object' ? a : {};
  const out = { ...DEFAULT_AVATAR };
  for (const k of Object.keys(DEFAULT_AVATAR)) {
    const v = src[k], list = AV[k];
    if (k === 'marks') { out.marks = Array.isArray(v) ? AV.marks.filter((m) => v.includes(m)) : []; continue; }
    if (!list || v === undefined || v === null || v === '') continue;
    if (typeof list[0] === 'object') { const n = Number(v); if (Number.isInteger(n) && n >= 0 && n < list.length) out[k] = n; }
    else if (list.includes(v)) out[k] = v;
  }
  return out;
}

/* ---------- visage ---------- */
const FACES = {
  Ovale: { sw: 38, cw: 37, jw: 26, jy: 141, cy: 153, ch: 9 },
  Rond: { sw: 39, cw: 39.5, jw: 31, jy: 139, cy: 150, ch: 13 },
  'Carré': { sw: 38.5, cw: 38.5, jw: 34, jy: 143, cy: 152, ch: 16 },
  'Allongé': { sw: 35.5, cw: 35, jw: 26, jy: 148, cy: 160, ch: 10 },
  'Cœur': { sw: 39.5, cw: 36, jw: 22, jy: 141, cy: 153, ch: 6 },
  Losange: { sw: 34.5, cw: 39.5, jw: 25, jy: 142, cy: 155, ch: 7 }
};
const BUILD = {
  Mince: { W: 56, nw: 11.5 }, Normale: { W: 65, nw: 13 }, 'Athlétique': { W: 77, nw: 15.5 }, Forte: { W: 80, nw: 16 }
};
function faceGeom(a) {
  const f = { ...(FACES[a.faceShape] || FACES.Ovale) };
  if (a.build === 'Forte') { f.cw += 2; f.jw += 3.5; f.ch += 2; f.cy += 1; }
  if (a.build === 'Mince') { f.cw -= 0.8; f.jw -= 1.5; }
  return f;
}
// Contour du bas du visage, côté droit, de la tempe (R(sw), 100) au milieu du menton.
function jawSegs(f) {
  const R = (v) => 100 + v;
  return [
    [[R(f.sw), 106], [R(f.cw), 109], [R(f.cw), 116]],
    [[R(f.cw), 126], [R(f.jw + 5), f.jy - 6], [R(f.jw), f.jy]],
    [[R(f.jw - 4), f.jy + 5], [R(f.ch + 6), f.cy], [R(f.ch), f.cy]],
    [[R(f.ch * 0.45), f.cy + 1.3], [103, f.cy + 1.5], [100, f.cy + 1.5]]
  ];
}
const segStr = (segs) => segs.map(([c1, c2, p]) => `C${P(...c1)} ${P(...c2)} ${P(...p)}`).join(' ');
// Même contour parcouru du menton vers la tempe gauche.
function jawLeftUp(f, segs = jawSegs(f)) {
  const starts = [[100 + f.sw, 100], ...segs.map((s) => s[2])];
  const m = ([x, y]) => [200 - x, y];
  return segs.map((s, i) => [m(s[1]), m(s[0]), m(starts[i])]).reverse();
}
function faceOutline(f) {
  const L = (v) => 100 - v, R = (v) => 100 + v, sw = f.sw;
  return `M${P(R(sw), 100)} ${segStr(jawSegs(f))} ${segStr(jawLeftUp(f))} C${P(L(sw), 68)} ${P(L(sw * 0.6), 44)} 100 44 C${P(R(sw * 0.6), 44)} ${P(R(sw), 68)} ${P(R(sw), 100)} Z`;
}
// Bas du visage seul (pour les barbes), du haut des favoris droit au haut des favoris gauche.
const jawOnly = (f) => `M${P(100 + f.sw, 100)} ${segStr(jawSegs(f))} ${segStr(jawLeftUp(f))}`;
function scaledJaw(f, k, ox = 100, oy = 72) {
  const t = ([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k];
  const segs = jawSegs(f).map((s) => s.map(t));
  const left = jawLeftUp(f).map((s) => s.map(t));
  return { start: t([100 + f.sw, 100]), right: segs, left };
}
const rev = (start, segs) => {   // inverse une suite de courbes (pour fermer un anneau)
  const pts = [start, ...segs.map((s) => s[2])];
  return segs.map((s, i) => [s[1], s[0], pts[i]]).reverse();
};

/* ---------- yeux, sourcils, nez, bouche ---------- */
const EYES = {
  Amande: { h: 3.9, b: 2.7, tilt: 1 }, Ronds: { h: 4.8, b: 3.9, tilt: 0 }, 'Étroits': { h: 2.5, b: 1.7, tilt: 0.7 },
  Tombants: { h: 3.8, b: 2.7, tilt: -1.8 }, 'Relevés': { h: 3.6, b: 2.4, tilt: 2.6 }, 'Paupières lourdes': { h: 3.6, b: 2.8, tilt: 0.3, lid: 0.45 }
};
function eyeSVG(x, s, a, c, id) {
  const e = EYES[a.eyeShape] || EYES.Amande, k = { Petits: 0.86, Moyens: 1, Grands: 1.17 }[a.eyeSize] || 1;
  const w = 7.4 * k, h = e.h * k, b = e.b * k, y = 104, t = e.tilt;
  const I = [x - s * w, y + 0.6], O = [x + s * w, y - t];
  const top = `C${P(x - s * w * 0.55, y - h * 1.3)} ${P(x + s * w * 0.4, y - h * 1.35 - t * 0.35)} ${P(...O)}`;
  const white = `${moveTo(I)} ${top} C${P(x + s * w * 0.45, y + b * 1.2 - t * 0.2)} ${P(x - s * w * 0.5, y + b * 1.25)} ${P(...I)} Z`;
  const r = 4.3 * k, ix = x + s * 0.3, iy = y + 0.1;
  const cid = `${id}e${s > 0 ? 1 : 0}`;
  const lidY = y - h * 1.3 + (h + b) * (e.lid || 0) * 1.3;
  return `<clipPath id="${cid}"><path d="${white}"/></clipPath>
    ${line(`M${P(x - s * w * 0.75, y - h - 2.4)} Q${P(x, y - h * 1.5 - 4)} ${P(x + s * w * 0.95, y - h - 1.6 - t)}`, c.skinShade, 1.1, 0.55)}
    ${path(white, '#F8F5F0')}
    <g clip-path="url(#${cid})">
      <circle cx="${f1(ix)}" cy="${f1(iy)}" r="${f1(r)}" fill="${c.eye}"/>
      <circle cx="${f1(ix)}" cy="${f1(iy)}" r="${f1(r * 0.62)}" fill="${c.eyeDark}" opacity=".35"/>
      <circle cx="${f1(ix)}" cy="${f1(iy)}" r="${f1(r * 0.45)}" fill="#120D0B"/>
      <circle cx="${f1(ix)}" cy="${f1(iy)}" r="${f1(r)}" fill="none" stroke="${c.eyeDark}" stroke-width=".9"/>
      <circle cx="${f1(ix - 1.4)}" cy="${f1(iy - 1.6)}" r="${f1(1.25 * k)}" fill="#fff"/>
      <circle cx="${f1(ix + 1.6)}" cy="${f1(iy + 1.4)}" r=".6" fill="#fff" opacity=".7"/>
      ${path(`M${P(x - 10, y - 9)} L${P(x + 10, y - 9)} L${P(x + 10, y - h * 0.35)} Q${P(x, y - h * 0.9)} ${P(x - 10, y - h * 0.35)} Z`, '#000', 'opacity=".12"')}
      ${e.lid ? `${path(`M${P(x - 10, y - 10)} L${P(x + 10, y - 10)} L${P(x + 10, lidY)} L${P(x - 10, lidY)} Z`, c.skin)}` : ''}
    </g>
    ${e.lid ? line(`M${P(x - s * w * 0.95, lidY + 1.6)} Q${P(x, lidY - 0.6)} ${P(x + s * w * 1.02, lidY + 0.6 - t * 0.5)}`, c.lash, 1.7) : ''}
    ${line(`${moveTo(I)} ${top}`, c.lash, e.lid ? 0.9 : 1.9, e.lid ? 0.5 : 1)}
    ${line(`M${P(O[0] - s * 0.6, O[1] + 0.2)} L${P(O[0] + s * 2, O[1] - 1.3)}`, c.lash, 1.5)}
    ${line(`M${P(x + s * w * 0.8, y + b * 0.6 - t * 0.5)} C${P(x + s * w * 0.3, y + b * 1.35)} ${P(x - s * w * 0.4, y + b * 1.35)} ${P(x - s * w * 0.85, y + b * 0.4)}`, c.skinShade, 0.8, 0.6)}`;
}

const BROWS = {   // épaisseur début / milieu / fin, hauteur de l'arc, écart vertical de la queue
  Naturels: { t: [3.2, 2.8, 1.2], arch: 2.2, tail: 1.5 }, 'Épais': { t: [4.6, 4.2, 2], arch: 1.8, tail: 1.2 },
  Fins: { t: [1.9, 1.6, 0.8], arch: 2.6, tail: 1.6 }, 'Arqués': { t: [2.8, 2.6, 1], arch: 4.4, tail: 2.6 },
  Droits: { t: [3.2, 3, 1.6], arch: 0.4, tail: 0.3 }, Broussailleux: { t: [5, 4.6, 2.6], arch: 1.6, tail: 0.6 },
  Entaille: { t: [3.4, 3, 1.3], arch: 2.2, tail: 1.5, cut: true }
};
function browSVG(x, s, a, c) {
  const br = BROWS[a.brows] || BROWS.Naturels;
  const shapeY = { 'Paupières lourdes': 0.8, Ronds: -1.2 }[a.eyeShape] || 0;
  const y0 = 93 + shapeY, ix = x - s * 9.5, ox = x + s * 12, mx = x + s * 1.5;
  const [t0, t1, t2] = br.t;
  const d = `M${P(ix, y0 + t0)} Q${P(ix - s * 1.6, y0 + t0 * 0.35)} ${P(ix + s * 0.6, y0 - 0.3)} Q${P(mx - s * 3, y0 - br.arch - t1)} ${P(mx + s * 2, y0 - br.arch - t1 * 0.5)} Q${P(ox - s * 3, y0 - br.arch * 0.6)} ${P(ox, y0 + br.tail - t2 * 0.5)}`
    + ` Q${P(ox - s * 4, y0 - br.arch * 0.3 + t2)} ${P(mx + s * 2, y0 - br.arch + t1 * 0.5)} Q${P(mx - s * 4, y0 - br.arch + t1 * 0.6)} ${P(ix, y0 + t0)} Z`;
  let out = path(d, c.brow);
  if (a.brows === 'Broussailleux' || a.brows === 'Naturels' || a.brows === 'Épais') {
    // petits poils le long de la ligne médiane, couchés vers la queue du sourcil
    const q = (t, p0, p1, p2) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    const hairs = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.05 + i * 0.1, hx = q(t, ix, mx, ox), hy = q(t, y0 + t0 * 0.5, y0 - br.arch - t1 * 0.4, y0 + br.tail - t2 * 0.2);
      const len = (1 - t) * 2.2 + 1;
      hairs.push(`M${P(hx - s * 0.6, hy + len * 0.5)} L${P(hx + s * len * 0.9, hy - len * 0.5)}`);
    }
    out += line(hairs.join(' '), mix(c.brow, '#000000', 0.25), 0.7, 0.55);
  }
  if (br.cut) out += line(`M${P(x + s * 6.5, y0 - 4.5)} L${P(x + s * 5, y0 + 2.5)}`, c.skin, 1.5);
  return out;
}

const NOSES = {   // demi-largeur des ailes, hauteur de la pointe
  Droit: { ww: 6.4, ty: 124 }, Fin: { ww: 5, ty: 123.5 }, Arrondi: { ww: 7.4, ty: 124.5, round: 1 }, Large: { ww: 9, ty: 124.5, round: 1 },
  Aquilin: { ww: 6.2, ty: 125, hump: 1 }, 'Retroussé': { ww: 6, ty: 122.5, up: 1 }
};
function noseSVG(a, c) {
  const n = NOSES[a.nose] || NOSES.Droit, w = n.ww, ty = n.ty;
  const bridge = n.hump ? `M96.6 103 C95.6 108 97.6 112 96 117 C95.4 119 94.8 120.5 94.6 121.5` : `M96.8 103 C96 110 95.2 116 94.6 121.5`;
  let out = line(bridge, c.skinShade, 1.3, 0.45);
  out += `<ellipse cx="100" cy="${f1(ty + 4.2)}" rx="${f1(w * 0.75)}" ry="1.6" fill="${c.skinShade}" opacity=".35"/>`;
  out += line(`M${P(100 - w + 0.6, ty - 2.5)} C${P(100 - w - 1.6, ty + 1.5)} ${P(100 - w + 1, ty + 3.4)} ${P(100 - w * 0.45, ty + 3)} M${P(100 + w - 0.6, ty - 2.5)} C${P(100 + w + 1.6, ty + 1.5)} ${P(100 + w - 1, ty + 3.4)} ${P(100 + w * 0.45, ty + 3)}`, c.skinShade, 1.25, 0.8);
  const nr = n.up ? 1.15 : 0.85;
  out += `<ellipse cx="${f1(100 - w * 0.42)}" cy="${f1(ty + 2.3)}" rx="1.7" ry="${nr}" fill="${c.skinDeep}" opacity=".75"/><ellipse cx="${f1(100 + w * 0.42)}" cy="${f1(ty + 2.3)}" rx="1.7" ry="${nr}" fill="${c.skinDeep}" opacity=".75"/>`;
  out += `<ellipse cx="100.6" cy="${f1(ty - 1.6)}" rx="${n.round ? 3.4 : 2.3}" ry="${n.round ? 2.4 : 1.8}" fill="#fff" opacity=".22"/>`;
  return out;
}

function mouthSVG(a, c) {
  const L = c.lip, Ld = c.lipDark, my = 137.5;
  switch (a.mouth) {
    case 'Grand sourire':
      return path(`M86.5 ${my - 2.5} Q100 ${my} 113.5 ${my - 2.5} Q111.5 ${my + 9} 100 ${my + 9.5} Q88.5 ${my + 9} 86.5 ${my - 2.5} Z`, '#5A2222')
        + path(`M88 ${my - 1.6} Q100 ${my + 0.6} 112 ${my - 1.6} L111.2 ${my + 1.4} Q100 ${my + 3.3} 88.8 ${my + 1.4} Z`, '#FBF8F4')
        + path(`M92 ${my + 6.6} Q100 ${my + 4.6} 108 ${my + 6.6} Q104 ${my + 9} 100 ${my + 9} Q96 ${my + 9} 92 ${my + 6.6} Z`, '#C96A6A', 'opacity=".8"')
        + line(`M86.5 ${my - 2.5} Q100 ${my} 113.5 ${my - 2.5} Q111.5 ${my + 9} 100 ${my + 9.5} Q88.5 ${my + 9} 86.5 ${my - 2.5}`, L, 1.6)
        + line(`M85.5 ${my - 3.6} Q85 ${my - 2} 86.3 ${my - 1.2} M114.5 ${my - 3.6} Q115 ${my - 2} 113.7 ${my - 1.2}`, c.skinShade, 1, 0.6);
    case 'Neutre':
      return path(`M89 ${my} Q94 ${my - 3} 100 ${my - 1.8} Q106 ${my - 3} 111 ${my} Q100 ${my + 0.6} 89 ${my} Z`, L)
        + path(`M89.5 ${my} Q100 ${my + 0.8} 110.5 ${my} Q106 ${my + 4.6} 100 ${my + 4.8} Q94 ${my + 4.6} 89.5 ${my} Z`, L, 'opacity=".9"')
        + line(`M89 ${my} Q100 ${my + 0.9} 111 ${my}`, Ld, 1.1) + `<ellipse cx="101" cy="${my + 2.6}" rx="3.6" ry="1.1" fill="#fff" opacity=".2"/>`;
    case 'En coin':
      return path(`M89 ${my + 0.4} Q94 ${my - 2.6} 100 ${my - 1.6} Q107 ${my - 3.6} 112.5 ${my - 2.4} Q100 ${my + 0.6} 89 ${my + 0.4} Z`, L)
        + path(`M89.5 ${my + 0.4} Q100 ${my + 0.8} 112 ${my - 2.2} Q106 ${my + 4} 100 ${my + 4.4} Q94 ${my + 4.4} 89.5 ${my + 0.4} Z`, L, 'opacity=".9"')
        + line(`M89 ${my + 0.4} Q101 ${my + 1.2} 112.5 ${my - 2.4}`, Ld, 1.1) + line(`M113 ${my - 3.8} Q114.6 ${my - 2.6} 113.4 ${my - 1}`, c.skinShade, 1, 0.6);
    case 'Charnue':
      return path(`M87.5 ${my} Q93 ${my - 4.6} 100 ${my - 3} Q107 ${my - 4.6} 112.5 ${my} Q100 ${my + 0.8} 87.5 ${my} Z`, L)
        + path(`M88 ${my} Q100 ${my + 1} 112 ${my} Q107 ${my + 6.6} 100 ${my + 6.8} Q93 ${my + 6.6} 88 ${my} Z`, L, 'opacity=".9"')
        + line(`M87.5 ${my} Q100 ${my + 1.3} 112.5 ${my}`, Ld, 1.2) + `<ellipse cx="101" cy="${my + 3.6}" rx="4.6" ry="1.4" fill="#fff" opacity=".22"/>`;
    case 'Fine':
      return path(`M90 ${my} Q95 ${my - 1.6} 100 ${my - 1} Q105 ${my - 1.6} 110 ${my} Q100 ${my + 0.4} 90 ${my} Z`, L)
        + path(`M90.5 ${my} Q100 ${my + 0.6} 109.5 ${my} Q104 ${my + 2.4} 100 ${my + 2.5} Q96 ${my + 2.4} 90.5 ${my} Z`, L, 'opacity=".9"')
        + line(`M90 ${my} Q100 ${my + 0.7} 110 ${my}`, Ld, 1);
    default:   // Sourire léger (valeur par défaut, proche de l'ancien dessin)
      return path(`M88.5 ${my - 1.2} Q94 ${my - 3.4} 100 ${my - 2.2} Q106 ${my - 3.4} 111.5 ${my - 1.2} Q100 ${my + 1.4} 88.5 ${my - 1.2} Z`, L)
        + path(`M89 ${my - 1} Q100 ${my + 1.6} 111 ${my - 1} Q106 ${my + 4.4} 100 ${my + 4.6} Q94 ${my + 4.4} 89 ${my - 1} Z`, L, 'opacity=".9"')
        + line(`M88.5 ${my - 1.2} Q100 ${my + 1.8} 111.5 ${my - 1.2}`, Ld, 1.15)
        + line(`M87.3 ${my - 2.4} Q87 ${my - 0.8} 88.3 ${my - 0.2} M112.7 ${my - 2.4} Q113 ${my - 0.8} 111.7 ${my - 0.2}`, c.skinShade, 0.9, 0.5)
        + `<ellipse cx="101" cy="${my + 2.4}" rx="3.6" ry="1.1" fill="#fff" opacity=".2"/>`;
  }
}

/* ---------- barbe et moustache ---------- */
function beardSVG(a, f, c, id) {
  const kind = a.beard;
  if (!kind || kind === 'Aucune') return '';
  const L = (v) => 100 - v, R = (v) => 100 + v, sw = f.sw;
  const cheek = (d) => `L${P(L(sw - 3.5), 100)} C${P(L(sw - 4), 110)} ${P(L(29 + d), 118 + d)} ${P(L(21), 125.5 + d * 0.3)} C${P(L(15), 131.6)} ${P(L(9), 130.2)} 100 130.6 C${P(R(9), 130.2)} ${P(R(15), 131.6)} ${P(R(21), 125.5 + d * 0.3)} C${P(R(29 + d), 118 + d)} ${P(R(sw - 4), 110)} ${P(R(sw - 3.5), 100)} Z`;
  const full = (d) => `${jawOnly(f)} ${cheek(d)}`;
  const tex = (d, op) => `<clipPath id="${id}bd"><path d="${d}"/></clipPath><g clip-path="url(#${id}bd)">${curlsOrStubble(op)}</g>`;
  const curlsOrStubble = (op) => line(scatter(100, 138, 40, 24, 160, 11).map(([x, y]) => `M${P(x, y)} l${f1((x - 100) / 60)} .7`).join(' '), c.hairDark, 0.8, op);
  const mouthHole = '';
  switch (kind) {
    case 'Barbe de 3 jours': {
      const d = full(6);
      return path(d, c.hair, 'opacity=".16"') + tex(d, 0.5);
    }
    case 'Courte': {
      const d = full(4);
      return `<g>${path(d, c.hair)}${mouthHole}</g>` + path(d, c.hairDark, 'opacity=".18"') + tex(d, 0.5);
    }
    case 'Pleine': case 'Longue': {
      const d = full(0);
      const long = kind === 'Longue' ? path(`M${P(R(f.jw + 2), f.jy - 8)} C${P(R(f.jw), f.cy + 8)} ${P(R(10), f.cy + 22)} 100 ${f1(f.cy + 28)} C${P(L(10), f.cy + 22)} ${P(L(f.jw), f.cy + 8)} ${P(L(f.jw + 2), f.jy - 8)} Z`, c.hair) : '';
      const strands = line(`M${P(L(16), 146)} Q${P(L(14), f.cy + 6)} ${P(L(9), f.cy + (kind === 'Longue' ? 20 : -1))} M${P(R(16), 146)} Q${P(R(14), f.cy + 6)} ${P(R(9), f.cy + (kind === 'Longue' ? 20 : -1))} M100 146 L100 ${f1(f.cy + (kind === 'Longue' ? 24 : 0))}`, c.hairDark, 1.1, 0.45);
      return `<g transform="translate(100 120) scale(1.04 1.05) translate(-100 -120)">${path(d, c.hair)}${long}${mouthHole}</g>` + strands + tex(d, 0.45);
    }
    case 'Collier': {
      const inner = scaledJaw(f, 0.89);
      const chin = inner.right[inner.right.length - 1][2], leftTop = inner.left[inner.left.length - 1][2];
      const ring = `${jawOnly(f)} L${P(...leftTop)} ${segStr(rev(chin, inner.left))} ${segStr(rev(inner.start, inner.right))} Z`;
      return path(ring, c.hair) + tex(ring, 0.4);
    }
    case 'Bouc': {
      const cw = Math.min(f.ch, 9.5);
      const d = `M88.6 130.2 Q100 126.8 111.4 130.2 L112.6 140 C${P(R(cw + 2), f.cy - 4)} ${P(R(cw * 0.7), f.cy + 2)} 100 ${f1(f.cy + 2.4)} C${P(L(cw * 0.7), f.cy + 2)} ${P(L(cw + 2), f.cy - 4)} 87.4 140 Z`;
      return `<g>${path(d, c.hair)}${mouthHole}</g>` + tex(d, 0.45);
    }
  }
  return '';
}
const MOUSTACHES = {
  Fine: 'M87.4 135.4 Q93 130.6 100 132.2 Q107 130.6 112.6 135.4 Q107 133.6 100 134.6 Q93 133.6 87.4 135.4 Z',
  Classique: 'M85.5 136.4 Q87.4 129.4 100 130.4 Q112.6 129.4 114.5 136.4 Q108 133.6 100 135.2 Q92 133.6 85.5 136.4 Z',
  'Épaisse': 'M83.4 138.6 Q84.4 127.6 100 128.6 Q115.6 127.6 116.6 138.6 Q109 133.8 100 135.6 Q91 133.8 83.4 138.6 Z',
  Guidon: 'M80.6 130.4 Q81.4 135.6 86.4 135.2 Q92 129.2 100 130.8 Q108 129.2 113.6 135.2 Q118.6 135.6 119.4 130.4 Q121 137.6 114.4 137.8 Q107.6 134.4 100 135.4 Q92.4 134.4 85.6 137.8 Q79 137.6 80.6 130.4 Z'
};
function moustacheSVG(a, c) {
  const d = MOUSTACHES[a.moustache];
  if (!d) return '';
  return path(d, c.hair) + line('M92 132.6 L93 134.6 M96 131.8 L96.6 134 M104 131.8 L103.4 134 M108 132.6 L107 134.6', c.hairDark, 0.8, 0.5)
    + line('M90 132.4 Q100 129.6 110 132.4', c.hairLight, 1.2, 0.35);
}

/* ---------- coiffures ----------
   Chaque coiffure renvoie { back, front, over } : back passe derrière la tête et le buste, front par-dessus
   le visage, over par-dessus le buste (mèches longues sur les épaules). Dessinées pour un crâne de
   demi-largeur 38 ; on les étire légèrement selon la forme du visage. */
const CAP = 'M61.6 106 C60.8 70 74 44.6 100 43.6 C126 44.6 139.2 70 138.4 106 L136 106 C135.4 92 132.4 81 126.5 75.5 Q114 69 100 69 Q86 69 73.5 75.5 C67.6 81 64.6 92 64 106 Z';
const SIDES = 'M61.4 108 C60.6 80 68 56 82 49 L118 49 C132 56 139.4 80 138.6 108 L136 108 C135.4 93 132.4 82 126.5 76 L73.5 76 C67.6 82 64.6 93 64 108 Z';
const SIDEBURNS = 'M61.6 97 L65 97 L64.8 113.5 L62.2 113.5 Z M138.4 97 L135 97 L135.2 113.5 L137.8 113.5 Z';
const SLICK = 'M61 106 C57.5 70 70 38.5 100 37.5 C130 38.5 142.5 70 139 106 L136.4 106 C135.6 88 131.8 77 124.5 70.5 C117 65 108.5 64 100 64 C91.5 64 83 65 75.5 70.5 C68.2 77 64.4 88 63.6 106 Z';

function fadeSides(c, id) {
  return `<linearGradient id="${id}fd" x1="0" y1="62" x2="0" y2="110" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.hair}" stop-opacity=".95"/><stop offset=".55" stop-color="${c.hair}" stop-opacity=".55"/><stop offset="1" stop-color="${c.hair}" stop-opacity=".12"/></linearGradient>`
    + path(SIDES, `url(#${id}fd)`);
}
function fringeEdge(x0, x1, y, step = 4.5, dip = 2.6) {   // bord de frange irrégulier, de droite à gauche
  let d = '', up = false;
  for (let x = x0; x > x1; x -= step) { const nx = Math.max(x - step, x1); d += ` Q${P(x - step / 2, y + (up ? -dip * 0.3 : dip))} ${P(nx, y + (up ? 0.6 : -0.4))}`; up = !up; }
  return d;
}

const HAIR = {
  Chauve: (c) => ({ front: `<ellipse cx="85" cy="58" rx="12" ry="5.5" transform="rotate(-28 85 58)" fill="#fff" opacity=".17"/>` }),
  'Dégarni': (c) => ({
    front: path('M64 96 C62 70 76 47 100 46 C124 47 138 70 136 96 C132 78 126 67 117 62 Q108 58 100 58.5 Q92 58 83 62 C74 67 68 78 64 96 Z', c.hair, 'opacity=".22"')
      + path(both('M61.2 108 C60.4 88 62 73 67.8 63 C71.2 70 69.2 84 66.6 92 C65.4 97 64.8 102 64.4 108 Z'), c.hair)
      + `<ellipse cx="87" cy="56" rx="11" ry="5" transform="rotate(-28 87 56)" fill="#fff" opacity=".15"/>`
  }),
  'Rasé': (c, id) => ({
    front: `<clipPath id="${id}cap"><path d="${CAP}"/></clipPath>` + path(CAP, c.hair, 'opacity=".62"')
      + `<g clip-path="url(#${id}cap)">${line(scatter(100, 72, 40, 34, 90, 5).map(([x, y]) => `M${P(x, y)} l.4 .7`).join(' '), c.hairDark, 0.8, 0.3)}</g>`
      + line('M73.5 75.5 Q86 69 100 69 Q114 69 126.5 75.5', c.hairDark, 1.2, 0.35)
  }),
  Waves: (c, id) => ({
    front: `<clipPath id="${id}cap"><path d="${CAP}"/></clipPath>` + path(CAP, c.hair, 'opacity=".95"')
      + `<g clip-path="url(#${id}cap)">${[47, 54, 61, 68].map((y) => line(`M66 ${y + 22} Q74 ${y + 4} 84 ${y + 2} Q92 ${y + 5} 100 ${y} Q108 ${y + 5} 116 ${y + 2} Q126 ${y + 4} 134 ${y + 22}`, c.hairLight, 1.8, 0.5)
        + line(`M66 ${y + 25} Q74 ${y + 7} 84 ${y + 5} Q92 ${y + 8} 100 ${y + 3} Q108 ${y + 8} 116 ${y + 5} Q126 ${y + 7} 134 ${y + 25}`, c.hairDark, 1.4, 0.5)).join('')}</g>`
  }),
  'Dégradé': (c, id) => ({
    front: fadeSides(c, id)
      + path('M65 84 C62.5 54 78 38 100 37.5 C122 38 137.5 54 135 84 C131 78 127 76 122 74.6 C116 75.6 112 72.6 106 73.8 C101 72 96 74.4 92 73 C86 74.8 82 73 77 75.6 C72 76.6 68 79.4 65 84 Z', c.hair)
      + line('M72 66 Q84 50 104 46 M80 72 Q92 58 112 55 M116 48 Q128 54 132 68 M100 72 Q112 62 126 64', c.hairDark, 1.3, 0.45)
      + line('M82 49 Q96 41 116 44', c.hairLight, 3, 0.45)
  }),
  Court: (c) => ({
    front: path('M60.4 108 C56.5 74 66 39 100 37.5 C134 39 143.5 74 139.6 108 L136.6 108 C136.2 94 134 84 129 78 C124 74.5 121 77.6 117 73.6 C112 75.8 108 72.4 104 73.8 C99 71.2 95 74.4 90.5 72.4 C86 75 82 72.8 78 75.8 C74 75.4 71 77.8 69.5 80.4 C66 86 64 95 63.4 108 Z', c.hair)
      + path(SIDEBURNS, c.hair)
      + line('M74 60 Q86 48 104 46 M80 70 Q90 58 110 54 M118 50 Q128 56 133 68 M68 78 Q70 64 78 54 M124 64 Q130 70 132 80 M96 72 Q104 62 118 62', c.hairDark, 1.3, 0.45)
      + line('M80 50 Q96 41 116 44', c.hairLight, 3, 0.45)
  }),
  Frange: (c, id) => ({
    front: fadeSides(c, id)
      + path(`M64 87 C61 56 77 38 100 37.5 C123 38 139 56 136 87 ${fringeEdge(136, 64, 86.5)} Z`, c.hair)
      + line('M72 86 Q71 76 76 64 M82 87 Q81 74 86 60 M92 87 Q92 72 96 56 M102 87 Q103 72 104 56 M112 87 Q114 74 112 58 M122 86 Q125 76 122 62 M130 84 Q133 76 130 66', c.hairDark, 1.2, 0.45)
      + line('M84 50 Q98 41 116 45', c.hairLight, 3, 0.45)
  }),
  'Raie sur le côté': (c) => ({
    front: path('M60.4 108 C56.5 72 66 38 100 36 C134 38 143.5 72 139.6 108 L136.6 108 C136 94 133.5 84 128 78 C121 71 110 77 98 72.4 C90 69.6 85 66 81 61 C79 68 76 72 72 77 C67 83 64.4 94 63.4 108 Z', c.hair)
      + path(SIDEBURNS, c.hair)
      + line('M81 61 C83 53 86 47 91 41', c.hairDark, 1.5, 0.7)
      + line('M86 60 Q104 52 126 64 M90 66 Q110 60 130 74 M86 51 Q102 43 122 47 M78 58 Q70 66 68 82', c.hairDark, 1.2, 0.42)
      + line('M92 49 Q108 43 124 52', c.hairLight, 3, 0.5)
  }),
  'Plaqué': (c) => ({
    front: path(SLICK, c.hair) + path(SIDEBURNS, c.hair)
      + line('M74 74 Q74 56 86 44 M84 67 Q84 52 94 41 M94 65 Q95 50 101 40 M106 65 Q105 50 109 41 M116 67 Q116 53 112 43 M126 74 Q126 58 116 46', c.hairDark, 1.2, 0.4)
      + line('M88 58 Q89 48 96 42 M108 58 Q108 48 104 42', c.hairLight, 2.6, 0.5)
  }),
  Banane: (c, id) => ({
    front: fadeSides(c, id)
      + path('M65.5 84 C61 60 66 34 92 26 C110 20.5 130 26 137 42 C141 54 138 70 134.5 82 C130 74 124 69 114 67 C104 65.5 96 68 88 69 C78 70.5 70 76 65.5 84 Z', c.hair)
      + line('M70 76 C70 54 82 36 104 30 M80 70 C82 52 96 38 116 34 M92 68 C96 52 110 42 128 42 M106 66 C112 56 122 50 134 52', c.hairDark, 1.3, 0.42)
      + line('M78 56 C84 42 98 32 116 30', c.hairLight, 3.4, 0.5)
  }),
  'Hérissé': (c, id) => {
    const pts = ell(100, 98, 41, 57, 192, 348, 22).map(([x, y], i) => {
      if (!(i % 2)) return [x, y];
      const a = (192 + (156 * i) / 22 + 5) * Math.PI / 180;   // pointes un peu couchées vers la droite
      return [100 + Math.cos(a) * 41 * 1.14, 98 + Math.sin(a) * 57 * 1.14];
    });
    const d = `M64 86 ${pts.map((p) => `L${P(...p)}`).join(' ')} L136 86 C128 78 122 76 116 77 L110 72.5 L104 76.5 L98 72 L92 76.5 L86 73 C80 75 72 78 64 86 Z`;
    return {
      front: fadeSides(c, id) + path(d, c.hair)
        + line(pts.filter((_, i) => i % 2).map(([x, y]) => `M${P(x, y)} L${P(100 + (x - 100) * 0.55, 92 + (y - 98) * 0.55)}`).join(' '), c.hairDark, 1.2, 0.4)
        + line('M84 48 Q98 40 114 43', c.hairLight, 2.8, 0.4)
    };
  },
  Undercut: (c, id) => ({
    front: `<clipPath id="${id}cap"><path d="${CAP}"/></clipPath>` + path(CAP, c.hair, 'opacity=".5"')
      + path('M68 74 C64 48 82 33 104 32 C126 31.5 142 44 146 60 C149 72 146 84 140 93 C138.5 84 134 78 128 74.5 C118 70.5 104 74.5 92 71.5 C84 69.6 76 69 68 74 Z', c.hair)
      + line('M74 66 Q96 50 128 58 M80 56 Q102 40 134 50 M98 71 Q118 64 138 82 M120 70 Q134 70 142 84', c.hairDark, 1.3, 0.42)
      + line('M88 44 Q108 36 130 46', c.hairLight, 3, 0.45)
  }),
  'Bouclé': (c) => {
    const outer = ell(100, 99, 43, 60, 192, 348, 13), inner = ell(100, 105, 36.5, 35, 352, 188, 11);
    const d = `M61.6 108 L${P(...outer[0])} ${bumpy(outer, 3.8)} L138.4 108 L${P(...inner[0])} ${bumpy(inner, 2.8)} Z`;
    const spots = scatter(100, 62, 34, 22, 26, 3);
    return { front: path(d, c.hair) + curls(spots, c.hairDark, 0.5) + curls(spots.slice(0, 12).map(([x, y]) => [x + 2, y - 3]), c.hairLight, 0.35) };
  },
  Twists: (c) => {
    const row = (rx, ry, a0, a1, n, len) => ell(100, 100, rx, ry, a0, a1, n).map(([x, y]) => {
      const dx = (x - 100) / rx, dy = (y - 100) / ry, k = Math.hypot(dx, dy) || 1;
      let ux = (dx / k) * 0.55, uy = (dy / k) * 0.55 - 0.45; const n = Math.hypot(ux, uy); ux /= n; uy /= n;   // plutôt vers le haut
      return `M${P(x - ux * 2, y - uy * 2)} L${P(x + ux * len, y + uy * len)}`;
    }).join(' ');
    const r1 = row(37, 54, 192, 348, 17, 8), r2 = row(28, 48, 214, 326, 10, 9), r3 = row(16, 44, 240, 300, 4, 9);
    return {
      front: path(CAP, c.hair) + line(r1, c.hair, 7.5) + line(r1, c.hairDark, 6.4, 0.5, 'stroke-dasharray="1.6 2.4"')
        + line(r2, c.hair, 7.5) + line(r2, c.hairDark, 6.4, 0.5, 'stroke-dasharray="1.6 2.4"') + line(r3, c.hair, 7.5) + line(r3, c.hairDark, 6.4, 0.5, 'stroke-dasharray="1.6 2.4"') + line(r3, c.hairLight, 1.6, 0.35)
    };
  },
  'Nattes collées': (c, id) => {
    const hairY = (x) => 105 - 35.5 * Math.sqrt(Math.max(0, 1 - ((x - 100) / 37) ** 2));
    const parts = [], braids = [];
    for (let x = 66; x <= 134; x += 8.5) parts.push(`M${P(x, hairY(x) + 2)} Q${P(x + (x - 100) * 0.12, 54)} ${P(100 + (x - 100) * 0.3, 36)}`);
    for (let x = 70.25; x <= 130; x += 8.5) braids.push(`M${P(x, hairY(x) + 1)} Q${P(x + (x - 100) * 0.12, 54)} ${P(100 + (x - 100) * 0.3, 36)}`);
    return {
      front: `<clipPath id="${id}cap"><path d="${CAP}"/></clipPath>` + path(CAP, c.hair)
        + `<g clip-path="url(#${id}cap)">${line(parts.join(' '), c.skinShade, 1.3, 0.8)}${line(braids.join(' '), c.hairLight, 3.6, 0.35, 'stroke-dasharray="2.2 1.6"')}</g>`
    };
  },
  Afro: (c, id) => {
    const out = ell(100, 80, 63, 57, 0, 360, 30);
    const back = `${moveTo(out[0])} ${bumpy(out, 4.6)} Z`;
    const inner = ell(100, 106, 37, 38, 352, 188, 11);
    const front = `M52 124 L52 18 L148 18 L148 124 L137.4 124 L${P(...inner[0])} ${bumpy(inner, 2.6)} L62.6 124 Z`;
    const spots = scatter(100, 74, 56, 48, 60, 9);
    return {
      back: path(back, c.hair) + curls(spots, c.hairDark, 0.45) + curls(spots.filter((_, i) => i % 3 === 0).map(([x, y]) => [x + 3, y - 2]), c.hairLight, 0.3),
      front: `<clipPath id="${id}af"><path d="${back}"/></clipPath><g clip-path="url(#${id}af)">${path(front, c.hair)}${curls(spots.filter(([, y]) => y < 80), c.hairDark, 0.45)}${curls(spots.filter(([, y], i) => y < 70 && i % 3 === 0).map(([x, y]) => [x + 3, y - 2]), c.hairLight, 0.3)}</g>`
        + line(`${moveTo(inner[0])} ${bumpy(inner, 2.6)}`, c.hairDark, 2.4, 0.35)
    };
  },
  Mulet: (c) => ({
    back: path('M63 98 C62 128 63 156 58 178 C72 182 86 182 100 181 C114 182 128 182 142 178 C137 156 138 128 137 98 Z', c.hair)
      + line(both('M64 132 C63 150 62 164 60 176 M70 150 L69 179 M78 160 L78 180'), c.hairDark, 1.2, 0.4),
    front: path('M60.4 112 C56.5 74 66 39 100 37.5 C134 39 143.5 74 139.6 112 L136.6 112 C136.2 94 134 84 129 78 C124 74.5 121 77.6 117 73.6 C112 75.8 108 72.4 104 73.8 C99 71.2 95 74.4 90.5 72.4 C86 75 82 72.8 78 75.8 C74 75.4 71 77.8 69.5 80.4 C66 86 64 95 63.4 112 Z', c.hair)
      + line('M74 60 Q86 48 104 46 M80 70 Q90 58 110 54 M118 50 Q128 56 133 68 M68 78 Q70 64 78 54', c.hairDark, 1.3, 0.45)
      + line('M80 50 Q96 41 116 44', c.hairLight, 3, 0.45)
  }),
  'Mi-long': (c) => ({
    back: path('M59 96 C55 124 55 146 59 160 C66 162 72 157 76 150 L124 150 C128 157 134 162 141 160 C145 146 145 124 141 96 Z', c.hairDark),
    front: path('M100 37 C70 37 57 60 57 92 C57 116 56 138 58 157 C62 160 68 158 71 154 C68 138 66 118 66 100 C66 86 72 74 82 68 C90 64 96 60 100 52 C104 60 110 64 118 68 C128 74 134 86 134 100 C134 118 132 138 129 154 C132 158 138 160 142 157 C144 138 143 116 143 92 C143 60 130 37 100 37 Z', c.hair)
      + line(both('M66 100 C66 120 66 138 64 154 M61 96 C60 120 60 140 61 156 M100 52 C92 60 80 66 74 76 M98 46 C88 50 76 58 70 72'), c.hairDark, 1.2, 0.42)
      + line(both('M86 46 Q72 58 67 80'), c.hairLight, 2.6, 0.45)
  }),
  'Carré': (c) => ({
    back: path('M58 96 C54 124 54 146 60 152 C66 156 72 154 76 148 L124 148 C128 154 134 156 140 152 C146 146 146 124 142 96 Z', c.hairDark),
    front: path('M100 36 C130 36 146 58 146 92 C146 116 145 136 141 150 C137 156 129 156 124.5 152 C130.5 140 133 120 132.4 104 C131.6 90 126.4 80 118 74 C106 66 92 72 82 64 C80 72 74 80 70.4 92 C67 106 68 128 74 150 C70 156 62 156 58 150 C54 136 54 116 54 92 C54 58 70 36 100 36 Z', c.hair)
      + line('M82 64 C84 54 88 46 94 40', c.hairDark, 1.4, 0.6)
      + line('M88 60 Q110 54 128 68 M92 66 Q114 64 132 82 M139 90 C140 110 139 130 134 148 M62 90 C60 110 61 130 66 148 M74 70 C68 82 66 100 66 120', c.hairDark, 1.2, 0.42)
      + line('M96 46 Q114 42 130 54 M70 58 Q62 70 60 88', c.hairLight, 2.8, 0.45)
  }),
  Chignon: (c) => ({
    back: `<circle cx="100" cy="34" r="14" fill="${c.hair}"/>` + line('M90 34 C90 25 108 23 110 33 C111 41 98 43 96 35 C95 31 102 30 103 34', c.hairDark, 1.3, 0.5)
      + line('M92 26 Q100 21 108 26', c.hairLight, 2.4, 0.45),
    front: path(SLICK, c.hair) + line('M86 45.6 Q100 50.6 114 45.6', c.hairDark, 2.6, 0.7)
      + line('M76 72 Q78 56 90 47 M88 66 Q90 54 96 48 M112 66 Q110 54 104 48 M124 72 Q122 56 110 47', c.hairDark, 1.2, 0.4)
      + line('M88 58 Q90 52 95 48', c.hairLight, 2.4, 0.45)
  }),
  Macarons: (c) => ({
    back: `<circle cx="70" cy="44" r="13.5" fill="${c.hair}"/><circle cx="130" cy="44" r="13.5" fill="${c.hair}"/>`
      + line(both('M61 44 C61 36 77 34 79 43 C80 50 68 52 66 45 C65 41 71 40 72 44'), c.hairDark, 1.3, 0.5),
    front: path(SLICK, c.hair) + line('M100 64 L100 38', c.skinShade, 1.4, 0.8)
      + line(both('M76 72 Q76 58 80 52 M88 66 Q88 54 84 50 M96 65 Q96 52 92 46'), c.hairDark, 1.2, 0.4)
      + line(both('M90 56 Q88 50 84 47'), c.hairLight, 2.2, 0.45)
  }),
  'Queue de cheval': (c) => ({
    front: path(SLICK, c.hair) + path(SIDEBURNS, c.hair)
      + line('M74 74 Q76 56 90 44 M86 66 Q88 52 100 42 M100 64 Q104 50 114 44 M114 66 Q120 56 128 56 M126 74 Q130 66 136 66', c.hairDark, 1.2, 0.4)
      + line('M90 56 Q94 48 102 44', c.hairLight, 2.6, 0.45),
    back: path('M122 56 C146 62 158 96 155 132 C153 156 148 172 141 184 C137 172 139 156 139 136 C139 112 134 88 118 66 Z', c.hair)
      + line('M146 92 C151 110 151 134 147 160 M140 84 C146 104 147 130 143 168', c.hairDark, 1.2, 0.45)
      + line('M150 104 C153 120 152 136 150 150', c.hairLight, 2.4, 0.4)
  }),
  Locks: (c, id) => {
    const back = [];
    for (let x = 50; x <= 150; x += 7.5) { if (x > 64 && x < 136) continue; back.push(`M${P(x < 100 ? x + 6 : x - 6, 72)} C${P(x, 100)} ${P(x - (100 - x) * 0.06, 140)} ${P(x - (100 - x) * 0.1, 172 + (Math.round(x) % 3) * 6)}`); }
    const hairY = (x) => 106 - 36 * Math.sqrt(Math.max(0, 1 - ((x - 100) / 38) ** 2));
    const roots = []; for (let x = 66; x <= 134; x += 7) roots.push(`M${P(x, hairY(x) + 1)} Q${P(x + (x - 100) * 0.1, 56)} ${P(100 + (x - 100) * 0.35, 38)}`);
    const side = both('M67 74 C61 92 59 130 58 172 M62 84 C56 106 54 140 53 182');
    const lock = (d, w = 7.2) => line(d, c.hair, w) + line(d, c.hairDark, w - 1, 0.4, 'stroke-dasharray="1.4 3"') + line(d, c.hairLight, 1.3, 0.3, 'transform="translate(-1.4 0)"');
    const bk = back.join(' ');
    return {
      back: line(bk, c.hairDark, 7.6) + line(bk, '#000', 6.4, 0.18, 'stroke-dasharray="1.4 3"'),
      front: `<clipPath id="${id}cap"><path d="${CAP}"/></clipPath>` + path(CAP, c.hair)
        + `<g clip-path="url(#${id}cap)">${line(roots.join(' '), c.hairDark, 1.4, 0.6)}${line(roots.join(' '), c.hairLight, 2.4, 0.22, 'stroke-dasharray="2 2.6" transform="translate(3.5 0)"')}</g>`,
      over: lock(side)
    };
  },
  'Long lisse': (c) => ({
    back: path('M57 92 C52 130 52 170 50 205 L150 205 C148 170 148 130 143 92 Z', c.hairDark),
    front: path('M100 36 C68 36 55.5 62 55.5 96 C55.5 112 55 126 54.6 140 L66.4 140 C66.2 124 66 112 66 100 C66 86 72 74 82 67 C90 62 96 57 100 50 C104 57 110 62 118 67 C128 74 134 86 134 100 C134 112 133.8 124 133.6 140 L145.4 140 C145 126 144.5 112 144.5 96 C144.5 62 132 36 100 36 Z', c.hair)
      + line(both('M100 50 C92 58 80 64 74 74 M98 44 C86 48 74 58 69 74'), c.hairDark, 1.2, 0.42)
      + line(both('M86 45 Q72 56 66 78'), c.hairLight, 2.6, 0.45),
    over: path(both('M54.6 138 C54 162 52 184 49 202 C55 205 62 205 68 202 C67 184 66.6 162 66.4 138 Z'), c.hair)
      + line(both('M60 120 C60 150 58 176 56 200 M64 140 C63 164 63 184 62 202'), c.hairDark, 1.2, 0.42)
  }),
  'Long ondulé': (c) => {
    const left = 'M55.5 96 C55 112 61 124 57 140 C53 156 61 170 55 186 C53 194 52 200 50 204 C56 206 63 206 69 202 C67 192 72 180 69 166 C66 152 72 140 69 124 C67 114 66 106 66 100';
    return {
      back: path('M57 92 C50 130 54 170 48 205 L152 205 C146 170 150 130 143 92 Z', c.hairDark),
      front: path('M100 36 C68 36 55.5 62 55.5 96 L66 100 C66 86 72 74 82 67 C90 62 96 57 100 50 C104 57 110 62 118 67 C128 74 134 86 134 100 L144.5 96 C144.5 62 132 36 100 36 Z', c.hair)
        + line(both('M100 50 C92 58 80 64 74 74 M98 44 C86 48 74 58 69 74'), c.hairDark, 1.2, 0.42)
        + line(both('M86 45 Q72 56 66 78'), c.hairLight, 2.6, 0.45),
      over: path(`${left} Z ${mirror(left)} Z`, c.hair)
        + line(both('M61 104 C60 116 64 126 61 140 C58 154 64 168 60 182 C59 190 58 196 57 202 M65 132 C62 146 67 158 64 172'), c.hairDark, 1.2, 0.45)
        + line(both('M59 112 Q61 124 58 134 M58 160 Q61 170 58 180'), c.hairLight, 2.2, 0.4)
    };
  },
  'Frisé long': (c, id) => {
    const out = ell(100, 108, 66, 80, 158, 382, 28);
    const back = `${moveTo(out[0])} ${bumpy(out, 4.8)} L${P(out[out.length - 1][0], 206)} L${P(out[0][0], 206)} Z`;
    const top = ell(100, 98, 45, 62, 196, 344, 13), inner = ell(100, 106, 36, 37, 352, 188, 11);
    const cap = `M58 112 L${P(...top[0])} ${bumpy(top, 3.6)} L142 112 L137 112 L${P(...inner[0])} ${bumpy(inner, 2.6)} L63 112 Z`;
    const curtainL = [[63, 84], [57, 104], [55, 128], [53, 152], [52, 176], [52, 200], [62, 201], [66, 178], [66.5, 154], [66.5, 130], [65.5, 108]];
    const cur = `${moveTo(curtainL[0])} ${bumpy(curtainL, 2.8)} Z`;
    const spots = scatter(100, 120, 60, 76, 70, 13);
    return {
      back: path(back, mix(c.hair, c.hairDark, 0.55)) + curls(spots, '#000', 0.22) + curls(spots.filter((_, i) => i % 3 === 0), c.hairLight, 0.25),
      front: path(cap, c.hair) + curls(scatter(100, 62, 34, 20, 22, 6), c.hairDark, 0.5) + curls(scatter(100, 58, 30, 14, 8, 2), c.hairLight, 0.35),
      over: path(`${cur} ${mirror(cur)}`, c.hair) + curls(scatter(59, 150, 6, 46, 14, 8).flatMap(([x, y]) => [[x, y], [200 - x, y + 3]]), c.hairDark, 0.5)
    };
  }
};

/* ---------- buste ---------- */
function bodySVG(a, c, id) {
  const b = BUILD[a.build] || BUILD.Normale, W = b.W, nw = b.nw;
  const L = (v) => 100 - v, R = (v) => 100 + v;
  const top = AV.top.includes(a.top) ? a.top : 'T-shirt';
  const col = (AV.topColor[a.topColor] || AV.topColor[0]).hex;
  const dark = mix(col, '#000000', 0.22), light = mix(col, '#ffffff', 0.2);
  const ink = lum(col) < 0.35 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)';
  const neck = `<linearGradient id="${id}nk" x1="0" y1="138" x2="0" y2="176" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.skinDeep}"/><stop offset=".45" stop-color="${c.skinShade}"/><stop offset="1" stop-color="${c.skinShade}"/></linearGradient>`
    + path(`M${P(L(nw), 132)} C${P(L(nw), 150)} ${P(L(nw + 1), 162)} ${P(L(nw + 2), 176)} L${P(R(nw + 2), 176)} C${P(R(nw + 1), 162)} ${P(R(nw), 150)} ${P(R(nw), 132)} Z`, `url(#${id}nk)`);
  const shoulders = (nl) => `M${P(L(W + 3), 202)} C${P(L(W + 2), 186)} ${P(L(W - 4), 174)} ${P(L(nw + 18), 168.5)} L${P(L(nw + 6), 166)} ${nl} L${P(R(nw + 6), 166)} L${P(R(nw + 18), 168.5)} C${P(R(W - 4), 174)} ${P(R(W + 2), 186)} ${P(R(W + 3), 202)} Z`;
  const shade = `<linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".25" stop-color="#fff" stop-opacity=".06"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>`;
  const seams = line(`M${P(L(W - 12), 171)} C${P(L(W - 8), 182)} ${P(L(W - 6), 192)} ${P(L(W - 6), 202)} M${P(R(W - 12), 171)} C${P(R(W - 8), 182)} ${P(R(W - 6), 192)} ${P(R(W - 6), 202)}`, ink, 1);
  let behind = '', body = '', front = '';
  if (top === 'Sweat à capuche') {
    behind = path(`M${P(L(nw + 24), 176)} C${P(L(nw + 24), 158)} ${P(L(nw + 10), 152)} 100 152 C${P(R(nw + 10), 152)} ${P(R(nw + 24), 158)} ${P(R(nw + 24), 176)} Z`, dark);
    const nl = `Q${P(100, 186)} ${P(R(nw + 6), 166)}`;
    body = path(shoulders(nl), col) + path(shoulders(nl), `url(#${id}sh)`) + seams
      + path(`M${P(L(nw + 8), 165)} Q100 190 ${P(R(nw + 8), 165)} Q${P(R(nw + 14), 172)} ${P(R(nw + 4), 178)} Q100 196 ${P(L(nw + 4), 178)} Q${P(L(nw + 14), 172)} ${P(L(nw + 8), 165)} Z`, light)
      + line(`M${P(L(nw + 8), 165)} Q100 190 ${P(R(nw + 8), 165)}`, ink, 1.2);
    front = line('M94 184 L93 199 M106 184 L107 199', light, 1.6) + line('M93 199 L92.8 202 M107 199 L107.2 202', '#C9CCD1', 2.4);
  } else if (top === 'Col roulé') {
    body = path(shoulders(`Q${P(100, 172)} ${P(R(nw + 6), 166)}`), col) + path(shoulders(`Q${P(100, 172)} ${P(R(nw + 6), 166)}`), `url(#${id}sh)`) + seams;
    const tube = `M${P(L(nw + 3), 146)} Q100 152 ${P(R(nw + 3), 146)} L${P(R(nw + 5), 172)} Q100 179 ${P(L(nw + 5), 172)} Z`;
    body += path(tube, col) + path(tube, `url(#${id}sh)`);
    const ribs = []; for (let x = -nw; x <= nw; x += 3.2) ribs.push(`M${P(100 + x * 1.08, 150 + Math.abs(x) * 0.02)} L${P(100 + x * 1.18, 175)}`);
    body += line(ribs.join(' '), ink, 0.9) + line(`M${P(L(nw + 4), 160)} Q100 166 ${P(R(nw + 4), 160)}`, ink, 1.1);
  } else if (top === 'Chemise') {
    const nl = `L100 190`;
    body = path(shoulders(`L100 186 L${P(R(nw + 6), 166)}`), col) + path(shoulders(nl), `url(#${id}sh)`) + seams;
    body += path(`M${P(L(nw + 6), 165)} L100 186 L${P(L(nw - 2), 186)} L${P(L(nw + 14), 174)} Z`, light) + path(mirror(`M${P(L(nw + 6), 165)} L100 186 L${P(L(nw - 2), 186)} L${P(L(nw + 14), 174)} Z`), light);
    body += line(`M${P(L(nw + 6), 165)} L100 186 L${P(R(nw + 6), 165)} M${P(L(nw + 6), 165)} L${P(L(nw + 14), 174)} L${P(L(nw - 2), 186)} M${P(R(nw + 6), 165)} L${P(R(nw + 14), 174)} L${P(R(nw - 2), 186)} M100 186 L100 202`, ink, 1.1);
    body += `<circle cx="100" cy="194" r="1.4" fill="${ink}"/>`;
  } else {
    const nl = `Q${P(100, 181)} ${P(R(nw + 6), 166)}`;
    body = path(shoulders(nl), col) + path(shoulders(nl), `url(#${id}sh)`) + seams
      + line(`M${P(L(nw + 6), 166)} ${nl}`, dark, 3.2) + line(`M${P(L(nw + 6), 167.8)} Q${P(100, 183.4)} ${P(R(nw + 6), 167.8)}`, ink, 0.8);
  }
  return { behind, neck, body: shade + body, front };
}

/* ---------- lunettes, boucles d'oreilles, détails ---------- */
function glassesSVG(a, c) {
  const g = a.glasses; if (!g || g === 'Aucunes') return '';
  const metal = (AV.metal[a.metal] || AV.metal[0]).hex;
  const acetate = '#1F1B19';
  const frame = { Rondes: acetate, 'Carrées': acetate, Fines: metal, Aviateur: metal, Soleil: acetate, 'Soleil rondes': metal }[g];
  const w = { Fines: 1.2, Aviateur: 1.2, 'Soleil rondes': 1.4 }[g] || 2.2;
  const sun = g.startsWith('Soleil') || g === 'Aviateur';
  const lens = (x) => {
    if (g === 'Rondes' || g === 'Soleil rondes') return `M${P(x - 10, 104)} a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z`;
    if (g === 'Aviateur') return `M${P(x - 11, 98)} Q${P(x, 96)} ${P(x + 11, 98)} Q${P(x + 12, 108)} ${P(x + 4, 113)} Q${P(x, 115)} ${P(x - 5, 112)} Q${P(x - 12, 106)} ${P(x - 11, 98)} Z`;
    if (g === 'Fines') return `M${P(x - 11, 98.5)} L${P(x + 11, 98.5)} Q${P(x + 11.5, 110)} ${P(x + 8, 110)} L${P(x - 8, 110)} Q${P(x - 11.5, 110)} ${P(x - 11, 98.5)} Z`;
    return `M${P(x - 11.5, 97)} L${P(x + 11.5, 97)} Q${P(x + 12, 112)} ${P(x + 8, 112)} L${P(x - 8, 112)} Q${P(x - 12, 112)} ${P(x - 11.5, 97)} Z`;
  };
  const lenses = lens(85) + ' ' + lens(115);
  const tint = sun ? (g === 'Aviateur' ? `fill="#5A4632" fill-opacity=".55"` : `fill="#141414" fill-opacity=".86"`) : `fill="#fff" fill-opacity=".1"`;
  const bridge = g === 'Aviateur' ? 'M95.6 100 Q100 98 104.4 100 M96 97.6 Q100 96 104 97.6' : g.includes('ondes') ? 'M95 102 Q100 98.5 105 102' : 'M96.5 100 Q100 98 103.5 100';
  return `<path d="${lenses}" ${tint}/>`
    + line(`M73 ${sun ? 100 : 101} L62 99 M127 ${sun ? 100 : 101} L138 99`, frame, Math.max(1.2, w * 0.8))
    + `<path d="${lenses}" fill="none" stroke="${frame}" stroke-width="${w}" stroke-linejoin="round"/>`
    + line(bridge, frame, w)
    + line(`M${P(78, 100)} L${P(82, 97.6)} M${P(108, 100)} L${P(112, 97.6)}`, '#fff', 1.4, sun ? 0.5 : 0.35);
}
function earSVG(f, c, a) {
  const ear = (s) => {
    const x = 100 + s * f.sw;
    return path(`M${P(x - s * 1.5, 98)} C${P(x + s * 9, 92)} ${P(x + s * 11, 116)} ${P(x + s * 1, 122)} C${P(x - s * 1, 121)} ${P(x - s * 2, 112)} ${P(x - s * 1.5, 98)} Z`, c.skin)
      + line(`M${P(x + s * 1.5, 101)} C${P(x + s * 6.5, 99)} ${P(x + s * 7.5, 112)} ${P(x + s * 2.4, 116)}`, c.skinShade, 1.3, 0.7);
  };
  const metal = (AV.metal[a.metal] || AV.metal[0]).hex;
  const jewel = (s) => {
    const x = 100 + s * (f.sw + 2.4);
    if (a.earrings.includes('nneau')) return `<circle cx="${f1(x)}" cy="123.6" r="3.6" fill="none" stroke="${metal}" stroke-width="1.5"/>`;
    return `<circle cx="${f1(x)}" cy="119.6" r="1.9" fill="${metal}"/><circle cx="${f1(x - 0.6)}" cy="119" r=".6" fill="#fff" opacity=".8"/>`;
  };
  let out = ear(-1) + ear(1);
  if (a.earrings && a.earrings !== 'Aucune') out += jewel(1) + (a.earrings.startsWith('Deux') ? jewel(-1) : '');
  return out;
}
function marksSVG(a, c, id) {
  const m = new Set(a.marks || []);
  let out = '';
  if (m.has('Joues rosées')) out += `<radialGradient id="${id}bl"><stop offset="0" stop-color="#F07C6C" stop-opacity=".38"/><stop offset="1" stop-color="#F07C6C" stop-opacity="0"/></radialGradient><ellipse cx="78" cy="123" rx="10" ry="6.5" fill="url(#${id}bl)"/><ellipse cx="122" cy="123" rx="10" ry="6.5" fill="url(#${id}bl)"/>`;
  if (m.has('Cernes')) out += line('M78 110.6 Q85 113.6 92 110.6 M108 110.6 Q115 113.6 122 110.6', c.skinDeep, 1.4, 0.35);
  if (m.has('Taches de rousseur')) out += scatter(100, 118, 25, 6, 30, 21).filter(([x]) => Math.abs(x - 100) > 3).map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r=".75" fill="${c.skinDeep}" opacity=".55"/>`).join('');
  if (m.has('Grain de beauté')) out += `<circle cx="118.6" cy="131" r="1.25" fill="#3A2418" opacity=".85"/>`;
  if (m.has('Fossettes')) out += line('M84.6 140.4 Q85.4 142.4 84.8 144 M115.4 140.4 Q114.6 142.4 115.2 144', c.skinShade, 1, 0.6);
  return out;
}

/* ---------- assemblage ---------- */
export const AV_VIEWS = {
  portrait: '20 24 160 160',   // tête et épaules (profil, amis)
  full: '0 0 200 200',
  head: '30 18 140 140',       // vignettes de coiffure, visage
  lower: '64 104 72 72',       // vignettes de barbe, bouche, moustache
  eyes: '66 78 68 40',         // vignettes d'yeux, sourcils, lunettes (format large)
  ears: '40 70 120 72',
  nose: '74 108 52 34',          // vignettes de nez
  cheek: '56 90 88 56',         // vignettes de détails (taches de rousseur, joues…)
  bust: '0 60 200 140'
};

export function avatarSVG(raw, { size = 64, view = 'portrait', label, noBg } = {}) {
  const a = normalizeAvatar(raw);
  const id = `av${++uid}`;
  const sk = AV.skin[a.skin] || AV.skin[2];
  const hairHex = (AV.hair[a.hair] || AV.hair[0]).hex, eyeHex = (AV.eye[a.eye] || AV.eye[0]).hex;
  const lightHair = lum(hairHex) > 0.55;
  const c = {
    skin: sk.hex, skinShade: sk.dark, skinDeep: mix(sk.dark, '#2A140C', 0.28),
    lip: mix(sk.lip, sk.hex, 0.18), lipDark: mix(sk.lip, '#2A140C', 0.35),
    hair: hairHex, hairDark: mix(hairHex, '#000000', lightHair ? 0.3 : 0.38), hairLight: mix(hairHex, '#ffffff', lightHair ? 0.4 : 0.26),
    brow: mix(hairHex, '#2A1D16', lightHair ? 0.4 : 0.15),
    eye: eyeHex, eyeDark: mix(eyeHex, '#000000', 0.45), lash: mix('#1E1714', hairHex, 0.15)
  };
  const f = faceGeom(a);
  const hs = (HAIR[a.hairStyle] || HAIR.Court)(c, id);
  const sx = f.sw / 38, hairTf = `transform="translate(100 0) scale(${f1(sx * 100) / 100} 1) translate(-100 0)"`;
  const bd = bodySVG(a, c, id);
  const face = faceOutline(f);
  const bgEntry = AV.bg[a.bg] || AV.bg[0];
  const vb = AV_VIEWS[view] || view;
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  const [vx, vy, vw, vh] = vb.split(' ').map(Number);
  const h = Math.round((size * vh) / vw);
  return `<svg ${a11y} width="${size}" height="${h}" viewBox="${vb}" class="av-svg">
  <defs><radialGradient id="${id}fs" cx="50%" cy="42%" r="62%"><stop offset=".62" stop-color="${c.skinShade}" stop-opacity="0"/><stop offset="1" stop-color="${c.skinShade}" stop-opacity=".75"/></radialGradient>
  <clipPath id="${id}fc"><path d="${face}"/></clipPath></defs>
  ${noBg ? '' : `<rect x="${vx - 1}" y="${vy - 1}" width="${vw + 2}" height="${vh + 2}" fill="${bgEntry.hex}"/>`}
  ${hs.back ? `<g ${hairTf}>${hs.back}</g>` : ''}
  ${bd.behind}${bd.neck}
  ${path(`M${P(100 - f.jw, f.jy - 4)} Q100 ${f1(f.cy + 16)} ${P(100 + f.jw, f.jy - 4)} Z`, c.skinDeep, 'opacity=".45"')}
  ${bd.body}${bd.front}
  ${earSVG(f, c, a)}
  ${path(face, c.skin)}${path(face, `url(#${id}fs)`)}
  ${marksSVG(a, c, id)}
  ${beardSVG(a, f, c, id)}
  ${eyeSVG(85, -1, a, c, id)}${eyeSVG(115, 1, a, c, id)}
  ${browSVG(85, -1, a, c)}${browSVG(115, 1, a, c)}
  ${noseSVG(a, c)}
  ${mouthSVG(a, c)}
  ${moustacheSVG(a, c)}
  ${hs.front ? `<g ${hairTf}>${hs.front}</g>` : ''}
  ${hs.over ? `<g ${hairTf}>${hs.over}</g>` : ''}
  ${glassesSVG(a, c)}
</svg>`;
}

// Compatibilité : ancienne signature faceSVG(avatar, taille, viewBox, libellé).
export function faceSVG(avatar, size, view = 'portrait', label) {
  return avatarSVG(avatar, { size, view, label });
}

// Avatar tiré au hasard (bouton « Au hasard » de l'éditeur), avec des combinaisons crédibles.
export function randomAvatar(prev = {}) {
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const idx = (l) => Math.floor(Math.random() * l.length);
  const natural = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11];
  const a = {
    ...prev, skin: idx(AV.skin), hair: Math.random() < 0.85 ? pick(natural) : idx(AV.hair), eye: idx(AV.eye),
    hairStyle: pick(AV.hairStyle), faceShape: pick(AV.faceShape), eyeShape: pick(AV.eyeShape), eyeSize: pick(AV.eyeSize),
    brows: pick(AV.brows), nose: pick(AV.nose), mouth: pick(AV.mouth),
    beard: Math.random() < 0.5 ? 'Aucune' : pick(AV.beard), moustache: Math.random() < 0.75 ? 'Aucune' : pick(AV.moustache),
    glasses: Math.random() < 0.65 ? 'Aucunes' : pick(AV.glasses), earrings: Math.random() < 0.65 ? 'Aucune' : pick(AV.earrings),
    marks: AV.marks.filter(() => Math.random() < 0.15), metal: idx(AV.metal), build: pick(AV.build),
    top: pick(AV.top), topColor: idx(AV.topColor), bg: idx(AV.bg)
  };
  return a;
}
