// Styliste : personnage en pixel art, décor de boutique et choix de la tenue.
// Tout est calculé sur l'appareil, sans IA externe. Rien n'est enregistré ici :
// la tenue proposée remplit seulement la sélection de l'accueil.
import { isNeutral, isDark } from './catalog.js';

export const STYLIST_NAME = 'Christina Cordula';

/* ---------------- pixel art ---------------- */
// Chaque lettre est une couleur, « . » est transparent. 20 colonnes × 32 lignes.
const SPRITE = [
  '......KKKKKKKK......',
  '....KKHHHHHHHHKK....',
  '...KHHhhHHHHHHHHK...',
  '..KHHhHHHHHHHHHHHK..',
  '..KHHHHHHHHHHHHHHK..',
  '..KHHHHHHHHHHHHHHK..',
  '..KHHSSSSSSSSSSHHK..',
  '..KHSSGGSSSSGGSSHK..',
  '..KHSGWEGGGGWEGSHK..',
  '..KHSSGGSSSSGGSSHK..',
  '..KHSSSSSssSSSSSHK..',
  '..KHSCSSLLLLSSCSHK..',
  '..KHHSSSSSSSSSSHHK..',
  '..KHHHHKSSSSKHHHHK..',
  '...KBBBKWPPWKBBBK...',
  '..KBBBBKWWWWKBBBBK..',
  '..KBbBBBKWWKBBBbBK..',
  '..KBbBBBBKKBBBBbBK..',
  '..KBbBBBBBBBBBBbBK..',
  '..KBbBBBBBBBBBBbBK..',
  '..KBbKBBBBBBBBKbBK..',
  '..KBbKTTTTTTTTKbBK..',
  '..KSSKTTTTTTTTKSSK..',
  '...KKKTTTKKTTTKKK...',
  '.....KTTTKKTTTK.....',
  '.....KTTTKKTTTK.....',
  '.....KTTTKKTTTK.....',
  '.....KTTTKKTTTK.....',
  '.....KTTTKKTTTK.....',
  '.....KSSSKKSSSK.....',
  '....KRRRRKKRRRRK....',
  '....KKKKKKKKKKKK....'
];
const INK = {
  K: '#1B1A2E', H: '#2B1D16', h: '#5A3B2A', S: '#F1C9A5', s: '#D9A57F', C: '#EE9A8E',
  G: '#C0283A', W: '#FFFFFF', E: '#1B1A2E', L: '#C0283A', P: '#F4EFE6',
  B: '#22223A', b: '#45456A', T: '#2E2E44', R: '#C0283A'
};
function pixels(rows, ink) {
  let out = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1; while (row[x + w] === c) w++;
      if (c !== '.') out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${ink[c]}"/>`;
      x += w;
    }
  });
  return out;
}
export function stylistSprite(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 20 32" shape-rendering="crispEdges" aria-hidden="true">${pixels(SPRITE, INK)}</svg>`;
}
// Petite tête pour l'onglet (8 × 8)
const HEAD = ['.KKKKKK.', 'KHHHHHHK', 'KHSSSSHK', 'KGGSSGGK', 'KSSSSSSK', 'KHSLLSHK', '.KSSSSK.', 'KBBPPBBK'];
export function stylistIcon(size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${pixels(HEAD, INK)}</svg>`;
}

// Décor : une boutique (mur rayé, miroir, portant de vêtements, parquet en damier). 64 × 80.
export function stylistScene() {
  let r = '';
  const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  px(0, 0, 64, 56, '#F3D9C4');
  for (let x = 0; x < 64; x += 8) px(x, 0, 4, 56, '#EDCBB2');
  px(0, 52, 64, 4, '#B9784F');                                   // plinthe
  for (let y = 56; y < 80; y += 4) for (let x = 0; x < 64; x += 4) px(x, y, 4, 4, ((x + y) / 4) % 2 ? '#7E4A33' : '#9A5D41');
  // miroir à gauche
  px(4, 10, 14, 30, '#C79A3D'); px(6, 12, 10, 26, '#BFE3EA'); px(8, 14, 2, 10, '#E9F7FA'); px(11, 16, 1, 6, '#E9F7FA');
  // portant à droite
  px(44, 14, 18, 2, '#6B6B7A'); px(45, 14, 1, 38, '#6B6B7A'); px(60, 14, 1, 38, '#6B6B7A'); px(43, 51, 20, 1, '#6B6B7A');
  [['#C8F135', 46], ['#2E3BD6', 50], ['#C0283A', 54], ['#1B1A2E', 57]].forEach(([c, x]) => { px(x + 1, 16, 1, 2, '#6B6B7A'); px(x, 18, 4, 14, c); px(x - 1, 18, 1, 5, c); px(x + 4, 18, 1, 5, c); });
  // lampe et étoiles décoratives
  px(28, 0, 8, 2, '#6B6B7A'); px(30, 2, 4, 3, '#FFE38A');
  [[22, 8], [40, 6], [26, 30], [38, 26]].forEach(([x, y]) => { px(x, y, 1, 1, '#FFFFFF'); px(x - 1, y + 1, 3, 1, '#FFFFFF'); px(x, y + 2, 1, 1, '#FFFFFF'); });
  return `<svg class="sty-bg" viewBox="0 0 64 80" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

/* ---------------- choix de la tenue ---------------- */
export const WEATHER = { froid: 'Froid', doux: 'Doux', chaud: 'Chaud' };
export const VIBE = { cool: 'Cool', normal: 'Normale', habille: 'Habillée' };
const SEASON_FOR = { froid: ['Hiver', 'Automne'], doux: ['Printemps', 'Automne'], chaud: ['Été', 'Printemps'] };
const WARM_TARGET = { froid: 4.2, doux: 2.8, chaud: 1.4 };       // échelle 1 à 5
const FORMAL_TARGET = { cool: 1.6, normal: 2.6, habille: 4 };     // échelle 1 à 5

// Quand la fiche n'est pas remplie, on devine d'après le type de pièce.
const GUESS = [
  [/doudoune|parka|manteau|pull|sweat|hoodie|polaire|bottine|boots|écharpe|bonnet/i, 4, null],
  [/t-shirt|tee|débardeur|short|sandale|claquette|polo/i, 1.5, null],
  [/jogging|survêt|basket|sneaker|casquette|sport/i, null, 1.4],
  [/costume|blazer|derby|derbies|mocassin|ville|chemise|cravate|montre|trench/i, null, 4]
];
function guess(it) {
  const s = `${it.type || ''} ${it.name || ''}`;
  let w = null, f = null;
  for (const [re, gw, gf] of GUESS) if (re.test(s)) { if (gw != null && w == null) w = gw; if (gf != null && f == null) f = gf; }
  return { warmth: it.warmth || w, formality: it.formality || f };
}
const STYLE_FOR = { cool: ['Streetwear', 'Casual', 'Sport', 'Workwear'], normal: ['Casual', 'Classique', 'Streetwear', 'Workwear'], habille: ['Chic', 'Classique'] };
const CLASH = (a, b) => a && b && ((a === 'Sport' && ['Chic', 'Classique'].includes(b)) || (b === 'Sport' && ['Chic', 'Classique'].includes(a)));

// Note d'une pièce seule par rapport à la météo et à l'envie
function fitScore(it, ctx) {
  const g = guess(it);
  let s = 0;
  if (it.seasons?.length) s += it.seasons.some((x) => SEASON_FOR[ctx.weather].includes(x)) ? 2 : -2.5;
  if (g.warmth) s -= Math.abs(g.warmth - WARM_TARGET[ctx.weather]) * (it.category === 'chaussures' || it.category === 'accessoire' ? 0.4 : 0.9);
  if (g.formality) s -= Math.abs(g.formality - FORMAL_TARGET[ctx.vibe]) * 1.1;
  if (it.style) s += STYLE_FOR[ctx.vibe].includes(it.style) ? 1 : -0.6;
  if (it.favorite) s += 0.8;
  s += ctx.rested(it);
  if (ctx.recent.has(it.id)) s -= 1.5;
  return s + Math.random() * 0.9;
}
// Accord de deux pièces : couleurs et proportions
function pairScore(a, b) {
  let s = 0;
  const na = isNeutral(a.color_hex), nb = isNeutral(b.color_hex);
  if (na || nb) s += 1.5; else s -= 1;                              // une couleur forte + une base neutre
  if (a.color_hex === b.color_hex && !(na && nb)) s -= 1.5;         // même couleur forte : trop chargé
  if (na && nb && isDark(a.color_hex) !== isDark(b.color_hex)) s += 0.6; // contraste clair / foncé
  if (a.style && b.style) s += a.style === b.style ? 1.2 : CLASH(a.style, b.style) ? -2 : 0;
  return s;
}
function proportion(top, bottom) {
  if (top.fit === 'Ample' && bottom.fit === 'Ajusté') return 2;
  if (top.fit === 'Ajusté' && ['Ample', 'Regular'].includes(bottom.fit)) return 1.2;
  if (top.fit === 'Ample' && bottom.fit === 'Ample') return -1;
  return 0.3;
}
// Tirage parmi les meilleures, pour que « Une autre » change vraiment
function pickTop(list, score, n = 3) {
  const ranked = list.map((it) => [it, score(it)]).sort((x, y) => y[1] - x[1]).slice(0, n);
  if (!ranked.length) return null;
  const total = ranked.reduce((t, [, s], i) => t + (n - i), 0);
  let r = Math.random() * total;
  for (let i = 0; i < ranked.length; i++) { r -= n - i; if (r <= 0) return ranked[i][0]; }
  return ranked[0][0];
}

/**
 * items : toutes les pièces ; wears : historique (plus récent d'abord)
 * ctx : { weather: 'froid'|'doux'|'chaud', vibe: 'cool'|'normal'|'habille' }
 * seen : combinaisons haut+bas déjà proposées (pour ne pas repasser la même)
 * Renvoie { sel, lines } ou null s'il manque un haut ou un bas.
 */
export function composeOutfit(items, wears, ctx, seen = new Set()) {
  const by = (c) => items.filter((i) => i.category === c);
  const T = by('haut'), B = by('bas'), V = by('veste'), C = by('chaussures'), A = by('accessoire');
  if (!T.length || !B.length) return null;
  const maxWear = Math.max(1, ...items.map((i) => i.wear_count || 0));
  const c = {
    ...ctx,
    recent: new Set(wears.slice(0, 3).flatMap((w) => [w.top_id, w.bottom_id, w.shoes_id, w.jacket_id])),
    rested: (it) => (1 - (it.wear_count || 0) / maxWear) * 0.9
  };
  let top, bottom, tries = 0;
  do {
    top = pickTop(T, (it) => fitScore(it, c));
    bottom = pickTop(B, (b) => fitScore(b, c) + pairScore(top, b) + proportion(top, b));
    tries++;
  } while (seen.has(top.id + '|' + bottom.id) && tries < 12);
  seen.add(top.id + '|' + bottom.id);

  let jacket = null;
  const wantJacket = ctx.weather === 'froid' || (ctx.weather === 'doux' && (ctx.vibe === 'habille' || Math.random() < 0.5));
  if (V.length && wantJacket) jacket = pickTop(V, (v) => fitScore(v, c) + pairScore(v, top) * 0.6 + pairScore(v, bottom) * 0.6);
  const shoes = C.length ? pickTop(C, (s) => fitScore(s, c) + pairScore(s, bottom) * 0.8) : null;
  let acc = null;
  if (A.length && (ctx.vibe === 'habille' || Math.random() < 0.6)) acc = pickTop(A, (a) => fitScore(a, c) + pairScore(a, top) * 0.5);

  return { sel: { haut: top.id, bas: bottom.id, veste: jacket?.id || null, chaussures: shoes?.id || null, accessoire: acc?.id || null }, lines: explain(ctx, top, bottom, jacket, items) };
}

function explain(ctx, top, bottom, jacket, items) {
  const out = [];
  const p = proportion(top, bottom);
  if (top.fit === 'Ample' && bottom.fit === 'Ajusté') out.push('Le haut ample avec un bas ajusté : la silhouette est parfaite.');
  else if (p >= 1) out.push('Un haut près du corps et un bas plus large : c’est équilibré.');
  const nt = isNeutral(top.color_hex), nb = isNeutral(bottom.color_hex);
  if (!nt && nb) out.push(`Le ${(top.color_name || 'haut').toLowerCase()} ressort sur une base neutre.`);
  else if (nt && !nb) out.push(`Ton bas ${(bottom.color_name || '').toLowerCase()} apporte la touche de couleur.`);
  else if (nt && nb) out.push('Des couleurs neutres : impossible de se tromper.');
  if (jacket && ctx.weather === 'froid') out.push(`Et ${jacket.name.toLowerCase()} par-dessus, il fait froid !`);
  else if (!jacket && ctx.weather === 'chaud') out.push('Pas de veste, il fait chaud.');
  const sleepy = [top, bottom, jacket].filter(Boolean).find((i) => !i.wear_count && items.length > 4);
  if (sleepy) out.push(`On ressort ${sleepy.name.toLowerCase()}, jamais porté·e jusqu’ici.`);
  const intro = { cool: 'Décontracté mais stylé.', normal: 'Simple et efficace.', habille: 'Très chic, tout ça.' }[ctx.vibe];
  return [intro, ...out.slice(0, 2)].join(' ');
}
