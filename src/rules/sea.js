/* The sea (content/sea.js): seas, lakes, boats, breathing water, and the places on and under the water.
   Seas are whole regions: a SKETCHER turns a patch of neighbouring regions far from home into the biome 'sea' before
   any land is made, so their neighbours blend into marsh and shallows at the coast. As a sea region is built, its low
   ground away from the high land becomes DEEP water; lakes are carved into about one other region in four.
   DEEP is a ground of its own: no one walks on it without a boat (carried: a coracle), a way to breathe water (a
   diving helm, a draught of gills) or wings. s.player.swims says whether you can go on it now, kept up to date
   whenever you act, so that `passable` stays cheap.
   Places (s.seaPlaces): a floating town, wrecks, merfolk halls and sea caves in seas, a drowned shrine in some lakes,
   each made when its region is built (ids from the region, so the order you explore in changes nothing). Their levels
   are areas of kind 'sea' (ids '<place id>.<level>'), built when first reached. A place under the water needs a way
   to breathe; without one, under water or swimming in deep water, you drown a little every hour.
   Switch: s.off.sea (at creation: no seas, no lakes). */
import { C, H, W, WALL, FLOOR, VOID, DEEP, byId, clamp, emit, idx, on, say, stream } from './core.js';
import './worldgen.js';
import {
  GENERATORS,
  allTowns,
  areaRec,
  ensureRegion,
  enterArea,
  inOverworld,
  regionId,
  sketchOf,
  townArea,
  wrap,
} from './areas.js';
import { makeCreature } from './combat.js';
import { genItem, makeItem } from './items.js';
import { reveal, sightRadius, siteHere, SITE_NAME } from './map.js';
import { gainXp } from './progress.js';
import { stat, SOURCES } from './stats.js';
import { SYSTEMS } from './systems.js';
import { ACTIONS, COSTS, LEVELS, LOOKS, NOTES, PLACES, SKETCHERS, SWITCHES } from './hooks.js';
import { genOf } from './worldset.js';
import { jumpRegion } from './godmode.js';
import { LAYOUTS as DEEP_LAYOUTS } from './deeps.js';

const S = () => C.sea;
if (!byId(C.biomes, 'sea')) C.biomes.push(S().biome);
C.creature.prefix.sea = S().prefix;
for (const b of S().items) if (!byId(C.bases, b.id)) C.bases.push(Object.assign({}, b));
Object.assign(C.value, S().value);
Object.assign(SITE_NAME, { seaplace: 'place in the water' });
// the traders of places under and on the water (the cloud city's trader code finds them here)
S().traders = Object.fromEntries(
  S()
    .kinds.filter((k) => k.trader)
    .map((k) => [k.id, k.trader]),
);
const kindOf = (id) => byId(S().kinds, id);
const placesOf = (s) => s.seaPlaces || [];
const placeById = (s, id) => placesOf(s).find((p) => p.id === id) || null;
const hasBoat = (s) => s.player.items.some((i) => byId(C.bases, i.base).boat);
const breathes = (s) => stat(s, 'breathe', 0) > 0 || (s.breatheUntil || 0) > s.time;
// Can the traveller go on deep water now? Kept in s.player.swims, so passable() need not work it out each time.
function updateSwim(s) {
  if (!s.player) return;
  const ok = hasBoat(s) || breathes(s);
  if (ok) s.player.swims = true;
  else delete s.player.swims;
}
on('did', (s) => updateSwim(s));
SOURCES.push({
  id: 'sea',
  fn(s, out) {
    if ((s.breatheUntil || 0) > s.time) out.push({ stat: 'breathe', op: 'add', value: 1 });
  },
});

