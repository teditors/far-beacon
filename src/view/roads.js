/* Roads that look made (commission 8). A road used to be its whole 28 m tile painted grey: wide, blocky, staircased
   where it ran on a slant, and hard to tell from bare ground. Now it is drawn as its own narrow ribbon along a smoothed
   line through the road's tiles, laid on the land, with a made edge and a trodden verge that fades into the ground:

   - a STREET near a town (within about 110 m of its block): cobbles in a fan of rows, a kerb of dressed stones along
     both sides;
   - an OLD ROAD of the lost people, where they were road-builders: big worn slabs in courses, turf in the joints,
     whole stretches half-buried under the grass, its edge blocks still there in places, some tipped;
   - a TRACK where they were not (the plot's old ways): beaten earth with two dark wheel ruts and a strip of grass
     between, a verge of trodden grass, and now and then a waymark post.

   Where a road crosses a stream or river it rises onto a BRIDGE: a deck of planks or stone above the water with ramps
   at each end, and a parapet of stone or a rail of posts along both sides.

   The ribbon is one mesh per kind (its verge drawn translucent over the ground, so it blends whatever the ground's
   colour), the kerbs, blocks, posts and parapets are instanced: a handful of draw calls for all the roads in sight.
   `roadNear` tells the grass where not to grow. Switch: the look's `roads` (Settings): off, the old grey tiles. */
import { HALF, R, TS, mulberry } from './ctx.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { rnd, noiseField, stones, cellOf, dataTexture, toByte, fbm } from './paint.js';

LOOK_SWITCHES.push(['roads', 'Roads that look made']);
const roadsOn = () => lookOn('roads') && lookOn('light');

/* The kinds of road: width of the made surface (m), verge each side, colour, and what lines its edges. */
const KINDS = {
  street: { w: 4.2, verge: 1.0, col: 0x8f8a80, edge: 'kerb', ch: 0, lift: 0.1 },
  old: { w: 4.8, verge: 1.4, col: 0xa39a86, edge: 'blocks', ch: 1, lift: 0.07 },
  track: { w: 3.2, verge: 1.6, col: 0x8a7556, edge: 'posts', ch: 2, lift: 0.06 },
};

const sm = (a, b, v) => (v <= a ? 0 : v >= b ? 1 : ((v - a) / (b - a)) ** 2 * (3 - (2 * (v - a)) / (b - a)));
/* ---------- the road's texture: cobbles, slabs, ruts, and a noise for buried stretches ---------- */
let TEX = null;
function roadTexture() {
  const px = Q.texPx >= 256 ? 256 : 128;
  if (TEX && TEX.image.width === px) return TEX;
  const N = px * px,
    F = fbm(px, 71),
    fine = noiseField(px, 32, 72),
    blot = noiseField(px, 5, 73),
    cob = stones(px, 15, rnd(74), 0.4),
    cc = px / 15,
    d = new Uint8Array(N * 4);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x,
        u = x / px;
      // cobbles: rounded setts with dark joints, lit on top
      const c = cob(x, y),
        gap = (c.d2 - c.d1) / cc,
        cobble = 0.16 + (0.36 + (c.b - 0.5) * 0.3 - (c.dy / cc) * 0.32 + F[i] * 0.12) * sm(0.08, 0.17, gap);
      // slabs: three courses of big stones across, staggered, bevelled, worn at the corners
      const s = cellOf(x, y, px, 3, 3, true, true),
        tone = (rnd(s.row * 31 + s.col * 7 + 5)() - 0.5) * 0.24,
        slab = 0.12 + (0.43 + tone + (s.fy < 0.12 ? 0.08 : 0) - (s.fy > 0.9 ? 0.1 : 0) + F[i] * 0.22) * sm(0.025, 0.06, s.edge);
      // ruts: two worn bands where the wheels go, darker and smooth; grit elsewhere
      const rut = Math.min(Math.abs(u - 0.27), Math.abs(u - 0.73)),
        track =
          rut < 0.045
            ? 0.32 + F[i] * 0.12
            : 0.55 + (fine[i] - 0.5) * 0.3 + F[i] * 0.3 - (rut < 0.075 ? 0.1 : 0) + (rnd(i)() < 0.04 ? 0.25 : 0);
      d[i * 4] = toByte(cobble);
      d[i * 4 + 1] = toByte(slab);
      d[i * 4 + 2] = toByte(track);
      d[i * 4 + 3] = toByte(blot[i]);
    }
  TEX = dataTexture(d, px);
  TEX.dispose = () => {};
  return TEX;
}

