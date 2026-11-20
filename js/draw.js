// Dessins SVG : illustrations des pièces (l'avatar est dans avatar.js).
import { isDark, safeColor, isShort } from './catalog.js';

const f1 = (v) => (Math.round(v * 10) / 10).toString();
const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- chaussures (profil, 45 x 27) ---------- */
const SHOES = {
  sneaker: { u: 'M0 22 L0 9 Q0 4 5 4 L16 4 Q19 4 21 8 L24 12 Q35 12 41 15 Q45 17 45 22 Z', d: 'M22 10 L26 9 M25 13 L29 12 M28 14 L32 13 M6 16 Q16 12 26 18' },
  derby: { u: 'M0 22 L0 11 Q0 8 4 8 L15 8 Q19 8 23 11 Q34 13 41 16 Q45 18 45 22 Z', d: 'M17 10 Q21 15 26 13 M19 11 L22 10 M21 13 L24 12' },
  running: { u: 'M0 22 L0 8 Q0 3 5 3 L15 3 Q19 3 22 8 L25 12 Q36 11 42 15 Q45 17 45 22 Z', d: 'M8 18 Q18 12 30 16 M23 9 L27 8 M26 12 L30 11' },
  boot: { u: 'M0 22 L0 -6 Q0 -10 4 -10 L16 -10 Q20 -10 20 -5 L22 12 Q35 12 41 15 Q45 17 45 22 Z', d: 'M3 -6 L17 -6 M16 0 L20 -1 M16 4 L21 3 M17 8 L22 7' },
  high: { u: 'M0 22 L0 -5 Q0 -9 4 -9 L15 -9 Q19 -9 20 -4 L23 12 Q35 12 41 15 Q45 17 45 22 Z', d: 'M17 -3 L21 -4 M17 2 L22 1 M18 7 L23 6 M5 15 Q14 9 26 15' }
};
const SOLE = 'M-1 21 L46 21 Q47 21 47 23 L47 25 Q47 27 45 27 L1 27 Q-1 27 -1 25 Z';
function shoeKey(item) {
  if (!item) return 'sneaker';
  if (item.type === 'Bottines') return 'boot';
  if (item.type === 'Ville') return 'derby';
  if (item.type === 'Running') return 'running';
  return item.fit === 'Montantes' ? 'high' : 'sneaker';
}
function soleColor(item) {
  if (!item) return '#E2DED6';
  if (item.type === 'Ville') return '#4A3426';
  if (item.type === 'Bottines') return '#2A2A2A';
  return isDark(item.color_hex) ? '#F2F2F0' : '#E2DED6';
}