/* ---------- seas, chosen before the land is made ---------- */
SKETCHERS.push((seed, world, off, set) => {
  if (off.sea) return;
  const r = stream(seed, 'sea'),
    chance = set ? set.sea : S().chance;
  if (!(r() < (chance === undefined ? 0.4 : chance))) return;
  const at = (cx, cy) => world.sketch[cy * world.cols + cx],
    far = [];
  for (let cy = 0; cy < world.rows; cy++)
    for (let cx = 0; cx < world.cols; cx++) if (at(cx, cy).danger >= 2) far.push({ cx, cy });
  if (!far.length) return; // a small world has no room for a sea away from the story's places
  const [lo, hi] = S().regions,
    want = lo + Math.floor(r() * (hi - lo + 1)),
    start = far[Math.floor(r() * far.length)],
    patch = [start];
  for (let t = 0; t < 40 && patch.length < want; t++) {
    const p = patch[Math.floor(r() * patch.length)],
      d = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ][Math.floor(r() * 4)],
      q = { cx: wrap(p.cx + d[0], world.cols), cy: wrap(p.cy + d[1], world.rows) };
    if (at(q.cx, q.cy).danger >= 2 && !patch.some((o) => o.cx === q.cx && o.cy === q.cy)) patch.push(q);
  }
  for (const p of patch) {
    at(p.cx, p.cy).biome = 'sea';
    at(p.cx, p.cy).sea = true;
  }
  world.sea = patch.length;
});

