// Dessins SVG : silhouette, visage, illustrations des pièces.
import { AV, isDark, safeColor } from './catalog.js';

const f1 = (v) => (Math.round(v * 10) / 10).toString();
const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- visage ---------- */
export function faceParts(a) {
  const sk = AV.skin[a.skin] || AV.skin[2];
  const w = { Petits: 3.2, Moyens: 4, Grands: 4.9 }[a.eyeSize] || 4;
  const ratio = { Amande: 0.55, Ronds: 0.85, 'Étroits': 0.32 }[a.eyeShape] || 0.55;
  const h = w * ratio;
  const eyeWhite = (x) => a.eyeShape === 'Ronds'
    ? circ(x, 42, w * 0.85)
    : `M${x - w} 42 Q${x} ${42 - h * 1.6} ${x + w} 42 Q${x} ${42 + h * 1.4} ${x - w} 42 Z`;
  const r = Math.min(w * 0.55, a.eyeShape === 'Ronds' ? w * 0.55 : h * 0.95);
  const by = 42 - Math.max(h * 1.2, 3.5) - 4;
  const brow = (x) => `M${x - 5.5} ${by + 1} Q${x} ${by - 1.5} ${x + 5.5} ${by + 0.5}`;
  const hairPaths = {
    Court: 'M75 38 Q72 7 100 7 Q128 7 125 36 Q119 21 101 21 Q84 21 75 38 Z',
    'Dégradé': 'M76.5 31 Q76 9 100 8 Q124 9 123.5 31 Q117 17 100 16.5 Q83 17 76.5 31 Z',
    'Mi-long': 'M73 62 Q66 5 100 4 Q134 5 127 62 Q125 44 123 32 Q113 21 100 21 Q87 22 77 32 Q75 44 73 62 Z',
    'Bouclé': 'M74 36 Q68 28 74 21 Q72 10 84 9 Q90 1 100 5 Q110 1 116 9 Q128 10 126 21 Q132 28 126 36 Q121 22 100 21 Q79 22 74 36 Z',
    'Rasé': 'M76.5 31 Q76 9 100 8 Q124 9 123.5 31 Q117 17 100 16.5 Q83 17 76.5 31 Z'
  };
  const beards = {
    Aucune: '',
    Courte: 'M76.5 46 Q78 71.5 100 71.5 Q122 71.5 123.5 46 Q119 60 108 59.5 Q100 57.5 92 59.5 Q81 60 76.5 46 Z',
    Pleine: 'M76 42 Q76 77 100 78 Q124 77 124 42 Q120 58 108 58 Q100 56 92 58 Q80 58 76 42 Z'
  };
  return {
    skin: sk.hex, skinDark: sk.dark, lip: sk.lip,
    hair: (AV.hair[a.hair] || AV.hair[0]).hex, eye: (AV.eye[a.eye] || AV.eye[0]).hex,
    hairPath: hairPaths[a.hairStyle] || hairPaths.Court, hairOpacity: a.hairStyle === 'Rasé' ? 0.35 : 1,
    beard: beards[a.beard] || '',
    eyeWhites: eyeWhite(91) + ' ' + eyeWhite(109),
    irises: circ(91, 42, r) + ' ' + circ(109, 42, r),
    brows: brow(91) + ' ' + brow(109),
    k: { Mince: 0.92, Normale: 1, 'Athlétique': 1.09 }[a.build] || 1
  };
}

function headSVG(p, withNeck) {
  return `${withNeck ? `<rect x="89" y="64" width="22" height="42" rx="7" fill="${p.skinDark}"/>` : ''}
    <ellipse cx="75.5" cy="45" rx="4" ry="7" fill="${p.skinDark}"/>
    <ellipse cx="124.5" cy="45" rx="4" ry="7" fill="${p.skinDark}"/>
    <ellipse cx="100" cy="40" rx="25" ry="31" fill="${p.skin}"/>
    <path d="${p.beard}" fill="${p.hair}" opacity=".85"/>
    <path d="${p.eyeWhites}" fill="#F7F4EF"/>
    <path d="${p.irises}" fill="${p.eye}"/>
    <path d="${p.brows}" fill="none" stroke="${p.hair}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M100 45 Q97.5 53 101.5 54" fill="none" stroke="${p.skinDark}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M94.5 61 Q100 63.5 105.5 61" fill="none" stroke="${p.lip}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="${p.hairPath}" fill="${p.hair}" opacity="${p.hairOpacity}"/>`;
}

