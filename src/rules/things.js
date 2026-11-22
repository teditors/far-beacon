/* Things (commission 7): ordinary objects in rooms, ruins, caves and levels, from content/things.js.
   A place's things are never stored. They are made from the seed whenever they are wanted (thingsIn), the same every
   time, and only what the traveller has taken is kept: s.taken[areaId] is a list of the taken things' ids (an id is
   the thing's tile and its place in that tile's list, so it never changes). A thing taken becomes an item (base
   'th_<kind>', with item.thing saying its grade, age, people's mark and secret); dropped, it lies where it was dropped,
   as any item does. Pieces add things to their own kinds of place with MAKERS[kind] (the interiors piece: houses),
   may stop a taking (TAKE_CHECKS: the theft piece), and may finish a thing as it is made (FINISH: secret value).
   Switch: s.off.things (no things anywhere, nothing to take). */
import { C, W, H, WALL, FLOOR, VOID, byId, idx, say, stream } from './core.js';
import { areaRec, mapOf } from './areas.js';
import { ACTIONS, NOTES, SWITCHES } from './hooks.js';
import { ITEM_NAMES, ITEM_VALUES } from './hooks.js';
import { makeItem, weight } from './items.js';
import { carryCap } from './stats.js';

const X = () => C.things;
const KIND = {};
for (const k of C.things.kinds) KIND[k.id] = k;
const kindOf = (id) => KIND[id];
// every thing that can be carried is an item base of its own (never found by chance: w 0)
for (const k of C.things.kinds) {
  if (k.fixed || C.bases.some((b) => b.id === 'th_' + k.id)) continue;
  C.bases.push({
    id: 'th_' + k.id,
    name: k.name.charAt(0).toUpperCase() + k.name.slice(1),
    wt: k.wt,
    w: 0,
    plain: true,
    thing: true,
    consumable: !!k.use,
    use: k.use,
    mods: [],
  });
  C.value['th_' + k.id] = k.value;
}

const MAKERS = {}; // area kind -> (s, rec, map, r) giving the things of an area of that kind
const TAKE_CHECKS = []; // (s, thing, rec) -> true if the taking is stopped (it says why)
const FINISH = []; // (s, thing, place, r) as each thing is made

/* ---------- placing things in a room ---------- */
const pickW = (r, list) => {
  const tot = list.reduce((a, e) => a + e[1], 0);
  let x = r() * tot;
  for (const e of list) if ((x -= e[1]) < 0) return e[0];
  return list.length ? list[list.length - 1][0] : null;
};
const sizeOf = (k) => X().sizes[k] || [0.3, 0.3];
/* Furnish a room. room: { tiles: [tile index], wallSide(k): a direction [dx, dy] toward a wall beside tile k, or null }.
   spec: { wall, middle, small, n } (a room of content/things.js, with any trade, climate and year added).
   o: { r, ts (metres a tile), grade (0 poor, 1, 2 rich), old, ware, own, count (small things, if not by n) }.
   Pushes things onto `out`: { id, k, x, y, px, pz (offset in tiles), h (metres up), ry, g, old, ware, own }. */
