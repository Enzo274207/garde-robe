// Couche de données : Supabase (en ligne) ou mode démo (stockage local du navigateur).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { DEFAULT_AVATAR, DEMO_ITEMS } from './catalog.js';

export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const today = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, heure locale

/* =========================================================
   Mode démo : localStorage + IndexedDB pour les photos
   ========================================================= */
const LS = 'garderobe-demo-v1';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('garderobe-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key, blob) {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res) => { const rq = db.transaction('photos').objectStore('photos').get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); });
}
async function idbDel(key) {
  const db = await idb();
  return new Promise((res) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(key); tx.oncomplete = res; tx.onerror = res; });
}

const demo = {
  _db() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LS)); } catch (e) { d = null; }
    if (!d) {
      const now = Date.now();
      d = {
        user: null,
        profile: { username: 'Enzo', avatar: { ...DEFAULT_AVATAR } },
        items: DEMO_ITEMS.map((it, i) => ({ ...it, id: uid(), front_path: null, back_path: null, created_at: new Date(now - i * 60000).toISOString() })),
        outfits: [], wears: []
      };
      this._save(d);
    }
    return d;
  },
  _save(d) { localStorage.setItem(LS, JSON.stringify(d)); },
  _urls: {},
  async _url(path) {
    if (!path) return null;
    if (this._urls[path]) return this._urls[path];
    const b = await idbGet(path);
    if (!b) return null;
    return (this._urls[path] = URL.createObjectURL(b));
  },
  async session() { const d = this._db(); return d.user; },
  async signUp(email, password, username) {
    const d = this._db(); d.user = { id: 'demo', email }; d.profile.username = username || email.split('@')[0]; this._save(d); return d.user;
  },
  async signIn(email) { const d = this._db(); d.user = { id: 'demo', email }; this._save(d); return d.user; },
  async signOut() { const d = this._db(); d.user = null; this._save(d); },
  async profile() { return this._db().profile; },
  async saveAvatar(avatar) { const d = this._db(); d.profile.avatar = avatar; this._save(d); },
  async items() {
    const d = this._db();
    const list = d.items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const it of list) { it.front_url = await this._url(it.front_path); it.back_url = await this._url(it.back_path); }
    return list;
  },
  async addItem(meta, front, back) {
    const d = this._db(); const id = uid();
    const it = { ...meta, id, created_at: new Date().toISOString(), front_path: null, back_path: null };
    if (front) { it.front_path = `demo/${id}-front`; await idbPut(it.front_path, front); }
    if (back) { it.back_path = `demo/${id}-back`; await idbPut(it.back_path, back); }
    d.items.push(it); this._save(d);
    return { ...it, front_url: await this._url(it.front_path), back_url: await this._url(it.back_path) };
  },
  async updateItem(id, patch, front, back) {
    const d = this._db(); const it = d.items.find((x) => x.id === id); if (!it) return null;
    Object.assign(it, patch);
    if (front) { it.front_path = `demo/${id}-front-${Date.now()}`; await idbPut(it.front_path, front); }
    if (back) { it.back_path = `demo/${id}-back-${Date.now()}`; await idbPut(it.back_path, back); }
    this._save(d);
    return { ...it, front_url: await this._url(it.front_path), back_url: await this._url(it.back_path) };
  },
  async deleteItem(id) {
    const d = this._db(); const it = d.items.find((x) => x.id === id);
    if (it) { if (it.front_path) await idbDel(it.front_path); if (it.back_path) await idbDel(it.back_path); }
    d.items = d.items.filter((x) => x.id !== id); this._save(d);
  },
  async outfits() { return this._db().outfits.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async saveOutfit(o) { const d = this._db(); const row = { ...o, id: uid(), created_at: new Date().toISOString() }; d.outfits.push(row); this._save(d); return row; },
  async deleteOutfit(id) { const d = this._db(); d.outfits = d.outfits.filter((x) => x.id !== id); this._save(d); },
  async wears() { return this._db().wears.slice().sort((a, b) => b.worn_on.localeCompare(a.worn_on)); },
  async setWear(w) {
    const d = this._db(); const day = w.worn_on || today();
    d.wears = d.wears.filter((x) => x.worn_on !== day);
    const row = { ...w, worn_on: day, id: uid(), created_at: new Date().toISOString() };
    d.wears.push(row); this._save(d); return row;
  },
  async deleteWear(id) { const d = this._db(); d.wears = d.wears.filter((x) => x.id !== id); this._save(d); },
  async resetDemo() { localStorage.removeItem(LS); }
};

