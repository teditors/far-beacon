/* God mode: a testing tool, switched on from the Tinker panel. The traveller is unseen by creatures, never thirsts,
   freezes, tires or bleeds, walks through anything, flies, breathes water and opens any door. A list of places (and a
   tap on the world map) jumps straight to any of them. A world that has ever used god mode is marked (s.cheated), so a
   god-mode win is never mistaken for a real one.
   State: s.godMode (on now), s.cheated (ever on). Places: PLACES in hooks.js, filled by every piece that adds a kind
   of place, each { id, group, label, go(s) }. */
import { W, H, idx, say } from './core.js';
import {
  HOME,
  allTowns,
  outdoorRec,
  regionId,
  sketchOf,
  switchRegion,
  toOverworld,
  townArea,
  townDoor,
  townId,
} from './areas.js';
import { PLACES, NOTES } from './hooks.js';
import { SOURCES } from './stats.js';
import { SYSTEMS } from './systems.js';
import { C, byId } from './core.js';
import { enterTown } from './quest.js';

const GOD_MODS = [
  { stat: 'quiet', op: 'add', value: 1 },
  { stat: 'nightSight', op: 'add', value: 1 },
  { stat: 'trapSafe', op: 'add', value: 1 },
  { stat: 'foulSafe', op: 'add', value: 1 },
  { stat: 'fly', op: 'add', value: 1 },
  { stat: 'breathe', op: 'add', value: 1 },
];
SOURCES.push({
  id: 'godmode',
  fn(s, out) {
    if (s.godMode) for (const m of GOD_MODS) out.push(m);
  },
});
// Runs last of all the systems: whatever time took, it is given back.
SYSTEMS.push({
  id: 'godmode',
  fn(s) {
    if (!s.godMode || !s.player) return;
    const p = s.player;
    if (p.water < 1) p.water = 1;
    p.warmth = 100;
    p.stamina = 100;
    if (p.hp !== undefined && p.hpMax) p.hp = p.hpMax;
    if (p.manaMax) p.mana = p.manaMax;
    s.cause = null;
  },
});
function setGodMode(s, on) {
  s.godMode = !!on;
  if (on) s.cheated = true;
  if (s.combat && on) s.combat = null; // unseen, the fight simply ends
  say(
    s,
    on ? 'God mode: nothing can see you, hurt you or stop you.' : 'God mode is off. You are mortal again.',
    on ? 'good' : '',
  );
  return true;
}
// A free tile near the middle of a map (or near (x, y)), for landing somewhere sensible.
function freeNear(m, x, y) {
  for (let r = 0; r < W; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) continue;
        const t = m.terrain[idx(xx, yy)];
        if (t !== 2 && t < 6 && !m.sites[idx(xx, yy)]) return { x: xx, y: yy };
      }
  return { x: x, y: y };
}
// Go to an outdoor region of the world the traveller is in (from anywhere), landing near (x, y) or its middle.
function jumpRegion(s, cx, cy, x, y) {
  toOverworld(s);
  switchRegion(s, cx, cy, { x: s.player.x, y: s.player.y });
  const p = freeNear(s, x === undefined ? 18 : x, y === undefined ? 18 : y);
  s.player.x = p.x;
  s.player.y = p.y;
  s.combat = null;
  return true;
}
// The places the list offers: every region and town, and whatever the other pieces add.
function places(s) {
  const out = [],
    w = s.world;
  for (let cy = 0; cy < w.rows; cy++)
    for (let cx = 0; cx < w.cols; cx++) {
      const id = regionId(s, cx, cy),
        b = byId(C.biomes, sketchOf(s, cx, cy).biome);
      out.push({
        id: 'region:' + id,
        group: 'Regions',
        label: (id === HOME ? 'Home: ' : '') + (b ? b.name : id) + ' (' + cx + ', ' + cy + ')',
        go: (s) => jumpRegion(s, cx, cy),
      });
    }
  for (const t of allTowns(s)) {
    const id = townId(t);
    out.push({
      id: 'town:' + id,
      group: 'Towns',
      label: t.name,
      go: (s) => {
        const rec = s.areas[townArea(s, t)];
        if (!rec || rec.realm !== s.areas[outdoorRec(s).id].realm) return false;
        const d = townDoor(s, t);
        jumpRegion(s, rec.cx, rec.cy, d.x, d.y);
        s.player.x = d.x;
        s.player.y = d.y;
        return enterTown(s, t.x, t.y + 2) || true;
      },
    });
  }
  for (const f of PLACES) f(s, out);
  return out;
}
function jumpTo(s, id) {
  if (!s.godMode || s.over) return false;
  const p = places(s).find((q) => q.id === id);
  if (!p) return false;
  const ok = p.go(s);
  if (ok !== false) say(s, 'You are in ' + p.label + '.', 'good');
  return ok !== false;
}
// A tap on the world map: tile (gx, gy) counted from the home region's corner, wrapping round the world.
function jumpMap(s, gx, gy) {
  if (!s.godMode || s.over) return false;
  const w = s.world,
    h = w.home,
    tx = ((Math.floor(gx) % (w.cols * W)) + w.cols * W) % (w.cols * W),
    ty = ((Math.floor(gy) % (w.rows * H)) + w.rows * H) % (w.rows * H),
    cx = (h.cx + Math.floor(tx / W)) % w.cols,
    cy = (h.cy + Math.floor(ty / H)) % w.rows;
  return jumpRegion(s, cx, cy, tx % W, ty % H);
}
NOTES.push((s) =>
  s.cheated
    ? [{ label: 'God mode', text: 'This world has been walked in god mode' + (s.godMode ? ', and it is on now.' : '.') }]
    : [],
);

export { setGodMode, jumpTo, jumpMap, places, jumpRegion, freeNear };
