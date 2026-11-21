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
  t.anisotropy = 2;
  t.needsUpdate = true;
  return t;
}

/* ---------- the ground ---------- */
let GROUND = null;
function groundTexture() {
  if (GROUND) return GROUND;
  const px = 128,
    r = rnd(91),
    big = noiseField(px, 4, 1),
    mid = noiseField(px, 12, 2),
    fine = noiseField(px, 40, 3);
  // grass: tufts of short upright blades, light and dark, over a soft mottle
  const grass = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) grass[i] = 0.5 + (big[i] - 0.5) * 0.35 + (mid[i] - 0.5) * 0.3;
  for (let k = 0; k < 900; k++) {
    const x = r() * px,
      y = r() * px,
      lean = (r() - 0.5) * 0.5;
    stroke(grass, px, x, y, lean, -1, 3 + Math.floor(r() * 4), 0, r() < 0.5 ? -0.22 : 0.2);
  }
  // grains (sand, salt, mud, ash): fine speckle and wind ripples
  const grains = new Float32Array(px * px);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x;
      grains[i] = 0.5 + (mid[i] - 0.5) * 0.35 + (fine[i] - 0.5) * 0.45 + 0.07 * Math.sin((y / px) * Math.PI * 2 * 6 + big[i] * 5);
    }
  for (let k = 0; k < 700; k++) grains[Math.floor(r() * px * px)] += r() < 0.5 ? -0.25 : 0.2;
  // rock: broad flat facets and a few dark cracks
  const rock = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) rock[i] = 0.5 + (Math.round(mid[i] * 4) / 4 - 0.5) * 0.4 + (fine[i] - 0.5) * 0.2;
  for (let k = 0; k < 26; k++) {
    let x = r() * px,
      y = r() * px,
      a = r() * Math.PI * 2;
    for (let s = 0; s < 6; s++) {
      a += (r() - 0.5) * 1.2;
      stroke(rock, px, x, y, Math.cos(a), Math.sin(a), 5, 0, -0.18);
      x += Math.cos(a) * 5;
      y += Math.sin(a) * 5;
    }
  }
  // snow and still water: nearly smooth, soft drifts and a little glitter
  const snow = new Float32Array(px * px);
  for (let i = 0; i < px * px; i++) snow[i] = 0.5 + (big[i] - 0.5) * 0.25 + (mid[i] - 0.5) * 0.12;
  for (let k = 0; k < 160; k++) snow[Math.floor(r() * px * px)] += 0.25;
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
        '#include <color_fragment>\nfloat grain = dot(texture2D(groundMap, vGround), vSurf);\ndiffuseColor.rgb *= mix(1.0, 0.55 + 0.9 * grain, 0.35 + 0.65 * vNear);',
      );
  };
  mat.customProgramCacheKey = () => 'ground-painted';
  return mat;
}
const paintOn = () => lookOn('paint') && lookOn('light') && Q.grain;

