/* Getting there: things promised to maps not yet built, and the way to any place from where you stand.

   Held things. A plot (or any piece) may promise a site, an item or a creature to a level that does not exist yet
   (the bottom of a dungeon, the top of a floating castle, the back of a sea cave): hold(s, areaId, thing) keeps it in
   s.held until that map is first built ('mapBuilt', from areas.js), then puts it there (at the farthest tile from the
   way in, or anywhere) and announces 'heldPlaced' with where it went.

   Routes. route(s, goal) says where to go next, in the map you are in, to reach a place anywhere: in this map, down a
   dungeon, up a floating castle, under the sea, in another world, or back out of wherever you are. ENTRANCES (each
   kind of level registers one) say how a level is entered from its parent: { area, x, y, act } (the act is the Rules
   action that goes in). The goal line and the playtest bot both use it. */
import { H, W, FLOOR, WALL, emit, idx, on, stream } from './core.js';
import { areaRec, localPos, mapOf, outdoorRec, realmOf, townArea, townById } from './areas.js';
import { ENTRANCES, OBJECTIVES } from './hooks.js';

/* ---------- held things ---------- */
function hold(s, areaId, thing) {
  const h = (s.held = s.held || {});
  (h[areaId] = h[areaId] || []).push(thing);
}
const heldIn = (s, areaId) => (s.held && s.held[areaId]) || [];
// Walking distance over open ground from a tile (-1 where you cannot get).
function reachFrom(m, start) {
  const d = new Array(W * H).fill(-1),
    open = (t) => t === FLOOR || t < WALL,
    q = [start];
  d[start] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const j of [i + 1, i - 1, i + W, i - W]) {
      if (j < 0 || j >= W * H || Math.abs((j % W) - (i % W)) > 1) continue;
      if (open(m.terrain[j]) && d[j] < 0) {
        d[j] = d[i] + 1;
        q.push(j);
      }
    }
  }
  return d;
}
on('mapBuilt', (s, ev) => {
  const list = heldIn(s, ev.id);
  if (!list.length) return;
  const m = ev.map,
    r = stream(s.seed, 'held:' + ev.id),
    e = ev.rec.entry || { x: 18, y: 18 },
    d = reachFrom(m, idx(e.x, e.y)),
    open = [];
  for (let i = 0; i < W * H; i++) if (d[i] > 0) open.push(i);
  const far = open.reduce((a, b) => (d[b] > d[a] ? b : a), open[0] || idx(e.x, e.y)),
    busy = (i) => m.sites[i] || (m.creatures || []).some((c) => idx(c.x, c.y) === i);
  delete s.held[ev.id];
  for (const t of list) {
    let i = far;
    if (t.where === 'near') {
      // beside the far place, for whoever guards it
      const near = open.filter(
        (j) =>
          Math.abs((j % W) - (far % W)) <= 3 && Math.abs(Math.floor(j / W) - Math.floor(far / W)) <= 3 && j !== far && !busy(j),
      );
      if (near.length) i = near[Math.floor(r() * near.length)];
    } else if (t.where === 'any') {
      const free = open.filter((j) => d[j] > 5 && !busy(j));
      if (free.length) i = free[Math.floor(r() * free.length)];
    }
    if (t.site) {
      // a site never sits on the stair that goes on down: if the far place is taken, the next one along
      if (m.sites[i] && t.where !== 'any') {
        const alt = open.filter((j) => !busy(j) && !(m.depots || {})[j]).sort((a, b) => d[b] - d[a])[0];
        if (alt !== undefined) i = alt;
      }
      m.sites[i] = t.site;
    }
    if (t.item) {
      m.depots = m.depots || {};
      const dp = (m.depots[i] = m.depots[i] || { water: 0, fuel: 0, items: [] });
      dp.items.push(t.item);
    }
    if (t.creature) {
      t.creature.x = i % W;
      t.creature.y = Math.floor(i / W);
      (m.creatures = m.creatures || []).push(t.creature);
    }
    emit(s, 'heldPlaced', { area: ev.id, thing: t, x: i % W, y: Math.floor(i / W) });
  }
});

