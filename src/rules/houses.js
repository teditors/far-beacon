/* Interiors (commission 7): the buildings of a town are places you walk into. Each block of wall in a town's grid is a
   building (as the view has always drawn them); the one beside the elder's, the inn's, the shop's or a service's door
   is theirs, the rest are houses. A building has a door on the side that faces a street. Walk into the door and you are
   inside, in the building's own small map (an area of kind 'house'); walk back out of the door and you are in the
   street again. Nothing jumps: the view draws the room where the building stands, the town round it.

   A house's map is three tiles to a town tile (about 1.3 m), over a window of the town twelve tiles wide round the
   building. Its outer ring of tiles is the room's edge, where the furniture stands against the walls (the walls are
   drawn at the ring's outer side), and inner walls part it into rooms by size and kind. Nothing of it is stored: the
   layout and its things are made from the seed when wanted (layoutOf), and a house is forgotten when you leave it,
   unless you put something down there. What a room holds follows from the building, its trade, the town's culture,
   size and climate, the year, and its wealth; now and then a house stands empty, its things old and free to take.
   Switch: s.off.interiors (buildings are solid again). */
import { C, W, H, WALL, FLOOR, byId, idx, say, stream } from './core.js';
import { GENERATORS, enterArea, leaveArea, mapOf, townById, areaRec } from './areas.js';
import { MOVES, NOTES, SWITCHES, PLACES } from './hooks.js';
import { THING_MAKERS, furnish, mergeSpec, thingKind } from './things.js';
import { abandonSpec, doorOf, furnishByUse, planFor, roomsOn, survivor } from './rooms.js';
import { godOf } from './core.js';

const HS = 3; // house tiles to a town tile
const X = () => C.things;
const SERVICE_KINDS = ['elder', 'inn', 'shop', 'healer', 'temple', 'trainer', 'smith', 'mapmaker', 'stable'];
const CLIMATE = (biome) =>
  (biome && biome.parts && biome.parts.climate) || (biome && C.townLooks.biomeClimate[biome.id]) || 'temperate';
const townOf = (s, townId) => townById(s, townId) || s.town;
const cultureOf = (s, t) => (t === s.town ? s.townCulture : t && t.culture) || {};
// Tents (a steppe town) are round and light: no rooms to walk into.
const tents = (s, townId) => {
  const t = townOf(s, townId),
    rec = t && s.areas[t.area || 'overworld'],
    biome = rec ? byId(C.biomes, rec.biome) : null,
    cl = C.townLooks.climates[CLIMATE(biome)];
  return !!(cl && cl.roof === 'dome');
};

