/* Landmarks in the style (commission 5): the beacon, the god's shrine, caves, the locked place, wells and the doors to
   other worlds, built with the kit like everything else, so they belong to the same painted world as the towns and
   ruins. Each returns a group standing on its own foot, or null to keep the old model. */
import { R } from './ctx.js';
import { P, kit, kitMat } from './kit.js';
import { addOutline } from './outline.js';
import { surface } from './paint.js';
import { fire } from './fx.js';
import { LOOK_SWITCHES, lookOn } from './quality.js';
import { feline } from './themeflag.js';
import { catBeacon } from './catworld.js';

LOOK_SWITCHES.push(['landmarks', 'Landmarks in the style']);
const marksOn = () => lookOn('landmarks') && lookOn('light');
const mesh = (k, tex) => {
  const m = new THREE.Mesh(k.build(), kitMat({ map: tex ? surface(tex) : null }));
  addOutline(m, 2, 80); // outlined (C6), gone by 80 m so far lines never crawl (C7.1)
  return m;
};
// unlit: lights are seen through the haze (no fog); dark things (a cave's mouth) fade into the air like the land (C7.1)
const glowMat = (c, o, fog) =>
  new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1, fog: !!fog });

// a tower of courses tapering upward, from r0 at the foot to r1 at the top, h high, n sides
function courses(k, col, r0, r1, h, n, x, z) {
  const rows = Math.round(h / 1.2);
  for (let i = 0; i < rows; i++) {
    const f = i / rows,
      r = r0 + (r1 - r0) * f;
    k.add(
      P.cyl(r * 0.97, r, 1.2, n),
      col * 1 + 0,
      { x: x || 0, y: i * 1.2 + 0.6, z: z || 0, ry: i * 0.3 },
      { flat: true, uv: 2, jitter: 0.08 },
    );
  }
}
const L = {
  // the beacon: a great stone tower with a brazier at its top, its fire seen from far away, and the beam over it
  beacon() {
    if (feline()) return catBeacon(); // C9: a scratching-post tower with the red dot
    const g = new THREE.Group(),
      k = kit();
    courses(k, 0x5a5650, 3.6, 2.4, 28, 8);
    k.add(P.cyl(3.4, 2.6, 1.4, 8), 0x3e3a36, { y: 28.7 }, { flat: true, uv: 2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.add(P.box(0.8, 1.4, 0.8), 0x5a5650, { x: Math.cos(a) * 3, y: 30.1, z: Math.sin(a) * 3, ry: -a }, { uv: 2 });
    }
    k.add(P.box(1.6, 3, 0.3), 0x15120f, { y: 1.5, z: 3.5 }); // its door
    g.add(mesh(k, 'stone'));
    const f = fire(3.2);
    f.position.y = 29.4;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), glowMat(0xffb84a, 0.85));
    orb.position.y = 32;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 420, 8, 1, true), glowMat(0xffb040, 0.4));
    beam.material.side = THREE.DoubleSide;
    beam.position.y = 240;
    g.add(f, orb, beam);
    return g;
  },
  // the god's shrine: a ring of standing stones with lintels, an altar, and the god's light over it
  shrine(S) {
    const g = new THREE.Group(),
      k = kit(),
      col = R.godOf(S).color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2,
        x = Math.cos(a) * 4,
        z = Math.sin(a) * 4;
      k.add(P.box(0.9, 5.2, 0.7), 0x8d8a84, { x, y: 2.6, z, ry: -a, rz: (i % 2) * 0.04 }, { uv: 1.5, jitter: 0.08 });
      const b = ((i + 1) / 5) * Math.PI * 2;
      k.add(
        P.box(Math.hypot(Math.cos(b) * 4 - x, Math.sin(b) * 4 - z) + 0.8, 0.6, 0.8),
        0x7e7b74,
        {
          x: (x + Math.cos(b) * 4) / 2,
          y: 5.5,
          z: (z + Math.sin(b) * 4) / 2,
          ry: -Math.atan2(Math.sin(b) * 4 - z, Math.cos(b) * 4 - x),
        },
        { uv: 1.5 },
      );
    }
    k.add(P.box(1.8, 1, 1.2), 0x6e6a64, { y: 0.5 }, { uv: 1.5 });
    k.add(P.box(1.4, 0.06, 0.9), col, { y: 1.04 });
    g.add(mesh(k, 'stone'));
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), glowMat(col, 1));
    o.position.y = 3;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), glowMat(col, 0.25));
    halo.position.y = 3;
    g.add(o, halo);
    return g;
  },
  // a cave: a heap of faceted rock round a dark arched mouth
  cave() {
    const g = new THREE.Group(),
      k = kit();
    for (const [x, y, z, r, sy] of [
      [0, 2.2, -1, 6.5, 0.7],
      [-5, 1.5, 1, 4.5, 0.8],
      [5, 1.6, 0.5, 4.2, 0.9],
      [-3, 4.5, -2, 3.5, 0.9],
      [3, 4.2, -1.5, 3.2, 0.9],
      [0, 6, -3, 3, 0.8],
    ])
      k.add(P.blob(r, 1), 0x6a665e, { x, y, z, sy, ry: x }, { flat: true, uv: 3, jitter: 0.1 });
    k.add(P.box(4.4, 0.5, 1.2), 0x5a564e, { y: 4.4, z: 4.6 }, { uv: 2 });
    g.add(mesh(k, 'plaster'));
    const mouth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 1.5, 12, 1, false, -Math.PI / 2, Math.PI),
      glowMat(0x07080a, 1, true),
    );
    mouth.rotation.x = Math.PI / 2;
    mouth.rotation.z = Math.PI / 2;
    mouth.position.set(0, 1.6, 4.9);
    const low = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 1.5), glowMat(0x07080a, 1, true));
    low.position.set(0, 0.9, 4.9);
    g.add(mouth, low);
    return g;
  },
  // a well: a ring of stone, two posts, a little roof, a bucket
  well() {
    const g = new THREE.Group(),
      k = kit(),
      w = kit();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      k.add(
        P.box(1.1, 1, 0.5),
        0x7a766e,
        { x: Math.cos(a) * 1.6, y: 0.5, z: Math.sin(a) * 1.6, ry: -a + Math.PI / 2 },
        { uv: 1.2, jitter: 0.08 },
      );
    }
    for (const sx of [-1.7, 1.7]) w.add(P.box(0.2, 3, 0.2), 0x5a4030, { x: sx, y: 1.5 }, { uv: 1 });
    w.add(P.cyl(0.12, 0.12, 3.6, 6), 0x6a4a30, { y: 2.6, rz: Math.PI / 2 });
    for (const sg of [-1, 1]) w.add(P.box(4.2, 0.12, 1.4), 0x7a5232, { y: 3.4, z: sg * 0.6, rx: sg * 0.5 }, { uv: 1 });
    w.add(P.cyl(0.3, 0.25, 0.4, 8), 0x6a4a30, { y: 1.7 }, { uv: 1 });
    g.add(mesh(k, 'stone'), mesh(w, 'wood'));
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 14).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x2f6f9a }),
    );
    water.position.y = 0.6;
    g.add(water);
    return g;
  },
  // a door of old stone, carved pillars and a lintel, with another sky showing through
  door(S, st) {
    const g = new THREE.Group(),
      k = kit();
    for (const sx of [-2.7, 2.7]) {
      courses(k, 0x7a7468, 0.8, 0.7, 7, 6, sx, 0);
      k.add(P.box(1.8, 0.6, 1.8), 0x6a645a, { x: sx, y: 0.3 }, { uv: 1.5 });
    }
    k.add(P.box(7.4, 1.2, 1.6), 0x7a7468, { y: 7.6 }, { uv: 1.5 });
    k.add(P.cone(1.2, 1.5, 4), 0x6a645a, { y: 8.9, ry: Math.PI / 4 }, { flat: true, uv: 1.5 });
    g.add(mesh(k, 'stone'));
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 7), glowMat(st.back ? 0xbfd8f0 : 0xb48ce0, 0.85));
    sky.material.side = THREE.DoubleSide;
    sky.position.y = 3.5;
    g.add(sky);
    return g;
  },
  // the locked place, by its kind: a castle of towers, a barrow under turf with a stone door, a stepped temple
  vault(S) {
    const g = new THREE.Group(),
      k = kit(),
      turf = kit(),
      id = S.quest.vault.id,
      col = id === 'temple' ? 0x5c7a78 : id === 'barrow' ? 0x5d6a4a : 0x6a665e;
    if (id === 'castle') {
      for (const [x, z, w, d] of [
        [0, -8, 16, 1.6],
        [-8, 0, 1.6, 16],
        [8, 0, 1.6, 16],
        [-5.2, 8, 5.6, 1.6],
        [5.2, 8, 5.6, 1.6],
      ]) {
        k.add(P.box(w, 7, d), col, { x, y: 3.5, z }, { uv: 2, jitter: 0.05 });
        for (let i = 0, n = Math.round(Math.max(w, d) / 1.6); i < n; i += 2) {
          const o = -Math.max(w, d) / 2 + (i + 0.5) * 1.6;
          k.add(P.box(0.9, 0.9, 0.9), col, { x: x + (w > d ? o : 0), y: 7.45, z: z + (w > d ? 0 : o) }, { uv: 2 });
        }
      }
      for (const [x, z] of [
        [-8, -8],
        [8, -8],
        [-8, 8],
        [8, 8],
      ]) {
        courses(k, col, 2.9, 2.6, 13, 8, x, z);
        k.add(P.cone(3.3, 4.5, 8), 0x4a3a40, { x, y: 15.2, z }, { flat: true, uv: 2 });
      }
      k.add(P.box(3, 4, 0.4), 0x08090b, { y: 2, z: 8.6 });
      k.add(P.box(5, 9, 5), col, { y: 4.5 }, { uv: 2 });
      k.add(P.cone(3.6, 5, 4), 0x4a3a40, { y: 11.5, ry: Math.PI / 4 }, { flat: true, uv: 2 });
    } else if (id === 'barrow') {
      turf.add(
        new THREE.SphereGeometry(11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        0x5d7a46,
        { sy: 0.55 },
        { uv: 3, jitter: 0.1 },
      );
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.add(
          P.box(0.9, 2.4 + (i % 3) * 0.6, 0.6),
          0x8d8a84,
          { x: Math.cos(a) * 13, y: 1.2, z: Math.sin(a) * 13, ry: -a },
          { uv: 1.5 },
        );
      }
      for (const sx of [-2, 2]) k.add(P.box(1.2, 4, 1.2), 0x8d8a84, { x: sx, y: 2, z: 10.4 }, { uv: 1.5 });
      k.add(P.box(5.6, 1, 1.4), 0x8d8a84, { y: 4.4, z: 10.4 }, { uv: 1.5 });
      k.add(P.box(2.6, 3.4, 0.4), 0x08090b, { y: 1.7, z: 10.1 });
    } else {
      for (let i = 0; i < 4; i++) k.add(P.box(18 - i * 4, 1.8, 18 - i * 4), col, { y: 0.9 + i * 1.8 }, { uv: 2, jitter: 0.06 });
      for (let i = 0; i < 6; i++) k.add(P.box(3, 0.6, 1), col, { y: 0.3 + i * 1.2, z: 9.2 - i * 0.9 }, { uv: 1.5 });
      for (const [x, z] of [
        [-3.5, -3.5],
        [3.5, -3.5],
        [-3.5, 3.5],
        [3.5, 3.5],
      ])
        k.add(P.cyl(0.6, 0.7, 6, 8), 0xc8c0a8, { x, y: 10.2, z }, { uv: 1.5 });
      k.add(P.box(9, 1, 9), col, { y: 13.7 }, { uv: 2 });
      k.add(P.prism(9.4, 2.6, 9.4), col, { y: 14.2 }, { uv: 2 });
      k.add(P.box(2.6, 3, 0.4), 0x08090b, { y: 8.7, z: 3.9 });
    }
    g.add(mesh(k, 'stone'));
    if (!turf.empty) g.add(mesh(turf, 'plaster'));
    return g;
  },
};
function landmark(kind, S, st) {
  if (!marksOn() || !L[kind]) return null;
  return L[kind](S, st);
}
export { landmark, marksOn };
