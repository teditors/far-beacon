/* Dungeons (content/deeps.js): places below the world. A world rolls its dungeons when it is made (s.deeps), each with
   a theme, a name, a depth and the region or town it opens from; nothing else exists until it is needed. A dungeon's
   stair is put in a cave, a ruin or a town's cellar when that map is first built, and each level is built the first
   time you go down to it (GENERATORS.deep), from its own stream, so a dungeon costs nothing until it is walked.
   The locked place is the oldest dungeon: its levels keep their own generator, but share everything else (levels in
   the jump list, the odd levels, deeper is richer, the view). Plots may put what they need at any level (d.held,
   added when that level is built). Switch: s.off.deeps (at creation: no dungeons but the locked place).
   Level areas: id '<dungeon id>.<level>', kind 'deep', with { deep, level, levels, theme, floor (an odd level) }. */
import { C, H, W, WALL, FLOOR, byId, clamp, emit, idx, on, say, stream } from './core.js';
import './interiors.js';
import './worldgen.js';
import {
  GENERATORS,
  areaRec,
  buildArea,
  ensureRegion,
  enterArea,
  withRealm,
  mapOf,
  regionId,
  sketchOf,
  townById,
  townId,
  withTown,
} from './areas.js';
import { makeCreature } from './combat.js';
import { genItem, makeItem } from './items.js';
import { reveal, sightRadius, siteHere, SITE_NAME } from './map.js';
import { findSite } from './quest.js';
import { stat, SOURCES } from './stats.js';
import { advance } from './systems.js';
import { gainXp } from './progress.js';
import { ACTIONS, ENTRANCES, LEVELS, LOOKS, NOTES, PLACES, SWITCHES } from './hooks.js';
import { applyQuirk, rollQuirk } from './floors.js';
import { makeArtifact } from './artifacts.js';
import { genOf } from './worldset.js';
import { jumpRegion } from './godmode.js';

const D = () => C.deeps;
const themeOf = (d) => byId(D().themes, d.theme);
const deepsOf = (s) => s.deeps || [];
const deepById = (s, id) => deepsOf(s).find((d) => d.id === id) || null;
const levelId = (d, n) => (d.id === 'vault' ? 'vault' + n : d.id + '.' + n);
SITE_NAME.cellar = 'cellar stair';

/* ---------- at world creation: which dungeons, where, how deep ---------- */
// Roll a world's dungeons: when it is made, and once for a world made before there were any (deepen.js).
function rollDeeps(s, ev) {
  if (ev.off.deeps) return;
  const set = ev.set || genOf(s),
    r = stream(s.seed, 'deeps'),
    X = D(),
    w = s.world,
    pick = (a) => a[Math.floor(r() * a.length)],
    most = Math.max(1, set.depth),
    list = [];
  let n = 0;
  const add = (area, at) => {
    const themes = X.themes.filter((t) => t.entry.includes(at)),
      t = pick(themes),
      [lo, hi] = X.depth,
      depth = clamp(lo + Math.floor(r() * (hi - lo + 1)), 1, most),
      unused = t.names.filter((nm) => !list.some((o) => o.name === nm || o.name === 'the Lower ' + nm.slice(4))),
      name = unused.length ? pick(unused) : 'the Lower ' + pick(t.names).slice(4), // no two dungeons share a name
      d = { id: 'd' + n++, theme: t.id, name, area, at, depth };
    list.push(d);
    return d;
  };
  const per = X.perRegion * set.dungeons;
  for (let cy = 0; cy < w.rows; cy++)
    for (let cx = 0; cx < w.cols; cx++) {
      let k = Math.floor(per) + (r() < per - Math.floor(per) ? 1 : 0);
      for (; k > 0; k--) add(regionId(s, cx, cy), r() < 0.5 ? 'cave' : 'ruin');
    }
  for (const t of [s.town].concat(s.towns || [])) if (t && r() < X.townChance * set.dungeons) add(townId(t), 'town');
  // the most powerful things lie deepest: an artifact of its own at the bottom of the deepest dungeon
  const deepest = list.slice().sort((a, b) => b.depth - a.depth)[0];
  if (deepest && deepest.depth >= 3 && !ev.off.artifacts) deepest.prize = makeArtifact(s, stream(s.seed, 'deeps:art'), []);
  s.deeps = list;
  // maps already built (home, the regions round it, the towns) get their stairs now; the rest as they are built
  for (const id in s.areas) {
    const m = s.areas[id].map || id === s.area ? mapOf(s, id) : null;
    if (m) placeStairs(s, id, m);
  }
}
on('worldBorn', rollDeeps);

