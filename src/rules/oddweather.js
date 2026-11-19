/* Odd weather from content/weather.js. Whether a storm is odd is worked out from the seed and the time it ends, so
   nothing new is stored except the fallen stars it leaves. Switch: s.off.oddweather. */
import { C, H, W, byId, idx, on, say, stormMakers, stream } from './core.js';
import { indoors } from './areas.js';
import { dirTo, inShelter } from './map.js';
import { genItem } from './items.js';
import { SYSTEMS } from './systems.js';
import { SWITCHES, NOTES } from './hooks.js';

const X = () => C.oddWeather;
function oddStorm(s) {
  if (!s.weather.storm || s.off.oddweather || s.off.weather) return null;
  const r = stream(s.seed, 'oddweather:' + Math.round(s.weather.changeAt));
  return r() < X().chance ? X().list[Math.floor(r() * X().list.length)] : null;
}
stormMakers.push(oddStorm);

SYSTEMS.push({
  id: 'oddweather',
  fn(s, dt) {
    const w = oddStorm(s);
    if (!w) return;
    const key = Math.round(s.weather.changeAt);
    if (s.weather.oddTold !== key) {
      s.weather.oddTold = key;
      if (!indoors(s)) say(s, w.text, w.hurt ? 'bad' : '');
      s.oddSeen = s.oddSeen || [];
      if (!s.oddSeen.includes(w.id)) s.oddSeen.push(w.id);
      if (w.star && !indoors(s)) fallStar(s);
    }
    if (w.hurt && !indoors(s) && !inShelter(s)) s.player.hp = Math.max(1, s.player.hp - w.hurt * dt);
  },
});
// A fallen star: a new site a few tiles away, holding something good.
function fallStar(s) {
  const r = stream(s.seed, 'star:' + Math.round(s.weather.changeAt));
  for (let t = 0; t < 40; t++) {
    const x = Math.round(s.player.x + (r() - 0.5) * 10),
      y = Math.round(s.player.y + (r() - 0.5) * 10),
      k = idx(x, y);
    if (x < 1 || y < 1 || x > W - 2 || y > H - 2 || s.sites[k] || s.terrain[k] === 2 || s.terrain[k] >= 4) continue;
    if (Math.abs(x - s.player.x) + Math.abs(y - s.player.y) < 2) continue;
    s.sites[k] = { kind: 'cache', searched: false, loot: true, fuel: 2, water: 0, star: true, seen: true };
    s.seen[k] = 1;
    s.depots[k] = s.depots[k] || { water: 0, fuel: 0, items: [] };
    s.depots[k].items.push(genItem(s, { relic: true, noConsumables: true }));
    say(s, 'It lands to the ' + dirTo(s, x, y) + ', smoking. It is marked on your map.', 'good');
    return;
  }
}
SWITCHES.push(['oddweather', 'Odd weather']);
NOTES.push((s) =>
  (s.oddSeen || []).length
    ? [{ label: 'Strange weather seen', text: s.oddSeen.map((id) => byId(X().list, id).name).join(', ') + '.' }]
    : [],
);

export { oddStorm };