export function faceSVG(avatar, size, viewBox = '66 0 68 68', label) {
  const p = faceParts(avatar);
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg ${a11y} width="${size}" height="${size}" viewBox="${viewBox}">${headSVG(p, viewBox !== '66 0 68 68')}</svg>`;
}

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

/* ---------- silhouette complète ---------- */
export function figureSVG({ top, bottom, shoes, jacket, avatar }) {
  const p = faceParts(avatar);
  const R = (v) => f1(100 + v), L = (v) => f1(100 - v);
  const topFit = top?.fit || 'Regular';
  const tf = { 'Ajusté': { S: 48, W: 42, H: 39, hem: 300, ox: 8, sw: 18 }, Regular: { S: 50, W: 46, H: 45, hem: 308, ox: 10, sw: 22 }, Ample: { S: 57, W: 55, H: 56, hem: 324, ox: 13, sw: 29 } }[topFit] || { S: 50, W: 46, H: 45, hem: 308, ox: 10, sw: 22 };
  const longS = !(top && top.type === 'T-shirt');
  const endY = longS ? 296 : 182, ox = longS ? tf.ox : tf.ox * 0.6, sw = longS ? tf.sw : tf.sw + 7;
  const { S, W, H, hem } = tf;
  const torso = `M80 90 Q87 104 100 106 Q113 104 120 90 L${R(S)} 103 Q${R(W + 3)} 125 ${R(W)} 165 Q${R(H + 2)} ${hem - 60} ${R(H)} ${hem} L${L(H)} ${hem} Q${L(H + 2)} ${hem - 60} ${L(W)} 165 Q${L(W + 3)} 125 ${L(S)} 103 Z`;
  const midY = (103 + endY) / 2, midI = (168 + endY) / 2;
  const sleeve = (X) => `M${X(S)} 103 Q${X(S + ox + 5)} ${midY} ${X(S + ox)} ${endY} L${X(S + ox - sw)} ${endY + 2} Q${X(W + 3)} ${midI} ${X(W - 1)} 168 Z`;
  const wx = S + tf.ox - tf.sw / 2;
  const arms = `M${R(S - 7)} 112 L${R(wx)} 300 M${L(S - 7)} 112 L${L(wx)} 300`;
  const hand = (x) => `M${x} 300 m-8 0 a8 15 0 1 0 16 0 a8 15 0 1 0 -16 0`;
  const bFit = bottom?.fit || 'Regular';
  const bf = { 'Ajusté': { hip: 43, Ko: 35, Ki: 8, Ho: 30, Hi: 13 }, Regular: { hip: 44, Ko: 40, Ki: 6, Ho: 38, Hi: 10 }, Ample: { hip: 47, Ko: 47, Ki: 4, Ho: 48, Hi: 6 } }[bFit] || { hip: 44, Ko: 40, Ki: 6, Ho: 38, Hi: 10 };
  const pants = `M${L(40)} 285 L${R(40)} 285 Q${R(bf.hip + 1)} 305 ${R(bf.hip)} 335 L${R(bf.Ko)} 440 L${R(bf.Ho)} 565 L${R(bf.Hi)} 565 L${R(bf.Ki)} 440 L${R(2)} 352 L${L(2)} 352 L${L(bf.Ki)} 440 L${L(bf.Hi)} 565 L${L(bf.Ho)} 565 L${L(bf.Ko)} 440 L${L(bf.hip)} 335 Q${L(bf.hip + 1)} 305 ${L(40)} 285 Z`;
  const cK = (bf.Ko + bf.Ki) / 2, cH = (bf.Ho + bf.Hi) / 2;
  const crease = `M${R(cK)} 400 L${R(cH)} 555 M${L(cK)} 400 L${L(cH)} 555 M100 300 L100 340`;
  const sh = SHOES[shoeKey(shoes)];
  const shoeHex = shoes ? safeColor(shoes.color_hex) : '#F4F2EE';
  const shoeAcc = isDark(shoeHex) ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.3)';
  const shoe = (tr) => `<g transform="${tr}"><path d="${sh.u}" fill="${shoeHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${sh.d}" fill="none" stroke="${shoeAcc}" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="${SOLE}" fill="${soleColor(shoes)}" stroke="var(--outline)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></g>`;
  const topHex = top ? safeColor(top.color_hex) : '#D8D3CB';
  const botHex = bottom ? safeColor(bottom.color_hex) : '#BDB7AD';
  // Veste ouverte par-dessus le haut : silhouette un peu plus large et plus longue, manches longues,
  // puis une bande du haut visible au centre.
  let jacketSVG = '';
  if (jacket) {
    const jf = { 'Ajusté': 3, Regular: 6, Ample: 11 }[jacket.fit] || 6;
    const long = jacket.type === 'Manteau' ? 70 : jacket.type === 'Doudoune' ? 14 : 18;
    const JS = S + 3 + jf / 2, JW = W + jf, JH = H + jf, jhem = Math.max(hem, 300) + long;
    const jHex = safeColor(jacket.color_hex);
    const jTorso = `M80 88 L${R(JS)} 101 Q${R(JW + 3)} 125 ${R(JW)} 165 Q${R(JH + 2)} ${jhem - 60} ${R(JH)} ${jhem} L${L(JH)} ${jhem} Q${L(JH + 2)} ${jhem - 60} ${L(JW)} 165 Q${L(JW + 3)} 125 ${L(JS)} 101 L120 88 Z`;
    const jox = 11 + jf / 2, jsw = 24 + jf;
    const jSleeve = (X) => `M${X(JS)} 101 Q${X(JS + jox + 5)} 199 ${X(JS + jox)} 298 L${X(JS + jox - jsw)} 300 Q${X(JW + 3)} 234 ${X(JW - 1)} 168 Z`;
    const open = `M93 104 L107 104 L107 ${jhem} L93 ${jhem} Z`;
    jacketSVG = `<path d="${jTorso}" fill="${jHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${jTorso}" fill="url(#shadeX)"/>
    <path d="${jSleeve(R)} ${jSleeve(L)}" fill="${jHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${jSleeve(R)} ${jSleeve(L)}" fill="url(#shadeX)" opacity=".7"/>
    <path d="${open}" fill="${topHex}" stroke="var(--outline)" stroke-width="1"/>
    <path d="M93 104 L86 92 M107 104 L114 92" stroke="var(--outline)" stroke-width="1.2" fill="none"/>`;
  }
  const k = p.k;
  const label = `Silhouette : ${top ? top.name : 'aucun haut'}${jacket ? ', ' + jacket.name : ''}, ${bottom ? bottom.name : 'aucun bas'}, ${shoes ? shoes.name : 'aucune chaussure'}`;
  return `<svg role="img" aria-label="${esc(label)}" width="140" height="420" viewBox="0 0 200 600">
  <defs><linearGradient id="shadeX" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".3" stop-color="#fff" stop-opacity=".08"/>
    <stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
  <ellipse cx="100" cy="593" rx="72" ry="6" fill="var(--shadow)"/>
  <g transform="translate(100 0) scale(${k} 1) translate(-100 0)">
    <path d="${arms}" fill="none" stroke="${p.skin}" stroke-width="15" stroke-linecap="round"/>
    <rect x="89" y="64" width="22" height="42" rx="7" fill="${p.skinDark}"/>
    ${shoe(`translate(${L(bf.Hi - 3)} 559) scale(-1.15 1.15)`)}
    ${shoe(`translate(${R(bf.Hi - 3)} 559) scale(1.15)`)}
    <path d="${pants}" fill="${botHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${pants}" fill="url(#shadeX)"/>
    <path d="${crease}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/>
    <path d="${torso}" fill="${topHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${torso}" fill="url(#shadeX)"/>
    <path d="${sleeve(R)} ${sleeve(L)}" fill="${topHex}" stroke="var(--outline)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${sleeve(R)} ${sleeve(L)}" fill="url(#shadeX)" opacity=".7"/>
    ${jacketSVG}
    <path d="${hand(R(wx + 1))} ${hand(L(wx + 1))}" fill="${p.skin}"/>
  </g>
  ${headSVG(p, false)}
</svg>`;
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