/* ---------- the stair down, put in a map as it is built ---------- */
function placeStairs(s, area, m) {
  for (const d of deepsOf(s)) {
    if (d.area !== area || d.x !== undefined) continue;
    const r = stream(s.seed, 'deeps:at:' + d.id),
      kind = d.at === 'town' ? null : d.at;
    let k = null;
    if (kind) {
      const opts = Object.keys(m.sites).filter((q) => m.sites[q].kind === kind && !m.sites[q].deep && !m.sites[q].plot);
      if (opts.length) k = +opts[Math.floor(r() * opts.length)];
    }
    if (k === null) {
      // a cave of its own on open ground (or, in a town, a cellar stair against a house wall)
      const town = d.at === 'town',
        free = [];
      for (let y = 3; y < H - 3; y++)
        for (let x = 3; x < W - 3; x++) {
          const i = idx(x, y),
            t = m.terrain[i];
          if (m.sites[i] || (town ? t !== FLOOR : t === 2 || t >= 4)) continue;
          if (town && ![idx(x + 1, y), idx(x - 1, y), idx(x, y + 1), idx(x, y - 1)].some((j) => m.terrain[j] === WALL)) continue;
          if (town && Math.abs(x - 18) <= 7 && Math.abs(y - 18) <= 7) continue; // not on the square
          let near = false;
          for (let j = -2; j <= 2 && !near; j++) for (let q = -2; q <= 2; q++) if (m.sites[idx(x + q, y + j)]) near = true;
          if (!near) free.push(i);
        }
      if (!free.length) continue;
      k = free[Math.floor(r() * free.length)];
      m.sites[k] = town ? { kind: 'cellar', seen: true } : { kind: 'cave', searched: false, loot: false };
    }
    m.sites[k].deep = d.id;
    d.x = k % W;
    d.y = Math.floor(k / W);
  }
}
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    placeStairs(s, rec.id, m);
    return m;
  };
  const town = GENERATORS.town;
  GENERATORS.town = (s, rec) => {
    const m = town(s, rec);
    placeStairs(s, townId(s.town), m);
    return m;
  };
}

