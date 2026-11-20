/* The sky (content/sky.js): flying, and places that float above the world.
   Flying: anything that gives the stat `fly` lets you take to the air outdoors (s.player.aloft). Aloft every kind of
   ground is crossed at the same quick pace and nothing on the ground can reach you; it costs stamina (times flyEffort),
   cold and water, a storm or exhaustion brings you down, and you must land to do anything but look about.
   Sky places (s.skies): rolled at world creation in about one world in four (the `sky` world setting), each floating
   over a region, marked on the ground by a shadow (a site of kind 'shadow' put in the region's map as it is built).
   Fly over the shadow and up. Their levels are areas of kind 'sky' (ids '<sky id>.<level>'), built when first reached
   (GENERATORS.sky); the open air around them is terrain VOID, which nothing walks on.
   A world with sky places always has one way to fly within reach: in a town's shop, or with the deepest dungeon's prize.
   Switch: s.off.sky (at creation: no sky places; in play, flying items still fly). */
import { C, H, W, WALL, FLOOR, VOID, byId, clamp, emit, idx, on, say, srand, stream } from './core.js';
import './worldgen.js';
import {
  GENERATORS,
  HOME,
  allTowns,
  areaRec,
  buildArea,
  enterArea,
  inOverworld,
  leaveArea,
  mapOf,
  outdoorRec,
  regionId,
  sketchOf,
  switchRegion,
  toOverworld,
  townArea,
} from './areas.js';
import { makeCreature } from './combat.js';
import { genItem, makeItem } from './items.js';
import { reveal, sightRadius, siteHere, SITE_NAME } from './map.js';
import { restHour } from './actions.js';
import { gainXp, roll } from './progress.js';
import { stat, SOURCES } from './stats.js';
import { SYSTEMS } from './systems.js';
import { ACTIONS, COSTS, ENTRANCES, LOOKS, NOTES, PLACES, SWITCHES, TALK } from './hooks.js';
import { makeArtifact } from './artifacts.js';
import { genOf } from './worldset.js';
import { jumpRegion } from './godmode.js';
import { deepsOf } from './deeps.js';

const K = () => C.sky;
for (const b of K().items) if (!byId(C.bases, b.id)) C.bases.push(Object.assign({}, b));
Object.assign(C.value, { wingboots: 110, windcloak: 90, carpet: 120 });
Object.assign(SITE_NAME, { shadow: 'shadow', landing: 'landing', skyway: 'stair', trader: 'trader' });
const skiesOf = (s) => s.skies || [];
const skyById = (s, id) => skiesOf(s).find((k) => k.id === id) || null;
const skyLevelId = (k, n) => k.id + '.' + n;
const canFly = (s) => stat(s, 'fly', 0) > 0;
const aloft = (s) => !!(s.player && s.player.aloft);

