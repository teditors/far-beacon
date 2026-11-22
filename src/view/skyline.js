/* Far hills (commission 6): beyond the land that is drawn, a few rings of ridges stand against the sky, each a step
   further into the air: the nearest a deeper tone of the shade, the furthest barely darker than the horizon, so hills
   stack in bands like a painting (Firewatch, Journey). The land drawn nearer has already faded into the air by its
   edge, so even the nearest ring is only a little darker than the horizon: they show above the land's own skyline and
   across open water, as far coasts. They are flat silhouettes, a few hundred triangles each, kept
   round the traveller like the sky, coloured each frame from the look; taller where the land is mountainous. Rings: Q.skyline (Low 2, Medium 3, High 4). Switch: `skyline`. */
import { R, V, mulberry } from './ctx.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { camera, scene } from './scene.js';
import { NOW } from './mood.js';

LOOK_SWITCHES.push(['skyline', 'Far hills in bands']);
const skylineOn = () => !!Q.skyline && lookOn('skyline') && lookOn('look') && lookOn('light');

// each ring: its distance (m), its height range (m) and how much darker than the horizon it stands
const RINGS = [
  { d: 860, lo: 18, hi: 95, k: 0.24 },
  { d: 1150, lo: 30, hi: 170, k: 0.17 },
  { d: 1450, lo: 50, hi: 260, k: 0.11 },
  { d: 1750, lo: 70, hi: 340, k: 0.07 },
];
const SEG = 160;
let group = null,
  key = '';
const tone = new THREE.Color(),
  tmp = new THREE.Color();

// A ring of ridges: a strip of SEG quads from below the horizon up to the ridge line.
function ring(r, seed, rough) {
  const rnd = mulberry(seed),
    // a ridge line from a few sine waves of random phase, and sharper peaks where the land is mountainous
    waves = [1, 2, 3, 5, 8, 13].map((f) => ({ f, a: (rnd() * 0.6 + 0.4) / Math.sqrt(f), p: rnd() * 6.283 })),
    pos = new Float32Array((SEG + 1) * 2 * 3),
    idx = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    let v = 0;
    for (const w of waves) v += Math.sin(a * w.f + w.p) * w.a;
    v = Math.max(0, Math.min(1, v * 0.35 + 0.5));
    v = Math.pow(v, 1.4 - rough * 0.6);
    const h = r.lo + (r.hi - r.lo) * (0.35 + 0.65 * rough) * v,
      x = Math.sin(a) * r.d,
      z = Math.cos(a) * r.d;
    pos.set([x, -r.d * 0.08, z, x, h, z], i * 6);
    if (i < SEG) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = -8; // after the sky, before the land
  m.userData.k = r.k;
  return m;
}
function build() {
  const S = V.S,
    b = R.biomeOf(S),
    rough = Math.max(0, Math.min(1, (b.mountains || 0) * 4 + (b.hills || 0) * 0.8)),
    rec = R.outdoorRec ? R.outdoorRec(S) : null,
    k = [S.seed, rec ? rec.id : '', S.realm || '', b.id, Q.skyline].join('|');
  if (k === key && group) return;
  key = k;
  if (group) {
    scene.remove(group);
    group.traverse((o) => o.geometry && (o.geometry.dispose(), o.material.dispose()));
  }
  group = new THREE.Group();
  const n = Math.min(RINGS.length, Q.skyline),
    base = (S.seed ^ (rec ? rec.cx * 7919 + rec.cy * 104729 : 0)) | 0;
  for (let i = 0; i < n; i++) group.add(ring(RINGS[i], base + i * 977, rough));
  scene.add(group);
}
/* Each frame, from sky.js: show or hide, keep round the camera, colour from the look. far: how far the fog lets the
   eye see now (a storm or the night hide the far hills). */
function updateSkyline(on, far) {
  on = on && skylineOn() && !!NOW.look;
  if (!on) {
    if (group) group.visible = false;
    return;
  }
  build();
  group.visible = true;
  group.position.set(camera.position.x, Math.min(camera.position.y, 200) - 8, camera.position.z);
  const lk = NOW.look,
    seen = Math.max(0, Math.min(1, (far - 150) / 400)); // in a storm or fog the hills are lost
  tone.copy(lk.c.shade).lerp(lk.c.zenith, 0.35).multiplyScalar(0.8);
  for (const m of group.children) {
    tmp.copy(lk.c.fog).lerp(tone, m.userData.k * seen);
    m.material.color.copy(tmp);
  }
}
function hideSkyline() {
  if (group) group.visible = false;
}
export { updateSkyline, hideSkyline, skylineOn };