/* ---------- illustrations des pièces (quand pas de photo) ---------- */
function garmentShapes(item) {
  const cat = item.category, type = item.type, fit = item.fit;
  const dark = isDark(item.color_hex);
  let r = { body: '', backBody: '', detail: '', dots: '', backDetail: '', backFill: 'none', sole: '', backSole: '', soleHex: 'none', tf: '', backTf: '', detailStroke: dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)' };

  if (cat === 'haut' || cat === 'veste') {
    const short = cat === 'haut' && type === 'T-shirt';
    const front = short ? 'M40 14 Q60 26 80 14 L98 20 L112 46 L98 54 L90 42 L90 108 L30 108 L30 42 L22 54 L8 46 L22 20 Z'
      : 'M40 14 Q60 26 80 14 L98 20 Q108 48 114 82 L102 86 Q96 64 90 46 L90 108 L30 108 L30 46 Q24 64 18 86 L6 82 Q12 48 22 20 Z';
    r.body = front; r.backBody = front.replace('Q60 26 80 14', 'Q60 19 80 14');
    r.backDetail = 'M40 14 Q60 19 80 14';
    if (type === 'T-shirt') r.detail = 'M44 17 Q60 28 76 17';
    if (type === 'Pull') { r.detail = 'M30 102 L90 102 M102 80 L113 76 M18 80 L7 76 M44 17 Q60 28 76 17'; r.backDetail = 'M30 102 L90 102 M40 14 Q60 19 80 14'; }
    if (type === 'Sweat') { r.detail = 'M42 14 Q60 4 78 14 M42 80 L78 80 L83 98 L37 98 Z M30 102 L90 102 M56 22 L55 34 M64 22 L65 34'; r.backDetail = 'M42 14 Q60 40 78 14 Q60 8 42 14 Z'; r.backFill = 'rgba(0,0,0,.12)'; }
    if (cat === 'veste' || type === 'Veste') { r.detail = 'M40 14 L50 42 L60 24 L70 42 L80 14 M60 24 L60 108 M36 76 L48 76 M72 76 L84 76'; r.dots = circ(60, 56, 2.5) + circ(60, 74, 2.5) + circ(60, 92, 2.5); r.backDetail = 'M40 14 Q60 22 80 14 L80 10 Q60 16 40 10 Z M60 70 L60 108'; r.backFill = 'rgba(0,0,0,.1)'; }
    if (type === 'Chemise') { r.detail = 'M42 12 L52 26 L60 18 L68 26 L78 12 M60 18 L60 108 M36 40 L48 40 L48 50 L36 50 Z'; r.dots = [34, 50, 66, 82, 98].map((y) => circ(60, y, 1.5)).join(' '); r.backDetail = 'M42 12 Q60 20 78 12 M34 30 L86 30'; }
    const k = fit === 'Ample' ? 1.07 : fit === 'Ajusté' ? 0.93 : 1, ky = fit === 'Ample' ? 1.04 : 1;
    r.tf = r.backTf = `translate(60 60) scale(${k} ${ky}) translate(-60 -60)`;
  } else if (cat === 'bas') {
    const h = { 'Ajusté': [40, 54], Regular: [37, 55], Ample: [30, 56] }[fit] || [37, 55];
    const Lo = h[0], Li = h[1], Ri = 120 - Li, Ro = 120 - Lo;
    r.body = r.backBody = `M36 8 L84 8 Q87 22 88 40 L${Ro} 112 L${Ri} 112 L60 48 L${Li} 112 L${Lo} 112 L32 40 Q33 22 36 8 Z`;
    r.detail = r.backDetail = 'M36 16 L84 16';
    if (type === 'Jean') { r.detail += ' M38 17 Q46 21 48 30 M82 17 Q74 21 72 30 M60 16 L60 38 Q60 42 55 44'; r.dots = circ(48.4, 30, 1.4) + circ(71.6, 30, 1.4) + circ(60.2, 12, 1.6); r.backDetail += ' M40 24 L54 24 L53 38 L47 41 L41 38 Z M66 24 L80 24 L79 38 L73 41 L67 38 Z M36 18 Q60 24 84 18'; r.detailStroke = 'rgba(214,168,96,.85)'; }
    if (type === 'Pantalon') { r.detail += ` M38 17 L44 30 M82 17 L76 30 M60 16 L60 36 M${(Lo + Li) / 2 + 2} 50 L${(Lo + Li) / 2} 110 M${(Ro + Ri) / 2 - 2} 50 L${(Ro + Ri) / 2} 110`; r.backDetail += ' M42 28 L54 28 M66 28 L78 28'; }
    if (type === 'Chino') { r.detail += ' M38 17 L45 30 M82 17 L75 30 M60 16 L60 37'; r.backDetail += ' M42 28 L54 28 M66 28 L78 28'; }
    if (type === 'Jogging') { r.detail = `M36 15 L84 15 M57 15 L55 28 M63 15 L65 28 M${Lo} 104 L${Li} 104 M${Ri} 104 L${Ro} 104 M40 20 Q46 26 46 34 M80 20 Q74 26 74 34`; r.backDetail = `M36 15 L84 15 M${Lo} 104 L${Li} 104 M${Ri} 104 L${Ro} 104 M66 26 L78 26 L78 38 L66 38 Z`; }
    if (isShort(item)) {   // jambes coupées au-dessus du genou
      r.body = r.backBody = 'M36 8 L84 8 Q87 22 88 40 L91 74 L63 74 L60 50 L57 74 L29 74 L32 40 Q33 22 36 8 Z';
      r.detail += ' M38 17 L45 30 M82 17 L75 30 M60 16 L60 37 M30 68 L57 68 M63 68 L90 68'; r.backDetail += ' M42 28 L54 28 M66 28 L78 28 M30 68 L57 68 M63 68 L90 68';
    }
    if (type === 'Cargo') { r.detail += ' M38 17 L45 30 M82 17 L75 30 M60 16 L60 37 M29 60 L40 60 L40 78 L28 78 Z M91 60 L80 60 L80 78 L92 78 Z'; r.backDetail += ' M42 26 L54 26 L54 38 L42 38 Z M66 26 L78 26 L78 38 L66 38 Z'; }
  } else if (cat === 'chaussures') {
    const s = SHOES[shoeKey(item)];
    r.body = r.backBody = s.u; r.detail = r.backDetail = s.d; r.sole = r.backSole = SOLE; r.soleHex = soleColor(item);
    r.tf = 'translate(10 46) scale(2.2)'; r.backTf = 'translate(110 46) scale(-2.2 2.2)';
    r.detailStroke = dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.32)';
  } else {
    r.detailStroke = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)';
    if (type === 'Montre') {
      r.body = r.backBody = circ(60, 60, 23);
      r.sole = r.backSole = 'M49 4 L71 4 L69 40 L51 40 Z M51 80 L69 80 L71 116 L49 116 Z';
      r.soleHex = dark ? '#3A3A3A' : '#5A3A24';
      r.detail = circ(60, 60, 18) + ' M60 60 L60 47 M60 60 L69 64 M83 56 L87 56 L87 64 L83 64';
      r.backDetail = circ(60, 60, 15);
    } else if (type === 'Bague') {
      r.body = r.backBody = 'M28 70 a32 24 0 1 0 64 0 a32 24 0 1 0 -64 0 Z M37 70 a23 16 0 1 1 46 0 a23 16 0 1 1 -46 0 Z';
      r.detail = 'M32 64 Q60 52 88 64'; r.backDetail = 'M40 76 Q60 86 80 76';
    } else if (type === 'Chaîne') {
      let links = '';
      for (let i = 0; i <= 14; i++) { const t = i / 14; links += circ(16 + 88 * t, 11 + 200 * t * (1 - t), 3.2) + ' '; }
      r.body = r.backBody = 'M14 12 Q60 116 106 12 L102 10 Q60 106 18 10 Z'; r.detail = r.backDetail = links;
    } else {
      let beads = '';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; beads += circ(f1(60 + 40 * Math.cos(a)), f1(62 + 26 * Math.sin(a)), 6.5) + ' '; }
      r.body = r.backBody = beads;
    }
  }
  return r;
}

