/* Core: constants, lookups, seeded randomness, events and the clock. Everything else builds on this. */
import { CONTENT } from '../content/index.js';
const C = CONTENT,
  W = 36,
  H = 36,
  VERSION = 6,
  START = 6 * 60;
const TERR = ['plain', 'hill', 'mountain', 'forest', 'river', 'special'];
const byId = (list, id) => list.find((e) => e.id === id);
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
const aOrAn = (word, cap) => ((/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word).replace(/^a/, cap ? 'A' : 'a');
function clock(s) {
  const m = START + s.time;
  const mod = m % 1440;
  const hour = Math.floor(mod / 60);
  return { day: Math.floor(m / 1440) + 1, hour, min: Math.floor(mod % 60), isDay: hour >= 6 && hour < 20 };
}
const biomeOf = (s) => byId(C.biomes, s.biome),
  godOf = (s) => byId(C.gods, s.god);

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
export { aOrAn };
