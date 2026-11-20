// Retouche d'une photo détourée : nettoyage automatique (garde la pièce, retire le fond resté autour)
// et gomme au doigt. Écran plein, indépendant du reste de l'app ; renvoie la nouvelle image (ou null).
import { cleanAlpha } from './cutout.js';
import { encodeCutout } from './image.js';

const SIZES = [['Fine', 0.012], ['Moyenne', 0.03], ['Large', 0.06]];
const MAX_UNDO = 20;

async function toCanvas(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0);
  return c;
}

// recadrage serré sur ce qui reste visible (marge de 3 %)
function crop(c) {
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

export async function retouch(blob) {
  const c = await toCanvas(blob), ctx = c.getContext('2d', { willReadFrequently: true });
  const W = c.width, H = c.height, undo = [];
  let size = 1, changed = false;

  const root = document.createElement('div');
  root.className = 'retouch'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Retoucher le détourage');
  root.innerHTML = `
    <div class="rt-head"><button type="button" class="btn ghost mini" data-rt="cancel">Annuler</button><strong>Retoucher</strong><button type="button" class="btn accent mini" data-rt="ok">Valider</button></div>
    <div class="rt-stage"><div class="rt-board"></div></div>
    <p class="rt-hint">Passe le doigt sur le fond qui reste pour l’effacer.</p>
    <div class="rt-tools">
      <button type="button" class="btn dark" data-rt="auto">Nettoyage auto</button>
      <button type="button" class="btn ghost sq" data-rt="undo" aria-label="Annuler le dernier coup de gomme" disabled>↶</button>
    </div>
    <div class="seg" role="group" aria-label="Taille de la gomme">${SIZES.map(([l], i) => `<button type="button" data-rt="size" data-v="${i}" aria-pressed="${i === size}">${l}</button>`).join('')}</div>`;
  const board = root.querySelector('.rt-board'), undoBtn = root.querySelector('[data-rt="undo"]');
  board.appendChild(c);
  document.body.appendChild(root);

  const snap = () => { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > MAX_UNDO) undo.shift(); undoBtn.disabled = false; };
  const radius = () => Math.max(3, Math.round(Math.max(W, H) * SIZES[size][1]));

  // gomme : un trait continu entre les positions du doigt
  let last = null;
  const pos = (ev) => { const r = c.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H]; };
  const erase = (a, b) => {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = radius() * 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
    changed = true;
  };
  c.addEventListener('pointerdown', (ev) => { ev.preventDefault(); c.setPointerCapture(ev.pointerId); snap(); last = pos(ev); erase(last, last); });
  c.addEventListener('pointermove', (ev) => { if (!last) return; ev.preventDefault(); const p = pos(ev); erase(last, p); last = p; });
  const end = () => { last = null; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);

  return new Promise((resolve) => {
    const close = (v) => { removeEventListener('keydown', onKey, true); root.remove(); resolve(v); };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(null); } };
    addEventListener('keydown', onKey, true);
    root.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-rt]'); if (!b || b.disabled) return;
      const act = b.dataset.rt;
      if (act === 'cancel') close(null);
      else if (act === 'size') { size = Number(b.dataset.v); root.querySelectorAll('[data-rt="size"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
      else if (act === 'undo') { const d = undo.pop(); if (d) ctx.putImageData(d, 0, 0); undoBtn.disabled = !undo.length; }
      else if (act === 'auto') {
        snap();
        const img = ctx.getImageData(0, 0, W, H), A = new Uint8ClampedArray(W * H);
        for (let p = 0; p < A.length; p++) A[p] = img.data[p * 4 + 3];
        if (cleanAlpha(A, W, H)) { for (let p = 0; p < A.length; p++) img.data[p * 4 + 3] = A[p]; ctx.putImageData(img, 0, 0); changed = true; }
      } else if (act === 'ok') {
        if (!changed) return close(null);
        b.disabled = true; b.textContent = '…';
        const o = crop(c);
        close(o ? await encodeCutout(o) : null);
      }
    });
  });
}