/* ---------- surfaces of things ---------- */
const SURF = {};
// the textures for built and worn things, each made the first time it is asked for
const MAKERS = {
  // dressed stone in courses, each block a little different
  stone(px, r, n) {
    const f = new Float32Array(px * px),
      rows = 6;
    for (let y = 0; y < px; y++) {
      const row = Math.floor((y / px) * rows),
        off = row % 2 ? 0.5 : 0;
      for (let x = 0; x < px; x++) {
        const u = (x / px) * 3 + off,
          col = Math.floor(u),
          fy = ((y / px) * rows) % 1,
          fx = u % 1,
          edge = Math.min(fy, 1 - fy, fx * 2, (1 - fx) * 2),
          block = rnd(row * 31 + ((col % 3) + 3) * 7)();
        f[y * px + x] = 0.5 + (block - 0.5) * 0.25 + (n[y * px + x] - 0.5) * 0.25 - (edge < 0.08 ? 0.3 : 0);
      }
    }
    return f;
  },
  // small bricks
  brick(px, r, n) {
    const f = new Float32Array(px * px),
      rows = 12;
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const row = Math.floor((y / px) * rows),
          u = (x / px) * 6 + (row % 2 ? 0.5 : 0),
          fy = ((y / px) * rows) % 1,
          fx = u % 1,
          b = rnd(row * 13 + Math.floor(u))();
        f[y * px + x] = 0.5 + (b - 0.5) * 0.3 + (n[y * px + x] - 0.5) * 0.15 - (fy < 0.12 || fx < 0.06 ? 0.32 : 0);
      }
    return f;
  },
  // planks running across, with grain
  wood(px, r, n) {
    const f = new Float32Array(px * px),
      planks = 5;
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const p = Math.floor((y / px) * planks),
          fy = ((y / px) * planks) % 1,
          b = rnd(p * 17 + 3)();
        f[y * px + x] =
          0.5 + (b - 0.5) * 0.3 + 0.08 * Math.sin((x / px) * 40 + n[y * px + x] * 9 + p * 3) - (fy < 0.07 ? 0.3 : 0);
      }
    return f;
  },
  // thatch: long downward strokes, crowded
  thatch(px, r, n) {
    const f = new Float32Array(px * px);
    for (let i = 0; i < px * px; i++) f[i] = 0.45 + (n[i] - 0.5) * 0.3;
    for (let k = 0; k < 700; k++)
      stroke(f, px, r() * px, r() * px, (r() - 0.5) * 0.2, 1, 8 + r() * 10, 0, r() < 0.5 ? -0.2 : 0.22);
    for (let y = 0; y < px; y += px / 4) for (let x = 0; x < px; x++) f[Math.floor(y) * px + x] -= 0.15;
    return f;
  },
  // roof tiles: overlapping rows of rounded scales
  tiles(px, r, n) {
    const f = new Float32Array(px * px),
      rows = 8,
      cols = 8;
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const row = Math.floor((y / px) * rows),
          u = (x / px) * cols + (row % 2 ? 0.5 : 0),
          fx = (u % 1) - 0.5,
          fy = ((y / px) * rows) % 1;
        f[y * px + x] = 0.42 + fy * 0.3 - Math.abs(fx) * 0.25 + (n[y * px + x] - 0.5) * 0.15 - (fy > 0.9 ? 0.2 : 0);
      }
    return f;
  },
  // woven cloth: a fine check and a soft fold
  cloth(px, r, n) {
    const f = new Float32Array(px * px);
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++)
        f[y * px + x] = 0.5 + ((x >> 1) % 2 ^ (y >> 1) % 2 ? 0.05 : -0.05) + (n[y * px + x] - 0.5) * 0.35;
    return f;
  },
  // plaster or daub: soft patches, a few cracks
  plaster(px, r, n) {
    const f = new Float32Array(px * px);
    for (let i = 0; i < px * px; i++) f[i] = 0.52 + (n[i] - 0.5) * 0.3;
    for (let k = 0; k < 10; k++) stroke(f, px, r() * px, r() * px, r() - 0.5, r() - 0.5, 12, 0, -0.15);
    return f;
  },
};
// A surface's texture, by name (stone, brick, wood, thatch, tiles, cloth, plaster), or null when the look is plain.
function surface(name) {
  if (!lookOn('paint') || !MAKERS[name]) return null;
  if (SURF[name]) return SURF[name];
  const px = 64,
    n = noiseField(px, 8, name.length * 7 + 1),
    f = MAKERS[name](px, rnd(name.charCodeAt(0) * 101), n),
    d = new Uint8Array(px * px * 4);
  for (let i = 0; i < px * px; i++) {
    const v = toByte(Math.min(1, f[i] * 1.6)); // centred near 0.8 so a texture darkens a colour only a little
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  const t = dataTexture(d, px);
  t.dispose = () => {}; // shared by every build
  return (SURF[name] = t);
}
export { groundMaterial, groundTexture, surfaceOf, surface, paintOn };