function furnish(s, spec, room, o, out) {
  const r = o.r,
    ts = o.ts,
    used = new Set(),
    surf = [], // furniture with a top, for small things to stand on
    slot = {}; // things per tile so far (for ids)
  const put = (k, tile, px, pz, h, ry) => {
    const n = (slot[tile] = (slot[tile] || 0) + 1),
      kd = kindOf(k),
      t = {
        id: tile + '.' + n,
        k,
        x: tile % W,
        y: Math.floor(tile / W),
        px: Math.round(px * 100) / 100,
        pz: Math.round(pz * 100) / 100,
        h: Math.round(h * 100) / 100,
        ry: Math.round(ry * 100) / 100,
      };
    if (kd.grades) t.g = Math.max(0, Math.min(2, o.grade + (r() < 0.25 ? (r() < 0.5 ? -1 : 1) : 0)));
    if (o.old && !kd.fixed) t.old = 1;
    if (o.old && kd.fixed) t.old = 1;
    if (o.ware && kd.ware) t.ware = 1;
    if (o.own) t.own = 1;
    for (const f of FINISH) f(s, t, o, r);
    out.push(t);
    return t;
  };
  const free = room.tiles.filter((k) => !used.has(k));
  const take = (want) => {
    const c = room.tiles.filter((k) => !used.has(k) && want(k));
    if (!c.length) return null;
    const k = c[Math.floor(r() * c.length)];
    used.add(k);
    return k;
  };
  // furniture against the walls: pushed back to the wall, facing out into the room; one longer than a tile turned to run
  // along the wall, over two tiles
  const inset = o.inset || 0, // metres from a tile's outer side to the wall's face
    // a long wall takes the list more than once (less likely each time round)
    rounds = Math.max(1, Math.round(room.tiles.filter((t) => room.wallSide(t)).length / (o.perRound || 99))),
    wallList = [];
  for (let i = 0; i < rounds; i++) for (const [k, ch] of spec.wall || []) wallList.push([k, i ? ch * 0.55 : ch]);
  for (const [k, ch] of wallList) {
    if (!(r() < ch)) continue;
    const tile = take((t) => room.wallSide(t));
    if (tile === null) break;
    const [dx, dy] = room.wallSide(tile);
    let [w, d] = sizeOf(k),
      ry = Math.atan2(-dx, -dy); // its front faces away from the wall
    if (d > ts * 0.85 && d > w) (ry += Math.PI / 2), ([w, d] = [d, w]);
    let ax = 0,
      ay = 0,
      tiles = [tile];
    if (w > ts * 1.02) {
      // the next tile along the wall must be free and against the same wall
      const along = [
        [-dy, dx],
        [dy, -dx],
      ].find(([ex, ey]) => {
        const n = tile + ey * W + ex,
          ws = room.tiles.includes(n) && !used.has(n) && room.wallSide(n);
        return ws && ws[0] === dx && ws[1] === dy;
      });
      if (!along) {
        used.delete(tile);
        continue;
      }
      used.add(tile + along[1] * W + along[0]);
      tiles.push(tile + along[1] * W + along[0]);
      ax = along[0] * 0.5;
      ay = along[1] * 0.5;
    }
    const back = Math.max(-0.2, 0.5 - (inset + d / 2 + 0.04) / ts),
      t = put(k, tile, dx * back + ax, dy * back + ay, 0, ry);
    if (tiles.length > 1) t.tiles = tiles;
    if (kindOf(k).top) surf.push(t);
  }
  // furniture in the middle: a table with seats round it, a rug, a counter (one longer than a tile over two)
  const midRounds = Math.max(1, Math.round((o.floor || 0) / (o.perMiddle || 999))),
    midList = [];
  for (let i = 0; i < midRounds; i++) for (const [k, ch] of spec.middle || []) midList.push([k, i ? ch * 0.6 : ch]);
  for (const [k, ch] of midList) {
    if (!(r() < ch)) continue;
    const tile = take((t) => !room.wallSide(t)) ?? take(() => true);
    if (tile === null) break;
    let ry = r() < 0.5 ? 0 : Math.PI / 2,
      ax = 0,
      ay = 0,
      tiles = [tile];
    const [w] = sizeOf(k);
    if (w > ts * 1.02 && k !== 'rug') {
      const opts = [
        [1, 0, 0],
        [0, 1, Math.PI / 2],
        [-1, 0, 0],
        [0, -1, Math.PI / 2],
      ].filter(([ex, ey]) => {
        const n = tile + ey * W + ex;
        return room.tiles.includes(n) && !used.has(n) && !room.wallSide(n);
      });
      if (!opts.length) {
        used.delete(tile);
        continue;
      }
      const [ex, ey, rot] = opts[0];
      used.add(tile + ey * W + ex);
      tiles.push(tile + ey * W + ex);
      (ax = ex * 0.5), (ay = ey * 0.5), (ry = rot);
    }
    const t = put(k, tile, ax, ay, 0, ry);
    if (tiles.length > 1) t.tiles = tiles;
    if (k === 'rug') {
      used.delete(tile); // a rug is walked on, and things stand on it
      continue;
    }
    if (kindOf(k).top) surf.push(t);
    if (k === 'longtable') {
      // benches along both long sides
      const [, dd] = sizeOf(k),
        off = (dd / 2 + 0.3) / ts;
      for (const sg of [-1, 1]) put('bench', tile, ax + (ry ? sg * off : 0), ay + (ry ? 0 : sg * off), 0, ry);
    } else if (k === 'table') {
      // seats along its long sides, in the tiles beside it if they are free, else tucked in its own
      const seat = o.grade >= 1 ? 'chair' : 'stool',
        across = ry === 0 ? [0, 1] : [1, 0];
      for (const sg of [-1, 1]) {
        const nx = t.x + across[0] * sg,
          ny = t.y + across[1] * sg,
          nk = idx(nx, ny),
          near = nx >= 0 && ny >= 0 && nx < W && ny < H && room.tiles.includes(nk) && !used.has(nk) && !room.wallSide(nk);
        if (near) used.add(nk);
        const off = near ? -(1 - (0.375 + 0.3) / ts) * sg : ((0.375 + 0.25) / ts) * sg;
        put(seat, near ? nk : tile, across[0] * off, across[1] * off, 0, Math.atan2(-across[0] * sg, -across[1] * sg));
      }
    }
  }
  // small things: on the tops of furniture, or on the floor
  const n =
    o.count !== undefined
      ? o.count
      : Math.round((o.floor !== undefined ? o.floor : free.length) * (spec.n || 0.3) * (0.65 + 0.35 * o.grade) + r());
  const less = spec.less || [];
  const small = (spec.small || []).filter((e) => e[1] > 0 && !less.includes(e[0]) && !kindOf(e[0]).fixed);
  for (let i = 0; i < n && small.length; i++) {
    const k = pickW(r, small);
    if (surf.length && r() < 0.7) {
      const f = surf[Math.floor(r() * surf.length)],
        [w, d] = sizeOf(f.k),
        a = (r() - 0.5) * w * 0.75,
        b = (r() - 0.5) * d * 0.6,
        c = Math.cos(f.ry),
        sn = Math.sin(f.ry);
      // on a shelf, a bookcase or a cupboard: one of its boards
      const top = kindOf(f.k).top,
        h = top > 1.2 ? [0.45, 0.9, top - 0.05][Math.floor(r() * 3)] : top;
      put(k, idx(f.x, f.y), f.px + (a * c + b * sn) / ts, f.pz + (-a * sn + b * c) / ts, h, r() * 6.28);
    } else {
      const tile = room.tiles[Math.floor(r() * room.tiles.length)];
      put(k, tile, (r() - 0.5) * 0.7, (r() - 0.5) * 0.7, 0, r() * 6.28);
    }
  }
  return out;
}
// A room spec with more added (a trade's, a climate's, a year's), merged list by list.
function mergeSpec(base, ...adds) {
  const out = {
    wall: (base.wall || []).slice(),
    middle: (base.middle || []).slice(),
    small: (base.small || []).slice(),
    n: base.n,
  };
  if (base.far) out.far = base.far.slice(); // rooms by use (C8.5): against the far wall, and in rows
  if (base.rows) out.rows = base.rows.slice();
  out.less = [];
  for (const a of adds) {
    if (!a) continue;
    if (a.wall) out.wall.push(...a.wall);
    if (a.small) out.small.push(...a.small);
    if (a.less) out.less.push(...a.less);
    if (a.noHearth) out.wall = out.wall.filter((e) => e[0] !== 'hearth');
  }
  return out;
}