/* ---------- the buildings of a town ---------- */
const BUILT = new WeakMap(); // the town's ground grid -> its buildings
function buildingsOf(s, townId) {
  const rec = s.areas[townId];
  if (!rec || rec.kind !== 'town') return [];
  const map = mapOf(s, townId);
  if (!map || !map.terrain) return [];
  const T = map.terrain;
  if (BUILT.has(T)) return BUILT.get(T);
  const walled = !!rec.walled,
    ring = (x, y) => walled && (x === 0 || y === 0 || x === W - 1 || y === H - 1),
    seen = new Uint8Array(W * H),
    out = [],
    c = 18;
  for (let i = 0; i < W * H; i++) {
    const x0 = i % W,
      y0 = Math.floor(i / W);
    if (seen[i] || T[i] !== WALL || ring(x0, y0)) continue;
    const b = { x0, y0, x1: x0, y1: y0 },
      stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop(),
        x = k % W,
        y = Math.floor(k / W);
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || T[n] !== WALL || ring(nx, ny)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    // whose is it: a service's door beside it
    let kind = null,
      site = null;
    for (let y = b.y0 - 1; y <= b.y1 + 1 && !kind; y++)
      for (let x = b.x0 - 1; x <= b.x1 + 1 && !kind; x++) {
        if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) continue;
        const st = map.sites[idx(x, y)];
        if (st && SERVICE_KINDS.includes(st.kind)) (kind = st.kind), (site = { x, y });
      }
    // its door: toward the service's place, or else on the side that faces a main street (and the square)
    const sides = [
      ['s', Math.floor((b.x0 + b.x1) / 2), b.y1, 0, 1],
      ['n', Math.floor((b.x0 + b.x1) / 2), b.y0, 0, -1],
      ['e', b.x1, Math.floor((b.y0 + b.y1) / 2), 1, 0],
      ['w', b.x0, Math.floor((b.y0 + b.y1) / 2), -1, 0],
    ];
    let door = null;
    if (site) {
      const dx = Math.min(b.x1, Math.max(b.x0, site.x)),
        dy = Math.min(b.y1, Math.max(b.y0, site.y)),
        side = site.y > b.y1 ? 's' : site.y < b.y0 ? 'n' : site.x > b.x1 ? 'e' : 'w',
        sd = sides.find((e) => e[0] === side);
      door = { side, x: dx, y: dy, ox: dx + sd[3], oy: dy + sd[4] };
    } else {
      let best = Infinity;
      for (const [side, x, y, dx, dy] of sides) {
        const ox = x + dx,
          oy = y + dy;
        if (ox < 1 || oy < 1 || ox > W - 2 || oy > H - 2 || T[idx(ox, oy)] === WALL || map.sites[idx(ox, oy)]) continue;
        const score = Math.min(Math.abs(ox - c), Math.abs(oy - c)) + Math.hypot(ox - c, oy - c) / 100;
        if (score < best) (best = score), (door = { side, x, y, ox, oy });
      }
    }
    if (!door) continue; // shut in on every side: no way in
    b.kind = kind || 'house';
    b.door = door;
    b.id = 'h:' + townId + ':' + b.x0 + '_' + b.y0;
    out.push(b);
  }
  BUILT.set(T, out);
  return out;
}
const interiorsOn = (s, townId) => !s.off.interiors && !tents(s, townId);
// The building whose door is town tile (x, y), in the town the traveller is in.
function buildingAtDoor(s, x, y) {
  const rec = areaRec(s);
  if (rec.kind !== 'town' || !interiorsOn(s, rec.id)) return null;
  return buildingsOf(s, rec.id).find((b) => b.door.x === x && b.door.y === y) || null;
}

/* ---------- a building's inside ---------- */
const LAYOUTS = new Map();
const wealthBase = { hamlet: 0, village: 0.5, town: 0.9, city: 1.3 };
const kindBonus = { elder: 0.8, inn: 0.3, shop: 0.4, temple: 0.5, mapmaker: 0.4, healer: 0.2, trainer: 0.2 };
/* The layout of a house: { terrain, cells (the room each tile belongs to, -1 outside), rooms, open (edges with no
   wall: [tile, dx, dy]), entry, exit (the tile outside the door), things, grade, empty, ox, oy (the town tile at the
   house map's corner), side }. Made from the seed, the same every time. */
