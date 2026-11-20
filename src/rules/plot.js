/* The plot across the world: at world creation the quest's places are moved out of the home region, each to a
   different region around it: the town, the locked place, where the relic must go (the beacon, or the shrine), and
   the ruin or beast that holds the key. You still set out from the well at home. Works for any world size: it uses
   the regions next to home, and reuses them only if there are too few. Switch: s.off.plot (at creation). */
import { H, W, idx, on, say, stream } from './core.js';
import { HOME, buildArea, homePos, regionId, wrap, wrapDelta, worldPos } from './areas.js';
import { dirFrom } from './map.js';
import { SWITCHES } from './hooks.js';

const HOME_TOWN_CHANCE = 0.25;
function neighbours(s) {
  const h = s.world.home,
    out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = wrap(h.cx + dx, s.world.cols),
        cy = wrap(h.cy + dy, s.world.rows),
        id = regionId(s, cx, cy);
      if (id !== HOME && !out.some((o) => o.id === id)) out.push({ id, cx, cy });
    }
  return out;
}
// The region's record and map, built now if it was not yet.
function regionMap(s, n) {
  if (!s.areas[n.id])
    s.areas[n.id] = { id: n.id, kind: 'region', cx: n.cx, cy: n.cy, biome: s.world.sketch[n.cy * s.world.cols + n.cx].biome };
  buildArea(s, s.areas[n.id]);
  return s.areas[n.id].map;
}
// A free spot in a map: clear ground, nothing standing near, half (hw) and down (hd) the size of what goes there.
// With `near` (a point in the map's frame), the best of many free spots is the one closest to it.
function spot(m, r, hw, hd, near) {
  let best = null;
  for (let t = 0; t < 600; t++) {
    const x = 3 + hw + Math.floor(r() * (W - 6 - 2 * hw)),
      y = 3 + hw + Math.floor(r() * (H - 6 - hw - hd));
    let ok = true;
    for (let j = -hw - 1; j <= hd + 1 && ok; j++)
      for (let i = -hw - 1; i <= hw + 1 && ok; i++) {
        const k = idx(x + i, y + j),
          inner = Math.abs(i) <= hw && j >= -hw && j <= hd;
        if (m.sites[k] || (inner && (m.terrain[k] === 2 || m.terrain[k] === 4 || m.terrain[k] === 5))) ok = false;
      }
    if (ok) {
      if (!near) return { x, y };
      if (!best || Math.abs(x - near.x) + Math.abs(y - near.y) < Math.abs(best.x - near.x) + Math.abs(best.y - near.y))
        best = { x, y };
    }
  }
  return best;
}
function flatten(m, x, y, hw, hd) {
  for (let j = -hw; j <= hd; j++)
    for (let i = -hw; i <= hw; i++) {
      const k = idx(x + i, y + j);
      m.terrain[k] = 0;
      m.elev[k] = 0;
    }
  m.creatures = m.creatures.filter((c) => Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) > hw + 3);
}

