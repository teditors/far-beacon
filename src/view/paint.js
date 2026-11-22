/* Painted textures, made in code when the page starts (commission 5): no image files. Each is a small grey pattern
   around middle grey, multiplied into a surface's own colour, so one texture serves every colour of stone or cloth and
   a town's culture keeps its colours. Soft blotches and strokes, as if laid in with a brush: never photographs.

   - GROUND: one texture whose four channels are four kinds of ground (grass, grains, rock, snow and still water). The
     ground's shader (groundMaterial) mixes them by a weight on each point of the land, so every kind of ground has its
     own grain for the price of one texture.
   - SURFACES: stone, brick, wood, thatch, tiles, cloth and plaster, for buildings, props and people (C5.4 onward). */
import { lookOn, LOOK_SWITCHES, Q } from './quality.js';

LOOK_SWITCHES.push(['paint', 'Painted textures']);

// a small seeded source, so the textures are the same on every load
function rnd(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// value noise that wraps at n cells across a texture of size px: tiles without a seam
function noiseField(px, n, seed) {
  const r = rnd(seed),
    g = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) g[i] = r();
  const out = new Float32Array(px * px),
    s = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const u = (x / px) * n,
        v = (y / px) * n,
        x0 = Math.floor(u),
        y0 = Math.floor(v),
        tx = s(u - x0),
        ty = s(v - y0),
        at = (i, j) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
      out[y * px + x] =
        (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    }
  return out;
}
// a brush stroke into a float field (wrapping): a short line of soft dabs
function stroke(f, px, x, y, dx, dy, len, w, v) {
  for (let i = 0; i < len; i++) {
    const cx = x + dx * i,
      cy = y + dy * i;
    for (let j = -w; j <= w; j++)
      for (let k = -w; k <= w; k++) {
        const d = Math.hypot(j, k) / (w + 0.5);
        if (d > 1) continue;
        const ix = (((Math.round(cx + j) % px) + px) % px) + (((Math.round(cy + k) % px) + px) % px) * px;
        f[ix] += v * (1 - d);
      }
  }
}
const toByte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
function dataTexture(data, px) {
  const t = new THREE.DataTexture(data, px, px, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = Q.aniso || 2;
  t.needsUpdate = true;
  return t;
}

/* ---------- the ground ---------- */
let GROUND = null;
function groundTexture() {
  if (GROUND && GROUND.image.width === (Q.texPx >= 256 ? 256 : 128)) return GROUND;
  const px = Q.texPx >= 256 ? 256 : 128, // finer on High
    S = px / 128,
    r = rnd(91),
    big = noiseField(px, 4, 1),
    mid = noiseField(px, 12, 2),
    fine = noiseField(px, 40, 3);
  // grass: tufts of short upright blades, light and dark, over a soft mottle
  const grass = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) grass[i] = 0.5 + (big[i] - 0.5) * 0.35 + (mid[i] - 0.5) * 0.3;
  for (let k = 0; k < 900 * S * S; k++) {
    const x = r() * px,
      y = r() * px,
      lean = (r() - 0.5) * 0.5;
    stroke(grass, px, x, y, lean, -1, (3 + Math.floor(r() * 4)) * S, 0, r() < 0.5 ? -0.22 : 0.2);
  }
  // grains (sand, salt, mud, ash): fine speckle and wind ripples
  const grains = new Float32Array(px * px);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x;
      grains[i] = 0.5 + (mid[i] - 0.5) * 0.35 + (fine[i] - 0.5) * 0.45 + 0.07 * Math.sin((y / px) * Math.PI * 2 * 6 + big[i] * 5);
    }
  for (let k = 0; k < 700 * S * S; k++) grains[Math.floor(r() * px * px)] += r() < 0.5 ? -0.25 : 0.2;
  // rock: broad flat facets and a few dark cracks
  const rock = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) rock[i] = 0.5 + (Math.round(mid[i] * 4) / 4 - 0.5) * 0.4 + (fine[i] - 0.5) * 0.2;
  for (let k = 0; k < 26; k++) {
    let x = r() * px,
      y = r() * px,
      a = r() * Math.PI * 2;
    for (let s = 0; s < 6; s++) {
      a += (r() - 0.5) * 1.2;
      stroke(rock, px, x, y, Math.cos(a), Math.sin(a), 5 * S, 0, -0.18);
      x += Math.cos(a) * 5 * S;
      y += Math.sin(a) * 5 * S;
    }
  }
  // snow and still water: nearly smooth, soft drifts and a little glitter
  const snow = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) snow[i] = 0.5 + (big[i] - 0.5) * 0.25 + (mid[i] - 0.5) * 0.12;
  for (let k = 0; k < 160 * S * S; k++) snow[Math.floor(r() * px * px)] += 0.25;
  const d = new Uint8Array(px * px * 4);
  for (let i = 0; i < px * px; i++) {
    d[i * 4] = toByte(grass[i]);
    d[i * 4 + 1] = toByte(grains[i]);
    d[i * 4 + 2] = toByte(rock[i]);
    d[i * 4 + 3] = toByte(snow[i]);
  }
  GROUND = dataTexture(d, px);
  GROUND.dispose = () => {}; // made once, for every build
  return GROUND;
}
// Which kinds of ground a colour looks like, as four weights summing to 1 (grass, grains, rock, snow/water). The ground's
// colours are the biome's own, so reading the kind from the colour works for generated biomes too. steep: 0 flat to 1.
function surfaceOf(c, steep, out) {
  const L = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b,
    max = Math.max(c.r, c.g, c.b),
    min = Math.min(c.r, c.g, c.b),
    sat = max > 0 ? (max - min) / max : 0;
  let grass = c.g >= c.r * 0.98 && c.g >= c.b * 0.9 && sat > 0.12 ? 1 : 0,
    snow = L > 0.72 && sat < 0.22 ? 1 : c.b > c.r * 1.25 && c.b > c.g ? 0.8 : 0,
    rock = Math.min(1, Math.max(0, (steep - 0.25) * 3)) + (sat < 0.12 && L < 0.5 ? 0.6 : 0),
    grains = snow ? 0.05 : 0.35;
  if (snow) grass *= 0.2;
  const t = grass + snow + rock + grains;
  out[0] = grass / t;
  out[1] = grains / t;
  out[2] = rock / t;
  out[3] = snow / t;
  return out;
}
// The ground's material: Lambert with vertex colours, and, when painted, the four grains mixed by the `surf` weights,
// faded out with distance (where they would only shimmer).
function groundMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  if (!paintOn()) return mat;
  const tex = groundTexture();
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.groundMap = { value: tex };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 surf;\nvarying vec4 vSurf;\nvarying vec2 vGround;\nvarying float vNear;',
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvSurf = surf;\nvGround = position.xz / 5.0;\nvNear = clamp(1.0 - (-mvPosition.z - 60.0) / 160.0, 0.0, 1.0);',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D groundMap;\nvarying vec4 vSurf;\nvarying vec2 vGround;\nvarying float vNear;',
      )
      .replace(
        '#include <color_fragment>',
        // the grain, and close up a second, finer pass of it (a detail texture) so near ground stays crisp
        '#include <color_fragment>\nfloat grain = dot(texture2D(groundMap, vGround), vSurf);\nfloat fineG = dot(texture2D(groundMap, vGround * 4.37 + 0.31), vSurf);\ndiffuseColor.rgb *= mix(1.0, 0.55 + 0.9 * grain, 0.35 + 0.65 * vNear) * mix(1.0, 0.75 + 0.5 * fineG, vNear * vNear);',
      );
  };
  mat.customProgramCacheKey = () => 'ground-painted';
  return mat;
}
const paintOn = () => lookOn('paint') && lookOn('light') && Q.grain;

