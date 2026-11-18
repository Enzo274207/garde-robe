// Version « cartoon » d'une photo détourée, calculée dans le navigateur (aucun envoi, aucune librairie).
// Même silhouette (mêmes proportions), mêmes couleurs simplifiées en aplats, logos et motifs contrastés
// conservés, contour et lignes intérieures façon illustration.
// 1) filtre de Kuwahara (lisse le tissu en gardant les bords nets), 2) réduction à quelques couleurs
// (k-moyennes), 3) contour extérieur foncé + traits entre zones contrastées.

const MAX_SIDE = 900;

async function load(blob) {
  try { return await createImageBitmap(blob); } catch (e) {
    return new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(blob); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('Image illisible')); i.src = u; });
  }
}
const toBlob = (c, t, q) => new Promise((r) => c.toBlob(r, t, q));

export async function toonify(blob, { colors = 8 } = {}) {
  const src = await load(blob);
  const k = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
  const W = Math.max(1, Math.round(src.width * k)), H = Math.max(1, Math.round(src.height * k)), N = W * H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), px = img.data;

  // --- 1. Kuwahara (tables de sommes cumulées : temps constant par pixel) ---
  const W1 = W + 1, S = (n) => new Float64Array(W1 * (H + 1));
  const sR = S(), sG = S(), sB = S(), sL = S(), sL2 = S(), sC = S();
  for (let y = 0; y < H; y++) {
    let r = 0, g = 0, b = 0, l = 0, l2 = 0, c = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, on = px[i + 3] > 128 ? 1 : 0;
      if (on) { const L = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; r += px[i]; g += px[i + 1]; b += px[i + 2]; l += L; l2 += L * L; c++; }
      const o = (y + 1) * W1 + x + 1, u = y * W1 + x + 1;
      sR[o] = sR[u] + r; sG[o] = sG[u] + g; sB[o] = sB[u] + b; sL[o] = sL[u] + l; sL2[o] = sL2[u] + l2; sC[o] = sC[u] + c;
    }
  }
  const box = (T, x0, y0, x1, y1) => T[(y1 + 1) * W1 + x1 + 1] - T[y0 * W1 + x1 + 1] - T[(y1 + 1) * W1 + x0] + T[y0 * W1 + x0];
  const rad = Math.max(2, Math.round(Math.max(W, H) / 240));
  const out = new Uint8ClampedArray(px.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; out[i + 3] = px[i + 3];
    if (px[i + 3] <= 128) { out[i] = px[i]; out[i + 1] = px[i + 1]; out[i + 2] = px[i + 2]; continue; }
    let best = Infinity, br = px[i], bg = px[i + 1], bb = px[i + 2];
    for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x0 = Math.max(0, qx < 0 ? x - rad : x), x1 = Math.min(W - 1, qx < 0 ? x : x + rad);
      const y0 = Math.max(0, qy < 0 ? y - rad : y), y1 = Math.min(H - 1, qy < 0 ? y : y + rad);
      const n = box(sC, x0, y0, x1, y1); if (n < 3) continue;
      const m = box(sL, x0, y0, x1, y1) / n, v = box(sL2, x0, y0, x1, y1) / n - m * m;
      if (v < best) { best = v; br = box(sR, x0, y0, x1, y1) / n; bg = box(sG, x0, y0, x1, y1) / n; bb = box(sB, x0, y0, x1, y1) / n; }
    }
    out[i] = br; out[i + 1] = bg; out[i + 2] = bb;
  }

  // --- 2. réduction des couleurs (k-moyennes sur un échantillon) ---
  const sample = [];
  const stepS = Math.max(1, Math.floor(N / 24000));
  for (let p = 0; p < N; p += stepS) { const i = p * 4; if (out[i + 3] > 128) sample.push([out[i], out[i + 1], out[i + 2]]); }
  if (sample.length < 50) return { ok: false, reason: 'Pas assez de vêtement visible pour créer la version cartoon.' };
  const d2 = (a, b) => { const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db + 0.6 * ((dr - dg) ** 2 + (dg - db) ** 2) / 2; };
  // initialisation « k-means++ » déterministe : on prend à chaque fois la couleur la plus éloignée
  const C = [sample[Math.floor(sample.length / 2)].slice()];
  while (C.length < colors) {
    let far = 0, fd = -1;
    for (let s = 0; s < sample.length; s += 3) { let m = Infinity; for (const c of C) m = Math.min(m, d2(sample[s], c)); if (m > fd) { fd = m; far = s; } }
    if (fd < 60) break;   // vêtement presque uni : inutile d'ajouter des couleurs
    C.push(sample[far].slice());
  }
  for (let it = 0; it < 8; it++) {
    const acc = C.map(() => [0, 0, 0, 0]);
    for (const s of sample) { let bi = 0, bd = Infinity; for (let c = 0; c < C.length; c++) { const d = d2(s, C[c]); if (d < bd) { bd = d; bi = c; } } const a = acc[bi]; a[0] += s[0]; a[1] += s[1]; a[2] += s[2]; a[3]++; }
    acc.forEach((a, c) => { if (a[3]) C[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  // familles de couleurs : une même teinte éclairée différemment (pli, ombre) = un seul aplat
  const lumC = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const chroma = (c) => { const l = lumC(c); return [c[0] - l, c[1] - l, c[2] - l]; };
  const pop = C.map(() => 0);
  const nearest = (s) => { let bi = 0, bd = Infinity; for (let c = 0; c < C.length; c++) { const d = d2(s, C[c]); if (d < bd) { bd = d; bi = c; } } return bi; };
  for (const s of sample) pop[nearest(s)]++;
  const order = C.map((_, i) => i).sort((x, y) => pop[y] - pop[x]), fam = C.map((_, i) => i);
  for (const i of order) for (const j of order) {
    if (pop[j] <= pop[i] || fam[j] !== j) continue;
    const a = chroma(C[i]), bb = chroma(C[j]), dc = Math.hypot(a[0] - bb[0], a[1] - bb[1], a[2] - bb[2]);
    const dl = Math.abs(lumC(C[i]) - lumC(C[j])), sat = Math.hypot(...bb);
    if (dc < 10 + sat * 0.35 && dl < 70) { fam[i] = j; break; }
  }
  const base = C.map(() => [0, 0, 0, 0]);
  C.forEach((c, i) => { const f = base[fam[i]]; f[0] += c[0] * pop[i]; f[1] += c[1] * pop[i]; f[2] += c[2] * pop[i]; f[3] += pop[i]; });
  const BASE = base.map((f, i) => (f[3] ? [f[0] / f[3], f[1] / f[3], f[2] / f[3]] : C[i]));
  const lab = new Uint8Array(N);
  for (let p = 0; p < N; p++) { const i = p * 4; if (out[i + 3] > 128) lab[p] = fam[nearest([out[i], out[i + 1], out[i + 2]])]; }
  // ombrage en trois tons (ombre / base / lumière) d'après les plis réels, puis nettoyage 3 × 3
  const famL = BASE.map(() => [0, 0]);
  const Lk = new Float32Array(N);
  for (let p = 0; p < N; p++) { const i = p * 4; if (out[i + 3] > 128) { Lk[p] = lumC([out[i], out[i + 1], out[i + 2]]); famL[lab[p]][0] += Lk[p]; famL[lab[p]][1]++; } }
  const meanL = famL.map((f) => (f[1] ? f[0] / f[1] : 128));
  const TONES = [0.8, 1, 1.09], code = new Uint8Array(N);
  for (let p = 0; p < N; p++) { if (out[p * 4 + 3] <= 128) continue; const r = Lk[p] / Math.max(1, meanL[lab[p]]); code[p] = lab[p] * 3 + (r < 0.9 ? 0 : r > 1.09 ? 2 : 1); }
  const code2 = new Uint8Array(code), cnt = new Uint16Array(C.length * 3);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x; if (out[p * 4 + 3] <= 128) continue; cnt.fill(0);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = p + dy * W + dx; if (out[q * 4 + 3] > 128) cnt[code[q]]++; }
    let bi = code[p]; for (let c = 0; c < cnt.length; c++) if (cnt[c] > cnt[bi]) bi = c; code2[p] = bi;
  }
  const lab2 = new Uint8Array(N);
  const tone = (c, f) => (f < 1 ? c.map((v) => v * f) : c.map((v) => v + (255 - v) * (f - 1)));
  for (let p = 0; p < N; p++) {
    const i = p * 4; if (out[i + 3] <= 128) continue;
    const f = (code2[p] / 3) | 0; lab2[p] = f;
    const c = tone(BASE[f], TONES[code2[p] % 3]); out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
  }

  // --- 3. contour extérieur + traits entre zones de couleur différentes ---
  const lum = lumC;
  const line = Math.max(2, Math.round(Math.max(W, H) / 280));
  const opaque = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 128;
  const res = new Uint8ClampedArray(out);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4; if (out[i + 3] <= 128) continue;
    let edge = false;
    for (let d = 1; d <= line && !edge; d++) edge = !opaque(x - d, y) || !opaque(x + d, y) || !opaque(x, y - d) || !opaque(x, y + d);
    const c = BASE[lab2[p]];
    if (edge) { const f = lum(c) > 140 ? 0.5 : 0.45; res[i] = c[0] * f; res[i + 1] = c[1] * f; res[i + 2] = c[2] * f; continue; }
    if (x < W - 1 && y < H - 1) {
      const a = lab2[p], r = lab2[p + 1], b = lab2[p + W];
      if ((r !== a && Math.abs(lum(BASE[r]) - lum(c)) > 30) || (b !== a && Math.abs(lum(BASE[b]) - lum(c)) > 30)) { res[i] = c[0] * 0.62; res[i + 1] = c[1] * 0.62; res[i + 2] = c[2] * 0.62; }
    }
  }
  img.data.set(res); ctx.putImageData(img, 0, 0);
  let b = await toBlob(cv, 'image/webp', 0.92);
  if (!b || b.type !== 'image/webp') b = await toBlob(cv, 'image/png');
  return b ? { ok: true, blob: b } : { ok: false, reason: 'Export impossible.' };
}
