// Couche de données : Supabase (en ligne) ou mode démo (stockage local du navigateur).
// Les deux exposent exactement la même interface ; toute erreur est levée (jamais avalée).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { DEFAULT_AVATAR, DEMO_ITEMS, safeColor } from './catalog.js';

export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const today = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, heure locale
const SIGN_SECONDS = 60 * 60 * 24;             // validité des liens de photos : 24 h
const RESIGN_MARGIN = 60 * 60 * 1000;          // on renouvelle 1 h avant l'expiration
const MAX_UPLOAD = 5 * 1024 * 1024;            // même limite que le bucket (migration 001)
const OUTFIT_KEYS = ['top_id', 'bottom_id', 'shoes_id', 'accessory_id', 'jacket_id'];

// Champs d'une pièce (valeurs par défaut pour les anciennes fiches)
export const ITEM_DEFAULTS = {
  secondary_colors: [], style: null, seasons: [], material: null, warmth: null, formality: null,
  brand: null, size: null, favorite: false, wear_count: 0, last_worn_on: null
};
const normItem = (it) => ({ ...ITEM_DEFAULTS, ...it, color_hex: safeColor(it.color_hex) });

function checkBlob(blob) {
  if (!blob) return;
  if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) throw new Error('Format de photo non accepté (JPEG, PNG ou WebP).');
  if (blob.size > MAX_UPLOAD) throw new Error('Photo trop lourde (5 Mo maximum).');
}

/* =========================================================
   Mode démo : localStorage + IndexedDB pour les photos
   ========================================================= */
const LS = 'garderobe-demo-v1';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('garderobe-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(new Error('Stockage local indisponible sur cet appareil.'));
  });
}
async function idbPut(key, blob) {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(new Error('Photo non enregistrée (stockage local plein ?).')); });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res) => { const rq = db.transaction('photos').objectStore('photos').get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); });
}
async function idbDel(key) {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(key); tx.oncomplete = res; tx.onerror = () => rej(new Error('Photo non supprimée.')); });
}