/* ---------- surfaces of things ---------- */
const SURF = {};
/* ---------- surfaces of built and worn things (C5.17: sharper) ----------
   Each maker draws at any size (px: 64 on Low, 128 on Medium, 256 on High) in fractions of the texture, so a texture
   covers the same metres at every quality, only finer. They are built from crisp shapes (blocks with a bevel that
   catches the light on top and shades below, gaps, grain, knots, pebbles), over fBm (noise at every scale) and a
   pixel-fine grit, rather than soft blotches, so they stay sharp up close. */
// noise at every scale from coarse to the pixel: what makes a surface read at any distance
function fbm(px, seed) {
  const f = new Float32Array(px * px);
  let w = 0.5,
    tot = 0;
  for (let n = 4; n <= Math.min(64, px / 2); n *= 2) {
    const o = noiseField(px, n, seed + n);
    for (let i = 0; i < f.length; i++) f[i] += (o[i] - 0.5) * w;
    tot += w;
    w *= 0.62;
  }
  for (let i = 0; i < f.length; i++) f[i] /= tot;
  return f; // about -0.5..0.5
}
// a grid of blocks in rows (bricks, stones, shingles): for each pixel its block, and how far it is from the block's
// edges (0 at the edge, in fractions of a block's height), with each row shifted by half a block
function cellOf(x, y, px, rows, cols, stagger, jag) {
  const ry = (y / px) * rows,
    row = Math.floor(ry),
    off = stagger ? (row % 2) * 0.5 + (jag ? (rnd(row * 7 + 3)() - 0.5) * 0.3 : 0) : 0,
    rx = (x / px) * cols + off,
    col = Math.floor(rx),
    fy = ry - row,
    fx = rx - col;
  return {
    row,
    col: ((col % cols) + cols) % cols,
    fx,
    fy,
    edge: Math.min(fy, 1 - fy, (fx * rows) / cols, ((1 - fx) * rows) / cols),
  };
}
// a block's light: its own tone, light along its top edge, shade along its bottom, dark in the joint
function bevel(c, tone, joint) {
  if (c.edge < joint) return 0.18 + c.edge * 2;
  let v = 0.5 + tone;
  if (c.fy < joint + 0.07) v += 0.12; // the top catches the light
  if (c.fy > 1 - joint - 0.1) v -= 0.14; // the bottom in shadow
  return v;
}
// Stones on a jittered grid of n x n cells (wrapping): for a pixel, the distance to the nearest stone's middle (d1), to
// the next (d2), that stone's own number (b) and how far below its middle the pixel is (dy). Only the 3 x 3 cells round
// the pixel are looked at, so it is quick at any size.
function stones(px, n, r, jit) {
  const P = [],
    cell = px / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) P.push([(i + 0.5 + (r() - 0.5) * jit) * cell, (j + 0.5 + (r() - 0.5) * jit) * cell, r()]);
  const out = { d1: 0, d2: 0, b: 0, dy: 0 };
  return (x, y) => {
    const ci = Math.floor(x / cell),
      cj = Math.floor(y / cell);
    let d1 = 1e9,
      d2 = 1e9;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ii = ci + di,
          jj = cj + dj,
          q = P[(((jj % n) + n) % n) * n + (((ii % n) + n) % n)],
          qx = q[0] + Math.floor(ii / n) * px,
          qy = q[1] + Math.floor(jj / n) * px,
          d = Math.hypot(x - qx, y - qy);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          out.b = q[2];
          out.dy = y - qy;
        } else if (d < d2) d2 = d;
      }
    out.d1 = d1;
    out.d2 = d2;
    return out;
  };
}
const MAKERS = {
  // dressed stone in courses, each block its own tone, bevelled
  stone(px, r, F, v) {
    const f = new Float32Array(px * px),
      rows = [5, 4, 7][v],
      cols = [3, 2, 4][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = cellOf(x, y, px, rows, cols, true, true),
          tone = (rnd(c.row * 31 + c.col * 7 + v * 1000)() - 0.5) * 0.22;
        f[y * px + x] = bevel(c, tone, 0.06) + F[y * px + x] * 0.22;
      }
    return f;
  },
  // small bricks, crisp joints
  brick(px, r, F, v) {
    const f = new Float32Array(px * px),
      rows = [12, 10, 16][v],
      cols = [6, 5, 8][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = cellOf(x, y, px, rows, cols, true, false),
          tone = (rnd(c.row * 13 + c.col + v * 977)() - 0.5) * 0.28;
        f[y * px + x] = (c.edge < 0.1 ? 0.62 : bevel(c, tone, 0)) + F[y * px + x] * 0.16;
      }
    return f;
  },
  // rubble: rough stones of every size in mortar, each rounded by its own shading
  rubble(px, r, F, v) {
    const f = new Float32Array(px * px),
      n = [5, 4, 6][v],
      cell = px / n,
      at = stones(px, n, r, 0.9);
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = at(x, y),
          gap = (c.d2 - c.d1) / cell;
        f[y * px + x] =
          gap < 0.05 ? 0.15 : 0.45 + (c.b - 0.5) * 0.28 + Math.min(0.12, gap * 0.5) - (c.dy / cell) * 0.1 + F[y * px + x] * 0.25;
      }
    return f;
  },
  // planks running across, with grain, knots and dark gaps
  wood(px, r, F, v) {
    const f = new Float32Array(px * px),
      planks = [5, 4, 7][v],
      knots = [];
    for (let k = 0; k < planks * 1.5; k++) knots.push([r() * px, r() * px, (1 + r() * 1.5) * (px / 64)]);
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const p = Math.floor((y / px) * planks),
          fy = ((y / px) * planks) % 1,
          b = rnd(p * 17 + 3 + v * 51)() - 0.5,
          i = y * px + x;
        let g = 0.52 + b * 0.25 + 0.07 * Math.sin((y / px) * planks * 40 + F[i] * 14 + p * 3) + F[i] * 0.12;
        for (const [kx, ky, kr] of knots) {
          const d = Math.hypot(x - kx, (y - ky) * 2);
          if (d < kr * 2) g -= 0.18 * (1 - d / (kr * 2));
        }
        if (fy < 0.06) g = 0.16;
        else if (fy < 0.12) g -= 0.1;
        f[i] = g;
      }
    return f;
  },
  // logs laid one on another: rounded, barked, dark where they meet
  logs(px, r, F, v) {
    const f = new Float32Array(px * px),
      rows = [5, 4, 6][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const row = Math.floor((y / px) * rows),
          fy = ((y / px) * rows) % 1,
          b = rnd(row * 29 + v * 7)() - 0.5,
          i = y * px + x,
          round = Math.sin(fy * Math.PI);
        f[i] =
          fy < 0.05 || fy > 0.95
            ? 0.12
            : 0.3 + round * 0.32 + b * 0.12 + 0.06 * Math.sin((x / px) * 70 + F[i] * 10 + row) + F[i] * 0.18;
      }
    return f;
  },
  // thatch: crowded straws in layers, each layer's lip shading the one below
  thatch(px, r, F, v) {
    const f = new Float32Array(px * px),
      s = px / 64,
      layers = 4;
    for (let i = 0; i < f.length; i++) f[i] = 0.42 + F[i] * 0.3;
    for (let k = 0, m = [900, 650, 1200][v] * s * s; k < m; k++)
      stroke(f, px, r() * px, r() * px, (r() - 0.5) * 0.15, 1, (6 + r() * 10) * s, 0, r() < 0.5 ? -0.16 : 0.2);
    for (let y = 0; y < px; y++) {
      const fy = ((y / px) * layers) % 1;
      for (let x = 0; x < px; x++) f[y * px + x] += fy > 0.88 ? -0.22 : fy < 0.1 ? 0.08 : 0;
    }
    return f;
  },
  // roof tiles: overlapping rows of rounded scales
  tiles(px, r, F, v) {
    const f = new Float32Array(px * px),
      rows = [8, 6, 10][v],
      cols = [8, 6, 9][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = cellOf(x, y, px, rows, cols, true, false),
          dx = c.fx - 0.5,
          lip = c.fy - (0.75 + Math.sqrt(Math.max(0, 0.25 - dx * dx)) * 0.5),
          tone = (rnd(c.row * 5 + c.col + v * 9)() - 0.5) * 0.16,
          i = y * px + x;
        f[i] = lip > 0 ? 0.2 : 0.38 + c.fy * 0.32 - Math.abs(dx) * 0.3 + tone + F[i] * 0.12;
      }
    return f;
  },
  // wooden shingles: short boards in staggered rows, each its own weathering
  shingle(px, r, F, v) {
    const f = new Float32Array(px * px),
      rows = [10, 8, 12][v],
      cols = [6, 5, 8][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = cellOf(x, y, px, rows, cols, true, true),
          b = rnd(c.row * 41 + c.col + v * 3)() - 0.5,
          i = y * px + x;
        f[i] =
          c.fy > 0.88 || c.fx < 0.04
            ? 0.18
            : 0.4 + c.fy * 0.22 + b * 0.24 + 0.05 * Math.sin((x / px) * cols * 18 + F[i] * 8) + F[i] * 0.12;
      }
    return f;
  },
  // woven cloth: threads over and under, and a soft fold
  cloth(px, r, F, v) {
    const f = new Float32Array(px * px),
      t = Math.max(1, Math.round(px / 64));
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const over = (Math.floor(x / t) + Math.floor(y / t)) % 2;
        f[y * px + x] = 0.52 + (over ? 0.06 : -0.06) + F[y * px + x] * 0.3;
      }
    return f;
  },
  // plaster or daub: smooth, faintly mottled, with a few hairline cracks and a fine grit
  plaster(px, r, F, v) {
    const f = new Float32Array(px * px),
      s = px / 64;
    for (let i = 0; i < f.length; i++) f[i] = 0.54 + F[i] * [0.22, 0.3, 0.16][v] + (r() - 0.5) * 0.05;
    for (let k = 0, m = [4, 8, 1][v]; k < m; k++) {
      let x = r() * px,
        y = r() * px,
        a = r() * 6.28;
      for (let j = 0; j < 6; j++) {
        a += (r() - 0.5) * 1.4;
        stroke(f, px, x, y, Math.cos(a), Math.sin(a), 3 * s, 0, -0.08);
        x += Math.cos(a) * 3 * s;
        y += Math.sin(a) * 3 * s;
      }
    }
    return f;
  },
  // adobe: smoothed mud over big bricks, flecked with straw
  adobe(px, r, F, v) {
    const f = new Float32Array(px * px),
      s = px / 64,
      rows = [4, 3, 5][v];
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = cellOf(x, y, px, rows, 2, true, true);
        f[y * px + x] = 0.54 + F[y * px + x] * 0.24 - (c.edge < 0.03 ? 0.07 : 0) + (r() - 0.5) * 0.04;
      }
    for (let k = 0; k < 160 * s * s; k++)
      stroke(f, px, r() * px, r() * px, r() - 0.5, r() - 0.5, 2 * s, 0, r() < 0.5 ? 0.16 : -0.1);
    return f;
  },
  // cobbles: rounded stones set close, dark between
  cobble(px, r, F, v) {
    const f = new Float32Array(px * px),
      n = [7, 6, 9][v],
      cell = px / n,
      at = stones(px, n, r, 0.6);
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const c = at(x, y),
          gap = (c.d2 - c.d1) / cell,
          dome = Math.min(1, gap * 4);
        f[y * px + x] = gap < 0.06 ? 0.3 : 0.36 + dome * 0.22 + (c.b - 0.5) * 0.18 - (c.dy / cell) * 0.12 + F[y * px + x] * 0.12;
      }
    return f;
  },
  // packed dirt: grit, pebbles light and dark, a faint wheel rut
  dirt(px, r, F, v) {
    const f = new Float32Array(px * px),
      s = px / 64;
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++)
        f[y * px + x] =
          0.5 + F[y * px + x] * 0.3 + (r() - 0.5) * 0.12 - (v === 1 ? 0.05 * Math.exp(-(((x / px - 0.3) * 12) ** 2)) : 0);
    for (let k = 0; k < [22, 16, 34][v] * s * s; k++) {
      const x = r() * px,
        y = r() * px,
        rad = (0.35 + r() * 0.7) * s,
        light = r() < 0.5;
      for (let j = -Math.ceil(rad); j <= rad; j++)
        for (let i = -Math.ceil(rad); i <= rad; i++) {
          const d = Math.hypot(i, j);
          if (d > rad) continue;
          const q = (((Math.round(y + j) % px) + px) % px) * px + (((Math.round(x + i) % px) + px) % px);
          f[q] = light ? 0.6 - (j / rad) * 0.06 : 0.4;
        }
    }
    return f;
  },
};
// A surface's texture by name, in one of three variants (v: 0, 1, 2: other sizes of block, plank or tile, another
// seed), at the quality's size, or null when the look is plain.
function surface(name, v) {
  if (!lookOn('paint') || !MAKERS[name]) return null;
  v = Math.abs(v | 0) % 3;
  const px = Q.texPx || 128,
    key = name + ':' + v + ':' + px;
  if (SURF[key]) return SURF[key];
  const F = fbm(px, name.length * 7 + 1 + v * 13 + name.charCodeAt(1) * 31),
    f = MAKERS[name](px, rnd(name.charCodeAt(0) * 101 + v * 7919), F, v),
    d = new Uint8Array(px * px * 4);
  for (let i = 0; i < px * px; i++) {
    const c = toByte(Math.min(1, f[i] * 1.6)); // centred near 0.8 so a texture darkens a colour only a little
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = c;
    d[i * 4 + 3] = 255;
  }
  const t = dataTexture(d, px);
  t.dispose = () => {}; // shared by every build
  return (SURF[key] = t);
}
const SURFACES = Object.keys(MAKERS);
export { groundMaterial, groundTexture, surfaceOf, surface, paintOn, SURFACES, warmSurfaces };
// Make every surface ahead of need, one at a time when the page is idle, so the first town seen does not wait for its
// textures (each takes up to a few tens of milliseconds at High's size).
function warmSurfaces() {
  const todo = [];
  for (const n of SURFACES) for (const v of [0, 1, 2]) todo.push([n, v]);
  const next = () => {
    const job = todo.shift();
    if (!job) return;
    surface(job[0], job[1]);
    (window.requestIdleCallback || ((f) => setTimeout(f, 80)))(next);
  };
  setTimeout(next, 1500);
}
if (typeof window !== 'undefined') window.__paint = { surface, SURFACES, SURF };
