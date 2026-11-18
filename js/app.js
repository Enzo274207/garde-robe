import { CATEGORIES, CAT_ORDER, PALETTE, AV, DEFAULT_AVATAR, SEASONS, STYLES, WARMTH, FORMALITY, isNeutral, safeColor } from './catalog.js';
import { faceSVG, garmentSVG, esc } from './draw.js';
import { demo, online, isDemo, today } from './store.js';
import { createSync } from './sync.js';
import { compressImage } from './image.js';

/* ---------------- icônes ---------------- */
const P = {
  avatar: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.2 18.4c1.2-2 3.3-3.2 5.8-3.2s4.6 1.2 5.8 3.2',
  accessoire: 'M9 7.5 10 3h4l1 4.5M9 16.5 10 21h4l1-4.5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM12 10v2l1.5 1',
  haut: 'M9 3c.5 1.5 1.6 2.3 3 2.3S14.5 4.5 15 3l5 2.5-1.8 4.3-2.2-.9V21H8V8.9l-2.2.9L4 5.5z',
  veste: 'M9 3 4 6l1.5 5L7 10.5V21h4V8l1-1 1 1v13h4V10.5l1.5.5L20 6l-5-3-3 3z',
  bas: 'M6.5 3h11l1.5 18h-5l-2-11-2 11H5zM6.5 6.5h11',
  chaussures: 'M3 17V9.5c0-.8.7-1.3 1.4-1l3.1 1.3c.9.4 2-.1 2.3-1L10.5 7l3 3.5c1.2 1.3 3 2.1 4.8 2.3 1.6.2 2.7 1.5 2.7 3V17zM3 17h18',
  spark: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  friends: 'M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.2 2.4 3.5 5.2',
  save: 'M6 3h12v18l-6-4.5L6 21z',
  hist: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2',
  left: 'M11 6l-6 6 6 6M18 6l-6 6 6 6', right: 'M13 6l6 6-6 6M6 6l6 6-6 6',
  back: 'M15 5l-7 7 7 7', close: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14',
  sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
  cam: 'M4 8h3l1.5-2.5h7L17 8h3v11H4zM15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  retry: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  hanger: 'M10 5a2 2 0 1 1 2 2v1.5L3.4 14.6c-.9.6-.5 1.9.6 1.9h16c1.1 0 1.5-1.3.6-1.9L12 8.5',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  chev: 'M9 6l6 6-6 6'
};
const ico = (k, size = 22, sw = 1.7, fill = 'none') => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${P[k]}"/></svg>`;
const col = (hex) => safeColor(hex);
// En ligne : couche hors connexion par-dessus Supabase. Démo : stockage local direct.
const store = isDemo ? demo : createSync(online);

/* ---------------- état ---------------- */
const S = {
  ready: false, user: null, profile: { username: '', avatar: { ...DEFAULT_AVATAR } },
  items: [], outfits: [], wears: [],
  route: { name: 'home' },
  sel: { haut: null, bas: null, chaussures: null, veste: null, accessoire: null },
  note: 'Choisis ta tenue',
  filters: { type: 'Tous', fit: 'Toutes', color: null, sort: 0 },
  sheet: null, detail: null, toast: null, loadErr: '',
  authMode: 'login', authErr: '', authInfo: '', busy: false, confirmDelete: null, confirmAccount: false, confirmSignOut: false,
  net: { offline: false, syncing: false, pending: 0, conflicts: 0 }
};
const app = document.getElementById('app');
const byCat = (c) => S.items.filter((i) => i.category === c);
const item = (id) => S.items.find((i) => i.id === id) || null;

/* ---------------- thème ---------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0B0B0B' : '#F2F1ED');
  try { localStorage.setItem('garderobe-theme', t); } catch (e) { /* stockage indisponible */ }
}
applyTheme((() => { try { return localStorage.getItem('garderobe-theme'); } catch (e) { return null; } })() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

/* ---------------- utilitaires ---------------- */
let toastTimer;
function toast(msg, kind = 'ok') {
  S.toast = { msg, kind }; render();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, kind === 'err' ? 4000 : 2200);
}
const dateFr = (d, opts) => new Intl.DateTimeFormat('fr-FR', opts).format(d);
function dayLabel(iso) {
  const t = today();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (iso === t) return "Aujourd'hui";
  if (iso === y.toLocaleDateString('sv-SE')) return 'Hier';
  return dateFr(new Date(iso + 'T12:00:00'), { weekday: 'long', day: 'numeric', month: 'long' });
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// URL de prévisualisation créées par l'app (à libérer quand on n'en a plus besoin)
const ownUrls = new Set();
function makePreview(blob) { const u = URL.createObjectURL(blob); ownUrls.add(u); return u; }
function dropPreview(u) { if (u && ownUrls.has(u)) { URL.revokeObjectURL(u); ownUrls.delete(u); } }
function closeSheet() {
  if (S.sheet?.form) { dropPreview(S.sheet.form.frontPreview); dropPreview(S.sheet.form.backPreview); }
  S.sheet = null; S.confirmAccount = false; S.confirmSignOut = false;
}

/* ---------------- sélection courante ---------------- */
function ensureSelection() {
  for (const c of ['haut', 'bas', 'chaussures']) {
    const list = byCat(c);
    if (!list.find((i) => i.id === S.sel[c])) S.sel[c] = list[0]?.id || null;
  }
  for (const c of ['veste', 'accessoire']) if (S.sel[c] && item(S.sel[c])?.category !== c) S.sel[c] = null;
  try { localStorage.setItem('garderobe-sel', JSON.stringify(S.sel)); } catch (e) { /* rien */ }
}
function step(cat, d) {
  const list = byCat(cat); if (!list.length) return;
  const i = Math.max(0, list.findIndex((x) => x.id === S.sel[cat]));
  S.sel[cat] = list[(i + d + list.length) % list.length].id;
  S.note = 'Choix manuel'; ensureSelection(); render();
}
function suggest() {
  const T = byCat('haut'), B = byCat('bas'), C = byCat('chaussures');
  if (!T.length || !B.length) return toast('Ajoute au moins un haut et un bas', 'err');
  let top = T[Math.floor(Math.random() * T.length)];
  if (T.length > 1 && top.id === S.sel.haut) top = T[(T.indexOf(top) + 1) % T.length];
  const want = top.fit === 'Ample' ? ['Ajusté'] : top.fit === 'Ajusté' ? ['Regular', 'Ample'] : ['Ajusté', 'Regular'];
  const recent = new Set(S.wears.slice(0, 3).flatMap((w) => [w.top_id, w.bottom_id]));
  const score = (b) => (want.includes(b.fit) ? 2 : 0) + (isNeutral(top.color_hex) || isNeutral(b.color_hex) ? 2 : 0) + (b.color_hex !== top.color_hex ? 1 : 0) - (recent.has(b.id) ? 1 : 0) + Math.random();
  const bottom = B.slice().sort((a, b) => score(b) - score(a))[0];
  const shoes = C.length ? C[Math.floor(Math.random() * C.length)] : null;
  S.sel.haut = top.id; S.sel.bas = bottom.id; if (shoes) S.sel.chaussures = shoes.id;
  S.note = top.fit === 'Ample' && bottom.fit === 'Ajusté' ? 'Haut ample + bas ajusté'
    : !isNeutral(top.color_hex) ? 'Couleur forte + bas neutre' : 'Proportions équilibrées';
  ensureSelection(); render();
}

/* ---------------- chargement ---------------- */
async function loadAll() {
  const [profile, items, outfits, wears] = await Promise.all([store.profile(), store.items(), store.outfits(), store.wears()]);
  S.profile = profile; S.items = items; S.outfits = outfits; S.wears = wears;
  try { Object.assign(S.sel, JSON.parse(localStorage.getItem('garderobe-sel') || '{}')); } catch (e) { /* rien */ }
  ensureSelection();
}
async function boot() {
  render();
  S.loadErr = '';
  try {
    S.user = await store.session();
    if (S.user) await loadAll();
  } catch (e) { S.loadErr = e.message || 'Chargement impossible.'; }
  S.ready = true; route(); render();
}
function resetSession() {
  closeSheet();
  Object.assign(S, { user: null, detail: null, items: [], outfits: [], wears: [], loadErr: '', confirmDelete: null });
  if (location.hash && location.hash !== '#/') location.hash = '#/';
  render();
}
// Déconnexion / session expirée détectée par Supabase (ou dans un autre onglet)
Promise.resolve(store.onAuth((event) => {
  if (event === 'SIGNED_OUT' && S.user && !S.expectSignOut) { resetSession(); toast('Tu as été déconnecté.', 'err'); }
})).catch(() => {});
// Liens des photos : renouvelés avant expiration (app restée ouverte longtemps)
async function refreshPhotoLinks() {
  if (!S.user || !S.items.length) return;
  try {
    const next = await store.resign(S.items);
    if (next !== S.items) { S.items = next; render(); }
  } catch (e) { /* on réessaiera au prochain passage */ }
}
setInterval(refreshPhotoLinks, 10 * 60 * 1000);
// État de la synchronisation (hors connexion, envois en attente, conflits)
store.onStatus?.((st) => {
  const prev = S.net; S.net = st;
  if (prev.pending + prev.conflicts !== st.pending + st.conflicts || prev.offline !== st.offline || prev.syncing !== st.syncing) render();
});
// Après une synchronisation : on reprend les données à jour
store.onChange?.(() => {
  const snap = store.snapshot?.(); if (!snap || !S.user) return;
  S.profile = snap.profile; S.items = snap.items; S.outfits = snap.outfits; S.wears = snap.wears;
  ensureSelection(); render();
  if (!S.net.pending && !S.net.conflicts) toast('Modifications synchronisées');
});
// Message honnête quand l'action est seulement enregistrée sur l'appareil
const done = (msg) => ((S.net.offline || S.net.pending) && !isDemo ? `${msg} sur cet appareil · envoi au retour du réseau` : msg);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPhotoLinks(); });

