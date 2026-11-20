/* Turns the rules map into a continuous height field: the region the player is in at full detail, and a wide margin
   of the regions around it at half detail, so the land can be seen running on across every border. */
import { HALF, R, TS, WORLD, clamp, lerp, mulberry, smooth } from './ctx.js';
import { Q } from './quality.js';

const PAD = { town: 102, vault: 11, beacon: 9, spring: 6, hamlet: 10, camp: 8, siege: 8, stone: 7, den: 9 }; // metres of level ground under each kind of site
const SINK = 0.15; // the coarse ground sits a hand lower, so it never shows through the fine ground where they overlap
// How much land is drawn and how finely, from the quality setting (quality.js). setDetail() is called before each build.
let MARGIN, // tiles of the neighbouring regions that are drawn: a little further than the eye can see
  EW, // the drawn land is EW x EW tiles
  N, // cells of the fine ground across the player's region
  CELL,
  CC, // the margin's ground mesh is coarser
  NC,
  EHALF;
function setDetail() {
  MARGIN = Q.margin;
  EW = R.W + 2 * MARGIN;
  N = Q.fine;
  CELL = WORLD / N;
  CC = CELL * Q.coarse;
  NC = Math.round((EW * TS) / CC);
  EHALF = (EW * TS) / 2;
}
setDetail();

/* The land around the player, cut from the nine regions into one square of tiles. Tile (x, y) is in the player's
   region when 0 <= x < W; outside that range it belongs to a neighbour (and the world wraps). */
function landAround(s) {
  const rec = R.outdoorRec(s),
    w = s.world,
    W = R.W,
    got = {},
    biomes = [],
    region = (dx, dy) => {
      const k = dx + ',' + dy;
      if (!got[k]) {
        const id = R.regionId(s, R.wrap(rec.cx + dx, w.cols), R.wrap(rec.cy + dy, w.rows)),
          biome = s.areas[id].biome;
        if (!biomes.includes(biome)) biomes.push(biome);
        got[k] = { map: R.mapOf(s, id), b: biomes.indexOf(biome) };
      }
      return got[k];
    };
  region(0, 0);
  const land = {
    cx: rec.cx,
    cy: rec.cy,
    terrain: new Uint8Array(EW * EW),
    elev: new Float32Array(EW * EW),
    road: new Uint8Array(EW * EW),
    biome: new Uint8Array(EW * EW),
    siteAt: {},
    sites: [], // { x, y (tiles, may lie outside the region), k (tile index within its own region), st, here }
    biomes,
  };
  for (let ey = 0; ey < EW; ey++)
    for (let ex = 0; ex < EW; ex++) {
      const x = ex - MARGIN,
        y = ey - MARGIN,
        dx = Math.floor(x / W),
        dy = Math.floor(y / W),
        g = region(dx, dy),
        i = (y - dy * W) * W + (x - dx * W),
        e = ey * EW + ex;
      land.terrain[e] = g.map.terrain[i];
      land.elev[e] = g.map.elev[i];
      land.road[e] = g.map.road[i] ? 1 : 0;
      land.biome[e] = g.b;
      const st = g.map.sites[i];
      if (st) {
        const site = { x, y, k: i, st, here: !dx && !dy };
        land.sites.push(site);
        land.siteAt[e] = site;
      }
    }
  land.biomes = biomes.map((id) => R.byId(R.C.biomes, id));
  return land;
}

