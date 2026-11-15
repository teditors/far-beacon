/* World generation. */
import { makeChar, spawn } from './character.js';
import { AXES } from './civ.js';
import { makeSpecies, placeCreatures, speciesFor } from './combat.js';
import { GENERATORS, HOME, sketchOf } from './areas.js';
import { makeSketch, worldNoise } from './world.js';
import { C, H, VERSION, W, byId, clamp, idx, say, stream } from './core.js';
import { makeItem } from './items.js';
import { dirTo } from './map.js';
import { makeQuest } from './quest.js';

/* Pieces shared by the home region and every other region */

// Landforms for one region, read off the world-wide noise so that neighbours line up.
function genTerrain(seed, world, cx, cy, biome, rT) {
  const n1 = worldNoise(seed, world, 5, 1),
    n2 = worldNoise(seed, world, 11, 2),
    n3 = worldNoise(seed, world, 8, 3),
    gx0 = cx * W,
    gy0 = cy * H,
    hts = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) hts.push(n1(gx0 + x, gy0 + y) * 0.65 + n2(gx0 + x, gy0 + y) * 0.3 + rT() * 0.05);
  const sorted = hts.slice().sort((a, b) => a - b),
    q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
  const mT = q(1 - biome.mountains),
    hT = q(1 - biome.mountains - biome.hills);
  const terrain = hts.map((h) => (h >= mT ? 2 : h >= hT ? 1 : 0)),
    elev = terrain.slice();
  const lowT = q(biome.special.frac * (1 - biome.mountains - biome.hills) * 1.0),
    fT = 1 - biome.forest.frac * 1.6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (terrain[i] === 0 && hts[i] <= lowT) {
        terrain[i] = 5;
        elev[i] = -0.15;
      } else if (terrain[i] < 2 && n3(gx0 + x, gy0 + y) * 0.7 + n2(gx0 + x + 9, gy0 + y + 5) * 0.3 > fT * 0.72 + 0.14)
        terrain[i] = 3;
    }
  for (let k = 0; k < biome.river.count; k++) {
    // rivers run downhill from high ground until they reach low ground or the region's edge
    let best = -1,
      bh = -1;
    for (let tries = 0; tries < 40; tries++) {
      const x = 4 + Math.floor(rT() * (W - 8)),
        y = 2 + Math.floor(rT() * (H - 4)),
        i = idx(x, y);
      if (hts[i] > bh && terrain[i] !== 4) {
        bh = hts[i];
        best = i;
      }
    }
    let cx2 = best % W,
      cy2 = Math.floor(best / W);
    const seenR = {};
    for (let step = 0; step < 70; step++) {
      const i = idx(cx2, cy2);
      seenR[i] = 1;
      if (terrain[i] !== 2) {
        if (terrain[i] === 5 && step > 6) break;
        terrain[i] = 4;
        elev[i] = -0.5;
      }
      let nb = null,
        nh = 9;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = cx2 + dx,
          yy = cy2 + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) {
          nb = 'edge';
          nh = -1;
          break;
        }
        const j = idx(xx, yy);
        if (seenR[j]) continue;
        const hh = hts[j] + rT() * 0.035;
        if (hh < nh) {
          nh = hh;
          nb = [xx, yy];
        }
      }
      if (!nb || nb === 'edge') break;
      cx2 = nb[0];
      cy2 = nb[1];
    }
  }
  return { terrain, elev };
}
// Scatters sites across west-to-east bands so no stretch of a region is empty, keeping them apart.
function makePlacer(rS, terrain, sites) {
  const free = (x, y) => {
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const xx = x + i,
          yy = y + j;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && sites[idx(xx, yy)]) return false;
      }
    return true;
  };
  return function place(n, mk, want) {
    for (let k = 0; k < n; k++) {
      const x0 = 3 + Math.floor((k * (W - 6)) / n),
        x1 = 3 + Math.floor(((k + 1) * (W - 6)) / n);
      for (let tries = 0; tries < 300; tries++) {
        const x = x0 + Math.floor(rS() * Math.max(1, x1 - x0)),
          y = clamp(1 + Math.floor((((k % 2) + rS()) * (H - 2)) / 2), 1, H - 2),
          t = terrain[idx(x, y)];
        if (t === 2 || t >= 4 || !free(x, y)) continue;
        if (want !== undefined && t !== want && tries < 150) continue;
        sites[idx(x, y)] = mk();
        break;
      }
    }
  };
}
// What the lost people's habits and doom do to a region's sites. Returns the paved road, if they built one.
function finishSites(sites, habit, doom, rR) {
  const ruinTiles = Object.keys(sites)
      .filter((k) => sites[k].kind === 'ruin')
      .map(Number)
      .sort((a, b) => (a % W) - (b % W)),
    road = {};
  if (habit.roads)
    for (let k = 0; k + 1 < ruinTiles.length; k++) {
      let x = ruinTiles[k] % W,
        y = Math.floor(ruinTiles[k] / W);
      const tx = ruinTiles[k + 1] % W,
        ty = Math.floor(ruinTiles[k + 1] / W);
      road[idx(x, y)] = 1;
      while (x !== tx || y !== ty) {
        if (x !== tx && (y === ty || rR() < Math.abs(tx - x) / (Math.abs(tx - x) + Math.abs(ty - y)))) x += Math.sign(tx - x);
        else y += Math.sign(ty - y);
        road[idx(x, y)] = 1;
      }
    }
  for (const k in sites) {
    const st = sites[k];
    if (st.kind === 'cache' && doom.emptyCaches) {
      st.fuel = 0;
      st.water = 0;
      st.loot = false;
    }
    if (st.kind === 'spring' && doom.foulSprings)
      for (const rt of ruinTiles)
        if (Math.max(Math.abs((rt % W) - (k % W)), Math.abs(Math.floor(rt / W) - Math.floor(k / W))) <= doom.foulSprings)
          st.foul = true;
  }
  return road;
}
const cacheSite = (rS) => () => ({
  kind: 'cache',
  searched: false,
  loot: rS() < 0.5,
  fuel: 1 + Math.floor(rS() * 3),
  water: 1 + Math.floor(rS() * 3),
});

