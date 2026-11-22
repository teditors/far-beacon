/* Ground with character (commission 8): eight kinds of ground you can tell apart at a glance, and no visible tiling.

   - EIGHT KINDS, in two textures of four channels each, all made in code: grass (tufts of blades), sand (wind ripples),
     rock (broad plates and cracks), snow (soft drifts, glitter) | earth (clods and cracks), gravel (round pebbles, lit
     on top), mud (dark wet pools and streaks), crust (a salt or ash pan's polygons). Each has its own scale and shape of
     pattern, exaggerated, the cartoon way, and a tint of its own over the biome's colour.
   - WHICH KIND each point of the land is (kindsOf) comes from its colour (the biome's palette, so generated biomes work),
     how steep it is, and what the rules say lies there: a bog is mud, a salt pan crust, a frozen lake snow, scree gravel,
     a wood's floor earth and leaf, a stream's bank mud.
   - NO TILING: a macro texture (four noises, one 190 m tile) warps where the grain is read, so its repeat slides and
     never lines up; on High a second, rotated reading at another scale is blended in by the macro noise. The same macro
     colours the land in patches a painter would lay in: lusher and drier grass, bare earth, and a meadow's flowers close
     to (a few dots of white, yellow and violet).
   - EDGES: where two kinds meet, the weights are sharpened and wobbled by noise, so a sand bank or a bare patch has a
     crisp, irregular edge, and a thin darker line runs along it, like an outline in a storybook.

   Cost: five texture reads a pixel on Low and Medium (two before), seven on High. Switch: the look's `grounds`
   (Settings): off, the ground of commission 7. */
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { rnd, noiseField, stroke, fbm, stones, dataTexture, toByte } from './paint.js';

LOOK_SWITCHES.push(['grounds', 'Ground with character (eight kinds, no tiling)']);
const groundsOn = () => lookOn('grounds');