/* ---------------- routes ---------------- */
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'c' && CATEGORIES[b]) {
    if (S.route.name !== 'cat' || S.route.cat !== b) S.filters = { type: 'Tous', fit: 'Toutes', color: null, sort: 0 };
    S.route = { name: 'cat', cat: b };
  } else if (a === 'historique') S.route = { name: 'history' };
  else if (a === 'garde-robe') S.route = { name: 'wardrobe' };
  else if (a === 'profil') S.route = { name: 'profile' };
  else S.route = { name: 'home' };
  S.detail = null; S.confirmAccount = false; S.confirmSignOut = false;
}
addEventListener('hashchange', () => { route(); render(); scrollTo(0, 0); });

/* ---------------- rendu ---------------- */
function render() {
  const sb = document.querySelector('.sheet-body');
  const keep = sb ? sb.scrollTop : 0;
  const focusId = document.activeElement?.id;
  let html;
  if (!S.ready) html = '<div class="spinner" role="status" aria-label="Chargement"></div>';
  else if (S.loadErr) html = viewLoadError();
  else if (!S.user) html = viewAuth();
  else if (S.route.name === 'cat') html = viewCat(S.route.cat);
  else if (S.route.name === 'history') html = viewHistory();
  else if (S.route.name === 'wardrobe') html = viewWardrobe();
  else if (S.route.name === 'profile') html = viewProfile();
  else html = viewHome();
  if (S.ready && S.user && !S.loadErr) html += tabBar();
  if (S.user && !S.loadErr && S.detail) html += viewDetail();
  if (S.user && S.sheet?.kind === 'pick') html += viewPick();
  if (S.user && S.sheet?.kind === 'import') html += viewImport();
  if (S.user && S.sheet?.kind === 'avatar') html += viewAvatar();
  if (S.user && S.sheet?.kind === 'sync') html += viewSync();
  if (S.toast) html += `<div class="toast ${S.toast.kind === 'err' ? 'err' : ''}" role="${S.toast.kind === 'err' ? 'alert' : 'status'}">${esc(S.toast.msg)}</div>`;
  app.innerHTML = html;
  const nb = document.querySelector('.sheet-body'); if (nb) nb.scrollTop = keep;
  if (focusId) document.getElementById(focusId)?.focus();
  document.body.style.overflow = S.sheet || S.detail ? 'hidden' : '';
}

const demoBanner = () => isDemo ? `<div class="banner"><span>Mode démo : tes données restent sur cet appareil.</span></div>` : netBanner();
function netBanner() {
  const n = S.net; if (!n) return '';
  const plural = (k, w) => `${k} ${w}${k > 1 ? 's' : ''}`;
  if (n.conflicts) return `<button class="banner warn" data-act="openSync">${plural(n.conflicts, 'modification')} à vérifier : la donnée a changé ailleurs. Choisir →</button>`;
  if (n.syncing) return `<div class="banner" role="status">Synchronisation… (${plural(n.pending, 'modification')})</div>`;
  if (n.offline) return `<button class="banner" data-act="openSync" role="status">Hors connexion${n.pending ? ` · ${plural(n.pending, 'modification')} en attente` : ''} — envoi automatique au retour du réseau</button>`;
  if (n.pending) return `<button class="banner" data-act="openSync">${plural(n.pending, 'modification')} en attente d’envoi</button>`;
  return '';
}

function viewLoadError() {
  return `<main class="auth">
    <h1 class="h-font">Oups</h1>
    <p>Impossible de charger ta garde-robe.</p>
    <div class="err" role="alert">${esc(S.loadErr)}</div>
    <button class="btn accent" data-act="retry">${ico('retry', 20, 2)}Réessayer</button>
  </main>`;
}

function viewAuth() {
  const signup = S.authMode === 'signup';
  return `<main class="auth">
    <div>${faceSVG(DEFAULT_AVATAR, 64)}</div>
    <h1 class="h-font">${signup ? 'Crée ton compte' : 'Ma garde-robe'}</h1>
    <p>${signup ? 'Ta garde-robe sera synchronisée sur tous tes appareils.' : 'Retrouve toutes tes pièces et compose ta tenue en quelques secondes.'}</p>
    ${isDemo ? '<p class="note">Mode démo : n’importe quel e-mail et mot de passe fonctionnent.</p>' : ''}
    <form id="auth-form" novalidate>
      ${signup ? `<label class="field">Prénom ou pseudo<input class="input" id="a-user" name="username" autocomplete="nickname" maxlength="40" required></label>` : ''}
      <label class="field">E-mail<input class="input" id="a-mail" name="email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field">Mot de passe<input class="input" id="a-pass" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
      ${S.authErr ? `<div class="err" role="alert">${esc(S.authErr)}</div>` : ''}
      ${S.authInfo ? `<div class="info" role="status">${esc(S.authInfo)}</div>` : ''}
      <button class="btn accent" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Un instant…' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
    <button class="switch" data-act="authMode">${signup ? 'J’ai déjà un compte' : 'Pas encore de compte ? Inscris-toi'}</button>
  </main>`;
}

/* ---------------- barre d'onglets ---------------- */
function tabBar() {
  const r = S.route.name, cur = r === 'cat' ? 'wardrobe' : r;
  const tab = (key, href, icon, label) => `<a class="tab" href="${href}" ${cur === key ? 'aria-current="page"' : ''}>${ico(icon, 22, 1.9)}<span>${label}</span></a>`;
  return `<nav class="tabbar" aria-label="Navigation principale">
    ${tab('home', '#/', 'haut', 'Tenue')}${tab('wardrobe', '#/garde-robe', 'hanger', 'Garde-robe')}
    <button class="tab add" data-act="openImport" aria-label="Importer une pièce"><span>${ico('plus', 26, 2.4)}</span></button>
    ${tab('history', '#/historique', 'hist', 'Historique')}${tab('profile', '#/profil', 'avatar', 'Profil')}
  </nav>`;
}