/* Every region except the home one: wild country with water, ruins, shelter and creatures, and no quest places. */
GENERATORS.region = (s, rec) => {
  const biome = byId(C.biomes, rec.biome),
    tag = ':' + rec.id,
    rT = stream(s.seed, 'terrain' + tag),
    rS = stream(s.seed, 'sites' + tag),
    habit = byId(C.civ.habit, s.civ.habit),
    age = byId(C.civ.age, s.civ.age),
    doom = byId(C.civ.doom, s.civ.doom),
    danger = sketchOf(s, rec.cx, rec.cy).danger,
    { terrain, elev } = genTerrain(s.seed, s.world, rec.cx, rec.cy, biome, rT),
    sites = {},
    place = makePlacer(rS, terrain, sites);
  // sure water near the middle, so crossing a region is never a blind gamble
  for (let rad = 0, done = false; rad < 6 && !done; rad++)
    for (let j = -rad; j <= rad && !done; j++)
      for (let i = -rad; i <= rad && !done; i++) {
        const k = idx(18 + i, 18 + j);
        if (terrain[k] === 2 || terrain[k] >= 4) continue;
        sites[k] = { kind: 'spring', foul: false, known: false, sure: true };
        done = true;
      }
  place(biome.springs + 2, () => ({ kind: 'spring', foul: rS() < biome.foul, known: false }), 0);
  place(Math.max(2, age.ruins - 2), () => ({ kind: 'ruin', searched: false }), habit.onHills ? 1 : 0);
  place(3, () => ({ kind: 'cave', searched: false, loot: rS() < 0.4 }), 1);
  place(3, cacheSite(rS));
  const road = finishSites(sites, habit, doom, stream(s.seed, 'roads' + tag)),
    map = { terrain, elev, sites, road, creatures: [] };
  placeCreatures(s, stream(s.seed, 'creatures' + tag), map, {
    count: C.creature.count - 2,
    species: speciesFor(s, rec.biome),
    far: () => 0,
    avoid: (x, y) => x < 3 || y < 3 || x > W - 4 || y > H - 4, // never right at a border, where you arrive
    tier: () => clamp(1 + danger, 1, 3),
  });
  return map;
};