on('worldBorn', (s, d) => {
  if (d.off.plot) return;
  const r = stream(s.seed, 'plot'),
    near = neighbours(s);
  if (!near.length) return; // a world of one region: everything stays home
  // A chain of regions, each sharing an edge with the one before: home, the town's, the key's, the locked place's and
  // the destination's. None is home and none repeats while there are others to choose.
  const side = (c) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].map(([dx, dy]) => {
      const cx = wrap(c.cx + dx, s.world.cols),
        cy = wrap(c.cy + dy, s.world.rows);
      return { id: regionId(s, cx, cy), cx, cy };
    });
  const chain = [];
  let prev = s.world.home;
  for (let n = 0; n < 4; n++) {
    const fresh = (list) => list.filter((o) => o.id !== HOME && !chain.some((c) => c.id === o.id));
    // keep to the ring of regions round home where it can, so a large world does not push the story into the far,
    // more dangerous country (the far country is for whoever goes looking)
    let opts = fresh(side(prev)).filter((o) => near.some((n) => n.id === o.id));
    if (!opts.length) opts = fresh(side(prev));
    if (!opts.length) opts = fresh(near);
    if (!opts.length) opts = near;
    const pick = opts[Math.floor(r() * opts.length)];
    chain.push(pick);
    prev = pick;
  }
  const take = (n) => chain[n === 0 ? 0 : n === 3 ? 1 : n === 1 ? 2 : 3], // 0 town, 3 key, 1 locked place, 2 destination
    home = s; // at world creation the player is at home, so the home map is the live one
  // A place given as { area, x, y }, in region n's frame.
  const inFrame = (pl, n) => {
    const a = s.areas[take(n).id],
      b = s.areas[pl.area];
    return { x: pl.x + wrapDelta(b.cx, a.cx, s.world.cols) * W, y: pl.y + wrapDelta(b.cy, a.cy, s.world.rows) * H };
  };
  // Move a site of this kind from home into region n, on the side nearest `prev` (the place before it on the way).
  const move = (kind, n, hw, hd, prev) => {
    const k = Object.keys(home.sites).find((key) => home.sites[key].kind === kind);
    if (k === undefined) return null;
    // in its own region if there is room, or else in the next region of the chain that has room
    for (let tryN = 0; tryN < 4; tryN++) {
      const nn = (n + tryN) % 4,
        m = regionMap(s, take(nn)),
        p = spot(m, r, hw, hd, prev ? inFrame(prev, nn) : null);
      if (!p) continue;
      flatten(m, p.x, p.y, hw, hd);
      m.sites[idx(p.x, p.y)] = home.sites[k];
      delete home.sites[k];
      return { area: take(nn).id, x: p.x, y: p.y };
    }
    return null;
  };
  const dist2 = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  // Each place lies on the side of its region nearest the place before it on the way, so every leg is a fair walk:
  // the well, the town, the key, the locked place, and where the relic goes.
  const well = { area: HOME, x: s.start.x, y: s.start.y };
  // the town, on a clear 5 x 5 block with a row below it for the way in
  // In some worlds the town stands at home, near the well, and the journey starts from there.
  const t = r() < HOME_TOWN_CHANCE ? null : move('town', 0, 2, 3, well);
  if (t) Object.assign(s.town, t);
  const townAt = t ? { area: t.area, x: t.x, y: t.y + 3 } : well;
  let keyAt = townAt;
  // the key: in a ruin of another region, or carried by the beast into another region
  if (s.quest.key === 'ruin') {
    const m = regionMap(s, take(3)),
      ref = inFrame(townAt, 3),
      ruins = Object.keys(m.sites)
        .filter((k) => m.sites[k].kind === 'ruin')
        .sort((a, b) => dist2({ x: a % W, y: Math.floor(a / W) }, ref) - dist2({ x: b % W, y: Math.floor(b / W) }, ref));
    if (ruins.length) {
      s.quest.keyTile = +ruins[0];
      s.quest.keyArea = take(3).id;
      keyAt = { area: take(3).id, x: ruins[0] % W, y: Math.floor(ruins[0] / W) };
    }
  }
  if (s.quest.key === 'beast') {
    const i = home.creatures.findIndex((c) => c.id === s.quest.beast),
      m = regionMap(s, take(3)),
      p = spot(m, r, 0, 0, inFrame(townAt, 3));
    if (i >= 0 && p) {
      const c = home.creatures.splice(i, 1)[0];
      c.x = p.x;
      c.y = p.y;
      m.creatures = m.creatures.filter((o) => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) > 2); // its ground is its own
      m.creatures.push(c);
      s.quest.beastArea = take(3).id;
      keyAt = { area: take(3).id, x: p.x, y: p.y };
    }
  }
  const v = move('vault', 1, 1, 1, keyAt) || keyAt;
  if (s.quest.dest === 'beacon') {
    const g = move('beacon', 2, 1, 1, v);
    if (g) s.goal = g;
  } else {
    const g = move('shrine', 2, 1, 1, v);
    if (g) s.goal = Object.assign(s.goal, g);
  }
  // water on the way: sure springs every seven tiles or so along each leg of the journey. The ones on the way to the town are
  // on your map from the start; the elder marks the others (they are 'sure' springs, which the elder always marks).
  const at = (area, x, y) => ({ area, x, y }),
    maps = Object.keys(s.areas).flatMap((id) => (s.areas[id].map ? [[id, s.areas[id].map]] : [[id, s]])),
    find = (kind) => {
      for (const [id, m] of maps)
        if (s.areas[id].kind === 'region')
          for (const k in m.sites) if (m.sites[k].kind === kind) return at(id, k % W, Math.floor(k / W));
      return null;
    },
    door = at(s.town.area || HOME, s.town.x, s.town.y + 3),
    keyLeg =
      s.quest.key === 'ruin' && s.quest.keyArea
        ? at(s.quest.keyArea, s.quest.keyTile % W, Math.floor(s.quest.keyTile / W))
        : s.quest.key === 'beast' && s.quest.beastArea
          ? (() => {
              const c = s.areas[s.quest.beastArea].map.creatures.find((x) => x.id === s.quest.beast);
              return c ? at(s.quest.beastArea, c.x, c.y) : null;
            })()
          : null,
    legs = [
      [at(HOME, s.start.x, s.start.y), door, true],
      ...(keyAt
        ? [
            [door, keyAt, false],
            [keyAt, find('vault'), false],
          ]
        : [[door, find('vault'), false]]),
      [find('vault'), s.quest.dest === 'beacon' ? find('beacon') : find('shrine'), false],
    ];
  for (const [a, b, known] of legs) {
    if (!a || !b) continue;
    const pa = homePos(s, a.area, a.x, a.y),
      pb = homePos(s, b.area, b.x, b.y),
      n = Math.floor(Math.hypot(pb.x - pa.x, pb.y - pa.y) / 7);
    for (let i = 1; i <= n; i++) {
      const gx = Math.round(pa.x + ((pb.x - pa.x) * i) / (n + 1)),
        gy = Math.round(pa.y + ((pb.y - pa.y) * i) / (n + 1));
      waterAt(s, gx, gy, known);
    }
  }
  // old roads join the places of the story: from the well to the town (its door, below its south side), and on
  for (const [a, b] of legs) road(s, a, b);
  // the opening line points at the town where it is now
  const tp = homePos(s, s.town.area || HOME, s.town.x, s.town.y),
    line = s.log.find((l) => /^Somewhere to the /.test(l.msg));
  if (line) line.msg = line.msg.replace(/^Somewhere to the [a-z-]+/, 'Somewhere to the ' + dirFrom(worldPos(s), tp.x, tp.y));
});
// A paved road between two places, tile by tile in home-region coordinates, through whatever regions lie between. It
// crosses a border on the same tile row or column on both sides, so it carries on into the next region.
function road(s, a, b) {
  if (!a || !b) return;
  const pa = homePos(s, a.area, a.x, a.y),
    pb = homePos(s, b.area, b.x, b.y),
    lay = (gx, gy) => {
      const h = s.world.home,
        rx = Math.floor(gx / W),
        ry = Math.floor(gy / H),
        cx = wrap(h.cx + rx, s.world.cols),
        cy = wrap(h.cy + ry, s.world.rows),
        id = regionId(s, cx, cy),
        m = id === HOME ? s : regionMap(s, { id, cx, cy });
      m.road[idx(gx - rx * W, gy - ry * H)] = 1;
    },
    // a road on a region's outermost tile is laid on the facing tile across the border too, so both sides agree
    put = (gx, gy) => {
      // at a corner the tiles across both borders, and across the corner, all get it
      const todo = [[gx, gy]],
        done = new Set();
      while (todo.length) {
        const [x, y] = todo.pop(),
          key = x + ',' + y;
        if (done.has(key)) continue;
        done.add(key);
        lay(x, y);
        const lx = ((x % W) + W) % W,
          ly = ((y % H) + H) % H;
        if (lx === 0) todo.push([x - 1, y]);
        if (lx === W - 1) todo.push([x + 1, y]);
        if (ly === 0) todo.push([x, y - 1]);
        if (ly === H - 1) todo.push([x, y + 1]);
      }
    };
  let x = pa.x,
    y = pa.y;
  put(x, y);
  while (x !== pb.x || y !== pb.y) {
    // step along the longer way first, with a little wander so it does not look ruled
    if (x !== pb.x && (y === pb.y || Math.abs(pb.x - x) >= Math.abs(pb.y - y))) x += Math.sign(pb.x - x);
    else y += Math.sign(pb.y - y);
    put(x, y);
  }
}
// A sure spring near a point given in home-region coordinates (in whichever region that falls).
function waterAt(s, gx, gy, known) {
  const h = s.world.home,
    rx = Math.floor(gx / W),
    ry = Math.floor(gy / H),
    cx = wrap(h.cx + rx, s.world.cols),
    cy = wrap(h.cy + ry, s.world.rows),
    n = { id: regionId(s, cx, cy), cx, cy },
    m = n.id === HOME ? s : regionMap(s, n),
    x0 = gx - rx * W,
    y0 = gy - ry * H;
  for (let rad = 0; rad < 5; rad++)
    for (let j = -rad; j <= rad; j++)
      for (let i = -rad; i <= rad; i++) {
        const x = x0 + i,
          y = y0 + j,
          k = idx(x, y);
        if (x < 2 || y < 2 || x > W - 3 || y > H - 3 || m.sites[k] || m.terrain[k] === 2 || m.terrain[k] >= 4) continue;
        let near = false;
        for (const key in m.sites)
          if (m.sites[key].kind === 'town' && Math.abs((key % W) - x) <= 3 && Math.abs(Math.floor(key / W) - y) <= 4) near = true;
        if (near) continue;
        m.sites[k] = { kind: 'spring', foul: false, known, sure: true, seen: known };
        if (known)
          for (let b = -1; b <= 1; b++)
            for (let a = -1; a <= 1; a++) if (x + a >= 0 && y + b >= 0 && x + a < W && y + b < H) m.seen[idx(x + a, y + b)] = 1;
        return;
      }
}
SWITCHES.push(['plot', 'The plot across the world (new worlds)']);