const demo = {
  _listeners: [],
  _db() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LS)); } catch (e) { d = null; }
    if (!d) {
      const now = Date.now();
      d = {
        user: null,
        profile: { username: 'Enzo', avatar: { ...DEFAULT_AVATAR } },
        items: DEMO_ITEMS.map((it, i) => ({ ...ITEM_DEFAULTS, ...it, id: uid(), front_path: null, back_path: null, created_at: new Date(now - i * 60000).toISOString() })),
        outfits: [], wears: []
      };
      this._save(d);
    }
    return d;
  },
  _save(d) {
    try { localStorage.setItem(LS, JSON.stringify(d)); }
    catch (e) { throw new Error('Stockage local plein : impossible d’enregistrer.'); }
  },
  _urls: {},
  async _url(path) {
    if (!path) return null;
    if (this._urls[path]) return this._urls[path];
    const b = await idbGet(path);
    if (!b) return null;
    return (this._urls[path] = URL.createObjectURL(b));
  },
  // Libère l'URL un peu plus tard : l'écran en cours peut encore l'afficher pendant la transition.
  _forget(path) { const u = this._urls[path]; if (u) { delete this._urls[path]; setTimeout(() => URL.revokeObjectURL(u), 3000); } },
  async _withUrls(it) { return normItem({ ...it, front_url: await this._url(it.front_path), back_url: await this._url(it.back_path) }); },
  _recount(d) {
    for (const it of d.items) {
      const ws = d.wears.filter((w) => OUTFIT_KEYS.some((k) => w[k] === it.id));
      it.wear_count = ws.length;
      it.last_worn_on = ws.map((w) => w.worn_on).sort().pop() || null;
    }
  },
  onAuth(cb) { this._listeners.push(cb); },
  async session() { return this._db().user; },
  async signUp(email, password, username) {
    const d = this._db(); d.user = { id: 'demo', email }; d.profile.username = username || email.split('@')[0]; this._save(d); return d.user;
  },
  async signIn(email) { const d = this._db(); d.user = { id: 'demo', email }; this._save(d); return d.user; },
  async signOut() { const d = this._db(); d.user = null; this._save(d); },
  async profile() { const p = this._db().profile; return { ...p, avatar: { ...DEFAULT_AVATAR, ...p.avatar } }; },
  async saveAvatar(avatar) { const d = this._db(); d.profile.avatar = avatar; this._save(d); },
  async items() {
    const d = this._db();
    const list = d.items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Promise.all(list.map((it) => this._withUrls(it)));
  },
  async resign(list) { return list; },
  async addItem(meta, front, back) {
    checkBlob(front); checkBlob(back);
    const d = this._db(); const id = uid();
    const it = { ...ITEM_DEFAULTS, ...meta, id, created_at: new Date().toISOString(), front_path: null, back_path: null };
    const written = [];
    try {
      if (front) { it.front_path = `demo/${id}-front`; await idbPut(it.front_path, front); written.push(it.front_path); }
      if (back) { it.back_path = `demo/${id}-back`; await idbPut(it.back_path, back); written.push(it.back_path); }
      d.items.push(it); this._save(d);
    } catch (e) { for (const p of written) await idbDel(p).catch(() => {}); throw e; }
    return this._withUrls(it);
  },
  async updateItem(id, patch, front, back) {
    checkBlob(front); checkBlob(back);
    const d = this._db(); const it = d.items.find((x) => x.id === id);
    if (!it) throw new Error('Cette pièce n’existe plus.');
    const old = [], written = [], next = { ...it, ...patch };
    try {
      if (front) { next.front_path = `demo/${id}-front-${Date.now()}`; await idbPut(next.front_path, front); written.push(next.front_path); if (it.front_path) old.push(it.front_path); }
      if (back) { next.back_path = `demo/${id}-back-${Date.now()}`; await idbPut(next.back_path, back); written.push(next.back_path); if (it.back_path) old.push(it.back_path); }
      Object.assign(it, next); this._save(d);
    } catch (e) { for (const p of written) await idbDel(p).catch(() => {}); throw e; }
    for (const p of old) { this._forget(p); await idbDel(p).catch(() => {}); }
    return this._withUrls(it);
  },
  async deleteItem(id) {
    const d = this._db(); const it = d.items.find((x) => x.id === id);
    if (!it) return;
    d.items = d.items.filter((x) => x.id !== id);
    for (const o of d.outfits) for (const k of OUTFIT_KEYS) if (o[k] === id) o[k] = null;
    for (const w of d.wears) for (const k of OUTFIT_KEYS) if (w[k] === id) w[k] = null;
    this._save(d);
    for (const p of [it.front_path, it.back_path].filter(Boolean)) { this._forget(p); await idbDel(p).catch(() => {}); }
  },
  async outfits() { return this._db().outfits.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async saveOutfit(o) {
    const d = this._db(); const row = { favorite: false, rating: null, occasion: null, jacket_id: null, ...o, id: uid(), created_at: new Date().toISOString() };
    d.outfits.push(row); this._save(d); return row;
  },
  async updateOutfit(id, patch) {
    const d = this._db(); const o = d.outfits.find((x) => x.id === id);
    if (!o) throw new Error('Cette tenue n’existe plus.');
    Object.assign(o, patch); this._save(d); return { ...o };
  },
  async deleteOutfit(id) { const d = this._db(); d.outfits = d.outfits.filter((x) => x.id !== id); this._save(d); },
  async wears() { return this._db().wears.slice().sort((a, b) => b.worn_on.localeCompare(a.worn_on)); },
  async setWear(w) {
    const d = this._db(); const day = w.worn_on || today();
    d.wears = d.wears.filter((x) => x.worn_on !== day);
    const row = { jacket_id: null, outfit_id: null, ...w, worn_on: day, id: uid(), created_at: new Date().toISOString() };
    d.wears.push(row); this._recount(d); this._save(d); return row;
  },
  async deleteWear(id) { const d = this._db(); d.wears = d.wears.filter((x) => x.id !== id); this._recount(d); this._save(d); },
  async deleteAccount() {
    const d = this._db();
    for (const it of d.items) for (const p of [it.front_path, it.back_path].filter(Boolean)) { this._forget(p); await idbDel(p).catch(() => {}); }
    localStorage.removeItem(LS);
  },
  async resetDemo() { return this.deleteAccount(); }
};

/* =========================================================
   Supabase
   ========================================================= */
