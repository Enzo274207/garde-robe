// « Régénération » d'une pièce à partir de sa photo détourée, entièrement sur l'appareil.
// On ne retouche pas la photo : on l'ANALYSE, puis on dessine une pièce neuve.
//  1. couleur principale du tissu (groupe de couleurs majoritaire, sans les ombres ni les reflets) ;
//  2. logos : zones nettement d'une autre couleur à l'intérieur du vêtement, hors col / étiquettes,
//     regroupées, nettoyées (aplat net si le logo est d'une seule couleur), avec leur position et leur taille ;
//  3. nouvelle pièce en pose « produit » (manches droites, proportions du type et de la coupe choisis),
//     dans la couleur exacte, logos replacés au même endroit relatif du torse, texture du tissu par-dessus ;
//  4. rendu en image transparente, enregistrée comme une photo.
import { flatlaySVG, decorBox, itemFrame } from './flatlay.js';

const WORK = 700;
async function load(blob) {
  try { return await createImageBitmap(blob); } catch (e) {
    return new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(blob); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('Image illisible')); i.src = u; });
  }
}
const toBlob = (c, t, q) => new Promise((r) => c.toBlob(r, t, q));
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// distance de couleur : la teinte compte plus que la luminosité (un pli reste « la même couleur »)
const dist = (a, b) => { const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2], dl = dr * 0.3 + dg * 0.59 + db * 0.11; return Math.sqrt(0.35 * dl * dl + 1.8 * ((dr - dl) ** 2 + (dg - dl) ** 2 + (db - dl) ** 2)); };

