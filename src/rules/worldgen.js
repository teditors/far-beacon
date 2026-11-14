/* World generation. */
import { makeChar, spawn } from './character.js';
import { AXES } from './civ.js';
import { makeSpecies, placeCreatures } from './combat.js';
import { C, H, VERSION, W, byId, clamp, idx, mulberry, say } from './core.js';
import { makeItem } from './items.js';
import { dirTo } from './map.js';
import { makeQuest } from './quest.js';

/* World generation */
function newGame(seed) {
  seed = seed >>> 0 || 1;
  const r = mulberry(seed),
    pick = (a) => a[Math.floor(r() * a.length)];
  const biome = pick(C.biomes),
    god = pick(C.gods),
    civ = {};
  for (const ax of AXES) civ[ax] = pick(C.civ[ax]).id;
  {
    const st = byId(C.civ.style, civ.style);
    civ.name = pick(st.a) + pick(st.b) + pick(st.c);
  }
  const habit = byId(C.civ.habit, civ.habit),
    age = byId(C.civ.age, civ.age),
    doom = byId(C.civ.doom, civ.doom);
  const layer = (cells) => {
    const g = [];
    for (let i = 0; i < (cells + 1) * (cells + 1); i++) g.push(r());
    return (x, y) => {
      const fx = (x / W) * cells,
        fy = (y / H) * cells,
        x0 = Math.floor(fx),
        y0 = Math.floor(fy);
      let tx = fx - x0,
        ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      const v = (i, j) => g[j * (cells + 1) + i];
      return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
    };
  };
  const n1 = layer(5),
    n2 = layer(11),
    hts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hts.push(n1(x, y) * 0.65 + n2(x, y) * 0.3 + r() * 0.05);
  const sorted = hts.slice().sort((a, b) => a - b),
    q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
  const mT = q(1 - biome.mountains),
    hT = q(1 - biome.mountains - biome.hills);
  const terrain = hts.map((h) => (h >= mT ? 2 : h >= hT ? 1 : 0)),
    elev = terrain.slice();
  const n3 = layer(8),
    lowT = q(biome.special.frac * (1 - biome.mountains - biome.hills) * 1.0),
    fT = 1 - biome.forest.frac * 1.6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (terrain[i] === 0 && hts[i] <= lowT) {
        terrain[i] = 5;
        elev[i] = -0.15;
      } else if (terrain[i] < 2 && n3(x, y) * 0.7 + n2(x + 9, y + 5) * 0.3 > fT * 0.72 + 0.14) terrain[i] = 3;
    }
  for (let k = 0; k < biome.river.count; k++) {
    // rivers run downhill from high ground until they reach low ground or the map edge
    let best = -1,
      bh = -1;
    for (let tries = 0; tries < 40; tries++) {
      const x = 4 + Math.floor(r() * (W - 8)),
        y = 2 + Math.floor(r() * (H - 4)),
        i = idx(x, y);
      if (hts[i] > bh && terrain[i] !== 4) {
        bh = hts[i];
        best = i;
      }
    }
    let cx = best % W,
      cy = Math.floor(best / W);
    const seenR = {};
    for (let step = 0; step < 70; step++) {
      const i = idx(cx, cy);
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
        const xx = cx + dx,
          yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) {
          nb = 'edge';
          nh = -1;
          break;
        }
        const j = idx(xx, yy);
        if (seenR[j]) continue;
        const hh = hts[j] + r() * 0.035;
        if (hh < nh) {
          nh = hh;
          nb = [xx, yy];
        }
      }
      if (!nb || nb === 'edge') break;
      cx = nb[0];
      cy = nb[1];
    }
  }
  // You start in the middle. The town, the locked place and the beacon lie in three different directions.
  const sx = 17 + Math.floor(r() * 3),
    sy = 17 + Math.floor(r() * 3),
    a0 = r() * 6.283;
  const polar = (ang, rad) => ({
    x: clamp(Math.round(sx + Math.cos(ang) * rad), 2, W - 3),
    y: clamp(Math.round(sy + Math.sin(ang) * rad), 2, H - 3),
  });
  const townP = polar(a0, 6 + r() * 2),
    vaultP = polar(a0 + 1.9 + (r() - 0.5) * 0.5, 10 + r() * 2),
    goalP = polar(a0 + 3.9 + (r() - 0.5) * 0.5, 11 + r() * 2),
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
      depth: 0,
      guard: null,
      floors: [F[Math.floor(r() * F.length)], F[Math.floor(r() * F.length)], 'guard'],
    };
  }
  const free = (x, y) => {
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const xx = x + i,
          yy = y + j;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && sites[idx(xx, yy)]) return false;
      }
    return true;
  };
  function place(n, mk, want, spread) {
    spread = spread || H; // stratified across west-to-east bands so no stretch of the map is empty
    for (let k = 0; k < n; k++) {
      const x0 = 3 + Math.floor((k * (W - 6)) / n),
        x1 = 3 + Math.floor(((k + 1) * (W - 6)) / n);
      for (let tries = 0; tries < 300; tries++) {
        const x = x0 + Math.floor(r() * Math.max(1, x1 - x0)),
          y = clamp(1 + Math.floor((((k % 2) + r()) * (H - 2)) / 2), 1, H - 2),
          t = terrain[idx(x, y)];
        if (t === 2 || t >= 4 || !free(x, y)) continue;
        if (want !== undefined && t !== want && tries < 150) continue;
        sites[idx(x, y)] = mk();
        break;
      }
    }
  }
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
  place(biome.springs + 1, () => ({ kind: 'spring', foul: r() < biome.foul, known: false }), 0);
  place(age.ruins, () => ({ kind: 'ruin', searched: false }), habit.onHills ? 1 : 0);
  place(4, () => ({ kind: 'cave', searched: false, loot: r() < 0.4 }), 1);
  place(4, () => ({
    kind: 'cache',
    searched: false,
    loot: r() < 0.5,
    fuel: 1 + Math.floor(r() * 3),
    water: 1 + Math.floor(r() * 3),
  }));
  place(1, () => ({ kind: 'shrine' }));
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
        if (x !== tx && (y === ty || r() < Math.abs(tx - x) / (Math.abs(tx - x) + Math.abs(ty - y)))) x += Math.sign(tx - x);
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
  const s = {
    v: VERSION,
    seed,
    rng: Math.floor(r() * 4294967296) | 0,
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
    camp: idx(sx, sy),
    goal: { x: gx, y: gy },
    player: null,
    start: { x: sx, y: sy },
    char: null,
    travellers: 1,
    lostMaps: {},
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
  s.weather.changeAt = (360 + r() * 600) * s.tun.stormGap;
  const draw = (list, n) => {
    const a = list.map((e) => e.id);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  };
  s.offer = { races: draw(C.races, C.offer.races), classes: draw(C.classes, C.offer.classes) };
  s.species = makeSpecies(s, r);
  s.creatures = [];
  makeQuest(s, r, townP, vaultP, a0, goalP);
  placeCreatures(s, r);
  spawn(s, makeChar(r, s));
  s.depots[s.camp] = {
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

export { newGame };