/* =========================================================
   Supabase
   ========================================================= */
let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}
function fail(error) { if (error) throw new Error(frError(error.message || String(error))); }
function frError(msg) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('password should be')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('email not confirmed')) return 'Confirme ton adresse e-mail (lien reçu par mail), puis connecte-toi.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Pas de connexion internet.';
  return msg;
}

const online = {
  _uid: null,
  async session() { const c = await client(); const { data } = await c.auth.getSession(); this._uid = data.session?.user?.id || null; return data.session?.user || null; },
  async signUp(email, password, username) {
    const c = await client();
    const { data, error } = await c.auth.signUp({ email, password, options: { data: { username } } });
    fail(error);
    if (!data.session) throw new Error('Compte créé. Ouvre le lien de confirmation reçu par e-mail, puis connecte-toi.');
    this._uid = data.user.id; return data.user;
  },
  async signIn(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    fail(error); this._uid = data.user.id; return data.user;
  },
  async signOut() { const c = await client(); await c.auth.signOut(); this._uid = null; },
  async profile() {
    const c = await client();
    const { data, error } = await c.from('profiles').select('username, avatar').eq('id', this._uid).maybeSingle();
    fail(error);
    return { username: data?.username || '', avatar: { ...DEFAULT_AVATAR, ...(data?.avatar || {}) } };
  },
  async saveAvatar(avatar) {
    const c = await client();
    const { error } = await c.from('profiles').update({ avatar }).eq('id', this._uid); fail(error);
  },
  async _sign(list) {
    const c = await client();
    const paths = [...new Set(list.flatMap((it) => [it.front_path, it.back_path]).filter(Boolean))];
    if (!paths.length) return list;
    const { data, error } = await c.storage.from('photos').createSignedUrls(paths, 60 * 60 * 6);
    fail(error);
    const map = Object.fromEntries((data || []).map((d) => [d.path, d.signedUrl]));
    return list.map((it) => ({ ...it, front_url: map[it.front_path] || null, back_url: map[it.back_path] || null }));
  },
  async _upload(id, side, blob) {
    const c = await client();
    const path = `${this._uid}/${id}-${side}-${Date.now()}.jpg`;
    const { error } = await c.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    fail(error); return path;
  },
  async items() {
    const c = await client();
    const { data, error } = await c.from('items').select('*').order('created_at', { ascending: false });
    fail(error); return this._sign(data || []);
  },
  async addItem(meta, front, back) {
    const c = await client(); const id = uid();
    const row = { ...meta, id, front_path: null, back_path: null };
    if (front) row.front_path = await this._upload(id, 'front', front);
    if (back) row.back_path = await this._upload(id, 'back', back);
    const { data, error } = await c.from('items').insert(row).select().single();
    fail(error); return (await this._sign([data]))[0];
  },
  async updateItem(id, patch, front, back) {
    const c = await client(); const p = { ...patch };
    if (front) p.front_path = await this._upload(id, 'front', front);
    if (back) p.back_path = await this._upload(id, 'back', back);
    const { data, error } = await c.from('items').update(p).eq('id', id).select().single();
    fail(error); return (await this._sign([data]))[0];
  },
  async deleteItem(id) {
    const c = await client();
    const { data } = await c.from('items').select('front_path, back_path').eq('id', id).maybeSingle();
    const paths = [data?.front_path, data?.back_path].filter(Boolean);
    if (paths.length) await c.storage.from('photos').remove(paths);
    const { error } = await c.from('items').delete().eq('id', id); fail(error);
  },
  async outfits() {
    const c = await client();
    const { data, error } = await c.from('outfits').select('*').order('created_at', { ascending: false }); fail(error); return data || [];
  },
  async saveOutfit(o) {
    const c = await client();
    const { data, error } = await c.from('outfits').insert(o).select().single(); fail(error); return data;
  },
  async deleteOutfit(id) { const c = await client(); const { error } = await c.from('outfits').delete().eq('id', id); fail(error); },
  async wears() {
    const c = await client();
    const { data, error } = await c.from('wears').select('*').order('worn_on', { ascending: false }).limit(120); fail(error); return data || [];
  },
  async setWear(w) {
    const c = await client();
    const row = { ...w, worn_on: w.worn_on || today(), user_id: this._uid };
    const { data, error } = await c.from('wears').upsert(row, { onConflict: 'user_id,worn_on' }).select().single(); fail(error); return data;
  },
  async deleteWear(id) { const c = await client(); const { error } = await c.from('wears').delete().eq('id', id); fail(error); }
};

export const store = isDemo ? demo : online;
export { today };
