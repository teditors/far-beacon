/* Generators for the places you walk into: the town and the levels of the locked place.
   Each is built the first time you enter, from its own named random stream, and kept after that. */
import { W, H, WALL, FLOOR, idx, stream } from './core.js';
import { GENERATORS } from './areas.js';
import { makeCreature } from './combat.js';
import { genItem, makeItem } from './items.js';

const blank = (fill) => new Array(W * H).fill(fill);
const inside = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;

/* ---------- the town ---------- */
// An open square (now and then walled, with gates), a plaza and well in the middle, and the elder's hall, the inn and the
// shop facing the plaza. Houses fill the rest. The town is small and lit, so all of it is visible from the start.
GENERATORS.town = (s, rec) => {
  const r = stream(s.seed, 'area:town'),
    rw = stream(s.seed, 'town:walls'),
    terrain = blank(FLOOR),
    sites = {},
    c = 18,
    walled = rw() < 0.25; // most towns are open; a walled one has a gate where each main street meets the wall
  if (walled)
    for (let i = 0; i < W; i++)
      for (const [x, y] of [
        [i, 0],
        [i, H - 1],
        [0, i],
        [W - 1, i],
      ])
        terrain[idx(x, y)] = WALL;
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inside(x, y)) terrain[idx(x, y)] = WALL;
  };
  const plaza = (x, y) => Math.abs(x - c) <= 6 && Math.abs(y - c) <= 6;
  const street = (x, y) => Math.abs(x - c) <= 1 || Math.abs(y - c) <= 1;
  // the three buildings that matter, each with its door on the plaza
  block(c - 3, c - 12, 7, 5); // elder's hall, north
  block(c + 8, c - 3, 5, 7); // inn, east
  block(c - 12, c - 3, 5, 7); // shop, west
  sites[idx(c, c - 7)] = { kind: 'elder', seen: true };
  sites[idx(c + 7, c)] = { kind: 'inn', seen: true };
  sites[idx(c - 7, c)] = { kind: 'shop', seen: true };
  sites[idx(c, c)] = { kind: 'well', seen: true };
  // houses: small blocks anywhere that is not plaza, street or next to the outer wall
  for (let tries = 0, n = 0; tries < 400 && n < 16; tries++) {
    const w = 3 + Math.floor(r() * 3),
      h = 3 + Math.floor(r() * 3),
      x0 = 2 + Math.floor(r() * (W - 4 - w)),
      y0 = 2 + Math.floor(r() * (H - 4 - h));
    let ok = true;
    for (let y = y0 - 1; y <= y0 + h && ok; y++)
      for (let x = x0 - 1; x <= x0 + w && ok; x++)
        if (plaza(x, y) || street(x, y) || terrain[idx(x, y)] === WALL || sites[idx(x, y)]) ok = false;
    if (!ok) continue;
    block(x0, y0, w, h);
    n++;
  }
  // gates: always the south one (the way the road comes in), and one to three more
  if (walled) {
    const sides = [
        [c, H - 1],
        [c, 0],
        [0, c],
        [W - 1, c],
      ],
      n = 2 + Math.floor(rw() * 3);
    for (let k = 0; k < n; k++) {
      const [x, y] = sides[k];
      terrain[idx(x, y)] = FLOOR;
      sites[idx(x, y)] = { kind: 'gate', seen: true };
    }
  }
  rec.walled = walled;
  s.town.walled = walled;
  rec.entry = { x: c, y: H - 2 };
  return { terrain, sites, seen: blank(1) };
};