/* ---------- flying ---------- */
function takeOff(s) {
  if (s.over || s.combat || aloft(s)) return false;
  if (!canFly(s)) return false;
  if (!inOverworld(s)) {
    say(s, 'There is no sky to fly in here.');
    return false;
  }
  if (s.weather.storm && !s.godMode) {
    say(s, 'Not in this wind. Wait for the storm to pass.', 'bad');
    return false;
  }
  if (s.player.stamina < 20) {
    say(s, 'You are too tired to fly. Rest first.', 'bad');
    return false;
  }
  s.player.aloft = true;
  say(s, 'You rise into the air. The land opens out below you.', 'good');
  return true;
}
function land(s, why) {
  if (!aloft(s)) return false;
  s.player.aloft = false;
  if (why) say(s, why, 'bad');
  else say(s, 'You come down to the ground.');
  return true;
}
// Aloft, every tile costs what flat ground on a road would, in time; in effort, more, by the item's flyEffort.
COSTS.push((s, x, y, mc) => {
  if (!aloft(s)) return mc;
  return {
    mins: s.tun.moveMin.plain * 0.5 * stat(s, 'moveTime', 1),
    cost: s.tun.moveSta.plain * s.tun.staminaScale * stat(s, 'flyEffort', 1) * 1.5,
    base: mc.base,
  };
});
SOURCES.push({
  id: 'sky',
  fn(s, out) {
    if (aloft(s)) {
      out.push({ stat: 'cold', op: 'add', value: K().cold });
      out.push({ stat: 'waterDrain', op: 'mul', value: K().thirst });
      out.push({ stat: 'quiet', op: 'add', value: 1 }); // nothing on the ground can reach you
      out.push({ stat: 'surveyRadius', op: 'add', value: 3 });
    }
    const rec = areaRec(s);
    if (rec.kind === 'sky') {
      const kd = byId(K().kinds, rec.place);
      if (kd.id !== 'city') out.push({ stat: 'cold', op: 'add', value: 2 });
      for (const m of kd.mods || []) out.push(m);
    }
  },
});
// A storm or exhaustion brings you down.
SYSTEMS.push({
  id: 'flight',
  fn(s) {
    if (!aloft(s) || s.over) return;
    const p = s.player;
    if (!canFly(s)) land(s, 'Whatever held you up lets go. You come down hard.');
    else if (s.weather.storm && !s.godMode) {
      const n = roll(s, K().fall[0], K().fall[1]);
      p.hp = Math.max(1, p.hp - n);
      land(s, 'The storm takes you and throws you down: ' + n + ' damage.');
    } else if (p.stamina < K().lowStamina) land(s, 'Your strength gives out and you come down, gasping.');
  },
});

/* ---------- sky places, rolled at world creation ---------- */
on('worldBorn', (s, ev) => {
  if (ev.off.sky) return;
  const set = ev.set || genOf(s),
    r = stream(s.seed, 'sky');
  if (!(r() < set.sky)) return;
  const X = K(),
    w = s.world,
    pickW = (list) => {
      let t = list.reduce((a, e) => a + e.weight, 0) * r();
      for (const e of list) if ((t -= e.weight) < 0) return e;
      return list[0];
    },
    n = X.places[0] + Math.floor(r() * (X.places[1] - X.places[0] + 1)),
    // late-game: far from home where the world allows
    regions = [];
  for (let cy = 0; cy < w.rows; cy++)
    for (let cx = 0; cx < w.cols; cx++) {
      const d = sketchOf(s, cx, cy).danger;
      if (cx === w.home.cx && cy === w.home.cy) continue;
      regions.push({ cx, cy, d, k: r() - d * 0.5 });
    }
  regions.sort((a, b) => a.k - b.k);
  const list = [];
  for (let i = 0; i < n && regions.length; i++) {
    const kd = pickW(X.kinds.filter((k) => !k.rare)),
      at = regions.shift(),
      id = 's' + i;
    const free = kd.names.filter((nm) => !list.some((o) => o.name === nm)); // no two share a name
    list.push({
      id,
      kind: kd.id,
      name: (free.length ? free : kd.names)[Math.floor(r() * (free.length || kd.names.length))],
      area: regionId(s, at.cx, at.cy),
      x: 6 + Math.floor(r() * (W - 12)),
      y: 6 + Math.floor(r() * (H - 12)),
      levels: kd.levels,
    });
  }
  // now and then a low moon, over the farthest country, reached from on high
  const moon = X.kinds.find((k) => k.rare);
  if (moon && list.length && regions.length && r() < 0.35) {
    const at = regions.pop();
    list.push({
      id: 's' + list.length,
      kind: moon.id,
      name: moon.names[Math.floor(r() * moon.names.length)],
      area: regionId(s, at.cx, at.cy),
      x: 6 + Math.floor(r() * (W - 12)),
      y: 6 + Math.floor(r() * (H - 12)),
      levels: moon.levels,
    });
  }
  s.skies = list;
  // the first way to fly: for sale in a town, or the prize of the deepest dungeon
  const F = X.firstFlight,
    deepest = deepsOf(s)
      .slice()
      .sort((a, b) => b.depth - a.depth)[0],
    boots = makeItem(s, 'wingboots', null, null, true);
  if (r() < F.shop || !deepest) {
    const towns = allTowns(s),
      t = towns[Math.floor(r() * towns.length)];
    t.stock.push(boots);
    s.skyShop = t.id || 'town';
  } else (deepest.extra = deepest.extra || []).push(boots);
  for (const id in s.areas) {
    const m = id === s.area ? s : s.areas[id].map;
    if (m && s.areas[id].kind === 'region') putShadows(s, id, m);
  }
});
// The shadow of a sky place on the ground below it: a site anyone can see, and the place to fly up from.
function putShadows(s, area, m) {
  for (const k of skiesOf(s)) {
    if (k.area !== area) continue;
    let i = idx(k.x, k.y);
    for (let t = 0; t < 40 && (m.sites[i] || m.terrain[i] >= 4 || m.terrain[i] === 2); t++)
      i = idx(clamp(k.x + ((t * 7) % 9) - 4, 2, W - 3), clamp(k.y + ((t * 5) % 9) - 4, 2, H - 3));
    m.sites[i] = { kind: 'shadow', sky: k.id };
    k.x = i % W;
    k.y = Math.floor(i / W);
  }
}
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    putShadows(s, rec.id, m);
    return m;
  };
}