/* ---------- the textures ---------- */
let TEX = null;
function pack(px, a, b, c, d) {
  const out = new Uint8Array(px * px * 4);
  for (let i = 0; i < px * px; i++) {
    out[i * 4] = toByte(a[i]);
    out[i * 4 + 1] = toByte(b[i]);
    out[i * 4 + 2] = toByte(c[i]);
    out[i * 4 + 3] = toByte(d[i]);
  }
  const t = dataTexture(out, px);
  t.dispose = () => {}; // made once, for every build
  return t;
}
// Voronoi cracks: for a pixel, how near it is to the edge between two cells (0 on the crack), and the cell's number.
function cracks(px, n, seed, jit) {
  const at = stones(px, n, rnd(seed), jit);
  return (x, y) => {
    const c = at(x, y);
    return { edge: (c.d2 - c.d1) / (px / n), b: c.b, dy: c.dy / (px / n) };
  };
}
function textures() {
  const px = Q.texPx >= 256 ? 256 : 128;
  if (TEX && TEX.px === px) return TEX;
  const sm = (a, b, v) => (v <= a ? 0 : v >= b ? 1 : ((v - a) / (b - a)) ** 2 * (3 - (2 * (v - a)) / (b - a))),
    S = px / 128,
    r = rnd(1913),
    N = px * px,
    big = noiseField(px, 4, 11),
    mid = noiseField(px, 12, 12),
    fine = noiseField(px, 40, 13),
    F = fbm(px, 14);
  // grass: tufts of upright blades in clumps, light tips and dark roots, over a mottle
  const grass = new Float32Array(N);
  for (let i = 0; i < N; i++) grass[i] = 0.5 + (big[i] - 0.5) * 0.3 + (mid[i] - 0.5) * 0.35;
  for (let k = 0; k < 260 * S * S; k++) {
    const cx = r() * px,
      cy = r() * px;
    for (let b = 0; b < 6; b++) {
      const x = cx + (r() - 0.5) * 5 * S,
        y = cy + (r() - 0.5) * 3 * S,
        lean = (r() - 0.5) * 0.7,
        len = (3 + Math.floor(r() * 5)) * S;
      stroke(grass, px, x, y + len, lean * 0.4, -1, Math.ceil(len * 0.4), 0, -0.2); // the root, in shade
      stroke(grass, px, x, y, lean, -1, Math.ceil(len * 0.6), 0, 0.24); // the blade, in the light
    }
  }
  // sand: long wind ripples, bent by the noise, with a light crest and a shaded lee; a few grains
  const sand = new Float32Array(N);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        ph = (y / px) * 9 + big[i] * 2.2 + mid[i] * 0.8,
        w = ph - Math.floor(ph);
      sand[i] = 0.5 + (w < 0.72 ? (w / 0.72) * 0.3 - 0.1 : 0.2 - ((w - 0.72) / 0.28) * 0.5) * 0.75 + F[i] * 0.12;
    }
  for (let k = 0; k < 500 * S * S; k++) sand[Math.floor(r() * N)] += r() < 0.5 ? -0.2 : 0.18;
  // rock: broad plates, each its own tone, split by dark cracks, with a lit upper edge
  const rock = new Float32Array(N),
    plates = cracks(px, 5, 21, 0.9);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        c = plates(x, y);
      rock[i] =
        0.12 +
        (0.38 + (c.b - 0.5) * 0.3 - c.dy * 0.12 + (c.edge < 0.09 ? 0.08 : 0) + F[i] * 0.25 + (fine[i] - 0.5) * 0.1) *
          sm(0.02, 0.05, c.edge);
    }
  // snow: soft drifts, a few blue shadows, and glitter
  const snow = new Float32Array(N);
  for (let i = 0; i < N; i++) snow[i] = 0.58 + (big[i] - 0.5) * 0.3 + (mid[i] - 0.5) * 0.14;
  for (let k = 0; k < 220 * S * S; k++) snow[Math.floor(r() * N)] += 0.3;
  // earth: clods, each lit on top and dark beneath, with cracks between, and grit
  const earth = new Float32Array(N),
    clods = cracks(px, 14, 31, 1);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        c = clods(x, y);
      earth[i] = 0.18 + (0.3 + (c.b - 0.5) * 0.22 - c.dy * 0.28 + F[i] * 0.2) * sm(0.05, 0.11, c.edge);
    }
  for (let k = 0; k < 600 * S * S; k++) earth[Math.floor(r() * N)] += r() < 0.5 ? -0.25 : 0.15;
  // gravel: round pebbles packed close, each lit on top and shaded below, dark between
  const gravel = new Float32Array(N),
    peb = stones(px, 22, rnd(41), 0.95),
    pc = px / 22;
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        c = peb(x, y),
        gap = (c.d2 - c.d1) / pc;
      gravel[i] = 0.16 + (0.34 + (c.b - 0.5) * 0.4 - (c.dy / pc) * 0.45 + F[i] * 0.1) * sm(0.07, 0.17, gap);
    }
  // mud: dark smooth pools with light rims, streaks where it was walked
  const mud = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = mid[i] * 0.7 + big[i] * 0.3;
    mud[i] = p > 0.56 ? 0.28 + (p - 0.56) * 0.2 : p > 0.5 ? 0.62 : 0.5 + (fine[i] - 0.5) * 0.18 + F[i] * 0.1;
  }
  for (let k = 0; k < 40 * S; k++) stroke(mud, px, r() * px, r() * px, r() - 0.5, r() - 0.5, 10 * S, S > 1 ? 1 : 0, -0.12);
  // crust: a salt or ash pan, big pale polygons with thin dark raised cracks
  const crust = new Float32Array(N),
    pans = cracks(px, 6, 51, 0.8);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        c = pans(x, y);
      crust[i] = 0.15 + (c.edge < 0.06 ? 0.57 : 0.41 + (c.b - 0.5) * 0.08 + (fine[i] - 0.5) * 0.1) * sm(0.012, 0.03, c.edge);
    }
  // the macro: big blotches, a middle noise, a patch noise and a fine one for wobbling edges (one tile of 190 m)
  const M = 256,
    m1 = noiseField(M, 5, 61),
    m2 = noiseField(M, 19, 62),
    m3 = noiseField(M, 11, 63),
    m4 = noiseField(M, 70, 64),
    mac = new Uint8Array(M * M * 4);
  for (let i = 0; i < M * M; i++) {
    mac[i * 4] = toByte(m1[i]);
    mac[i * 4 + 1] = toByte(m2[i]);
    mac[i * 4 + 2] = toByte(m3[i] * 0.75 + m4[i] * 0.25);
    mac[i * 4 + 3] = toByte(m4[i]);
  }
  const macro = dataTexture(mac, M);
  macro.dispose = () => {};
  TEX = { px, a: pack(px, grass, sand, rock, snow), b: pack(px, earth, gravel, mud, crust), macro };
  return TEX;
}