/* ---------- a level, built the first time you reach it ---------- */
// Lay out a level: WALL everywhere, FLOOR where you can walk. Returns the terrain and the floor tiles.
const blank = (v) => new Array(W * H).fill(v);
const inner = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
const LAYOUTS = {
  rooms(r) {
    const t = blank(WALL),
      rooms = [];
    for (let tries = 0; tries < 300 && rooms.length < 10; tries++) {
      const w = 4 + Math.floor(r() * 5),
        h = 4 + Math.floor(r() * 5),
        x = 2 + Math.floor(r() * (W - w - 4)),
        y = 2 + Math.floor(r() * (H - h - 4));
      if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    }
    for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) t[idx(x, y)] = FLOOR;
    rooms.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < rooms.length; i++) corridor(t, rooms[i - 1], rooms[i], r() < 0.5);
    return t;
  },
  halls(r) {
    // a grid of square halls with pillars, joined by doors
    const t = blank(WALL),
      cells = [];
    for (let gy = 0; gy < 4; gy++)
      for (let gx = 0; gx < 4; gx++) {
        if (r() < 0.2) continue;
        const x = 2 + gx * 8,
          y = 2 + gy * 8,
          cx = x + 3,
          cy = y + 3;
        for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) t[idx(x + i, y + j)] = FLOOR;
        if (r() < 0.7)
          for (const [i, j] of [
            [2, 2],
            [4, 2],
            [2, 4],
            [4, 4],
          ])
            t[idx(x + i, y + j)] = WALL; // pillars
        cells.push({ gx, gy, cx, cy });
      }
    for (const a of cells)
      for (const b of cells)
        if ((b.gx === a.gx + 1 && b.gy === a.gy) || (b.gy === a.gy + 1 && b.gx === a.gx)) corridor(t, a, b, true);
    // halls left on their own get a passage to the nearest
    for (let i = 1; i < cells.length; i++) corridor(t, cells[i - 1], cells[i], r() < 0.5);
    return t;
  },
  caves(r) {
    let t = blank(WALL);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (r() < 0.55) t[idx(x, y)] = FLOOR;
    for (let pass = 0; pass < 4; pass++) {
      const n = t.slice();
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          let walls = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (t[idx(x + i, y + j)] === WALL) walls++;
          n[idx(x, y)] = walls >= 5 ? WALL : FLOOR;
        }
      t = n;
    }
    return t;
  },
  tunnels(r) {
    // miners' drifts: long straight runs that turn now and then, with a few chambers
    const t = blank(WALL);
    let x = 18,
      y = 18,
      dir = Math.floor(r() * 4),
      dug = 0;
    const D4 = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    for (let step = 0; step < 4000 && dug < W * H * 0.3; step++) {
      if (t[idx(x, y)] === WALL) dug++;
      t[idx(x, y)] = FLOOR;
      if (r() < 0.12) dir = (dir + (r() < 0.5 ? 1 : 3)) % 4;
      if (r() < 0.015) {
        for (let j = -1; j <= 1; j++)
          for (let i = -2; i <= 2; i++)
            if (inner(x + i, y + j)) {
              if (t[idx(x + i, y + j)] === WALL) dug++;
              t[idx(x + i, y + j)] = FLOOR;
            }
      }
      const nx = x + D4[dir][0],
        ny = y + D4[dir][1];
      if (nx < 2 || ny < 2 || nx > W - 3 || ny > H - 3) {
        dir = (dir + 2) % 4;
        continue;
      }
      x = nx;
      y = ny;
    }
    return t;
  },
};
function corridor(t, a, b, horizFirst) {
  let x = a.cx,
    y = a.cy;
  const dig = () => (t[idx(x, y)] = FLOOR);
  if (horizFirst) {
    while (x !== b.cx) (x += Math.sign(b.cx - x)), dig();
    while (y !== b.cy) (y += Math.sign(b.cy - y)), dig();
  } else {
    while (y !== b.cy) (y += Math.sign(b.cy - y)), dig();
    while (x !== b.cx) (x += Math.sign(b.cx - x)), dig();
  }
}
// Walking distance from a tile over floor (-1 where you cannot get).
function distFrom(t, start) {
  const dist = blank(-1),
    q = [start];
  dist[start] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h],
      x = i % W,
      y = Math.floor(i / W);
    for (const j of [i + 1, i - 1, i + W, i - W]) {
      const xx = j % W,
        yy = Math.floor(j / W);
      if (j < 0 || j >= W * H || Math.abs(xx - x) + Math.abs(yy - y) !== 1) continue;
      if (t[j] === FLOOR && dist[j] < 0) {
        dist[j] = dist[i] + 1;
        q.push(j);
      }
    }
  }
  return dist;
}
// The species of a theme in this world: one per form, named once, kept in s.deepSpecies.
function themeSpecies(s, th, r) {
  const all = (s.deepSpecies = s.deepSpecies || {});
  if (!all[th.id]) {
    all[th.id] = th.forms.map((f) => {
      const form = byId(C.creature.forms, f);
      s.species.push({
        name: th.creature[Math.floor(r() * th.creature.length)] + ' ' + form.name,
        form: f,
        temper: r() < 0.5 ? 'hunter' : 'territorial',
        rare: null,
        met: false,
        deep: th.id,
      });
      return s.species.length - 1;
    });
    // the Heart: what lives at the bottom
    const f = th.forms[0];
    s.species.push({
      name: 'Heart of the ' + th.name.replace(/^Old |^Flooded /, ''),
      form: f,
      temper: 'territorial',
      rare: 'elder',
      met: false,
      deep: th.id,
      named: true,
    });
    all[th.id].push(s.species.length - 1);
  }
  return all[th.id];
}
GENERATORS.deep = (s, rec) => {
  const d = deepById(s, rec.deep),
    th = byId(D().themes, rec.theme),
    r = stream(s.seed, 'area:' + rec.id),
    lvl = rec.level,
    last = lvl === rec.levels;
  let terrain = LAYOUTS[th.layout](r);
  // the way in: a floor tile near the middle of the biggest open part; everything you cannot reach is filled in
  let start = -1;
  for (let rad = 0; rad < W && start < 0; rad++)
    for (let j = -rad; j <= rad && start < 0; j++)
      for (let i = -rad; i <= rad && start < 0; i++) {
        const x = 18 + i + Math.floor((r() - 0.5) * 8 * (rad > 3 ? 0 : 1)),
          y = 18 + j;
        if (inner(x, y) && terrain[idx(x, y)] === FLOOR) start = idx(x, y);
      }
  if (start < 0) {
    start = idx(18, 18);
    terrain[start] = FLOOR;
  }
  // start from a random end of the level instead of the middle, so a level is crossed, not just entered
  let dist = distFrom(terrain, start);
  const floors = [];
  for (let i = 0; i < W * H; i++) if (dist[i] >= 0) floors.push(i);
  start = floors.reduce((a, b) => (dist[b] > dist[a] ? b : a), start);
  if (lvl % 2 === 0) start = floors[Math.floor(r() * floors.length)];
  dist = distFrom(terrain, start);
  for (let i = 0; i < W * H; i++) if (dist[i] < 0) terrain[i] = WALL;
  const far = floors.filter((i) => dist[i] >= 0).reduce((a, b) => (dist[b] > dist[a] ? b : a), start),
    sites = {},
    depots = {},
    creatures = [],
    taken = (i) => sites[i] || depots[i] || creatures.some((c) => idx(c.x, c.y) === i) || i === start;
  const open = floors.filter((i) => dist[i] >= 0),
    spot = (minD) => {
      for (let t = 0; t < 60; t++) {
        const i = open[Math.floor(r() * open.length)];
        if (!taken(i) && dist[i] >= minD) return i;
      }
      return null;
    };
  // the way back up, and the way on down (or, at the bottom, what the dungeon holds)
  const up = [start - W, start + W, start - 1, start + 1].find((i) => terrain[i] === FLOOR) || start;
  sites[up] = { kind: lvl === 1 ? 'exit' : 'stairsUp' };
  rec.entry = { x: start % W, y: Math.floor(start / W) };
  const sp = themeSpecies(s, th, r);
  let cid = D().idBase + (+d.id.slice(1) || 0) * 40000 + lvl * 40; // room for a thousand levels a dungeon
  // harder the deeper, up to a point: past the twelfth level or so nothing is stronger, only more of it
  const tierAt = Math.min(D().maxTier, Math.round(th.tier[0] + th.tier[1] * (lvl - 1))),
    put = (spi, i, tier) => {
      const c = makeCreature(s, cid++, spi, i % W, Math.floor(i / W), tier);
      creatures.push(c);
      return c;
    };
  if (last) {
    const it = genItem(s, { relic: true, noConsumables: true });
    it.tier = Math.min(C.tiers.max, 1 + Math.ceil(lvl / 2));
    const prize = { water: 0, fuel: 0, items: [it], coin: th.coin[1] * 2 + lvl * 5, store: true, prize: d.id };
    if (d.prize) {
      prize.items.push(d.prize);
      delete d.prize;
    }
    if (d.extra) {
      prize.items.push(...d.extra); // what other pieces leave at the bottom (a way to fly, in a sky world)
      delete d.extra;
    }
    depots[far] = prize;
    if (!d.plot) {
      // the Heart (in a dungeon the plot uses, its villain stands in for it)
      const heart = put(sp[sp.length - 1], spot(2) ?? far, tierAt + 1);
      heart.warden = true;
      heart.heart = d.id;
    }
  } else sites[far] = { kind: 'stairsDown' };
  for (let n = 0; n < th.per + Math.min(4, Math.floor(lvl / 2)); n++) {
    const i = spot(6);
    if (i !== null) put(sp[Math.floor(r() * (sp.length - 1))], i, Math.max(1, tierAt - (r() < 0.4 ? 1 : 0)));
  }
  // a store-room or two, richer the deeper you go
  for (let n = 0; n < 1 + (lvl >= 3 ? 1 : 0); n++) {
    const i = spot(4);
    if (i === null) continue;
    const it = genItem(s, lvl >= 2 ? { relic: true, noConsumables: true } : {});
    if (it.pre || it.suf) it.tier = Math.min(C.tiers.max, 1 + Math.floor(lvl / 2));
    depots[i] = {
      water: 0,
      fuel: 0,
      items: [it],
      coin: th.coin[0] + Math.floor(r() * (th.coin[1] - th.coin[0] + 1)),
      store: true,
    };
  }
  for (let n = 0; n < th.pools; n++) {
    const i = spot(2);
    if (i !== null) depots[i] = { water: 3, fuel: 0, items: [] };
  }
  // traps in the narrow ways
  const narrow = open.filter((i) => [i + 1, i - 1, i + W, i - W].filter((j) => terrain[j] === FLOOR).length === 2 && !taken(i));
  for (let n = 0; n < th.traps && narrow.length; n++) {
    const i = narrow.splice(Math.floor(r() * narrow.length), 1)[0];
    if (dist[i] > 3) sites[i] = { kind: 'trap', sprung: false };
  }
  const m = { terrain, sites, depots, creatures };
  if (rec.floor) applyQuirk(s, rec, m, r, cid);
  return m;
};
/* ---------- going down and up ---------- */
const needLight = (s, th) => th.dark !== false && stat(s, 'nightSight', 0) <= 0;
function levelRec(s, d, n) {
  const th = themeOf(d);
  return {
    kind: 'deep',
    indoor: true,
    dark: th.dark !== false,
    level: n,
    levels: d.depth,
    deep: d.id,
    theme: d.theme,
    floor: rollQuirk(s, 'deep:' + d.id + ':' + n, n === d.depth),
  };
}
function goLevel(s, d, n) {
  enterArea(s, levelId(d, n), levelRec(s, d, n));
  reveal(s, s.player.x, s.player.y, sightRadius(s), true);
  emit(s, 'levelEntered', { deep: d.id, level: n });
}
// Go down the stair in a cave, a ruin or a cellar.
function enterDeep(s) {
  const st = siteHere(s),
    d = st && st.deep && deepById(s, st.deep);
  if (s.over || !d) return false;
  const th = themeOf(d);
  if (needLight(s, th)) {
    say(s, 'The stair goes down into the dark. You need a light: a lantern with fuel, or a torch.', 'bad');
    return false;
  }
  goLevel(s, d, 1);
  if (!d.entered) {
    d.entered = true;
    gainXp(s, 15);
    say(s, th.name + ': ' + d.name + '. ' + th.text + ' (' + d.depth + (d.depth === 1 ? ' level.)' : ' levels.)'), 'good');
  } else say(s, 'You go down into ' + d.name + '.');
  return true;
}
// Down a stair inside a dungeon (the locked place keeps its own, in quest.js).
LEVELS.deep = (s) => {
  const rec = areaRec(s),
    d = deepById(s, rec.deep),
    st = siteHere(s);
  if (s.over || !d || !st || st.kind !== 'stairsDown') return false;
  if (needLight(s, themeOf(d))) {
    say(s, 'You will not find the next stair without a light.', 'bad');
    return false;
  }
  advance(s, 10, 'rest');
  if (s.over) return true;
  const n = rec.level + 1;
  goLevel(s, d, n);
  say(s, 'Level ' + n + ' of ' + d.depth + (n === d.depth ? '. Something old lives at the bottom of ' + d.name + '.' : '.'));
  return true;
};
// How each level is entered: level 1 from its stair outdoors (or in a town), the rest from the stair down above.
ENTRANCES.push((s, id) => {
  const rec = s.areas[id];
  if (!rec || (rec.kind !== 'deep' && rec.kind !== 'vault')) return null;
  if (rec.level > 1) {
    const up = rec.kind === 'vault' ? 'vault' + (rec.level - 1) : rec.deep + '.' + (rec.level - 1),
      m = s.areas[up] ? mapOf(s, up) : null,
      k = m ? Object.keys(m.sites).find((q) => m.sites[q].kind === 'stairsDown') : undefined;
    return {
      area: up,
      x: k === undefined ? undefined : k % W,
      y: k === undefined ? undefined : Math.floor(k / W),
      act: 'goDown',
    };
  }
  if (rec.kind === 'vault') {
    const v = findSite(s, 'vault');
    return v ? { area: v.area || 'overworld', x: v.x, y: v.y, act: 'enterVault' } : null;
  }
  const d = deepById(s, rec.deep);
  return d && d.x !== undefined ? { area: d.area, x: d.x, y: d.y, act: 'enterDeep' } : null;
});
// The heart of a dungeon is dead: its prize is free, and the dungeon is known for it.
on('killed', (s, ev) => {
  const c = ev.c;
  if (!c || !c.heart) return;
  const d = deepById(s, c.heart);
  if (!d) return;
  d.cleared = true;
  gainXp(s, 40 * d.depth);
  say(s, 'The heart of ' + d.name + ' is dead. ' + themeOf(d).prize, 'good');
});
SOURCES.push({
  id: 'deeps',
  fn(s, out) {
    const rec = areaRec(s);
    if (rec.kind !== 'deep') return;
    for (const m of byId(D().themes, rec.theme).mods || []) out.push(m);
  },
});
ACTIONS.push((s, st, a) => {
  if (s.combat || !st || !st.deep) return;
  const d = deepById(s, st.deep);
  if (!d) return;
  a.push({
    id: 'enterDeep',
    label: 'Go down into ' + d.name,
    hint:
      themeOf(d).name.toLowerCase() +
      ', ' +
      d.depth +
      (d.depth === 1 ? ' level' : ' levels') +
      (themeOf(d).dark === false ? '' : ', needs a light'),
  });
});
on('did', (s, ev) => {
  if (ev.id !== 'move') return;
  const st = siteHere(s);
  if (st && st.deep && !st.deepTold) {
    st.deepTold = true;
    const d = deepById(s, st.deep);
    if (d) say(s, 'A stair goes down here, into the dark: ' + d.name + '.');
  }
});

