/* Other worlds (content/realms.js). Rarely a world has a door, and through it lies another world: a sketch of regions
   from a seed of its own, made like the home world but stranger (its own countries and rare regions far more often),
   with one town of its own. Very rarely two or three doors, each to a world of its own.
   s.realms holds each other world ({ id, seed, world, name }); s.doors each door ({ realm, area, x, y, back }).
   While the traveller is in another world its sketch and seed stand in s.world and s.seed (setRealm in areas.js), and
   its region ids carry its name ('o1:r2_0'), so every rule about regions works there unchanged and nothing collides.
   Only what the traveller (or the plot) touches is ever made: the rest of another world is a few numbers.
   The plot uses every door (plots.js: a place with `realm`); this piece only makes the worlds and the doors.
   Switch: s.off.realms (at creation: no doors). */
import { C, H, W, byId, idx, on, say, stream } from './core.js';
import './worldgen.js';
import {
  HOME,
  allTowns,
  areaRec,
  ensureRegion,
  ensureTown,
  enterRealm,
  inOverworld,
  mapOf,
  realmOf,
  regionId,
  sketchOf,
  townById,
  withRealm,
} from './areas.js';
import { makeSketch } from './world.js';
import { ensureBiomes } from './biomegen.js';
import { addTown } from './moretowns.js';
import { siteHere, SITE_NAME } from './map.js';
import { gainXp } from './progress.js';
import { ACTIONS, LOADERS, NOTES, OBJECTIVES, PLACES, SKETCHERS, SWITCHES } from './hooks.js';
import { genOf } from './worldset.js';

const X = () => C.realms;
SITE_NAME.door = 'door';
const realmsOf = (s) => Object.values(s.realms || {}).filter((r) => r.id !== 'home');
const realmById = (s, id) => (s.realms && s.realms[id]) || null;
const doorsOf = (s) => s.doors || [];
const doorTo = (s, rid) => doorsOf(s).find((d) => d.realm === rid) || null;
const realmName = (s, rid) => (rid && realmById(s, rid) ? realmById(s, rid).name : 'home');

// A free tile in a map for a door: open ground, nothing standing near.
function freeTile(m, r) {
  for (let t = 0; t < 400; t++) {
    const x = 4 + Math.floor(r() * (W - 8)),
      y = 4 + Math.floor(r() * (H - 8)),
      i = idx(x, y);
    if (m.terrain[i] === 2 || m.terrain[i] >= 4) continue;
    let ok = true;
    for (let j = -2; j <= 2 && ok; j++) for (let k = -2; k <= 2 && ok; k++) if (m.sites[idx(x + k, y + j)]) ok = false;
    if (ok) return i;
  }
  return null;
}

/* ---------- making another world ---------- */
function makeRealm(s, n, off, set) {
  const r = stream(s.seed, 'realm:' + n),
    id = 'o' + (n + 1),
    seed = Math.floor(r() * 4294967295) >>> 0 || 7,
    [cols, rows] = X().sizes[Math.floor(r() * X().sizes.length)],
    usual = C.biomes.filter((b) => !b.gen && !b.sea),
    world = makeSketch(seed, cols, rows, usual[Math.floor(r() * usual.length)].id);
  for (const f of SKETCHERS) f(seed, world, off, set);
  // stranger than home: its own countries and rare regions far more often
  if (!off.biomegen && C.biomeGen) {
    ensureBiomes(seed);
    for (const e of world.sketch)
      if (!e.sea && r() < X().genChance) e.biome = 'g' + (seed >>> 0) + '_' + Math.floor(r() * C.biomeGen.perWorld);
  }
  const used = realmsOf(s).map((o) => o.name),
    names = X().names.filter((nm) => !used.includes(nm)),
    realm = { id, seed, world, name: names[Math.floor(r() * names.length)] || 'Elsewhere' };
  s.realms = s.realms || {};
  s.realms[id] = realm;
  if (!off.regionrares && C.regionRares) {
    s.regionRares = s.regionRares || {};
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++)
        if (r() < X().rareChance)
          s.regionRares[id + ':r' + cx + '_' + cy] = C.regionRares.list[Math.floor(r() * C.regionRares.list.length)].id;
  }
  return realm;
}
// A door between home region `area` and the arrival region of world `rid`: a site on each side.
function makeDoor(s, rid, cx, cy, r) {
  const homeRec = ensureRegion(s, cx, cy),
    hm = mapOf(s, homeRec.id),
    hi = freeTile(hm, r);
  if (hi === null) return null;
  hm.sites[hi] = { kind: 'door', realm: rid };
  const door = { realm: rid, area: homeRec.id, x: hi % W, y: Math.floor(hi / W) };
  withRealm(s, rid, () => {
    const w = s.world,
      rec = ensureRegion(s, w.home.cx, w.home.cy),
      m = mapOf(s, rec.id),
      i = freeTile(m, r) ?? idx(18, 18);
    m.sites[i] = { kind: 'door', back: true, realm: rid };
    door.back = { area: rec.id, x: i % W, y: Math.floor(i / W) };
    // one town of its own, in another region of that world
    if (X().town && w.cols * w.rows > 1) {
      for (let t = 0; t < 6; t++) {
        const tx = Math.floor(r() * w.cols),
          ty = Math.floor(r() * w.rows);
        if (tx === w.home.cx && ty === w.home.cy) continue;
        const town = addTown(s, tx, ty, r);
        if (town) {
          town.realm = rid;
          break;
        }
      }
      ensureTown(s); // its streets are made from this world's seed
    }
  });
  (s.doors = s.doors || []).push(door);
  return door;
}
on('worldBorn', (s, ev) => {
  if (ev.off.realms) return;
  const set = ev.set || genOf(s),
    r = stream(s.seed, 'realms');
  if (!(r() < set.doors)) return;
  let n = 1;
  while (n < set.maxDoors && r() < X().moreDoors) n++;
  const w = s.world;
  for (let k = 0; k < n; k++) {
    const realm = makeRealm(s, k, ev.off, set);
    // the door stands away from home, somewhere the story's journey goes
    for (let t = 0; t < 8; t++) {
      const cx = Math.floor(r() * w.cols),
        cy = Math.floor(r() * w.rows);
      if ((cx === w.home.cx && cy === w.home.cy) || sketchOf(s, cx, cy).sea) continue;
      if (makeDoor(s, realm.id, cx, cy, r)) break;
    }
    if (!doorTo(s, realm.id)) delete s.realms[realm.id];
  }
  if (s.realms && !realmsOf(s).length) delete s.realms;
});
// A save from another world: its generated countries are rebuilt from its seed, as home's are.
LOADERS.push((s) => {
  for (const r of Object.values(s.realms || {})) if (r.seed) ensureBiomes(r.seed);
  if (s.seed) ensureBiomes(s.seed);
});

