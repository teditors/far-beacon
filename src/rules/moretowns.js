/* More towns: a world has other towns besides the story's, in regions away from home, one per region at most. Each is
   made the way the first town is: its record (makeTownRec), then every TOWN_MAKERS hook (size and services from town
   life, a culture from town cultures) with s.town standing for it, then its streets when its area is built. Its id is
   't_<region id>'. Switch: s.off.moretowns (at creation). */
import { C, W, clamp, idx, on, stream } from './core.js';
import { HOME, allTowns, ensureRegion, ensureTown, townInRegion, withTown } from './areas.js';
import { makeTownRec } from './quest.js';
import { flatten, spot } from './plot.js';
import { NOTES, SWITCHES, TOWN_MAKERS } from './hooks.js';

const M = () => C.moreTowns;
// Make a town in region (cx, cy) if there is room, and return its record (or null). Any piece may call this.
function addTown(s, cx, cy, r, near) {
  const rec = ensureRegion(s, cx, cy);
  if (rec.id === HOME || rec.id === s.area || townInRegion(s, rec.id)) return null;
  const m = rec.map,
    // never on top of a creature that matters (the beast with the key, a lair's keeper), and no name twice
    keeps = (p) => !m.creatures.some((c) => (c.key || c.lair) && Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y)) <= 7);
  let p = null;
  for (let tries = 0; tries < 4 && !p; tries++) {
    p = spot(m, r, 2, 3, near || null);
    if (p && !keeps(p)) p = null;
  }
  if (!p) return null;
  return townAt(s, rec, p.x, p.y, r);
}
/* Make a town at outdoor tile (x, y) of region record rec, whose map is built (parked or live): the block is levelled,
   the site set, its record made and every TOWN_MAKERS hook run with s.town standing for it, then its streets built.
   opts: { name, size (a townLife size id the town is made at), extra fields for the record }. */
function townAt(s, rec, x, y, r, opts) {
  opts = opts || {};
  const m = rec.id === s.area ? s : rec.map;
  flatten(m, x, y, 2, 3);
  const id = 't_' + rec.id,
    t = makeTownRec(s, r, x, y);
  if (opts.name) t.name = opts.name;
  for (let k = 0; k < 6 && allTowns(s).some((o) => o.name === t.name); k++)
    t.name = C.town.a[Math.floor(r() * C.town.a.length)] + C.town.b[Math.floor(r() * C.town.b.length)];
  t.id = id;
  t.area = rec.id;
  if (opts.size) t.want = opts.size;
  Object.assign(t, opts.extra || {});
  m.sites[idx(x, y)] = { kind: 'town', town: id };
  (s.towns = s.towns || []).push(t);
  const rt = stream(s.seed, 'town:' + id);
  withTown(s, t, () => {
    for (const f of TOWN_MAKERS) f(s, t, rt);
  });
  delete t.want;
  ensureTown(s);
  return t;
}
on('worldBorn', (s, d) => {
  if (d.off.moretowns) return;
  const r = stream(s.seed, 'moretowns'),
    w = s.world,
    rolled = clamp(Math.round((w.cols * w.rows) / M().perRegions), M().least, M().most),
    want = d.set && d.set.towns >= 0 ? d.set.towns : rolled,
    spots = [];
  for (let cy = 0; cy < w.rows; cy++) for (let cx = 0; cx < w.cols; cx++) spots.push({ cx, cy, k: r() });
  spots.sort((a, b) => a.k - b.k);
  let n = 0;
  for (const p of spots) if (n < want && addTown(s, p.cx, p.cy, r)) n++;
});
SWITCHES.push(['moretowns', 'More towns (new worlds)']);
NOTES.push((s) =>
  (s.towns || []).length
    ? [
        {
          label: 'Towns',
          text:
            allTowns(s)
              .map((t) => t.name)
              .join(', ') + '. Each has its own elder, inn and shop, and its own troubles.',
        },
      ]
    : [],
);
export { addTown, townAt };
