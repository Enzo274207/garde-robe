// Avatar 3D semi-réaliste en WebGL natif (aucune bibliothèque).
// Le personnage est construit en volumes (ellipsoïdes, révolutions, tubes) et habillé
// avec la couleur, la coupe et le type de chaque pièce. On le fait tourner au doigt.
// En cas d'échec (pas de WebGL), createAvatar3D() renvoie null et l'app garde le dessin 2D.
import { AV, isDark, safeColor } from './catalog.js';

const TAU = Math.PI * 2;
const rgb = (h) => { const s = safeColor(h); return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); };
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const tone = (c, f) => c.map((v) => Math.min(1, v * f));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* =========================================================
   Géométrie
   ========================================================= */
// Grille paramétrique (u autour, v le long) → une pièce de maillage.
function grid(U, V, fn, keep) {
  const p = [], idx = [];
  for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) p.push(...fn(i / U, j / V));
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
    if (keep && !keep((i + 0.5) / U, (j + 0.5) / V)) continue;
    const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { p, idx };
}
// Ellipsoïde ; lat 0 = sommet. latMax(az) permet de « couper » (cheveux, barbe).
function ellipsoid([cx, cy, cz], [rx, ry, rz], o = {}) {
  const U = o.U || 28, V = o.V || 18, latMax = o.latMax || (() => Math.PI);
  return grid(U, V, (u, v) => {
    const az = u * TAU, lat = v * latMax(az);
    return [cx + rx * Math.sin(lat) * Math.sin(az), cy + ry * Math.cos(lat), cz + rz * Math.sin(lat) * Math.cos(az)];
  }, o.keep && ((u, v) => o.keep(u * TAU, v * latMax(u * TAU))));
}
// Interpolation douce d'une suite de points (Catmull-Rom)
function smooth(pts, n = 4) {
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// Volume de révolution à section elliptique. rows : [y, rx, rz, décalage z] de bas en haut.
// a0..a1 : angle couvert (une veste ouverte laisse un vide devant, autour de az = 0).
function lathe(rows, o = {}) {
  const R = smooth(rows, o.n || 4), U = o.U || 36, a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU, rip = o.ripple;
  const yAt = (v) => { const f = v * (R.length - 1), i = Math.floor(f), j = Math.min(R.length - 1, i + 1); return lerp(R[i][0], R[j][0], f - i); };
  return grid(U, R.length - 1, (u, v) => {
    const r = R[Math.round(v * (R.length - 1))], az = a0 + u * (a1 - a0), k = rip ? 1 + rip(r[0]) : 1;
    return [(o.cx || 0) + r[1] * k * Math.sin(az), r[0], (o.cz || 0) + (r[3] || 0) + r[2] * k * Math.cos(az)];
  }, o.keep && ((u, v) => o.keep(a0 + u * (a1 - a0), yAt(v))));
}
// Tube le long d'une ligne de points [x, y, z, rayon], bouts arrondis si cap.
function tube(pts, o = {}) {
  const S = o.S || 16, zr = o.zr || 1;
  let P = smooth(pts, o.n || 4);
  const tan = (i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; return t.map((x) => x / l); };
  const ext = (end) => {
    const i = end ? P.length - 1 : 0, t = tan(i).map((x) => (end ? x : -x)), q = P[i];
    const mk = (f, rf) => [q[0] + t[0] * q[3] * f, q[1] + t[1] * q[3] * f, q[2] + t[2] * q[3] * f, q[3] * rf];
    return [mk(0.45, 0.85), mk(0.75, 0.5), mk(0.9, 0.02)];
  };
  if (o.capStart !== false) P = [...ext(false).reverse(), ...P];
  if (o.capEnd !== false) P = [...P, ...ext(true)];
  const frames = P.map((_, i) => {
    const t = tan(i), ref = Math.abs(t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    let b = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]];
    const l = Math.hypot(...b) || 1; b = b.map((x) => x / l);
    const n = [b[1] * t[2] - b[2] * t[1], b[2] * t[0] - b[0] * t[2], b[0] * t[1] - b[1] * t[0]];
    return [b, n];
  });
  return grid(S, P.length - 1, (u, v) => {
    const i = Math.round(v * (P.length - 1)), q = P[i], [b, n] = frames[i], a = u * TAU, c = Math.cos(a) * q[3], s = Math.sin(a) * q[3] * zr;
    return [q[0] + b[0] * c + n[0] * s, q[1] + b[1] * c + n[1] * s, q[2] + b[2] * c + n[2] * s];
  });
}

