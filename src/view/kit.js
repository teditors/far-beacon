/* The modelling kit (commission 5): a model is built from simple parts (boxes, cones, balls...), each with its own
   colour and place, merged into one geometry with the colours in its vertices. One merged model is one draw call, and
   with instancing a whole forest of them is one draw call too. Trees, buildings, people and creatures are all built
   with it. Parts with few sides keep cut faces; round parts are smooth. */

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
   vertex. build() gives one non-indexed BufferGeometry with position, normal and colour. */
function kit() {
  const parts = [];
  const self = {
    add(geo, color, place, opts) {
      opts = opts || {};
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (geo !== g) geo.dispose();
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
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
      parts.push(g);
      return self;
    },
    build() {
      let n = 0;
      for (const g of parts) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3),
        nor = new Float32Array(n * 3),
        col = new Float32Array(n * 3);
      let o = 0;
      for (const g of parts) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        col.set(g.attributes.color.array, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('color', new THREE.BufferAttribute(col, 3));
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
};
// A material for kit models: white Lambert reading the vertex colours (and, if given, a painted texture).
const kitMat = (extra) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, extra || {}));

/* Wind: a shared clock, and a material change that sways the top of an instanced model (trees, grass, banners) while
   its foot stays put. Each instance sways in its own time, from where it stands. */
const WIND = { time: { value: 0 }, strength: { value: 1 } };
function swaying(mat, amount) {
  mat.onBeforeCompile = (sh) => {
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
  };
  mat.customProgramCacheKey = () => 'sway' + amount;
  return mat;
}
export { kit, P, kitMat, placeMatrix, WIND, swaying };