/* ---------- deep water, as a region is built ---------- */
// Chebyshev distance from each tile to the nearest tile that passes `isLand`, up to `most`.
function distTo(terrain, isLand, most) {
  const d = new Array(W * H).fill(most);
  for (let i = 0; i < W * H; i++) if (isLand(terrain[i])) d[i] = 0;
  for (let pass = 0; pass < most; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (d[i] <= pass) continue;
        for (let j = -1; j <= 1; j++)
          for (let k = -1; k <= 1; k++) {
            const xx = x + k,
              yy = y + j;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && d[idx(xx, yy)] === pass) d[i] = Math.min(d[i], pass + 1);
          }
      }
  return d;
}
function flood(m, deep) {
  for (const i of deep) {
    m.terrain[i] = DEEP;
    m.elev[i] = -1.2;
    if (m.road) delete m.road[i];
    const st = m.sites[i];
    if (st && !st.plot && !st.deep) delete m.sites[i];
  }
  m.creatures = m.creatures.filter((c) => m.terrain[idx(c.x, c.y)] !== DEEP || c.plot || c.key || c.lair);
}
function seaRegion(s, rec, m) {
  // the open sea: everything two tiles or more from high ground, except the outermost ring (borders stay shallow, so
  // a neighbour's river or road is never cut off at the edge)
  const d = distTo(m.terrain, (t) => t === 1 || t === 2, 3),
    deep = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (d[idx(x, y)] >= 2) deep.push(idx(x, y));
  flood(m, deep);
  // never a region with no fresh water at all: if the sea took the sure spring, a rock with a rain-pool in the middle
  if (!Object.values(m.sites).some((st) => st.sure)) {
    for (let y = 16; y <= 20; y++)
      for (let x = 16; x <= 20; x++) {
        const edge = x === 16 || x === 20 || y === 16 || y === 20;
        m.terrain[idx(x, y)] = edge ? 5 : 0;
        m.elev[idx(x, y)] = edge ? -0.15 : 0;
      }
    m.sites[idx(18, 18)] = { kind: 'spring', foul: false, known: false, sure: true };
  }
}
function lake(s, rec, m, r) {
  // a lake in low open ground: deep in the middle, wadeable sweet water round its edge
  for (let tries = 0; tries < 30; tries++) {
    const cx = 8 + Math.floor(r() * (W - 16)),
      cy = 8 + Math.floor(r() * (H - 16)),
      rad = 2.5 + r() * 2.5;
    let ok = true;
    for (let y = cy - 6; y <= cy + 6 && ok; y++)
      for (let x = cx - 6; x <= cx + 6 && ok; x++) {
        const st = m.sites[idx(x, y)];
        if (st && (st.sure || st.plot || st.kind === 'town' || st.kind === 'vault' || st.deep || st.kind === 'hamlet'))
          ok = false;
      }
    // never over a creature that matters (the beast with the key, a lair's keeper, a plot's)
    if (m.creatures.some((c) => (c.key || c.lair || c.plot) && Math.max(Math.abs(c.x - cx), Math.abs(c.y - cy)) <= 7)) ok = false;
    if (!ok || m.terrain[idx(cx, cy)] === 2) continue;
    const deep = [];
    for (let y = cy - 6; y <= cy + 6; y++)
      for (let x = cx - 6; x <= cx + 6; x++) {
        const dd = Math.hypot(x - cx, y - cy) * (0.85 + 0.3 * r());
        if (dd < rad) deep.push(idx(x, y));
        else if (dd < rad + 1.3 && m.terrain[idx(x, y)] !== 2) {
          m.terrain[idx(x, y)] = 4;
          m.elev[idx(x, y)] = -0.5;
        }
      }
    flood(m, deep);
    return { x: cx, y: cy };
  }
  return null;
}
// Where a place of the water stands: a deep-water tile (or, for a sea cave, a shore tile beside deep water).
function waterSpot(m, r, coast) {
  const opts = [];
  for (let y = 3; y < H - 3; y++)
    for (let x = 3; x < W - 3; x++) {
      const i = idx(x, y),
        t = m.terrain[i],
        nearDeep = [i + 1, i - 1, i + W, i - W].some((j) => m.terrain[j] === DEEP);
      if (m.sites[i]) continue;
      if (coast ? t !== DEEP && t !== 2 && t < 6 && nearDeep : t === DEEP) opts.push(i);
    }
  return opts.length ? opts[Math.floor(r() * opts.length)] : null;
}
function addPlace(s, rec, m, r, kind, n, at) {
  const kd = kindOf(kind),
    i = at !== undefined ? at : waterSpot(m, r, kd.coast);
  if (i === null) return;
  const used = placesOf(s).map((p) => p.name),
    free = kd.names.filter((nm) => !used.includes(nm)),
    p = {
      id: 'w_' + rec.id + '_' + n,
      kind,
      name: (free.length ? free : kd.names)[Math.floor(r() * (free.length || kd.names.length))],
      area: rec.id,
      x: i % W,
      y: Math.floor(i / W),
      levels: kd.levels,
    };
  (s.seaPlaces = s.seaPlaces || []).push(p);
  m.sites[i] = { kind: 'seaplace', place: p.id };
}
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    if (s.off.sea || (s.gen && s.gen.sea === 0)) return m;
    const r = stream(s.seed, 'sea:' + rec.id);
    if (rec.biome === 'sea') {
      seaRegion(s, rec, m);
      let n = 0;
      if (seaPlan(s).raft === rec.id) addPlace(s, rec, m, r, 'raft', n++);
      if (r() < 0.7) addPlace(s, rec, m, r, 'wreck', n++);
      if (r() < 0.45) addPlace(s, rec, m, r, 'merhall', n++);
      if (r() < 0.5) addPlace(s, rec, m, r, 'seacave', n++);
    } else if (r() < S().lakeChance && byId(C.biomes, rec.biome).river.drink && rec.id !== 'overworld') {
      const c = lake(s, rec, m, r);
      if (c && r() < 0.35) addPlace(s, rec, m, r, 'drowned', 0, idx(c.x, c.y));
    }
    return m;
  };
}
// Which sea region holds the floating town: worked out the first time anyone asks (a sea region may be built by
// another piece before this one hears that the world is born).
function seaPlan(s) {
  if (!s.seaPlan && s.world.sea) {
    const r = stream(s.seed, 'sea:plan'),
      seas = seaIds(s);
    s.seaPlan = { raft: seas[Math.floor(r() * seas.length)] };
  }
  return s.seaPlan || {};
}
const seaIds = (s) => {
  const out = [];
  for (let cy = 0; cy < s.world.rows; cy++)
    for (let cx = 0; cx < s.world.cols; cx++) if (sketchOf(s, cx, cy).sea) out.push(regionId(s, cx, cy));
  return out;
};
on('worldBorn', (s, ev) => {
  if (ev.off.sea || !s.world.sea) return;
  seaPlan(s);
  const seas = seaIds(s);
  // the town nearest the sea sells a coracle and draughts of gills
  const towns = allTowns(s);
  let best = towns[0],
    bd = 1e9;
  for (const t of towns) {
    const a = s.areas[townArea(s, t)];
    if (!a) continue;
    for (const id of seas) {
      const [cx, cy] = id.slice(1).split('_').map(Number),
        dd = Math.abs(cx - a.cx) + Math.abs(cy - a.cy);
      if (dd < bd) {
        bd = dd;
        best = t;
      }
    }
  }
  for (const b of S().shop) best.stock.push(makeItem(s, b, null, null, true));
  s.seaShop = best.id || 'town';
});

