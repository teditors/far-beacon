/* Saving and loading. Every save carries its format version (s.v). When the format changes, bump VERSION in core.js
   and add a migration here that upgrades a save from the old version, so a format change never throws away a run. */
import { VERSION } from './core.js';

const MIGRATIONS = {
  // Example: 6: (s) => { s.newField = defaultValue; },   // upgrades a version-6 save to version 7
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