/* ---------- a sky level, built when first reached ---------- */
const blank = (v) => new Array(W * H).fill(v);
// An island: open ground in a ragged circle round the middle, the open air everywhere else.
function isle(r, rad) {
  const t = blank(VOID),
    wob = [];
  for (let a = 0; a < 16; a++) wob.push(0.75 + r() * 0.35);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const dx = x - 17.5,
        dy = y - 17.5,
        a = ((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 16,
        i0 = Math.floor(a) % 16,
        f = a - Math.floor(a),
        wv = wob[i0] * (1 - f) + wob[(i0 + 1) % 16] * f;
      if (Math.hypot(dx, dy) < rad * wv) t[idx(x, y)] = FLOOR;
    }
  return t;
}
const LAYOUTS = {
  isle: (r) => isle(r, 15),
  castle(r, lvl) {
    const t = lvl === 1 ? isle(r, 15) : isle(r, 9);
    // the keep: a walled square with rooms, its gate to the south
    const k0 = lvl === 1 ? 11 : 12,
      k1 = lvl === 1 ? 24 : 23;
    for (let y = k0; y <= k1; y++)
      for (let x = k0; x <= k1; x++) if (x === k0 || x === k1 || y === k0 || y === k1) t[idx(x, y)] = WALL;
    for (let x = k0 + 1; x < k1; x++)
      if (x % 4 === 0) for (let y = k0 + 1; y < k1 - 3; y++) t[idx(x, y)] = r() < 0.75 ? WALL : FLOOR;
    t[idx(18, k1)] = FLOOR;
    t[idx(17, k1)] = FLOOR;
    return t;
  },
  city(r) {
    const t = isle(r, 16);
    for (let by = 6; by < 30; by += 6)
      for (let bx = 6; bx < 30; bx += 6) {
        if (Math.abs(bx - 18) < 4 && Math.abs(by - 18) < 4) continue; // the square
        const w = 2 + Math.floor(r() * 3),
          h = 2 + Math.floor(r() * 3);
        for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) if (t[idx(x, y)] === FLOOR) t[idx(x, y)] = WALL;
      }
    return t;
  },
  moon(r, lvl) {
    const t = isle(r, lvl === 1 ? 17 : 12);
    // crater rims
    for (let c = 0; c < 5; c++) {
      const cx = 8 + Math.floor(r() * 20),
        cy = 8 + Math.floor(r() * 20),
        rad = 2 + r() * 3;
      for (let a = 0; a < 40; a++) {
        if (a % 9 === 0) continue; // a way in
        const x = Math.round(cx + Math.cos(a / 6.4) * rad),
          y = Math.round(cy + Math.sin(a / 6.4) * rad);
        if (t[idx(x, y)] === FLOOR) t[idx(x, y)] = WALL;
      }
    }
    return t;
  },
};
// The species of a kind of sky place in this world, one per form, and an elder for its top.
function placeSpecies(s, kd, r) {
  const all = (s.skySpecies = s.skySpecies || {});
  if (!all[kd.id] && kd.forms.length) {
    all[kd.id] = kd.forms.map((f) => {
      s.species.push({
        name: kd.creature[Math.floor(r() * kd.creature.length)] + ' ' + byId(C.creature.forms, f).name,
        form: f,
        temper: 'hunter',
        rare: null,
        met: false,
      });
      return s.species.length - 1;
    });
    s.species.push({
      name: 'Lord of the ' + kd.name,
      form: kd.forms[0],
      temper: 'territorial',
      rare: 'elder',
      met: false,
      named: true,
    });
    all[kd.id].push(s.species.length - 1);
  }
  return all[kd.id] || [];
}
// Walking distance from a tile (-1 where you cannot get).
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
GENERATORS.sky = (s, rec) => {
  const k = skyById(s, rec.sky),
    kd = byId(K().kinds, rec.place),
    r = stream(s.seed, 'area:' + rec.id),
    lvl = rec.level,
    top = lvl === rec.levels,
    terrain = LAYOUTS[kd.layout](r, lvl),
    sites = {},
    depots = {},
    creatures = [];
  // you arrive at the south edge of the island, or (above the first level) at the stair
  let start = -1;
  for (let y = H - 2; y > 0 && start < 0; y--)
    for (let x = 14; x <= 22 && start < 0; x++) if (terrain[idx(x, y)] === FLOOR) start = idx(x, y);
  const dist = reach(terrain, start);
  for (let i = 0; i < W * H; i++) if (terrain[i] === FLOOR && dist[i] < 0) terrain[i] = VOID; // nothing out of reach
  const open = [];
  for (let i = 0; i < W * H; i++) if (dist[i] >= 0) open.push(i);
  const far = open.reduce((a, b) => (dist[b] > dist[a] ? b : a), start),
    taken = (i) => sites[i] || depots[i] || i === start || creatures.some((c) => idx(c.x, c.y) === i),
    spot = (minD) => {
      for (let t = 0; t < 80; t++) {
        const i = open[Math.floor(r() * open.length)];
        if (!taken(i) && dist[i] >= minD) return i;
      }
      return null;
    };
  sites[start] = lvl === 1 ? { kind: 'landing', seen: true } : { kind: 'skyway', back: true, seen: true };
  rec.entry = { x: start % W, y: Math.floor(start / W) };
  if (!top) sites[far] = { kind: 'skyway', seen: true };
  const sp = placeSpecies(s, kd, r);
  let cid = 30000 + (+k.id.slice(1) || 0) * 400 + lvl * 40;
  const put = (spi, i, tier) => {
    const c = makeCreature(s, cid++, spi, i % W, Math.floor(i / W), tier);
    creatures.push(c);
    return c;
  };
  for (let n = 0; sp.length && n < kd.per; n++) {
    const i = spot(5);
    // a place the plot sends you to is a tier gentler: you are sent there, not drawn there late in a life
    if (i !== null)
      put(sp[Math.floor(r() * (sp.length - 1))], i, Math.max(1, kd.tier + Math.floor((lvl - 1) / 2) - (k.plot ? 1 : 0)));
  }
  if (top && kd.prize) {
    const it = genItem(s, { relic: true, noConsumables: true });
    it.tier = C.tiers.max;
    const prize = { water: 0, fuel: 0, items: [it], coin: 40 + lvl * 15, store: true, skyPrize: k.id };
    if (kd.id === 'castle') prize.items.push(makeItem(s, 'bridle', null, null, true));
    if (kd.id === 'moon' && !s.off.artifacts) prize.items.push(makeArtifact(s, stream(s.seed, 'sky:art:' + k.id), []));
    depots[far] = prize;
    if (sp.length) {
      const lord = put(sp[sp.length - 1], spot(2) ?? far, kd.tier + 1);
      lord.warden = true;
    }
  }
  // what the people of the place left: ruins to search, a rain-pool to drink from
  for (let n = 0; n < (kd.ruins || 0); n++) {
    const i = spot(3);
    if (i !== null) sites[i] = { kind: 'ruin', searched: false, sky: true };
  }
  const pool = spot(2);
  if (pool !== null) sites[pool] = { kind: 'spring', foul: false, known: true, sure: true, seen: true };
  if (kd.trader) {
    const i = open
      .filter((j) => !taken(j))
      .sort((a, b) => Math.hypot((a % W) - 18, Math.floor(a / W) - 18) - Math.hypot((b % W) - 18, Math.floor(b / W) - 18))[0];
    if (i !== undefined) sites[i] = { kind: 'trader', place: kd.id, seen: true };
  }
  const m = { terrain, sites, depots, creatures };
  emit(s, 'skyBuilt', { sky: k.id, level: lvl, map: m, r });
  return m;
};

