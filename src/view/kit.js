/* The modelling kit (commission 5): a model is built from simple parts (boxes, cones, balls...), each with its own
   colour and place, merged into one geometry with the colours in its vertices. One merged model is one draw call, and
   with instancing a whole forest of them is one draw call too. Trees, buildings, people and creatures are all built
   with it. Parts with few sides keep cut faces; round parts are smooth. */
import { toonMat } from './toon.js';

const PREP = new Map(); // parts already made non-indexed, by shape and size
const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _v = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  _c = new THREE.Color();

// a matrix from a place: { x, y, z, rx, ry, rz, sx, sy, sz, s }
function placeMatrix(p) {
  p = p || {};
  _e.set(p.rx || 0, p.ry || 0, p.rz || 0);
  _q.setFromEuler(_e);
  const s = p.s || 1;
  _s.set((p.sx || 1) * s, (p.sy || 1) * s, (p.sz || 1) * s);
  _v.set(p.x || 0, p.y || 0, p.z || 0);
  return _m.compose(_v, _q, _s);
}

/* A model being put together. add(geometry, colour, place, opts) puts in one part: opts.flat gives it cut faces,
   opts.shade(y) darkens it by height (for a crown darker underneath), opts.jitter varies the colour a little by
   vertex, opts.round lights a blob as the ball it stands for. build() gives one non-indexed BufferGeometry with position, normal and colour. */
function kit() {
  const parts = [];
  let anyBone = false;
  const self = {
    add(geo, color, place, opts) {
      opts = opts || {};
      let g;
      if (geo.parameters) {
        // the same part again (a block, a drum): reuse its prepared form rather than making it anew
        const key = geo.type + JSON.stringify(geo.parameters),
          pre = PREP.get(key) || PREP.set(key, geo.index ? geo.toNonIndexed() : geo.clone()).get(key);
        g = new THREE.BufferGeometry();
        g.setAttribute('position', pre.attributes.position.clone());
        if (pre.attributes.normal) g.setAttribute('normal', pre.attributes.normal.clone());
      } else g = geo.index ? geo.toNonIndexed() : geo.clone();
      geo.dispose();
      if (opts.round) {
        // a blob lit as the ball it stands for: each point's normal points out from the middle (C6: few faces, no facets)
        const p = g.attributes.position,
          nn = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i),
            y = p.getY(i),
            z = p.getZ(i),
            l = Math.hypot(x, y, z) || 1;
          nn.set([x / l, y / l, z / l], i * 3);
        }
        g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
      }
      g.applyMatrix4(placeMatrix(place));
      if (opts.flat || !g.attributes.normal) g.computeVertexNormals();
      if (opts.flat) {
        // one normal per face
        const p = g.attributes.position,
          n = g.attributes.normal,
          a = new THREE.Vector3(),
          b = new THREE.Vector3(),
          c = new THREE.Vector3();
        for (let i = 0; i < p.count; i += 3) {
          a.fromBufferAttribute(p, i);
          b.fromBufferAttribute(p, i + 1);
          c.fromBufferAttribute(p, i + 2);
          c.sub(b);
          a.sub(b);
          c.cross(a).normalize();
          for (let k = 0; k < 3; k++) n.setXYZ(i + k, c.x, c.y, c.z);
        }
      }
      const p = g.attributes.position,
        col = new Float32Array(p.count * 3);
      _c.set(color);
      let lo = Infinity,
        hi = -Infinity;
      if (opts.shade) for (let i = 0; i < p.count; i++) (lo = Math.min(lo, p.getY(i))), (hi = Math.max(hi, p.getY(i)));
      for (let i = 0; i < p.count; i++) {
        let k = 1;
        if (opts.shade) k *= opts.shade(hi > lo ? (p.getY(i) - lo) / (hi - lo) : 1);
        if (opts.jitter) k *= 1 + Math.sin(i * 12.9898 + p.getX(i) * 78.233) * 0.5 * opts.jitter;
        col[i * 3] = _c.r * k;
        col[i * 3 + 1] = _c.g * k;
        col[i * 3 + 2] = _c.b * k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // texture coordinates from where each point is, a repeat every opts.uv metres: walls take theirs across and up,
      // floors and roofs from above, so a texture is never stretched and lines up from part to part
      const uv = new Float32Array(p.count * 2),
        nr = g.attributes.normal,
        rep = opts.uv || 1;
      for (let i = 0; i < p.count; i++) {
        const ax = Math.abs(nr.getX(i)),
          ay = Math.abs(nr.getY(i)),
          az = Math.abs(nr.getZ(i));
        uv[i * 2] = (ay > ax && ay > az ? p.getX(i) : ax > az ? p.getZ(i) : p.getX(i)) / rep;
        uv[i * 2 + 1] = (ay > ax && ay > az ? p.getZ(i) : p.getY(i)) / rep;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      // a moving part (actors.js): which joint it hangs from, and where that joint is
      if (opts.bone !== undefined) {
        const pv = opts.pivot || [0, 0, 0];
        g.userData.bone = opts.bone;
        g.userData.pivot = pv;
        anyBone = true;
      }
      for (const k of Object.keys(g.attributes))
        if (k !== 'position' && k !== 'normal' && k !== 'color' && k !== 'uv') g.deleteAttribute(k);
      parts.push(g);
      return self;
    },
    get empty() {
      return !parts.length;
    },
    build() {
      let n = 0;
      for (const g of parts) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3),
        nor = new Float32Array(n * 3),
        col = new Float32Array(n * 3),
        uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of parts) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        col.set(g.attributes.color.array, o * 3);
        uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (anyBone) {
        const bone = new Float32Array(n),
          piv = new Float32Array(n * 3);
        let q = 0;
        for (const g of parts) {
          const c = g.attributes.position.count,
            b = g.userData.bone || 0,
            pv = g.userData.pivot || [0, 0, 0];
          for (let i = 0; i < c; i++, q++) {
            bone[q] = b;
            piv[q * 3] = pv[0];
            piv[q * 3 + 1] = pv[1];
            piv[q * 3 + 2] = pv[2];
          }
        }
        out.setAttribute('bone', new THREE.BufferAttribute(bone, 1));
        out.setAttribute('pivot', new THREE.BufferAttribute(piv, 3));
      }
      out.computeBoundingSphere();
      return out;
    },
  };
  return self;
}
// shorthand for the usual parts
const P = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 6),
  cone: (r, h, n) => new THREE.ConeGeometry(r, h, n || 6),
  ball: (r, w, h) => new THREE.SphereGeometry(r, w || 8, h || 6),
  blob: (r, d) => new THREE.IcosahedronGeometry(r, d || 0),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  prism, // a gable roof: w wide (x), h high (y, from 0), d long (z)
};
function prism(w, h, d) {
  const a = w / 2,
    b = d / 2,
    v = [
      // the two slopes
      [-a, 0, b],
      [a, 0, b],
      [0, h, b],
      [-a, 0, -b],
      [0, h, -b],
      [a, 0, -b],
    ],
    tri = [
      [0, 1, 2],
      [3, 4, 5], // gable ends
      [0, 2, 4],
      [0, 4, 3], // left slope
      [1, 5, 4],
      [1, 4, 2], // right slope
    ],
    pos = [];
  for (const t of tri) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// A material for kit models: white Lambert reading the vertex colours (and, if given, a painted texture); toon bands
// from Low up (C6, toon.js).
const kitMat = (extra) => toonMat(extra) || new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, extra || {}));

