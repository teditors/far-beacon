/* Core: constants, lookups, seeded randomness, events and the clock. Everything else builds on this. */
import { CONTENT } from '../content/index.js';
const C = CONTENT,
  W = 36,
  H = 36,
  VERSION = 9,
  START = 6 * 60;
const TERR = ['plain', 'hill', 'mountain', 'forest', 'river', 'special', 'wall', 'floor', 'void', 'deep'];
// Indoor ground: walls cannot be walked through; floor is the inside of towns and the locked place.
const WALL = 6,
  FLOOR = 7,
  VOID = 8, // the open air round a place in the sky: nothing walks on it, and nothing is drawn there
  DEEP = 9; // deep water, outdoors: crossed by boat, along the bottom by those who breathe water, or over it on wings
// Look an entry up by id. Lists are indexed on first use (and again if they grow), since some lookups run very often.
const idIndex = new WeakMap();
const byId = (list, id) => {
  let ix = idIndex.get(list);
  if (!ix || ix.n !== list.length) {
    ix = { n: list.length, m: new Map() };
    for (const e of list) if (!ix.m.has(e.id)) ix.m.set(e.id, e);
    idIndex.set(list, ix);
  }
  return ix.m.get(id);
};
const idx = (x, y) => y * W + x;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mulberry(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A named stream: the same seed and name always give the same sequence, independent of every other name.
function stream(seed, name) {
  let h = 2166136261 ^ (seed >>> 0);
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return mulberry(h >>> 0);
}
function srand(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), s.rng | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* Rule 1: systems talk through events and shared state, never to each other. */
const listeners = {};
function on(type, fn) {
  (listeners[type] = listeners[type] || []).push(fn);
}
function emit(s, type, data) {
  (listeners[type] || []).forEach((fn) => fn(s, data));
}
on('log', (s, d) => {
  s.log.push({ t: s.time, msg: d.msg, tone: d.tone || '' });
  if (s.log.length > 80) s.log.shift();
});
const say = (s, msg, tone) => emit(s, 'log', { msg, tone });

// 'a' or 'an' before a word, for generated names: aOrAn('Elder Brute') gives 'an Elder Brute'.
const aOrAn = (word, cap) =>
  /^the /i.test(word) // a named one ('the Mole Lord') takes no article of ours
    ? (cap ? 'T' : 't') + word.slice(1)
    : ((/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word).replace(/^a/, cap ? 'A' : 'a');
function clock(s) {
  const m = START + s.time;
  const mod = m % 1440;
  const hour = Math.floor(mod / 60);
  const dawn = s.tun && s.tun.dawn !== undefined ? s.tun.dawn : 6,
    dusk = s.tun && s.tun.dusk !== undefined ? s.tun.dusk : 20;
  return { day: Math.floor(m / 1440) + 1, hour, min: Math.floor(mod % 60), isDay: hour >= dawn && hour < dusk };
}
// A piece can supply the world's god (rolled gods do): the first maker that returns one wins.
const godMakers = [];
const biomeOf = (s) => byId(C.biomes, s.biome),
  godOf = (s) => {
    for (const f of godMakers) {
      const g = f(s);
      if (g) return g;
    }
    return byId(C.gods, s.god);
  };
// The storm blowing now (or due next): the biome's own, unless a piece supplies another (odd weather does).
const stormMakers = [];
const stormOf = (s) => {
  for (const f of stormMakers) {
    const st = f(s);
    if (st) return st;
  }
  return biomeOf(s).storm;
};
// The kind of site the player stands on, or null.
const siteHereKind = (s) => {
  const st = s.sites[s.player.y * W + s.player.x];
  return st ? st.kind : null;
};

export {
  stream,
  C,
  W,
  H,
  VERSION,
  START,
  TERR,
  byId,
  idx,
  clamp,
  mulberry,
  srand,
  listeners,
  on,
  emit,
  say,
  clock,
  biomeOf,
  godOf,
};
export { aOrAn, godMakers, siteHereKind, stormMakers, stormOf };
export { WALL, FLOOR, VOID, DEEP };
