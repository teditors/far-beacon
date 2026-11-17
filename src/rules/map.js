/* Questions about the map: where you are, what stands here, directions, and what you can see. */
import { civOf } from './civ.js';
import { H, TERR, W, WALL, biomeOf, clock, idx, say } from './core.js';
import { campHere, inTownBlock, indoors, inOverworld, isDark, worldPos } from './areas.js';
import { stat } from './stats.js';

const phase = (s) => (clock(s).isDay ? biomeOf(s).day : biomeOf(s).night);
const here = (s) => idx(s.player.x, s.player.y);
/* Terrain: the three landforms are shared; forest, river and the special ground are defined per biome in CONTENT. */
const INDOOR_GROUND = {
  6: { name: 'wall', wall: true, moveMin: 0, moveSta: 0, mods: [] },
  7: { name: 'stone floor', moveMin: 0.5, moveSta: 0.15, mods: [] },
};
function terrainInfo(s, t) {
  if (t >= WALL) return INDOOR_GROUND[t];
  const b = biomeOf(s);
  if (t < 3)
    return {
      name: ['flat ground', 'hills', 'mountains'][t],
      moveMin: s.tun.moveMin[TERR[t]],
      moveSta: s.tun.moveSta[TERR[t]],
      mods: [],
    };
  return b[TERR[t]];
}
const groundHere = (s) => terrainInfo(s, s.terrain[here(s)]);
const siteHere = (s) => s.sites[here(s)] || null;
const isShelter = (site) =>
  !!site &&
  (site.kind === 'cave' || site.kind === 'ruin' || site.kind === 'well' || site.kind === 'town' || site.kind === 'vault');
const inShelter = (s) => indoors(s) || isShelter(siteHere(s));
const atCamp = (s) => campHere(s) === here(s);
const passable = (s, x, y) => x >= 0 && y >= 0 && x < W && y < H && s.terrain[idx(x, y)] !== WALL && !inTownBlock(s, x, y);

const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
function dirTo(s, x, y) {
  const dx = x - s.player.x,
    dy = y - s.player.y;
  if (!dx && !dy) return 'here';
  return DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
}
function dirFrom(p, x, y) {
  const dx = x - p.x,
    dy = y - p.y;
  if (!dx && !dy) return 'here';
  return DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
}
const bearing = (s) => dirFrom(worldPos(s), s.goal.x, s.goal.y);
const SITE_NAME = {
  spring: 'spring',
  cave: 'cave',
  cache: 'old cache',
  shrine: 'shrine',
  well: 'well',
  beacon: 'beacon',
  town: 'town',
  exit: 'way out',
  stairsDown: 'stair down',
  stairsUp: 'stair up',
  elder: "elder's hall",
  inn: 'inn',
  shop: 'shop',
  trap: 'trap',
};
const siteName = (s, site) =>
  site.kind === 'ruin'
    ? s.known.civ
      ? civOf(s).ruin
      : 'ruin'
    : site.kind === 'vault'
      ? s.quest.vault.name
      : SITE_NAME[site.kind];

function reveal(s, cx, cy, rad, quiet) {
  const found = [];
  for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(H - 1, Math.ceil(cy + rad)); y++)
    for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(W - 1, Math.ceil(cx + rad)); x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > rad * rad + 0.5) continue;
      if (indoors(s) && !lineOfSight(s, Math.round(cx), Math.round(cy), x, y)) continue;
      const i = idx(x, y);
      if (!s.seen[i]) {
        s.seen[i] = 1;
        const st = s.sites[i];
        if (st && !st.seen && !(st.kind === 'trap' && !st.sprung && stat(s, 'trapSafe', 0) <= 0)) {
          st.seen = true;
          {
            const d = dirTo(s, x, y);
            found.push(siteName(s, st) + (d === 'here' ? ', right here' : ' to the ' + d));
          }
        }
      }
    }
  if (found.length && !quiet)
    say(s, 'You sight: ' + found.slice(0, 4).join('; ') + (found.length > 4 ? '; and more' : '') + '.', 'good');
  return found.length;
}
// Indoors, walls block the view: a tile is visible if the straight line to it crosses no wall before it.
function lineOfSight(s, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0),
    dy = -Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1,
    err = dx + dy,
    x = x0,
    y = y0;
  while (x !== x1 || y !== y1) {
    if ((x !== x0 || y !== y0) && s.terrain[idx(x, y)] === WALL) return false;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return true;
}
function sightRadius(s) {
  if (isDark(s)) return stat(s, 'nightSight', 0) > 0 ? 3.5 : 0.5;
  if (indoors(s)) return 8;
  if (s.weather.storm) return 0.5;
  if (groundHere(s).blind) return 1;
  if (!clock(s).isDay) return stat(s, 'nightSight', 0) > 0 ? 1 : 0.5;
  return 2;
}

export {
  phase,
  here,
  terrainInfo,
  groundHere,
  siteHere,
  isShelter,
  inShelter,
  atCamp,
  DIRS,
  dirTo,
  dirFrom,
  passable,
  lineOfSight,
  bearing,
  SITE_NAME,
  siteName,
  reveal,
  sightRadius,
};
