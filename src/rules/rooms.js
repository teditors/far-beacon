/* Rooms by use (commission 8): a room is furnished for what it is for, and things stand where they belong.

   - A dwelling's rooms follow its wealth (content/rooms.js `plans`): a poor cottage a living room with the hearth, a
     sleeping room, a store and a workroom; a middling house a kitchen of its own; a rich one a dining room and a study
     as well. A temple has a nave and a vestry, a mapmaker's house its stacks.
   - Furniture by function: an altar against the wall farthest from the door (`far`); pews, or a library's bookcases,
     in rows across the room with an aisle up the middle from the door (`rows`); along the walls the rest, never in
     front of a door; a table with chairs round every side there is room on, and a place laid at each (a plate, and a
     cup in a house that has them); and what goes with each piece (`groups`): pots and a kettle on the floor before the
     hearth with the firewood beside it and a stool facing it, a nightstand or a chest beside a bed, a stool at the
     workbench, an anvil before the forge, the god's shrine and candlesticks on the altar, scales and a ledger on the
     counter, a jug on the washstand.
   - Small things where they belong (`near`): pots by the hearth, plates and cups on the table, tools on the bench,
     books in the bookcase, candles on the nightstand and the altar, combs on the washstand; buckets, brooms and
     baskets on the floor against a wall, never in the middle of the floor.
   - An abandoned house: some of its furniture gone, the rest broken and dusty (the view draws it so), cobwebs, fallen
     plaster and boards, shards, and now and then one thing that has come through whole.
   - The temple's god: the shrine on its altar is the god's own (a bowl of still water for a god of water, a broken
     shield for a god of war...), and its holy symbols are named for the god.

   Switch: s.off.rooms (the furnishing of commission 7). Nothing is stored: houses are made from the seed. */
import { C, W, H, FLOOR, WALL, idx } from './core.js';
import { furnish, thingKind } from './things.js';
import { SWITCHES } from './hooks.js';

const U = () => C.roomsByUse;
const LAID = ['living', 'dining', 'kitchen', 'hall', 'taproom']; // rooms where a place is laid at the table
const X = () => C.things;
const sizeOf = (k) => X().sizes[k] || [0.3, 0.3];
const pickW = (r, list) => {
  const tot = list.reduce((a, e) => a + e[1], 0);
  let x = r() * tot;
  for (const e of list) if ((x -= e[1]) < 0) return e[0];
  return list.length ? list[list.length - 1][0] : null;
};

// The rooms of a building, the first by the door: a dwelling's by its wealth, others by their kind.
function planFor(kind, grade) {
  if (kind === 'house') return U().plans[grade] || U().plans[1];
  return U().buildings[kind] || X().buildings[kind] || X().buildings.house;
}

/* Furnish a room by use. As furnish (rules/things.js), and room.door: the tile inside the room's doorway (to keep clear,
   and to set an altar or pews by). o.god: { name, dom } in a temple. */
