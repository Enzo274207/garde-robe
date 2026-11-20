// Choix d'une couleur exacte : curseurs (teinte, intensité, clarté), code couleur,
// et pipette sur la photo de la pièce (toucher ou glisser le doigt sur la photo).
// Écran plein, indépendant du reste de l'app ; renvoie la couleur choisie (#RRGGBB) ou null.
import { safeColor, hexToRgb, rgbToHex, colorLabel, colorDistance } from './catalog.js';

const MAX_SIDE = 700;   // taille de travail de la photo (suffisant pour viser, rapide sur iPhone)

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, Math.round(l * 100)];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

async function photoCanvas(blob) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}
// moyenne d'un petit carré autour du point, en ignorant le fond transparent (photo détourée)
function sample(data, W, H, x, y) {
  const r = Math.max(2, Math.round(Math.max(W, H) * 0.006)); let n = 0; const acc = [0, 0, 0];
  for (let j = Math.max(0, y - r); j <= Math.min(H - 1, y + r); j++) for (let i = Math.max(0, x - r); i <= Math.min(W - 1, x + r); i++) {
    const p = (j * W + i) * 4; if (data[p + 3] < 200) continue;
    acc[0] += data[p]; acc[1] += data[p + 1]; acc[2] += data[p + 2]; n++;
  }
  return n ? rgbToHex(acc.map((v) => v / n)) : null;
}
// couleurs les plus présentes sur la photo (pièce seule si elle est détourée)
function mainColors(data, max = 6) {
  const bins = new Map();
  for (let p = 0; p < data.length; p += 16) {   // un pixel sur quatre suffit
    if (data[p + 3] < 200) continue;
    const key = (data[p] >> 4) << 8 | (data[p + 1] >> 4) << 4 | (data[p + 2] >> 4);
    const b = bins.get(key) || bins.set(key, [0, 0, 0, 0]).get(key);
    b[0] += data[p]; b[1] += data[p + 1]; b[2] += data[p + 2]; b[3]++;
  }
  const total = [...bins.values()].reduce((s, b) => s + b[3], 0), out = [];
  for (const b of [...bins.values()].sort((a, c) => c[3] - a[3])) {
    if (b[3] < total * 0.02 || out.length >= max) break;
    const hex = rgbToHex(b.slice(0, 3).map((v) => v / b[3]));
    if (!out.some((h) => colorDistance(h, hex) < 14)) out.push(hex);
  }
  return out;
}