/* ---------- the view, god mode, the journal ---------- */
// How a level looks: { stone, floor, glow, dark } (the locked place's from its kind of place).
const VAULT_STONE = { castle: 0x6a6660, barrow: 0x5d6a4a, temple: 0x4f6e6c };
function levelLook(s) {
  const rec = areaRec(s);
  for (const f of LOOKS) {
    const l = f(s, rec);
    if (l) return l;
  }
  if (rec.kind === 'vault') return { stone: VAULT_STONE[s.quest.vault.id] || 0x6a6660, floor: 0x3e3a35, dark: true };
  if (rec.kind === 'deep') {
    const th = byId(D().themes, rec.theme);
    return Object.assign({ dark: th.dark !== false }, th.look);
  }
  return null;
}
// The name of the level you are on, for the map screen.
function levelTitle(s) {
  const rec = areaRec(s),
    d = rec.kind === 'deep' ? deepById(s, rec.deep) : null;
  if (rec.kind === 'vault') return 'The ' + s.quest.vault.name + ', level ' + rec.level + ' of ' + rec.levels;
  if (d) return d.name.charAt(0).toUpperCase() + d.name.slice(1) + ', level ' + rec.level + ' of ' + rec.levels;
  const look = levelLook(s);
  if (look && look.title) return look.title;
  return rec.name || 'Here';
}
// Every place below the world: each dungeon's levels, and the locked place's.
PLACES.push((s, out) => {
  const v = findSite(s, 'vault');
  if (v && v.st && v.st.floors)
    v.st.floors.forEach((_, i) =>
      out.push({
        id: 'vault:' + (i + 1),
        group: 'Below',
        label: 'The ' + s.quest.vault.name + ', level ' + (i + 1),
        go: (s) => jumpDown(s, null, i + 1),
      }),
    );
  for (const d of deepsOf(s))
    for (let n = 1; n <= d.depth; n++)
      out.push({
        id: 'deep:' + d.id + ':' + n,
        group: 'Below',
        label: d.name + ' (' + themeOf(d).name.toLowerCase() + '), level ' + n,
        go: (s) => jumpDown(s, d, n),
      });
});
// Straight to level n of a dungeon (d null: the locked place), through the levels above, so the way back up works.
function jumpDown(s, d, n) {
  let door;
  if (!d) {
    const v = findSite(s, 'vault');
    v.st.open = true;
    door = { area: v.area, x: v.x, y: v.y };
  } else {
    door = deepDoor(s, d);
    if (!door) return false;
  }
  const town = townById(s, door.area);
  if (town) {
    const rec = s.areas[town.area || 'overworld'];
    jumpRegion(s, rec.cx, rec.cy, town.x, town.y + 3, town.realm);
    s.player.x = town.x;
    s.player.y = town.y + 3;
    enterArea(s, door.area, { kind: 'town', indoor: true, name: town.name }, { x: door.x, y: door.y });
  } else {
    const rec = s.areas[door.area];
    jumpRegion(s, rec.cx, rec.cy, door.x, door.y, rec.realm); // a dungeon may be in another world
  }
  s.player.x = door.x;
  s.player.y = door.y;
  for (let k = 1; k <= n; k++) {
    if (!d) {
      enterArea(s, 'vault' + k, {
        kind: 'vault',
        indoor: true,
        dark: true,
        level: k,
        levels: findSite(s, 'vault').st.floors.length,
        floor: findSite(s, 'vault').st.floors[k - 1],
      });
    } else enterArea(s, levelId(d, k), levelRec(s, d, k));
    if (k < n) {
      const down = Object.keys(s.sites).find((q) => s.sites[q].kind === 'stairsDown');
      if (down !== undefined) {
        s.player.x = down % W;
        s.player.y = Math.floor(down / W);
      }
    }
  }
  reveal(s, s.player.x, s.player.y, sightRadius(s), true);
  return true;
}
// Where a dungeon's stair stands ({ area, x, y }), building its map if need be.
function deepDoor(s, d) {
  if (d.x === undefined) {
    const t = townById(s, d.area);
    if (t) withTown(s, t, () => mapOf(s, d.area));
    else {
      const rec = s.areas[d.area],
        o = d.area.match(/^(o\d+):r(\d+)_(\d+)$/),
        c = d.area.match(/^r(\d+)_(\d+)$/);
      if (o)
        return withRealm(
          s,
          o[1],
          () => (ensureRegion(s, +o[2], +o[3]), d.x === undefined ? null : { area: d.area, x: d.x, y: d.y }),
        );
      if (!rec && c) {
        const cx = +c[1],
          cy = +c[2];
        s.areas[d.area] = { id: d.area, kind: 'region', cx, cy, biome: sketchOf(s, cx, cy).biome };
      }
      if (s.areas[d.area]) buildArea(s, s.areas[d.area]);
    }
  }
  return d.x === undefined ? null : { area: d.area, x: d.x, y: d.y };
}
NOTES.push((s) => {
  const known = deepsOf(s).filter((d) => d.entered);
  return known.length
    ? [
        {
          label: 'Below',
          text:
            known
              .map(
                (d) =>
                  d.name + ' (' + themeOf(d).name.toLowerCase() + ', ' + d.depth + (d.cleared ? ', its heart dead' : '') + ')',
              )
              .join('; ') + '.',
        },
      ]
    : [];
});
SWITCHES.push(['deeps', 'Dungeons (new worlds)']);

export {
  rollDeeps,
  placeStairs,
  levelTitle,
  deepsOf,
  deepById,
  levelId,
  levelLook,
  levelRec,
  enterDeep,
  jumpDown,
  deepDoor,
  themeOf,
  LAYOUTS,
};
