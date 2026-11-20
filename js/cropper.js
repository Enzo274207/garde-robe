// Recadrage d'une photo de profil : écran plein, on déplace la photo au doigt et on zoome
// (pincement, curseur ou molette) dans un cadre carré. Renvoie un JPEG carré compressé, ou null.
const OUT = 512;          // taille de la photo enregistrée (affichée au plus à ~130 px)
const QUALITY = 0.85;
const MAX_SRC = 2048;     // les très grandes photos sont réduites d'abord (mémoire de l'iPhone)
const MAX_ZOOM = 5;

async function load(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {
    src = await new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(u); res(img); };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Image illisible')); };
      img.src = u;
    });
  }
  const w = src.width, h = src.height, k = Math.min(1, MAX_SRC / Math.max(w, h));
  if (!w || !h) throw new Error('Image illisible');
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function cropFace(file) {
  const img = await load(file), W = img.width, H = img.height;
  let zoom = 1, cx = W / 2, cy = H / 2;    // centre du cadre, en pixels de la photo

  const root = document.createElement('div');
  root.className = 'retouch cropper'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Recadrer la photo de profil');
  root.innerHTML = `
    <div class="rt-head"><button type="button" class="btn ghost mini" data-cr="cancel">Annuler</button><strong>Recadrer</strong><button type="button" class="btn accent mini" data-cr="ok">Valider</button></div>
    <div class="rt-stage"><div class="cr-frame"><canvas></canvas></div></div>
    <p class="rt-hint">Déplace la photo avec le doigt, pince pour zoomer.</p>
    <label class="cr-zoom"><span>Zoom</span><input type="range" min="1" max="${MAX_ZOOM}" step="0.01" value="1" aria-label="Zoom"></label>`;
  const frame = root.querySelector('.cr-frame'), view = root.querySelector('canvas'), slider = root.querySelector('input');
  const ctx = view.getContext('2d');
  document.body.appendChild(root);

  const side = () => frame.clientWidth || 300;            // taille du cadre à l'écran (px CSS)
  const base = Math.min(W, H);                            // côté visible à zoom 1 (la photo remplit le cadre)
  const visible = () => base / zoom;                      // côté visible, en pixels de la photo
  const clamp = () => {
    const v = visible() / 2;
    cx = Math.min(W - v, Math.max(v, cx)); cy = Math.min(H - v, Math.max(v, cy));
  };
  const draw = () => {
    const px = Math.round(side() * Math.min(3, devicePixelRatio || 1));
    if (view.width !== px) { view.width = px; view.height = px; }
    clamp();
    const v = visible();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px);
    ctx.drawImage(img, cx - v / 2, cy - v / 2, v, v, 0, 0, px, px);
  };
  const setZoom = (z) => { zoom = Math.min(MAX_ZOOM, Math.max(1, z)); slider.value = String(zoom); draw(); };
  draw();
  const onResize = () => draw();
  addEventListener('resize', onResize);

  // un doigt : déplacer ; deux doigts : zoomer
  const pts = new Map();
  let pinch = null;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  view.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); view.setPointerCapture(ev.pointerId);
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    pinch = pts.size === 2 ? { d: dist(), z: zoom } : null;
  });
  view.addEventListener('pointermove', (ev) => {
    const p = pts.get(ev.pointerId); if (!p) return;
    ev.preventDefault();
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    p.x = ev.clientX; p.y = ev.clientY;
    if (pinch && pts.size === 2) { const d = dist(); if (pinch.d > 0) setZoom(pinch.z * (d / pinch.d)); return; }
    if (pts.size === 1) { const k = visible() / side(); cx -= dx * k; cy -= dy * k; draw(); }
  });
  const up = (ev) => { pts.delete(ev.pointerId); pinch = pts.size === 2 ? { d: dist(), z: zoom } : null; };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  view.addEventListener('wheel', (ev) => { ev.preventDefault(); setZoom(zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
  slider.addEventListener('input', () => setZoom(Number(slider.value)));

  return new Promise((resolve) => {
    const close = (v) => { removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize); root.remove(); resolve(v); };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(null); } };
    addEventListener('keydown', onKey, true);
    root.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-cr]'); if (!b || b.disabled) return;
      if (b.dataset.cr === 'cancel') return close(null);
      b.disabled = true; b.textContent = '…';
      clamp();
      const v = visible(), n = Math.min(OUT, Math.round(v)) || OUT;
      const out = document.createElement('canvas'); out.width = n; out.height = n;
      const o = out.getContext('2d');
      o.fillStyle = '#fff'; o.fillRect(0, 0, n, n);
      o.imageSmoothingQuality = 'high';
      o.drawImage(img, cx - v / 2, cy - v / 2, v, v, 0, 0, n, n);
      out.toBlob((blob) => close(blob), 'image/jpeg', QUALITY);
    });
  });
}
