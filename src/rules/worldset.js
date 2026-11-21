/* World settings (content/worldset.js): plain choices passed into newGame(seed, off, set), kept in s.gen (only those
   that differ from the defaults, so an ordinary world stores nothing). Pieces read them with genOf(s) in play, or from
   the 'worldBorn' event's `set` and the TUNERS' fifth argument while the world is made. */
import { C, byId } from './core.js';

const D = () => C.worldSet.defaults;
const num = (v, lo, hi, dflt) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};
// Any settings (from the screen, a test or the playtest's SET=) made whole and safe: unknown keys and values dropped.
function settings(set) {
  const d = D(),
    out = Object.assign({}, d);
  if (!set || typeof set !== 'object') return out;
  if (typeof set.size === 'string' && /^\d+x\d+$/.test(set.size)) {
    const [c, r] = set.size.split('x').map(Number);
    set = Object.assign({}, set, { cols: c, rows: r });
  }
  out.cols = Math.round(num(set.cols, 0, 7, 0));
  out.rows = Math.round(num(set.rows, 0, 7, 0));
  if (out.cols && out.rows) {
    out.cols = Math.max(2, out.cols);
    out.rows = Math.max(3, out.rows); // room for the story's places
  }
  if (!out.cols || !out.rows) out.cols = out.rows = 0;
  else while (out.cols * out.rows > C.worldSize.most) out.cols > out.rows ? out.cols-- : out.rows--;
  for (const [k, list] of [
    ['races', C.races],
    ['classes', C.classes],
  ]) {
    const ids = Array.isArray(set[k]) ? set[k] : typeof set[k] === 'string' && set[k] ? set[k].split('+') : null;
    const ok = ids && ids.filter((id) => byId(list, id));
    out[k] = ok && ok.length ? ok : null;
  }
  out.nRaces = Math.round(num(set.nRaces, 0, 99, 0));
  out.nClasses = Math.round(num(set.nClasses, 0, 99, 0));
  out.towns = Math.round(num(set.towns, -1, 5, d.towns));
  out.dungeons = num(set.dungeons, 0, 4, d.dungeons);
  out.depth = Math.round(num(set.depth, 1, 64, d.depth));
  out.sky = num(set.sky, 0, 1, d.sky);
  out.sea = num(set.sea, 0, 1, d.sea);
  out.doors = num(set.doors, 0, 1, d.doors);
  out.maxDoors = Math.round(num(set.maxDoors, 1, 3, d.maxDoors));
  out.trouble = typeof set.trouble === 'string' && C.plots && (byId(C.plots.kinds, set.trouble) || {}).main ? set.trouble : '';
  return out;
}
// What a world keeps: only the settings that are not the defaults.
function keepOf(set) {
  const d = D(),
    out = {};
  for (const k in set) if (JSON.stringify(set[k]) !== JSON.stringify(d[k])) out[k] = set[k];
  return Object.keys(out).length ? out : null;
}
// A world's settings, defaults filled in (old worlds have none stored).
const genOf = (s) => Object.assign({}, D(), (s && s.gen) || {});
// 'sky=1,doors=0.5,size=3x3' (the playtest's SET=) as settings.
function parseSet(text) {
  const out = {};
  for (const kv of (text || '').split(',').filter(Boolean)) {
    const [k, v] = kv.split('=');
    out[k] = v === undefined ? 1 : v;
  }
  return out;
}

export { settings, keepOf, genOf, parseSet };