/* ---------------- accueil ---------------- */
const SLOTS = [['haut', 'Haut'], ['veste', 'Veste'], ['bas', 'Bas'], ['chaussures', 'Chaussures'], ['accessoire', 'Accessoire']];
const OPTIONAL = new Set(['veste', 'accessoire']);
function slotBtn(cat, label) {
  const it = item(S.sel[cat]);
  const vis = it ? (it.front_url ? `<img src="${esc(it.front_url)}" alt="" data-photo-img>` : `<span class="slot-dot" style="background:${col(it.color_hex)}"></span>`) : ico(OPTIONAL.has(cat) ? 'plus' : cat, 20, 1.8);
  const name = it ? esc(it.name) : OPTIONAL.has(cat) ? 'Ajouter' : 'Aucun';
  return `<button class="slot ${it ? 'on' : ''}" data-act="openPick" data-cat="${cat}" aria-label="${label} : ${it ? esc(it.name) : 'aucun'}. Changer">
    <span class="slot-vis">${vis}</span><span class="slot-k">${label}</span><span class="slot-n">${name}</span></button>`;
}

/* ---------------- composition à plat (façon lookbook) ---------------- */
// Positions en % de la zone : haut en haut à gauche, veste qui chevauche à droite,
// bas en dessous, accessoire et chaussures sur la droite. Sans veste, l'accessoire remonte.
const LOOK = {
  withJacket: { veste: [47, 4, 49, 42, 0], haut: [5, 6, 46, 33, 0], bas: [9, 40, 44, 56, 0], accessoire: [60, 49, 28, 20, 6], chaussures: [54, 73, 42, 22, -6] },
  noJacket: { haut: [8, 4, 52, 37, 0], accessoire: [62, 12, 30, 24, 6], bas: [12, 43, 44, 54, 0], chaussures: [56, 68, 40, 24, -6] }
};
const LOOK_LABEL = { haut: 'Haut', veste: 'Veste', bas: 'Bas', chaussures: 'Chaussures', accessoire: 'Accessoire' };
function lookBoard() {
  const L = S.sel.veste && item(S.sel.veste) ? LOOK.withJacket : LOOK.noJacket;
  const pieces = Object.entries(L).map(([cat, [x, y, w, h, rot]]) => {
    const it = item(S.sel[cat]); if (!it) return '';
    const vis = it.front_url ? `<img src="${esc(it.front_url)}" alt="" data-photo-img draggable="false">` : garmentSVG(it, 'front');
    return `<button class="look-piece ${it.front_url ? 'photo' : ''}" data-act="openPick" data-swipe="${cat}" data-cat="${cat}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;--rot:${rot}deg"
      aria-label="${LOOK_LABEL[cat]} : ${esc(it.name)}. Toucher pour changer, glisser pour passer à la suivante">${vis}</button>`;
  }).join('');
  return pieces || '<div class="look-empty">Choisis un haut et un bas pour composer ta tenue.</div>';
}

function viewHome() {
  const top = item(S.sel.haut), bottom = item(S.sel.bas), shoes = item(S.sel.chaussures), jacket = item(S.sel.veste);
  const wornToday = S.wears.find((w) => w.worn_on === today());
  const isWorn = wornToday && wornToday.top_id === S.sel.haut && wornToday.bottom_id === S.sel.bas && wornToday.shoes_id === S.sel.chaussures && (wornToday.jacket_id || null) === (S.sel.veste || null);
  const dark = document.documentElement.dataset.theme === 'dark';
  return `${demoBanner()}<main class="screen home">
    <header class="home-head">
      <div><div class="kicker">${cap(dateFr(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1 class="h-font display">Fit du jour</h1></div>
      <button class="icon-btn" data-act="theme" aria-pressed="${dark}" aria-label="${dark ? 'Passer en mode clair' : 'Passer en mode sombre'}">${ico('moon', 20, 1.9, dark ? 'currentColor' : 'none')}</button>
    </header>
    <div class="stage2 look" aria-label="Tenue composée">
      <span class="sticker" role="status">${esc(S.note)}</span>
      ${lookBoard()}
    </div>
    ${!S.items.length ? '<div class="info">Ta garde-robe est vide : touche <b>+</b> en bas pour importer ta première pièce.</div>' : ''}
    <section class="slots" aria-label="Tenue en cours">${SLOTS.map(([c, l]) => slotBtn(c, l)).join('')}</section>
    <div class="home-actions">
      <button class="btn accent" data-act="suggest">${ico('spark', 20, 1.9)}Suggestion</button>
      <button class="btn dark" data-act="wear" aria-label="${isWorn ? 'Tenue notée comme portée aujourd’hui' : 'Je la porte aujourd’hui'}" ${!top || !bottom || S.busy ? 'disabled' : ''}>${isWorn ? ico('check', 18, 2.2) + 'Portée' : 'Je la porte'}</button>
      <button class="btn ghost sq" data-act="saveOutfit" aria-label="Enregistrer la tenue" title="Enregistrer la tenue" ${S.busy ? 'disabled' : ''}>${ico('save', 20, 1.9)}</button>
    </div>
  </main>`;
}

/* ---------------- choix d'une pièce depuis l'accueil ---------------- */
function viewPick() {
  const cat = S.sheet.cat, C = CATEGORIES[cat], list = byCat(cat), cur = S.sel[cat];
  const check = `<span class="pick-check" aria-hidden="true">${ico('check', 15, 2.6)}</span>`;
  const none = OPTIONAL.has(cat) ? `<button class="pick ${!cur ? 'on' : ''}" data-act="pick" data-cat="${cat}" data-id="" aria-pressed="${!cur}"><span class="pick-img none">${ico('close', 26, 1.8)}</span><b>${cat === 'veste' ? 'Sans veste' : 'Aucun'}</b><small>Retirer de la tenue</small>${!cur ? check : ''}</button>` : '';
  const tiles = list.map((it) => `<button class="pick ${cur === it.id ? 'on' : ''}" data-act="pick" data-cat="${cat}" data-id="${it.id}" aria-pressed="${cur === it.id}"><span class="pick-img">${tileVisual(it)}</span><b>${esc(it.name)}</b><small>${esc([it.type, it.color_name].filter(Boolean).join(' · '))}</small>${cur === it.id ? check : ''}</button>`).join('');
  return `<div class="overlay" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Choisir : ${C.title}">
    <span class="grab"></span>
    <div class="sheet-head"><div><span class="kicker sheet-kicker">Choisir · ${list.length} pièce${list.length > 1 ? 's' : ''}</span><h2 class="h-font">${C.title}</h2></div><button class="icon-btn" data-act="closeSheet" aria-label="Fermer">${ico('close', 18, 2)}</button></div>
    <div class="sheet-body">
      ${list.length ? `<div class="pick-grid">${none}${tiles}</div>
      <button class="more-toggle" data-act="pickBrowse" data-cat="${cat}">Voir toutes les ${C.title.toLowerCase()} (filtres) →</button>`
      : `<div class="empty" style="padding:24px 10px"><b>Aucune pièce ici</b>Importe ${C.one} pour la porter.</div>
      <button class="btn accent" data-act="openImport" data-cat="${cat}">${ico('plus', 20, 2)}Importer ${C.one}</button>`}
    </div>
  </div></div>`;
}

/* ---------------- garde-robe ---------------- */
function viewWardrobe() {
  const total = S.items.length, favs = S.items.filter((i) => i.favorite).length;
  const thumb = (it) => (it.front_url ? `<img src="${esc(it.front_url)}" alt="" loading="lazy" data-photo-img>` : `<span>${garmentSVG(it, 'front')}</span>`);
  return `${demoBanner()}<main class="screen">
    <header class="cat-head"><div class="t"><span class="kicker">Ma collection</span><h1 class="h-font">Garde-robe</h1><span class="sub">${total} pièce${total > 1 ? 's' : ''}${favs ? ` · ${favs} favori${favs > 1 ? 's' : ''}` : ''}</span></div></header>
    <div class="cats">${CAT_ORDER.map((cat) => {
      const list = byCat(cat), C = CATEGORIES[cat], extra = list.length - 4;
      const shown = extra > 0 ? list.slice(0, 3) : list.slice(0, 4);
      return `<a class="cat-card" href="#/c/${cat}" aria-label="${C.title} : ${list.length} pièce${list.length > 1 ? 's' : ''}">
        <span class="cat-top"><span class="cat-ico">${ico(cat, 20, 1.8)}</span>
          <span class="cat-t"><b class="h-font">${C.title}</b><span>${list.length} pièce${list.length > 1 ? 's' : ''}</span></span>${ico('chev', 18, 2)}</span>
        ${list.length ? `<span class="cat-thumbs" aria-hidden="true">${shown.map(thumb).join('')}${extra > 0 ? `<span class="more">+${extra + 1}</span>` : ''}</span>`
          : `<span class="cat-empty">Vide pour l’instant · importe ${C.one}</span>`}</a>`;
    }).join('')}</div>
  </main>`;
}

