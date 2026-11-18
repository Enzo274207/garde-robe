import { CATEGORIES, CAT_ORDER, PALETTE, AV, DEFAULT_AVATAR, isNeutral } from './catalog.js';
import { figureSVG, faceSVG, garmentSVG, esc } from './draw.js';
import { store, isDemo, today } from './store.js';
import { compressImage } from './image.js';

/* ---------------- icônes ---------------- */
const P = {
  avatar: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.2 18.4c1.2-2 3.3-3.2 5.8-3.2s4.6 1.2 5.8 3.2',
  accessoire: 'M9 7.5 10 3h4l1 4.5M9 16.5 10 21h4l1-4.5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM12 10v2l1.5 1',
  haut: 'M9 3c.5 1.5 1.6 2.3 3 2.3S14.5 4.5 15 3l5 2.5-1.8 4.3-2.2-.9V21H8V8.9l-2.2.9L4 5.5z',
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
  check: 'M5 12.5l4.5 4.5L19 7.5'
};
const ico = (k, size = 22, sw = 1.7) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${P[k]}"/></svg>`;

/* ---------------- état ---------------- */
const S = {
  ready: false, user: null, profile: { username: '', avatar: { ...DEFAULT_AVATAR } },
  items: [], outfits: [], wears: [],
  route: { name: 'home' },
  sel: { haut: null, bas: null, chaussures: null, accessoire: null },
  note: 'Choisis ta tenue',
  filters: { type: 'Tous', fit: 'Toutes', color: null, sort: 0 },
  sheet: null, detail: null, toast: null,
  authMode: 'login', authErr: '', busy: false, confirmDelete: null
};
const app = document.getElementById('app');
const byCat = (c) => S.items.filter((i) => i.category === c);
const item = (id) => S.items.find((i) => i.id === id) || null;

/* ---------------- thème ---------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#121212' : '#F4F1EC');
  try { localStorage.setItem('garderobe-theme', t); } catch (e) { /* stockage indisponible */ }
}
applyTheme((() => { try { return localStorage.getItem('garderobe-theme'); } catch (e) { return null; } })() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

/* ---------------- utilitaires ---------------- */
let toastTimer;
function toast(msg) {
  S.toast = msg; render();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 2200);
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

/* ---------------- sélection courante ---------------- */
function ensureSelection() {
  for (const c of ['haut', 'bas', 'chaussures']) {
    const list = byCat(c);
    if (!list.find((i) => i.id === S.sel[c])) S.sel[c] = list[0]?.id || null;
  }
  if (S.sel.accessoire && !item(S.sel.accessoire)) S.sel.accessoire = null;
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
  if (!T.length || !B.length) return toast('Ajoute au moins un haut et un bas');
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
  try {
    S.user = await store.session();
    if (S.user) await loadAll();
  } catch (e) { S.authErr = e.message; }
  S.ready = true; route(); render();
}

/* ---------------- routes ---------------- */
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'c' && CATEGORIES[b]) {
    if (S.route.name !== 'cat' || S.route.cat !== b) S.filters = { type: 'Tous', fit: 'Toutes', color: null, sort: 0 };
    S.route = { name: 'cat', cat: b };
  } else if (a === 'historique') S.route = { name: 'history' };
  else S.route = { name: 'home' };
  S.detail = null;
}
addEventListener('hashchange', () => { route(); render(); scrollTo(0, 0); });

/* ---------------- rendu ---------------- */
function render() {
  const sb = document.querySelector('.sheet-body');
  const keep = sb ? sb.scrollTop : 0;
  const focusId = document.activeElement?.id;
  let html;
  if (!S.ready) html = '<div class="spinner" role="status" aria-label="Chargement"></div>';
  else if (!S.user) html = viewAuth();
  else if (S.route.name === 'cat') html = viewCat(S.route.cat);
  else if (S.route.name === 'history') html = viewHistory();
  else html = viewHome();
  if (S.user && S.detail) html += viewDetail();
  if (S.user && S.sheet?.kind === 'import') html += viewImport();
  if (S.user && S.sheet?.kind === 'avatar') html += viewAvatar();
  if (S.toast) html += `<div class="toast" role="status">${esc(S.toast)}</div>`;
  app.innerHTML = html;
  const nb = document.querySelector('.sheet-body'); if (nb) nb.scrollTop = keep;
  if (focusId) document.getElementById(focusId)?.focus();
  document.body.style.overflow = S.sheet || S.detail ? 'hidden' : '';
}