/* ---------- the locked place ---------- */
// Rooms joined by corridors. Level 1 opens onto the outside; each level has stairs down in the room farthest from where
// you came in, and the last level holds the relic there instead, with its guardian.
GENERATORS.vault = (s, rec) => {
  const lvl = rec.level,
    last = lvl === rec.levels,
    kind = rec.floor,
    r = stream(s.seed, 'area:vault' + lvl),
    terrain = blank(WALL),
    sites = {},
    depots = {},
    creatures = [];
  const rooms = [];
  for (let tries = 0; tries < 300 && rooms.length < 9; tries++) {
    const w = 4 + Math.floor(r() * 5),
      h = 4 + Math.floor(r() * 5),
      x = 2 + Math.floor(r() * (W - w - 4)),
      y = 2 + Math.floor(r() * (H - h - 4));
    if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) terrain[idx(x, y)] = FLOOR;
  const corridor = [];
  const dig = (x, y) => {
    if (terrain[idx(x, y)] === WALL) corridor.push(idx(x, y));
    terrain[idx(x, y)] = FLOOR;
  };
  rooms.sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    let x = a.cx,
      y = a.cy;
    const horizFirst = r() < 0.5;
    if (horizFirst) {
      while (x !== b.cx) dig((x += Math.sign(b.cx - x)), y);
      while (y !== b.cy) dig(x, (y += Math.sign(b.cy - y)));
    } else {
      while (y !== b.cy) dig(x, (y += Math.sign(b.cy - y)));
      while (x !== b.cx) dig((x += Math.sign(b.cx - x)), y);
    }
  }
  // the way in is in the first room; the farthest room by walking distance holds the way on
  const start = rooms[0],
    entry = { x: start.cx, y: start.cy };
  const dist = blank(-1),
    q = [idx(entry.x, entry.y)];
  dist[q[0]] = 0;
  while (q.length) {
    const i = q.shift(),
      x = i % W,
      y = Math.floor(i / W);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const j = idx(x + dx, y + dy);
      if (terrain[j] === FLOOR && dist[j] < 0) {
        dist[j] = dist[i] + 1;
        q.push(j);
      }
    }
  }
  const far = rooms.slice(1).sort((a, b) => dist[idx(b.cx, b.cy)] - dist[idx(a.cx, a.cy)])[0] || start;
  sites[idx(entry.x, entry.y - 1 >= start.y ? entry.y - 1 : entry.y)] = { kind: lvl === 1 ? 'exit' : 'stairsUp' };
  rec.entry = { x: entry.x, y: entry.y };
  const tier = Math.min(3, lvl),
    others = rooms.filter((o) => o !== start && o !== far),
    pickRoom = () => others[Math.floor(r() * others.length)] || far,
    spot = (o) => {
      for (let t = 0; t < 30; t++) {
        const x = o.x + Math.floor(r() * o.w),
          y = o.y + Math.floor(r() * o.h),
          i = idx(x, y);
        if (!sites[i] && !depots[i] && !creatures.some((c) => c.x === x && c.y === y)) return { x, y };
      }
      return { x: o.cx, y: o.cy };
    };
  let cid = 200 + lvl * 10;
  const guard = (o, t) => {
    const p = spot(o),
      c = makeCreature(s, cid++, s.quest.guardSp, p.x, p.y, t);
    creatures.push(c);
    return c;
  };
  if (last) {
    const relic = makeItem(s, 'relic', null, null, true);
    relic.label = s.quest.relic;
    depots[idx(far.cx, far.cy)] = { water: 0, fuel: 0, items: [relic] };
    guard(far, 2).warden = true;
  } else sites[idx(far.cx, far.cy)] = { kind: 'stairsDown' };
  guard(pickRoom(), Math.max(1, tier - 1));
  if (kind === 'guard') guard(pickRoom(), tier);
  if (kind === 'loot') {
    const o = pickRoom(),
      p = spot(o),
      it = genItem(s, { relic: true, noConsumables: true });
    depots[idx(p.x, p.y)] = { water: 0, fuel: 0, items: [it], coin: 6 + Math.floor(r() * 12), store: true };
  }
  if (kind === 'trap')
    for (let n = 0; n < 4 && corridor.length; n++) {
      const i = corridor.splice(Math.floor(r() * corridor.length), 1)[0];
      if (!sites[i]) sites[i] = { kind: 'trap', sprung: false };
    }
  return { terrain, sites, depots, creatures };
};

export { GENERATORS };