/* ---------------- profil ---------------- */
function viewProfile() {
  const dark = document.documentElement.dataset.theme === 'dark', n = S.net;
  const syncState = n.conflicts ? `${n.conflicts} à vérifier` : n.offline ? 'Hors connexion' : n.pending ? `${n.pending} en attente` : 'À jour';
  return `${demoBanner()}<main class="screen">
    <header class="cat-head"><div class="t"><h1 class="h-font">Profil</h1>${S.user?.email ? `<span class="sub">${esc(S.user.email)}</span>` : ''}</div></header>
    <section class="profile-card" aria-label="Mon profil">
      <span class="pf-face">${faceSVG(S.profile.avatar, 84)}</span>
      <div style="min-width:0"><b class="h-font pf-name">${esc(S.profile.username || 'Moi')}</b>
        <div class="stats"><span><b>${S.items.length}</b>pièces</span><span><b>${S.outfits.length}</b>tenues</span><span><b>${S.wears.length}</b>jours</span></div></div>
    </section>
    <h2 class="label-sec">Réglages</h2>
    <div class="menu">
      <button class="menu-row" data-act="openAvatar">${ico('avatar', 20, 1.8)}<span class="grow">Modifier mon avatar</span>${ico('chev', 18, 2)}</button>
      <button class="menu-row" data-act="theme" aria-pressed="${dark}">${ico('moon', 20, 1.8)}<span class="grow">Mode sombre</span><span class="toggle"><i></i></span></button>
      ${!isDemo ? `<button class="menu-row" data-act="openSync">${ico('retry', 20, 1.8)}<span class="grow">Synchronisation</span><span class="note">${syncState}</span></button>` : ''}
    </div>
    <h2 class="label-sec">Compte</h2>
    <div class="menu">
      <button class="menu-row ${S.confirmSignOut ? 'confirm' : ''}" data-act="signOut" ${S.busy ? 'disabled' : ''}>${ico('logout', 20, 1.8)}<span class="grow">${S.confirmSignOut ? 'Se déconnecter quand même' : 'Se déconnecter'}</span></button>
      <button class="menu-row ${S.confirmAccount ? 'confirm' : 'danger'}" data-act="deleteAccount" ${S.busy ? 'disabled' : ''}>${ico('trash', 20, 1.8)}<span class="grow">${S.confirmAccount ? 'Confirmer : tout supprimer définitivement' : isDemo ? 'Réinitialiser la démo' : 'Supprimer mon compte et mes données'}</span></button>
    </div>
    ${S.confirmSignOut ? `<div class="hint" style="color:var(--danger)">${n.pending + n.conflicts} modification(s) pas encore envoyée(s) seront perdues.</div>` : ''}
    ${S.confirmAccount ? `<div class="hint" style="color:var(--danger)">${isDemo ? 'Toutes les données de démo seront effacées.' : 'Tes pièces, photos, tenues et ton historique seront supprimés. Impossible d’annuler.'}</div>` : ''}
  </main>`;
}

function filtered(cat) {
  const f = S.filters;
  const sorts = [(a, b) => b.created_at.localeCompare(a.created_at), (a, b) => a.name.localeCompare(b.name, 'fr'), (a, b) => (a.color_name || '').localeCompare(b.color_name || '', 'fr'), (a, b) => (b.wear_count || 0) - (a.wear_count || 0)];
  return byCat(cat)
    .filter((d) => f.type === 'Tous' || (f.type === '♥' ? d.favorite : d.type === f.type))
    .filter((d) => f.fit === 'Toutes' || d.fit === f.fit)
    .filter((d) => !f.color || d.color_hex === f.color)
    .sort(sorts[f.sort]);
}
function tileVisual(it, side = 'front') {
  const url = side === 'front' ? it.front_url : it.back_url;
  return url ? `<img src="${esc(url)}" alt="" loading="lazy" data-photo-img>` : garmentSVG(it, side);
}