/* Wind: a shared clock, and a material change that sways the top of an instanced model (trees, grass, banners) while
   its foot stays put. Each instance sways in its own time, from where it stands. */
const WIND = { time: { value: 0 }, strength: { value: 1 } };
function swayPatch(sh, amount) {
  sh.uniforms.windTime = WIND.time;
  sh.uniforms.windStrength = WIND.strength;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float windTime;\nuniform float windStrength;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
#ifdef USE_INSTANCING
float wph = instanceMatrix[3].x * 0.071 + instanceMatrix[3].z * 0.053;
#else
float wph = 0.0;
#endif
float wk = max(transformed.y, 0.0);
wk *= wk * ${amount.toFixed(3)} * windStrength;
transformed.x += sin(windTime * 1.3 + wph) * wk;
transformed.z += sin(windTime * 0.9 + wph * 1.7) * wk * 0.6;`,
    );
}
function swaying(mat, amount) {
  mat.onBeforeCompile = (sh) => swayPatch(sh, amount);
  mat.customProgramCacheKey = () => 'sway' + amount;
  mat.userData.sway = amount; // for its outline (outline.js), which sways with it
  return mat;
}
// A two-sided Lambert material lit as its front on both sides (C8.6): three lights a back face as if it faced the other
// way, so half of every tuft of grass, seen from behind, was black against the lit ground.
function frontLit(mat) {
  const was = mat.onBeforeCompile,
    key = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    if (was) was(sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront')
      .replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront');
  };
  mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '-front';
  return mat;
}
export { kit, P, kitMat, placeMatrix, WIND, swaying, swayPatch, frontLit };