const NO_LOGO = new Set(['Montre', 'Bague', 'Chaîne', 'Bracelet', 'Lunettes', 'Ceinture']);
export async function analyze(cutBlob, category, type = '', bg = null) {
  const src = await load(cutBlob);
  const k = Math.min(1, WORK / Math.max(src.width, src.height));
  const W = Math.max(1, Math.round(src.width * k)), H = Math.max(1, Math.round(src.height * k)), N = W * H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const on = (p) => px[p * 4 + 3] > 160, col = (p) => [px[p * 4], px[p * 4 + 1], px[p * 4 + 2]];

  // silhouette et distance au bord (pour ignorer le liseré du contour)
  let x0 = W, y0 = H, x1 = -1, y1 = -1, area = 0;
  for (let p = 0; p < N; p++) if (on(p)) { area++; const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (area < 500) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, band = Math.max(3, Math.round(Math.max(bw, bh) * 0.035));
  const edgeD = new Uint8Array(N).fill(255), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let p = 0; p < N; p++) if (!on(p)) { edgeD[p] = 0; q[qt++] = p; }
  while (qh < qt) { const p = q[qh++], x = p % W, d = edgeD[p]; if (d >= band) continue; for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (n >= 0 && n < N && edgeD[n] === 255) { edgeD[n] = d + 1; q[qt++] = n; } }

  // chaussures : la bande du bas (≈ 16 %) est la semelle, analysée à part et exclue du reste
  const shoe = category === 'chaussures', soleY = shoe ? y1 - Math.round(bh * 0.16) : H;
  let sole = null;
  if (shoe) {
    const sp = []; for (let y = soleY; y <= y1; y++) for (let x = x0; x <= x1; x += 2) { const p = y * W + x; if (on(p) && edgeD[p] >= 2) sp.push(col(p)); }
    if (sp.length > 20) { const m = (i) => { const a = sp.map((c) => c[i]).sort((u, v) => u - v); return a[a.length >> 1]; }; sole = [m(0), m(1), m(2)]; }
  }
  const inBody = (p) => on(p) && edgeD[p] >= band && ((p / W) | 0) < soleY;
  // 1. couleur principale : k-moyennes, puis groupe le plus peuplé ; couleur = médiane de ce groupe
  const sample = []; const st = Math.max(1, Math.floor(area / 15000));
  for (let p = 0, c = 0; p < N; p++) if (inBody(p) && (c++ % st === 0)) sample.push(col(p));
  // fond visible à travers la pièce (anneau d'une bague, entre les anses d'un sac) : écarté
  // sauf si la pièce elle-même a la couleur du fond (t-shirt blanc sur drap blanc)
  const isHole = (c) => bg && dist(c, bg) < 26;
  const kept = sample.filter((c) => !isHole(c));
  if (bg && kept.length > sample.length * 0.3) sample.splice(0, sample.length, ...kept);
  if (sample.length < 50) return null;
  let C = [sample[0], sample[sample.length >> 1], sample[sample.length - 1], sample[sample.length >> 2]].map((c) => c.slice());
  for (let it = 0; it < 10; it++) {
    const acc = C.map(() => [0, 0, 0, 0]);
    for (const s of sample) { let bi = 0, bd = Infinity; C.forEach((c, i) => { const d = dist(s, c); if (d < bd) { bd = d; bi = i; } }); const a = acc[bi]; a[0] += s[0]; a[1] += s[1]; a[2] += s[2]; a[3]++; }
    C = acc.map((a, i) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : C[i]));
  }
  // les groupes de même teinte (ombre / lumière du même tissu) sont réunis
  const near = (s) => { let bi = 0, bd = Infinity; C.forEach((c, i) => { const d = dist(s, c); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const pop = C.map(() => 0); for (const s of sample) pop[near(s)]++;
  const main = pop.indexOf(Math.max(...pop));
  const fabric = sample.filter((s) => dist(s, C[main]) < 34);
  // couleur du tissu bien éclairé : moyenne des pixels entre 50 % et 85 % de luminosité (ni ombres ni reflets)
  const byL = fabric.slice().sort((u, v) => (u[0] * 0.3 + u[1] * 0.59 + u[2] * 0.11) - (v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11));
  const lit = byL.slice(Math.floor(byL.length * 0.5), Math.max(Math.floor(byL.length * 0.5) + 1, Math.floor(byL.length * 0.85)));
  const color = [0, 1, 2].map((i) => lit.reduce((t, s) => t + s[i], 0) / lit.length);
  let spread = 0; for (const s of fabric) spread += dist(s, color); spread /= fabric.length;

  // 2. logos : pixels nettement différents du tissu, à l'intérieur du vêtement
  const thr = Math.max(42, spread * 3.2);
  const L = new Uint8Array(N);
  if (!NO_LOGO.has(type)) for (let p = 0; p < N; p++) if (inBody(p) && dist(col(p), color) > thr) L[p] = 1;
  const lab = new Int32Array(N).fill(-1), comps = [];
  for (let s = 0; s < N; s++) {
    if (!L[s] || lab[s] >= 0) continue;
    const id = comps.length, c = { n: 0, x0: W, y0: H, x1: 0, y1: 0, r: 0, g: 0, b: 0, px: [] };
    qh = qt = 0; q[qt++] = s; lab[s] = id;
    while (qh < qt) {
      const p = q[qh++], x = p % W, y = (p / W) | 0; c.n++; c.px.push(p);
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      c.r += px[p * 4]; c.g += px[p * 4 + 1]; c.b += px[p * 4 + 2];
      for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (n >= 0 && n < N && L[n] && lab[n] < 0) { lab[n] = id; q[qt++] = n; }
    }
    comps.push(c);
  }
  // regroupe les morceaux proches (un logo en plusieurs parties : cœur + lettre, texte…)
  const gap = Math.round(bw * 0.025), groups = [];
  // bandes très allongées (semelle de l'autre chaussure, rayure, côtes) : ce ne sont pas des logos
  const longBand = (c) => { const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1; return Math.max(w / h, h / w) > (category === 'chaussures' ? 5 : 8); };
  for (const c of comps.filter((c) => c.n >= area * 0.0006 && !longBand(c)).sort((a, b) => b.n - a.n)) {
    const g = groups.find((g) => c.x0 <= g.x1 + gap && c.x1 >= g.x0 - gap && c.y0 <= g.y1 + gap && c.y1 >= g.y0 - gap);
    if (g) { g.x0 = Math.min(g.x0, c.x0); g.y0 = Math.min(g.y0, c.y0); g.x1 = Math.max(g.x1, c.x1); g.y1 = Math.max(g.y1, c.y1); g.parts.push(c); g.n += c.n; }
    else groups.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, parts: [c], n: c.n });
  }
  const top = category === 'haut' || category === 'veste';
  const logos = groups.filter((g) => {
    const w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1, cy = ((g.y0 + g.y1) / 2 - y0) / bh, fill = g.n / (w * h);
    if (g.n < area * 0.002 || g.n > area * 0.25) return false;         // trop petit (bruit) ou trop grand (motif / autre pièce)
    if (top && cy < 0.2) return false;                                 // col, étiquette de marque, étiquette accrochée
    if (type === 'Sac') {                                              // espace entre les anses : on y voit le fond
      const gc = g.parts[0]; if (cy < 0.4 || isHole([gc.r / gc.n, gc.g / gc.n, gc.b / gc.n])) return false;
    }
    return w / h < 7 && h / w < 7 && fill > 0.06;   // 6 % : accepte les logos fins (virgule, écriture)
  }).slice(0, 3).map((g) => {
    // image du logo : seuls ses pixels ; aplat net si une seule couleur
    const pad = 2, w = g.x1 - g.x0 + 1 + pad * 2, h = g.y1 - g.y0 + 1 + pad * 2;
    const lc = document.createElement('canvas'); lc.width = w * 2; lc.height = h * 2;
    const lx = lc.getContext('2d'), li = lx.createImageData(w * 2, h * 2);
    const all = g.parts.flatMap((c) => c.px), mean = [0, 0, 0];
    for (const p of all) { mean[0] += px[p * 4]; mean[1] += px[p * 4 + 1]; mean[2] += px[p * 4 + 2]; }
    mean.forEach((v, i) => { mean[i] = v / all.length; });
    let sd = 0; for (const p of all) sd += dist(col(p), mean); sd /= all.length;
    const flat = sd < 22, mask = new Uint8Array(w * h);
    for (const p of all) mask[((p / W | 0) - g.y0 + pad) * w + (p % W - g.x0 + pad)] = 1;
    for (let y = 0; y < h * 2; y++) for (let x = 0; x < w * 2; x++) {   // ×2 + lissage des bords
      const mx = x / 2, my = y / 2; let a = 0;
      for (const [dx, dy] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) { const sx = Math.round(mx + dx), sy = Math.round(my + dy); if (sx >= 0 && sy >= 0 && sx < w && sy < h && mask[sy * w + sx]) a += 0.25; }
      const o = (y * w * 2 + x) * 4, sp = ((Math.min(H - 1, g.y0 - pad + Math.round(my))) * W + Math.min(W - 1, Math.max(0, g.x0 - pad + Math.round(mx)))) * 4;
      const c = flat ? mean : [px[sp], px[sp + 1], px[sp + 2]];
      li.data[o] = c[0]; li.data[o + 1] = c[1]; li.data[o + 2] = c[2]; li.data[o + 3] = Math.round(a * 255);
    }
    lx.putImageData(li, 0, 0);
    // position relative au torse de la photo (≈ 62 % de la largeur totale à plat, centré)
    const torsoW = bw * (top ? 0.62 : 1), cx = (x0 + x1) / 2;   // hauts : le torse ≈ 62 % de la largeur à plat
    return { href: lc.toDataURL('image/png'), fx: ((g.x0 + g.x1) / 2 - cx) / torsoW, fy: ((g.y0 + g.y1) / 2 - y0) / bh, fw: (g.x1 - g.x0 + 1) / torsoW, fh: (g.y1 - g.y0 + 1) / bh, color: hex(mean) };
  });
  return { color: hex(color), sole: sole && hex(sole), logos };
}

