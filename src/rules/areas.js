/* Areas: the overworld, the town and each level of the locked place are separate maps.
   The map the player is in lives at the top of the state (s.terrain, s.sites, ...), so most rules never need to know
   which area they are in. Every other area is parked in s.areas[id] until the player goes back to it. */
import { W, H, idx } from './core.js';
import { freezeMap, thawMap } from './grids.js';

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
  coolDown(s);
}
// Build an area's map before anyone has been there, so that it can be seen from outside.
function buildArea(s, rec) {
  if (rec.id === s.area) return;
  if (rec.map) return thawMap(rec.map); // built before, perhaps packed away since: warm it for whoever asked
  rec.map = GENERATORS[rec.kind](s, rec);
  for (const f of AREA_FIELDS) if (rec.map[f] === undefined) rec.map[f] = AREA_DEFAULTS[f]();
}
/* The town stands on a block of 5 x 5 outdoor tiles around its site. Outdoors those tiles cannot be walked on: walking
   into the block puts you in the town, on its facing edge (see townEntry), unless a wall stands there. Most towns are
   open; a walled one has gates where its main streets meet the wall, always including the south one. */
const TOWN_R = 2,
  TOWN_GATE = { x: W / 2, y: H - 1 }; // the gap in the town's own south wall
/* A world may have several towns. s.town is the town of the story (area id 'town'); any others are in s.towns, each
   with its own area id (t.id), region (t.area) and the same fields. At most one town stands in a region. */
const townId = (t) => (t && t.id) || 'town';
const allTowns = (s) => (s.town ? [s.town] : []).concat(s.towns || []);
const townById = (s, id) => allTowns(s).find((t) => townId(t) === id) || null;
const townArea = (s, t) => ((t || s.town) && (t || s.town).area) || HOME; // the region a town stands in
// The town standing in a region (by region id), or null.
const townInRegion = (s, regionId) => allTowns(s).find((t) => townArea(s, t) === regionId) || null;
// The town the player is in, or else the town of the region they are in, or else the town of the story.
function curTown(s) {
  const rec = areaRec(s);
  if (rec && rec.kind === 'town') return townById(s, rec.id) || s.town;
  let o = rec;
  while (o && o.kind !== 'region' && o.from) o = s.areas[o.from.area];
  return (o && townInRegion(s, o.id)) || s.town;
}
// Run fn with s.town (and s.townCulture) standing for town t, so that code written for the one town works for any.
// Used where a town is made (its size, people, culture and streets) and where a piece reacts in a town.
function withTown(s, t, fn) {
  if (!t || t === s.town) return fn();
  const was = s.town,
    wasC = s.townCulture;
  s.town = t;
  s.townCulture = t.culture;
  try {
    return fn();
  } finally {
    t.culture = s.townCulture;
    s.town = was;
    s.townCulture = wasC;
  }
}
// A suffix for a town's random streams: none for the story's town, so its streets are as they always were.
const townSfx = (s) => (s.town && s.town.id ? ':' + s.town.id : '');
const inTown = (s) => areaRec(s).kind === 'town';
// Is outdoor tile (x, y) of the region the player is in part of a town's block? Gives that town, or null.
const townBlockAt = (s, x, y) => {
  const t = townInRegion(s, s.area);
  return t && Math.abs(x - t.x) <= TOWN_R && Math.abs(y - t.y) <= TOWN_R ? t : null;
};
const inTownBlock = (s, x, y) => !!townBlockAt(s, x, y);
const townDoor = (s, t) => ({ x: (t || s.town).x, y: (t || s.town).y + TOWN_R + 1 });
/* The town's own map exactly fills its block of outdoor tiles: each outdoor tile spans W / (2 * TOWN_R + 1) town tiles.
   Walking into the block from any side enters the town on the facing edge, at the matching place along it; walking off
   any edge of the town comes out on the outdoor tile beside the block at the matching place. */
