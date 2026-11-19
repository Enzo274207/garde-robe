// Réduit et compresse une photo avant l'envoi (plus rapide, moins de stockage).
export async function compressImage(file, max = 1200, quality = 0.82) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    src = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Image illisible'));
      img.src = URL.createObjectURL(file);
    });
  }
  const w = src.width, h = src.height;
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Compression impossible'))), 'image/jpeg', quality));
}

// Encode une photo détourée (transparente) en WebP, ~10 fois plus léger qu'un PNG, sans perte visible
// aux tailles d'affichage de l'app. Safari ne sait pas produire de WebP : on utilise alors l'encodeur
// libwebp embarqué (chargé à la demande). En dernier recours (hors connexion la 1re fois…) : PNG.
const WEBP_Q = 0.9;
let wasmEnc = null;
async function wasmWebp(canvas) {
  if (!wasmEnc) {
    wasmEnc = import('./vendor/webp/webp_enc.js').then((m) => m.default({ noInitialRun: true }));
    wasmEnc.catch(() => { wasmEnc = null; });   // nouvel essai à la prochaine photo
  }
  const mod = await wasmEnc;
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const out = mod.encode(data, width, height, {
    quality: WEBP_Q * 100, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60,
    filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0, preprocessing: 0,
    autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100, lossless: 0,
    exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0, low_memory: 0, near_lossless: 100,
    use_delta_palette: 0, use_sharp_yuv: 0,
  });
  if (!out) throw new Error('Encodage WebP impossible');
  return new Blob([out], { type: 'image/webp' });
}
const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));
export async function encodeCutout(canvas) {
  const b = await toBlob(canvas, 'image/webp', WEBP_Q);
  if (b && b.type === 'image/webp') return b;
  try { return await wasmWebp(canvas); } catch (e) { return toBlob(canvas, 'image/png'); }
}