/* ---------- through a door ---------- */
function stepThrough(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'door' || !inOverworld(s)) return false;
  const d = doorTo(s, st.realm);
  if (!d) return false;
  if (s.player.aloft) s.player.aloft = false;
  if (st.back) {
    const rec = s.areas[d.area];
    enterRealm(s, null, rec.cx, rec.cy, { x: d.x, y: d.y });
    say(s, 'You step back through the door. The sky of home, and the air smells right again.', 'good');
  } else {
    const rec = s.areas[d.back.area];
    enterRealm(s, d.realm, rec.cx, rec.cy, { x: d.back.x, y: d.back.y });
    if (!d.crossed) {
      d.crossed = true;
      gainXp(s, 50);
      say(
        s,
        'You step through the door, and out under another sky: ' +
          realmName(s, d.realm) +
          '. Nothing here is quite as it should be.',
        'good',
      );
    } else say(s, 'Through the door, into ' + realmName(s, d.realm) + ' again.');
  }
  return true;
}
ACTIONS.push((s, st, a) => {
  if (s.combat || !st || st.kind !== 'door') return;
  a.push({
    id: 'stepThrough',
    label: st.back ? 'Step back through the door' : 'Step through the door',
    hint: st.back ? 'home' : realmName(s, st.realm),
    air: true,
  });
});
on('did', (s, ev) => {
  if (ev.id !== 'move') return;
  const st = siteHere(s);
  if (st && st.kind === 'door' && !st.told) {
    st.told = true;
    st.seen = true;
    say(s, st.back ? X().backText : X().text);
  }
});
// In another world, the way home is the door; a goal in another world is reached by its door.
OBJECTIVES.push((s, goalArea) => {
  const here = s.realm || null,
    there = goalArea ? realmOf(s, goalArea) : null;
  if (here === there) return null;
  if (here) {
    const d = doorTo(s, here);
    return { text: 'Go back through the door, home', at: d.back };
  }
  const d = doorTo(s, there);
  return d ? { text: 'Go through the door to ' + realmName(s, there), at: { area: d.area, x: d.x, y: d.y } } : null;
});

/* ---------- god mode, the journal ---------- */
PLACES.push((s, out) => {
  for (const d of doorsOf(s)) {
    out.push({
      id: 'door:' + d.realm,
      group: 'Other worlds',
      label: 'The door to ' + realmName(s, d.realm),
      go: (s) => {
        const rec = s.areas[d.area];
        enterRealm(s, null, rec.cx, rec.cy, { x: d.x, y: d.y });
        return true;
      },
    });
    const rm = realmById(s, d.realm),
      w = s.realm === d.realm ? s.world : rm.world;
    for (let cy = 0; cy < w.rows; cy++)
      for (let cx = 0; cx < w.cols; cx++) {
        const e = w.sketch[cy * w.cols + cx],
          b = byId(C.biomes, e.biome);
        out.push({
          id: 'realm:' + d.realm + ':' + cx + '_' + cy,
          group: 'Other worlds',
          label: rm.name + ': ' + (b ? b.name : e.biome) + ' (' + cx + ', ' + cy + ')',
          go: (s) => {
            enterRealm(s, d.realm, cx, cy, { x: 18, y: 18 });
            for (
              let t = 0;
              t < 30 && (s.terrain[idx(s.player.x, s.player.y)] === 2 || s.terrain[idx(s.player.x, s.player.y)] >= 4);
              t++
            )
              s.player.x = (s.player.x + 1) % W;
            return true;
          },
        });
      }
  }
});
NOTES.push((s) =>
  doorsOf(s)
    .filter((d) => d.crossed)
    .map((d) => ({
      label: realmName(s, d.realm),
      text: 'Another world, through a door of old stone. ' + (s.realm === d.realm ? 'You are there now.' : ''),
    })),
);
SWITCHES.push(['realms', 'Doors to other worlds (new worlds)']);

export { realmsOf, realmById, doorsOf, doorTo, stepThrough, realmName, makeRealm, makeDoor };