const TOWN_SPAN = W / (2 * TOWN_R + 1);
// The town tile you arrive on, walking into the block at outdoor tile (ox, oy) from outdoor tile (px, py).
function townEntry(s, px, py, ox, oy, t) {
  t = t || townBlockAt(s, ox, oy) || s.town;
  const bx = ox - (t.x - TOWN_R),
    by = oy - (t.y - TOWN_R),
    mid = (b) => Math.min(W - 1, Math.floor((b + 0.5) * TOWN_SPAN));
  if (px < t.x - TOWN_R) return { x: 0, y: mid(by) };
  if (px > t.x + TOWN_R) return { x: W - 1, y: mid(by) };
  if (py < t.y - TOWN_R) return { x: mid(bx), y: 0 };
  return { x: mid(bx), y: H - 1 };
}
// The outdoor tile you come out on, walking off the town's map from town tile (tx, ty) by (dx, dy).
function townExit(s, tx, ty, dx, dy, t) {
  t = t || curTown(s);
  const o = (v) => Math.min(2 * TOWN_R, Math.max(0, Math.floor(v / TOWN_SPAN))),
    x0 = t.x - TOWN_R,
    y0 = t.y - TOWN_R;
  if (dx < 0) return { x: x0 - 1, y: y0 + o(ty) };
  if (dx > 0) return { x: t.x + TOWN_R + 1, y: y0 + o(ty) };
  if (dy < 0) return { x: x0 + o(tx), y: y0 - 1 };
  return { x: x0 + o(tx), y: t.y + TOWN_R + 1 };
}
// Every town's map is built ahead, so it can be seen from outside.
function ensureTown(s) {
  for (const t of allTowns(s)) {
    const id = townId(t);
    if (!s.areas[id]) s.areas[id] = { id, kind: 'town', indoor: true, name: t.name };
    buildArea(s, s.areas[id]);
  }
}
// The map of any area: the live one if the player is in it, the parked one otherwise.
const mapOf = (s, id) => (id === s.area ? s : thawMap(s.areas[id].map));
// A region's record, built now if it was not yet (for pieces that put things in regions the player has not been near).
function ensureRegion(s, cx, cy) {
  const id = regionId(s, cx, cy);
  if (!s.areas[id]) s.areas[id] = { id, kind: 'region', cx, cy, biome: sketchOf(s, cx, cy).biome };
  buildArea(s, s.areas[id]);
  return s.areas[id];
}
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
      buildArea(s, rec);
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
  thawMap(rec.map);
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

/* Memory: only the maps near the traveller are kept as plain lists. The rest keep their sites, creatures and what lies
   there as they are, but pack their grids (ground, height, what has been seen) into the short text a save uses, a
   tenth of the size; anything that asks for a map through mapOf, buildArea or ensureRegion gets it unpacked again.
   Near means: the area you are in, the regions round the one you are in (or above), their towns, and the levels next
   to yours. Called whenever the traveller changes area. */
function nearIds(s) {
  const out = new Set([s.area]),
    here = outdoorRec(s),
    rec = areaRec(s);
  if (here && here.cx !== undefined)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const id = regionId(s, wrap(here.cx + dx, s.world.cols), wrap(here.cy + dy, s.world.rows));
        out.add(id);
        const t = townInRegion(s, id);
        if (t) out.add(townId(t));
      }
  if (rec.from) out.add(rec.from.area); // the way back up (and the rest is unpacked as you climb)
  return out;
}
function coolDown(s) {
  const near = nearIds(s);
  for (const id in s.areas) if (!near.has(id) && s.areas[id].map) freezeMap(s.areas[id].map);
}
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
  coolDown(s);
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
  coolDown(s);
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
    thawMap(m);
    if (s.areas[id].kind === 'town') continue; // a town is easy to find your way around
    m.seen.fill(0);
    for (const k in m.sites) {
      m.sites[k].seen = false;
      m.sites[k].visited = false;
    }
  }
}

// A place in any region, in the frame of the region the player is in (or the door they came in by), going the short way
// round the world. For directions and for walking toward places in other regions.
function localPos(s, area, x, y) {
  const here = outdoorRec(s),
    there = s.areas[area] || here;
  return {
    x: x + wrapDelta(there.cx, here.cx, s.world.cols) * W,
    y: y + wrapDelta(there.cy, here.cy, s.world.rows) * H,
  };
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
  ensureRegion,
  buildArea,
  ensureTown,
  inTownBlock,
  townDoor,
  TOWN_GATE,
  TOWN_R,
  TOWN_SPAN,
  townEntry,
  townExit,
  homePos,
  localPos,
  townArea,
  townId,
  allTowns,
  townById,
  townInRegion,
  townBlockAt,
  curTown,
  withTown,
  townSfx,
  inTown,
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
  coolDown,
};