/* ---------- the lines of the roads ---------- */
// The road tiles of the drawn land as smoothed lines: [{ pts: [{ x, z }], ends: [junction?, junction?] }].
function roadLines(T) {
  const land = T.land,
    EW = Math.round(Math.sqrt(land.road.length)),
    M = (EW - R.W) / 2,
    at = (ex, ey) => ex >= 0 && ey >= 0 && ex < EW && ey < EW && on[ey * EW + ex],
    on = new Uint8Array(EW * EW);
  // no road inside a town's block: the town's own streets carry on there
  const blocks = land.sites.filter((q) => q.st.kind === 'town');
  for (let e = 0; e < EW * EW; e++) {
    if (!land.road[e]) continue;
    const x = (e % EW) - M,
      y = Math.floor(e / EW) - M;
    if (blocks.some((b) => Math.abs(b.x - x) <= 2 && Math.abs(b.y - y) <= 2)) continue;
    on[e] = 1;
  }
  const nb = (e) => {
    const ex = e % EW,
      ey = Math.floor(e / EW),
      out = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (at(ex + dx, ey + dy)) out.push((ey + dy) * EW + ex + dx);
    return out;
  };
  const centre = (e) => ({ x: ((e % EW) - M + 0.5) * TS - HALF, z: (Math.floor(e / EW) - M + 0.5) * TS - HALF }),
    used = new Set(),
    key = (a, b) => (a < b ? a + ':' + b : b + ':' + a),
    lines = [];
  const walk = (start, next) => {
    const ids = [start, next];
    used.add(key(start, next));
    let prev = start,
      cur = next;
    while (nb(cur).length === 2) {
      const n = nb(cur).find((q) => q !== prev);
      if (used.has(key(cur, n))) break;
      used.add(key(cur, n));
      ids.push(n);
      prev = cur;
      cur = n;
    }
    return ids;
  };
  // from every end and junction first, then whatever is left (loops)
  for (let pass = 0; pass < 2; pass++)
    for (let e = 0; e < EW * EW; e++) {
      if (!on[e]) continue;
      const n = nb(e);
      if (pass === 0 && n.length === 2) continue;
      for (const q of n) if (!used.has(key(e, q))) lines.push(walk(e, q));
    }
  // lone tiles: a short stub
  for (let e = 0; e < EW * EW; e++)
    if (on[e] && !nb(e).length) {
      const c = centre(e);
      lines.push([
        { x: c.x - 9, z: c.z },
        { x: c.x + 9, z: c.z },
      ]);
    }
  return lines.map((ids) => {
    let pts = Array.isArray(ids[0]) || ids[0].x !== undefined ? ids : ids.map(centre);
    const deg = (e) => (typeof e === 'number' ? nb(e).length : 2);
    // Chaikin's corner cutting, three times: the staircase of tiles becomes a road that runs on a slant, and bends
    for (let k = 0; k < 3; k++) {
      const out = [pts[0]];
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i],
          b = pts[i + 1];
        out.push(
          { x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 },
          { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 },
        );
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return { pts, ends: [deg(ids[0]) > 2, deg(ids[ids.length - 1]) > 2] };
  });
}
// The same line, a point every `step` metres.
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i],
      b = pts[i + 1],
      l = Math.hypot(b.x - a.x, b.z - a.z);
    let t = step - carry;
    while (t <= l) {
      out.push({ x: a.x + ((b.x - a.x) * t) / l, z: a.z + ((b.z - a.z) * t) / l });
      t += step;
    }
    carry = l - (t - step);
  }
  const last = pts[pts.length - 1],
    p = out[out.length - 1];
  if (Math.hypot(last.x - p.x, last.z - p.z) > step * 0.3) out.push(last);
  return out;
}

/* ---------- building them ---------- */
// What kind a point of road is: a street within ~150 m of a town's block, else the land's own kind.
function kindAt(towns, base, x, z) {
  for (const t of towns) if (Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) < 70 + 112) return 'street';
  return base;
}
let _c, _g; // colours made on first use (the module loads in Node for the tests)
/* The roads of the drawn land: { group, near(x, z) (the distance to the nearest road's middle, up to 12 m) }.
   colourAt(x, z) is the ground's colour at a point (scene.js), for the verges. */
