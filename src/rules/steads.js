/* Steads (commission 8): a hamlet on the land is a real place. It used to be a few houses you could not enter round a
   well, and a menu (a bed, wood, a little to buy, a rumour). Now each one is a small town of its own, of the size
   'hamlet': lanes and a little square, an elder, an inn with a bed by the fire, a shop, a service or two, a few
   dwellings, every building one you walk into, furnished like any other (houses.js), standing on its 5 x 5 block of
   the land like any town. It keeps the hamlet's name and is told as one.

   The hamlet is still rolled where it always was (hamlets.js, with the region), so worlds are made the same; it becomes a
   town once the world exists (here), so no other town moves. A hamlet that cannot be one (something that matters
   stands on its ground) stays as it was, menu and all. Old saves: their hamlets become towns as they load, unless the
   traveller stands among one.

   Switch: s.off.steads (at creation, and in play: no more hamlets become towns). */
import { W, H, idx, on, say, stream } from './core.js';
import { HOME, areaRec, curTown, inTown, townInRegion } from './areas.js';
import { townAt } from './moretowns.js';
import { AFTER_LOAD, SWITCHES } from './hooks.js';

const R_TOWN = 2;
// The hamlet site in a region's map, as { k, x, y, st }, or null.
function hamletIn(m) {
  if (!m || !m.sites) return null;
  for (const k in m.sites) if (m.sites[k].kind === 'hamlet') return { k: +k, x: +k % W, y: Math.floor(+k / W), st: m.sites[k] };
  return null;
}
// Can a hamlet's town stand at (x, y): its block and the row below it hold no site but the hamlet's own (skip), no
// water (unless it is the hamlet's own tile, which was always dry ground), and nothing that matters (the beast with
// the key, a lair's keeper) stands where the levelling would move it on?
function roomFor(m, x, y, skip) {
  if (x - R_TOWN < 2 || x + R_TOWN > W - 3 || y - R_TOWN < 2 || y + R_TOWN + 1 > H - 3) return false;
  for (let j = -R_TOWN; j <= R_TOWN + 1; j++)
    for (let i = -R_TOWN; i <= R_TOWN; i++) {
      const k = idx(x + i, y + j);
      if (k !== skip && m.sites[k]) return false;
      if (j <= R_TOWN && (m.terrain[k] === 2 || m.terrain[k] >= 4)) return false;
    }
  return !m.creatures.some((c) => (c.key || c.lair || c.plot) && Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) <= 6);
}
// Where the hamlet's town goes: on the hamlet if there is room, else the nearest place within a few tiles that has it.
function placeFor(m, h) {
  if (roomFor(m, h.x, h.y, h.k)) return { x: h.x, y: h.y };
  for (let r = 1; r <= 5; r++)
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (Math.max(Math.abs(i), Math.abs(j)) === r && roomFor(m, h.x + i, h.y + j, h.k)) return { x: h.x + i, y: h.y + j };
  return null;
}
// Make the hamlet in region record rec a town, if it has one and can. Returns the town or null. A hamlet in a region
// that already has a town, or with no room anywhere near for one, is gone: the town of the region, or none, stands in
// for it (a menu by a well is what this piece does away with).
function stead(s, rec, live) {
  if (s.off.steads || !rec || rec.kind !== 'region' || rec.id === HOME) return null;
  if ((rec.realm || null) !== (s.realm || null)) return null; // only in the world the traveller is in
  if (rec.id === s.area && !live) return null; // the region underfoot is already drawn: it waits until it is left
  live = rec.id === s.area;
  const m = live ? s : rec.map;
  const h = hamletIn(m);
  if (!h) return null;
  if (live && Math.max(Math.abs(s.player.x - h.x), Math.abs(s.player.y - h.y)) <= R_TOWN + 4) return null;
  const at = townInRegion(s, rec.id) ? null : placeFor(m, h);
  delete m.sites[h.k];
  if (!at) return null;
  h.x = at.x;
  h.y = at.y;
  // anything left on the block (a camp, things put down) goes to the tile below its gate
  const door = idx(h.x, h.y + R_TOWN + 1);
  for (const key of Object.keys(m.depots || {})) {
    const kx = +key % W,
      ky = Math.floor(+key / W);
    if (Math.abs(kx - h.x) > R_TOWN || Math.abs(ky - h.y) > R_TOWN) continue;
    const d = m.depots[key],
      to = m.depots[door] || (m.depots[door] = { water: 0, fuel: 0, items: [] });
    to.water += d.water || 0;
    to.fuel += d.fuel || 0;
    to.items.push(...(d.items || []));
    delete m.depots[key];
  }
  if (s.camp && s.camp.area === rec.id) {
    const cx = s.camp.i % W,
      cy = Math.floor(s.camp.i / W);
    if (Math.abs(cx - h.x) <= R_TOWN && Math.abs(cy - h.y) <= R_TOWN) s.camp.i = door;
  }
  return townAt(s, rec, h.x, h.y, stream(s.seed, 'stead:' + rec.id), {
    name: h.st.name,
    size: 'hamlet',
    extra: { hamlet: true, talk: h.st.talk, seen: !!h.st.seen },
  });
}
// Every built region of the world the traveller is in.
function steadAll(s, live) {
  if (s.off.steads) return;
  for (const id of Object.keys(s.areas)) {
    const rec = s.areas[id];
    if (rec.kind === 'region' && (rec.map || id === s.area)) stead(s, rec, live);
  }
}
// The world is made: its hamlets become towns now, after every other town has found its place. From then on a region
// built later has its hamlet made a town as it is built. (This module is imported last, so this runs last.)
const BORN = new WeakSet();
on('worldBorn', (s) => {
  BORN.add(s);
  steadAll(s, true);
});
on('mapBuilt', (s, d) => {
  if (BORN.has(s) && d.rec.kind === 'region') stead(s, d.rec);
});
AFTER_LOAD.push((s) => {
  BORN.add(s);
  steadAll(s, true);
});
// A region walked into from an old save, or one whose hamlet waited for the traveller to step off it.
on('did', (s, d) => {
  if (d.id === 'move' && BORN.has(s) && areaRec(s).kind === 'region') steadAll(s);
});
// Told as a hamlet the first time you walk into one.
on('did', (s, d) => {
  if (d.id !== 'move' || !inTown(s)) return;
  const t = curTown(s);
  if (!t || !t.hamlet || t.told) return;
  t.told = true;
  say(s, t.name + ', a hamlet. ' + (t.talk || '') + ' Every door is open to a traveller.', 'good');
});
SWITCHES.push(['steads', 'Hamlets are small towns you walk into']);

export { stead, steadAll };