/* ---------- routes ---------- */
// How to get into a level from the area it opens off: { area, x, y, act } (x, y unknown while that area is unbuilt).
function entranceOf(s, areaId) {
  for (const f of ENTRANCES) {
    const e = f(s, areaId);
    if (e) return e;
  }
  return null;
}
// The ways in from the outdoors to an area: [{ area, x, y, act, into }] outermost first, and the outdoor (or town)
// area it all opens off.
function chainOf(s, areaId) {
  const steps = [];
  let id = areaId;
  for (let g = 0; g < 400; g++) {
    const rec = s.areas[id];
    if (!rec || rec.kind === 'region' || rec.kind === 'town') break;
    const e = entranceOf(s, id);
    if (!e) break;
    steps.unshift(Object.assign({ into: id }, e));
    id = e.area;
  }
  return { outer: id, steps };
}
// The way out of the level you are in: its exit, stair up, landing or way back.
function wayOut(s) {
  for (const k in s.sites) {
    const st = s.sites[k];
    if (st.kind === 'exit' || st.kind === 'stairsUp') return { x: k % W, y: Math.floor(k / W), act: 'goUp' };
    if (st.kind === 'skyway' && st.back) return { x: k % W, y: Math.floor(k / W), act: 'skyOn' };
    if (st.kind === 'landing') return { x: k % W, y: Math.floor(k / W), act: 'flyDown' };
  }
  return null;
}
/* Where to go next for a goal { area, x, y } (or { town }): { x, y } in the frame of the map you are in (outdoors,
   in the frame of your region: a place in another region lies off its edges), with `act` when something must be done
   there to go on (enterDeep, goDown, goUp, skyOn, flyUp, flyDown, enterWater, enterVault, stepThrough), `fly` when
   flying is needed first, and `up` when you must first go back out. Null if there is nowhere to go. */
function route(s, goal) {
  if (!goal) return null;
  if (goal.town) {
    // a town: from inside a level, out first; from another world, its door; otherwise the town it is
    const t = townById(s, goal.town),
      area = t ? townArea(s, t) : null,
      rec = areaRec(s);
    if (rec.kind !== 'region' && rec.kind !== 'town') return Object.assign({ up: true }, wayOut(s));
    if (area && (realmOf(s, area) || null) !== (s.realm || null)) return route(s, { area, x: t.x, y: t.y + 3 });
    return goal;
  }
  if (goal.area === s.area) return { x: goal.x, y: goal.y, here: true };
  const g = chainOf(s, goal.area),
    rec = areaRec(s);
  // in the same place, above the goal: the stair down from here
  const st = g.steps.find((e) => e.area === s.area);
  if (st) return { x: st.x, y: st.y, act: st.act, fly: st.fly };
  // inside somewhere that is not on the way: out first
  if (rec.kind !== 'region') {
    if (rec.kind === 'town') return { x: 18, y: H - 1, out: true, act: 'leaveTown' }; // out by the south edge
    return Object.assign({ up: true }, wayOut(s));
  }
  // in another world from the goal (or the goal in another world): its door
  const there = realmOf(s, g.outer) || null,
    here = s.realm || null;
  if (there !== here)
    for (const f of OBJECTIVES) {
      const o = f(s, g.outer);
      if (o && o.at) return Object.assign(localPos(s, o.at.area, o.at.x, o.at.y), { act: 'stepThrough', area: o.at.area });
    }
  const first = g.steps[0],
    t = first || { area: g.outer, x: goal.x, y: goal.y };
  if (s.areas[t.area] && s.areas[t.area].kind === 'town') return { town: t.area };
  return Object.assign(localPos(s, t.area, t.x, t.y), { act: first ? first.act : null, fly: first && first.fly, area: t.area });
}
// Is an area a level (below, above or under the world), as opposed to a region or a town?
const isLevelArea = (s, id) => !!s.areas[id] && !['region', 'town'].includes(s.areas[id].kind);

export { hold, heldIn, route, chainOf, entranceOf, wayOut, isLevelArea };