/* ---------- moving on deep water ---------- */
COSTS.push((s, x, y, mc) => {
  if (s.terrain[idx(x, y)] !== DEEP || s.player.aloft) return mc;
  // by boat it is paddling; without one you walk along the bottom, slowly
  return hasBoat(s) ? mc : { mins: mc.mins * 2, cost: mc.cost * 1.5, base: mc.base };
});
SYSTEMS.push({
  id: 'breath',
  fn(s, dt) {
    if (!s.player || s.over) return;
    updateSwim(s);
    const rec = areaRec(s),
      under = rec.kind === 'sea' && kindOf(rec.place).under,
      swimming = inOverworld(s) && s.terrain[idx(s.player.x, s.player.y)] === DEEP && !s.player.aloft && !hasBoat(s);
    if (!(under || swimming) || breathes(s) || s.godMode) return;
    const p = s.player;
    p.hp -= S().drown * dt;
    if (!s.warn.drown) {
      s.warn.drown = true;
      say(s, 'You have no breath left down here. Get out, or find air.', 'bad');
    }
    if (p.hp <= 0) {
      p.hp = 0;
      s.over = { won: false, cause: 'drowned' };
      say(s, 'The water closes over you. The land keeps you, in its way.', 'bad');
    }
  },
});
on('did', (s) => {
  if (s.warn && s.warn.drown && (breathes(s) || areaRec(s).kind !== 'sea')) s.warn.drown = false;
});

