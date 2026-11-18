// Visuels « produit » des pièces sans photo : vêtements posés à plat, aux vraies proportions,
// avec texture de tissu (sergé, côtes, molleton, matelassage, cuir), coutures, ombrage et ombre portée.
// Chaque catégorie a son propre cadre (viewBox) pour que les proportions restent réalistes :
// un jean est long et fin, une paire de chaussures est large et basse, etc.
import { safeColor, isDark } from './catalog.js';

let uid = 0;
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (hex, f) => rgbToHex(hexToRgb(hex).map((v) => (f < 1 ? v * f : v + (255 - v) * (f - 1))));
const lum = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// Matière selon le type de pièce
const MATERIAL = {
  'T-shirt': 'jersey', Pull: 'knit', Sweat: 'fleece', Chemise: 'poplin', Veste: 'wool',
  Jean: 'denim', Pantalon: 'twill', Chino: 'twill', Jogging: 'fleece', Cargo: 'canvas',
  Blouson: 'leather', Manteau: 'wool', Doudoune: 'puffer', 'Coupe-vent': 'nylon',
  Baskets: 'leather', Running: 'mesh', Ville: 'leather', Bottines: 'suede'
};

/* ---------- textures (motifs et bruit) ---------- */
function defs(id, mat, hex) {
  const light = lum(hex) > 0.55, ink = light ? '0,0,0' : '255,255,255';
  const noise = { jersey: '0.9', knit: '1.4 0.35', fleece: '0.7', poplin: '1.2', wool: '0.55', denim: '1.1', twill: '1.3', canvas: '0.95', leather: '0.6', puffer: '0.8', nylon: '1.6', mesh: '1.8', suede: '0.5' }[mat] || '0.9';
  const nAlpha = ({ fleece: 0.22, wool: 0.26, suede: 0.3, knit: 0.2, denim: 0.28, canvas: 0.22 }[mat] || 0.14) * (light ? 1 : 0.55);
  const pattern = {
    denim: `<pattern id="p${id}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-62)"><rect width="3" height="3" fill="none"/><path d="M0 0.5H3" stroke="rgba(255,255,255,.16)" stroke-width="1"/><path d="M0 2H3" stroke="rgba(0,0,0,.14)" stroke-width=".7"/></pattern>`,
    twill: `<pattern id="p${id}" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 1.1H2.2" stroke="rgba(${ink},.07)" stroke-width=".7"/></pattern>`,
    knit: `<pattern id="p${id}" width="3.4" height="4" patternUnits="userSpaceOnUse"><path d="M0.8 0V4" stroke="rgba(0,0,0,.13)" stroke-width="1.1"/><path d="M2.5 0V4" stroke="rgba(255,255,255,.1)" stroke-width=".8"/></pattern>`,
    canvas: `<pattern id="p${id}" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 1.2H2.4M1.2 0V2.4" stroke="rgba(${ink},.06)" stroke-width=".7"/></pattern>`,
    mesh: `<pattern id="p${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".7" fill="rgba(0,0,0,.18)"/></pattern>`,
    poplin: `<pattern id="p${id}" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><path d="M0 .8H1.6" stroke="rgba(${ink},.05)" stroke-width=".5"/></pattern>`
  }[mat] || '';
  return `<defs>
    <filter id="s${id}" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#000" flood-opacity=".2"/></filter>
    <filter id="n${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${noise}" numOctaves="3" seed="${id % 97}"/><feColorMatrix values="0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  0 0 0 ${nAlpha * 2.2} -${nAlpha * 0.9}"/></filter>
    <filter id="b${id}"><feGaussianBlur stdDeviation="2.2"/></filter>
    <linearGradient id="gx${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="gy${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>
    <linearGradient id="sh${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${light ? 0.12 : 0.09}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    ${pattern}
  </defs>`;
}
// Pièce de tissu : couleur, motif, bruit, ombrage, le tout découpé à la forme
function cloth(id, d, hex, mat, extra = '', decor = '') {
  return `<clipPath id="c${id}"><path d="${d}"/></clipPath>
  <g filter="url(#s${id})"><path d="${d}" fill="${hex}"/></g>
  <g clip-path="url(#c${id})">
    ${['denim', 'twill', 'knit', 'canvas', 'mesh', 'poplin'].includes(mat) ? `<rect width="100%" height="100%" fill="url(#p${id})"/>` : ''}
    <rect width="100%" height="100%" filter="url(#n${id})"/>
    ${decor}
    <rect width="100%" height="100%" fill="url(#gx${id})"/><rect width="100%" height="100%" fill="url(#gy${id})"/>
    ${mat === 'leather' || mat === 'nylon' ? `<rect x="22%" y="0" width="14%" height="100%" fill="url(#sh${id})" transform="skewX(-12)"/><rect x="66%" y="0" width="8%" height="100%" fill="url(#sh${id})" opacity=".6" transform="skewX(-12)"/>` : ''}
    ${extra}
  </g>`;
}
const fold = (id, d, light = false) => `<path d="${d}" fill="none" stroke="${light ? '#fff' : '#000'}" stroke-opacity="${light ? 0.16 : 0.14}" stroke-width="3" stroke-linecap="round" filter="url(#b${id})"/>`;
const stitch = (d, c, w = 0.9) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="2.4 1.6" stroke-linecap="round"/>`;
const line = (d, c, w = 1.2, o = 1) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const wrap = (vb, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

/* ---------- hauts et vestes (cadre 200 × 200, manteau 200 × 290) ---------- */
function top(it, id, hex, mat, decor = '') {
  const t = it.type, fit = it.fit || 'Regular', w = { 'Ajusté': -6, Regular: 0, Ample: 10 }[fit] || 0;
  const L = 44 - w, R = 156 + w, dk = shade(hex, 0.72), st = shade(hex, lum(hex) > 0.5 ? 0.7 : 1.45);
  const cuff = (x1, x2, y) => line(`M${x1} ${y} L${x2} ${y + 2}`, dk, 1.1, 0.8);
  let d, out = '';
  if (t === 'T-shirt') {
    d = `M72 26 Q100 44 128 26 L${R + 2} 36 L194 70 L${R + 18} 94 L${R} 84 L${R} 192 Q100 196 ${L} 192 L${L} 84 L${200 - R - 18} 94 L6 70 L${L - 2} 36 Z`;
    out += line('M72 26 Q100 50 128 26', dk, 3.2, 0.55) + line('M70 25 Q100 54 130 25', st, 0.8, 0.6);
    out += stitch(`M${L + 2} 187 Q100 191 ${R - 2} 187`, st) + stitch(`M10 72 L${200 - R - 16} 91`, st) + stitch(`M190 72 L${R + 16} 91`, st);
    out += fold(id, `M${L + 18} 70 Q${L + 26} 130 ${L + 16} 180`) + fold(id, `M${R - 22} 100 Q${R - 30} 150 ${R - 18} 182`) + fold(id, 'M96 60 Q104 120 98 176', true);
  } else {
    // manches longues (pull, sweat, chemise, veste)
    d = `M72 24 Q100 40 128 24 L${R + 2} 32 Q${R + 22} 40 ${R + 28} 62 L198 172 L176 178 L${R + 2} 92 L${R} 194 L${L} 194 L${200 - R - 2} 92 L24 178 L2 172 L${200 - R - 28} 62 Q${200 - R - 22} 40 ${L - 2} 32 Z`;
    out += fold(id, `M${L + 16} 76 Q${L + 24} 136 ${L + 14} 186`) + fold(id, `M${R - 20} 100 Q${R - 28} 150 ${R - 16} 188`) + fold(id, 'M96 60 Q104 120 98 180', true);
    out += fold(id, `M${200 - R - 18} 90 Q${200 - R - 26} 130 18 168`) + fold(id, `M${R + 18} 90 Q${R + 26} 130 182 168`);
    if (t === 'Pull' || t === 'Sweat') {
      out += `<path d="M${L} 180 L${R} 180 L${R} 194 L${L} 194 Z" fill="${dk}" opacity=".35"/>`;
      out += `<path d="M2 172 L24 178 L27 164 L5 158 Z M198 172 L176 178 L173 164 L195 158 Z" fill="${dk}" opacity=".35"/>`;
      out += line('M72 24 Q100 48 128 24', dk, 5, 0.45);
    }
    if (t === 'Sweat') {
      out += `<path d="M70 98 L130 98 L140 146 L60 146 Z" fill="${dk}" opacity=".18"/>` + stitch('M71 101 L129 101 L137 143 L63 143 Z', st);
      out += line('M93 40 L91 76 M107 40 L109 76', shade(hex, 0.6), 1.6, 0.8) + `<circle cx="91" cy="78" r="2" fill="${shade(hex, 0.55)}"/><circle cx="109" cy="78" r="2" fill="${shade(hex, 0.55)}"/>`;
    }
    if (t === 'Chemise') {
      out += `<path d="M72 24 L88 46 L100 32 L112 46 L128 24 L118 20 L100 28 L82 20 Z" fill="${shade(hex, 1.06)}" stroke="${dk}" stroke-width=".8"/>`;
      out += line('M100 32 L100 194', dk, 0.9, 0.6) + line('M104 34 L104 194', dk, 0.9, 0.4);
      for (let y = 52; y < 190; y += 24) out += `<circle cx="102" cy="${y}" r="2.1" fill="${shade(hex, 0.85)}" stroke="${dk}" stroke-width=".5"/>`;
      out += stitch(`M${L + 14} 62 L${L + 38} 62 L${L + 38} 88 L${L + 14} 88 Z`, st);
      out += cuff(4, 24, 162) + cuff(176, 196, 164);
    }
    if (t === 'Veste') out += lapels(hex, dk);
  }
  return cloth(id, d, hex, mat, out, decor);
}
function lapels(hex, dk) {
  return `<path d="M72 24 L100 104 L128 24 L118 20 L100 80 L82 20 Z" fill="${shade(hex, 0.9)}" stroke="${dk}" stroke-width=".8"/>
    <path d="M100 104 L100 194" stroke="${dk}" stroke-width="1" opacity=".6"/>
    <circle cx="100" cy="128" r="2.6" fill="${dk}"/><circle cx="100" cy="156" r="2.6" fill="${dk}"/>`;
}
function jacket(it, id, hex, mat, decor = '') {
  const t = it.type, long = t === 'Manteau', H = long ? 280 : 196, w = { 'Ajusté': -4, Regular: 2, Ample: 12 }[it.fit] || 2;
  const L = 40 - w, R = 160 + w, dk = shade(hex, 0.7), st = shade(hex, lum(hex) > 0.5 ? 0.7 : 1.5);
  const d = `M70 22 Q100 34 130 22 L${R + 4} 30 Q${R + 26} 40 ${R + 30} 64 L198 ${long ? 214 : 176} L174 ${long ? 220 : 182} L${R + 4} 96 L${R + (long ? 8 : 0)} ${H} L${L - (long ? 8 : 0)} ${H} L${200 - R - 4} 96 L26 ${long ? 220 : 182} L2 ${long ? 214 : 176} L${200 - R - 30} 64 Q${200 - R - 26} 40 ${L - 4} 30 Z`;
  let out = fold(id, `M${L + 16} 80 Q${L + 24} ${H * 0.6} ${L + 14} ${H - 8}`) + fold(id, `M${R - 18} 100 Q${R - 26} ${H * 0.65} ${R - 14} ${H - 8}`);
  out += fold(id, `M${200 - R - 20} 96 Q${200 - R - 28} 140 20 ${long ? 204 : 170}`) + fold(id, `M${R + 20} 96 Q${R + 28} 140 180 ${long ? 204 : 170}`);
  if (t === 'Doudoune') {
    for (let y = 44; y < H; y += 26) out += `<path d="M0 ${y} H200" stroke="${shade(hex, 0.62)}" stroke-width="2.4" opacity=".7"/><rect x="0" y="${y - 22}" width="200" height="10" fill="#fff" opacity=".1" filter="url(#b${id})"/>`;
    out += line(`M100 30 L100 ${H}`, shade(hex, 0.5), 2.4, 0.9) + `<rect x="97" y="40" width="6" height="12" rx="2" fill="#C9C9C6"/>`;
  } else if (t === 'Blouson') {
    out += `<path d="M${L} ${H - 16} L${R} ${H - 16} L${R} ${H} L${L} ${H} Z" fill="${dk}" opacity=".55"/>` + `<path d="M2 176 L26 182 L29 168 L5 162 Z M198 176 L174 182 L171 168 L195 162 Z" fill="${dk}" opacity=".55"/>`;
    out += `<path d="M70 22 Q100 40 130 22 L126 32 Q100 48 74 32 Z" fill="${dk}" opacity=".6"/>` + line(`M100 38 L100 ${H}`, '#B9B9B5', 1.8, 0.9);
    out += stitch(`M${L + 14} 110 L${L + 40} 104 M${R - 14} 110 L${R - 40} 104`, st, 1.1);
  } else if (t === 'Coupe-vent') {
    out += `<path d="M64 24 Q100 -6 136 24 Q100 14 64 24 Z" fill="${dk}" opacity=".5"/>` + line(`M100 26 L100 ${H}`, shade(hex, 0.55), 1.8, 0.9);
    out += `<path d="M${L + 8} 116 L${L + 44} 116 M${R - 8} 116 L${R - 44} 116" stroke="${shade(hex, 0.6)}" stroke-width="1.6"/>`;
  } else {
    out += lapels(hex, dk);
    if (long) out += `<circle cx="112" cy="212" r="2.8" fill="${dk}"/><circle cx="88" cy="212" r="2.8" fill="${dk}"/><path d="M${L + 4} 150 L${R - 4} 150" stroke="${dk}" stroke-width="7" opacity=".35"/>`;
    out += stitch(`M${L + 12} 150 L${L + 46} 150 M${R - 12} 150 L${R - 46} 150`, st, 1.1);
  }
  return { svg: cloth(id, d, hex, mat, out, decor), vb: `0 0 200 ${H + 6}` };
}

/* ---------- bas (cadre 120 × 270) ---------- */
function bottom(it, id, hex, mat) {
  const t = it.type, fit = it.fit || 'Regular';
  const hem = { 'Ajusté': 16, Regular: 21, Ample: 29 }[fit] || 21, thigh = { 'Ajusté': 2, Regular: 4, Ample: 9 }[fit] || 4;
  const jog = t === 'Jogging', bot = 262, cuffW = jog ? Math.min(hem, 15) : hem;
  const lx = 14 - thigh, rx = 106 + thigh, inL = 58 - cuffW * 0.1, inR = 62 + cuffW * 0.1;
  const d = `M16 8 L104 8 L${rx} 92 L${60 + 4 + cuffW * 1.6} ${bot} L${inR + 2} ${bot} L62 100 L58 100 L${inL - 2} ${bot} L${60 - 4 - cuffW * 1.6} ${bot} L${lx} 92 Z`;
  const dk = shade(hex, 0.7), st = t === 'Jean' ? '#C98A3A' : shade(hex, lum(hex) > 0.5 ? 0.68 : 1.5);
  let out = `<path d="M16 8 L104 8 L104 22 L16 22 Z" fill="${dk}" opacity="${jog ? 0.4 : 0.25}"/>`;
  out += fold(id, `M30 110 Q34 180 ${60 - cuffW} ${bot - 10}`) + fold(id, `M90 110 Q86 180 ${60 + cuffW} ${bot - 10}`) + fold(id, 'M44 60 Q46 140 40 220', true) + fold(id, 'M76 60 Q74 140 80 220', true);
  out += fold(id, `M${60 - 4 - cuffW} 200 Q${60 - cuffW * 0.4} 206 ${inL} 198`) + fold(id, `M${60 + 4 + cuffW} 200 Q${60 + cuffW * 0.4} 206 ${inR} 198`);
  if (jog) {
    for (let x = 18; x < 104; x += 3) out += `<path d="M${x} 9 V21" stroke="${shade(hex, 0.6)}" stroke-width=".7" opacity=".5"/>`;
    out += line('M55 22 Q52 40 48 46 M65 22 Q68 40 72 46', '#EDEBE6', 1.4, 0.9);
    out += `<path d="M${60 - 4 - cuffW * 1.6} ${bot - 12} L${inL - 2} ${bot - 12} L${inL - 2} ${bot} L${60 - 4 - cuffW * 1.6} ${bot} Z M${inR + 2} ${bot - 12} L${60 + 4 + cuffW * 1.6} ${bot - 12} L${60 + 4 + cuffW * 1.6} ${bot} L${inR + 2} ${bot} Z" fill="${dk}" opacity=".35"/>`;
  } else {
    out += `<path d="M24 8 V22 M44 8 V22 M76 8 V22 M96 8 V22" stroke="${dk}" stroke-width="3" opacity=".5"/>`;
    out += stitch('M60 22 L60 66 Q60 74 68 74', st, 1) + stitch('M66 22 L66 62 Q66 70 72 72', st, 0.9);
  }
  if (t === 'Jean') {
    out += stitch('M16 30 Q30 44 40 26', st, 1) + stitch('M104 30 Q90 44 80 26', st, 1) + stitch('M84 26 L96 26 L95 36 L85 36 Z', st, 0.8);
    out += `<circle cx="40" cy="27" r="1.6" fill="#B07A3A"/><circle cx="80" cy="27" r="1.6" fill="#B07A3A"/><circle cx="60" cy="15" r="2.4" fill="#9A7B4F"/>`;
    out += stitch(`M${lx + 2} 92 L${60 - 2 - cuffW * 1.6} ${bot - 2}`, st, 0.8) + stitch(`M${rx - 2} 92 L${60 + 2 + cuffW * 1.6} ${bot - 2}`, st, 0.8);
    out += `<ellipse cx="34" cy="120" rx="10" ry="34" fill="#fff" opacity=".12" filter="url(#b${id})"/><ellipse cx="86" cy="120" rx="10" ry="34" fill="#fff" opacity=".12" filter="url(#b${id})"/>`;
  } else if (!jog) {
    out += line('M18 26 L36 48 M102 26 L84 48', dk, 1.1, 0.7) + `<circle cx="60" cy="15" r="2.2" fill="${dk}"/>`;
    if (t === 'Pantalon' || t === 'Chino') out += line(`M36 100 L${60 - 2 - cuffW * 0.8} ${bot}`, '#fff', 0.8, 0.18) + line(`M84 100 L${60 + 2 + cuffW * 0.8} ${bot}`, '#fff', 0.8, 0.18);
  }
  if (t === 'Cargo') {
    out += `<path d="M${lx - 1} 120 L${lx + 22} 118 L${lx + 22} 156 L${lx + 1} 158 Z M${rx + 1} 120 L${rx - 22} 118 L${rx - 22} 156 L${rx - 1} 158 Z" fill="${shade(hex, 1.05)}" stroke="${dk}" stroke-width=".9"/>`;
    out += `<path d="M${lx - 1} 120 L${lx + 22} 118 L${lx + 22} 128 L${lx} 130 Z M${rx + 1} 120 L${rx - 22} 118 L${rx - 22} 128 L${rx} 130 Z" fill="${dk}" opacity=".35"/>`;
  }
  return cloth(id, d, hex, mat, out);
}

/* ---------- chaussures : la paire vue de profil (cadre 240 × 120) ---------- */
function shoePath(type, high) {
  if (type === 'Ville') return 'M8 92 C7 78 9 66 14 60 C18 56 26 55 36 56 L52 58 C64 60 72 64 84 68 C104 72 128 76 142 82 C150 86 150 92 146 94 L10 94 Z';
  if (type === 'Bottines') return 'M8 94 C7 60 8 30 10 14 C11 9 16 8 22 8 L50 8 C55 8 58 11 58 16 L60 56 C76 62 100 66 122 72 C138 76 148 82 148 90 L146 96 L10 96 Z';
  if (high) return 'M8 94 C6 66 7 36 10 20 C11 14 16 12 22 12 L48 12 C54 12 57 16 58 22 L62 56 C74 62 90 64 106 67 C126 71 140 77 146 85 C150 89 150 94 146 96 L10 96 Z';
  return 'M8 92 C6 70 8 52 14 44 C18 38 26 36 34 38 L46 42 C52 44 56 48 60 54 C70 60 86 62 104 66 C124 70 140 76 146 84 C150 88 150 94 146 96 L10 96 Z';
}
function shoes(it, id, hex) {
  const t = it.type, high = it.fit === 'Montantes', mat = MATERIAL[t] || 'leather';
  const sole = t === 'Ville' ? '#3E2A1E' : t === 'Bottines' ? '#2A2A2A' : isDark(hex) ? '#F2F1EC' : '#E6E2D8';
  const soleH = t === 'Running' ? 16 : t === 'Ville' ? 6 : 10;
  const one = (dx, dy, k, cid) => {
    const d = shoePath(t, high), dk = shade(hex, 0.68);
    const collar = t === 'Ville' ? 'M16 60 C26 56 40 57 52 60' : t === 'Bottines' || high ? 'M12 14 C22 11 40 11 54 15' : 'M15 44 C24 39 40 41 55 50';
    let ex = fold(cid, 'M20 70 Q60 70 120 82') + line(collar, shade(hex, 0.45), 3.4, 0.9) + `<path d="M118 70 C132 74 142 80 146 88" fill="none" stroke="#fff" stroke-opacity="${mat === 'leather' ? 0.22 : 0.1}" stroke-width="4" filter="url(#b${cid})"/>`;
    if (t === 'Baskets' || t === 'Running' || high) {
      for (let i = 0; i < 4; i++) ex += line(`M${70 + i * 10} ${58 + i * 1.5} L${76 + i * 10} ${50 + i * 1.5}`, isDark(hex) ? '#EDEDEA' : '#FFFFFF', 2.2, 0.95);
      ex += `<path d="M104 70 Q132 72 146 84 L146 90 Q128 82 102 80 Z" fill="${isDark(hex) ? '#2E2E2E' : '#F7F7F4'}" opacity=".55"/>`;
      ex += line('M30 74 Q70 64 112 82', dk, 2.6, 0.55);
    }
    if (t === 'Ville') ex += stitch('M20 62 Q60 60 98 70', shade(hex, 1.4), 0.9) + line('M60 56 Q66 66 76 64', dk, 1.2, 0.8);
    if (t === 'Bottines' || high) ex += stitch('M10 22 L54 22', shade(hex, 1.35), 0.9);
    const sy = 96 - soleH;   // semelle galbée, bout légèrement relevé
    const soleD = `M6 ${sy} L140 ${sy} C148 ${sy - 1} 153 ${sy + 2} 152 ${sy + soleH * 0.5} C151 ${sy + soleH} 146 ${96 + 6} 138 ${96 + 6} L12 ${96 + 6} C7 ${96 + 6} 4 ${96 + 3} 4 ${sy + 4} Z`;
    return `<g transform="translate(${dx} ${dy}) scale(${k})">${cloth(cid, d, hex, mat, ex)}<path d="${soleD}" fill="${sole}" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>
      ${t === 'Running' ? `<path d="M10 ${sy + 6} Q80 ${sy + 1} 148 ${sy + 6}" stroke="${shade(hex, 0.7)}" stroke-width="2" fill="none"/>` : ''}</g>`;
  };
  const id2 = ++uid;
  return wrap('0 0 232 136', defs(id, mat, hex) + defs(id2, mat, hex) + one(72, 0, 1, id2) + one(2, 26, 1.04, id), `Chaussures : ${it.name || t}`);
}

/* ---------- accessoires (cadre 120 × 120) ---------- */
function accessory(it, id, hex) {
  const t = it.type, metal = lum(hex) > 0.6 ? '#D9D6CF' : hex;
  const gloss = `<linearGradient id="m${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".45" stop-color="${metal}"/><stop offset="1" stop-color="${shade(metal, 0.55)}"/></linearGradient>`;
  let inner;
  if (t === 'Montre') inner = `<rect x="44" y="4" width="32" height="112" rx="8" fill="${shade(hex, 0.45)}"/><rect x="44" y="4" width="32" height="112" rx="8" fill="url(#gx${id})"/>
    <circle cx="60" cy="60" r="30" fill="url(#m${id})" filter="url(#s${id})"/><circle cx="60" cy="60" r="24" fill="#F6F5F1"/><circle cx="60" cy="60" r="24" fill="none" stroke="rgba(0,0,0,.25)"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = i * Math.PI / 6; return `<path d="M${60 + Math.sin(a) * 20} ${60 - Math.cos(a) * 20} L${60 + Math.sin(a) * (i % 3 ? 22 : 18)} ${60 - Math.cos(a) * (i % 3 ? 22 : 18)}" stroke="#333" stroke-width="${i % 3 ? 0.8 : 1.6}"/>`; }).join('')}
    <path d="M60 60 L60 44 M60 60 L72 64" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><circle cx="60" cy="60" r="1.6" fill="#222"/>`;
  else if (t === 'Bague') inner = `<ellipse cx="60" cy="66" rx="34" ry="30" fill="none" stroke="url(#m${id})" stroke-width="10" filter="url(#s${id})"/><ellipse cx="60" cy="36" rx="12" ry="8" fill="url(#m${id})"/>`;
  else if (t === 'Chaîne') inner = `<g filter="url(#s${id})">${Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2; return `<ellipse cx="${60 + Math.sin(a) * 40}" cy="${56 + Math.cos(a) * 46}" rx="5" ry="3" transform="rotate(${-a * 57.3 + 90} ${60 + Math.sin(a) * 40} ${56 + Math.cos(a) * 46})" fill="none" stroke="url(#m${id})" stroke-width="2.4"/>`; }).join('')}</g>`;
  else inner = `<g filter="url(#s${id})">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<circle cx="${60 + Math.sin(a) * 34}" cy="${60 + Math.cos(a) * 30}" r="6" fill="url(#m${id})"/>`; }).join('')}</g>`;
  return wrap('0 0 120 120', defs(id, 'leather', hex).replace('</defs>', gloss + '</defs>') + inner, `Accessoire : ${it.name || t}`);
}

/* ---------- point d'entrée ---------- */
// Torse (corps sans les manches) de chaque gabarit : sert à replacer un logo détecté sur une photo.
export function torsoBox(item) {
  if (item.category === 'veste') {
    const w = { 'Ajusté': -4, Regular: 2, Ample: 12 }[item.fit] || 2, H = item.type === 'Manteau' ? 280 : 196;
    return { x0: 40 - w, x1: 160 + w, y0: 22, y1: H };
  }
  const w = { 'Ajusté': -6, Regular: 0, Ample: 10 }[item.fit] || 0;
  return { x0: 44 - w, x1: 156 + w, y0: 24, y1: 194 };
}
// logos : [{ href, x, y, w, h }] en coordonnées du gabarit, posés sur le tissu (texture et plis par-dessus)
export function flatlaySVG(item, { logos = [] } = {}) {
  const id = ++uid, hex = safeColor(item.color_hex), label = String(item.name || item.type).replace(/[<>&"]/g, '');
  const mat = MATERIAL[item.type] || 'jersey';
  const decor = logos.map((l) => `<image href="${l.href}" xlink:href="${l.href}" x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" preserveAspectRatio="xMidYMid meet"/>`).join('');
  if (item.category === 'chaussures') return shoes(item, id, hex);
  if (item.category === 'accessoire') return accessory(item, id, hex);
  if (item.category === 'bas') return wrap('0 0 120 270', defs(id, mat, hex) + bottom(item, id, hex, mat), label);
  if (item.category === 'veste') { const j = jacket(item, id, hex, mat, decor); return wrap(j.vb, defs(id, mat, hex) + j.svg, label); }
  return wrap('0 0 200 200', defs(id, mat, hex) + top(item, id, hex, mat, decor), label);
}
