/* Fire, water and shadow (commission 5): the small living things of the look.
   - fire(): a ring of stones, crossed logs and flames that flicker, with a warm halo that shows at night. Camps,
     wayfarers' fires.
   - water(): a pool whose ripples drift, for springs and pools (foul water is murky green).
   - blob(): a soft shadow under someone's feet, so people and creatures stand on the ground rather than float over it.
   updateFx() moves the flames and the ripples each frame; things removed from the scene are forgotten. */
import { P as PT, kit, kitMat } from './kit.js';
import { surface } from './paint.js';
import { waterMat, waterOn } from './water.js';

const live = [];
const NIGHT = { value: 0 };
const canvasTex = (draw, n) => {
  const c = document.createElement('canvas');
  c.width = c.height = n || 64;
  draw(c.getContext('2d'), c.width);
  const t = new THREE.CanvasTexture(c);
  t.dispose = () => {};
  return t;
};
let HALO_T = null,
  RIPPLE_T = null,
  BLOB_M = null,
  FLAME_M = null;
const haloTex = () =>
  HALO_T ||
  (HALO_T = canvasTex((g, n) => {
    const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    r.addColorStop(0, 'rgba(255,200,120,1)');
    r.addColorStop(0.3, 'rgba(255,150,60,0.45)');
    r.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, n, n);
  }));
const rippleTex = () => {
  if (RIPPLE_T) return RIPPLE_T;
  RIPPLE_T = canvasTex((g, n) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, n, n);
    // soft light and dark arcs, wrapping
    for (let i = 0; i < 40; i++) {
      const x = (i * 37) % n,
        y = (i * 53) % n,
        rr = 6 + (i % 5) * 4;
      g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.18)';
      g.lineWidth = 1.5;
      for (const [ox, oy] of [
        [0, 0],
        [n, 0],
        [0, n],
        [-n, 0],
        [0, -n],
      ]) {
        g.beginPath();
        g.arc(x + ox, y + oy, rr, 0.2, 1.6);
        g.stroke();
      }
    }
  }, 128);
  RIPPLE_T.wrapS = RIPPLE_T.wrapT = THREE.RepeatWrapping;
  RIPPLE_T.repeat.set(2, 2);
  return RIPPLE_T;
};

// A campfire: stones, logs, three flames and a halo, about a metre across.
function fire(scale) {
  const g = new THREE.Group(),
    k = kit();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(PT.blob(0.22, 0), 0x6a645c, { x: Math.cos(a) * 0.75, y: 0.1, z: Math.sin(a) * 0.75, ry: a }, { flat: true });
  }
  for (const a of [0.3, 1.9, 3.4]) k.add(PT.cyl(0.09, 0.11, 1.2, 5), 0x4a3424, { y: 0.18, rz: Math.PI / 2 - 0.25, ry: a });
  k.add(PT.cyl(0.5, 0.55, 0.06, 8), 0x2a1a14, { y: 0.03 });
  g.add(new THREE.Mesh(k.build(), kitMat({ map: surface('stone') })));
  if (!FLAME_M) {
    FLAME_M = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, depthWrite: false });
    FLAME_M.dispose = () => {};
  }
  const flames = [];
  for (const [x, z, h, c] of [
    [0, 0, 1.1, 0xffa040],
    [0.18, 0.1, 0.8, 0xffd070],
    [-0.15, -0.1, 0.7, 0xff7a20],
  ]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 6), FLAME_M.clone());
    m.material.color.setHex(c);
    m.position.set(x, h / 2 + 0.1, z);
    m.scale.y = h;
    m.userData.h = h;
    g.add(m);
    flames.push(m);
  }
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTex(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.6,
    }),
  );
  halo.position.y = 0.9;
  halo.scale.setScalar(6);
  g.add(halo);
  g.scale.setScalar(scale || 1);
  live.push({ kind: 'fire', g, flames, halo, seed: Math.random() * 10 });
  return g;
}
// A pool of water, r metres across, murky if foul.
function water(r, foul) {
  if (waterOn()) {
    // the same water as rivers and the sea (water.js): rippling, mirroring the sky, clear at the rim
    const geo = new THREE.CircleGeometry(r, 20, 0, Math.PI * 2).rotateX(-Math.PI / 2),
      n = geo.attributes.position.count,
      wa = new Float32Array(n * 3),
      col = new Float32Array(n * 3),
      c = new THREE.Color(foul ? 0x5f5a2a : 0x3a86b8);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(geo.attributes.position.getX(i), geo.attributes.position.getZ(i)) / r;
      wa.set([d > 0.99 ? 0.5 : 1, foul ? 0.6 : 0.3, 0], i * 3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('wa', new THREE.BufferAttribute(wa, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const g = new THREE.Group(),
      rim = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.96, r * 1.12, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: foul ? 0x4a4628 : 0x6a7a5a, transparent: true, opacity: 0.7, depthWrite: false }),
      ),
      m = new THREE.Mesh(geo, waterMat());
    rim.position.y = -0.02;
    m.renderOrder = 2;
    g.add(m, rim);
    return g;
  }
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: foul ? 0x6f6a35 : 0x4a9ac8, map: rippleTex() }),
  );
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.96, r * 1.12, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: foul ? 0x4a4628 : 0x6a7a5a, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  rim.position.y = -0.02;
  const g = new THREE.Group();
  g.add(m, rim);
  return g;
}
// A soft round shadow on the ground, r metres across.
function blob(r) {
  if (!BLOB_M) {
    BLOB_M = new THREE.MeshBasicMaterial({
      map: canvasTex((g, n) => {
        const rr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
        rr.addColorStop(0, 'rgba(0,0,0,0.55)');
        rr.addColorStop(0.6, 'rgba(0,0,0,0.3)');
        rr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rr;
        g.fillRect(0, 0, n, n);
      }),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    BLOB_M.dispose = () => {};
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), BLOB_M);
  m.position.y = 0.06;
  m.renderOrder = 1;
  return m;
}
const inScene = (o) => {
  while (o.parent) o = o.parent;
  return o.isScene;
};
let t = 0;
// night: 0 by day to 1; still: the device asks for reduced motion
function updateFx(dt, night, still) {
  t += dt;
  NIGHT.value = night;
  if (RIPPLE_T && !still) RIPPLE_T.offset.set(t * 0.02, t * 0.013);
  for (let i = live.length - 1; i >= 0; i--) {
    const f = live[i];
    if (!inScene(f.g)) {
      live.splice(i, 1);
      continue;
    }
    const w = still ? 0 : 1;
    f.flames.forEach((m, j) => {
      const s = 1 + w * (0.18 * Math.sin(t * 11 + j * 2 + f.seed) + 0.1 * Math.sin(t * 23 + j));
      m.scale.set(1 + w * 0.08 * Math.sin(t * 7 + j), m.userData.h * s, 1 + w * 0.08 * Math.cos(t * 9 + j));
    });
    f.halo.material.opacity = (0.2 + 0.7 * night) * (1 + w * 0.12 * Math.sin(t * 13 + f.seed));
    f.halo.scale.setScalar(5 + 4 * night);
  }
}
export { fire, water, blob, updateFx };