// Normales lissées (sommets soudés aux coutures) et orientées vers l'extérieur.
function finish(part) {
  const { p, idx } = part, n = new Float32Array(p.length);
  for (let k = 0; k < idx.length; k += 3) {
    const a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3;
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) { n[v] += f[0]; n[v + 1] += f[1]; n[v + 2] += f[2]; }
  }
  const weld = new Map(), key = (v) => `${Math.round(p[v] * 2e4)},${Math.round(p[v + 1] * 2e4)},${Math.round(p[v + 2] * 2e4)}`;
  for (let v = 0; v < p.length; v += 3) { const k = key(v), s = weld.get(k) || [0, 0, 0]; s[0] += n[v]; s[1] += n[v + 1]; s[2] += n[v + 2]; weld.set(k, s); }
  let cx = 0, cy = 0, cz = 0; const N = p.length / 3;
  for (let v = 0; v < p.length; v += 3) { cx += p[v]; cy += p[v + 1]; cz += p[v + 2]; }
  cx /= N; cy /= N; cz /= N;
  let out = 0;
  for (let v = 0; v < p.length; v += 3) {
    const s = weld.get(key(v)), l = Math.hypot(...s) || 1;
    n[v] = s[0] / l; n[v + 1] = s[1] / l; n[v + 2] = s[2] / l;
    out += n[v] * (p[v] - cx) + n[v + 1] * (p[v + 1] - cy) + n[v + 2] * (p[v + 2] - cz);
  }
  if (out < 0) { // tourné vers l'intérieur : on inverse le sens des triangles et les normales
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    for (let v = 0; v < n.length; v++) n[v] = -n[v];
  }
  part.n = n;
  return part;
}

/* =========================================================
   Le personnage (hauteur 1 = 1,75 m environ, pieds à y = 0, face vers +z)
   ========================================================= */
const TOP_FIT = { 'Ajusté': { x: 0.95, z: 0.95, hem: 0.515, sl: 0.92 }, Regular: { x: 1, z: 1, hem: 0.5, sl: 1 }, Ample: { x: 1.13, z: 1.15, hem: 0.465, sl: 1.22 } };
const LEG_FIT = { 'Ajusté': [0.95, 0.93, 0.9, 0.86, 0.8], Regular: [1, 1, 1, 1, 1], Ample: [1.16, 1.2, 1.36, 1.42, 1.48] };