const demoBanner = () => isDemo ? `<div class="banner"><span>Mode démo : tes données restent sur cet appareil.</span></div>` : '';

function viewAuth() {
  const signup = S.authMode === 'signup';
  return `<main class="auth">
    <div>${faceSVG(DEFAULT_AVATAR, 64)}</div>
    <h1 class="h-font">${signup ? 'Crée ton compte' : 'Ma garde-robe'}</h1>
    <p>${signup ? 'Ta garde-robe sera synchronisée sur tous tes appareils.' : 'Retrouve toutes tes pièces et compose ta tenue en quelques secondes.'}</p>
    ${isDemo ? '<p class="note">Mode démo : n’importe quel e-mail et mot de passe fonctionnent.</p>' : ''}
    <form id="auth-form" novalidate>
      ${signup ? `<label class="field">Prénom ou pseudo<input class="input" id="a-user" name="username" autocomplete="nickname" required></label>` : ''}
      <label class="field">E-mail<input class="input" id="a-mail" name="email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field">Mot de passe<input class="input" id="a-pass" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
      ${S.authErr ? `<div class="err" role="alert">${esc(S.authErr)}</div>` : ''}
      <button class="btn accent" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Un instant…' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
    <button class="switch" data-act="authMode">${signup ? 'J’ai déjà un compte' : 'Pas encore de compte ? Inscris-toi'}</button>
  </main>`;
}

function pieceRow(it, fallbackLabel) {
  if (!it) return `<div class="piece-row"><span class="dot" style="background:transparent;border-style:dashed"></span><span class="name" style="color:var(--muted)">${fallbackLabel}</span></div>`;
  const vis = it.front_url ? `<img class="thumb" src="${esc(it.front_url)}" alt="">` : `<span class="dot" style="background:${esc(it.color_hex)}"></span>`;
  return `<div class="piece-row">${vis}<span class="name">${esc(it.name)}</span>${it.fit ? `<span class="tag">${esc(it.fit)}</span>` : ''}</div>`;
}

function viewHome() {
  const top = item(S.sel.haut), bottom = item(S.sel.bas), shoes = item(S.sel.chaussures);
  const n = { haut: byCat('haut').length, bas: byCat('bas').length, chaussures: byCat('chaussures').length };
  const arrow = (cat, side, y, label) => `<button class="arrow ${side === -1 ? 'l' : 'r'}" style="top:${y}px" data-act="step" data-cat="${cat}" data-d="${side}" aria-label="${label}" ${n[cat] < 2 ? 'disabled' : ''}>${ico(side === -1 ? 'left' : 'right', 22, 2.2)}</button>`;
  const wornToday = S.wears.find((w) => w.worn_on === today());
  const isWorn = wornToday && wornToday.top_id === S.sel.haut && wornToday.bottom_id === S.sel.bas && wornToday.shoes_id === S.sel.chaussures;
  const railLink = (cat) => `<a class="rail-btn" href="#/c/${cat}">${ico(cat)}${CATEGORIES[cat].title}</a>`;
  return `${demoBanner()}<main class="screen">
    <header class="top">
      <div><div class="kicker">${cap(dateFr(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1 class="h-font">Ma tenue</h1></div>
      <button class="me-btn" data-act="openAvatar" aria-label="Modifier mon avatar">${faceSVG(S.profile.avatar, 36)}<span>${esc(S.profile.username || 'Moi')}</span></button>
    </header>
    <div class="stage">
      <nav class="rail" aria-label="Ma garde-robe">
        <button class="rail-btn" data-act="openAvatar">${ico('avatar')}Avatar</button>
        ${railLink('accessoire')}${railLink('haut')}${railLink('bas')}${railLink('chaussures')}
      </nav>
      <div class="figure-wrap">
        ${figureSVG({ top, bottom, shoes, avatar: S.profile.avatar })}
        ${arrow('haut', -1, 118, 'Haut précédent')}${arrow('haut', 1, 118, 'Haut suivant')}
        ${arrow('bas', -1, 286, 'Bas précédent')}${arrow('bas', 1, 286, 'Bas suivant')}
        ${arrow('chaussures', -1, 378, 'Chaussures précédentes')}${arrow('chaussures', 1, 378, 'Chaussures suivantes')}
      </div>
      <nav class="rail" aria-label="Actions">
        <button class="rail-btn primary" data-act="suggest">${ico('spark')}Suggestion</button>
        <button class="rail-btn" data-act="theme" aria-pressed="${document.documentElement.dataset.theme === 'dark'}"><span class="toggle"><i></i></span>${document.documentElement.dataset.theme === 'dark' ? 'Sombre' : 'Clair'}</button>
        <button class="rail-btn" data-act="friends">${ico('friends')}Amis</button>
        <button class="rail-btn" data-act="saveOutfit">${ico('save')}Enregistrer</button>
        <a class="rail-btn" href="#/historique">${ico('hist')}Historique</a>
      </nav>
    </div>
    <section class="card" aria-label="Tenue en cours">
      <div class="card-head"><h2 class="h-font">Tenue en cours</h2><span class="note">${esc(S.note)}</span></div>
      ${pieceRow(top, 'Aucun haut — importe-en un')}
      ${pieceRow(bottom, 'Aucun bas — importe-en un')}
      ${pieceRow(shoes, 'Aucune paire — importe-en une')}
      ${S.sel.accessoire ? pieceRow(item(S.sel.accessoire)) : ''}
      <button class="btn ghost" style="height:44px;margin-top:4px" data-act="wear" ${!top || !bottom ? 'disabled' : ''}>${isWorn ? ico('check', 18, 2) + 'Portée aujourd’hui' : 'Je la porte aujourd’hui'}</button>
    </section>
    <button class="btn dark" data-act="openImport">${ico('plus', 20, 2)}Importer une pièce</button>
  </main>`;
}