function roadsGroup(S, T, colourAt) {
  _c = _c || new THREE.Color();
  _g = _g || new THREE.Color();
  const group = new THREE.Group(),
    base = R.civOf(S).search.roads ? 'old' : 'track',
    towns = T.land.sites
      .filter((q) => q.st.kind === 'town')
      .map((q) => ({ x: (q.x + 0.5) * TS - HALF, z: (q.y + 0.5) * TS - HALF })),
    lines = roadLines(T),
    step = Q.ratio > 2 ? 1.2 : 1.6,
    buckets = new Map(), // for near(): the line points by 16 m cell
    bk = (x, z) => Math.floor(x / 16) + ',' + Math.floor(z / 16),
    built = {}, // kind -> { pos, col, gcol, ru, idx }
    inst = { kerb: [], block: [], post: [], parapet: [], rail: [], deck: [] };
  const wl = T.water ? T.water.level : null,
    wmask = T.water ? T.water.mask : () => 0;
  const buf = (k) => built[k] || (built[k] = { pos: [], col: [], gcol: [], ru: [], idx: [], n: 0 });
  for (const ln of lines) {
    const pts = resample(ln.pts, step);
    if (pts.length < 2) continue;
    for (const p of pts) {
      const b = bk(p.x, p.z);
      (buckets.get(b) || buckets.set(b, []).get(b)).push(p);
    }
    // the deck's height: over water, a little above the water's level, eased in and out over ramps
    const wet = pts.map((p) => (T.water && wmask(p.x, p.z) > 0.3 ? 1 : 0)),
      bridge = pts.map((_, i) => {
        let best = 0;
        for (let j = Math.max(0, i - 6); j <= Math.min(pts.length - 1, i + 6); j++)
          if (wet[j]) best = Math.max(best, 1 - Math.abs(i - j) / 7);
        return best;
      }),
      deckY = (p) => (wl ? wl(p.x, p.z) + 0.9 : -Infinity);
    let run = null; // the kind of the strip being laid, and where it began
    const r = mulberry((Math.round(pts[0].x * 7) ^ Math.round(pts[0].z * 13) ^ S.seed) | 0);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b.x - a.x,
        dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const nx = -dz,
        nz = dx,
        kind = kindAt(towns, base, p.x, p.z),
        K = KINDS[kind],
        B = buf(kind);
      // a new strip where the kind changes (a street begins near a town)
      if (!run || run.kind !== kind) run = { kind, first: B.n, v: 0, prev: null };
      const ground = (x, z) => T.height(x, z) + K.lift,
        hb = bridge[i] > 0 ? Math.max(ground(p.x, p.z), deckY(p)) : -Infinity,
        y = (x, z) =>
          bridge[i] > 0
            ? ground(x, z) * (1 - smooth01(bridge[i])) + Math.max(hb, ground(x, z)) * smooth01(bridge[i])
            : ground(x, z);
      if (run.prev) run.v += Math.hypot(p.x - run.prev.x, p.z - run.prev.z);
      run.prev = p;
      // the made surface: an old road's edge wanders where stones are missing
      const half = K.w / 2,
        ragL = kind === 'old' ? (r() - 0.5) * 0.7 : 0,
        ragR = kind === 'old' ? (r() - 0.5) * 0.7 : 0,
        cols = [
          [-half - K.verge, -K.verge / K.w],
          [-half + ragL, 0],
          [0, 0.5],
          [half + ragR, 1],
          [half + K.verge, 1 + K.verge / K.w],
        ];
      _c.setHex(K.col).multiplyScalar(0.92 + r() * 0.16);
      for (const [o, u] of cols) {
        const x = p.x + nx * o,
          z = p.z + nz * o;
        B.pos.push(x, y(x, z), z);
        const gc = colourAt(x, z);
        _g.copy(gc);
        B.gcol.push(_g.r, _g.g, _g.b);
        // the verge: the ground's colour, trodden darker and browner
        if (u < 0 || u > 1) B.col.push(_g.r * 0.82, _g.g * 0.76, _g.b * 0.62);
        else B.col.push(_c.r, _c.g, _c.b);
        B.ru.push(u, run.v / 4);
      }
      if (i > 0 && B.n - 5 >= run.first) {
        const q = B.n - 5;
        for (let c = 0; c < 4; c++) {
          const a0 = q + c,
            a1 = q + c + 1,
            b0 = B.n + c,
            b1 = B.n + c + 1;
          B.idx.push(a0, a1, b0, a1, b1, b0); // wound to face up (the column runs left to right across the way)
        }
      }
      B.n += 5;
      // what lines the edges
      const lx = (o) => p.x + nx * o,
        lz = (o) => p.z + nz * o,
        yaw = Math.atan2(dx, dz);
      if (bridge[i] > 0.75) {
        // a bridge: stone parapets for the made roads, a rail of posts and a plank for a track
        if (i % 2 === 0)
          for (const sd of [-1, 1]) {
            const o = sd * (half + 0.15),
              hx = lx(o),
              hz = lz(o);
            if (kind === 'track') {
              inst.post.push([hx, y(hx, hz) - 0.1, hz, yaw, 1.15, 0]);
              inst.rail.push([hx, y(hx, hz) + 0.85, hz, yaw, step * 2.05, 0]);
            } else inst.parapet.push([hx, y(hx, hz) - 0.05, hz, yaw, step * 2.05, r()]);
          }
        if (kind === 'track' && i % 1 === 0) inst.deck.push([p.x, y(p.x, p.z) - 0.02, p.z, yaw, K.w + 0.3, r()]);
        continue;
      }
      if (K.edge === 'kerb') {
        // dressed kerb stones, close set, both sides
        const n = Math.max(1, Math.round(step / 0.62));
        for (let j = 0; j < n; j++) {
          const t = j / n - 0.5,
            bx = p.x + dx * t * step,
            bz = p.z + dz * t * step;
          for (const sd of [-1, 1]) {
            const hx = bx + nx * sd * (half + 0.12),
              hz = bz + nz * sd * (half + 0.12);
            inst.kerb.push([hx, T.height(hx, hz) + 0.02, hz, yaw, 1, r()]);
          }
        }
      } else if (K.edge === 'blocks' && i % 2 === 0) {
        // the old road's edge stones: most still there, some tipped or sunk
        for (const sd of [-1, 1])
          if (r() < 0.62) {
            const o = sd * (half + 0.25 + (sd < 0 ? ragL : ragR) * 0.5),
              hx = lx(o),
              hz = lz(o);
            inst.block.push([hx, T.height(hx, hz) - 0.1 - r() * 0.25, hz, yaw + (r() - 0.5) * 0.4, 1, r()]);
          }
      } else if (K.edge === 'posts' && r() < step / 28) {
        const sd = r() < 0.5 ? -1 : 1,
          o = sd * (half + K.verge * 0.6),
          hx = lx(o),
          hz = lz(o);
        inst.post.push([hx, T.height(hx, hz) - 0.15, hz, yaw + (r() - 0.5) * 0.3, 1, r()]);
      }
    }
  }
  // the ribbons
  const tex = roadTexture();
  for (const kind in built) {
    const B = built[kind];
    if (!B.idx.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
    geo.setAttribute('gcol', new THREE.Float32BufferAttribute(B.gcol, 3));
    geo.setAttribute('ru', new THREE.Float32BufferAttribute(B.ru, 2));
    geo.setIndex(B.idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, roadMaterial(kind, tex));
    m.receiveShadow = true;
    m.renderOrder = 1;
    m.userData.road = kind;
    group.add(m);
  }
  // the made edges, instanced
  const stone = new THREE.MeshLambertMaterial({ color: 0xffffff }),
    wood = new THREE.MeshLambertMaterial({ color: 0xffffff }),
    sets = {
      kerb: [new THREE.BoxGeometry(0.24, 0.26, 0.6), stone, 0xb3ada2, 0.14],
      block: [new THREE.BoxGeometry(0.45, 0.5, 0.9), stone, 0x9d9584, 0.2],
      post: [new THREE.BoxGeometry(0.16, 1.2, 0.16), wood, 0x6b5238, 0.15],
      parapet: [new THREE.BoxGeometry(0.4, 0.75, 1), stone, 0xa59f92, 0.12],
      rail: [new THREE.BoxGeometry(0.1, 0.1, 1), wood, 0x7a5c3c, 0.1],
      deck: [new THREE.BoxGeometry(1, 0.14, 0.32), wood, 0x8b6a45, 0.18],
    },
    mm = new THREE.Matrix4(),
    qq = new THREE.Quaternion(),
    ee = new THREE.Euler(),
    vv = new THREE.Vector3(),
    ss = new THREE.Vector3();
  for (const k in inst) {
    const L = inst[k];
    if (!L.length) continue;
    const [geo, mat, hex, vary] = sets[k];
    geo.translate(0, k === 'post' ? 0.6 : k === 'parapet' ? 0.37 : 0, 0);
    const im = new THREE.InstancedMesh(geo, mat, L.length);
    L.forEach(([x, y, z, yaw, len, t], i) => {
      ee.set(k === 'block' ? (t - 0.5) * 0.35 : 0, yaw, k === 'block' ? (t - 0.5) * 0.25 : 0);
      qq.setFromEuler(ee);
      ss.set(k === 'deck' ? len : 1, 1, k === 'parapet' || k === 'rail' ? len : 1);
      vv.set(x, y, z);
      im.setMatrixAt(i, mm.compose(vv, qq, ss));
      _c.setHex(hex).multiplyScalar(1 - vary / 2 + t * vary);
      im.setColorAt(i, _c);
    });
    im.castShadow = k !== 'deck';
    im.receiveShadow = true;
    im.userData.roadEdge = k;
    group.add(im);
  }
  const near = (x, z) => {
    let best = 12;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const L = buckets.get(Math.floor(x / 16) + i + ',' + (Math.floor(z / 16) + j));
        if (L) for (const p of L) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
      }
    return best;
  };
  return { group, near, lines: lines.length };
}
const smooth01 = (t) => t * t * (3 - 2 * t);