/* ---------- the places: on the water and under it ---------- */
const blank = (v) => new Array(W * H).fill(v);
const LAYOUTS = {
  raft(r) {
    // boats lashed together: decks of floor, with water (VOID) between, joined by planks
    const t = blank(VOID);
    for (let by = 8; by < 28; by += 5)
      for (let bx = 8; bx < 28; bx += 5) {
        if (r() < 0.2 && !(bx === 18 && by === 18)) continue;
        for (let y = by; y < by + 3; y++) for (let x = bx; x < bx + 4; x++) t[idx(x, y)] = FLOOR;
      }
    for (let y = 9; y < 28; y++) t[idx(18, y)] = FLOOR;
    for (let x = 9; x < 28; x++) t[idx(x, 19)] = FLOOR;
    return t;
  },
  halls: DEEP_LAYOUTS.halls,
  rooms: DEEP_LAYOUTS.rooms,
  caves: DEEP_LAYOUTS.caves,
};
function reach(t, start) {
  const d = blank(-1),
    q = [start];
  d[start] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const j of [i + 1, i - 1, i + W, i - W]) {
      if (j < 0 || j >= W * H || Math.abs((j % W) - (i % W)) > 1) continue;
      if (t[j] === FLOOR && d[j] < 0) {
        d[j] = d[i] + 1;
        q.push(j);
      }
    }
  }
  return d;
}
function seaSpecies(s, kd, r) {
  const all = (s.seaSpecies = s.seaSpecies || {});
  if (!all[kd.id] && kd.forms.length) {
    all[kd.id] = kd.forms.map((f) => {
      s.species.push({
        name: kd.creature[Math.floor(r() * kd.creature.length)] + ' ' + byId(C.creature.forms, f).name,
        form: f,
        temper: 'territorial',
        rare: null,
        met: false,
      });
      return s.species.length - 1;
    });
  }
  return all[kd.id] || [];
}
GENERATORS.sea = (s, rec) => {
  const p = placeById(s, rec.water),
    kd = kindOf(p.kind),
    r = stream(s.seed, 'area:' + rec.id),
    lvl = rec.level,
    last = lvl === rec.levels;
  const terrain = LAYOUTS[kd.layout](r);
  let start = -1;
  for (let rad = 0; rad < W && start < 0; rad++)
    for (let j = -rad; j <= rad && start < 0; j++)
      for (let i = -rad; i <= rad && start < 0; i++)
        if (terrain[idx(18 + i, 26 + j - (kd.layout === 'raft' ? 0 : 8))] === FLOOR)
          start = idx(18 + i, 26 + j - (kd.layout === 'raft' ? 0 : 8));
  if (start < 0) {
    start = idx(18, 18);
    terrain[start] = FLOOR;
  }
  const dist = reach(terrain, start),
    gap = kd.layout === 'raft' ? VOID : WALL;
  for (let i = 0; i < W * H; i++) if (terrain[i] === FLOOR && dist[i] < 0) terrain[i] = gap;
  const open = [];
  for (let i = 0; i < W * H; i++) if (dist[i] >= 0) open.push(i);
  const far = open.reduce((a, b) => (dist[b] > dist[a] ? b : a), start),
    sites = {},
    depots = {},
    creatures = [],
    taken = (i) => sites[i] || depots[i] || i === start || creatures.some((c) => idx(c.x, c.y) === i),
    spot = (minD) => {
      for (let t = 0; t < 80; t++) {
        const i = open[Math.floor(r() * open.length)];
        if (!taken(i) && dist[i] >= minD) return i;
      }
      return null;
    };
  const up = [start - W, start + W, start - 1, start + 1].find((i) => terrain[i] === FLOOR) || start;
  sites[up] = { kind: lvl === 1 ? 'exit' : 'stairsUp' };
  rec.entry = { x: start % W, y: Math.floor(start / W) };
  if (!last) sites[far] = { kind: 'stairsDown' };
  const sp = seaSpecies(s, kd, r);
  let cid = 40000 + (Math.abs(hashId(p.id)) % 500) * 40 + lvl * 8;
  for (let n = 0; sp.length && n < kd.per; n++) {
    const i = spot(5);
    if (i !== null)
      creatures.push(makeCreature(s, cid++, sp[Math.floor(r() * sp.length)], i % W, Math.floor(i / W), kd.tier + lvl - 1));
  }
  if (last && kd.prize) {
    const it = genItem(s, { relic: true, noConsumables: true });
    if (it.pre || it.suf) it.tier = Math.min(C.tiers.max, 2 + (kd.levels > 1 ? 1 : 0));
    depots[far] = { water: 0, fuel: 0, items: [it], coin: 25 + 15 * kd.levels, store: true, seaPrize: p.id };
  }
  if (kd.trader) {
    const i = open
      .filter((j) => !taken(j))
      .sort((a, b) => Math.hypot((a % W) - 18, Math.floor(a / W) - 18) - Math.hypot((b % W) - 18, Math.floor(b / W) - 18))[0];
    if (i !== undefined) sites[i] = { kind: 'trader', place: kd.id, seen: true };
    const w = spot(2);
    if (w !== null) sites[w] = { kind: 'well', seen: true };
  }
  const m = { terrain, sites, depots, creatures };
  emit(s, 'seaBuilt', { place: p.id, level: lvl, map: m, r });
  return m;
};
const hashId = (t) => {
  let h = 7;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return h;
};
function seaLevelRec(p, n) {
  const kd = kindOf(p.kind);
  return { kind: 'sea', indoor: true, dark: !!kd.dark, level: n, levels: p.levels, place: p.kind, water: p.id };
}
function goSea(s, p, n) {
  enterArea(s, p.id + '.' + n, Object.assign(seaLevelRec(p, n), { place: p.kind, water: p.id }));
  areaRec(s).place = p.kind;
  reveal(s, s.player.x, s.player.y, sightRadius(s), true);
}
// Into a place of the water from its site: under needs breath, afloat needs you to be on the water already.
function enterWater(s) {
  const st = siteHere(s),
    p = st && st.kind === 'seaplace' && placeById(s, st.place);
  if (s.over || !p) return false;
  const kd = kindOf(p.kind);
  if (kd.under && !breathes(s) && !s.godMode) {
    say(s, 'It lies under the water. You need a way to breathe there: a diving helm, or a draught of gills.', 'bad');
    return false;
  }
  if (kd.dark && stat(s, 'nightSight', 0) <= 0) {
    say(s, 'It is black down there. You need a light.', 'bad');
    return false;
  }
  if (s.player.aloft) s.player.aloft = false;
  goSea(s, p, 1);
  if (!p.reached) {
    p.reached = true;
    gainXp(s, 30);
    say(s, kd.name + ': ' + p.name + '. ' + kd.text, 'good');
  } else say(s, 'You go into ' + p.name + '.');
  return true;
}
LEVELS.sea = (s) => {
  const rec = areaRec(s),
    p = placeById(s, rec.water),
    st = siteHere(s);
  if (s.over || !p || !st || st.kind !== 'stairsDown') return false;
  goSea(s, p, rec.level + 1);
  say(s, 'Deeper into ' + p.name + ': ' + (rec.level + 1) + ' of ' + p.levels + '.');
  return true;
};
ACTIONS.push((s, st, a) => {
  if (s.combat || !st || st.kind !== 'seaplace') return;
  const p = placeById(s, st.place);
  if (!p) return;
  const kd = kindOf(p.kind);
  a.push({
    id: 'enterWater',
    label: (kd.under ? 'Dive down to ' : 'Climb aboard ') + p.name,
    hint: kd.name.toLowerCase() + (kd.under ? ', needs a way to breathe' : ''),
    air: !kd.under,
  });
});
on('did', (s, ev) => {
  if (ev.id !== 'move') return;
  const st = siteHere(s);
  if (st && st.kind === 'seaplace' && !st.told) {
    st.told = true;
    st.seen = true;
    const p = placeById(s, st.place),
      kd = p && kindOf(p.kind);
    if (kd) say(s, kd.under ? 'Below you in the water, something: ' + p.name + '.' : 'Ahead on the water: ' + p.name + '.');
  }
});