// photos : [{ label, load: async () => Blob }] (recto, verso) ; title : texte d'en-tête
export async function pickColor({ hex, photos = [], title = 'Couleur exacte' }) {
  let [h, s, l] = hexToHsl(safeColor(hex));
  let cur = safeColor(hex).toUpperCase();
  let photo = null, data = null, found = [];

  const root = document.createElement('div');
  root.className = 'retouch cpick'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', title);
  const slider = (k, label, max, v) => `<label class="cp-row"><span>${label}</span><input type="range" min="0" max="${max}" step="1" value="${v}" data-cp="${k}" aria-label="${label}"></label>`;
  root.innerHTML = `
    <div class="rt-head"><button type="button" class="btn ghost mini" data-cp="cancel">Annuler</button><strong>${title}</strong><button type="button" class="btn accent mini" data-cp="ok">Choisir</button></div>
    ${photos.length ? `<div class="cp-photo">
      ${photos.length > 1 ? `<div class="seg" role="group" aria-label="Photo">${photos.map((p, i) => `<button type="button" data-cp="photo" data-v="${i}" aria-pressed="${i === 0}">${p.label}</button>`).join('')}</div>` : ''}
      <div class="cp-stage"><div class="cp-board"><span class="cp-wait">Chargement de la photo…</span><span class="cp-mark" hidden></span></div></div>
      <p class="rt-hint">Pipette : touche la pièce sur la photo, ou glisse le doigt.</p>
      <div class="cp-found swatches" role="group" aria-label="Couleurs de la photo"></div>
    </div>` : ''}
    <div class="cp-now"><span class="cp-prev"></span><div><b class="cp-name"></b><label class="cp-hex">Code <input class="input" maxlength="7" spellcheck="false" autocapitalize="characters" autocomplete="off" data-cp="hex" aria-label="Code couleur"></label></div></div>
    ${slider('h', 'Teinte', 360, h)}${slider('s', 'Intensité', 100, s)}${slider('l', 'Clarté', 100, l)}`;
  document.body.appendChild(root);
  const $ = (sel) => root.querySelector(sel);
  const inputs = { h: $('[data-cp="h"]'), s: $('[data-cp="s"]'), l: $('[data-cp="l"]') }, hexIn = $('[data-cp="hex"]');

  // met à jour l'aperçu, le nom de la famille et le fond des curseurs
  const paint = (fromHex) => {
    if (!fromHex) cur = hslToHex(h, s, l);
    $('.cp-prev').style.background = cur;
    $('.cp-name').textContent = 'Famille : ' + colorLabel(cur);
    if (document.activeElement !== hexIn) hexIn.value = cur;
    inputs.h.value = h; inputs.s.value = s; inputs.l.value = l;
    inputs.h.style.background = `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((x) => hslToHex(x, Math.max(s, 35), 50)).join(',')})`;
    inputs.s.style.background = `linear-gradient(90deg, ${hslToHex(h, 0, l)}, ${hslToHex(h, 100, l)})`;
    inputs.l.style.background = `linear-gradient(90deg, #000, ${hslToHex(h, s, 50)}, #fff)`;
    root.querySelectorAll('.cp-found .swatch').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cur)));
  };
  const setHex = (x) => { cur = safeColor(x).toUpperCase(); [h, s, l] = hexToHsl(cur); paint(true); };
  paint(true);
  root.addEventListener('input', (ev) => {
    const k = ev.target.dataset.cp;
    if (k === 'h') h = Number(ev.target.value); else if (k === 's') s = Number(ev.target.value); else if (k === 'l') l = Number(ev.target.value);
    if (k === 'hex') { const v = ev.target.value.trim().replace(/^#?/, '#'); if (/^#[0-9a-fA-F]{6}$/.test(v)) setHex(v); return; }
    paint(false);
  });
  hexIn.addEventListener('blur', () => { hexIn.value = cur; });

  // pipette
  const mark = $('.cp-mark');
  const showPhoto = async (i) => {
    const board = $('.cp-board'); if (!board) return;
    board.querySelector('canvas')?.remove(); mark.hidden = true; data = null;
    const wait = board.querySelector('.cp-wait'); wait.hidden = false; wait.textContent = 'Chargement de la photo…';
    try {
      photo = await photoCanvas(await photos[i].load());
      data = photo.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, photo.width, photo.height).data;
      wait.hidden = true; board.insertBefore(photo, mark);
      found = mainColors(data);
      $('.cp-found').innerHTML = found.length ? `<span class="label">Sur la photo</span>${found.map((x) => `<button type="button" class="swatch" style="background:${x}" data-cp="found" data-v="${x}" aria-label="Couleur de la photo ${colorLabel(x)}" aria-pressed="${x === cur}"></button>`).join('')}` : '';
      photo.addEventListener('pointerdown', (ev) => { ev.preventDefault(); photo.setPointerCapture(ev.pointerId); pick(ev); });
      photo.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'touch') { ev.preventDefault(); pick(ev); } });
    } catch (e) { wait.textContent = 'Photo impossible à ouvrir (connexion ?). Utilise les curseurs.'; }
  };
  const pick = (ev) => {
    if (!data) return;
    const r = photo.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), fy = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    const x = Math.round(fx * (photo.width - 1)), y = Math.round(fy * (photo.height - 1));
    const got = sample(data, photo.width, photo.height, x, y);
    mark.hidden = false; mark.style.left = `${photo.offsetLeft + fx * r.width}px`; mark.style.top = `${photo.offsetTop + fy * r.height}px`;
    mark.style.background = got || 'transparent';
    if (got) setHex(got);
  };
  if (photos.length) showPhoto(0);

  return new Promise((resolve) => {
    const close = (v) => { removeEventListener('keydown', onKey, true); root.remove(); resolve(v); };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(null); } };
    addEventListener('keydown', onKey, true);
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-cp]'); if (!b) return;
      const act = b.dataset.cp;
      if (act === 'cancel') close(null);
      else if (act === 'ok') close(cur);
      else if (act === 'found') setHex(b.dataset.v);
      else if (act === 'photo') { root.querySelectorAll('[data-cp="photo"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); showPhoto(Number(b.dataset.v)); }
    });
  });
}
