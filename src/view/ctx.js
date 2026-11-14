/* Shared view context: constants, small helpers, and the state every view module reads (V). */
import { Rules } from '../rules/index.js';

const V = { S: null, terrain: null, blockedUntil: 0, locked: false };
const P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, walked: 0 };
const R = Rules,
  $ = (id) => document.getElementById(id),
  KEY = 'farbeacon.run',
  OLD_KEYS = ['farbeacon3d.run.v6'],
  CODEX = 'farbeacon3d.codex.v1';
const TS = 28,
  WORLD = R.W * TS,
  HALF = WORLD / 2,
  N = 216,
  CELL = WORLD / N,
  EYE = 1.7;
const VIEW = { speed: 7 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, t) => a + (b - a) * t,
  smooth = (t) => t * t * (3 - 2 * t);
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const el = (tag, props, kids) => {
  const e = document.createElement(tag);
  if (props)
    for (const k in props) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'on') e.addEventListener('click', props[k]);
      else if (k === 'cls') e.className = props[k];
      else e.setAttribute(k, props[k]);
    }
  (kids || []).forEach((c) => c && e.appendChild(c));
  return e;
};
function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const tileX = (tx) => (tx + 0.5) * TS - HALF,
  toTile = (x) => clamp(Math.floor((x + HALF) / TS), 0, R.W - 1);

export {
  OLD_KEYS,
  V,
  P,
  R,
  $,
  KEY,
  CODEX,
  TS,
  WORLD,
  HALF,
  N,
  CELL,
  EYE,
  VIEW,
  clamp,
  lerp,
  smooth,
  f1,
  el,
  mulberry,
  tileX,
  toTile,
};
