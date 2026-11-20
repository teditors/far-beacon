/* Tiers by distance: an item with affixes found away from home is finer. Its tier is 1 + the danger of the region it is
   found in (its distance from home), plus one in the deepest level of the locked place, at most 3. A Fine (tier 2) or
   Superb (tier 3) item's affixes do half again, or twice, as much: curses too. Switch: s.off.tiers (at finding). */
import { C } from './core.js';
import { areaRec, outdoorRec, sketchOf } from './areas.js';
import { ITEM_HOOKS, SWITCHES } from './hooks.js';

ITEM_HOOKS.push((s, it) => {
  if (s.off.tiers || (!it.pre && !it.suf && !it.mark) || !s.player) return;
  const rec = outdoorRec(s),
    danger = rec && rec.cx !== undefined ? sketchOf(s, rec.cx, rec.cy).danger : 0,
    deep = areaRec(s).kind === 'vault' && areaRec(s).level === areaRec(s).levels ? 1 : 0,
    t = Math.min(C.tiers.max, 1 + danger + deep);
  if (t > 1) it.tier = t;
});
SWITCHES.push(['tiers', 'Finer things far from home']);