/* ---------- the view, god mode, the journal ---------- */
LOOKS.push((s, rec) => {
  if (rec.kind !== 'sea') return null;
  const p = placeById(s, rec.water),
    kd = kindOf(rec.place);
  return Object.assign(
    { dark: !!kd.dark, ceiling: false, title: p ? p.name + (p.levels > 1 ? ', ' + rec.level + ' of ' + p.levels : '') : kd.name },
    kd.look,
  );
});
PLACES.push((s, out) => {
  // the sea's places are made with their regions: god mode makes them all, to list them
  for (const id of seaIds(s)) {
    const [cx, cy] = id === 'overworld' ? [s.world.home.cx, s.world.home.cy] : id.slice(1).split('_').map(Number);
    ensureRegion(s, cx, cy);
  }
  for (const p of placesOf(s))
    for (let n = 1; n <= p.levels; n++)
      out.push({
        id: 'sea:' + p.id + ':' + n,
        group: 'Water',
        label: p.name + ' (' + kindOf(p.kind).name.toLowerCase() + ')' + (p.levels > 1 ? ', level ' + n : ''),
        go: (s) => {
          const rec = s.areas[p.area];
          jumpRegion(s, rec.cx, rec.cy, p.x, p.y);
          s.player.x = p.x;
          s.player.y = p.y;
          for (let k = 1; k <= n; k++) {
            goSea(s, p, k);
            if (k < n) {
              const d = Object.keys(s.sites).find((q) => s.sites[q].kind === 'stairsDown');
              if (d !== undefined) {
                s.player.x = d % W;
                s.player.y = Math.floor(d / W);
              }
            }
          }
          return true;
        },
      });
});
NOTES.push((s) => {
  if (!s.world.sea) return [];
  return [
    {
      label: 'The sea',
      text:
        'A sea covers ' +
        s.world.sea +
        (s.world.sea === 1 ? ' region' : ' regions') +
        ' of this world. Deep water needs a boat, a way to breathe it, or wings.' +
        (s.seaShop ? ' The town nearest the sea sells coracles and draughts of gills.' : ''),
    },
  ];
});
SWITCHES.push(['sea', 'Seas, lakes and the deep (new worlds)']);

export { placesOf as seaPlacesOf, placeById as seaPlaceById, enterWater, hasBoat, breathes, updateSwim };