function layoutOf(s, rec) {
  const key = rec.id + '|' + s.seed + '|' + (s.realm || '') + '|' + (s.off.things ? 0 : 1);
  if (LAYOUTS.has(key)) return LAYOUTS.get(key);
  const b = buildingsOf(s, rec.town).find((x) => x.id === rec.id) || rec.b,
    r = stream(s.seed, 'house:' + rec.id),
    t = townOf(s, rec.town),
    cul = cultureOf(s, t),
    ox = b.x0 - 2,
    oy = b.y0 - 2,
    fx0 = (b.x0 - ox) * HS,
    fy0 = (b.y0 - oy) * HS,
    fx1 = (b.x1 + 1 - ox) * HS - 1,
    fy1 = (b.y1 + 1 - oy) * HS - 1,
    terrain = new Array(W * H).fill(WALL),
    cells = new Array(W * H).fill(-1);
  // the room's ring and inside
  for (let y = fy0; y <= fy1; y++)
    for (let x = fx0; x <= fx1; x++) {
      cells[idx(x, y)] = 0;
      if (x > fx0 && x < fx1 && y > fy0 && y < fy1) terrain[idx(x, y)] = FLOOR;
    }
  // the door: the middle third of the town's door tile, on the ring, and the tile outside it
  const d = b.door,
    mx = (d.x - ox) * HS + 1,
    my = (d.y - oy) * HS + 1,
    door =
      d.side === 's'
        ? { x: mx, y: fy1 }
        : d.side === 'n'
          ? { x: mx, y: fy0 }
          : d.side === 'e'
            ? { x: fx1, y: my }
            : { x: fx0, y: my },
    dv = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[d.side],
    exit = idx(door.x + dv[0], door.y + dv[1]);
  terrain[idx(door.x, door.y)] = FLOOR;
  const open = [[idx(door.x, door.y), dv[0], dv[1]]];
  // wealth, emptiness, the town's ways
  const kind = b.kind || 'house',
    rec2 = s.areas[t.area || 'overworld'],
    biome = rec2 ? byId(C.biomes, rec2.biome) : null,
    climate = CLIMATE(biome),
    empty = kind === 'house' && r() < 0.07 + (s.year === 'lean' ? 0.06 : 0),
    wealth = (wealthBase[t.size] !== undefined ? wealthBase[t.size] : 0.7) + (kindBonus[kind] || 0) + (r() - 0.5) * 0.9,
    grade = Math.max(0, Math.min(2, Math.round(wealth))),
    lost = cul.rare === 'unfallen',
    byUse = roomsOn(s);
  // the rooms: the building's kind lists them, the first by the door; a house has as many as its size allows (with
  // rooms by use, C8.5: a dwelling's rooms follow its wealth)
  const list = byUse ? planFor(kind, grade) : X().buildings[kind] || X().buildings.house,
    // part it into rooms of five to eight tiles a side, both ways for a big building, as many as its kind has rooms
    spanX = fx1 - fx0 - 1, // walkable tiles across
    spanY = fy1 - fy0 - 1,
    want = Math.max(1, list.length),
    // rooms by use (C8.5) part a building into rooms of four tiles and more a side (about 5 m), not five
    part = byUse ? 4 : 5,
    nX0 = Math.max(1, Math.floor((spanX + 1) / part)),
    nY0 = Math.max(1, Math.floor((spanY + 1) / part)),
    // no more rooms than the kind has, splitting the longer way first
    nX = spanX >= spanY ? Math.min(nX0, want) : Math.min(nX0, Math.max(1, Math.floor(want / Math.min(nY0, want)))),
    nY = Math.max(1, Math.min(nY0, Math.floor(want / nX))),
    nRooms = nX * nY,
    cutsX = [],
    cutsY = [];
  // an inner wall never meets the outer wall at the door
  const clearOf = (c, at) => (c === at ? c + 1 : c);
  for (let i = 1; i < nX; i++)
    cutsX.push(clearOf(fx0 + Math.round((i * (spanX + 1)) / nX), d.side === 'n' || d.side === 's' ? door.x : -1));
  for (let i = 1; i < nY; i++)
    cutsY.push(clearOf(fy0 + Math.round((i * (spanY + 1)) / nY), d.side === 'e' || d.side === 'w' ? door.y : -1));
  const partX = (x) => cutsX.filter((c) => x > c).length,
    partY = (y) => cutsY.filter((c) => y > c).length;
  for (let y = fy0; y <= fy1; y++)
    for (let x = fx0; x <= fx1; x++) {
      const k = idx(x, y);
      cells[k] = partX(x) + nX * partY(y);
      if (cutsX.includes(x) || cutsY.includes(y)) terrain[k] = WALL; // an inner wall
    }
  // a doorway in each stretch of inner wall between two rooms, away from its ends
  const doorway = (k, dx, dy) => {
    terrain[k] = FLOOR;
    open.push([k, dx, dy]);
  };
  const stretches = (cuts, lo, hi) => {
    const ends = [lo].concat(cuts, [hi]),
      out = [];
    for (let i = 0; i + 1 < ends.length; i++) out.push([ends[i] + 1, ends[i + 1] - 1]);
    return out;
  };
  for (const c of cutsX)
    for (const [a0, a1] of stretches(cutsY, fy0, fy1)) {
      const lo = a0 + 1,
        hi = Math.max(lo, a1 - 1);
      doorway(idx(c, lo + Math.floor(r() * (hi - lo + 1))), 1, 0);
    }
  for (const c of cutsY)
    for (const [a0, a1] of stretches(cutsX, fx0, fx1)) {
      const lo = a0 + 1,
        hi = Math.max(lo, a1 - 1);
      doorway(idx(lo + Math.floor(r() * (hi - lo + 1)), c), 0, 1);
    }
  // the part by the door is the first room: number the rest by how far they are from it
  const doorPart = cells[idx(door.x - dv[0], door.y - dv[1])],
    dist = (p) => Math.abs((p % nX) - (doorPart % nX)) + Math.abs(Math.floor(p / nX) - Math.floor(doorPart / nX)),
    order = Array.from({ length: nRooms }, (_, i) => i).sort((a, b2) => dist(a) - dist(b2) || a - b2),
    rank = [];
  order.forEach((p, i) => (rank[p] = i));
  for (let k = 0; k < W * H; k++) if (cells[k] >= 0) cells[k] = rank[cells[k]];
  let fishing = false;
  {
    const m = rec2 && mapOf(s, rec2.id);
    if (m && m.terrain) fishing = m.terrain.filter((v) => v === 4 || v === 9).length >= 30;
  }
  // furnish each room
  const things = [],
    doorways = new Set(open.map((o) => o[0])),
    nearDoor = (k) => {
      for (const dk of doorways)
        if (Math.max(Math.abs((dk % W) - (k % W)), Math.abs(Math.floor(dk / W) - Math.floor(k / W))) <= 1) return true;
      return false;
    },
    rooms = [];
  for (let ri = 0; ri < nRooms; ri++) {
    const purpose = ri === 0 && kind === 'house' && nRooms === 1 ? 'living' : list[ri % list.length],
      base = X().rooms[purpose] || X().rooms.living,
      tiles = [];
    for (let k = 0; k < W * H; k++)
      if (cells[k] === ri && !doorways.has(k) && !(terrain[k] === WALL && nearDoor(k))) tiles.push(k);
    const tr = X().trades[cul.trade],
      adds = [
        X().climates[climate],
        X().years[s.year],
        // a town's trade: its tools in a house's workroom, a little of it in the house's other rooms
        kind !== 'house' || !tr ? null : purpose === 'workroom' ? tr : { small: tr.small.map(([k, w]) => [k, w * 0.25]) },
        fishing && kind === 'house' ? X().trades.fishing : null,
        nRooms === 1 && kind === 'house' ? { wall: [['bed', 1]] } : null,
        grade >= 2
          ? {
              wall: [
                ['tapestry', 0.5],
                ['rug', 0.6],
              ],
              small: [
                ['painting', 1],
                ['mirror', 0.6],
                ['statuette', 0.6],
                ['vase', 1],
                ['book', 1],
              ],
            }
          : null,
        grade === 0 ? { less: ['painting', 'mirror', 'book', 'statuette', 'vase', 'tapestry'] } : null,
        empty ? { less: ['bread', 'cheese', 'apple', 'fish', 'jug'] } : null,
      ],
      spec = mergeSpec(base, ...adds);
    if (grade === 0) spec.wall = spec.wall.map(([k, ch]) => [k === 'bed' ? 'cot' : k, ch]);
    if (spec.less.includes('tapestry')) spec.wall = spec.wall.filter(([k]) => k !== 'tapestry');
    const room = {
      tiles,
      wallSide: (k) => {
        if (terrain[k] !== WALL) return null;
        const x = k % W,
          y = Math.floor(k / W);
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ])
          if (cells[idx(x + dx, y + dy)] !== ri) return [dx, dy];
        return null;
      },
    };
    const floor = tiles.filter((k) => terrain[k] === FLOOR).length;
    const o = {
      r,
      ts: 1.3,
      inset: 0.45,
      grade,
      old: empty,
      ware: lost,
      own: !empty,
      place: purpose,
      floor,
      perRound: byUse ? 6 : 9,
      perMiddle: byUse ? 14 : 22,
    };
    if (byUse) {
      room.door = doorOf(ri, ri === 0 ? open.slice(0, 1) : open.slice(1), cells, terrain);
      if (room.door === null) room.door = doorOf(ri, open, cells, terrain);
      o.abandoned = empty;
      if (kind === 'temple') {
        const g = godOf(s);
        o.god = {
          name: g.name.split(',')[0],
          dom: (s.godRoll && s.godRoll.domain) || { thirst: 'water', climber: 'heights' }[g.id] || g.id,
        };
      }
      // a fire only where people sit, cook or sleep: no stove in the store or the workroom
      if (!['living', 'kitchen', 'taproom', 'hall', 'sickroom', 'sleeping', 'study', 'dining', 'smithy'].includes(purpose))
        spec.wall = spec.wall.filter(([k2]) => !['stove', 'hearth', 'woodstack'].includes(k2));
      furnishByUse(s, empty ? abandonSpec(spec) : spec, room, o, things);
    } else furnish(s, spec, room, o, things);
    rooms.push({ purpose, tiles });
  }
  // what stands in the middle of a room is in the way (a rug, a seat or a bench is not), so long as every part of the
  // house can still be reached from the door
  const walkAll = () => {
    const seen2 = new Set([idx(door.x, door.y)]),
      q = [idx(door.x, door.y)];
    while (q.length) {
      const k = q.pop();
      for (const n of [k - 1, k + 1, k - W, k + W])
        if (n >= 0 && n < W * H && terrain[n] === FLOOR && !seen2.has(n)) seen2.add(n), q.push(n);
    }
    for (let k = 0; k < W * H; k++) if (terrain[k] === FLOOR && !seen2.has(k)) return false;
    return true;
  };
  if (byUse && empty) survivor(things, r);
  for (const th of things) {
    const kd = thingKind(th.k);
    if (!kd.fixed || ['rug', 'chair', 'stool', 'bench', 'pew', 'cobweb', 'icon'].includes(th.k)) continue;
    for (const k of th.tiles || [idx(th.x, th.y)]) {
      if (terrain[k] !== FLOOR || doorways.has(k)) continue;
      terrain[k] = WALL;
      if (!walkAll()) terrain[k] = FLOOR;
    }
  }
  for (const th of things) delete th.tiles, delete th.wall;
  const L = { terrain, cells, rooms, open, entry: door, exit, things, grade, empty, kind, ox, oy, side: d.side, climate };
  if (LAYOUTS.size > 32) LAYOUTS.delete(LAYOUTS.keys().next().value);
  LAYOUTS.set(key, L);
  return L;
}
GENERATORS.house = (s, rec) => {
  const L = layoutOf(s, rec);
  rec.entry = L.entry;
  return { terrain: L.terrain.slice(), sites: {}, seen: new Array(W * H).fill(1) };
};
THING_MAKERS.house = (s, rec) => layoutOf(s, rec).things;