function buildFigure({ top, bottom, shoes, jacket, avatar: a = {} }) {
  const parts = [];
  const add = (geo, color, spec = 0.08) => { const g = finish(geo); g.color = color; g.spec = spec; parts.push(g); return g; };
  const sk = AV.skin[a.skin] || AV.skin[2];
  const skin = rgb(sk.hex), lip = rgb(sk.lip), hair = rgb((AV.hair[a.hair] || AV.hair[0]).hex), iris = rgb((AV.eye[a.eye] || AV.eye[0]).hex);
  const k = { Mince: 0.92, Normale: 1, 'Athlétique': 1.09 }[a.build] || 1, kw = Math.sqrt(k);
  const both = (fn) => { fn(1); fn(-1); };

  // ---------- haut ----------
  const tf = TOP_FIT[top?.fit] || TOP_FIT.Regular;
  const topC = top ? rgb(top.color_hex) : rgb('#D8D3CB');
  const torsoRows = (m = 1, hem = tf.hem) => [
    [hem, 0.102 * kw * tf.x * m, 0.072 * kw * tf.z * m], [0.56, 0.097 * kw * tf.x * m, 0.069 * kw * tf.z * m],
    [0.62, 0.096 * kw * tf.x * m, 0.068 * kw * tf.z * m], [0.70, 0.104 * k * tf.x * m, 0.074 * k * tf.z * m],
    [0.76, 0.112 * k * tf.x * m, 0.072 * k * tf.z * m], [0.80, 0.117 * k * tf.x * m, 0.066 * k * tf.z * m],
    [0.822, 0.094 * k * m, 0.058 * k * m], [0.838, 0.044 * m, 0.04 * m]
  ];
  const rows = torsoRows();
  const frontZ = (y) => { // devant du torse à la hauteur y
    for (let i = 0; i < rows.length - 1; i++) if (y >= rows[i][0] && y <= rows[i + 1][0]) return lerp(rows[i][2], rows[i + 1][2], (y - rows[i][0]) / (rows[i + 1][0] - rows[i][0]));
    return rows[0][2];
  };
  add(lathe(rows), topC);
  const ttype = top?.type || 'T-shirt';
  const shortS = ttype === 'T-shirt';
  const sx = 0.117 * k * tf.x;
  // bras (peau) puis manches
  both((s) => {
    add(tube([[s * (sx - 0.016), 0.775, 0, 0.026 * kw], [s * (sx + 0.006), 0.70, 0.002, 0.026 * kw], [s * (sx + 0.013), 0.62, 0.008, 0.022 * kw], [s * (sx + 0.018), 0.55, 0.012, 0.019], [s * (sx + 0.021), 0.495, 0.014, 0.016]], { S: 14 }), skin, 0.12);
    add(ellipsoid([s * (sx + 0.023), 0.452, 0.016], [0.0125, 0.036, 0.02], { U: 18, V: 12 }), skin, 0.12);
    add(ellipsoid([s * (sx + 0.016), 0.465, 0.03], [0.0065, 0.017, 0.0075], { U: 12, V: 8 }), skin, 0.12);
    const sl = tf.sl * kw;
    const sleeve = shortS
      ? [[s * (sx - 0.018), 0.796, 0, 0.033 * sl], [s * (sx + 0.002), 0.75, 0.001, 0.035 * sl], [s * (sx + 0.008), 0.695, 0.003, 0.035 * sl]]
      : [[s * (sx - 0.018), 0.796, 0, 0.033 * sl], [s * (sx + 0.006), 0.70, 0.002, 0.032 * sl], [s * (sx + 0.013), 0.62, 0.008, 0.028 * sl], [s * (sx + 0.018), 0.55, 0.012, 0.025 * sl], [s * (sx + 0.021), 0.497, 0.014, 0.023 * sl]];
    add(tube(sleeve, { S: 16, capEnd: false }), topC);
    if (ttype === 'Pull' || ttype === 'Sweat') add(tube([[s * (sx + 0.02), 0.51, 0.013, 0.0235 * sl], [s * (sx + 0.021), 0.497, 0.014, 0.0235 * sl]], { S: 16, n: 1, capStart: false, capEnd: false }), tone(topC, 0.86));
  });
  // détails selon le type
  if (ttype === 'T-shirt' || ttype === 'Pull') add(lathe([[0.826, 0.05, 0.044], [0.836, 0.045, 0.041]], { n: 1 }), tone(topC, 0.88));
  if (ttype === 'Pull' || ttype === 'Sweat') add(lathe(torsoRows(1.012).slice(0, 2).map((r, i) => (i ? [tf.hem + 0.03, r[1], r[2]] : r)), { n: 1 }), tone(topC, 0.86));
  if (ttype === 'Sweat') add(ellipsoid([0, 0.84, -0.045], [0.068, 0.036, 0.045], { latMax: () => 2.1 }), tone(topC, 0.93));
  if (ttype === 'Chemise' || ttype === 'Veste') {
    both((s) => add(ellipsoid([s * 0.024, 0.833, 0.036], [0.022, 0.01, 0.012], { U: 14, V: 8 }), tone(topC, 1.04)));
    const pl = [0.52, 0.6, 0.7, 0.8].map((y) => [0, y, frontZ(y) + 0.001, 0.0055]);
    add(tube(pl, { S: 8, zr: 0.4 }), tone(topC, 0.9));
    for (let y = 0.56; y < 0.8; y += 0.055) add(ellipsoid([0, y, frontZ(y) + 0.0035], [0.0032, 0.0032, 0.002], { U: 8, V: 6 }), isDark(top?.color_hex || '#ffffff') ? [0.85, 0.85, 0.82] : [0.25, 0.24, 0.22], 0.4);
  }

  // ---------- veste ouverte par-dessus ----------
  if (jacket) {
    const jc = rgb(jacket.color_hex), jt = jacket.type;
    const add_ = { 'Ajusté': 0.02, Regular: 0.05, Ample: 0.1 }[jacket.fit] ?? 0.05;
    const m = 1.06 + add_ + (jt === 'Doudoune' ? 0.08 : 0);
    const hem = { Manteau: 0.3, Veste: 0.455, 'Coupe-vent': 0.47, Blouson: 0.5, Doudoune: 0.49 }[jt] ?? 0.46;
    let jr = torsoRows(m, Math.max(hem, 0.46));
    if (hem < 0.46) jr = [[hem, 0.118 * kw * m, 0.08 * kw * m], [0.38, 0.112 * kw * m, 0.077 * kw * m], ...jr];
    const gap = 0.24, puff = jt === 'Doudoune' ? (y) => 0.05 * Math.max(0, Math.cos((y - 0.5) * 70)) : null;
    add(lathe(jr, { a0: gap, a1: TAU - gap, U: 40, ripple: puff }), jc, jt === 'Coupe-vent' ? 0.3 : 0.1);
    add(lathe([[0.815, 0.056 * m, 0.05 * m], [0.85, 0.05 * m, 0.045 * m]], { a0: gap + 0.2, a1: TAU - gap - 0.2, n: 1 }), tone(jc, 0.92));
    if (jt === 'Blouson') add(lathe([[0.5, jr[0][1] * 1.01, jr[0][2] * 1.01], [0.525, jr[0][1] * 0.99, jr[0][2] * 0.99]], { a0: gap, a1: TAU - gap, n: 1 }), tone(jc, 0.82));
    // manches de veste : toujours au moins 15 % plus larges que celles du haut, même départ d'épaule
    const jsl = Math.max((Math.max(tf.sl, 1) * 1.08 + add_ * 0.8 + (jt === 'Doudoune' ? 0.1 : 0)) * kw, tf.sl * kw * 1.15);
    both((s) => {
      const jx = Math.max(sx * m / (tf.x || 1), sx);
      add(tube([[s * (jx - 0.018), 0.797, 0, 0.034 * jsl], [s * (jx + 0.004), 0.70, 0.002, 0.035 * jsl], [s * (jx + 0.012), 0.62, 0.008, 0.031 * jsl], [s * (jx + 0.017), 0.55, 0.012, 0.028 * jsl], [s * (jx + 0.02), 0.5, 0.014, 0.026 * jsl]], { S: 16, capEnd: false, ripple: puff }), jc, 0.1);
    });
  }

  // ---------- bas ----------
  const bc = bottom ? rgb(bottom.color_hex) : rgb('#BDB7AD');
  const lf = LEG_FIT[bottom?.fit] || LEG_FIT.Regular, btype = bottom?.type || 'Jean';
  add(lathe([[0.455, 0.06 * kw, 0.04 * kw], [0.475, 0.083 * kw, 0.053 * kw], [0.52, 0.09 * kw, 0.058 * kw], [0.6, 0.086 * kw, 0.058 * kw], [0.62, 0.082 * kw, 0.056 * kw]]), bc);
  const jog = btype === 'Jogging';
  both((s) => {
    const r = [0.06 * lf[0] * kw, 0.054 * lf[1] * kw, 0.043 * lf[2], 0.04 * lf[3], (jog ? 0.032 : 0.038) * lf[4]];
    add(tube([[s * 0.046, 0.5, 0, r[0] * 0.82], [s * 0.052, 0.42, 0.002, r[1]], [s * 0.056, 0.285, 0.004, r[2]], [s * 0.057, 0.17, -0.002, r[3]], [s * 0.058, jog ? 0.075 : 0.058, 0, r[4]]], { S: 18, capEnd: false, capStart: false, zr: 0.95 }), bc);
    if (jog) add(tube([[s * 0.058, 0.08, 0, r[4] * 1.04], [s * 0.058, 0.055, 0, r[4] * 1.04]], { S: 16, n: 1, capStart: false, capEnd: false }), tone(bc, 0.85));
    if (btype === 'Cargo') add(ellipsoid([s * (0.054 + r[1] * 0.92), 0.37, 0.004], [0.012, 0.032, 0.03], { U: 14, V: 10 }), tone(bc, 0.92));
  });

  // ---------- chaussures ----------
  const shC = shoes ? rgb(shoes.color_hex) : rgb('#F4F2EE');
  const stype = shoes?.type || 'Baskets', high = shoes?.fit === 'Montantes' || stype === 'Bottines';
  const soleC = stype === 'Ville' ? rgb('#4A3426') : stype === 'Bottines' ? rgb('#2A2A2A') : (isDark(shoes?.color_hex || '#ffffff') ? rgb('#F2F2F0') : rgb('#E2DED6'));
  const low = stype === 'Ville';
  both((s) => {
    const x = s * 0.058;
    add(ellipsoid([x, low ? 0.028 : 0.034, 0.022], [0.033, low ? 0.024 : 0.031, 0.074], { U: 26, V: 16 }), shC, low ? 0.45 : 0.25);
    add(ellipsoid([x, stype === 'Running' ? 0.013 : 0.01, 0.022], [0.037, stype === 'Running' ? 0.015 : 0.011, 0.08], { U: 26, V: 10 }), soleC, 0.15);
    if (stype === 'Baskets' || stype === 'Running') add(ellipsoid([x, 0.03, 0.07], [0.028, 0.02, 0.03], { U: 16, V: 10, latMax: () => 2.2 }), mixc(shC, [1, 1, 1], isDark(shoes?.color_hex || '#ffffff') ? 0.12 : 0), 0.3);
    if (high) add(lathe([[0.03, 0.036, 0.04, -0.004], [0.08, 0.035, 0.038, -0.004], [0.115, 0.034, 0.036, -0.004]], { n: 2 }), shC, 0.25);
  });

  // ---------- tête ----------
  add(tube([[0, 0.79, -0.004, 0.029 * kw], [0, 0.875, -0.006, 0.028]], { S: 16, capStart: false }), skin, 0.12);
  // [y, demi-largeur, demi-profondeur, avancée] du menton au sommet du crâne
  const HEAD = [[0.851, 0.002, 0.002, 0.04], [0.854, 0.014, 0.012, 0.037], [0.861, 0.027, 0.03, 0.022], [0.873, 0.04, 0.045, 0.008],
    [0.89, 0.047, 0.055, 0.002], [0.925, 0.052, 0.06, 0], [0.955, 0.052, 0.062, -0.002], [0.975, 0.047, 0.058, -0.004],
    [0.99, 0.036, 0.046, -0.005], [0.997, 0.02, 0.028, -0.005], [1.0, 0.002, 0.003, -0.005]];
  const headAt = (y) => { // profil interpolé à la hauteur y
    for (let i = 0; i < HEAD.length - 1; i++) if (y <= HEAD[i + 1][0]) { const t = (y - HEAD[i][0]) / (HEAD[i + 1][0] - HEAD[i][0]); return HEAD[i].map((v, d) => lerp(v, HEAD[i + 1][d], t)); }
    return HEAD[HEAD.length - 1];
  };
  const frontAt = (x, y) => { const [, rx, rz, zo] = headAt(y); return zo + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)); };
  // Coque épousant la tête (cheveux, barbe) : chaque colonne va exactement de yFrom(az) à yTo(az).
  const shell = (m, { a0 = 0, a1 = TAU, yFrom, yTo, U = 56, V = 22, keep }) => grid(U, V, (u, v) => {
    const az = a0 + u * (a1 - a0), y = lerp(yFrom(az), yTo(az), v), [, rx, rz, zo] = headAt(y);
    return [Math.sin(az) * rx * m, 0.925 + (y - 0.925) * m, zo + Math.cos(az) * rz * m];
  }, keep && ((u, v) => { const az = a0 + u * (a1 - a0); return keep(az, lerp(yFrom(az), yTo(az), v)); }));
  add(lathe(HEAD, { U: 40, n: 5 }), skin, 0.12);
  add(ellipsoid([0, 0.905, frontAt(0, 0.905) + 0.002], [0.0085, 0.017, 0.011], { U: 16, V: 12 }), skin, 0.14);
  add(ellipsoid([0, 0.893, frontAt(0, 0.893) + 0.011], [0.009, 0.0082, 0.0085], { U: 14, V: 10 }), skin, 0.16);
  both((s) => add(ellipsoid([s * 0.051, 0.918, -0.004], [0.007, 0.016, 0.011], { U: 14, V: 10 }), tone(skin, 0.96), 0.1));
  // yeux
  const es = { Petits: 0.86, Moyens: 1, Grands: 1.14 }[a.eyeSize] || 1;
  const shape = { Amande: 0.56, Ronds: 0.85, 'Étroits': 0.38 }[a.eyeShape] || 0.56;
  const ewx = 0.0115 * es, ewy = ewx * shape, ir = Math.min(0.0056 * es, ewy * 0.98 + 0.0008);
  const lash = mixc(hair, [0.1, 0.07, 0.06], 0.6);
  both((s) => {
    const x = s * 0.02;
    const fz = frontAt(0.02, 0.925);
    add(ellipsoid([x, 0.925, fz - 0.0068], [ewx, ewy, 0.0072], { U: 16, V: 10 }), [0.95, 0.93, 0.9], 0.5);
    add(ellipsoid([x, 0.925, fz - 0.0002], [ir, ir, 0.0016], { U: 14, V: 8 }), iris, 0.7);
    add(ellipsoid([x, 0.925, fz + 0.0011], [ir * 0.45, ir * 0.45, 0.0008], { U: 10, V: 6 }), [0.04, 0.03, 0.03], 0.9);
    add(ellipsoid([x, 0.925 + ewy * 0.85, fz - 0.0015], [ewx * 1.08, 0.0015, 0.004], { U: 14, V: 6 }), lash, 0.2);
    const by = 0.925 + ewy + 0.0105;
    add(ellipsoid([s * 0.021, by, frontAt(0.021, by) - 0.0005], [0.0135, 0.0026, 0.004], { U: 14, V: 6 }), hair, 0.1);
  });
  // bouche
  add(ellipsoid([0, 0.8745, frontAt(0, 0.8745) - 0.0028], [0.0135, 0.0032, 0.0055], { U: 16, V: 8 }), lip, 0.25);
  add(ellipsoid([0, 0.8685, frontAt(0, 0.8685) - 0.003], [0.0125, 0.0042, 0.0058], { U: 16, V: 8 }), tone(lip, 1.06), 0.3);

  // ---------- cheveux ----------
  const hs = a.hairStyle || 'Court';
  const hairC = hs === 'Rasé' ? mixc(hair, skin, 0.5) : hair;
  const side3 = (az) => (az > Math.PI ? TAU - az : az) / Math.PI;   // 0 devant, 0,5 côtés, 1 derrière
  const line = (front, side, back) => (az) => { const t = side3(az); return t < 0.5 ? lerp(front, side, sstep(0.08, 0.5, t)) : lerp(side, back, sstep(0.5, 1, t)); };
  const style = {
    Court: { m: 1.075, hl: line(0.962, 0.928, 0.9), vol: 0.024 },
    'Dégradé': { m: 1.045, hl: line(0.966, 0.94, 0.915), vol: 0.02 },
    'Mi-long': { m: 1.12, hl: line(0.962, 0.865, 0.855), vol: 0.028 },
    'Bouclé': { m: 1.08, hl: line(0.962, 0.928, 0.9), vol: 0 },
    'Rasé': { m: 1.018, hl: line(0.966, 0.935, 0.905), vol: 0 }
  }[hs] || { m: 1.075, hl: line(0.962, 0.928, 0.9), vol: 0.024 };
  add(shell(style.m, { yFrom: style.hl, yTo: () => 1.0, U: 64, V: 24 }), hairC, 0.18);
  if (style.vol) add(ellipsoid([0, 0.976, 0.004], [0.045 * style.m, style.vol, 0.055 * style.m], { U: 28, V: 14, latMax: () => 2.2 }), hairC, 0.18);
  if (hs === 'Bouclé') {
    for (let i = 0; i < 70; i++) { // petites boucles sur la calotte (spirale de Fibonacci)
      const y = 1 - (i + 0.5) / 70 * 0.62, th = i * 2.39996, az = ((th % TAU) + TAU) % TAU;
      const yy = 0.925 + y * 0.075; if (yy < style.hl(az) + 0.006) continue;
      const [, rx, rz, zo] = headAt(yy);
      add(ellipsoid([Math.sin(az) * rx * 1.07, yy, zo + Math.cos(az) * rz * 1.07], [0.012, 0.011, 0.012], { U: 10, V: 7 }), tone(hairC, 0.9 + (i % 3) * 0.06), 0.15);
    }
  }
  // ---------- barbe ----------
  if (a.beard === 'Courte' || a.beard === 'Pleine') {
    const full = a.beard === 'Pleine';
    const keep = (az, y) => !(side3(az) < 0.1 && y > 0.862 && y < (full ? 0.877 : 0.885));   // ouverture de la bouche
    // jusqu'aux pattes : le haut remonte vers l'oreille et rejoint les cheveux
    const top = (az) => { const t = side3(az); return full ? lerp(0.885, 0.932, sstep(0.08, 0.44, t)) : lerp(0.876, 0.93, sstep(0.1, 0.44, t)); };
    add(shell(full ? 1.07 : 1.045, { a0: -0.46 * Math.PI, a1: 0.46 * Math.PI, yFrom: () => 0.852, yTo: top, U: 80, V: 26, keep: (az, y) => keep(((az % TAU) + TAU) % TAU, y) }), tone(hair, 0.95), 0.1);
    if (full) add(ellipsoid([0, 0.879, frontAt(0, 0.879) + 0.001], [0.017, 0.0037, 0.005], { U: 14, V: 6 }), hair, 0.1);
  }
  return parts;
}

