/* Saving and loading. Every save carries its format version (s.v). When the format changes, bump VERSION in core.js
   and add a migration here that upgrades a save from the old version, so a format change never throws away a run. */
import { VERSION } from './core.js';

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
  while (s.v < VERSION) {
    const up = MIGRATIONS[s.v];
    if (!up) return { error: 'That save is from version ' + s.v + ', which this version can no longer read.' };
    up(s);
    s.v++;
  }
  return { state: s };
}

export { MIGRATIONS, serialize, deserialize };