/* ---------- going up, along, and down ---------- */
// How each level is entered: the first from its shadow (flying), the rest by the stair from the one before.
ENTRANCES.push((s, id) => {
  const rec = s.areas[id];
  if (!rec || rec.kind !== 'sky') return null;
  const k = skyById(s, rec.sky);
  if (rec.level === 1) return { area: k.area, x: k.x, y: k.y, act: 'flyUp', fly: true };
  const up = skyLevelId(k, rec.level - 1),
    m = s.areas[up] ? mapOf(s, up) : null,
    q = m ? Object.keys(m.sites).find((j) => m.sites[j].kind === 'skyway' && !m.sites[j].back) : undefined;
  return { area: up, x: q === undefined ? undefined : q % W, y: q === undefined ? undefined : Math.floor(q / W), act: 'skyOn' };
});
function levelRec(k, n) {
  return { kind: 'sky', indoor: true, open: true, level: n, levels: k.levels, sky: k.id, place: k.kind };
}
function goSky(s, k, n) {
  enterArea(s, skyLevelId(k, n), levelRec(k, n));
  reveal(s, s.player.x, s.player.y, sightRadius(s) + 3, true);
}
// Aloft over a shadow: up to the place that casts it.
function flyUp(s) {
  const st = siteHere(s),
    k = st && st.kind === 'shadow' && skyById(s, st.sky);
  if (s.over || !k || !aloft(s)) return false;
  s.player.aloft = false;
  goSky(s, k, 1);
  const kd = byId(K().kinds, k.kind);
  if (!k.reached) {
    k.reached = true;
    gainXp(s, 40);
    say(s, kd.name + ': ' + k.name + '. ' + kd.text, 'good');
  } else say(s, 'You come in to land on ' + k.name + '.');
  return true;
}
// A stair inside a sky place: on up (or down into the crater), or back the way you came.
function skyOn(s) {
  const st = siteHere(s),
    rec = areaRec(s),
    k = rec.kind === 'sky' && skyById(s, rec.sky);
  if (s.over || !k || !st || st.kind !== 'skyway') return false;
  if (st.back) {
    leaveArea(s);
    say(s, 'You go back the way you came.');
    return true;
  }
  goSky(s, k, rec.level + 1);
  say(s, k.name + ', ' + (rec.level + 1) + ' of ' + k.levels + '.');
  return true;
}
// Off the edge, from where you landed: fly down if you can, jump if you must.
function flyDown(s) {
  const st = siteHere(s),
    rec = areaRec(s);
  if (s.over || rec.kind !== 'sky' || !st || st.kind !== 'landing') return false;
  const flying = canFly(s);
  while (areaRec(s).kind === 'sky') if (!leaveArea(s)) break;
  if (flying) {
    s.player.aloft = true;
    say(s, 'You step off the edge and the air takes you. The land swings up below.', 'good');
  } else {
    const n = Math.round(s.player.hpMax * 0.6);
    s.player.hp = Math.max(1, s.player.hp - n);
    say(s, 'With nothing to hold you up, you jump. The fall is long, and the landing breaks something: ' + n + ' damage.', 'bad');
  }
  return true;
}
ACTIONS.push((s, st, a) => {
  if (s.combat) return;
  if (aloft(s)) {
    a.push({ id: 'land', label: 'Land', hint: 'come down here', air: true });
    if (st && st.kind === 'shadow') {
      const k = skyById(s, st.sky);
      if (k) a.push({ id: 'flyUp', label: 'Fly up to ' + k.name, hint: byId(K().kinds, k.kind).name.toLowerCase(), air: true });
    }
    return;
  }
  if (canFly(s) && inOverworld(s)) a.push({ id: 'takeOff', label: 'Take to the air', hint: 'fly; costs stamina' });
  if (!st) return;
  if (st.kind === 'landing' && areaRec(s).kind === 'sky')
    a.push({ id: 'flyDown', label: canFly(s) ? 'Fly down' : 'Jump', hint: canFly(s) ? 'back to the land below' : 'a long fall' });
  if (st.kind === 'skyway') {
    const rec = areaRec(s),
      kd = rec.kind === 'sky' ? byId(K().kinds, rec.place) : null;
    if (kd)
      a.push({
        id: 'skyOn',
        label: st.back ? 'Go back' : kd.id === 'moon' ? 'Go down into the crater' : 'Climb the stair',
        hint: st.back ? 'the way you came' : 'level ' + (rec.level + 1) + ' of ' + rec.levels,
      });
  }
});
on('did', (s, ev) => {
  if (ev.id !== 'move') return;
  const st = siteHere(s);
  if (st && st.kind === 'shadow' && !st.told) {
    st.told = true;
    st.seen = true;
    const k = skyById(s, st.sky);
    say(
      s,
      aloft(s)
        ? 'Above you, ' + k.name + ' hangs in the sky.'
        : 'A shadow lies on the ground here, though there is no cloud to cast it. High above, something hangs in the sky.',
    );
  }
});

