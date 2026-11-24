/* The world dressed for Super Feline Mode (commission 9): what the land's own models become when the world is feline
   (view/themeflag.js). Each is a small function the usual model's maker calls in its place or adds to it:
   - the beacon is a great scratching-post tower, wrapped in sisal, with carpeted platforms, a dangling toy, and a red
     laser dot at its top for the beam (catBeacon);
   - your camp is a round cat bed with a cushion, and a warm laptop glowing by the fire (catBed);
   - ruins are cardboard: their stones turn the colour of old boxes, and big boxes with tape and open flaps lie
     among them (cardboard);
   - town roofs grow a pair of cat ears at each end of the ridge (roofEars);
   - trees are cat trees: sisal posts with round carpeted platforms in the woodland's own colour (SHAPES.cattree in
     plants.js uses catTree);
   - the sun has whiskers and ears (sunWhiskers).
   Built with the same kit as everything else, in the look's palette where it can be, so the light colours them. */
import { P, kit, kitMat } from './kit.js';
import { addOutline } from './outline.js';
import { surface } from './paint.js';

const SISAL = 0xc8ae7a,
  CARPET = 0x8a6aa8,
  CARD = 0xb88a58;
const mesh = (k, tex) => {
  const m = new THREE.Mesh(k.build(), kitMat(tex ? { map: surface(tex) } : undefined));
  addOutline(m, 2);
  return m;
};
const glowMat = (c, o) =>
  new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, fog: false, depthWrite: o >= 1 });

// The beacon as a scratching-post tower, 30 m: a sisal post in courses, platforms, a bed at the top, the red dot.
function catBeacon() {
  const g = new THREE.Group(),
    k = kit();
  for (let i = 0; i < 24; i++)
    k.add(P.cyl(2.2, 2.2, 1.2, 10), i % 2 ? SISAL : 0xb89c68, { y: i * 1.2 + 0.6, ry: i * 0.4 }, { jitter: 0.05 });
  for (const [y, r, x, z] of [
    [8, 5, 1.5, 0],
    [16, 4.2, -1.2, 1],
    [23, 4.6, 0.8, -1.2],
  ]) {
    k.add(P.cyl(r, r, 0.6, 16), CARPET, { x, y, z }, { jitter: 0.05 });
    k.add(P.cyl(0.3, 0.3, 4, 6), SISAL, { x: x + r * 0.7, y: y - 2.2, z }); // a post under its edge
  }
  // the bed at the top, a rim round a cushion
  k.add(P.cyl(4.2, 3.6, 1.8, 16), CARPET, { y: 29.3 });
  k.add(P.cyl(3.4, 3.4, 0.4, 16), 0xe8c0d8, { y: 30.1 });
  // a toy on a string, from the lowest platform
  k.add(P.cyl(0.05, 0.05, 3, 4), 0xeeeeee, { x: 6, y: 6.5 });
  k.add(P.ball(0.6, 10, 8), 0xe8344a, { x: 6, y: 4.8 });
  k.add(P.box(1.6, 3, 0.3), 0x15120f, { y: 1.5, z: 2.25 }); // its door (a cat flap, large)
  g.add(mesh(k));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), glowMat(0xff2030, 0.95));
  dot.position.y = 33;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 420, 8, 1, true), glowMat(0xff3040, 0.45));
  beam.material.side = THREE.DoubleSide;
  beam.position.y = 240;
  g.add(dot, beam);
  return g;
}
// Your camp: a round cat bed (rim and cushion, a paw print on it) where the tent stood, and a warm laptop by the fire.
function catBed() {
  const g = new THREE.Group(),
    k = kit();
  k.add(P.cyl(2.8, 2.5, 1.1, 18), 0xd85a8a, { y: 0.55 }); // the rim
  k.add(P.cyl(2.2, 2.2, 0.5, 18), 0xf4d8e4, { y: 0.9 }); // the cushion
  k.add(P.cyl(0.55, 0.55, 0.04, 10), 0xd85a8a, { x: 0.2, y: 1.17, z: 0.3 }); // a paw print on it
  for (const [x, z] of [
    [-0.45, -0.45],
    [-0.05, -0.75],
    [0.45, -0.75],
    [0.85, -0.45],
  ])
    k.add(P.cyl(0.18, 0.18, 0.04, 8), 0xd85a8a, { x, y: 1.17, z: z + 0.2 });
  // the warm laptop: a base, and its lid open
  k.add(P.box(1.4, 0.08, 1.0), 0x3a3a44, { x: -3.2, y: 0.05, z: 0.8 });
  k.add(P.box(1.4, 0.9, 0.06), 0x3a3a44, { x: -3.2, y: 0.5, z: 0.3, rx: -0.25 });
  g.add(mesh(k, 'cloth'));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), glowMat(0x9ad0ff, 1));
  screen.position.set(-3.2, 0.5, 0.34);
  screen.rotation.x = -0.25;
  g.add(screen);
  return g;
}
// Over a ruin: its stones turned the colour of old cardboard, and big boxes among them (seeded, the same each time).
function cardboard(group, seed) {
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.color && !o.material.transparent && !o.userData.outline) {
      o.material = o.material.clone();
      o.material.color.multiply(new THREE.Color(0xd8b088));
    }
  });
  let a = (seed | 0) + 12345;
  const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const k = kit();
  for (let i = 0; i < 5; i++) {
    const s = 1.6 + r() * 2.4,
      x = (r() - 0.5) * 14,
      z = (r() - 0.5) * 14,
      ry = r() * 3;
    k.add(P.box(s * 1.3, s, s), CARD, { x, y: s / 2, z, ry }, { jitter: 0.06 });
    k.add(P.box(s * 1.32, s * 0.12, s * 0.25), 0xd8c8a0, { x, y: s + 0.01, z, ry }); // tape
    // two flaps, open
    for (const sg of [-1, 1])
      k.add(P.box(s * 1.3, 0.05, s * 0.5), CARD, {
        x: x + Math.sin(ry) * sg * s * 0.62,
        y: s + s * 0.18,
        z: z + Math.cos(ry) * sg * s * 0.62,
        ry,
        rx: sg * 0.9,
      });
  }
  group.add(mesh(k));
  return group;
}
// Cat ears on a roof ridge: two little cones at each end. K: the town's kit set; along, len, h: the ridge.
function roofEars(K, cx, cz, y, len, along, col) {
  for (const e of [-1, 1]) {
    const ex = along ? 0 : (e * len) / 2 - e * 0.6,
      ez = along ? (e * len) / 2 - e * 0.6 : 0;
    for (const s of [-1, 1]) {
      const ox = along ? s * 0.55 : 0,
        oz = along ? 0 : s * 0.55;
      K.roof.add(
        P.cone(0.8, 1.9, 4),
        col,
        { x: cx + ex + ox * 1.6, y: y + 0.85, z: cz + ez + oz * 1.6, ry: Math.PI / 4 },
        { flat: true, uv: 2 },
      );
    }
  }
}
// A cat tree in a woodland's colour (for plants.js, the same size as its other trees: about 1 across, 4.5 high).
function catTree(k, leaf, far) {
  if (far) {
    k.add(P.cyl(0.14, 0.16, 4.2, 4), SISAL, { y: 2.1 });
    for (const y of [1.6, 3.0, 4.2]) k.add(P.cyl(0.9, 0.9, 0.22, 6), leaf, { y });
    return;
  }
  for (let i = 0; i < 7; i++) k.add(P.cyl(0.16, 0.16, 0.6, 6), i % 2 ? SISAL : 0xb89c68, { y: i * 0.6 + 0.3, ry: i });
  for (const [y, r, x, z] of [
    [1.5, 0.95, 0.25, 0],
    [2.8, 0.8, -0.2, 0.15],
    [4.0, 0.85, 0, -0.1],
  ]) {
    k.add(P.cyl(r, r, 0.2, 10), leaf, { x, y, z });
  }
  k.add(P.cyl(0.75, 0.6, 0.45, 10), leaf, { y: 4.3 }); // a bed at the top
  k.add(P.cyl(0.015, 0.015, 0.7, 3), 0xeeeeee, { x: 0.9, y: 1.1 });
  k.add(P.ball(0.13, 6, 4), 0xe8344a, { x: 0.9, y: 0.72 }); // a toy on a string
}
// Whiskers and ears on the sun's disc (radius r), shown only in the mode.
function sunWhiskers(disc, r, color) {
  const g = new THREE.Group(),
    m = new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, depthWrite: false });
  for (const s of [-1, 1]) {
    for (const w of [-1, 0, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.1, r * 0.05), m);
      p.position.set(s * r * 1.25, -r * 0.15 + w * r * 0.18, 0);
      p.rotation.z = s * w * 0.18;
      g.add(p);
    }
    const ear = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 3), m);
    ear.position.set(s * r * 0.6, r * 0.82, 0);
    ear.rotation.z = Math.PI / 2 + s * 0.35;
    g.add(ear);
  }
  g.renderOrder = -9;
  g.traverse((o) => {
    o.renderOrder = -9;
    o.frustumCulled = false;
  });
  disc.add(g);
  return g;
}
export { catBeacon, catBed, cardboard, roofEars, catTree, sunWhiskers };

