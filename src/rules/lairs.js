/* Lairs from content/lairs.js: a unique creature on a hoard in some regions away from home. Built with the region
   (its generator is wrapped), so nothing is rolled at world creation. Switch: s.off.lairs (at creation of a region). */
import { C, byId, clamp, idx, on, say, stream } from './core.js';
import './worldgen.js';
import { GENERATORS, sketchOf } from './areas.js';
import { makeCreature } from './combat.js';
import { genItem } from './items.js';
import { NOTES, SWITCHES } from './hooks.js';

const L = () => C.lairs;
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    if (s.off.lairs || (s.regionRares && s.regionRares[rec.id] === 'empty')) return m; // a silent region stays silent
    const r = stream(s.seed, 'lair:' + rec.id),
      pick = (a) => a[Math.floor(r() * a.length)];
    if (r() >= L().chance) return m;
    const caves = Object.keys(m.sites).filter(
      (k) => m.sites[k].kind === 'cave' && !m.creatures.some((c) => idx(c.x, c.y) === +k),
    );
    if (!caves.length) return m;
    const k = +pick(caves),
      f = pick(C.creature.forms),
      pre = C.creature.prefix[rec.biome] || ['Wild'],
      sp = {
        name: pick(L().names) + ' ' + pick(pre) + ' ' + f.name,
        form: f.id,
        temper: 'territorial',
        rare: 'elder',
        met: false,
        unique: true,
        lair: rec.id,
      };
    s.species.push(sp);
    const c = makeCreature(
      s,
      400,
      s.species.length - 1,
      k % 36,
      Math.floor(k / 36),
      clamp(1 + sketchOf(s, rec.cx, rec.cy).danger, 2, 3),
    );
    c.lair = true;
    m.creatures.push(c);
    const H = L().hoard,
      dep = m.depots || (m.depots = {}),
      d = (dep[k] = dep[k] || { water: 0, fuel: 0, items: [] });
    d.coin = (d.coin || 0) + H.coin[0] + Math.floor(r() * (H.coin[1] - H.coin[0] + 1));
    for (let i = 0; i < H.items; i++) {
      const it = genItem(s, { relic: true, noConsumables: true });
      it.known = true;
      d.items.push(it);
    }
    m.sites[k].lair = true;
    return m;
  };
}
// Told when you first see it, and when it is dead.
on('did', (s) => {
  for (const c of s.creatures)
    if (c.lair && c.seen && !c.toldLair) {
      c.toldLair = true;
      say(s, 'That is the ' + s.species[c.sp].name + ', and there is no other like it. It lies on a hoard in that cave.', 'bad');
    }
  for (const sp of s.species)
    if (sp.unique && sp.lair === s.area && sp.met && !sp.dead && !s.creatures.some((c) => c.lair && s.species[c.sp] === sp)) {
      sp.dead = true;
      say(s, 'The ' + sp.name + ' is gone, and its hoard is yours: open Pack in its cave.', 'good');
    }
});
SWITCHES.push(['lairs', 'Lairs']);
NOTES.push((s) =>
  s.species
    .filter((sp) => sp.unique && sp.met)
    .map((sp) => ({
      label: 'The ' + sp.name,
      text: sp.dead ? 'Dead. Its hoard was in its cave.' : 'The only one of its kind, lying on a hoard in a cave.',
    })),
);
