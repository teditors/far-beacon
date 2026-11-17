/* Areas: the overworld, the town and each level of the locked place are separate maps.
   The map the player is in lives at the top of the state (s.terrain, s.sites, ...), so most rules never need to know
   which area they are in. Every other area is parked in s.areas[id] until the player goes back to it. */
import { W, H, idx } from './core.js';

const AREA_FIELDS = ['terrain', 'elev', 'sites', 'depots', 'creatures', 'seen', 'road', 'dug', 'lostMaps'];
const GENERATORS = {}; // kind -> function (s, rec) returning the map fields; registered by interiors.js

const areaRec = (s) => s.areas[s.area];
const HOME = 'overworld'; // the id of the starting region, kept from before the world had more than one
// "Overworld" now means outdoors, in any region of the world.
const inOverworld = (s) => areaRec(s).kind === 'region';
const wrap = (n, m) => ((n % m) + m) % m;
// Shortest signed step count from b to a on a ring of m (the world wraps around).
const wrapDelta = (a, b, m) => {
  let d = wrap(a - b, m);
  if (d > m / 2) d -= m;
  return d;
};
const regionId = (s, cx, cy) => (cx === s.world.home.cx && cy === s.world.home.cy ? HOME : 'r' + cx + '_' + cy);
const sketchOf = (s, cx, cy) => s.world.sketch[cy * s.world.cols + cx];
// The outdoor region the player is in, or is inside a building of.
function outdoorRec(s) {
  let rec = areaRec(s);
  while (rec.kind !== 'region' && rec.from) rec = s.areas[rec.from.area];
  return rec;
}
// How far a region lies from the home region, in tiles, going the short way round.
const regionOffset = (s, rec) => ({
  dx: wrapDelta(rec.cx, s.world.home.cx, s.world.cols) * W,
  dy: wrapDelta(rec.cy, s.world.home.cy, s.world.rows) * H,
});
// Step sideways into another region. Regions are neighbours, not nested, so there is no way "back out".
function switchRegion(s, cx, cy, at) {
  const id = regionId(s, cx, cy);
  if (!s.areas[id]) s.areas[id] = { id, kind: 'region', cx, cy, biome: sketchOf(s, cx, cy).biome };
  park(s);
  unpark(s, id);
  s.areas[id].from = null;
  s.biome = s.areas[id].biome;
  s.player.x = at.x;
  s.player.y = at.y;
  s.lastGround = s.terrain[idx(at.x, at.y)];
  s.onRoad = false;
  ensureAround(s);
}
// The map of any area: the live one if the player is in it, the parked one otherwise.
const mapOf = (s, id) => (id === s.area ? s : s.areas[id].map);
// The eight regions around the one the player is in are built before they are needed, so that they can be seen
// from across the border. Built, not visited: nothing in them changes until the player walks in.
function ensureAround(s) {
  const here = outdoorRec(s);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = wrap(here.cx + dx, s.world.cols),
        cy = wrap(here.cy + dy, s.world.rows),
        id = regionId(s, cx, cy);
      if (!s.areas[id]) s.areas[id] = { id, kind: 'region', cx, cy, biome: sketchOf(s, cx, cy).biome };
      const rec = s.areas[id];
      if (id !== s.area && !rec.map) {
        rec.map = GENERATORS.region(s, rec);
        for (const f of AREA_FIELDS) if (rec.map[f] === undefined) rec.map[f] = AREA_DEFAULTS[f]();
      }
    }
}
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
  if (s.area !== HOME) switchRegion(s, s.world.home.cx, s.world.home.cy, s.start);
}

// The overworld's map, wherever the player is.
// The home region's map (where the quest places are), wherever the player is.
function worldMap(s) {
  return s.area === HOME ? s : s.areas[HOME].map;
}
// Where the player is in home-region coordinates. In another region this runs past the home map's edges, which is
// what makes directions to home-region places come out right. Inside a building it is the door they came in by.
function worldPos(s) {
  let rec = areaRec(s),
    pos = { x: s.player.x, y: s.player.y };
  while (rec.kind !== 'region' && rec.from) {
    pos = { x: rec.from.x, y: rec.from.y };
    rec = s.areas[rec.from.area];
  }
  const o = regionOffset(s, rec);
  return { x: pos.x + o.dx, y: pos.y + o.dy };
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

// A place in any area, in home-region coordinates (for giving directions to it from anywhere).
function homePos(s, areaId, x, y) {
  let rec = s.areas[areaId],
    pos = { x, y };
  while (rec.kind !== 'region' && rec.from) {
    pos = { x: rec.from.x, y: rec.from.y };
    rec = s.areas[rec.from.area];
  }
  const o = regionOffset(s, rec);
  return { x: pos.x + o.dx, y: pos.y + o.dy };
}
// The camp's tile if it stands in the area the player is in, otherwise null.
const campHere = (s) => (s.camp && s.camp.area === s.area ? s.camp.i : null);

export {
  HOME,
  wrap,
  wrapDelta,
  regionId,
  sketchOf,
  outdoorRec,
  regionOffset,
  switchRegion,
  mapOf,
  ensureAround,
  homePos,
  campHere,
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
