/* Turns the rules map into a continuous height field. */
import { CELL, HALF, N, R, TS, clamp, lerp, mulberry, smooth, tileX, toTile } from './ctx.js';

const PAD = { town: 15, vault: 11, beacon: 9, spring: 6 }; // metres of level ground under each kind of site

/* ---------- terrain from the rules map ---------- */
function makeTerrain(s) {
  const r = mulberry(s.seed ^ 0x51f15e),
    T = new Float32Array(4096);
  for (let i = 0; i < 4096; i++) T[i] = r();
  const at = (ix, iz) => T[((ix * 73856093) ^ (iz * 19349663)) & 4095];
  const noise = (x, z) => {
    const x0 = Math.floor(x),
      z0 = Math.floor(z),
      tx = smooth(x - x0),
      tz = smooth(z - z0);
    return (at(x0, z0) * (1 - tx) + at(x0 + 1, z0) * tx) * (1 - tz) + (at(x0, z0 + 1) * (1 - tx) + at(x0 + 1, z0 + 1) * tx) * tz;
  };
  const W = R.W,
    lv = new Float32Array(W * W);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      let a = 0,
        n = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const xx = x + i,
            yy = y + j;
          if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
          a += s.elev[yy * W + xx];
          n++;
        }
      lv[y * W + x] = 0.55 * s.elev[y * W + x] + (0.45 * a) / n;
    }
  const level = (x, z) => {
    const fx = clamp((x + HALF) / TS - 0.5, 0, W - 1.001),
      fz = clamp((z + HALF) / TS - 0.5, 0, W - 1.001),
      ix = Math.floor(fx),
      iz = Math.floor(fz),
      tx = smooth(fx - ix),
      tz = smooth(fz - iz);
    return (
      (lv[iz * W + ix] * (1 - tx) + lv[iz * W + ix + 1] * tx) * (1 - tz) +
      (lv[(iz + 1) * W + ix] * (1 - tx) + lv[(iz + 1) * W + ix + 1] * tx) * tz
    );
  };
  const mask = (type) => {
    const g = new Float32Array(W * W);
    for (let i = 0; i < W * W; i++) g[i] = s.terrain[i] === type ? 1 : 0;
    return (x, z) => {
      const fx = clamp((x + HALF) / TS - 0.5, 0, W - 1.001),
        fz = clamp((z + HALF) / TS - 0.5, 0, W - 1.001),
        ix = Math.floor(fx),
        iz = Math.floor(fz),
        tx = fx - ix,
        tz = fz - iz;
      return clamp(
        ((g[iz * W + ix] * (1 - tx) + g[iz * W + ix + 1] * tx) * (1 - tz) +
          (g[(iz + 1) * W + ix] * (1 - tx) + g[(iz + 1) * W + ix + 1] * tx) * tz -
          0.3) /
          0.4,
        0,
        1,
      );
    };
  };
  const masks = [mask(3), mask(4), mask(5)],
    rg = new Float32Array(W * W);
  for (const k in s.road) rg[k] = 1;
  const roadAt = (x, z) =>
    rg[toTile(z) * W + toTile(x)] &&
    Math.max(Math.abs(((x + HALF) % TS) - TS / 2), Math.abs(((z + HALF) % TS) - TS / 2)) < TS * 0.5
      ? 1
      : 0;
  const raw = (x, z) => {
    const l = level(x, z);
    return (
      (l <= 1 ? l * 15 : 15 + (l - 1) * 34) +
      14 * noise(x / 380 + 7, z / 380 + 7) +
      7 * noise(x / 85 + 40, z / 85 + 40) * Math.max(0.15, 0.4 + l * 0.6) +
      1.6 * noise(x / 22 + 90, z / 22 + 90)
    );
  };
  const hg = new Float32Array((N + 1) * (N + 1)),
    gx = (i) => -HALF + i * CELL;
  for (let iz = 0; iz <= N; iz++) for (let ix = 0; ix <= N; ix++) hg[iz * (N + 1) + ix] = raw(gx(ix), gx(iz));
  for (const k in s.sites) {
    const cx = tileX(k % W),
      cz = tileX(Math.floor(k / W)),
      ci = Math.round((cx + HALF) / CELL),
      cj = Math.round((cz + HALF) / CELL),
      h0 = hg[cj * (N + 1) + ci] - (s.sites[k].kind === 'spring' ? 1.2 : 0),
      // a level pad as wide as what stands there, then a slope that eases back into the land around it
      flat = PAD[s.sites[k].kind] || 8,
      rad = flat + 13,
      n = Math.ceil(rad / CELL);
    for (let j = -n; j <= n; j++)
      for (let i = -n; i <= n; i++) {
        const d = Math.hypot(i, j) * CELL;
        if (d >= rad || ci + i < 0 || ci + i > N) continue;
        const q = (cj + j) * (N + 1) + ci + i;
        if (q < 0 || q >= hg.length) continue;
        hg[q] = lerp(hg[q], h0, d <= flat ? 1 : smooth(1 - (d - flat) / (rad - flat)));
      }
  }
  const height = (x, z) => {
    const fx = clamp((x + HALF) / CELL, 0, N - 0.001),
      fz = clamp((z + HALF) / CELL, 0, N - 0.001),
      ix = Math.floor(fx),
      iz = Math.floor(fz),
      tx = fx - ix,
      tz = fz - iz,
      H = (a, b) => hg[b * (N + 1) + a];
    // the same two triangles per cell that the ground mesh is drawn with, so things stand exactly on what you see
    return tx + tz <= 1
      ? H(ix, iz) + (H(ix + 1, iz) - H(ix, iz)) * tx + (H(ix, iz + 1) - H(ix, iz)) * tz
      : H(ix + 1, iz + 1) + (H(ix, iz + 1) - H(ix + 1, iz + 1)) * (1 - tx) + (H(ix + 1, iz) - H(ix + 1, iz + 1)) * (1 - tz);
  };
  return { height, level, noise, masks, roadAt, rand: r };
}

export { makeTerrain };