// Dessine la pièce neuve (gabarit + couleur + logos) et la rend en image transparente
export async function regenerate(cutBlob, item, bg = null) {
  const a = await analyze(cutBlob, item.category, item.type, bg);
  if (!a) return { ok: false, reason: 'Pièce trop petite pour être analysée.' };
  const it = { ...item, color_hex: a.color, sole_hex: a.sole || undefined }, box = decorBox(it);
  // même place relative : sur le torse pour les hauts, sur la pièce entière pour le reste ; puis gardé dans la zone permise
  const frame = item.category === 'haut' || item.category === 'veste' ? box : itemFrame(it);
  const logos = !box || !frame ? [] : a.logos.map((l) => {
    const fw = frame.x1 - frame.x0, fh = frame.y1 - frame.y0, cx = (frame.x0 + frame.x1) / 2;
    let w = l.fw * fw, h = l.fh * fh, x = cx + l.fx * fw - w / 2, y = frame.y0 + l.fy * fh - h / 2;
    if (frame.map) [x, y, w, h] = frame.map(x, y, w, h);
    const k = Math.min(1, (box.x1 - box.x0 - 4) / w, (box.y1 - box.y0 - 4) / h); w *= k; h *= k;   // le logo tient dans la zone
    return { href: l.href, x: Math.max(box.x0 + 2, Math.min(box.x1 - w - 2, x)), y: Math.max(box.y0 + 2, Math.min(box.y1 - h - 2, y)), w, h };
  });
  const svg = flatlaySVG(it, { logos });
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1].split(' ').map(Number), S = 4;
  const sized = svg.replace('<svg ', `<svg width="${vb[2] * S}" height="${vb[3] * S}" `);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Rendu impossible')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized); });
  const cv = document.createElement('canvas'); cv.width = vb[2] * S; cv.height = vb[3] * S;
  cv.getContext('2d').drawImage(img, 0, 0);
  let b = await toBlob(cv, 'image/webp', 0.92);
  if (!b || b.type !== 'image/webp') b = await toBlob(cv, 'image/png');
  return b ? { ok: true, blob: b, color: a.color, logos: logos.length } : { ok: false, reason: 'Rendu impossible sur cet appareil.' };
}
