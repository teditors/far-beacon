/* Far finds, from content/farfinds.js: searching away from home turns up extra good items. Switch: s.off.farfinds. */
import { C, on, say, srand } from './core.js';
import { outdoorRec, sketchOf } from './areas.js';
import { depotHere } from './actions.js';
import { genItem, itemName } from './items.js';
import { SWITCHES } from './hooks.js';

on('did', (s, d) => {
  if (d.id !== 'search' || s.off.farfinds || !['ruin', 'cave', 'cache'].includes(d.site)) return;
  const rec = outdoorRec(s);
  if (rec.kind !== 'region' || rec.cx === undefined) return;
  const danger = sketchOf(s, rec.cx, rec.cy).danger,
    got = [];
  for (let i = 0; i < danger; i++)
    if (srand(s) < C.farFinds.chance) {
      const it = genItem(s, { relic: true, noConsumables: true });
      depotHere(s, true).items.push(it);
      got.push(itemName(it));
    }
  if (got.length) say(s, 'Far from home, the old things are less picked over. Also here: ' + got.join(', ') + '.', 'good');
});
SWITCHES.push(['farfinds', 'Richer far country']);
