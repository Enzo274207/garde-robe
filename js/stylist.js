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
// Mini tête pour l'onglet (12 × 12) : lunettes rouges, verres blancs, pupilles noires
const HEAD = [
  '...KKKKKK...',
  '.KKHHHHHHKK.',
  'KHHhHHHHHHHK',
  'KHHHHHHHHHHK',
  'KHHSSSSSSHHK',
  'KHSGGSSGGSHK',
  'KHGWEGGEWGHK',
  'KHSGGSSGGSHK',
  'KHSSSssSSSHK',
  'KHSSSLLSSSHK',
  '.KHSSSSSSHK.',
  '.KBBBPPBBBK.'
];
export function stylistIcon(size = 24) {
  return `<svg class="px-ico" width="${size}" height="${size}" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${pixels(HEAD, INK)}</svg>`;
}

// Décor : un dressing streetwear aux couleurs de l'app (blanc cassé, noir, vert acide). 64 × 80.
export function stylistScene() {
  let r = '';
  const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  const INKS = { bg: '#F2F1ED', wall2: '#E6E4DE', line: '#D6D3CB', ink: '#0D0D0D', grey: '#5C5A55', acid: '#C8F135', white: '#FFFFFF', steel: '#8F8C84' };
  // mur en carreaux de béton
  px(0, 0, 64, 54, INKS.bg);
  for (let y = 0; y < 54; y += 9) for (let x = (y / 9) % 2 ? -6 : 0; x < 64; x += 12) { px(x, y, 12, 1, INKS.line); px(x, y, 1, 9, INKS.line); }
  // bande vert acide
  px(0, 4, 64, 2, INKS.acid);
  // étagères à baskets (gauche et droite)
  [[2, 30], [2, 41], [2, 19], [52, 30], [52, 41], [52, 19]].forEach(([x, y], i) => {
    px(x, y + 6, 10, 1, INKS.ink);
    const c1 = [INKS.white, INKS.acid, INKS.ink, INKS.white, INKS.ink, INKS.acid][i];
    px(x + 1, y + 3, 4, 3, c1); px(x + 1, y + 5, 4, 1, c1 === INKS.ink ? INKS.white : INKS.ink);
    px(x + 6, y + 2, 3, 4, INKS.grey); px(x + 6, y + 2, 3, 1, INKS.ink);
  });
  // portant noir au centre avec sweats et t-shirts
  px(14, 32, 36, 1, INKS.ink); px(14, 32, 1, 21, INKS.ink); px(49, 32, 1, 21, INKS.ink); px(12, 52, 40, 1, INKS.ink);
  [[16, INKS.ink], [21, INKS.acid], [26, INKS.white], [37, INKS.grey], [42, INKS.ink], [46, INKS.white]].forEach(([x, c]) => {
    px(x + 1, 33, 1, 1, INKS.steel);
    px(x, 34, 4, 13, c); px(x - 1, 34, 1, 6, c); px(x + 4, 34, 1, 6, c);
    if (c === INKS.white) { px(x, 34, 4, 1, INKS.line); px(x - 1, 34, 1, 6, INKS.line); }
    if (c === INKS.ink) px(x + 1, 38, 2, 1, INKS.acid);              // petit logo
  });
  // sol en béton foncé avec marquage vert
  px(0, 54, 64, 26, '#2A2A28');
  for (let x = 0; x < 64; x += 8) px(x, 54, 1, 26, '#333331');
  px(0, 54, 64, 1, INKS.ink); px(0, 60, 64, 1, INKS.acid);
  // tapis sous la styliste
  px(20, 71, 24, 7, '#3A3A37'); px(20, 71, 24, 1, INKS.acid);
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

// Types de hauts : ce qui se porte forcément par-dessus, ce qui peut s'ouvrir sur un t-shirt, et ce qui va dessous
const OVER_ONLY = /veste|blouson|manteau|doudoune|coupe-vent/i;
const OVER_OK = /chemise|sweat|surchemise|gilet|cardigan/i;
const UNDER = /t-shirt|tee|débardeur|polo/i;

/**
 * items : toutes les pièces ; wears : historique (plus récent d'abord)
 * ctx : { weather: 'froid'|'doux'|'chaud', vibe: 'cool'|'normal'|'habille' }
 * seen : combinaisons haut+bas déjà proposées (pour ne pas repasser la même)
 * Renvoie { sel, lines } ou null s'il manque un haut ou un bas.
 * sel.veste peut être une veste ou un haut porté par-dessus (enregistré dans jacket_id).
 */
export function composeOutfit(items, wears, ctx, seen = new Set()) {
  const by = (c) => items.filter((i) => i.category === c);
  const H = by('haut'), B = by('bas'), V = by('veste'), C = by('chaussures'), A = by('accessoire');
  if (!H.length || !B.length) return null;
  // Une veste rangée dans les hauts se porte par-dessus, pas seule : on garde les autres hauts pour dessous
  const T = H.filter((i) => !OVER_ONLY.test(i.type || '')).length ? H.filter((i) => !OVER_ONLY.test(i.type || '')) : H;
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
  // Par-dessus : une veste, ou un haut qui s'ouvre (veste, chemise, sweat) sur un t-shirt
  const over = [...V, ...H.filter((h) => h !== top && (OVER_ONLY.test(h.type || '') || (UNDER.test(top.type || '') && OVER_OK.test(h.type || ''))))];
  if (over.length && wantJacket) jacket = pickTop(over, (v) => fitScore(v, c) + pairScore(v, top) * 0.6 + pairScore(v, bottom) * 0.6);
  const shoes = C.length ? pickTop(C, (s) => fitScore(s, c) + pairScore(s, bottom) * 0.8) : null;
  const acc = pickAccessories(A, c, top);

  return { sel: { haut: top.id, bas: bottom.id, veste: jacket?.id || null, chaussures: shoes?.id || null, accessoire: acc.map((a) => a.id) }, lines: explain(ctx, top, bottom, jacket, items) };
}

// Accessoires : un seul par famille (pas casquette + bonnet), 1 à 3 en tout.
// Les bagues font exception : si elle en met une, elle peut en ajouter jusqu'à 3, comme on les porte au quotidien.
const ACC_FAMILY = { Casquette: 'tete', Bonnet: 'tete' };
function pickAccessories(A, c, top) {
  if (!A.length || !(c.vibe === 'habille' || Math.random() < 0.7)) return [];
  const score = (a) => fitScore(a, c) + pairScore(a, top) * 0.5;
  const first = pickTop(A, score), out = [first], floor = score(first) - 3;
  const max = 1 + Math.floor(Math.random() * 3);
  const fam = (a) => ACC_FAMILY[a.type] || a.type;
  const ranked = A.filter((a) => a !== first).map((a) => [a, score(a)]).sort((x, y) => y[1] - x[1]);
  for (const [a, s] of ranked) {
    if (s < floor) break;
    const same = out.filter((o) => fam(o) === fam(a)).length;
    const rings = a.type === 'Bague' && same > 0 && same < 3;
    if (rings ? out.length >= max + 2 : same || out.length >= max) continue;
    if (Math.random() < 0.75) out.push(a);
  }
  return out;
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
  else if (jacket?.category === 'haut') out.push(`Et ${jacket.name.toLowerCase()} ouvert par-dessus : on superpose !`);
  else if (!jacket && ctx.weather === 'chaud') out.push('Pas de veste, il fait chaud.');
  const sleepy = [top, bottom, jacket].filter(Boolean).find((i) => !i.wear_count && items.length > 4);
  if (sleepy) out.push(`On ressort ${sleepy.name.toLowerCase()}, jamais porté·e jusqu’ici.`);
  const intro = { cool: 'Décontracté mais stylé.', normal: 'Simple et efficace.', habille: 'Très chic, tout ça.' }[ctx.vibe];
  return [intro, ...out.slice(0, 1)].join(' ');
}
