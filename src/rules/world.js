/* The world: a finite grid of regions that wraps around in both directions, sketched up front from the seed.
   Each region's detail is generated the first time the player walks into it (see GENERATORS.region in worldgen.js). */
import { C, W, H, stream } from './core.js';
import { wrap, wrapDelta } from './areas.js';

// The coarse map: one entry per region. More will live here as the world grows (peoples, towns, roads).
function makeSketch(seed, cols, rows, homeBiome) {
  const r = stream(seed, 'sketch'),
    ids = C.biomes.map((b) => b.id),
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

export { makeSketch, worldNoise };