/* A cat sitting up on a roof ridge or a flat roof, looking out over the street, its tail hanging down the slope.
   k: a plain kit (the town's `cats`); x, y, z: where it sits; ry: which way it faces; fur: its colour. */
function roofCat(k, x, y, z, ry, fur) {
  const s = 2.6, // roof cats are big cats: they must read from the street
    at = (lx, ly, lz) => {
      const c = Math.cos(ry),
        sn = Math.sin(ry);
      return { x: x + (lx * c + lz * sn) * s, y: y + ly * s, z: z + (-lx * sn + lz * c) * s };
    },
    light = fur === 0x26252a ? 0x3a393f : 0xf2ece2;
  k.add(P.blob(0.2, 1), fur, Object.assign(at(0, 0.2, 0), { sx: s * 0.8, sy: s * 1.2, sz: s * 0.9 }), { round: true }); // body, sitting up
  k.add(P.ball(0.13, 10, 8), fur, Object.assign(at(0, 0.5, 0.06), { s })); // head
  k.add(P.ball(0.05, 6, 4), light, Object.assign(at(0, 0.46, 0.17), { s })); // muzzle
  for (const e of [-1, 1])
    k.add(P.cone(0.05, 0.11, 4), fur, Object.assign(at(e * 0.07, 0.65, 0.04), { s, rz: -e * 0.3, ry }), { flat: true });
  for (let i = 0; i < 5; i++) k.add(P.ball(0.04, 6, 4), fur, Object.assign(at(0.05, 0.05 - i * 0.09, -0.18 - i * 0.03), { s })); // tail down the roof
}
export { roofCat };