/* ---------- the places that are not houses: levels, ruins and caves ---------- */
const STAY = /stair|exit|door|gate|well|entry|vault|relic|portal|hatch|boat|dock|lift/i;
function levelThings(s, rec, map, r) {
  const key =
    rec.kind === 'deep' ? 'deep:' + rec.theme : rec.kind === 'sky' || rec.kind === 'sea' ? rec.kind + ':' + rec.place : rec.kind;
  const spec = X().places[key] || X().places.deep,
    T = map.terrain,
    floor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && T[idx(x, y)] === FLOOR,
    tiles = [];
  for (let k = 0; k < W * H; k++) {
    if (T[k] !== FLOOR) continue;
    const st = map.sites[k];
    if (st && STAY.test(st.kind)) continue;
    tiles.push(k);
  }
  const room = {
    tiles,
    wallSide: (k) => {
      const x = k % W,
        y = Math.floor(k / W);
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ])
        if (!floor(x + dx, y + dy) && T[idx(x + dx, y + dy)] !== VOID) return [dx, dy];
      return null;
    },
  };
  // fewer pieces of furniture than a house has: a level is big and bare; each kind a few times over
  const wall = [];
  for (const e of spec.wall || []) for (let i = 0; i < 4; i++) wall.push(e);
  return furnish(
    s,
    { wall, small: spec.small, n: spec.n },
    room,
    { r, ts: 4, grade: spec.owned ? 1 : 0, old: !!spec.old, ware: !!spec.old, own: !!spec.owned, place: key },
    [],
  );
}
MAKERS.deep = MAKERS.vault = MAKERS.sky = MAKERS.sea = levelThings;
// Round each ruin and cave of a region: a few old things, a stone's throw from it.
MAKERS.region = (s, rec, map, r) => {
  const out = [];
  for (const k in map.sites) {
    const st = map.sites[k],
      spec = X().places[st.kind];
    if (!spec || (st.kind !== 'ruin' && st.kind !== 'cave')) continue;
    const [a, b] = spec.count,
      n = a + Math.floor(r() * (b - a + 1)),
      room = { tiles: [+k], wallSide: () => null };
    const list = furnish(
      s,
      { small: spec.small },
      room,
      { r, ts: 28, grade: 0, old: true, ware: st.kind === 'ruin', count: n, place: st.kind },
      [],
    );
    // spread about the site rather than on top of it
    for (const t of list) {
      const ang = r() * 6.28,
        d = 0.16 + r() * 0.22;
      t.px = Math.round(Math.cos(ang) * d * 100) / 100;
      t.pz = Math.round(Math.sin(ang) * d * 100) / 100;
    }
    out.push(...list);
  }
  return out;
};