function furnishByUse(s, spec, room, o, out) {
  const r = o.r,
    ts = o.ts,
    used = new Set(),
    surf = [],
    slot = {},
    inRoom = new Set(room.tiles),
    door = room.door !== undefined && room.door !== null ? room.door : room.tiles[0],
    dx0 = door % W,
    dy0 = Math.floor(door / W),
    far = (k) => Math.abs((k % W) - dx0) + Math.abs(Math.floor(k / W) - dy0),
    G = U().groups,
    NEAR = U().near,
    FLOORISH = new Set(U().floor),
    gone = o.abandoned ? U().abandoned.gone : 0;
  // keep the way in clear: no furniture on the tile inside a doorway or the tiles beside it
  for (const k of room.tiles) if (far(k) <= 1) used.add(k);
  const put = (k, tile, px, pz, h, ry, extra) => {
    const n = (slot[tile] = (slot[tile] || 0) + 1),
      kd = thingKind(k),
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
    if (o.old) t.old = 1;
    if (o.ware && kd.ware) t.ware = 1;
    if (o.own) t.own = 1;
    if (o.god && (k === 'holy' || k === 'icon')) (t.of = o.god.name), k === 'icon' && (t.dom = o.god.dom);
    Object.assign(t, extra || {});
    out.push(t);
    if (kd.top) surf.push(t);
    return t;
  };
  const free = (k) => inRoom.has(k) && !used.has(k);
  // a piece against the wall at `tile`, its front to the room; a long one over the next tile along the same wall
  const atWall = (k, tile) => {
    const ws = room.wallSide(tile);
    if (!ws) return null;
    const [dx, dy] = ws;
    let [w, d] = sizeOf(k),
      ry = Math.atan2(-dx, -dy);
    if (d > ts * 0.85 && d > w) (ry += Math.PI / 2), ([w, d] = [d, w]);
    let ax = 0,
      ay = 0;
    const tiles = [tile];
    if (w > ts * 1.02) {
      const along = [
        [-dy, dx],
        [dy, -dx],
      ].find(([ex, ey]) => {
        const n = tile + ey * W + ex,
          s2 = free(n) && room.wallSide(n);
        return s2 && s2[0] === dx && s2[1] === dy;
      });
      if (!along) return null;
      tiles.push(tile + along[1] * W + along[0]);
      ax = along[0] * 0.5;
      ay = along[1] * 0.5;
    }
    for (const q of tiles) used.add(q);
    const back = Math.max(-0.2, 0.5 - ((o.inset || 0) + d / 2 + 0.04) / ts),
      t = put(k, tile, dx * back + ax, dy * back + ay, 0, ry);
    t.wall = [dx, dy];
    if (tiles.length > 1) t.tiles = tiles;
    return t;
  };
  const wallTiles = () => room.tiles.filter((k) => free(k) && room.wallSide(k));
  const placed = [];
  // 1. what stands against the far wall, facing the door: an altar, in the middle of that wall
  const cxR = room.tiles.reduce((a, k) => a + (k % W), 0) / room.tiles.length,
    cyR = room.tiles.reduce((a, k) => a + Math.floor(k / W), 0) / room.tiles.length,
    away = Math.abs(cxR - dx0) >= Math.abs(cyR - dy0) ? [Math.sign(cxR - dx0) || 1, 0] : [0, Math.sign(cyR - dy0) || 1];
  for (const [k, ch] of spec.far || []) {
    if (!(r() < ch)) continue;
    let cand = wallTiles().filter((q) => {
      const ws = room.wallSide(q);
      return ws[0] === away[0] && ws[1] === away[1];
    });
    // the most central first; with no wall of its own there (an inner wall), the farthest wall it has
    cand.sort((a, b) => Math.hypot((a % W) - cxR, Math.floor(a / W) - cyR) - Math.hypot((b % W) - cxR, Math.floor(b / W) - cyR));
    cand = cand.concat(wallTiles().sort((a, b) => far(b) - far(a)));
    for (const tile of cand) {
      const t = atWall(k, tile);
      if (t) {
        placed.push(t);
        break;
      }
    }
  }
  // 2. rows across the room with an aisle up the middle from the door: pews facing the altar, a library's stacks
  if ((spec.rows || []).length) {
    const target = placed.length ? placed[0] : null,
      tx = target ? target.x : room.tiles.reduce((a, k) => a + (k % W), 0) / room.tiles.length,
      ty = target ? target.y : room.tiles.reduce((a, k) => a + Math.floor(k / W), 0) / room.tiles.length,
      ax = Math.abs(tx - dx0) >= Math.abs(ty - dy0) ? [Math.sign(tx - dx0) || 1, 0] : [0, Math.sign(ty - dy0) || 1];
    const [rk] = spec.rows[0],
      mids = room.tiles.filter((k) => free(k) && !room.wallSide(k));
    let rowsPut = 0;
    for (const k of mids) {
      const x = k % W,
        y = Math.floor(k / W),
        along = (x - dx0) * ax[0] + (y - dy0) * ax[1],
        across = (x - dx0) * ax[1] - (y - dy0) * ax[0];
      if (Math.abs(across) < 1 || along < 2 || along % 2) continue; // the aisle, the way in, every other row
      if (target && along >= (tx - dx0) * ax[0] + (ty - dy0) * ax[1] - 1) continue; // room before the altar
      if (o.abandoned && r() < gone) continue;
      used.add(k);
      put(rk, k, 0, 0, 0, Math.atan2(-ax[0], -ax[1]) + (rk === 'pew' ? Math.PI : Math.PI / 2));
      rowsPut++;
    }
    // a room too narrow for rows still has a few, wherever there is floor before the altar
    for (const k of mids.filter((q) => free(q)).slice(0, rowsPut ? 0 : 3)) {
      used.add(k);
      put(rk, k, 0, 0, 0, Math.atan2(-ax[0], -ax[1]) + (rk === 'pew' ? Math.PI : Math.PI / 2));
    }
  }
  // 3. along the walls: the room's list, its biggest pieces first, kept off the door
  const rounds = Math.max(1, Math.round(wallTiles().length / (o.perRound || 99))),
    wallList = [];
  for (let i = 0; i < rounds; i++) for (const [k, ch] of spec.wall || []) wallList.push([k, i ? ch * 0.55 : ch]);
  for (const [k, ch] of wallList) {
    if (!(r() < ch)) continue;
    if (o.abandoned && thingKind(k).fixed && k !== 'hearth' && !['cobweb', 'rubble', 'planks'].includes(k) && r() < gone)
      continue;
    const c = wallTiles();
    if (!c.length) break;
    // a hearth or a forge on the wall's middle, the rest anywhere along a wall
    const pick = c[Math.floor(r() * c.length)];
    const t = atWall(k, pick);
    if (t) placed.push(t);
  }
  // 4. in the middle: a table with its chairs, a rug, a counter, a lectern
  const midRounds = Math.max(1, Math.round((o.floor || 0) / (o.perMiddle || 999))),
    midList = [];
  for (let i = 0; i < midRounds; i++) for (const [k, ch] of spec.middle || []) midList.push([k, i ? ch * 0.6 : ch]);
  const mids = () => room.tiles.filter((k) => free(k) && !room.wallSide(k));
  for (const [k, ch] of midList) {
    if (!(r() < ch)) continue;
    if (o.abandoned && k !== 'rug' && r() < gone) continue;
    // a table stands where it has room round it: the free middle tile with the most free tiles about it
    const c = mids();
    if (!c.length) break;
    const room4 = (q) => [q - 1, q + 1, q - W, q + W].filter((n) => free(n) && !room.wallSide(n)).length;
    c.sort((a, b) => room4(b) - room4(a) || a - b);
    const top = c.filter((q) => room4(q) === room4(c[0])),
      tile = top[Math.floor(r() * top.length)];
    let ry = r() < 0.5 ? 0 : Math.PI / 2,
      ax = 0,
      ay = 0;
    const tiles = [tile];
    const [w] = sizeOf(k);
    if (w > ts * 1.02 && k !== 'rug') {
      const opts = [
        [1, 0, 0],
        [0, 1, Math.PI / 2],
        [-1, 0, 0],
        [0, -1, Math.PI / 2],
      ].filter(([ex, ey]) => free(tile + ey * W + ex) && !room.wallSide(tile + ey * W + ex));
      if (!opts.length) continue;
      const [ex, ey, rot] = opts[0];
      tiles.push(tile + ey * W + ex);
      (ax = ex * 0.5), (ay = ey * 0.5), (ry = rot);
    }
    if (k !== 'rug') for (const q of tiles) used.add(q);
    const t = put(k, tile, ax, ay, 0, ry);
    if (tiles.length > 1) t.tiles = tiles;
    if (k === 'rug') continue;
    placed.push(t);
    if (k === 'longtable' || k === 'table')
      seatRound(t, tiles, ry, k === 'longtable' ? 'bench' : o.grade >= 1 ? 'chair' : 'stool');
  }
  // seats round a table, on every side there is room, and a place laid at each (offsets in tiles from its tile)
  function seatRound(t, tiles, ry, seat) {
    const along = ry === 0 ? [1, 0] : [0, 1],
      across = [along[1], along[0]],
      [tw, td] = sizeOf(t.k),
      home = idx(t.x, t.y),
      per = seat === 'bench' ? 1 : tiles.length,
      spots = [];
    for (const sg of [-1, 1])
      for (let i = 0; i < per; i++) {
        const a = per === 1 ? 0 : i - (per - 1) / 2,
          d = (td / 2 + 0.3) / ts;
        spots.push([
          t.px + along[0] * a + across[0] * sg * d,
          t.pz + along[1] * a + across[1] * sg * d,
          across[0] * sg,
          across[1] * sg,
        ]);
      }
    if (tiles.length === 1 && seat !== 'bench')
      for (const sg of [-1, 1]) {
        const d = (tw / 2 + 0.3) / ts;
        spots.push([t.px + along[0] * sg * d, t.pz + along[1] * sg * d, along[0] * sg, along[1] * sg]);
      }
    for (const [sx, sz, ex, ey] of spots) {
      const q = idx(t.x + Math.round(sx), t.y + Math.round(sz));
      if (!inRoom.has(q) || (!tiles.includes(q) && (used.has(q) || room.wallSide(q)))) continue;
      if (!tiles.includes(q)) used.add(q);
      if (o.abandoned && r() < gone) continue;
      put(seat, home, sx, sz, 0, seat === 'bench' ? ry : Math.atan2(-ex, -ey));
      // a place laid before it, on the table's top
      if (!o.abandoned && seat !== 'bench' && LAID.includes(o.place) && r() < 0.85) {
        const top = thingKind(t.k).top,
          lay = (k2, back) => put(k2, home, sx - (ex * back) / ts, sz - (ey * back) / ts, top, r() * 6.28);
        lay('plate', 0.48);
        if (o.grade >= 1 && r() < 0.7) lay('cup', 0.62);
      }
    }
  }
  // 5. what goes with each piece: pots before the hearth, a nightstand by the bed, the shrine on the altar...
  for (const t of placed.slice()) {
    for (const [k, ch, where] of G[t.k] || []) {
      if (!(r() < ch)) continue;
      if (o.abandoned && k === 'icon') continue; // the god's shrine was taken away when the place was left
      const tk = thingKind(k);
      if (!tk) continue;
      const home = idx(t.x, t.y),
        [dx, dy] = t.wall || [0, 0];
      if (where === 'on') {
        const top = thingKind(t.k).top || 0.8,
          [w] = sizeOf(t.k),
          c = Math.cos(t.ry),
          sn = Math.sin(t.ry),
          a = k === 'icon' ? 0 : (r() < 0.5 ? -1 : 1) * w * (0.28 + r() * 0.1),
          b = k === 'icon' ? -0.08 : 0;
        put(k, home, t.px + (a * c + b * sn) / ts, t.pz + (-a * sn + b * c) / ts, top, k === 'icon' ? t.ry : r() * 6.28);
      } else if (where === 'hearth') {
        // on the floor before it, to one side
        const side = r() < 0.5 ? -1 : 1,
          along = [-dy, dx];
        put(k, home, t.px - dx * 0.55 + along[0] * side * 0.32, t.pz - dy * 0.55 + along[1] * side * 0.32, 0, r() * 6.28);
      } else if (where === 'side') {
        // the next tile along the same wall, beyond either end of the piece
        const ends = t.tiles || [home],
          c = [];
        for (const e of ends)
          for (const [ex, ey] of [
            [-dy, dx],
            [dy, -dx],
          ])
            c.push(e + ey * W + ex);
        const ok = c.filter((q) => {
          const ws = free(q) && room.wallSide(q);
          return ws && ws[0] === dx && ws[1] === dy;
        });
        if (!ok.length) continue;
        const nt = atWall(k, ok[Math.floor(r() * ok.length)]);
        if (nt) placed.push(nt);
      } else if (where === 'front') {
        const q = home - dy * W - dx;
        if (!free(q)) continue;
        used.add(q);
        put(k, q, 0, 0, 0, Math.atan2(dx, dy));
      }
    }
  }
  // 6. small things, where they belong
  const n =
    o.count !== undefined
      ? o.count
      : Math.round((o.floor !== undefined ? o.floor : room.tiles.length) * (spec.n || 0.3) * (0.65 + 0.35 * o.grade) + r());
  const less = spec.less || [],
    small = (spec.small || []).filter((e) => e[1] > 0 && !less.includes(e[0]) && thingKind(e[0]) && !thingKind(e[0]).fixed);
  const onTop = (f, k) => {
    const [w, d] = sizeOf(f.k),
      a = (r() - 0.5) * w * 0.75,
      b = (r() - 0.5) * d * 0.6,
      c = Math.cos(f.ry),
      sn = Math.sin(f.ry),
      top = thingKind(f.k).top,
      h = top > 1.2 ? [0.45, 0.9, top - 0.05][Math.floor(r() * 3)] : top;
    put(k, idx(f.x, f.y), f.px + (a * c + b * sn) / ts, f.pz + (-a * sn + b * c) / ts, h, r() * 6.28);
  };
  for (let i = 0; i < n && small.length; i++) {
    const k = pickW(r, small),
      likes = NEAR[k] || [];
    // on the furniture it belongs on, the first it likes that this room has
    let f = null;
    for (const want of likes) {
      const c = surf.filter((x) => x.k === want);
      if (c.length) {
        f = c[Math.floor(r() * c.length)];
        break;
      }
    }
    if (f && !FLOORISH.has(k)) {
      onTop(f, k);
      continue;
    }
    // on the floor against a wall, by what it belongs to if it can
    if (FLOORISH.has(k) || !surf.length) {
      const anchor = placed.find((x) => likes.includes(x.k));
      let c = room.tiles.filter((q) => room.wallSide(q) && !used.has(q));
      if (anchor) {
        const nearA = c.filter((q) => Math.abs((q % W) - anchor.x) + Math.abs(Math.floor(q / W) - anchor.y) <= 2);
        if (nearA.length) c = nearA;
      }
      if (!c.length) c = room.tiles.filter((q) => room.wallSide(q));
      if (!c.length) c = room.tiles;
      const q = c[Math.floor(r() * c.length)],
        ws = room.wallSide(q) || [0, 0];
      put(k, q, ws[0] * 0.32 + (r() - 0.5) * 0.25, ws[1] * 0.32 + (r() - 0.5) * 0.25, 0, r() * 6.28);
      continue;
    }
    onTop(surf[Math.floor(r() * surf.length)], k);
  }
  return out;
}

/* An abandoned house: what has come into it (cobwebs, fallen plaster and boards, shards) is in its rooms' specs; after
   furnishing, one thing in it may have come through whole. */
function abandonSpec(spec) {
  const A = U().abandoned;
  spec.wall = spec.wall.concat(A.wall);
  spec.small = spec.small.concat(A.small);
  return spec;
}
function survivor(things, r) {
  if (!(r() < U().abandoned.keep)) return;
  const c = things.filter((t) => t.old && !thingKind(t.k).fixed && !['shards', 'bones', 'skull'].includes(t.k));
  if (c.length) delete c[Math.floor(r() * c.length)].old;
}
// The tile inside the doorway that leads into room `ri` (the house's own door for the first room).
function doorOf(ri, open, cells, terrain) {
  for (const [k] of open)
    for (const n of [k - 1, k + 1, k - W, k + W]) if (n >= 0 && n < W * H && cells[n] === ri && terrain[n] === FLOOR) return n;
  return null;
}
const roomsOn = (s) => !s.off.rooms;
SWITCHES.push(['rooms', 'Rooms furnished by what they are for']);

export { planFor, furnishByUse, abandonSpec, survivor, doorOf, roomsOn };
export { WALL as _WALL };
