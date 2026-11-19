/* Saving and loading. Every save carries its format version (s.v). When the format changes, bump VERSION in core.js
   and add a migration here that upgrades a save from the old version, so a format change never throws away a run. */
import { VERSION } from './core.js';
import { ensureAround, ensureTown } from './areas.js';
import { makeSketch } from './world.js';
import { LOADERS } from './hooks.js';

const MIGRATIONS = {
  // 6 -> 7: towns and the locked place became areas you walk into.
  6: (s) => {
    s.area = 'overworld';
    s.areas = { overworld: { id: 'overworld', kind: 'overworld' } };
    s.creatures = s.creatures.filter((c) => !c.bound); // the old menu-dungeon's guardians
    if (s.combat && !s.creatures.some((c) => c.id === s.combat.cid)) s.combat = null;
    for (const k in s.sites) {
      const st = s.sites[k];
      if (st.kind !== 'vault') continue;
      delete st.guard;
      delete st.depth; // the levels are now built when you first go in, so any progress inside starts over
    }
  },
  // 7 -> 8: the one map became the home region of a larger world that wraps around.
  7: (s) => {
    s.world = makeSketch(s.seed, 3, 3, s.biome);
    Object.assign(s.areas.overworld, { kind: 'region', cx: s.world.home.cx, cy: s.world.home.cy, biome: s.biome, visited: true });
    s.camp = typeof s.camp === 'number' ? { area: 'overworld', i: s.camp } : null;
    s.speciesByBiome = { [s.biome]: s.species.map((_, i) => i) };
  },
  // 8 -> 9: the town now stands on the 5 x 5 tiles around its site, which can no longer be walked on outdoors.
  // Anything left on those tiles, a camp, or the traveller, is moved to the tile south of the gate.
  8: (s) => {
    const home = s.area === 'overworld' ? s : s.areas.overworld.map,
      W = 36,
      inBlock = (x, y) => Math.abs(x - s.town.x) <= 2 && Math.abs(y - s.town.y) <= 2,
      door = (s.town.y + 3) * W + s.town.x;
    for (const k of Object.keys(home.depots)) {
      if (!inBlock(k % W, Math.floor(k / W))) continue;
      const d = home.depots[k],
        to = home.depots[door] || (home.depots[door] = { water: 0, fuel: 0, items: [] });
      to.water += d.water || 0;
      to.fuel += d.fuel || 0;
      to.items.push(...(d.items || []));
      delete home.depots[k];
    }
    if (s.camp && s.camp.area === 'overworld' && inBlock(s.camp.i % W, Math.floor(s.camp.i / W))) s.camp.i = door;
    if (s.area === 'overworld' && inBlock(s.player.x, s.player.y)) {
      s.player.x = s.town.x;
      s.player.y = s.town.y + 3;
    }
    for (const id in s.areas) {
      const f = s.areas[id].from;
      if (f && f.area === 'overworld' && inBlock(f.x, f.y) && s.areas[id].kind === 'town') {
        f.x = s.town.x;
        f.y = s.town.y + 3;
      }
    }
  },
};

function serialize(s) {
  return JSON.stringify(s);
}

// Returns { state } on success, or { error } with a sentence the player can read.
function deserialize(text) {
  let s;
  try {
    s = JSON.parse(text);
  } catch (e) {
    return { error: 'That text is not a saved game.' };
  }
  if (!s || typeof s !== 'object' || typeof s.v !== 'number' || !s.player || !s.terrain)
    return { error: 'That text is not a saved game.' };
  if (s.v > VERSION) return { error: 'That save comes from a newer version of the game.' };
  for (const f of LOADERS) f(s);
  while (s.v < VERSION) {
    const up = MIGRATIONS[s.v];
    if (!up) return { error: 'That save is from version ' + s.v + ', which this version can no longer read.' };
    up(s);
    s.v++;
  }
  ensureTown(s);
  ensureAround(s);
  return { state: s };
}

export { MIGRATIONS, serialize, deserialize };
