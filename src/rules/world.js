/* The world: a finite grid of regions that wraps around in both directions, sketched up front from the seed.
   Each region's detail is generated the first time the player walks into it (see GENERATORS.region in worldgen.js). */
import { C, W, H, stream } from './core.js';
import { wrap, wrapDelta } from './areas.js';

// The coarse map: one entry per region. More will live here as the world grows (peoples, towns, roads).
function makeSketch(seed, cols, rows, homeBiome) {
  const r = stream(seed, 'sketch'),
    ids = C.biomes.filter((b) => !b.gen).map((b) => b.id), // generated biomes are given out by their own piece
    home = { cx: cols >> 1, cy: rows >> 1 },
    sketch = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++)
      sketch.push({
        biome: ids[Math.floor(r() * ids.length)],
        // danger grows with distance from home, measured the short way round the world
        danger: Math.max(Math.abs(wrapDelta(cx, home.cx, cols)), Math.abs(wrapDelta(cy, home.cy, rows))),
      });
  sketch[home.cy * cols + home.cx].biome = homeBiome;
  if (sketch.length > 1 && sketch.every((e) => e.biome === homeBiome))
    sketch[0].biome = ids[(ids.indexOf(homeBiome) + 1) % ids.length];
  return { cols, rows, home, sketch };
}

// Smooth noise over the whole world in tile coordinates, repeating at the world's width and height, so the land
// lines up across every region border, including the wrap-around.
function hash2(seed, ix, iy) {
  let h = (seed ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function worldNoise(seed, world, cellsPerRegion, salt) {
  const NX = world.cols * cellsPerRegion,
    NY = world.rows * cellsPerRegion,
    sd = (seed ^ Math.imul(salt, 2654435761)) | 0,
    v = (i, j) => hash2(sd, wrap(i, NX), wrap(j, NY));
  return (gx, gy) => {
    const fx = (gx / W) * cellsPerRegion,
      fy = (gy / H) * cellsPerRegion,
      x0 = Math.floor(fx),
      y0 = Math.floor(fy);
    let tx = fx - x0,
      ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
  };
}

// Where rivers and roads cross each border. Both regions that share an edge ask this and get the same answer,
// which is what lets a river or a road carry on from one region into the next.
function edgeRoll(seed, key) {
  const r = stream(seed, 'edge:' + key),
    river = r() < 0.55,
    at = 4 + Math.floor(r() * 28),
    forward = r() < 0.5, // the river flows from the west (or north) region into the east (or south) one
    road = r() < 0.6;
  let roadAt = 4 + Math.floor(r() * 28);
  if (Math.abs(roadAt - at) < 2) roadAt = at >= 18 ? at - 3 : at + 3;
  return { river, at, forward, road, roadAt };
}
function crossings(seed, world, cx, cy) {
  const E = edgeRoll(seed, 'v:' + cx + ':' + cy),
    Wst = edgeRoll(seed, 'v:' + wrap(cx - 1, world.cols) + ':' + cy),
    S = edgeRoll(seed, 'h:' + cx + ':' + cy),
    N = edgeRoll(seed, 'h:' + cx + ':' + wrap(cy - 1, world.rows));
  // x, y: the river's tile; x2, y2: the road's tile; inflow: the river comes into this region here
  return [
    { side: 'east', river: E.river, road: E.road, inflow: !E.forward, x: W - 1, y: E.at, x2: W - 1, y2: E.roadAt },
    { side: 'west', river: Wst.river, road: Wst.road, inflow: Wst.forward, x: 0, y: Wst.at, x2: 0, y2: Wst.roadAt },
    { side: 'south', river: S.river, road: S.road, inflow: !S.forward, x: S.at, y: H - 1, x2: S.roadAt, y2: H - 1 },
    { side: 'north', river: N.river, road: N.road, inflow: N.forward, x: N.at, y: 0, x2: N.roadAt, y2: 0 },
  ];
}

export { makeSketch, worldNoise, crossings };