function viewCat(cat) {
  const C = CATEGORIES[cat], all = byCat(cat), list = filtered(cat), f = S.filters;
  const sortLabels = ['Récents', 'A → Z', 'Couleur', 'Plus portés'];
  const favs = all.filter((d) => d.favorite).length;
  const typeChips = ['Tous', ...(favs ? ['♥'] : []), ...C.types].map((t) => {
    const n = t === 'Tous' ? all.length : t === '♥' ? favs : all.filter((d) => d.type === t).length;
    const label = t === 'Tous' ? 'Tous' : t === '♥' ? 'Favoris' : esc(C.plural[t]);
    return `<button class="chip" aria-pressed="${f.type === t}" data-act="fType" data-v="${esc(t)}">${label} · ${n}</button>`;
  }).join('');
  const colors = [...new Map(all.map((d) => [d.color_hex, d])).values()];
  const n = list.length;
  return `${demoBanner()}<main class="screen">
    <header class="cat-head">
      <a class="icon-btn" href="#/garde-robe" aria-label="Retour à la garde-robe">${ico('back', 20, 2)}</a>
      <div class="t"><h1 class="h-font">${C.title}</h1><span class="sub">${n} ${n > 1 ? 'pièces' : 'pièce'}${n !== all.length ? ' sur ' + all.length : ''}</span></div>
      <button class="pill" data-act="sort" aria-label="Changer le tri">${ico('sort', 16, 2)}${sortLabels[f.sort]}</button>
    </header>
    <div class="chips noscroll" role="group" aria-label="Type">${typeChips}</div>
    ${C.fits.length ? `<div class="seg" role="group" aria-label="${C.fitWord}">${['Toutes', ...C.fits].map((v) => `<button aria-pressed="${f.fit === v}" data-act="fFit" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    ${colors.length > 1 ? `<div class="swatches" role="group" aria-label="Couleur"><span class="label">Couleur</span>${colors.map((d) => `<button class="swatch" style="background:${col(d.color_hex)}" aria-label="Filtrer : ${esc(d.color_name)}" aria-pressed="${f.color === d.color_hex}" data-act="fColor" data-v="${esc(d.color_hex)}"></button>`).join('')}</div>` : ''}
    ${!all.length ? `<div class="empty"><b>Rien ici pour l’instant</b>Importe ${C.one} avec une photo recto et verso.<button class="btn accent" style="height:44px" data-act="openImport" data-cat="${cat}">${ico('plus', 18, 2)}Importer ${C.one}</button></div>`
      : !n ? `<div class="empty"><b>${C.empty}</b>Change de filtre.<button class="btn ghost" style="height:40px" data-act="resetFilters">Effacer les filtres</button></div>`
      : `<div class="grid">${list.map((it) => `<button class="tile" data-act="open" data-id="${it.id}" aria-label="Voir ${esc(it.name)}">
          <div class="img">${tileVisual(it)}<span class="badge">${esc(it.type)}</span>${it.favorite ? `<span class="fav-badge" aria-label="Favori">${ico('heart', 14, 2, 'currentColor')}</span>` : ''}</div>
          <div class="meta"><b>${esc(it.name)}</b><div class="row"><span class="dot" style="width:12px;height:12px;background:${col(it.color_hex)}"></span><span class="grow">${esc(it.color_name || '')}</span>${it.fit ? `<span class="tag" style="font-size:11px;color:var(--fg)">${esc(it.fit)}</span>` : ''}</div></div>
        </button>`).join('')}</div>`}
  </main>`;
}

function wearInfo(it) {
  if (!it.wear_count) return 'Jamais portée pour l’instant';
  return `Portée ${it.wear_count} fois${it.last_worn_on ? ' · dernière fois : ' + dayLabel(it.last_worn_on).toLowerCase() : ''}`;
}

function viewDetail() {
  const it = item(S.detail.id); if (!it) return '';
  const C = CATEGORIES[it.category];
  const confirming = S.confirmDelete === it.id;
  const extra = [
    it.style, it.seasons?.length ? it.seasons.join(', ') : null,
    it.warmth ? 'Chaleur : ' + WARMTH[it.warmth - 1].toLowerCase() : null,
    it.formality ? FORMALITY[it.formality - 1] : null,
    it.material, it.brand, it.size ? 'Taille ' + it.size : null
  ].filter(Boolean);
  return `<div class="detail" role="dialog" aria-modal="true" aria-label="${esc(it.name)}"><div class="detail-inner">
    <div class="detail-top">
      <button class="icon-btn" data-act="closeDetail" aria-label="Fermer">${ico('back', 20, 2)}</button>
      <span class="label" style="letter-spacing:.08em;text-transform:uppercase">${esc(it.type)}</span>
      <span style="display:flex;gap:8px">
        <button class="icon-btn ${it.favorite ? 'on' : ''}" data-act="favorite" data-id="${it.id}" aria-pressed="${!!it.favorite}" aria-label="${it.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}" ${S.busy ? 'disabled' : ''}>${ico('heart', 18, 1.8, it.favorite ? 'currentColor' : 'none')}</button>
        <button class="icon-btn" data-act="edit" data-id="${it.id}" aria-label="Modifier la pièce">${ico('edit', 18, 1.8)}</button>
      </span>
    </div>
    <div class="flip-wrap"><button class="flip ${S.detail.back ? 'back' : ''}" data-act="flip" aria-label="Retourner la pièce (face affichée : ${S.detail.back ? 'verso' : 'recto'})">
      <div class="face">${tileVisual(it, 'front')}<span class="badge">Recto</span></div>
      <div class="face b">${it.back_url ? tileVisual(it, 'back') : it.front_url ? `<div class="empty" style="padding:20px">Pas de photo verso<br><small>Ajoute-la avec le crayon</small></div>` : garmentSVG(it, 'back')}<span class="badge">Verso</span></div>
    </button></div>
    <div class="hint">Touche la carte pour la retourner</div>
    <h2 class="h-font" style="margin:0;font-size:24px">${esc(it.name)}</h2>
    <div class="note">${esc(wearInfo(it))}</div>
    <div class="tags">
      <span><span class="dot" style="width:12px;height:12px;background:${col(it.color_hex)}"></span>${esc(it.color_name || '')}</span>
      ${(it.secondary_colors || []).map((h) => `<span><span class="dot" style="width:12px;height:12px;background:${col(h)}"></span>${esc(PALETTE.find((p) => p.hex === h)?.label || '')}</span>`).join('')}
      ${it.fit ? `<span>${esc(C.fitWord)} ${esc(it.fit.toLowerCase())}</span>` : ''}
      <span>${esc(C.title)}</span>
      ${extra.map((x) => `<span>${esc(x)}</span>`).join('')}
    </div>
    <div class="actions">
      <button class="btn accent" data-act="tryOn" data-id="${it.id}">${ico('avatar', 18, 1.8)}${it.category === 'accessoire' ? 'Ajouter à la tenue' : 'Mettre sur l’avatar'}</button>
      <button class="btn ghost" style="padding:0;color:${confirming ? '#fff' : 'var(--danger)'};background:${confirming ? 'var(--danger)' : ''}" data-act="delete" data-id="${it.id}" aria-label="${confirming ? 'Confirmer la suppression' : 'Supprimer la pièce'}" ${S.busy ? 'disabled' : ''}>${ico(confirming ? 'check' : 'trash', 20, 1.8)}</button>
    </div>
    ${confirming ? '<div class="hint" style="color:var(--danger)">Touche encore pour supprimer définitivement</div>' : ''}
  </div></div>`;
}

function viewImport() {
  const f = S.sheet.form, C = CATEGORIES[f.category];
  const slot = (side, label) => {
    const url = f[side + 'Preview'];
    return `<label class="photo-slot">${url ? `<img src="${esc(url)}" alt="Aperçu ${label.toLowerCase()}"><button type="button" class="x" data-act="clearPhoto" data-side="${side}" aria-label="Retirer la photo">${ico('close', 14, 2.2)}</button>` : `${ico('cam', 26, 1.6)}${label}`}
      <input type="file" accept="image/*" data-photo="${side}" aria-label="${label}"></label>`;
  };
  const chips = (act, opts, cur, labelFn = (o) => o) => opts.map((o) => `<button type="button" class="chip" aria-pressed="${Array.isArray(cur) ? cur.includes(o) : cur === o}" data-act="${act}" data-v="${esc(o)}">${esc(labelFn(o))}</button>`).join('');
  const levels = (act, labels, cur) => `<div class="seg">${labels.map((l, i) => `<button type="button" aria-pressed="${cur === i + 1}" data-act="${act}" data-v="${i + 1}" title="${esc(l)}">${esc(l)}</button>`).join('')}</div>`;
  const editing = !!S.sheet.editId;
  const more = S.sheet.more;
  return `<div class="overlay" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${editing ? 'Modifier la pièce' : 'Importer une pièce'}">
    <span class="grab"></span>
    <div class="sheet-head"><h2 class="h-font">${editing ? 'Modifier la pièce' : 'Importer une pièce'}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Fermer">${ico('close', 18, 2)}</button></div>
    <div class="sheet-body">
      <div class="photos">${slot('front', 'Photo recto')}${slot('back', 'Photo verso')}</div>
      <label class="field">Nom de la pièce<input class="input" id="i-name" data-input="name" value="${esc(f.name)}" placeholder="Ex. : Pull col roulé" autocomplete="off" maxlength="80"></label>
      <div class="field">Catégorie<div class="swatches">${chips('iCat', CAT_ORDER, f.category, (o) => CATEGORIES[o].title)}</div></div>
      <div class="field">Type<div class="swatches">${chips('iType', C.types, f.type)}</div></div>
      <div class="field">Couleur · ${esc(f.color_name)}<div class="swatches big">${PALETTE.map((p) => `<button type="button" class="swatch" style="background:${p.hex}" aria-label="${p.label}" aria-pressed="${f.color_hex === p.hex}" data-act="iColor" data-v="${p.hex}"></button>`).join('')}</div></div>
      ${C.fits.length ? `<div class="field">${C.fitWord}<div class="seg">${C.fits.map((v) => `<button type="button" aria-pressed="${f.fit === v}" data-act="iFit" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>` : ''}
      <button type="button" class="more-toggle" data-act="toggleMore" aria-expanded="${!!more}">${more ? 'Masquer les détails' : 'Plus de détails (facultatif)'}</button>
      ${more ? `
      <div class="field">Couleurs secondaires (4 max)<div class="swatches big">${PALETTE.map((p) => `<button type="button" class="swatch" style="background:${p.hex}" aria-label="${p.label}" aria-pressed="${f.secondary_colors.includes(p.hex)}" data-act="iColor2" data-v="${p.hex}"></button>`).join('')}</div></div>
      <div class="field">Saisons<div class="swatches">${chips('iSeason', SEASONS, f.seasons)}</div></div>
      <div class="field">Style<div class="swatches">${chips('iStyle', STYLES, f.style)}</div></div>
      <div class="field">Chaleur${levels('iWarmth', WARMTH, f.warmth)}</div>
      <div class="field">Formalité${levels('iFormality', FORMALITY, f.formality)}</div>
      <div class="field-row">
        <label class="field">Matière<input class="input" id="i-material" data-input="material" value="${esc(f.material)}" maxlength="40" placeholder="Coton…"></label>
        <label class="field">Marque<input class="input" id="i-brand" data-input="brand" value="${esc(f.brand)}" maxlength="40"></label>
        <label class="field small">Taille<input class="input" id="i-size" data-input="size" value="${esc(f.size)}" maxlength="12"></label>
      </div>
      <label class="check"><input type="checkbox" data-check="favorite" ${f.favorite ? 'checked' : ''}> Pièce favorite</label>` : ''}
      ${S.sheet.err ? `<div class="err" role="alert">${esc(S.sheet.err)}</div>` : ''}
      <button class="btn accent" data-act="submitImport" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Envoi en cours…' : editing ? 'Enregistrer les modifications' : 'Ajouter à ma garde-robe'}</button>
    </div>
  </div></div>`;
}

function viewAvatar() {
  const a = S.sheet.draft;
  const sw = (title, key) => `<div class="field">${title} · ${AV[key][a[key]].label}<div class="swatches big">${AV[key].map((o, i) => `<button type="button" class="swatch" style="background:${o.hex}" aria-label="${o.label}" aria-pressed="${a[key] === i}" data-act="av" data-k="${key}" data-v="${i}" data-num="1"></button>`).join('')}</div></div>`;
  const ch = (title, key) => `<div class="field">${title}<div class="swatches">${AV[key].map((o) => `<button type="button" class="chip" aria-pressed="${a[key] === o}" data-act="av" data-k="${key}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  return `<div class="overlay" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Mon avatar">
    <span class="grab"></span>
    <div class="sheet-head"><h2 class="h-font">Mon avatar</h2><button class="icon-btn" data-act="closeSheet" aria-label="Fermer">${ico('close', 18, 2)}</button></div>
    <div class="face-preview">${faceSVG(a, 132, '62 -2 76 76', 'Aperçu du visage')}</div>
    <div class="sheet-body">
      ${sw('Couleur de peau', 'skin')}${sw('Couleur des cheveux', 'hair')}${sw('Couleur des yeux', 'eye')}
      ${ch('Coiffure', 'hairStyle')}${ch('Forme des yeux', 'eyeShape')}${ch('Taille des yeux', 'eyeSize')}${ch('Barbe', 'beard')}${ch('Morphologie', 'build')}
      <button class="btn accent" data-act="saveAvatar" ${S.busy ? 'disabled' : ''}>Valider</button>
    </div>
  </div></div>`;
}

function viewSync() {
  const conflicts = store.conflicts?.() || [], pending = store.pendingList?.() || [];
  return `<div class="overlay" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Synchronisation">
    <span class="grab"></span>
    <div class="sheet-head"><h2 class="h-font">Synchronisation</h2><button class="icon-btn" data-act="closeSheet" aria-label="Fermer">${ico('close', 18, 2)}</button></div>
    <div class="sheet-body">
      <p class="note" style="margin:0">${S.net.offline ? 'Tu es hors connexion. Tes modifications sont gardées sur cet appareil et partiront automatiquement quand le réseau reviendra, app ouverte (iOS ne permet pas l’envoi en arrière-plan).' : 'Connexion rétablie.'}</p>
      ${conflicts.length ? `<h3 class="label" style="margin:4px 0 0;text-transform:uppercase;letter-spacing:.08em">À vérifier</h3>
      ${conflicts.map((c) => `<div class="hist"><div style="font-weight:600;font-size:14px">${esc(c.label)}</div><div class="note">${esc(c.reason)}</div>
        <div class="sync-actions">${c.failed
          ? `<button class="btn ghost" data-act="resolve" data-seq="${c.seq}" data-v="mine" ${S.net.offline || S.busy ? 'disabled' : ''}>Réessayer</button><button class="btn ghost" data-act="resolve" data-seq="${c.seq}" data-v="theirs" style="color:var(--danger)" ${S.busy ? 'disabled' : ''}>Abandonner</button>`
          : `<button class="btn ghost" data-act="resolve" data-seq="${c.seq}" data-v="theirs" ${S.net.offline || S.busy ? 'disabled' : ''}>Garder l’autre version</button><button class="btn accent" data-act="resolve" data-seq="${c.seq}" data-v="mine" ${S.net.offline || S.busy ? 'disabled' : ''}>Imposer la mienne</button>`}</div></div>`).join('')}` : ''}
      ${pending.length ? `<h3 class="label" style="margin:4px 0 0;text-transform:uppercase;letter-spacing:.08em">En attente d’envoi</h3>
      <div class="list" style="padding:0">${pending.map((p) => `<div class="mini" style="padding:8px 12px">${esc(p.label)}</div>`).join('')}</div>
      ${!S.net.offline ? `<button class="btn accent" data-act="syncNow" ${S.busy || S.net.syncing ? 'disabled' : ''}>Envoyer maintenant</button>` : ''}` : ''}
      ${!conflicts.length && !pending.length ? '<p class="note">Tout est à jour.</p>' : ''}
    </div>
  </div></div>`;
}

function minis(ids) {
  return ids.map(item).filter(Boolean).map((it) => `<span class="mini">${it.front_url ? `<img src="${esc(it.front_url)}" alt="">` : `<span class="dot" style="background:${col(it.color_hex)}"></span>`}${esc(it.name)}</span>`).join('') || '<span class="note">Pièces supprimées</span>';
}
const outfitIds = (o) => [o.top_id, o.jacket_id, o.bottom_id, o.shoes_id, o.accessory_id];
function viewHistory() {
  const outfits = S.outfits.slice().sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  return `${demoBanner()}<main class="screen">
    <header class="cat-head">
      <div class="t"><h1 class="h-font">Historique</h1><span class="sub">${S.wears.length} jour${S.wears.length > 1 ? 's' : ''} noté${S.wears.length > 1 ? 's' : ''} · ${S.outfits.length} tenue${S.outfits.length > 1 ? 's' : ''}</span></div>
    </header>
    <h2 class="label" style="margin:8px 4px 0;text-transform:uppercase;letter-spacing:.08em">Tenues enregistrées</h2>
    <div class="list">${outfits.length ? outfits.map((o) => `<div class="hist">
        <div class="when"><span>${o.favorite ? '♥ ' : ''}${esc(o.name || 'Tenue')}</span><span style="display:flex;gap:14px">
          <button data-act="favOutfit" data-id="${o.id}" aria-pressed="${!!o.favorite}">${o.favorite ? 'Retirer favori' : 'Favori'}</button>
          <button data-act="useOutfit" data-id="${o.id}">Mettre</button>
          <button data-act="delOutfit" data-id="${o.id}" style="color:var(--danger)">${S.confirmDelete === o.id ? 'Confirmer' : 'Supprimer'}</button></span></div>
        <div class="mini-row">${minis(outfitIds(o))}</div></div>`).join('')
      : '<div class="note" style="padding:0 4px">Compose une tenue dans l’onglet Tenue puis touche le marque-page pour l’enregistrer.</div>'}</div>
    <h2 class="label" style="margin:8px 4px 0;text-transform:uppercase;letter-spacing:.08em">Ce que j’ai porté</h2>
    <div class="list">${S.wears.length ? S.wears.map((w) => `<div class="hist">
        <div class="when"><span>${esc(dayLabel(w.worn_on))}</span><button data-act="delWear" data-id="${w.id}" style="color:var(--muted)">Retirer</button></div>
        <div class="mini-row">${minis(outfitIds(w))}</div></div>`).join('')
      : '<div class="note" style="padding:0 4px">Touche « Je la porte aujourd’hui » dans l’onglet Tenue pour garder une trace.</div>'}</div>
  </main>`;
}

/* ---------------- actions ---------------- */
function newForm(cat = 'haut') {
  const C = CATEGORIES[cat];
  return {
    name: '', category: cat, type: C.types[0], color_hex: PALETTE[0].hex, color_name: PALETTE[0].label, fit: C.fits[1] || C.fits[0] || '',
    secondary_colors: [], seasons: [], style: null, warmth: null, formality: null, material: '', brand: '', size: '', favorite: false,
    front: null, back: null, frontPreview: null, backPreview: null
  };
}
function currentOutfit() {
  return { top_id: S.sel.haut, bottom_id: S.sel.bas, shoes_id: S.sel.chaussures, jacket_id: S.sel.veste, accessory_id: S.sel.accessoire };
}
// Exécute une opération ; renvoie true seulement si elle a réussi. Les erreurs sont toujours affichées.
async function guarded(fn, errTarget) {
  S.busy = true; render();
  let ok = false;
  try { await fn(); ok = true; } catch (e) {
    const msg = e?.message || 'Une erreur est survenue.';
    if (errTarget === 'sheet' && S.sheet) S.sheet.err = msg;
    else if (errTarget === 'auth') { if (e?.info) { S.authInfo = msg; S.authErr = ''; } else { S.authErr = msg; S.authInfo = ''; } }
    else { S.busy = false; toast(msg, 'err'); }
  }
  S.busy = false; render();
  return ok;
}

const actions = {
  authMode() { S.authMode = S.authMode === 'login' ? 'signup' : 'login'; S.authErr = ''; S.authInfo = ''; render(); },
  async retry() { S.ready = false; await boot(); },
  step(el) { step(el.dataset.cat, Number(el.dataset.d)); },
  suggest,
  theme() { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); render(); },
  openPick(el) { S.sheet = { kind: 'pick', cat: el.dataset.cat }; render(); },
  pick(el) {
    S.sel[el.dataset.cat] = el.dataset.id || null; S.note = 'Choix manuel';
    closeSheet(); ensureSelection(); render();
  },
  pickBrowse(el) { closeSheet(); location.hash = '#/c/' + el.dataset.cat; },
  unselect(el) { S.sel[el.dataset.cat] = null; ensureSelection(); render(); },
  async saveOutfit() {
    if (!S.sel.haut || !S.sel.bas) return toast('Il faut au moins un haut et un bas', 'err');
    const parts = [item(S.sel.haut), item(S.sel.bas)].map((i) => i.name.split(' ')[0]);
    const ok = await guarded(async () => { const o = await store.saveOutfit({ name: parts.join(' + '), ...currentOutfit() }); S.outfits.unshift(o); });
    if (ok) toast(done('Tenue enregistrée'));
  },
  async wear() {
    const ok = await guarded(async () => {
      const w = await store.setWear({ worn_on: today(), ...currentOutfit() });
      S.wears = [w, ...S.wears.filter((x) => x.worn_on !== w.worn_on)];
      S.items = await store.items();   // nombre de ports mis à jour côté serveur
    });
    if (ok) toast(done('Noté dans ton historique'));
  },
  openSync() { S.sheet = { kind: 'sync' }; render(); },
  async syncNow() { await guarded(async () => { await store.flush?.(); }); },
  async resolve(el) {
    const ok = await guarded(async () => { await store.resolve(Number(el.dataset.seq), el.dataset.v); });
    if (ok) { const snap = store.snapshot?.(); if (snap) { S.profile = snap.profile; S.items = snap.items; S.outfits = snap.outfits; S.wears = snap.wears; ensureSelection(); } if (!(store.conflicts?.() || []).length && !(store.pendingList?.() || []).length) closeSheet(); render(); }
  },
  openAvatar() { S.sheet = { kind: 'avatar', draft: { ...S.profile.avatar } }; S.confirmAccount = false; render(); },
  av(el) { S.sheet.draft[el.dataset.k] = el.dataset.num ? Number(el.dataset.v) : el.dataset.v; render(); },
  async saveAvatar() {
    const draft = S.sheet.draft;
    const ok = await guarded(async () => { await store.saveAvatar(draft); S.profile.avatar = draft; closeSheet(); });
    if (ok) toast(done('Avatar mis à jour'));
  },
  async signOut() {
    const unsent = (S.net.pending || 0) + (S.net.conflicts || 0);
    if (unsent && !S.confirmSignOut) { S.confirmSignOut = true; render(); return; }
    S.confirmSignOut = false;
    S.expectSignOut = true;
    const ok = await guarded(async () => { await store.signOut(); });
    S.expectSignOut = false;
    if (ok) resetSession();
  },
  async deleteAccount() {
    if (!S.confirmAccount) { S.confirmAccount = true; render(); return; }
    S.expectSignOut = true;
    const ok = await guarded(async () => { await store.deleteAccount(); });
    S.expectSignOut = false;
    if (ok) { resetSession(); if (isDemo) location.reload(); else toast('Compte et données supprimés'); }
  },
  openImport(el) {
    const cat = el.dataset.cat || (S.route.name === 'cat' ? S.route.cat : 'haut');
    S.sheet = { kind: 'import', form: newForm(cat), editId: null, err: '', more: false }; render();
  },
  edit(el) {
    const it = item(el.dataset.id); if (!it) return;
    S.sheet = {
      kind: 'import', editId: it.id, err: '', more: !!(it.style || it.seasons?.length || it.warmth || it.formality || it.material || it.brand || it.size || it.secondary_colors?.length || it.favorite),
      form: {
        ...newForm(it.category), name: it.name, category: it.category, type: it.type, color_hex: it.color_hex, color_name: it.color_name, fit: it.fit || '',
        secondary_colors: [...(it.secondary_colors || [])], seasons: [...(it.seasons || [])], style: it.style, warmth: it.warmth, formality: it.formality,
        material: it.material || '', brand: it.brand || '', size: it.size || '', favorite: !!it.favorite,
        frontPreview: it.front_url, backPreview: it.back_url
      }
    };
    render();
  },
  closeSheet() { closeSheet(); render(); },
  closeSheetBg(el, ev) { if (ev.target === el) { closeSheet(); render(); } },
  toggleMore() { S.sheet.more = !S.sheet.more; render(); },
  iCat(el) { const f = S.sheet.form, C = CATEGORIES[el.dataset.v]; f.category = el.dataset.v; f.type = C.types[0]; f.fit = C.fits[1] || C.fits[0] || ''; render(); },
  iType(el) { S.sheet.form.type = el.dataset.v; render(); },
  iFit(el) { S.sheet.form.fit = el.dataset.v; render(); },
  iColor(el) { const p = PALETTE.find((x) => x.hex === el.dataset.v); S.sheet.form.color_hex = p.hex; S.sheet.form.color_name = p.label; render(); },
  iColor2(el) {
    const f = S.sheet.form, v = el.dataset.v;
    if (f.secondary_colors.includes(v)) f.secondary_colors = f.secondary_colors.filter((x) => x !== v);
    else if (f.secondary_colors.length < 4) f.secondary_colors.push(v);
    else return toast('4 couleurs secondaires maximum', 'err');
    render();
  },
  iSeason(el) { const f = S.sheet.form, v = el.dataset.v; f.seasons = f.seasons.includes(v) ? f.seasons.filter((x) => x !== v) : [...f.seasons, v]; render(); },
  iStyle(el) { const f = S.sheet.form; f.style = f.style === el.dataset.v ? null : el.dataset.v; render(); },
  iWarmth(el) { const f = S.sheet.form, v = Number(el.dataset.v); f.warmth = f.warmth === v ? null : v; render(); },
  iFormality(el) { const f = S.sheet.form, v = Number(el.dataset.v); f.formality = f.formality === v ? null : v; render(); },
  clearPhoto(el, ev) { ev.preventDefault(); const f = S.sheet.form, s = el.dataset.side; dropPreview(f[s + 'Preview']); f[s] = null; f[s + 'Preview'] = null; render(); },
  async submitImport() {
    const f = S.sheet.form, editId = S.sheet.editId;
    const name = (f.name.trim() || `${f.type} ${f.color_name.toLowerCase()}`).slice(0, 80);
    const clean = (s) => (String(s || '').trim() || null);
    const meta = {
      category: f.category, type: f.type, name, color_name: f.color_name, color_hex: f.color_hex, fit: f.fit,
      secondary_colors: f.secondary_colors.filter((h) => h !== f.color_hex), seasons: f.seasons, style: f.style,
      warmth: f.warmth, formality: f.formality, material: clean(f.material), brand: clean(f.brand), size: clean(f.size), favorite: !!f.favorite
    };
    let saved = null;
    const ok = await guarded(async () => {
      if (editId) {
        saved = await store.updateItem(editId, meta, f.front, f.back);
        S.items = S.items.map((x) => (x.id === editId ? (saved?.id ? saved : { ...x, ...meta }) : x));
      } else {
        saved = await store.addItem(meta, f.front, f.back);
        S.items.unshift(saved);
        S.sel[f.category] = saved.id;
      }
      closeSheet(); ensureSelection();
    }, 'sheet');
    if (ok) toast(done(editId ? 'Pièce modifiée' : `« ${name} » ajouté`));
  },
  open(el) { S.detail = { id: el.dataset.id, back: false }; S.confirmDelete = null; render(); },
  closeDetail() { S.detail = null; S.confirmDelete = null; render(); },
  // Retourne la carte sans redessiner l'écran (sinon l'animation 3D est perdue)
  flip(el) {
    S.detail.back = !S.detail.back;
    el.classList.toggle('back', S.detail.back);
    el.setAttribute('aria-label', `Retourner la pièce (face affichée : ${S.detail.back ? 'verso' : 'recto'})`);
  },
  async favorite(el) {
    const it = item(el.dataset.id); if (!it) return;
    const ok = await guarded(async () => {
      const saved = await store.updateItem(it.id, { favorite: !it.favorite });
      S.items = S.items.map((x) => (x.id === it.id ? (saved?.id ? saved : { ...x, favorite: !it.favorite }) : x));
    });
    if (ok) toast(done(item(it.id)?.favorite ? 'Ajoutée aux favoris' : 'Retirée des favoris'));
  },
  tryOn(el) {
    const it = item(el.dataset.id); if (!it) return;
    S.sel[it.category] = it.id; S.note = 'Choix manuel'; S.detail = null; ensureSelection();
    location.hash = '#/';
    toast(`${it.name} sur l’avatar`);
  },
  async delete(el) {
    const id = el.dataset.id;
    if (S.confirmDelete !== id) { S.confirmDelete = id; render(); return; }
    const name = item(id)?.name;
    let res = {};
    const ok = await guarded(async () => {
      res = (await store.deleteItem(id)) || {};
      S.items = S.items.filter((x) => x.id !== id);
      const strip = (o) => { for (const k of ['top_id', 'bottom_id', 'shoes_id', 'accessory_id', 'jacket_id']) if (o[k] === id) o[k] = null; };
      S.outfits.forEach(strip); S.wears.forEach(strip);
      S.detail = null; S.confirmDelete = null; ensureSelection();
    });
    if (ok) toast(res.warning || done(`« ${name} » supprimé`), res.warning ? 'err' : 'ok');
  },
  fType(el) { S.filters.type = el.dataset.v; render(); },
  fFit(el) { S.filters.fit = el.dataset.v; render(); },
  fColor(el) { S.filters.color = S.filters.color === el.dataset.v ? null : el.dataset.v; render(); },
  sort() { S.filters.sort = (S.filters.sort + 1) % 4; render(); },
  resetFilters() { S.filters = { type: 'Tous', fit: 'Toutes', color: null, sort: S.filters.sort }; render(); },
  useOutfit(el) {
    const o = S.outfits.find((x) => x.id === el.dataset.id); if (!o) return;
    if (o.top_id && item(o.top_id)) S.sel.haut = o.top_id;
    if (o.bottom_id && item(o.bottom_id)) S.sel.bas = o.bottom_id;
    if (o.shoes_id && item(o.shoes_id)) S.sel.chaussures = o.shoes_id;
    S.sel.veste = o.jacket_id && item(o.jacket_id) ? o.jacket_id : null;
    S.sel.accessoire = o.accessory_id && item(o.accessory_id) ? o.accessory_id : null;
    S.note = o.name || 'Tenue enregistrée'; ensureSelection(); location.hash = '#/';
  },
  async favOutfit(el) {
    const o = S.outfits.find((x) => x.id === el.dataset.id); if (!o) return;
    await guarded(async () => { const n = await store.updateOutfit(o.id, { favorite: !o.favorite }); S.outfits = S.outfits.map((x) => (x.id === o.id ? (n?.id ? n : { ...x, favorite: !o.favorite }) : x)); });
  },
  async delOutfit(el) {
    const id = el.dataset.id;
    if (S.confirmDelete !== id) { S.confirmDelete = id; render(); return; }
    const ok = await guarded(async () => { await store.deleteOutfit(id); S.outfits = S.outfits.filter((x) => x.id !== id); S.confirmDelete = null; });
    if (ok) toast(done('Tenue supprimée'));
  },
  async delWear(el) {
    const id = el.dataset.id;
    const ok = await guarded(async () => { await store.deleteWear(id); S.wears = S.wears.filter((x) => x.id !== id); S.items = await store.items(); });
    if (ok) toast(done('Retiré de l’historique'));
  }
};

let swipe = null, swallowUntil = 0;   // le clic qui suit un glissement est ignoré
app.addEventListener('pointerdown', (ev) => {
  const el = ev.target.closest('[data-swipe]');
  swipe = el ? { cat: el.dataset.swipe, x: ev.clientX, y: ev.clientY } : null;
});
app.addEventListener('pointerup', (ev) => {
  if (!swipe) return;
  const dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y, cat = swipe.cat; swipe = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && byCat(cat).length > 1) { swallowUntil = ev.timeStamp + 80; step(cat, dx < 0 ? 1 : -1); }
});
app.addEventListener('click', (ev) => {
  if (ev.timeStamp < swallowUntil) { ev.preventDefault(); return; }
  const el = ev.target.closest('[data-act]');
  if (!el || !app.contains(el)) return;
  if (S.busy && el.dataset.act !== 'closeSheet') return;   // évite les doubles envois
  const fn = actions[el.dataset.act];
  if (fn) fn(el, ev);
});
app.addEventListener('input', (ev) => {
  const k = ev.target.dataset.input;
  if (k && S.sheet?.form) S.sheet.form[k] = ev.target.value;
});
app.addEventListener('change', async (ev) => {
  if (ev.target.dataset.check && S.sheet?.form) { S.sheet.form[ev.target.dataset.check] = ev.target.checked; return; }
  const side = ev.target.dataset.photo;
  if (!side || !ev.target.files?.[0] || !S.sheet?.form) return;
  try {
    const blob = await compressImage(ev.target.files[0]);
    const f = S.sheet?.form; if (!f) return;
    dropPreview(f[side + 'Preview']);
    f[side] = blob; f[side + 'Preview'] = makePreview(blob);
    render();
  } catch (e) { toast('Photo illisible, essaie une autre image', 'err'); }
});
// Photo dont le lien a expiré entre deux renouvellements : on renouvelle tout de suite
app.addEventListener('error', (ev) => {
  if (ev.target?.matches?.('img[data-photo-img]') && !refreshPhotoLinks.pending) {
    refreshPhotoLinks.pending = true;
    S.items = S.items.map((i) => ({ ...i, url_expires: 0 }));
    refreshPhotoLinks().finally(() => { setTimeout(() => { refreshPhotoLinks.pending = false; }, 30000); });
  }
}, true);
app.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'auth-form') return;
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const email = String(fd.get('email') || '').trim(), password = String(fd.get('password') || ''), username = String(fd.get('username') || '').trim();
  S.authInfo = '';
  if (!email || !email.includes('@')) { S.authErr = 'Entre une adresse e-mail valide.'; return render(); }
  if (password.length < 6) { S.authErr = 'Le mot de passe doit faire au moins 6 caractères.'; return render(); }
  if (S.authMode === 'signup' && !username) { S.authErr = 'Choisis un prénom ou un pseudo.'; return render(); }
  S.authErr = '';
  await guarded(async () => {
    const u = S.authMode === 'signup' ? await store.signUp(email, password, username) : await store.signIn(email, password);
    await loadAll(); S.user = u; location.hash = '#/'; route();
  }, 'auth');
});
addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (S.sheet) { closeSheet(); render(); } else if (S.detail) { S.detail = null; render(); }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
boot();