// Version figée de la bibliothèque ; second CDN en secours.
const SUPABASE_JS = ['https://esm.sh/@supabase/supabase-js@2.45.4', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'];
let sb = null;
async function client() {
  if (sb) return sb;
  let mod = null, lastErr = null;
  for (const url of SUPABASE_JS) {
    try { mod = await import(url); break; } catch (e) { lastErr = e; }
  }
  if (!mod) throw new Error('Impossible de charger la connexion au serveur. Vérifie ta connexion internet.' + (lastErr ? '' : ''));
  sb = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}
function fail(error) { if (error) throw new Error(frError(error.message || String(error))); }
function frError(msg) {
  const m = String(msg).toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('password should be')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('email not confirmed')) return 'Confirme ton adresse e-mail (lien reçu par mail), puis connecte-toi.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'Pas de connexion internet : action non enregistrée.';
  if (m.includes('jwt') || m.includes('not authenticated')) return 'Ta session a expiré : reconnecte-toi.';
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) return 'Photo trop lourde (5 Mo maximum).';
  if (m.includes('mime type')) return 'Format de photo non accepté (JPEG, PNG ou WebP).';
  if (m.includes('autre utilisateur')) return 'Une des pièces de la tenue n’est plus disponible.';
  return msg;
}

const online = {
  _uid: null,
  async onAuth(cb) {
    const c = await client();
    c.auth.onAuthStateChange((event, session) => { this._uid = session?.user?.id || null; cb(event, session?.user || null); });
  },
  async session() {
    const c = await client(); const { data, error } = await c.auth.getSession(); fail(error);
    this._uid = data.session?.user?.id || null; return data.session?.user || null;
  },
  async signUp(email, password, username) {
    const c = await client();
    const { data, error } = await c.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + location.pathname } });
    fail(error);
    if (!data.session) { const e = new Error('Compte créé ! Ouvre le lien de confirmation reçu par e-mail, puis connecte-toi.'); e.info = true; throw e; }
    this._uid = data.user.id; return data.user;
  },
  async signIn(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    fail(error); this._uid = data.user.id; return data.user;
  },
  async signOut() { const c = await client(); const { error } = await c.auth.signOut(); this._uid = null; fail(error); },
  async profile() {
    const c = await client();
    const { data, error } = await c.from('profiles').select('*').eq('id', this._uid).maybeSingle();
    fail(error);
    return { username: data?.username || '', avatar: { ...DEFAULT_AVATAR, ...(data?.avatar || {}) }, style_prefs: data?.style_prefs || {} };
  },
  async saveAvatar(avatar) {
    const c = await client();
    const { data, error } = await c.from('profiles').update({ avatar }).eq('id', this._uid).select('id');
    fail(error); if (!data?.length) throw new Error('Profil introuvable : avatar non enregistré.');
  },
  async _sign(list) {
    const c = await client();
    const paths = [...new Set(list.flatMap((it) => [it.front_path, it.back_path]).filter(Boolean))];
    const expires = Date.now() + SIGN_SECONDS * 1000;
    if (!paths.length) return list.map((it) => normItem({ ...it, front_url: null, back_url: null, url_expires: expires }));
    const { data, error } = await c.storage.from('photos').createSignedUrls(paths, SIGN_SECONDS);
    fail(error);
    const map = Object.fromEntries((data || []).filter((d) => !d.error).map((d) => [d.path, d.signedUrl]));
    return list.map((it) => normItem({ ...it, front_url: map[it.front_path] || null, back_url: map[it.back_path] || null, url_expires: expires }));
  },
  // Renouvelle les liens des photos qui expirent bientôt.
  async resign(list) {
    if (!list.some((it) => (it.front_path || it.back_path) && (!it.url_expires || it.url_expires - Date.now() < RESIGN_MARGIN))) return list;
    return this._sign(list);
  },
  async _upload(id, side, blob) {
    const c = await client();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${this._uid}/${id}-${side}-${Date.now()}.${ext}`;
    const { error } = await c.storage.from('photos').upload(path, blob, { contentType: blob.type, upsert: false });
    fail(error); return path;
  },
  async _removeFiles(paths) {
    if (!paths.length) return true;
    const c = await client();
    const { error } = await c.storage.from('photos').remove(paths);
    return !error;
  },
  async items() {
    const c = await client();
    const { data, error } = await c.from('items').select('*').order('created_at', { ascending: false });
    fail(error); return this._sign(data || []);
  },
  async addItem(meta, front, back) {
    checkBlob(front); checkBlob(back);
    const c = await client(); const id = uid(); const uploaded = [];
    try {
      const row = { ...meta, id, front_path: null, back_path: null };
      if (front) { row.front_path = await this._upload(id, 'front', front); uploaded.push(row.front_path); }
      if (back) { row.back_path = await this._upload(id, 'back', back); uploaded.push(row.back_path); }
      const { data, error } = await c.from('items').insert(row).select().single();
      fail(error);
      return (await this._sign([data]))[0];
    } catch (e) { await this._removeFiles(uploaded); throw e; }   // pas de photo sans fiche
  },
  async updateItem(id, patch, front, back) {
    checkBlob(front); checkBlob(back);
    const c = await client();
    const { data: cur, error: e1 } = await c.from('items').select('front_path, back_path').eq('id', id).maybeSingle();
    fail(e1); if (!cur) throw new Error('Cette pièce n’existe plus.');
    const p = { ...patch }, uploaded = [], replaced = [];
    try {
      if (front) { p.front_path = await this._upload(id, 'front', front); uploaded.push(p.front_path); if (cur.front_path) replaced.push(cur.front_path); }
      if (back) { p.back_path = await this._upload(id, 'back', back); uploaded.push(p.back_path); if (cur.back_path) replaced.push(cur.back_path); }
      const { data, error } = await c.from('items').update(p).eq('id', id).select().single();
      fail(error);
      await this._removeFiles(replaced);   // anciennes photos : supprimées seulement après succès
      return (await this._sign([data]))[0];
    } catch (e) { await this._removeFiles(uploaded); throw e; }
  },
  async deleteItem(id) {
    const c = await client();
    const { data: cur, error: e1 } = await c.from('items').select('front_path, back_path').eq('id', id).maybeSingle();
    fail(e1); if (!cur) return {};
    const { error } = await c.from('items').delete().eq('id', id);
    fail(error);
    const ok = await this._removeFiles([cur.front_path, cur.back_path].filter(Boolean));
    return ok ? {} : { warning: 'Pièce supprimée, mais une photo n’a pas pu être effacée du serveur.' };
  },
  async outfits() {
    const c = await client();
    const { data, error } = await c.from('outfits').select('*').order('created_at', { ascending: false }); fail(error); return data || [];
  },
  async saveOutfit(o) {
    const c = await client();
    const { data, error } = await c.from('outfits').insert(o).select().single(); fail(error); return data;
  },
  async updateOutfit(id, patch) {
    const c = await client();
    const { data, error } = await c.from('outfits').update(patch).eq('id', id).select().single(); fail(error); return data;
  },
  async deleteOutfit(id) { const c = await client(); const { error } = await c.from('outfits').delete().eq('id', id); fail(error); },
  async wears() {
    const c = await client();
    const { data, error } = await c.from('wears').select('*').order('worn_on', { ascending: false }).limit(366); fail(error); return data || [];
  },
  async setWear(w) {
    const c = await client();
    const row = { ...w, worn_on: w.worn_on || today(), user_id: this._uid };
    const { data, error } = await c.from('wears').upsert(row, { onConflict: 'user_id,worn_on' }).select().single(); fail(error); return data;
  },
  async deleteWear(id) { const c = await client(); const { error } = await c.from('wears').delete().eq('id', id); fail(error); },
  // Supprime toutes les photos puis le compte (les lignes partent en cascade côté base).
  async deleteAccount() {
    const c = await client();
    for (let round = 0; round < 20; round++) {
      const { data, error } = await c.storage.from('photos').list(this._uid, { limit: 100 });
      fail(error);
      if (!data?.length) break;
      const { error: e2 } = await c.storage.from('photos').remove(data.map((f) => `${this._uid}/${f.name}`));
      fail(e2);
    }
    const { error } = await c.rpc('delete_my_account'); fail(error);
    await c.auth.signOut().catch(() => {});
    this._uid = null;
  }
};

export const store = isDemo ? demo : online;
export { today, OUTFIT_KEYS };