/* ---------- a place's things, and what is left of them ---------- */
const CACHE = new Map();
function thingsIn(s, areaId) {
  if (s.off.things) return [];
  const rec = s.areas[areaId];
  if (!rec || !MAKERS[rec.kind]) return [];
  const key = areaId + '|' + s.seed + '|' + (s.realm || ''),
    hit = CACHE.get(key);
  if (hit) return hit;
  const map = mapOf(s, areaId);
  if (!map || !map.terrain) return [];
  const list = MAKERS[rec.kind](s, rec, map, stream(s.seed, 'things:' + areaId)) || [];
  if (CACHE.size > 64) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, list);
  return list;
}
const takenIn = (s, areaId) => (s.taken && s.taken[areaId]) || [];
// The things of an area still where they were: what the view draws.
function thingsLeft(s, areaId) {
  const gone = new Set(takenIn(s, areaId));
  return thingsIn(s, areaId).filter((t) => !gone.has(t.id));
}
// How far the traveller can reach, in tiles: the next tile in a house, their own anywhere bigger.
const reachOf = (s) => (areaRec(s).kind === 'house' ? 1 : 0);
function thingsInReach(s) {
  const px = s.player.x,
    py = s.player.y,
    reach = reachOf(s);
  return thingsLeft(s, s.area)
    .filter((t) => !kindOf(t.k).fixed && Math.max(Math.abs(t.x - px), Math.abs(t.y - py)) <= reach)
    .sort((a, b) => Math.abs(a.x - px) + Math.abs(a.y - py) - (Math.abs(b.x - px) + Math.abs(b.y - py)));
}