/* ---------- which kinds a point is ---------- */
// The kind a biome's special ground is, from its name (generated biomes name theirs from the same lists).
function specialKind(biome) {
  const n = ((biome && biome.special && biome.special.name) || '').toLowerCase();
  if (/bog|marsh|mire|fen|swamp|mud|reed/.test(n)) return 'mud';
  if (/salt|pan|crust|ash|glass|cinder/.test(n)) return 'crust';
  if (/ice|frozen|snow|glacier/.test(n)) return 'snow';
  if (/scree|stone|rock|boulder|gravel|shingle/.test(n)) return 'gravel';
  if (/meadow|flower|moss|heath/.test(n)) return 'grass';
  return 'earth';
}
const KINDS = ['grass', 'sand', 'rock', 'snow', 'earth', 'gravel', 'mud', 'crust'];
/* Eight weights summing to 1 (out: a Float32Array of 8), for a point of colour c and steepness steep (0 flat, 1 a cliff),
   with ctx: { forest, water, special (the masks 0..1), spec (the special's kind), cold (a cold climate), road }. */
function kindsOf(c, steep, ctx, out) {
  out.fill(0);
  const L = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b,
    max = Math.max(c.r, c.g, c.b),
    min = Math.min(c.r, c.g, c.b),
    sat = max > 0 ? (max - min) / max : 0,
    warm = c.r - c.b;
  // from the colour
  if (c.g >= c.r * 0.97 && c.g >= c.b * 0.9 && sat > 0.12)
    out[0] += 1; // green: grass
  else if (L > 0.72 && sat < 0.2)
    out[ctx.cold ? 3 : 7] += 1; // pale and grey: snow, or salt where it is not cold
  else if (c.b > c.r * 1.25 && c.b > c.g)
    out[3] += 0.8; // blue-white: snow
  else if (warm > 0.12 && L > 0.55)
    out[1] += 1; // warm and light: sand
  else if (warm > 0.06 && sat > 0.18)
    out[4] += 1; // brown: earth
  else if (sat < 0.15 && L < 0.45)
    out[2] += 0.7; // dark grey: rock
  else (out[5] += 0.6), (out[4] += 0.4); // the rest: stony earth
  // steep ground is bare rock
  const cliff = Math.min(1, Math.max(0, (steep - 0.25) * 3));
  out[2] += cliff * 1.5;
  // what the rules say lies here
  if (ctx.forest > 0) (out[4] += ctx.forest * 0.7), (out[0] += ctx.forest * 0.3);
  if (ctx.special > 0) out[KINDS.indexOf(ctx.spec)] += ctx.special * 2;
  if (ctx.water > 0) out[6] += ctx.water * 1.5; // a stream's bed and banks
  if (ctx.road) out[5] += 2; // the old ground under a road, where the road is not drawn as its own
  let t = 0;
  for (let i = 0; i < 8; i++) t += out[i];
  for (let i = 0; i < 8; i++) out[i] /= t || 1;
  return out;
}

