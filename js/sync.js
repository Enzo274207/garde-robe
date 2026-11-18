// Mode hors connexion : copie locale des données + file des modifications en attente.
//
// Principe
// - Lecture : on interroge le serveur ; en cas d'échec réseau, on sert la dernière copie locale.
// - Écriture : si le réseau répond, on écrit directement. Sinon (ou s'il reste des modifications
//   en attente, pour garder l'ordre), la modification est appliquée localement et mise en file.
// - Synchronisation : au retour du réseau (et à l'ouverture de l'app), la file est envoyée dans
//   l'ordre. Avant chaque modification ou suppression, la date de dernière modification côté
//   serveur est comparée à celle qu'on avait : si la donnée a changé ailleurs entre-temps,
//   rien n'est écrasé : la modification passe en « conflit » et l'utilisateur choisit.
// - iOS ne permet pas la synchronisation en arrière-plan : elle a lieu quand l'app est ouverte.
import { ITEM_DEFAULTS, today, uid as newId, OUTFIT_KEYS, normItem, isNetworkError } from './store.js';

const READ_TIMEOUT = 10000;

/* ---------- stockage local (IndexedDB), remplaçable pour les tests ---------- */
export function idbStorage(name = 'garderobe-offline') {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(new Error('Stockage local indisponible.'));
  }));
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
      t.onerror = () => rej(new Error('Stockage local plein ou indisponible.'));
    });
  };
  return {
    get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
    put: (store, key, val) => tx(store, 'readwrite', (s) => s.put(val, key)),
    del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key))
  };
}
export function memoryStorage() {
  const m = { kv: new Map(), blobs: new Map() };
  return {
    get: async (s, k) => structuredClone(m[s].get(k)),
    put: async (s, k, v) => { m[s].set(k, structuredClone(v)); },
    del: async (s, k) => { m[s].delete(k); },
    _dump: m
  };
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => { const e = new Error('Le serveur ne répond pas.'); e.network = true; rej(e); }, ms))]);
const newer = (a, b) => !!a && !!b && Date.parse(a) > Date.parse(b);
const conflictErr = (msg) => { const e = new Error(msg); e.conflict = true; return e; };
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ---------- effets locaux de chaque opération (rejouables) ---------- */
function recount(snap) {
  for (const it of snap.items) {
    const ws = snap.wears.filter((w) => OUTFIT_KEYS.some((k) => w[k] === it.id));
    it.wear_count = ws.length;
    it.last_worn_on = ws.map((w) => w.worn_on).sort().pop() || null;
  }
}
const stripRefs = (snap, id) => { for (const r of [...snap.outfits, ...snap.wears]) for (const k of OUTFIT_KEYS) if (r[k] === id) r[k] = null; };
const LOCAL = {
  addItem(snap, { meta, frontKey, backKey }, entry) {
    snap.items = snap.items.filter((x) => x.id !== meta.id);
    snap.items.unshift({ ...ITEM_DEFAULTS, ...meta, created_at: new Date(entry.ts).toISOString(), updated_at: null, front_path: null, back_path: null, _lf: frontKey || null, _lb: backKey || null, _pending: true });
  },
  updateItem(snap, { id, patch, frontKey, backKey }) {
    const it = snap.items.find((x) => x.id === id); if (!it) return;
    Object.assign(it, patch, { _pending: true });
    if (frontKey) it._lf = frontKey;
    if (backKey) it._lb = backKey;
  },
  deleteItem(snap, { id }) { snap.items = snap.items.filter((x) => x.id !== id); stripRefs(snap, id); recount(snap); },
  saveOutfit(snap, { row }) { snap.outfits = [row, ...snap.outfits.filter((x) => x.id !== row.id)]; },
  updateOutfit(snap, { id, patch }) { const o = snap.outfits.find((x) => x.id === id); if (o) Object.assign(o, patch); },
  deleteOutfit(snap, { id }) { snap.outfits = snap.outfits.filter((x) => x.id !== id); },
  setWear(snap, { row }) { snap.wears = [row, ...snap.wears.filter((x) => x.worn_on !== row.worn_on)].sort((a, b) => b.worn_on.localeCompare(a.worn_on)); recount(snap); },
  deleteWear(snap, { id }) { snap.wears = snap.wears.filter((x) => x.id !== id); recount(snap); },
  saveAvatar(snap, { avatar }) { snap.profile = { ...snap.profile, avatar }; }
};