/* World generation */
function newGame(seed) {
  seed = seed >>> 0 || 1;
  // Each part of the world draws from its own named random stream, so adding a new step to one part
  // never reshuffles the others: a seed keeps its terrain when, say, a new kind of site is added.
  const rnd = (name) => stream(seed, name),
    rT = rnd('terrain'),
    rL = rnd('layout'),
    rV = rnd('vault'),
    rS = rnd('sites'),
    rR = rnd('roads'),
    rRun = rnd('run'),
    rW = rnd('weather'),
    rO = rnd('offer'),
    pickWith = (rng) => (a) => a[Math.floor(rng() * a.length)];
  const biome = pickWith(rnd('biome'))(C.biomes),
    god = pickWith(rnd('god'))(C.gods),
    civ = {};
  {
    const pick = pickWith(rnd('people'));
    for (const ax of AXES) civ[ax] = pick(C.civ[ax]).id;
    const st = byId(C.civ.style, civ.style);
    civ.name = pick(st.a) + pick(st.b) + pick(st.c);
  }
  const habit = byId(C.civ.habit, civ.habit),
    age = byId(C.civ.age, civ.age),
    doom = byId(C.civ.doom, civ.doom);
  const world = makeSketch(seed, C.tun.world.cols, C.tun.world.rows, biome.id),
    { terrain, elev } = genTerrain(seed, world, world.home.cx, world.home.cy, biome, rT);
  // You start in the middle. The town, the locked place and the beacon lie in three different directions.
  const sx = 17 + Math.floor(rL() * 3),
    sy = 17 + Math.floor(rL() * 3),
    a0 = rL() * 6.283;
  const polar = (ang, rad) => ({
    x: clamp(Math.round(sx + Math.cos(ang) * rad), 2, W - 3),
    y: clamp(Math.round(sy + Math.sin(ang) * rad), 2, H - 3),
  });
  const townP = polar(a0, 6 + rL() * 2),
    vaultP = polar(a0 + 1.9 + (rL() - 0.5) * 0.5, 10 + rL() * 2),
    goalP = polar(a0 + 3.9 + (rL() - 0.5) * 0.5, 11 + rL() * 2),
    gx = goalP.x,
    gy = goalP.y;
  for (const pt of [{ x: sx, y: sy }, townP, vaultP, goalP]) {
    const i = idx(pt.x, pt.y);
    terrain[i] = 0;
    elev[i] = 0;
  }
  const sites = {};
  sites[idx(sx, sy)] = { kind: 'well', seen: true };
  sites[idx(gx, gy)] = { kind: 'beacon' };
  sites[idx(townP.x, townP.y)] = { kind: 'town' };
  {
    const F = C.quest.floors;
    sites[idx(vaultP.x, vaultP.y)] = {
      kind: 'vault',
      open: false,
      floors: [F[Math.floor(rV() * F.length)], F[Math.floor(rV() * F.length)], 'guard'],
    };
  }
  const place = makePlacer(rS, terrain, sites);
  // A spring is guaranteed partway along each leg of the quest, so no leg is a blind gamble on water.
  for (const [a, b] of [
    [townP, vaultP],
    [vaultP, goalP],
    [{ x: sx, y: sy }, goalP],
  ]) {
    const mx = Math.round((a.x + b.x) / 2),
      my = Math.round((a.y + b.y) / 2);
    for (let rad = 0; rad < 4; rad++) {
      let done = false;
      for (let j = -rad; j <= rad && !done; j++)
        for (let i = -rad; i <= rad && !done; i++) {
          const x = clamp(mx + i, 1, W - 2),
            y = clamp(my + j, 1, H - 2),
            k = idx(x, y);
          if (terrain[k] === 2 || terrain[k] >= 4 || sites[k]) continue;
          sites[k] = { kind: 'spring', foul: false, known: false, sure: true };
          done = true;
        }
      if (done) break;
    }
  }
  place(biome.springs + 1, () => ({ kind: 'spring', foul: rS() < biome.foul, known: false }), 0);
  place(age.ruins, () => ({ kind: 'ruin', searched: false }), habit.onHills ? 1 : 0);
  place(4, () => ({ kind: 'cave', searched: false, loot: rS() < 0.4 }), 1);
  place(4, cacheSite(rS));
  place(1, () => ({ kind: 'shrine' }));
  const road = finishSites(sites, habit, doom, rR);
  const s = {
    v: VERSION,
    seed,
    rng: Math.floor(rRun() * 4294967296) | 0,
    w: W,
    h: H,
    terrain,
    elev,
    dug: {},
    seen: new Array(W * H).fill(0),
    sites,
    depots: {},
    biome: biome.id,
    civ,
    civKnown: {},
    road,
    god: god.id,
    known: { civ: false, god: false },
    pact: null,
    camp: { area: HOME, i: idx(sx, sy) },
    goal: { x: gx, y: gy },
    player: null,
    start: { x: sx, y: sy },
    char: null,
    travellers: 1,
    lostMaps: {},
    world,
    area: HOME,
    areas: { [HOME]: { id: HOME, kind: 'region', cx: world.home.cx, cy: world.home.cy, biome: biome.id, visited: true } },
    offer: null,
    time: 0,
    weather: { storm: false, changeAt: 0 },
    log: [],
    warn: {},
    over: null,
    cause: null,
    nextId: 1,
    tun: JSON.parse(JSON.stringify(C.tun)),
    off: {},
    stats: { moves: 0, trips: 0 },
  };
  s.weather.changeAt = (360 + rW() * 600) * s.tun.stormGap;
  const draw = (list, n) => {
    const a = list.map((e) => e.id);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rO() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  };
  s.offer = { races: draw(C.races, C.offer.races), classes: draw(C.classes, C.offer.classes) };
  s.species = makeSpecies(s, rnd('species'), biome.id);
  s.speciesByBiome = { [biome.id]: s.species.map((_, i) => i) };
  s.creatures = [];
  makeQuest(s, rnd('quest'), townP, vaultP, a0, goalP);
  placeCreatures(s, rnd('creatures'), s, {
    count: C.creature.count,
    species: s.speciesByBiome[biome.id],
    far: (x, y) => Math.max(Math.abs(x - sx), Math.abs(y - sy)),
    avoid: (x, y, far) => far < 7 || Math.max(Math.abs(x - townP.x), Math.abs(y - townP.y)) < 4,
    tier: (x, y, far) => clamp(1 + Math.floor((far - 4) / 5), 1, 3),
  });
  spawn(s, makeChar(rnd('character'), s));
  s.depots[idx(sx, sy)] = {
    water: 0,
    fuel: 3,
    items: [makeItem(s, 'cloak', null, null, true), makeItem(s, 'lantern', null, null, true)],
  };
  say(s, 'Dawn, day 1. ' + biome.name + '. ' + biome.blurb);
  say(
    s,
    'Somewhere to the ' +
      dirTo(s, townP.x, townP.y) +
      ' there is a town. Find it: its people know what this land is waiting for.',
  );
  say(s, 'Your camp has a well. A cloak, a lantern and fuel are stored here: open Pack to take them.');
  if (typeof INTRO_EXTRA === 'string') say(s, INTRO_EXTRA);
  return s;
}

export { newGame, genTerrain };
