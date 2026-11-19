/* The year: a per-world trait rolled from content/years.js, with a rare slot. Switch: s.off.year. */
import { C, byId, clock, on, say, stream } from './core.js';
import { SOURCES } from './stats.js';
import { NOTES, SWITCHES } from './hooks.js';

const Y = () => C.year;
const yearOf = (s) => (s.year ? byId(Y().common, s.year) || byId(Y().rare, s.year) : null);
const isRareYear = (y) => !!y && Y().rare.includes(y);
// Rolled from the seed alone, before anything else is made, because a year can change the size of the world.
function rollYear(seed, off) {
  if (off && off.year) return null;
  const r = stream(seed, 'year'),
    pickW = (list) => {
      let t = list.reduce((a, e) => a + (e.w || 1), 0) * r();
      for (const e of list) if ((t -= e.w || 1) < 0) return e;
      return list[list.length - 1];
    };
  return r() < Y().rareChance ? pickW(Y().rare) : pickW(Y().common);
}
// What the year does to the tuning numbers (done once, at world creation, so the Tinker panel shows the result).
function yearTuning(tun, y) {
  if (!y) return tun;
  for (const k in y.tun || {}) {
    const [op, v] = y.tun[k];
    tun[k] = op === 'mul' ? tun[k] * v : JSON.parse(JSON.stringify(v));
  }
  if (y.day) [tun.dawn, tun.dusk] = y.day;
  return tun;
}

SOURCES.push({
  id: 'year',
  fn(s, out) {
    const y = yearOf(s),
      d = clock(s).isDay ? 'day' : 'night';
    if (y) for (const m of y.mods || []) if (!m.when || m.when === d) out.push(m);
  },
});
SWITCHES.push(['year', 'The year']);
NOTES.push((s) => {
  const y = yearOf(s);
  return y ? [{ label: y.name + (isRareYear(y) ? ' (rare)' : ''), text: y.text }] : [];
});
on('worldBorn', (s) => {
  const y = yearOf(s);
  if (y && y.id !== 'ordinary')
    say(s, (isRareYear(y) ? 'A rare year: ' + y.name.toLowerCase() : y.name) + '. ' + y.text, isRareYear(y) ? 'good' : '');
});

export { yearOf, rollYear, yearTuning, isRareYear };