export function createSync(api, db = idbStorage(), env = {}) {
  const urlFor = env.urlFor || ((blob) => URL.createObjectURL(blob));
  let uid = null;
  let snap = null;            // { profile, items, outfits, wears }
  let queue = [];             // [{ seq, op, args, base, label, ts, conflict? }]
  let seq = 0;
  let offline = false, syncing = false;
  const blobUrls = new Map();
  const statusL = [], changeL = [];
  let refreshing = null;

  const status = () => ({ offline, syncing, pending: queue.filter((e) => !e.conflict).length, conflicts: queue.filter((e) => e.conflict).length });
  const emit = () => statusL.forEach((f) => { try { f(status()); } catch (e) { /* écouteur */ } });
  const changed = () => changeL.forEach((f) => { try { f(); } catch (e) { /* écouteur */ } });
  const kSnap = () => 'snap:' + uid, kQueue = () => 'queue:' + uid;
  const strip = (s) => ({ ...s, items: s.items.map(({ front_url, back_url, url_expires, ...r }) => ({ ...r, _fu: front_url || null, _bu: back_url || null })) });

  async function persist() {
    if (!uid || !snap) return;
    await db.put('kv', kSnap(), strip(snap));
    await db.put('kv', kQueue(), { seq, queue });
  }
  async function loadLocal() {
    const q = await db.get('kv', kQueue());
    queue = q?.queue || []; seq = q?.seq || 0;
    const s = await db.get('kv', kSnap());
    if (s) snap = { ...s, items: s.items.map(({ _fu, _bu, ...r }) => ({ ...r, front_url: _fu, back_url: _bu })) };
  }
  async function hydrate() {
    if (!snap) return;
    for (const it of snap.items) {
      for (const [k, f] of [['_lf', 'front_url'], ['_lb', 'back_url']]) {
        if (!it[k]) continue;
        if (!blobUrls.has(it[k])) { const b = await db.get('blobs', it[k]); if (b) blobUrls.set(it[k], urlFor(b)); }
        if (blobUrls.has(it[k])) it[f] = blobUrls.get(it[k]);
      }
    }
    snap.items = snap.items.map((it) => normItem(it));
  }
  const setOffline = (v) => { if (offline !== v) { offline = v; emit(); } };

  // Recharge tout depuis le serveur, puis rejoue les modifications encore en attente.
  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const [profile, items, outfits, wears] = await withTimeout(Promise.all([api.profile(), api.items(), api.outfits(), api.wears()]), READ_TIMEOUT);
        snap = { profile, items, outfits, wears };
        for (const e of queue) if (!e.conflict) LOCAL[e.op](snap, clone(e.args), e);
        await hydrate(); await persist();
        setOffline(false);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        setOffline(true);
        if (!snap) await loadLocal();
        if (!snap) throw new Error('Hors connexion : aucune donnée enregistrée sur cet appareil pour l’instant.');
        await hydrate();
      }
      return snap;
    })().finally(() => { refreshing = null; });   // partagé seulement pendant le chargement
    return refreshing;
  }

  async function saveBlob(blob) { if (!blob) return null; const k = 'b-' + newId(); await db.put('blobs', k, blob); return k; }
  async function getBlob(k) { return k ? db.get('blobs', k) : null; }
  async function dropBlob(k) { if (!k) return; await db.del('blobs', k).catch(() => {}); const u = blobUrls.get(k); if (u && env.revoke !== false && typeof URL !== 'undefined' && URL.revokeObjectURL) setTimeout(() => URL.revokeObjectURL(u), 3000); blobUrls.delete(k); }

  // Mise à jour des dates de référence des modifications suivantes après un envoi réussi
  function rebase(id, ts) { if (!ts) return; for (const e of queue) if (e.args.id === id || e.args.row?.id === id || (e.op === 'saveAvatar' && id === uid)) e.base = ts; }

  /* ---------- envoi d'une modification au serveur ---------- */
  async function send(e, force) {
    const a = e.args;
    switch (e.op) {
      case 'addItem': {
        try { await api.addItem(a.meta, await getBlob(a.frontKey), await getBlob(a.backKey)); }
        catch (err) { if (!err.duplicate) throw err; }
        await dropBlob(a.frontKey); await dropBlob(a.backKey); return;
      }
      case 'updateItem': {
        if (!force) {
          const m = await api.meta('items', a.id);
          if (!m) throw conflictErr('La pièce a été supprimée sur un autre appareil.');
          if (newer(m.updated_at, e.base)) throw conflictErr('La pièce a été modifiée sur un autre appareil.');
        }
        let r;
        try { r = await api.updateItem(a.id, a.patch, await getBlob(a.frontKey), await getBlob(a.backKey)); }
        catch (err) { if (err.gone) throw conflictErr('La pièce a été supprimée sur un autre appareil.'); throw err; }
        rebase(a.id, r?.updated_at); await dropBlob(a.frontKey); await dropBlob(a.backKey); return;
      }
      case 'deleteItem': {
        const m = await api.meta('items', a.id);
        if (!m) return;
        if (!force && newer(m.updated_at, e.base)) throw conflictErr('La pièce a été modifiée sur un autre appareil avant sa suppression.');
        await api.deleteItem(a.id); return;
      }
      case 'saveOutfit': {
        try { await api.saveOutfit(a.row); } catch (err) { if (!err.duplicate) throw err; }
        return;
      }
      case 'updateOutfit': {
        const m = await api.meta('outfits', a.id);
        if (!m) throw conflictErr('La tenue a été supprimée sur un autre appareil.');
        if (!force && newer(m.updated_at, e.base)) throw conflictErr('La tenue a été modifiée sur un autre appareil.');
        const r = await api.updateOutfit(a.id, a.patch); rebase(a.id, r?.updated_at); return;
      }
      case 'deleteOutfit': {
        const m = await api.meta('outfits', a.id);
        if (!m) return;
        if (!force && newer(m.updated_at, e.base)) throw conflictErr('La tenue a été modifiée sur un autre appareil avant sa suppression.');
        await api.deleteOutfit(a.id); return;
      }
      case 'setWear': {
        if (!force) {
          const s = await api.wearOn(a.row.worn_on);
          if (s && s.id !== a.row.id && (!e.base || newer(s.updated_at, e.base))) throw conflictErr(`La tenue du ${a.row.worn_on} a déjà été notée sur un autre appareil.`);
        }
        const r = await api.setWear(a.row); rebase(a.row.id, r?.updated_at); return;
      }
      case 'deleteWear': { await api.deleteWear(a.id); return; }
      case 'saveAvatar': {
        if (!force) {
          const m = await api.meta('profiles', uid);
          if (m && newer(m.updated_at, e.base)) throw conflictErr('L’avatar a été modifié sur un autre appareil.');
        }
        const r = await api.saveAvatar(a.avatar); rebase(uid, r?.updated_at); return;
      }
      default: throw new Error('Opération inconnue : ' + e.op);
    }
  }

  async function flush() {
    if (syncing || !uid || !queue.some((e) => !e.conflict)) return;
    syncing = true; emit();
    let sent = 0;
    try {
      for (const e of [...queue]) {
        if (e.conflict) continue;
        try {
          await send(e, false);
          queue = queue.filter((x) => x !== e); sent++; await persist();
        } catch (err) {
          if (isNetworkError(err)) { setOffline(true); break; }
          e.conflict = { reason: err.message, failed: !err.conflict, at: Date.now() };
          await persist();
        }
      }
      if (sent && queue.every((e) => e.conflict || !e)) setOffline(false);
    } finally { syncing = false; emit(); }
    if (sent || queue.some((e) => e.conflict)) { try { await refresh(); } catch (e) { /* hors connexion */ } changed(); }
  }

  // Écrit directement si possible, sinon applique localement et met en file d'attente.
  async function mutate(op, args, { base = null, label = '', direct, localResult } = {}) {
    if (!queue.some((e) => !e.conflict) && !offline) {
      try {
        const r = await direct();
        return r;
      } catch (err) { if (!isNetworkError(err)) throw err; setOffline(true); }
    }
    const e = { seq: ++seq, op, args: clone(args), base, label, ts: Date.now() };
    queue.push(e);
    if (!snap) await refresh().catch(() => {});
    if (snap) { LOCAL[op](snap, clone(args), e); await hydrate(); }
    await persist(); emit();
    if (!offline) setTimeout(flush, 0);
    return localResult ? localResult() : { queued: true };
  }

  const itemOf = (id) => snap?.items.find((x) => x.id === id) || null;

  const S = {
    isOfflineCapable: true,
    status, onStatus(f) { statusL.push(f); }, onChange(f) { changeL.push(f); },
    snapshot: () => snap,
    flush,
    onAuth: (cb) => api.onAuth(cb),
    async session() {
      const u = await api.session().catch((e) => { if (isNetworkError(e)) return null; throw e; });
      if (u && u.id !== uid) { uid = u.id; snap = null; await loadLocal(); emit(); }
      return u;
    },
    async signUp(...a) { const u = await api.signUp(...a); uid = u.id; snap = null; queue = []; return u; },
    async signIn(...a) { const u = await api.signIn(...a); uid = u.id; snap = null; await loadLocal(); return u; },
    async signOut() { await api.signOut(); await S.forgetLocal(); },
    async forgetLocal() {
      if (uid) { await db.del('kv', kSnap()); for (const e of queue) { await dropBlob(e.args.frontKey); await dropBlob(e.args.backKey); } await db.del('kv', kQueue()); }
      uid = null; snap = null; queue = []; offline = false; emit();
      if (typeof caches !== 'undefined') await caches.delete('garderobe-photos').catch(() => {});
    },
    async profile() { return (await refresh()).profile; },
    async items() { return (await refresh()).items; },
    async outfits() { return (await refresh()).outfits; },
    async wears() { return (await refresh()).wears; },
    async resign(list) {
      try { return await api.resign(list); } catch (e) { if (isNetworkError(e)) { setOffline(true); return list; } throw e; }
    },
    async addItem(meta, front, back) {
      const id = newId();
      const full = { ...meta, id };
      const frontKey = await saveBlob(front), backKey = await saveBlob(back);
      return mutate('addItem', { meta: full, frontKey, backKey }, {
        label: `Ajout de « ${meta.name} »`,
        direct: async () => { const r = await api.addItem(full, front, back); await dropBlob(frontKey); await dropBlob(backKey); if (snap) { snap.items.unshift(r); await persist(); } return r; },
        localResult: () => itemOf(id)
      });
    },
    async updateItem(id, patch, front, back) {
      const cur = itemOf(id);
      const frontKey = await saveBlob(front), backKey = await saveBlob(back);   // gardées si l'envoi échoue
      return mutate('updateItem', { id, patch, frontKey, backKey }, {
        base: cur?.updated_at || null, label: `Modification de « ${patch.name || cur?.name || 'pièce'} »`,
        direct: async () => { const r = await api.updateItem(id, patch, front, back); if (snap) { snap.items = snap.items.map((x) => (x.id === id ? r : x)); await persist(); } await dropBlob(frontKey); await dropBlob(backKey); return r; },
        localResult: () => itemOf(id)
      });
    },
    async deleteItem(id) {
      const cur = itemOf(id);
      return mutate('deleteItem', { id }, {
        base: cur?.updated_at || null, label: `Suppression de « ${cur?.name || 'pièce'} »`,
        direct: async () => { const r = await api.deleteItem(id); if (snap) { LOCAL.deleteItem(snap, { id }); await persist(); } return r; },
        localResult: () => ({ queued: true })
      });
    },
    async saveOutfit(o) {
      const row = { favorite: false, rating: null, occasion: null, jacket_id: null, ...o, id: newId(), created_at: new Date().toISOString(), updated_at: null };
      const send = { ...row }; delete send.created_at; delete send.updated_at;
      return mutate('saveOutfit', { row: send }, {
        label: `Tenue « ${o.name || 'sans nom'} »`,
        direct: async () => { const r = await api.saveOutfit(send); if (snap) { LOCAL.saveOutfit(snap, { row: r }); await persist(); } return r; },
        localResult: () => snap?.outfits.find((x) => x.id === row.id) || row
      });
    },
    async updateOutfit(id, patch) {
      const cur = snap?.outfits.find((x) => x.id === id);
      return mutate('updateOutfit', { id, patch }, {
        base: cur?.updated_at || null, label: `Modification de la tenue « ${cur?.name || ''} »`,
        direct: async () => { const r = await api.updateOutfit(id, patch); if (snap) { snap.outfits = snap.outfits.map((x) => (x.id === id ? r : x)); await persist(); } return r; },
        localResult: () => snap?.outfits.find((x) => x.id === id)
      });
    },
    async deleteOutfit(id) {
      const cur = snap?.outfits.find((x) => x.id === id);
      return mutate('deleteOutfit', { id }, {
        base: cur?.updated_at || null, label: `Suppression de la tenue « ${cur?.name || ''} »`,
        direct: async () => { await api.deleteOutfit(id); if (snap) { LOCAL.deleteOutfit(snap, { id }); await persist(); } },
        localResult: () => ({ queued: true })
      });
    },
    async setWear(w) {
      const day = w.worn_on || today();
      const prev = snap?.wears.find((x) => x.worn_on === day);
      const row = { jacket_id: null, outfit_id: null, ...w, worn_on: day, id: prev?.id || newId() };
      return mutate('setWear', { row }, {
        base: prev?.updated_at || null, label: `Tenue portée le ${day}`,
        direct: async () => { const r = await api.setWear(row); if (snap) { LOCAL.setWear(snap, { row: r }); await persist(); } return r; },
        localResult: () => snap?.wears.find((x) => x.worn_on === day) || row
      });
    },
    async deleteWear(id) {
      return mutate('deleteWear', { id }, {
        label: 'Retrait d’un jour de l’historique',
        direct: async () => { await api.deleteWear(id); if (snap) { LOCAL.deleteWear(snap, { id }); await persist(); } },
        localResult: () => ({ queued: true })
      });
    },
    async saveAvatar(avatar) {
      return mutate('saveAvatar', { avatar }, {
        base: snap?.profile?.updated_at || null, label: 'Modification de l’avatar',
        direct: async () => { const r = await api.saveAvatar(avatar); if (snap) { snap.profile = { ...snap.profile, avatar, updated_at: r?.updated_at || snap.profile.updated_at }; await persist(); } return r; },
        localResult: () => ({ queued: true })
      });
    },
    async deleteAccount() {
      if (offline || !(typeof navigator === 'undefined' || navigator.onLine)) throw new Error('Connexion internet nécessaire pour supprimer le compte.');
      await api.deleteAccount();
      await S.forgetLocal();
    },
    conflicts: () => queue.filter((e) => e.conflict).map((e) => ({ seq: e.seq, label: e.label, reason: e.conflict.reason, failed: e.conflict.failed })),
    pendingList: () => queue.filter((e) => !e.conflict).map((e) => ({ seq: e.seq, label: e.label })),
    // choice : 'mine' (imposer ma version) ou 'theirs' (garder la version du serveur / abandonner)
    async resolve(seqId, choice) {
      const e = queue.find((x) => x.seq === seqId); if (!e) return;
      if (choice === 'mine') {
        if (e.conflict?.failed) { delete e.conflict; await persist(); await flush(); return; }  // nouvel essai
        await send(e, true);
      } else { await dropBlob(e.args.frontKey); await dropBlob(e.args.backKey); }
      queue = queue.filter((x) => x !== e);
      await persist();
      await refresh().catch(() => {}); emit(); changed();
    }
  };
  if (typeof addEventListener !== 'undefined' && !env.noListeners) {
    addEventListener('online', () => { setOffline(false); flush(); });
    addEventListener('offline', () => setOffline(true));
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
    setInterval(() => { if (queue.some((e) => !e.conflict)) flush(); }, 60000);
  }
  return S;
}