/* ---------- names and worth ---------- */
const peopleName = (s) => (s && s.civ && s.civ.name) || 'lost';
// what a thing is called, before anyone who knows has looked at it
function plainName(k, info, people) {
  const kd = kindOf(k),
    parts = [];
  if (info.old) parts.push(kd.old || X().oldWord);
  if (kd.grades && info.g !== undefined) parts.push(kd.grades[info.g]);
  if (info.ware && people) parts.push(people);
  // a grade replaces a first word that says the same ('straw bed', not 'straw wooden bed')
  parts.push(kd.name);
  if (info.of) parts.push('of ' + info.of); // a holy symbol of the temple's god (C8.5)
  return parts.join(' ');
}
function thingValue(k, info) {
  const kd = kindOf(k);
  let v = kd.value || 0;
  if (kd.grades && kd.gval && info.g !== undefined) v *= kd.gval[info.g];
  if (info.ware) v += 2;
  if (info.old) v = Math.floor(v / 2);
  return v;
}
// An item that was a thing: named and valued as the thing (the secret piece adds what it really is, once known).
ITEM_NAMES.push((it) => {
  if (!it.thing) return null;
  const name = plainName(it.thing.k, it.thing, it.thing.people);
  return name.charAt(0).toUpperCase() + name.slice(1);
});
ITEM_VALUES.push((it) => (it.thing ? thingValue(it.thing.k, it.thing) : undefined));

/* ---------- taking ---------- */
function takeThing(s, id) {
  if (s.over || s.combat || s.off.things) return false;
  const t = thingsInReach(s).find((x) => x.id === id);
  if (!t) return false;
  const kd = kindOf(t.k),
    rec = areaRec(s),
    people = peopleName(s),
    name = plainName(t.k, t, people);
  for (const f of TAKE_CHECKS) if (f(s, t, rec, name)) return true; // stopped: it says why
  if (weight(s) + kd.wt > carryCap(s) + 1e-9 && !s.godMode) {
    say(s, 'The ' + name + ' is more than you can carry with all you have.', 'bad');
    return false;
  }
  const it = makeItem(s, 'th_' + t.k, null, null, true);
  it.thing = { k: t.k };
  for (const f of ['g', 'old', 'ware', 'sec', 'of']) if (t[f] !== undefined) it.thing[f] = t[f];
  if (t.ware || t.sec) it.thing.people = people;
  if (t.sec) it.known = false; // it looks like nothing much: a merchant may see more (the secret piece)
  s.player.items.push(it);
  s.taken = s.taken || {};
  (s.taken[s.area] = s.taken[s.area] || []).push(t.id);
  say(s, 'You take the ' + name + '.');
  return true;
}
ACTIONS.push((s, st, a) => {
  if (s.combat || s.off.things) return;
  const near = thingsInReach(s);
  for (const t of near.slice(0, 3)) {
    const kd = kindOf(t.k);
    a.push({ id: 'takeThing', arg: t.id, label: 'Take the ' + plainName(t.k, t, peopleName(s)), hint: kd.wt + ' wt' });
  }
});
SWITCHES.push(['things', 'Things in rooms, ruins and levels']);
NOTES.push((s) => {
  if (s.off.things) return [];
  const n = Object.values(s.taken || {}).reduce((a, l) => a + l.length, 0);
  return n ? [{ label: 'Things', text: 'You have picked up ' + n + ' thing' + (n === 1 ? '' : 's') + ' on your travels.' }] : [];
});

export {
  thingsIn,
  thingsLeft,
  thingsInReach,
  takeThing,
  furnish,
  mergeSpec,
  kindOf as thingKind,
  plainName,
  thingValue,
  MAKERS as THING_MAKERS,
  TAKE_CHECKS,
  FINISH as THING_FINISH,
};