/* ---------- the material ---------- */
function groundsMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }),
    T = textures(),
    hi = !!Q.shadows && Q.ratio > 2; // High: the second, rotated reading
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.gA = { value: T.a };
    sh.uniforms.gB = { value: T.b };
    sh.uniforms.gM = { value: T.macro };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 surf;\nattribute vec4 surf2;\nvarying vec4 vSurf;\nvarying vec4 vSurf2;\nvarying vec2 vGround;\nvarying float vNear;',
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvSurf = surf;\nvSurf2 = surf2;\nvGround = position.xz / 5.0;\nvNear = clamp(1.0 - (-mvPosition.z - 50.0) / 170.0, 0.0, 1.0);',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D gA; uniform sampler2D gB; uniform sampler2D gM;
varying vec4 vSurf; varying vec4 vSurf2; varying vec2 vGround; varying float vNear;
float maxOf(vec4 v) { return max(max(v.x, v.y), max(v.z, v.w)); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec4 M = texture2D(gM, vGround * (5.0 / 190.0));
// crisp, wobbling edges between kinds: each weight nudged by noise, then cubed, so the stronger kind wins
vec4 w1 = vSurf * (0.55 + 0.9 * vec4(M.a, M.g, 1.0 - M.a, M.b));
vec4 w2 = vSurf2 * (0.55 + 0.9 * vec4(1.0 - M.g, M.a, M.b, 1.0 - M.b));
w1 = w1 * w1 * w1; w2 = w2 * w2 * w2;
float wt = dot(w1, vec4(1.0)) + dot(w2, vec4(1.0)) + 1e-4;
w1 /= wt; w2 /= wt;
// bare earth in patches through the grass, sharp-edged
float bare = smoothstep(0.58, 0.61, M.b) * w1.x;
w2.x += bare; w1.x -= bare;
// the grain, read where the macro has slid it, so it never repeats in line
vec2 uv = vGround + (M.rg - 0.5) * 1.7;
float grain = dot(texture2D(gA, uv), w1) + dot(texture2D(gB, uv), w2);
${
  hi
    ? `vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * vGround * 0.63 + 0.37;
float grain2 = dot(texture2D(gA, uv2), w1) + dot(texture2D(gB, uv2), w2);
grain = mix(grain, grain2, smoothstep(0.3, 0.7, M.g));`
    : ''
}
float fineG = dot(texture2D(gA, uv * 4.37 + 0.31), w1) + dot(texture2D(gB, uv * 4.37 + 0.31), w2);
// each kind's own tint over the biome's colour
vec3 tint = w1.x * vec3(0.97, 1.01, 0.92) + w1.y * vec3(1.03, 0.99, 0.86) + w1.z * vec3(0.9, 0.94, 1.02) + w1.w * vec3(1.03, 1.04, 1.08)
  + w2.x * vec3(1.02, 0.88, 0.74) + w2.y * vec3(0.93, 0.95, 1.0) + w2.z * vec3(0.72, 0.68, 0.62) + w2.w * vec3(1.08, 1.06, 1.02);
// lusher and drier grass in big patches
float lushG = smoothstep(0.38, 0.62, M.r * 0.6 + M.g * 0.4);
tint *= mix(vec3(1.0), mix(vec3(1.08, 1.02, 0.8), vec3(0.8, 0.92, 0.8), lushG), w1.x);
diffuseColor.rgb *= tint;
// pale ground (salt, snow, chalk) stays chalky, never blown to white in the sun: its lightness is eased above 0.5
float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
if (lum > 0.5) diffuseColor.rgb *= (0.5 + (lum - 0.5) * 0.35) / lum;
diffuseColor.rgb *= mix(1.0, 0.5 + 1.0 * grain, 0.4 + 0.6 * vNear) * mix(1.0, 0.72 + 0.56 * fineG, vNear * vNear);
// a thin darker line where two kinds meet
float edge = 1.0 - max(maxOf(w1), maxOf(w2));
diffuseColor.rgb *= 1.0 - 0.22 * smoothstep(0.32, 0.46, edge) * (0.5 + 0.5 * vNear);
// a meadow's flowers, close to: a few dots in the grass where the patch noise is low
vec2 fp = vGround * 30.0, fc = floor(fp);
float h = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
vec2 fo = fract(fp) - 0.5 - (vec2(fract(h * 17.0), fract(h * 31.0)) - 0.5) * 0.5;
float fl = step(0.97, h) * (1.0 - smoothstep(0.12, 0.2, length(fo))) * smoothstep(0.34, 0.22, M.b) * step(0.5, w1.x) * vNear * vNear;
vec3 petal = h > 0.99 ? vec3(0.62, 0.48, 0.86) : h > 0.98 ? vec3(1.0, 0.84, 0.3) : vec3(1.0, 0.98, 0.92);
diffuseColor.rgb = mix(diffuseColor.rgb, petal * 0.9, fl * 0.85);`,
      );
  };
  mat.customProgramCacheKey = () => 'ground-grounds' + (hi ? '-hi' : '');
  return mat;
}

export { groundsOn, groundsMaterial, kindsOf, specialKind, KINDS, textures as groundsTextures };
