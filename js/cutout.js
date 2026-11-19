// Détourage automatique d'une photo de vêtement, directement dans le navigateur (aucun envoi, aucune librairie).
// Principe : le fond est estimé sur le bord de la photo, puis « rempli » depuis les bords tant que les couleurs
// lui ressemblent (dégradés et ombres douces compris). Le vêtement, qui ne touche pas le fond, reste opaque.
// Fonctionne bien sur fond uni (drap, mur, sol, photo produit) ; sur un fond chargé, on le signale.

import { encodeCutout } from './image.js';

const MAX_SIDE = 1100;          // taille de travail (px)
const MAX_BYTES = 4.8 * 1024 * 1024;

async function load(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(u); res(img); };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Image illisible')); };
      img.src = u;
    });
  }
}

/**
 * @returns {Promise<{ok: true, blob: Blob, coverage: number} | {ok: false, reason: string}>}
 */
export async function cutout(blob, max = MAX_SIDE, sens = 1) {
  const src = await load(blob);
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const W = Math.max(1, Math.round(src.width * k)), H = Math.max(1, Math.round(src.height * k)), N = W * H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), px = img.data;

  // 0. image déjà détourée (PNG / WebP transparent, fréquent sur les sites de marques) : on garde sa transparence
  let clear = 0, tot = 0;
  for (let x = 0; x < W; x += 3) { tot += 2; if (px[x * 4 + 3] < 20) clear++; if (px[((H - 1) * W + x) * 4 + 3] < 20) clear++; }
  for (let y = 0; y < H; y += 3) { tot += 2; if (px[(y * W) * 4 + 3] < 20) clear++; if (px[(y * W + W - 1) * 4 + 3] < 20) clear++; }
  if (clear / tot > 0.6) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1, fg = 0, sr = 0, sg = 0, sb = 0, sn = 0;
    for (let p = 0, i = 0; p < N; p++, i += 4) {
      const a = px[i + 3]; if (a <= 24) continue;
      fg++; const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (a > 230) { sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; sn++; }
    }
    if (!fg) return { ok: false, reason: 'Image vide.' };
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    const r = await encodeCutout(o);
    return r ? { ok: true, blob: r, coverage: fg / N, rgb: sn ? [sr / sn, sg / sn, sb / sn].map(Math.round) : null, bg: null } : { ok: false, reason: 'Export de l’image impossible.' };
  }

  // 1. couleur du fond = médiane des pixels du bord
  const ring = Math.max(2, Math.round(Math.min(W, H) * 0.02)), samples = [[], [], []];
  const sample = (x, y) => { const i = (y * W + x) * 4; samples[0].push(px[i]); samples[1].push(px[i + 1]); samples[2].push(px[i + 2]); };
  const step = Math.max(1, Math.round((W + H) / 600));
  for (let x = 0; x < W; x += step) for (let r = 0; r < ring; r += 2) { sample(x, r); sample(x, H - 1 - r); }
  for (let y = 0; y < H; y += step) for (let r = 0; r < ring; r += 2) { sample(r, y); sample(W - 1 - r, y); }
  const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
  const bg = [med(samples[0]), med(samples[1]), med(samples[2])];
  // distance perçue : on pèse moins la luminosité (les ombres douces partent avec le fond)
  const dist = (r, g, b) => {
    const dr = r - bg[0], dg = g - bg[1], db = b - bg[2], dl = (dr * 0.3 + dg * 0.59 + db * 0.11);
    const cr = dr - dl, cg = dg - dl, cb = db - dl;
    return Math.sqrt(0.45 * dl * dl + 1.6 * (cr * cr + cg * cg + cb * cb));
  };
  // flou léger (supprime le bruit du capteur) puis force des contours (Sobel)
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) { R[p] = px[i]; G[p] = px[i + 1]; B[p] = px[i + 2]; }
  const blur = (ch) => { // flou en boîte séparable (rayon 2, sommes cumulées), deux passes ≈ flou gaussien
    const r = 2, tmp = new Float32Array(N), S = new Float32Array(Math.max(W, H) + 1);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0, o = 0; y < H; y++, o += W) {
        for (let x = 0; x < W; x++) S[x + 1] = S[x] + ch[o + x];
        for (let x = 0; x < W; x++) { const a0 = Math.max(0, x - r), a1 = Math.min(W - 1, x + r); tmp[o + x] = (S[a1 + 1] - S[a0]) / (a1 - a0 + 1); }
      }
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) S[y + 1] = S[y] + tmp[y * W + x];
        for (let y = 0; y < H; y++) { const a0 = Math.max(0, y - r), a1 = Math.min(H - 1, y + r); ch[y * W + x] = (S[a1 + 1] - S[a0]) / (a1 - a0 + 1); }
      }
    }
  };
  for (const ch of [R, G, B]) blur(ch);
  const Gm = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x; let m = 0;
    for (const ch of [R, G, B]) {
      const gx = ch[p - W + 1] + 2 * ch[p + 1] + ch[p + W + 1] - ch[p - W - 1] - 2 * ch[p - 1] - ch[p + W - 1];
      const gy = ch[p + W - 1] + 2 * ch[p + W] + ch[p + W + 1] - ch[p - W - 1] - 2 * ch[p - W] - ch[p - W + 1];
      m = Math.max(m, Math.abs(gx) + Math.abs(gy));
    }
    Gm[p] = m / 8;
  }
  const D = new Float32Array(N);
  for (let p = 0; p < N; p++) D[p] = dist(R[p], G[p], B[p]);
  // fond uni ? on regarde la régularité sur une bande juste à l'intérieur du bord
  const border = [], ins = 3;
  for (let x = ins; x < W - ins; x += 2) border.push(ins * W + x, (H - 1 - ins) * W + x);
  for (let y = ins; y < H - ins; y += 2) border.push(y * W + ins, y * W + W - 1 - ins);
  const gB = border.map((p) => Gm[p]).sort((a, b) => a - b);
  const edgeT = Math.min(14, Math.max(3.5 * sens, (gB[gB.length >> 1] * 3 + 2.5) * sens));   // sens < 1 : plus sensible aux contours
  const smoothShare = border.filter((p) => Gm[p] < edgeT).length / border.length;
  let spread = 0; for (const p of border) spread += D[p]; spread /= border.length;
  if (smoothShare < 0.8 || spread > 40) return { ok: false, reason: 'Fond trop chargé pour un détourage automatique. Photographie la pièce posée sur un fond uni (drap, mur, sol clair).' };
  const tol = Math.min(40, 12 + spread * 1.2), HI = Math.min(110, Math.max(40, tol * 3));
  // contours épaissis de 2 px : bouche les petites brèches par lesquelles le fond « fuirait » dans le vêtement
  const E = new Uint8Array(N), E2 = new Uint8Array(N);
  for (let p = 0; p < N; p++) E[p] = Gm[p] >= edgeT ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let d = -2; d <= 2 && !m; d++) { const xx = x + d; if (xx >= 0 && xx < W) m = E[y * W + xx]; } E2[y * W + x] = m; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let d = -2; d <= 2 && !m; d++) { const yy = y + d; if (yy >= 0 && yy < H) m = E2[yy * W + x]; } E[y * W + x] = m; }

  // 2. remplissage du fond depuis les bords : il avance tant qu'il ne rencontre pas de contour
  const isBg = new Uint8Array(N), queue = new Int32Array(N);
  let qh = 0, qt = 0;
  const ok = (q) => !isBg[q] && !E[q] && D[q] < HI;
  for (const p of border) if (ok(p)) { isBg[p] = 1; queue[qt++] = p; }
  for (let x = 0; x < W; x++) for (const p of [x, (H - 1) * W + x]) if (!isBg[p] && D[p] < HI && Gm[Math.min(N - 1, p + (p < W ? W * ins : -W * ins))] < edgeT) { isBg[p] = 1; queue[qt++] = p; }
  for (let y = 0; y < H; y++) for (const p of [y * W, y * W + W - 1]) if (!isBg[p] && D[p] < HI && Gm[p + (p % W === 0 ? ins : -ins)] < edgeT) { isBg[p] = 1; queue[qt++] = p; }
  while (qh < qt) {
    const p = queue[qh++], x = p % W, y = (p / W) | 0;
    if (x > 0 && ok(p - 1)) { isBg[p - 1] = 1; queue[qt++] = p - 1; }
    if (x < W - 1 && ok(p + 1)) { isBg[p + 1] = 1; queue[qt++] = p + 1; }
    if (y > 0 && ok(p - W)) { isBg[p - W] = 1; queue[qt++] = p - W; }
    if (y < H - 1 && ok(p + W)) { isBg[p + W] = 1; queue[qt++] = p + W; }
  }

  // 2 bis. bande de bord (12 px) : ce qui a la couleur du fond est rendu au fond.
  // Utile sur fond texturé (moquette, drap froissé) où la texture elle-même arrête le remplissage.
  let mD = 0, nD = 0; for (let p = 0; p < N; p += 7) if (isBg[p]) { mD += D[p]; nD++; }
  mD = nD ? mD / nD : 0; let vD = 0; for (let p = 0; p < N; p += 7) if (isBg[p]) vD += (D[p] - mD) ** 2;
  const sD = nD ? Math.sqrt(vD / nD) : 0, thr = Math.min(HI, Math.max(tol, mD + 2.5 * sD));
  const BAND = Math.max(6, Math.round(Math.min(W, H) * 0.012)), dst = new Uint8Array(N).fill(255);
  qh = qt = 0; for (let p = 0; p < N; p++) if (isBg[p]) { dst[p] = 0; queue[qt++] = p; }
  while (qh < qt) {
    const p = queue[qh++], x = p % W, dp = dst[p]; if (dp >= BAND) continue;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (q >= 0 && q < N && dst[q] === 255) { dst[q] = dp + 1; if (D[q] < thr && Gm[q] >= edgeT * 0.6) isBg[q] = 1; queue[qt++] = q; }   // couleur du fond ET grain du fond
  }

  // 3. opacité : fond transparent ; la bande de contour qui ressemble au fond (ombre, liseré) est rognée
  const A = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) A[p] = isBg[p] ? 0 : 255;
  for (let pass = 0; pass < 6; pass++) {
    const prev = A.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x; if (prev[p] !== 255) continue;
      if (prev[p - 1] && prev[p + 1] && prev[p - W] && prev[p + W]) continue;   // pas au bord
      const d = dist(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]);
      if (d < tol) A[p] = 0; else if (d < tol * 2) A[p] = Math.round(255 * ((d - tol) / tol));
    }
  }

  // 4. on garde le vêtement (grands morceaux) et on supprime les poussières
  const lab = new Int32Array(N).fill(-1), sizes = [];
  for (let s = 0; s < N; s++) {
    if (A[s] < 128 || lab[s] >= 0) continue;
    const id = sizes.length; let n = 0; qh = qt = 0; queue[qt++] = s; lab[s] = id;
    while (qh < qt) {
      const p = queue[qh++], x = p % W; n++;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W];
      for (const q of nb) if (q >= 0 && q < N && lab[q] < 0 && A[q] >= 128) { lab[q] = id; queue[qt++] = q; }
    }
    sizes.push(n);
  }
  const biggest = Math.max(0, ...sizes);
  if (!biggest) return { ok: false, reason: 'Aucun vêtement détecté sur la photo.' };
  for (let p = 0; p < N; p++) if (A[p] >= 128 && sizes[lab[p]] < biggest * 0.02) A[p] = 0;

  // fermeture (dilatation puis érosion de 2 px) : bouche les petits trous dans le tissu
  const M = new Uint8Array(N); for (let p = 0; p < N; p++) M[p] = A[p] >= 128 ? 1 : 0;
  const morph = (src, grow) => {
    const t = new Uint8Array(N), o = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = grow ? 0 : 1; for (let d = -2; d <= 2; d++) { const xx = Math.min(W - 1, Math.max(0, x + d)); v = grow ? (v | src[y * W + xx]) : (v & src[y * W + xx]); } t[y * W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = grow ? 0 : 1; for (let d = -2; d <= 2; d++) { const yy = Math.min(H - 1, Math.max(0, y + d)); v = grow ? (v | t[yy * W + x]) : (v & t[yy * W + x]); } o[y * W + x] = v; }
    return o;
  };
  const closed = morph(morph(M, true), false);
  for (let p = 0; p < N; p++) if (closed[p] && !M[p]) A[p] = 255;

  // 5. bord adouci (flou 3 × 3 sur la transition seulement) puis couleurs du bord nettoyées
  const A2 = new Uint8ClampedArray(A);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x, a = A[p];
    if (a === A[p - 1] && a === A[p + 1] && a === A[p - W] && a === A[p + W]) continue;
    let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += A[p + dy * W + dx];
    A2[p] = Math.round(s / 9);
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1, fg = 0, sr = 0, sg = 0, sb = 0, sn = 0;
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const a = A2[p];
    if (a > 0 && a < 255) {   // retire le halo de la couleur du fond
      const t = a / 255;
      for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, (px[i + c] - bg[c] * (1 - t)) / t));
    }
    px[i + 3] = a;
    if (a > 230) { sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; sn++; }
    if (a > 24) { fg++; const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const coverage = fg / N;
  if (coverage < 0.06 && sens === 1) {   // pièce petite ou proche de la couleur du fond : 2e essai plus sensible, on garde le meilleur
    const alt = await cutout(blob, max, 0.55);
    if (alt.ok && alt.coverage > coverage * 1.15 && alt.coverage < 0.6) return alt;
    if (coverage < 0.02) return alt;
  }
  if (coverage < 0.02) return { ok: false, reason: 'Pièce trop proche de la couleur du fond (ou trop petite). Pose-la sur un fond contrasté : foncé pour un vêtement clair, clair pour un vêtement foncé.' };
  if (coverage > 0.97) return { ok: false, reason: 'Le fond n’a pas pu être séparé du vêtement. Essaie un fond plus contrasté.' };
  ctx.putImageData(img, 0, 0);

  // 6. recadrage serré (marge de 3 %) et export avec transparence
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const res = await encodeCutout(out);   // WebP (Safari compris, via l'encodeur embarqué) ; PNG en dernier recours
  if (!res) return { ok: false, reason: 'Export de l’image impossible.' };
  if (res.size > MAX_BYTES && max > 700) return cutout(blob, Math.round(max * 0.75), sens);
  const rgb = sn ? [sr / sn, sg / sn, sb / sn].map(Math.round) : null;   // couleur moyenne du vêtement
  return { ok: true, blob: res, coverage, rgb, bg };
}

// Une photo détourée est enregistrée en PNG ou WebP (transparence) ; une photo d'origine en JPEG.
export const isCutPath = (path) => /\.(png|webp)$/i.test(String(path || ''));
