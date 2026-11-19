/* Creature specials: a species' second slot, from content/specials.js. Nothing is stored: a species' special is worked
   out from the seed and its name, so it is the same in every save. Switch: s.off.specials.
   combat.js reads it through specialOf() at the few places a special acts. */
import { C, byId, stream } from './core.js';
import { SWITCHES } from './hooks.js';

const cache = {};
function specialOf(s, sp) {
  if (!sp || s.off.specials || sp.named) return NONE;
  const key = s.seed + ':' + sp.name;
  if (!(key in cache)) {
    const r = stream(s.seed, 'special:' + sp.name),
      X = C.specials;
    cache[key] = r() < X.chance ? X.list[Math.floor(r() * X.list.length)].id : null;
  }
  return cache[key] ? byId(C.specials.list, cache[key]) : NONE;
}
const NONE = {};
SWITCHES.push(['specials', 'Creature specials']);

export { specialOf };