/* ---------- people of the cloud city ---------- */
const atTrader = (s) => {
  const st = siteHere(s);
  return st && st.kind === 'trader' ? st : null;
};
const traderOf = (st) => {
  // a sky place's own trader, or one of the sea's (the floating town, the merfolk halls)
  const kd = byId(K().kinds, st.place);
  return (kd && kd.trader) || (C.sea && C.sea.traders && C.sea.traders[st.place]) || null;
};
TALK.push({
  info(s) {
    const st = atTrader(s),
      T = st && traderOf(st);
    if (!T) return null;
    return {
      title: T.name.charAt(0).toUpperCase() + T.name.slice(1),
      text: [T.talk],
      options: [
        ...(T.bed ? [{ id: 'bed', label: 'A bed for the night', price: T.bed, note: 'eight hours; wake whole' }] : []),
        ...T.goods.map((g) => ({ id: 'buy', arg: g.base, label: byId(C.bases, g.base).name, price: g.price })),
      ],
    };
  },
  use(s, opt, arg) {
    const info = this.info(s),
      o = info && info.options.find((x) => x.id === opt && (arg === undefined || x.arg === arg)),
      p = s.player;
    if (!o || s.over) return false;
    if (p.coin < o.price) {
      say(s, 'You cannot afford that.');
      return false;
    }
    p.coin -= o.price;
    if (opt === 'bed') {
      const w = p.water;
      for (let i = 0; i < 8 && !s.over; i++) restHour(s);
      if (s.over) return true;
      p.water = Math.max(p.water, w);
      Object.assign(p, { hp: p.hpMax, stamina: 100, warmth: 100 });
      say(s, 'You sleep above the world. You wake whole.', 'good');
    } else {
      p.items.push(makeItem(s, o.arg, null, null, true));
      say(s, 'You buy ' + o.label.toLowerCase() + '.');
    }
    return true;
  },
});
ACTIONS.push((s, st, a) => {
  if (!s.combat && st && st.kind === 'trader' && traderOf(st))
    a.push({ id: 'townAsk', section: 'trader', label: 'Talk to ' + traderOf(st).name, hint: 'trade, a bed' });
});