/* ---------- in and out ---------- */
const NAMES = {
  house: 'a house',
  elder: "the elder's hall",
  inn: 'the inn',
  shop: 'the shop',
  healer: "the healer's house",
  temple: 'the temple',
  trainer: "the old campaigner's house",
  smith: 'the smithy',
  mapmaker: "the mapmaker's house",
  stable: 'the stable',
};
function enterHouse(s, b) {
  const townId = s.area,
    id = b.id,
    first = !s.areas[id];
  enterArea(
    s,
    id,
    {
      kind: 'house',
      indoor: true,
      town: townId,
      b: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, kind: b.kind, door: b.door },
      name: NAMES[b.kind] || 'a house',
    },
    null,
  );
  const L = layoutOf(s, s.areas[id]);
  s.player.x = L.entry.x;
  s.player.y = L.entry.y;
  s.lastGround = FLOOR;
  if (first)
    say(
      s,
      L.empty
        ? 'You step into ' + NAMES[b.kind] + '. Nobody has lived here for a long while; dust lies on everything.'
        : 'You step into ' + NAMES[b.kind] + '.',
    );
  return true;
}
function leaveHouse(s) {
  const id = s.area;
  leaveArea(s);
  // nothing of a house is kept unless something was put down there
  const rec = s.areas[id];
  if (rec && (!rec.map || !rec.map.depots || !Object.keys(rec.map.depots).length)) delete s.areas[id];
  return true;
}
// Forget every house the traveller is not in, unless something was put down in it (they may have left by any road:
// a jump, a new traveller setting out).
function forgetHouses(s) {
  for (const id in s.areas) {
    const a = s.areas[id];
    if (a.kind !== 'house' || id === s.area) continue;
    if (!a.map || !a.map.depots || !Object.keys(a.map.depots).length) delete s.areas[id];
  }
}
MOVES.push((s, nx, ny) => {
  forgetHouses(s);
  const rec = areaRec(s);
  if (rec.kind === 'house') {
    if (idx(nx, ny) === layoutOf(s, rec).exit) return leaveHouse(s);
    return undefined;
  }
  if (rec.kind !== 'town' || nx < 0 || ny < 0 || nx >= W || ny >= H) return undefined;
  const b = buildingAtDoor(s, nx, ny);
  return b ? enterHouse(s, b) : undefined;
});
// Is (x, y) a way in or out that the view should let the traveller walk into (a door is a wall to everything else)?
function doorAt(s, x, y) {
  const rec = areaRec(s);
  if (rec.kind === 'house') return idx(x, y) === layoutOf(s, rec).exit;
  return !!buildingAtDoor(s, x, y);
}
// What the view needs to draw a house: its layout and where its map lies over the town's.
function houseOf(s, id) {
  const rec = s.areas[id] || null;
  return rec && rec.kind === 'house' ? layoutOf(s, rec) : null;
}
// The layout of a building of the town not entered yet (for the view to draw through its open door).
function houseLayout(s, townId, b) {
  return layoutOf(s, { id: b.id, town: townId, b });
}

SWITCHES.push(['interiors', 'Buildings you can walk into']);
NOTES.push((s) =>
  s.off.interiors
    ? []
    : [
        {
          label: 'Houses',
          text: 'The doors of the towns are open: walk into any building, and mind what you pick up in someone else’s house.',
        },
      ],
);
// god mode: the inside of the story town's hall and of a house
PLACES.push((s, out) => {
  if (s.off.interiors || !s.areas.town) return;
  const bs = buildingsOf(s, 'town');
  for (const kind of ['elder', 'inn', 'house']) {
    const b = bs.find((x) => x.kind === kind);
    if (!b) continue;
    out.push({
      id: 'house:' + b.id,
      group: 'Houses',
      label: 'Inside ' + (NAMES[kind] || kind) + ' of ' + s.town.name,
      go(s2) {
        // stand at the door, in the town, and step in
        const P = out.find((p) => p.group === 'Towns' && p.id === 'town:town');
        if (P) P.go(s2);
        s2.player.x = b.door.ox;
        s2.player.y = b.door.oy;
        enterHouse(s2, b);
      },
    });
  }
});

export { buildingsOf, doorAt, houseOf, houseLayout, layoutOf, HS as HOUSE_SCALE, interiorsOn };
