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
// Geometry of the area being shown. Outdoors a tile is TS metres; inside the town and the locked place it is
// INDOOR_TS, so the same rules grid becomes a walkable building. setGeometry() switches between them.
const INDOOR_TS = 4,
  TOWN_TS = ((2 * R.TOWN_R + 1) * TS) / R.W; // the town's own grid exactly fills its block of outdoor tiles
const G = { ts: TS, half: HALF };
function setGeometry(kind) {
  G.ts = kind === 'town' ? TOWN_TS : kind === 'vault' ? INDOOR_TS : TS;
  G.half = (R.W * G.ts) / 2;
}
// Where the origin of the view is, measured in the region's own coordinates. Outdoors it is the region's centre
// (all zeros). In the town it is the middle of the town, so that the town's grid can be walked like any interior
// while the land outside stays exactly where it was.
const FR = { x: 0, y: 0, z: 0 };
const tileX = (tx) => (tx + 0.5) * G.ts - G.half,
  toTile = (x) => clamp(Math.floor((x + G.half) / G.ts), 0, R.W - 1);

export {
  G,
  INDOOR_TS,
  TOWN_TS,
  FR,
  setGeometry,
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