function makeTerrain(s) {
  setDetail();
  const land = landAround(s),
    r = mulberry(s.seed ^ 0x51f15e),
    T = new Float32Array(4096);
  for (let i = 0; i < 4096; i++) T[i] = r();
  // Smooth noise that repeats at the size of the world, so the ground has no seam anywhere, wrap-around included.
  // `per` is how many noise cells cross one region.
  const noise = (per, salt) => {
    const px = s.world.cols * per,
      pz = s.world.rows * per,
      at = (ix, iz) => T[((R.wrap(ix, px) * 73856093) ^ (R.wrap(iz, pz) * 19349663) ^ (salt * 83492791)) & 4095];
    return (x, z) => {
      const u = ((x + HALF) / WORLD + land.cx) * per,
        v = ((z + HALF) / WORLD + land.cy) * per,
        x0 = Math.floor(u),
        z0 = Math.floor(v),
        tx = smooth(u - x0),
        tz = smooth(v - z0);
      return (
        (at(x0, z0) * (1 - tx) + at(x0 + 1, z0) * tx) * (1 - tz) + (at(x0, z0 + 1) * (1 - tx) + at(x0 + 1, z0 + 1) * tx) * tz
      );
    };
  };
  const nBig = noise(3, 1),
    nMid = noise(12, 2),
    nFine = noise(46, 3),
    tint = noise(25, 4);
  // sample a per-tile grid smoothly at a point given in metres
  const field = (g, ease) => (x, z) => {
    const fx = clamp((x + HALF) / TS - 0.5 + MARGIN, 0, EW - 1.001),
      fz = clamp((z + HALF) / TS - 0.5 + MARGIN, 0, EW - 1.001),
      ix = Math.floor(fx),
      iz = Math.floor(fz),
      tx = ease ? smooth(fx - ix) : fx - ix,
      tz = ease ? smooth(fz - iz) : fz - iz;
    return (
      (g[iz * EW + ix] * (1 - tx) + g[iz * EW + ix + 1] * tx) * (1 - tz) +
      (g[(iz + 1) * EW + ix] * (1 - tx) + g[(iz + 1) * EW + ix + 1] * tx) * tz
    );
  };
  const lv = new Float32Array(EW * EW);
  for (let y = 0; y < EW; y++)
    for (let x = 0; x < EW; x++) {
      let a = 0,
        n = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const xx = x + i,
            yy = y + j;
          if (xx < 0 || yy < 0 || xx >= EW || yy >= EW) continue;
          a += land.elev[yy * EW + xx];
          n++;
        }
      lv[y * EW + x] = 0.55 * land.elev[y * EW + x] + (0.45 * a) / n;
    }
  const level = field(lv, true);
  const mask = (type) => {
    const g = new Float32Array(EW * EW);
    for (let i = 0; i < EW * EW; i++) g[i] = land.terrain[i] === type ? 1 : 0;
    const f = field(g, false);
    return (x, z) => clamp((f(x, z) - 0.3) / 0.4, 0, 1);
  };
  const masks = [mask(3), mask(4), mask(5)];
  const tileOf = (x) => Math.floor((x + HALF) / TS), // the tile under a point; outside 0..W-1 it is a neighbour's
    etile = (x, z) => clamp(tileOf(z) + MARGIN, 0, EW - 1) * EW + clamp(tileOf(x) + MARGIN, 0, EW - 1),
    roadAt = (x, z) => land.road[etile(x, z)];
  // How much of each biome is at a point: 1 deep inside its region, shading to a mix across a border.
  const share = land.biomes.map((_, b) => {
    const g = new Float32Array(EW * EW),
      t = new Float32Array(EW * EW),
      B = 3;
    for (let y = 0; y < EW; y++)
      for (let x = 0; x < EW; x++) {
        let a = 0;
        for (let i = -B; i <= B; i++) a += land.biome[y * EW + clamp(x + i, 0, EW - 1)] === b ? 1 : 0;
        t[y * EW + x] = a / (2 * B + 1);
      }
    for (let y = 0; y < EW; y++)
      for (let x = 0; x < EW; x++) {
        let a = 0;
        for (let i = -B; i <= B; i++) a += t[clamp(y + i, 0, EW - 1) * EW + x];
        g[y * EW + x] = a / (2 * B + 1);
      }
    return field(g, false);
  });
  const raw = (x, z) => {
    const l = level(x, z);
    return (
      (l <= 1 ? l * 15 : 15 + (l - 1) * 34) + 14 * nBig(x, z) + 7 * nMid(x, z) * Math.max(0.15, 0.4 + l * 0.6) + 1.6 * nFine(x, z)
    );
  };
  // two height grids: fine over the player's region, coarse over everything drawn
  // (the coarse grid skips the middle, which is never drawn or sampled from it)
  const grid = (n, half, cell, hole) => {
    const h = new Float32Array((n + 1) * (n + 1));
    for (let iz = 0; iz <= n; iz++)
      for (let ix = 0; ix <= n; ix++) {
        const x = -half + ix * cell,
          z = -half + iz * cell;
        if (Math.abs(x) < hole && Math.abs(z) < hole) continue;
        h[iz * (n + 1) + ix] = raw(x, z);
      }
    return { h, n, half, cell };
  };
  const fine = grid(N, HALF, CELL, 0),
    coarse = grid(NC, EHALF, CC, HALF - 4 * CC);
  // a level pad as wide as what stands there, then a slope that eases back into the land around it
  const padInto = (g, site) => {
    const cx = (site.x + 0.5) * TS - HALF,
      cz = (site.y + 0.5) * TS - HALF,
      ci = Math.round((cx + g.half) / g.cell),
      cj = Math.round((cz + g.half) / g.cell),
      flat = Math.max(PAD[site.st.kind] || 8, g.cell * 1.1),
      rad = flat + 13,
      n = Math.ceil(rad / g.cell),
      h0 = raw(cx, cz) - (site.st.kind === 'spring' ? 1.2 : 0);
    for (let j = -n; j <= n; j++)
      for (let i = -n; i <= n; i++) {
        const d = Math.hypot(i, j) * g.cell,
          a = ci + i,
          b = cj + j;
        if (d >= rad || a < 0 || b < 0 || a > g.n || b > g.n) continue;
        const q = b * (g.n + 1) + a;
        g.h[q] = lerp(g.h[q], h0, d <= flat ? 1 : smooth(1 - (d - flat) / (rad - flat)));
      }
  };
  for (const site of land.sites) {
    padInto(fine, site);
    padInto(coarse, site);
  }
  // the same two triangles per cell that the ground mesh is drawn with, so things stand exactly on what you see
  const sample = (g, x, z) => {
    const fx = clamp((x + g.half) / g.cell, 0, g.n - 0.001),
      fz = clamp((z + g.half) / g.cell, 0, g.n - 0.001),
      ix = Math.floor(fx),
      iz = Math.floor(fz),
      tx = fx - ix,
      tz = fz - iz,
      H = (a, b) => g.h[b * (g.n + 1) + a];
    return tx + tz <= 1
      ? H(ix, iz) + (H(ix + 1, iz) - H(ix, iz)) * tx + (H(ix, iz + 1) - H(ix, iz)) * tz
      : H(ix + 1, iz + 1) + (H(ix, iz + 1) - H(ix + 1, iz + 1)) * (1 - tx) + (H(ix + 1, iz) - H(ix + 1, iz + 1)) * (1 - tz);
  };
  const inside = (x, z) => Math.abs(x) <= HALF && Math.abs(z) <= HALF,
    height = (x, z) => (inside(x, z) ? sample(fine, x, z) : sample(coarse, x, z) - SINK);
  // A random-number source for one tile that is the same whichever region it is looked at from, so that rocks and
  // trees stay where they are when the player crosses a border.
  const tileRand = (x, y, salt) => {
    const gx = R.wrap(land.cx * R.W + x, s.world.cols * R.W),
      gy = R.wrap(land.cy * R.H + y, s.world.rows * R.H);
    return mulberry((s.seed ^ Math.imul(gx + 1, 374761393) ^ Math.imul(gy + 1, 668265263) ^ Math.imul(salt, 2246822519)) | 0);
  };
  return { land, fine, coarse, height, level, tint, masks, roadAt, share, tileRand, etile, tileOf, inside };
}

export { makeTerrain, MARGIN, EW, EHALF, CC, NC, N, CELL, SINK, PAD };
