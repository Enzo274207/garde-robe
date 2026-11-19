/* Météo du jour pour la styliste : position du téléphone + Open-Meteo (gratuit, sans clé).
   La position est arrondie (~1 km) avant d'être envoyée ; le résultat est gardé 1 h sur l'appareil. */

const KEY = 'garderobe-meteo';
const MAX_AGE = 60 * 60 * 1000;

// Codes météo WMO → mot simple
const SKY = [
  [[0], 'grand soleil'], [[1, 2], 'quelques nuages'], [[3], 'ciel couvert'], [[45, 48], 'du brouillard'],
  [[51, 53, 55, 56, 57], 'de la bruine'], [[61, 63, 65, 66, 67, 80, 81, 82], 'de la pluie'],
  [[71, 73, 75, 77, 85, 86], 'de la neige'], [[95, 96, 99], 'de l’orage']
];
const sky = (code) => (SKY.find(([c]) => c.includes(code)) || [, ''])[1];

// Température ressentie → les trois choix de la styliste
export const feelOf = (t) => (t < 12 ? 'froid' : t < 21 ? 'doux' : 'chaud');

function position() {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error('pas de géolocalisation'));
    navigator.geolocation.getCurrentPosition((p) => ok(p.coords), ko, { timeout: 10000, maximumAge: 3 * 60 * 60 * 1000, enableHighAccuracy: false });
  });
}

/** Renvoie { temp, feel, sky, weather } ou lance une erreur (refus, hors ligne…). */
export async function todayWeather() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.at < MAX_AGE) return c.w;
  } catch (e) { /* rien */ }
  const { latitude, longitude } = await position();
  const q = `latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max&forecast_days=1&timezone=auto`;
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
  let d;
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?' + q, { signal: ctl.signal });
    if (!res.ok) throw new Error('météo ' + res.status);
    d = await res.json();
  } finally { clearTimeout(timer); }
  const cur = d.current || {};
  const temp = Math.round(cur.temperature_2m);
  // On s'habille pour la journée : moyenne entre le ressenti actuel et le max du jour
  const max = d.daily?.temperature_2m_max?.[0];
  const feel = Number.isFinite(max) ? (cur.apparent_temperature + max) / 2 : cur.apparent_temperature;
  if (!Number.isFinite(temp) || !Number.isFinite(feel)) throw new Error('météo illisible');
  const w = { temp, max: Number.isFinite(max) ? Math.round(max) : null, sky: sky(cur.weather_code), weather: feelOf(feel) };
  try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), w })); } catch (e) { /* rien */ }
  return w;
}

/** Phrase de la styliste, ex. « Il fait 14° (max 17°), quelques nuages : plutôt doux. » */
export function weatherLine(w) {
  const word = { froid: 'il fait froid', doux: 'c’est plutôt doux', chaud: 'il fait chaud' }[w.weather];
  return `Il fait ${w.temp}°${w.max != null && w.max !== w.temp ? ` (max ${w.max}°)` : ''}${w.sky ? ', ' + w.sky : ''} : ${word} !`;
}
