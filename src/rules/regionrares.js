/* Rare regions: some regions away from home have a rare trait from content/regionrares.js, rolled at world creation
   into s.regionRares ({ regionId: rareId }). Switch: s.off.regionrares. */
import { C, byId, clamp, clock, on, say, stream } from './core.js';
import './worldgen.js'; // GENERATORS.region is wrapped below, so it must exist first
import { GENERATORS, HOME, outdoorRec, regionId, sketchOf } from './areas.js';
import { placeCreatures, speciesFor } from './combat.js';
import { SOURCES } from './stats.js';
import { NOTES, SWITCHES } from './hooks.js';

const RR = () => C.regionRares;
const regionRareOf = (s, id) =>
  s.regionRares && s.regionRares[id] && !s.off.regionrares ? byId(RR().list, s.regionRares[id]) : null;
const regionName = (s, rec) => {
  const r = regionRareOf(s, rec.id);
  return (r ? r.name + ' ' : '') + byId(C.biomes, rec.biome).name;
};

on('worldBorn', (s, d) => {
  if (d.off.regionrares) return;
  const r = stream(s.seed, 'regionRares'),
    w = s.world;
  s.regionRares = {};
  for (let cy = 0; cy < w.rows; cy++)
    for (let cx = 0; cx < w.cols; cx++) {
      const roll = r(),
        pick = r();
      if (cx === w.home.cx && cy === w.home.cy) continue; // the quest's region stays readable
      if (roll < RR().chance) s.regionRares[regionId(s, cx, cy)] = RR().list[Math.floor(pick * RR().list.length)].id;
    }
});

{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec),
      rr = regionRareOf(s, rec.id),
      g = rr && rr.gen;
    if (!g) return m;
    for (const k in m.sites) {
      const st = m.sites[k];
      if (st.kind === 'spring' && g.springs) st.foul = g.springs === 'foul' && !st.sure;
      if (st.kind === 'cache' && g.richCaches) {
        st.loot = true;
        st.fuel += 2;
        st.water += 2;
      }
    }
    if (g.noCreatures) m.creatures = [];
    if (g.moreCreatures) {
      const danger = sketchOf(s, rec.cx, rec.cy).danger,
        n = m.creatures.length;
      placeCreatures(s, stream(s.seed, 'teeming:' + rec.id), m, {
        count: g.moreCreatures,
        species: speciesFor(s, rec.biome),
        far: () => 0,
        avoid: (x, y) => x < 3 || y < 3 || x > 32 || y > 32,
        tier: () => clamp(1 + danger, 1, 3),
      });
      m.creatures.slice(n).forEach((c, i) => (c.id = 300 + i)); // ids of their own, apart from the region's first creatures
    }
    return m;
  };
}

SOURCES.push({
  id: 'regionrares',
  fn(s, out) {
    const rr = regionRareOf(s, outdoorRec(s).id);
    if (!rr) return;
    const d = clock(s).isDay ? 'day' : 'night';
    for (const m of rr.mods || []) if (!m.when || m.when === d) out.push(m);
  },
});
// Told the first time you walk into such a region.
on('did', (s, d) => {
  if (d.id !== 'move') return;
  const rec = outdoorRec(s),
    rr = regionRareOf(s, rec.id);
  if (!rr || rec.rareTold) return;
  rec.rareTold = true;
  say(s, 'This is ' + regionName(s, rec) + ': a rare country. ' + rr.text, 'good');
});
SWITCHES.push(['regionrares', 'Rare regions']);
NOTES.push((s) =>
  Object.keys(s.regionRares || {})
    .filter((id) => s.areas[id] && s.areas[id].rareTold)
    .map((id) => ({
      label: regionName(s, s.areas[id]) + ' (rare country)',
      text: regionRareOf(s, id) ? regionRareOf(s, id).text : '',
    })),
);

export { regionRareOf, regionName };