export function garmentSVG(item, side = 'front') {
  const r = garmentShapes(item);
  const back = side === 'back';
  const body = back ? r.backBody : r.body, detail = back ? r.backDetail : r.detail, sole = back ? r.backSole : r.sole;
  const tr = back ? (r.backTf || r.tf) : r.tf;
  const vs = 'vector-effect="non-scaling-stroke"';
  const fillHex = safeColor(item.color_hex);
  return `<svg aria-hidden="true" viewBox="0 0 120 120">
  <defs><linearGradient id="shadeH" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>
  <g transform="${tr || ''}">
    ${sole ? `<path d="${sole}" fill="${r.soleHex}" stroke="var(--outline)" stroke-width="1.3" ${vs}/>` : ''}
    <path d="${body}" fill="${fillHex}" fill-rule="evenodd" stroke="var(--outline)" stroke-width="1.3" stroke-linejoin="round" ${vs}/>
    <path d="${body}" fill="url(#shadeH)" fill-rule="evenodd"/>
    <path d="${detail}" fill="${back ? r.backFill : 'none'}" stroke="${r.detailStroke}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" ${vs}/>
    ${!back && r.dots ? `<path d="${r.dots}" fill="${r.detailStroke}"/>` : ''}
  </g></svg>`;
}

export { esc };