// The ribbon's material: the kind's channel of the texture over its colour, turf in an old road's joints and over its
// buried stretches, a strip of grass between a track's ruts, and the verge fading into the ground.
const MATS = {};
function roadMaterial(kind, tex) {
  if (MATS[kind]) return MATS[kind];
  const K = KINDS[kind],
    mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.roadMap = { value: tex };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 gcol;\nattribute vec2 ru;\nvarying vec3 vG;\nvarying vec2 vRu;\nvarying float vNearR;',
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvG = gcol;\nvRu = ru;\nvNearR = clamp(1.0 - (-mvPosition.z - 40.0) / 160.0, 0.0, 1.0);',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D roadMap;\nvarying vec3 vG;\nvarying vec2 vRu;\nvarying float vNearR;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float u = vRu.x;
vec4 T = texture2D(roadMap, vec2(clamp(u, 0.0, 1.0), vRu.y));
float t = ${['T.r', 'T.g', 'T.b'][K.ch]};
float made = step(0.0, u) * step(u, 1.0);
vec3 turf = vG * 0.92;
if (made > 0.5) {
  diffuseColor.rgb *= mix(1.0, 0.45 + 1.1 * t, 0.55 + 0.45 * vNearR);
  ${
    kind === 'old'
      ? `// turf in the joints, and whole stretches half-buried
  float joint = 1.0 - smoothstep(0.16, 0.26, t);
  float buried = smoothstep(0.52, 0.6, T.a + abs(u - 0.5) * 0.55);
  diffuseColor.rgb = mix(diffuseColor.rgb, turf, max(joint * 0.8, buried * 0.9));`
      : kind === 'track'
        ? `// grass on the hump between the ruts, thinning where the wheels wander
  float hump = smoothstep(0.38, 0.44, u) * (1.0 - smoothstep(0.56, 0.62, u)) * smoothstep(0.35, 0.5, T.a);
  diffuseColor.rgb = mix(diffuseColor.rgb, turf * 0.95, hump * 0.85);`
        : `// the street's middle a touch lighter, worn by feet
  diffuseColor.rgb *= 1.0 + 0.06 * (1.0 - abs(u - 0.5) * 2.0);`
  }
} else {
  // the verge: trodden ground, fading into the land
  float d = u < 0.0 ? -u : u - 1.0, vw = ${(K.verge / K.w).toFixed(3)};
  diffuseColor.a *= 1.0 - smoothstep(0.15 * vw, vw, d);
}
// chalky, never white in the sun, as the ground (grounds.js)
float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
if (lum > 0.5) diffuseColor.rgb *= (0.5 + (lum - 0.5) * 0.35) / lum;`,
      );
  };
  mat.customProgramCacheKey = () => 'road-' + kind;
  return (MATS[kind] = mat);
}

export { roadsOn, roadsGroup, roadLines, KINDS as ROAD_KINDS };