/* =========================================================
   Rendu WebGL
   ========================================================= */
const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec3 aC; attribute float aS;
uniform mat4 uVP; uniform mat3 uR; varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vS;
void main(){ vec3 w = uR * aP; vW = w; vN = uR * aN; vC = aC; vS = aS; gl_Position = uVP * vec4(w, 1.0); }`;
const FS = `precision mediump float;
varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vS; uniform vec3 uEye;
void main(){
  vec3 n = normalize(vN); float inside = gl_FrontFacing ? 1.0 : 0.0; if (!gl_FrontFacing) n = -n;
  vec3 base = pow(vC, vec3(2.2)), V = normalize(uEye - vW);
  vec3 L1 = normalize(vec3(0.55, 0.75, 0.85)), L2 = normalize(vec3(-0.8, 0.25, 0.35));
  float d1 = max(dot(n, L1), 0.0), d2 = max(dot(n, L2), 0.0) * 0.32, hemi = 0.5 + 0.5 * n.y;
  vec3 amb = mix(vec3(0.22, 0.21, 0.2), vec3(0.5, 0.52, 0.56), hemi) * 0.75;
  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.22;
  float sp = pow(max(dot(n, normalize(L1 + V)), 0.0), 48.0) * vS;
  vec3 c = base * (amb + d1 * vec3(1.0, 0.96, 0.9) + d2) + vec3(sp) + rim * vec3(0.75, 0.8, 0.9) * (0.4 + base);
  c *= mix(0.35, 1.0, inside);
  gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;

function perspective(fovy, asp, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function lookAt(e, t) {
  let z = [e[0] - t[0], e[1] - t[1], e[2] - t[2]]; const lz = Math.hypot(...z); z = z.map((v) => v / lz);
  let x = [z[2], 0, -z[0]]; const lx = Math.hypot(...x); x = x.map((v) => v / lx);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

// Cadrage : le corps (0 → 1) occupe la hauteur, avec la même répartition que le dessin 2D
// (torse ≈ 33 %, jambes ≈ 70 %, pieds ≈ 95 %) pour que les flèches restent alignées.
const VIEW = { top: 1.08, bottom: -0.06, fov: 0.32 };
const START_ANGLE = -0.42;

export function createAvatar3D() {
  const canvas = document.createElement('canvas');
  canvas.className = 'av3d';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  const opts = { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false };
  const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
  if (!gl) return null;
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isGL2 && !gl.getExtension('OES_element_index_uint')) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const loc = { P: gl.getAttribLocation(prog, 'aP'), N: gl.getAttribLocation(prog, 'aN'), C: gl.getAttribLocation(prog, 'aC'), S: gl.getAttribLocation(prog, 'aS'), VP: gl.getUniformLocation(prog, 'uVP'), R: gl.getUniformLocation(prog, 'uR'), E: gl.getUniformLocation(prog, 'uEye') };
  const buf = { P: gl.createBuffer(), N: gl.createBuffer(), C: gl.createBuffer(), S: gl.createBuffer(), I: gl.createBuffer() };
  let count = 0, angle = START_ANGLE, vel = 0, key = '', lost = false, raf = 0, onLost = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function upload(parts) {
    let nv = 0, ni = 0; for (const p of parts) { nv += p.p.length / 3; ni += p.idx.length; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), S = new Float32Array(nv), I = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const p of parts) {
      P.set(p.p, ov * 3); N.set(p.n, ov * 3);
      const n = p.p.length / 3;
      for (let v = 0; v < n; v++) { C[(ov + v) * 3] = p.color[0]; C[(ov + v) * 3 + 1] = p.color[1]; C[(ov + v) * 3 + 2] = p.color[2]; S[ov + v] = p.spec; }
      for (let j = 0; j < p.idx.length; j++) I[oi + j] = p.idx[j] + ov;
      ov += n; oi += p.idx.length;
    }
    const put = (b, data, l, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); };
    put(buf.P, P, loc.P, 3); put(buf.N, N, loc.N, 3); put(buf.C, C, loc.C, 3); put(buf.S, S, loc.S, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.I); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
    count = ni;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
  }
  function draw() {
    if (lost || !count) return;
    resize();
    if (!canvas.width || !canvas.height) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.useProgram(prog);
    const asp = canvas.width / canvas.height, half = (VIEW.top - VIEW.bottom) / 2, mid = (VIEW.top + VIEW.bottom) / 2;
    const dist = half / Math.tan(VIEW.fov / 2), eye = [0, mid + 0.05, dist];
    gl.uniformMatrix4fv(loc.VP, false, new Float32Array(mul(perspective(VIEW.fov, asp, 0.5, dist + 2), lookAt(eye, [0, mid, 0]))));
    const c = Math.cos(angle), s = Math.sin(angle);
    gl.uniformMatrix3fv(loc.R, false, new Float32Array([c, 0, -s, 0, 1, 0, s, 0, c]));
    gl.uniform3fv(loc.E, eye);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
  }
  const frame = () => {
    raf = 0;
    if (Math.abs(vel) > 0.0008 && !drag) { angle += vel; vel *= 0.93; raf = requestAnimationFrame(frame); }
    draw();
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // rotation au doigt (glisser horizontalement), le défilement vertical reste possible
  let drag = false, lastX = 0, lastT = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = true; lastX = e.clientX; lastT = e.timeStamp; vel = 0; canvas.setPointerCapture?.(e.pointerId); canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    angle += dx * 0.012; vel = reduced ? 0 : dx * 0.012 * Math.min(1, 16 / Math.max(1, e.timeStamp - lastT)); lastT = e.timeStamp;
    kick();
  });
  const end = () => { if (!drag) return; drag = false; canvas.classList.remove('grab'); kick(); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', () => { angle = START_ANGLE; vel = 0; kick(); });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); angle += e.key === 'ArrowLeft' ? -0.3 : 0.3; vel = 0; kick(); }
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; onLost?.(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => kick()).observe(canvas);

  return {
    el: canvas,
    onLost(fn) { onLost = fn; },
    get failed() { return lost; },
    update(state) {
      const pick = (it) => (it ? [it.id, it.color_hex, it.fit, it.type] : null);
      const next = JSON.stringify([pick(state.top), pick(state.bottom), pick(state.shoes), pick(state.jacket), state.avatar]);
      if (next !== key) { key = next; upload(buildFigure(state)); }
      canvas.setAttribute('aria-label', `${state.label}. Glisse horizontalement pour faire tourner l’avatar.`);
      kick();
    },
    // pour les tests : angle courant
    get angle() { return angle; }
  };
}
