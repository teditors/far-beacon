/* Areas: the overworld, the town and each level of the locked place are separate maps.
   The map the player is in lives at the top of the state (s.terrain, s.sites, ...), so most rules never need to know
   which area they are in. Every other area is parked in s.areas[id] until the player goes back to it. */
import { W, H, idx } from './core.js';

const AREA_FIELDS = ['terrain', 'elev', 'sites', 'depots', 'creatures', 'seen', 'road', 'dug', 'lostMaps'];
const GENERATORS = {}; // kind -> function (s, rec) returning the map fields; registered by interiors.js

const areaRec = (s) => s.areas[s.area];
const inOverworld = (s) => s.area === 'overworld';
const indoors = (s) => !!areaRec(s).indoor;
const isDark = (s) => !!areaRec(s).dark;

function park(s) {
  const rec = areaRec(s);
  for (const f of AREA_FIELDS) {
    rec.map = rec.map || {};
    rec.map[f] = s[f];
  }
}
function unpark(s, id) {
  const rec = s.areas[id];
  if (!rec.map) rec.map = GENERATORS[rec.kind](s, rec);
  for (const f of AREA_FIELDS) s[f] = rec.map[f] !== undefined ? rec.map[f] : AREA_DEFAULTS[f]();
  delete rec.map;
  s.area = id;
}
const AREA_DEFAULTS = {
  terrain: () => new Array(W * H).fill(0),
  elev: () => new Array(W * H).fill(0),
  sites: () => ({}),
  depots: () => ({}),
  creatures: () => [],
  seen: () => new Array(W * H).fill(0),
  road: () => ({}),
  dug: () => ({}),
  lostMaps: () => ({}),
};

// Go into an area. `rec` describes it the first time; after that the parked map is reused.
function enterArea(s, id, rec, at) {
  if (!s.areas[id]) s.areas[id] = Object.assign({ id }, rec);
  const from = { area: s.area, x: s.player.x, y: s.player.y };
  park(s);
  unpark(s, id);
  s.areas[id].from = from;
  const p = at || s.areas[id].entry;
  s.player.x = p.x;
  s.player.y = p.y;
  s.lastGround = s.terrain[idx(p.x, p.y)];
  s.onRoad = false;
}
// Go back out to wherever this area was entered from.
function leaveArea(s) {
  const from = areaRec(s).from;
  if (!from) return false;
  park(s);
  unpark(s, from.area);
  s.player.x = from.x;
  s.player.y = from.y;
  s.lastGround = s.terrain[idx(from.x, from.y)];
  return true;
}
// Straight back to the overworld from any depth (used when a new traveller sets out).
function toOverworld(s) {
  while (!inOverworld(s)) if (!leaveArea(s)) break;
}

// The overworld's map, wherever the player is.
function worldMap(s) {
  return inOverworld(s) ? s : s.areas.overworld.map;
}
// Where the player is on the overworld: their own position outside, or the door they came in by.
function worldPos(s) {
  if (inOverworld(s)) return { x: s.player.x, y: s.player.y };
  let rec = areaRec(s);
  while (rec.from && rec.from.area !== 'overworld') rec = s.areas[rec.from.area];
  return rec.from ? { x: rec.from.x, y: rec.from.y } : s.start;
}
// Every map, current and parked, as [id, fields] pairs.
function allMaps(s) {
  const out = [[s.area, s]];
  for (const id in s.areas) if (id !== s.area && s.areas[id].map) out.push([id, s.areas[id].map]);
  return out;
}
function forgetMaps(s) {
  for (const [id, m] of allMaps(s)) {
    if (s.areas[id].kind === 'town') continue; // a town is easy to find your way around
    m.seen.fill(0);
    for (const k in m.sites) {
      m.sites[k].seen = false;
      m.sites[k].visited = false;
    }
  }
}

export {
  AREA_FIELDS,
  GENERATORS,
  areaRec,
  inOverworld,
  indoors,
  isDark,
  enterArea,
  leaveArea,
  toOverworld,
  worldMap,
  worldPos,
  allMaps,
  forgetMaps,
};
