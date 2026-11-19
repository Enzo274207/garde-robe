/* Météo pour la styliste (aujourd’hui, ou demain à partir de 20 h) : position du téléphone + Open-Meteo (gratuit, sans clé).
   La position est arrondie (~1 km) avant d'être envoyée ; le résultat est gardé 1 h sur l'appareil. */

const KEY = 'garderobe-meteo';
const MAX_AGE = 60 * 60 * 1000;

// Codes météo WMO → mot simple (la nuit, pas de « grand soleil »)
const SKY = [
  [[0], 'grand soleil', 'ciel dégagé'], [[1, 2], 'quelques nuages', 'quelques nuages'], [[3], 'ciel couvert'], [[45, 48], 'du brouillard'],
  [[51, 53, 55, 56, 57], 'de la bruine'], [[61, 63, 65, 66, 67, 80, 81, 82], 'de la pluie'],
  [[71, 73, 75, 77, 85, 86], 'de la neige'], [[95, 96, 99], 'de l’orage']
];
const sky = (code, night) => { const r = SKY.find(([c]) => c.includes(code)); return r ? (night && r[2]) || r[1] : ''; };

// Température ressentie → les trois choix de la styliste
export const feelOf = (t) => (t < 12 ? 'froid' : t < 21 ? 'doux' : 'chaud');

// À partir de 20 h, on s'habille pour demain
const TOMORROW_FROM = 20;
const ok = Number.isFinite;

function position() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('pas de géolocalisation'));
    navigator.geolocation.getCurrentPosition((p) => res(p.coords), rej, { timeout: 10000, maximumAge: 3 * 60 * 60 * 1000, enableHighAccuracy: false });
  });
}

/** Renvoie { day: 'today'|'tomorrow', temp, min, max, sky, weather } ou lance une erreur (refus, hors ligne…). */
export async function todayWeather() {
  const now = new Date();
  const day = now.getHours() >= TOMORROW_FROM ? 'tomorrow' : 'today';
  const stamp = now.toDateString() + day;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && c.stamp === stamp && Date.now() - c.at < MAX_AGE) return c.w;
  } catch (e) { /* rien */ }
  const { latitude, longitude } = await position();
  const q = `latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=temperature_2m,apparent_temperature,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code&forecast_days=2&timezone=auto`;
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
  let d;
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?' + q, { signal: ctl.signal });
    if (!res.ok) throw new Error('météo ' + res.status);
    d = await res.json();
  } finally { clearTimeout(timer); }
  const cur = d.current || {}; const dl = d.daily || {};
  let w;
  if (day === 'tomorrow') {
    const [min, max, amin, amax] = ['temperature_2m_min', 'temperature_2m_max', 'apparent_temperature_min', 'apparent_temperature_max'].map((k) => dl[k]?.[1]);
    if (!ok(min) || !ok(max)) throw new Error('météo illisible');
    // journée de demain : on penche vers l'après-midi
    const feel = ok(amin) && ok(amax) ? (amin + 2 * amax) / 3 : (min + 2 * max) / 3;
    w = { day, min: Math.round(min), max: Math.round(max), sky: sky(dl.weather_code?.[1], false), weather: feelOf(feel) };
  } else {
    const temp = Math.round(cur.temperature_2m);
    // On s'habille pour la journée : moyenne entre le ressenti actuel et le max du jour
    const max = dl.temperature_2m_max?.[0];
    const feel = ok(max) ? (cur.apparent_temperature + max) / 2 : cur.apparent_temperature;
    if (!ok(temp) || !ok(feel)) throw new Error('météo illisible');
    w = { day, temp, max: ok(max) ? Math.round(max) : null, sky: sky(cur.weather_code, cur.is_day === 0), weather: feelOf(feel) };
  }
  try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), stamp, w })); } catch (e) { /* rien */ }
  return w;
}

/** Phrase de la styliste, ex. « Aujourd’hui : il fait 14° (max 17°), quelques nuages : c’est plutôt doux ! » */
export function weatherLine(w) {
  const sk = w.sky ? ', ' + w.sky : '';
  if (w.day === 'tomorrow') {
    const word = { froid: 'il fera froid', doux: 'ce sera plutôt doux', chaud: 'il fera chaud' }[w.weather];
    return `Demain : entre ${w.min}° et ${w.max}°${sk} : ${word} !`;
  }
  const word = { froid: 'il fait froid', doux: 'c’est plutôt doux', chaud: 'il fait chaud' }[w.weather];
  return `Aujourd’hui : il fait ${w.temp}°${w.max != null && w.max !== w.temp ? ` (max ${w.max}°)` : ''}${sk} : ${word} !`;
}
