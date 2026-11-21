/* Odd levels of the locked place, from content/floors.js. Rolled at world creation into the locked place's list of
   levels; the level generator is wrapped to build them. Switch: s.off.floors (at creation; at runtime, their modifiers). */
import { C, byId, idx, on, say, stream } from './core.js';
import './interiors.js';
import { GENERATORS, areaRec } from './areas.js';
import { makeCreature } from './combat.js';
import { genItem } from './items.js';
import { SOURCES } from './stats.js';
import { SWITCHES } from './hooks.js';

const F = () => C.floorKinds;
const kindOf = (id) => byId(F().list, id) || (F().rare.id === id ? F().rare : null);

on('worldBorn', (s, d) => {
  if (d.off.floors) return;
  const r = stream(s.seed, 'floors');
  for (const k in s.sites) {
    const st = s.sites[k];
    if (st.kind !== 'vault') continue;
    for (let i = 0; i < st.floors.length - 1; i++) {
      const roll = r(),
        pick = r();
      if (roll < F().rareChance) st.floors[i] = F().rare.id;
      else if (roll < F().chance) st.floors[i] = F().list[Math.floor(pick * F().list.length)].id;
    }
  }
});

// An odd level's effects on a level map as it is built (the locked place's levels and any dungeon's).
function applyQuirk(s, rec, m, r, cid) {
  const k = kindOf(rec.floor);
  if (!k) return m;
  r = r || stream(s.seed, 'floor:' + rec.level);
  cid = cid || 260 + rec.level * 10;
  const free = [];
  for (let i = 0; i < m.terrain.length; i++)
    if (m.terrain[i] === 7 && !m.sites[i] && !m.depots[i] && !m.creatures.some((c) => idx(c.x, c.y) === i)) free.push(i);
  const take = () => free.splice(Math.floor(r() * free.length), 1)[0];
  for (let n = 0; n < (k.pools || 0) && free.length; n++) m.depots[take()] = { water: 3, fuel: 0, items: [] };
  for (let n = 0; n < (k.items || 0) && free.length; n++) {
    const it = genItem(s, { relic: true, noConsumables: true });
    m.depots[take()] = { water: 0, fuel: 0, items: [it] };
  }
  for (let n = 0; n < (k.guards || 0) && free.length; n++) {
    const i = take(),
      sp = rec.kind === 'vault' ? s.quest.guardSp : m.creatures.length ? m.creatures[0].sp : s.quest.guardSp;
    m.creatures.push(makeCreature(s, cid + 30 + n, sp, i % 36, Math.floor(i / 36), 1));
  }
  if (k.sleep) for (const c of m.creatures) if (!c.warden) c.cool = 1e9;
  if (k.reveal) m.seen = m.terrain.map((t) => (t === 7 ? 1 : 0));
  return m;
}
// Whether a dungeon's level is an odd one: an id from content/floors.js, or null. Never the bottom level.
function rollQuirk(s, name, last) {
  if (s.off.floors || last) return null;
  const r = stream(s.seed, name),
    roll = r(),
    pick = r();
  if (roll < F().rareChance) return F().rare.id;
  if (roll < (C.deeps ? C.deeps.quirkChance : F().chance)) return F().list[Math.floor(pick * F().list.length)].id;
  return null;
}
{
  const vault = GENERATORS.vault;
  GENERATORS.vault = (s, rec) => applyQuirk(s, rec, vault(s, rec));
}
const levelKind = (rec) => rec.kind === 'vault' || rec.kind === 'deep';

SOURCES.push({
  id: 'floors',
  fn(s, out) {
    const k = levelKind(areaRec(s)) ? kindOf(areaRec(s).floor) : null;
    if (k) for (const m of k.mods || []) out.push(m);
  },
});
on('did', (s, d) => {
  if (d.id !== 'goDown' && d.id !== 'enterVault' && d.id !== 'enterDeep') return;
  const rec = areaRec(s),
    k = levelKind(rec) ? kindOf(rec.floor) : null;
  if (!k || rec.told) return;
  rec.told = true;
  if (k.reveal) for (const i in s.sites) s.sites[i].seen = true;
  say(s, k.text, k.guards ? 'bad' : 'good');
});
SWITCHES.push(['floors', 'Odd levels below']);
export { applyQuirk, rollQuirk, kindOf as quirkOf };