/* ---------- the view, god mode, the journal ---------- */
LOOKS.push((s, rec) => {
  if (rec.kind !== 'sky') return null;
  const k = skyById(s, rec.sky);
  return Object.assign(
    { dark: false, ceiling: false, title: k.name + (k.levels > 1 ? ', ' + rec.level + ' of ' + k.levels : '') },
    byId(K().kinds, rec.place).look,
  );
});
PLACES.push((s, out) => {
  for (const k of skiesOf(s))
    for (let n = 1; n <= k.levels; n++)
      out.push({
        id: 'sky:' + k.id + ':' + n,
        group: 'Above',
        label: k.name + ' (' + byId(K().kinds, k.kind).name.toLowerCase() + ')' + (k.levels > 1 ? ', level ' + n : ''),
        go: (s) => jumpSky(s, k, n),
      });
});
function jumpSky(s, k, n) {
  const rec = s.areas[k.area],
    m = rec && rec.cx !== undefined ? rec : null;
  const c = k.area.match(/^r(\d+)_(\d+)$/),
    cx = m ? m.cx : c ? +c[1] : s.world.home.cx,
    cy = m ? m.cy : c ? +c[2] : s.world.home.cy;
  jumpRegion(s, cx, cy, k.x, k.y);
  s.player.x = k.x;
  s.player.y = k.y;
  for (let i = 1; i <= n; i++) {
    goSky(s, k, i);
    if (i < n) {
      const up = Object.keys(s.sites).find((q) => s.sites[q].kind === 'skyway' && !s.sites[q].back);
      if (up !== undefined) {
        s.player.x = up % W;
        s.player.y = Math.floor(up / W);
      }
    }
  }
  return true;
}
NOTES.push((s) => {
  const ks = skiesOf(s);
  if (!ks.length) return [];
  const seen = ks.filter((k) => k.reached);
  return [
    {
      label: 'The sky',
      text:
        (seen.length ? 'You have walked on ' + seen.map((k) => k.name).join(', ') + '. ' : '') +
        'Something floats above this world: look for a shadow with no cloud to cast it.' +
        (s.skyShop ? ' A shop in one of the towns sells a way to fly.' : ''),
    },
  ];
});
SWITCHES.push(['sky', 'Places in the sky (new worlds)']);

// A sky place of a given kind over a region (for a plot that needs one where the world rolled none).
function addSky(s, kind, rec, r) {
  const kd = byId(K().kinds, kind),
    k = {
      id: 's' + skiesOf(s).length,
      kind,
      name: kd.names[Math.floor(r() * kd.names.length)],
      area: rec.id,
      x: 6 + Math.floor(r() * (W - 12)),
      y: 6 + Math.floor(r() * (H - 12)),
      levels: kd.levels,
    };
  (s.skies = s.skies || []).push(k);
  const m = rec.id === s.area ? s : rec.map;
  if (m) putShadows(s, rec.id, m);
  return k;
}
export {
  skiesOf,
  skyById,
  takeOff,
  land,
  flyUp,
  skyOn,
  flyDown,
  aloft,
  canFly,
  jumpSky,
  addSky,
  levelRec as skyLevelRec,
  skyLevelId,
};