function filtered(cat) {
  const f = S.filters;
  const sorts = [(a, b) => b.created_at.localeCompare(a.created_at), (a, b) => a.name.localeCompare(b.name, 'fr'), (a, b) => (a.color_name || '').localeCompare(b.color_name || '', 'fr')];
  return byCat(cat)
    .filter((d) => f.type === 'Tous' || d.type === f.type)
    .filter((d) => f.fit === 'Toutes' || d.fit === f.fit)
    .filter((d) => !f.color || d.color_hex === f.color)
    .sort(sorts[f.sort]);
}
function tileVisual(it, side = 'front') {
  const url = side === 'front' ? it.front_url : it.back_url;
  return url ? `<img src="${esc(url)}" alt="" loading="lazy">` : garmentSVG(it, side);
}

function viewCat(cat) {
  const C = CATEGORIES[cat], all = byCat(cat), list = filtered(cat), f = S.filters;
  const sortLabels = ['Récents', 'A → Z', 'Couleur'];
  const typeChips = ['Tous', ...C.types].map((t) => {
    const n = t === 'Tous' ? all.length : all.filter((d) => d.type === t).length;
    return `<button class="chip" aria-pressed="${f.type === t}" data-act="fType" data-v="${esc(t)}">${t === 'Tous' ? 'Tous' : esc(C.plural[t])} · ${n}</button>`;
  }).join('');
  const colors = [...new Map(all.map((d) => [d.color_hex, d])).values()];
  const n = list.length;
  return `<main class="screen">
    <header class="cat-head">
      <a class="icon-btn" href="#/" aria-label="Retour à ma tenue">${ico('back', 20, 2)}</a>
      <div class="t"><h1 class="h-font">${C.title}</h1><span class="sub">${n} ${n > 1 ? 'pièces' : 'pièce'}${n !== all.length ? ' sur ' + all.length : ''}</span></div>
      <button class="pill" data-act="sort" aria-label="Changer le tri">${ico('sort', 16, 2)}${sortLabels[f.sort]}</button>
    </header>
    <div class="chips noscroll" role="group" aria-label="Type">${typeChips}</div>
    ${C.fits.length ? `<div class="seg" role="group" aria-label="${C.fitWord}">${['Toutes', ...C.fits].map((v) => `<button aria-pressed="${f.fit === v}" data-act="fFit" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    ${colors.length > 1 ? `<div class="swatches" role="group" aria-label="Couleur"><span class="label">Couleur</span>${colors.map((d) => `<button class="swatch" style="background:${esc(d.color_hex)}" aria-label="Filtrer : ${esc(d.color_name)}" aria-pressed="${f.color === d.color_hex}" data-act="fColor" data-v="${esc(d.color_hex)}"></button>`).join('')}</div>` : ''}
    ${!all.length ? `<div class="empty"><b>Rien ici pour l’instant</b>Importe ${C.one} avec une photo recto et verso.</div>`
      : !n ? `<div class="empty"><b>${C.empty}</b>Change de filtre.<button class="btn ghost" style="height:40px" data-act="resetFilters">Effacer les filtres</button></div>`
      : `<div class="grid">${list.map((it) => `<button class="tile" data-act="open" data-id="${it.id}" aria-label="Voir ${esc(it.name)}">
          <div class="img">${tileVisual(it)}<span class="badge">${esc(it.type)}</span></div>
          <div class="meta"><b>${esc(it.name)}</b><div class="row"><span class="dot" style="width:12px;height:12px;background:${esc(it.color_hex)}"></span><span class="grow">${esc(it.color_name || '')}</span>${it.fit ? `<span class="tag" style="font-size:11px;color:var(--fg)">${esc(it.fit)}</span>` : ''}</div></div>
        </button>`).join('')}</div>`}
    <button class="btn dark fab" data-act="openImport" data-cat="${cat}">${ico('plus', 20, 2)}Importer ${C.one}</button>
  </main>`;
}

function viewDetail() {
  const it = item(S.detail.id); if (!it) return '';
  const C = CATEGORIES[it.category];
  const onAvatar = ['haut', 'bas', 'chaussures', 'accessoire'].includes(it.category);
  const confirming = S.confirmDelete === it.id;
  return `<div class="detail" role="dialog" aria-modal="true" aria-label="${esc(it.name)}"><div class="detail-inner">
    <div class="detail-top">
      <button class="icon-btn" data-act="closeDetail" aria-label="Fermer">${ico('back', 20, 2)}</button>
      <span class="label" style="letter-spacing:.08em;text-transform:uppercase">${esc(it.type)}</span>
      <button class="icon-btn" data-act="edit" data-id="${it.id}" aria-label="Modifier la pièce">${ico('edit', 18, 1.8)}</button>
    </div>
    <div class="flip-wrap"><button class="flip ${S.detail.back ? 'back' : ''}" data-act="flip" aria-label="Retourner la pièce (face affichée : ${S.detail.back ? 'verso' : 'recto'})">
      <div class="face">${tileVisual(it, 'front')}<span class="badge">Recto</span></div>
      <div class="face b">${it.back_url ? tileVisual(it, 'back') : it.front_url ? `<div class="empty" style="padding:20px">Pas de photo verso<br><small>Ajoute-la avec le crayon</small></div>` : garmentSVG(it, 'back')}<span class="badge">Verso</span></div>
    </button></div>
    <div class="hint">Touche la carte pour la retourner</div>
    <h2 class="h-font" style="margin:0;font-size:24px">${esc(it.name)}</h2>
    <div class="tags">
      <span><span class="dot" style="width:12px;height:12px;background:${esc(it.color_hex)}"></span>${esc(it.color_name || '')}</span>
      ${it.fit ? `<span>${esc(C.fitWord)} ${esc(it.fit.toLowerCase())}</span>` : ''}
      <span>${esc(C.title)}</span>
    </div>
    <div class="actions">
      ${onAvatar ? `<button class="btn accent" data-act="tryOn" data-id="${it.id}">${ico('avatar', 18, 1.8)}${it.category === 'accessoire' ? 'Ajouter à la tenue' : 'Mettre sur l’avatar'}</button>` : '<span></span>'}
      <button class="btn ghost" style="padding:0;color:${confirming ? 'var(--on-accent)' : 'var(--danger)'};background:${confirming ? 'var(--danger)' : ''}" data-act="delete" data-id="${it.id}" aria-label="${confirming ? 'Confirmer la suppression' : 'Supprimer la pièce'}">${ico(confirming ? 'check' : 'trash', 20, 1.8)}</button>
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
  const chips = (act, opts, cur) => opts.map((o) => `<button type="button" class="chip" aria-pressed="${cur === o}" data-act="${act}" data-v="${esc(o)}">${esc(act === 'iCat' ? CATEGORIES[o].title : o)}</button>`).join('');
  const editing = !!S.sheet.editId;
  return `<div class="overlay" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${editing ? 'Modifier la pièce' : 'Importer une pièce'}">
    <span class="grab"></span>
    <div class="sheet-head"><h2 class="h-font">${editing ? 'Modifier la pièce' : 'Importer une pièce'}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Fermer">${ico('close', 18, 2)}</button></div>
    <div class="sheet-body">
      <div class="photos">${slot('front', 'Photo recto')}${slot('back', 'Photo verso')}</div>
      <label class="field">Nom de la pièce<input class="input" id="i-name" data-input="name" value="${esc(f.name)}" placeholder="Ex. : Pull col roulé" autocomplete="off"></label>
      <div class="field">Catégorie<div class="swatches">${chips('iCat', CAT_ORDER, f.category)}</div></div>
      <div class="field">Type<div class="swatches">${chips('iType', C.types, f.type)}</div></div>
      <div class="field">Couleur · ${esc(f.color_name)}<div class="swatches big">${PALETTE.map((p) => `<button type="button" class="swatch" style="background:${p.hex}" aria-label="${p.label}" aria-pressed="${f.color_hex === p.hex}" data-act="iColor" data-v="${p.hex}"></button>`).join('')}</div></div>
      ${C.fits.length ? `<div class="field">${C.fitWord}<div class="seg">${C.fits.map((v) => `<button type="button" aria-pressed="${f.fit === v}" data-act="iFit" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>` : ''}
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
      <button class="btn ghost" data-act="signOut">Se déconnecter${S.user?.email ? ' (' + esc(S.user.email) + ')' : ''}</button>
      ${isDemo ? '<button class="btn ghost" data-act="resetDemo" style="color:var(--danger)">Réinitialiser la démo</button>' : ''}
    </div>
  </div></div>`;
}

function minis(ids) {
  return ids.map(item).filter(Boolean).map((it) => `<span class="mini">${it.front_url ? `<img src="${esc(it.front_url)}" alt="">` : `<span class="dot" style="background:${esc(it.color_hex)}"></span>`}${esc(it.name)}</span>`).join('') || '<span class="note">Pièces supprimées</span>';
}
function viewHistory() {
  return `<main class="screen">
    <header class="cat-head">
      <a class="icon-btn" href="#/" aria-label="Retour à ma tenue">${ico('back', 20, 2)}</a>
      <div class="t"><h1 class="h-font">Historique</h1><span class="sub">${S.wears.length} jour${S.wears.length > 1 ? 's' : ''} noté${S.wears.length > 1 ? 's' : ''} · ${S.outfits.length} tenue${S.outfits.length > 1 ? 's' : ''}</span></div>
    </header>
    <h2 class="label" style="margin:8px 4px 0;text-transform:uppercase;letter-spacing:.08em">Tenues enregistrées</h2>
    <div class="list">${S.outfits.length ? S.outfits.map((o) => `<div class="hist">
        <div class="when"><span>${esc(o.name || 'Tenue')}</span><span style="display:flex;gap:14px"><button data-act="useOutfit" data-id="${o.id}">Mettre</button><button data-act="delOutfit" data-id="${o.id}" style="color:var(--danger)">Supprimer</button></span></div>
        <div class="mini-row">${minis([o.top_id, o.bottom_id, o.shoes_id, o.accessory_id])}</div></div>`).join('')
      : '<div class="note" style="padding:0 4px">Compose une tenue sur l’accueil puis touche « Enregistrer ».</div>'}</div>
    <h2 class="label" style="margin:8px 4px 0;text-transform:uppercase;letter-spacing:.08em">Ce que j’ai porté</h2>
    <div class="list">${S.wears.length ? S.wears.map((w) => `<div class="hist">
        <div class="when"><span>${esc(dayLabel(w.worn_on))}</span><button data-act="delWear" data-id="${w.id}" style="color:var(--muted)">Retirer</button></div>
        <div class="mini-row">${minis([w.top_id, w.bottom_id, w.shoes_id, w.accessory_id])}</div></div>`).join('')
      : '<div class="note" style="padding:0 4px">Touche « Je la porte aujourd’hui » sur l’accueil pour garder une trace.</div>'}</div>
  </main>`;
}

/* ---------------- actions ---------------- */
function newForm(cat = 'haut') {
  const C = CATEGORIES[cat];
  return { name: '', category: cat, type: C.types[0], color_hex: PALETTE[0].hex, color_name: PALETTE[0].label, fit: C.fits[1] || C.fits[0] || '', front: null, back: null, frontPreview: null, backPreview: null };
}
function currentOutfit() {
  return { top_id: S.sel.haut, bottom_id: S.sel.bas, shoes_id: S.sel.chaussures, accessory_id: S.sel.accessoire };
}
async function guarded(fn, errTarget) {
  S.busy = true; render();
  try { await fn(); } catch (e) { if (errTarget === 'sheet' && S.sheet) S.sheet.err = e.message; else if (errTarget === 'auth') S.authErr = e.message; else toast(e.message); }
  S.busy = false; render();
}

const actions = {
  authMode() { S.authMode = S.authMode === 'login' ? 'signup' : 'login'; S.authErr = ''; render(); },
  step(el) { step(el.dataset.cat, Number(el.dataset.d)); },
  suggest,
  theme() { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); render(); },
  friends() { toast('Amis et partage : arrivent dans la V2'); },
  async saveOutfit() {
    if (!S.sel.haut || !S.sel.bas) return toast('Il faut au moins un haut et un bas');
    const parts = [item(S.sel.haut), item(S.sel.bas)].map((i) => i.name.split(' ')[0]);
    await guarded(async () => { const o = await store.saveOutfit({ name: parts.join(' + '), ...currentOutfit() }); S.outfits.unshift(o); });
    toast('Tenue enregistrée');
  },
  async wear() {
    await guarded(async () => {
      const w = await store.setWear({ worn_on: today(), ...currentOutfit() });
      S.wears = [w, ...S.wears.filter((x) => x.worn_on !== w.worn_on)];
    });
    toast('Noté dans ton historique');
  },
  openAvatar() { S.sheet = { kind: 'avatar', draft: { ...S.profile.avatar } }; render(); },
  av(el) { S.sheet.draft[el.dataset.k] = el.dataset.num ? Number(el.dataset.v) : el.dataset.v; render(); },
  async saveAvatar() {
    const draft = S.sheet.draft;
    await guarded(async () => { await store.saveAvatar(draft); S.profile.avatar = draft; S.sheet = null; });
    toast('Avatar mis à jour');
  },
  async signOut() { await store.signOut(); Object.assign(S, { user: null, sheet: null, items: [], outfits: [], wears: [] }); location.hash = '#/'; render(); },
  async resetDemo() { await store.resetDemo(); location.reload(); },
  openImport(el) {
    const cat = el.dataset.cat || (S.route.name === 'cat' ? S.route.cat : 'haut');
    S.sheet = { kind: 'import', form: newForm(cat), editId: null, err: '' }; render();
  },
  edit(el) {
    const it = item(el.dataset.id); if (!it) return;
    S.sheet = { kind: 'import', editId: it.id, err: '', form: { ...newForm(it.category), name: it.name, category: it.category, type: it.type, color_hex: it.color_hex, color_name: it.color_name, fit: it.fit, frontPreview: it.front_url, backPreview: it.back_url } };
    render();
  },
  closeSheet() { S.sheet = null; render(); },
  closeSheetBg(el, ev) { if (ev.target === el) { S.sheet = null; render(); } },
  iCat(el) { const f = S.sheet.form, C = CATEGORIES[el.dataset.v]; f.category = el.dataset.v; f.type = C.types[0]; f.fit = C.fits[1] || C.fits[0] || ''; render(); },
  iType(el) { S.sheet.form.type = el.dataset.v; render(); },
  iFit(el) { S.sheet.form.fit = el.dataset.v; render(); },
  iColor(el) { const p = PALETTE.find((x) => x.hex === el.dataset.v); S.sheet.form.color_hex = p.hex; S.sheet.form.color_name = p.label; render(); },
  clearPhoto(el, ev) { ev.preventDefault(); const f = S.sheet.form, s = el.dataset.side; f[s] = null; f[s + 'Preview'] = null; render(); },
  async submitImport() {
    const f = S.sheet.form, editId = S.sheet.editId;
    const name = f.name.trim() || `${f.type} ${f.color_name.toLowerCase()}`;
    const meta = { category: f.category, type: f.type, name, color_name: f.color_name, color_hex: f.color_hex, fit: f.fit };
    let saved = null;
    await guarded(async () => {
      if (editId) {
        saved = await store.updateItem(editId, meta, f.front, f.back);
        S.items = S.items.map((x) => (x.id === editId ? saved : x));
      } else {
        saved = await store.addItem(meta, f.front, f.back);
        S.items.unshift(saved);
        if (f.category !== 'accessoire') S.sel[f.category] = saved.id;
      }
      S.sheet = null; ensureSelection();
    }, 'sheet');
    if (saved) toast(editId ? 'Pièce modifiée' : `« ${name} » ajouté`);
  },
  open(el) { S.detail = { id: el.dataset.id, back: false }; S.confirmDelete = null; render(); },
  closeDetail() { S.detail = null; render(); },
  flip() { S.detail.back = !S.detail.back; render(); },
  tryOn(el) {
    const it = item(el.dataset.id);
    S.sel[it.category] = it.id; S.note = 'Choix manuel'; S.detail = null; ensureSelection();
    location.hash = '#/';
    toast(`${it.name} sur l’avatar`);
  },
  async delete(el) {
    const id = el.dataset.id;
    if (S.confirmDelete !== id) { S.confirmDelete = id; render(); return; }
    const name = item(id)?.name;
    await guarded(async () => { await store.deleteItem(id); S.items = S.items.filter((x) => x.id !== id); S.detail = null; S.confirmDelete = null; ensureSelection(); });
    toast(`« ${name} » supprimé`);
  },
  fType(el) { S.filters.type = el.dataset.v; render(); },
  fFit(el) { S.filters.fit = el.dataset.v; render(); },
  fColor(el) { S.filters.color = S.filters.color === el.dataset.v ? null : el.dataset.v; render(); },
  sort() { S.filters.sort = (S.filters.sort + 1) % 3; render(); },
  resetFilters() { S.filters = { type: 'Tous', fit: 'Toutes', color: null, sort: S.filters.sort }; render(); },
  useOutfit(el) {
    const o = S.outfits.find((x) => x.id === el.dataset.id); if (!o) return;
    if (o.top_id && item(o.top_id)) S.sel.haut = o.top_id;
    if (o.bottom_id && item(o.bottom_id)) S.sel.bas = o.bottom_id;
    if (o.shoes_id && item(o.shoes_id)) S.sel.chaussures = o.shoes_id;
    S.sel.accessoire = o.accessory_id && item(o.accessory_id) ? o.accessory_id : null;
    S.note = o.name || 'Tenue enregistrée'; ensureSelection(); location.hash = '#/';
  },
  async delOutfit(el) { const id = el.dataset.id; await guarded(async () => { await store.deleteOutfit(id); S.outfits = S.outfits.filter((x) => x.id !== id); }); },
  async delWear(el) { const id = el.dataset.id; await guarded(async () => { await store.deleteWear(id); S.wears = S.wears.filter((x) => x.id !== id); }); }
};

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || !app.contains(el)) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el, ev);
});
app.addEventListener('input', (ev) => {
  const k = ev.target.dataset.input;
  if (k && S.sheet?.form) S.sheet.form[k] = ev.target.value;
});
app.addEventListener('change', async (ev) => {
  const side = ev.target.dataset.photo;
  if (!side || !ev.target.files?.[0] || !S.sheet?.form) return;
  try {
    const blob = await compressImage(ev.target.files[0]);
    const f = S.sheet.form;
    f[side] = blob; f[side + 'Preview'] = URL.createObjectURL(blob);
    render();
  } catch (e) { toast('Photo illisible, essaie une autre image'); }
});
app.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'auth-form') return;
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const email = String(fd.get('email') || '').trim(), password = String(fd.get('password') || ''), username = String(fd.get('username') || '').trim();
  if (!email || !email.includes('@')) { S.authErr = 'Entre une adresse e-mail valide.'; return render(); }
  if (password.length < 6) { S.authErr = 'Le mot de passe doit faire au moins 6 caractères.'; return render(); }
  if (S.authMode === 'signup' && !username) { S.authErr = 'Choisis un prénom ou un pseudo.'; return render(); }
  S.authErr = '';
  await guarded(async () => {
    S.user = S.authMode === 'signup' ? await store.signUp(email, password, username) : await store.signIn(email, password);
    await loadAll(); location.hash = '#/'; route();
  }, 'auth');
});
addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (S.sheet) { S.sheet = null; render(); } else if (S.detail) { S.detail = null; render(); }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
boot();
