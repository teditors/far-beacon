/* Things (commission 7): beds, tables, cups, books, bones... the ordinary objects the rules put in rooms, ruins and
   levels (rules/things.js), drawn with the kit in the art style: a few strong shapes each, colour in the vertices,
   banded light. All the things of a place are merged into two meshes, furniture and small things, so a full room is
   two draw calls (three with the furniture's outline); small things fold away to nothing beyond a few tens of metres
   (the vertex shader collapses each onto its own middle), so a level's far cups cost nothing and never crawl.
   Merged meshes are kept per place and what has been taken, so walking about rebuilds nothing.
   Switch: `things` (the run's, in Tinker: the rules make none) and the look's `thingsDrawn` (draw them or not). */
import { feline } from './themeflag.js';
import { FURS, curledCat } from './catkit.js';
import { P as PT, kit, kitMat } from './kit.js';
import { addOutline } from './outline.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { R } from './ctx.js';
import { variant } from './furniture.js';

LOOK_SWITCHES.push(['thingsDrawn', 'Things in rooms, drawn']);
LOOK_SWITCHES.push(['furniture', 'Furniture by wealth, broken when abandoned']);
const thingsOn = () => lookOn('thingsDrawn') && lookOn('light');

const C = (hex) => new THREE.Color(hex);
const dk = (hex, k) => C(hex).multiplyScalar(k).getHex();
const WOOD = 0x7a5634,
  IRON = 0x4a4a50,
  STONE = 0x8a8478,
  CLOTH = 0xd8ccb0;

/* ---------- models: (kit, colour) in metres, standing on y = 0, facing +z ---------- */
const vessel = (k, c, h, r, neck) => {
  k.add(PT.cyl(r * 0.8, r * 0.7, h * 0.15, 10), c, { y: h * 0.075 });
  k.add(PT.ball(r, 10, 7), c, { y: h * 0.45, sy: (h * 0.6) / (2 * r) });
  if (neck) k.add(PT.cyl(r * neck, r * neck * 1.1, h * 0.3, 10), c, { y: h * 0.85 });
};
const legs4 = (k, c, w, d, h, t) => {
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    k.add(PT.box(t, h, t), c, { x: sx * (w / 2 - t), y: h / 2, z: sz * (d / 2 - t) });
};
const MODELS = {
  bed(k, c) {
    legs4(k, WOOD, 0.95, 1.95, 0.35, 0.08);
    k.add(PT.box(0.95, 0.12, 1.95), WOOD, { y: 0.35 });
    k.add(PT.box(0.88, 0.14, 1.85), CLOTH, { y: 0.47 });
    k.add(PT.box(0.86, 0.06, 1.2), c, { y: 0.56, z: 0.3 }); // the blanket
    k.add(PT.box(0.5, 0.1, 0.3), 0xefe8dc, { y: 0.58, z: -0.7 }); // the pillow
    k.add(PT.box(0.95, 0.75, 0.08), WOOD, { y: 0.38, z: -0.96 }); // the headboard
  },
  cot(k, c) {
    legs4(k, c, 0.8, 1.8, 0.3, 0.06);
    k.add(PT.box(0.8, 0.1, 1.8), CLOTH, { y: 0.35 });
    k.add(PT.box(0.75, 0.05, 1.0), 0x9a8a6a, { y: 0.42, z: 0.35 });
  },
  table(k, c) {
    legs4(k, dk(c, 0.85), 1.15, 0.75, 0.74, 0.07);
    k.add(PT.box(1.15, 0.05, 0.75), c, { y: 0.76 });
  },
  longtable(k, c) {
    legs4(k, dk(c, 0.85), 2.4, 0.85, 0.74, 0.09);
    k.add(PT.box(2.4, 0.06, 0.85), c, { y: 0.76 });
  },
  bench(k, c) {
    for (const sx of [-0.55, 0.55]) k.add(PT.box(0.06, 0.42, 0.3), dk(c, 0.85), { x: sx, y: 0.21 });
    k.add(PT.box(1.4, 0.05, 0.35), c, { y: 0.44 });
  },
  chair(k, c) {
    legs4(k, c, 0.45, 0.45, 0.44, 0.05);
    k.add(PT.box(0.45, 0.04, 0.45), c, { y: 0.45 });
    k.add(PT.box(0.45, 0.5, 0.04), c, { y: 0.72, z: -0.2 });
  },
  stool(k, c) {
    for (const [x, z] of [
      [-0.11, -0.09],
      [0.11, -0.09],
      [0, 0.13],
    ])
      k.add(PT.cyl(0.025, 0.03, 0.43, 5), c, { x, y: 0.21, z });
    k.add(PT.cyl(0.17, 0.17, 0.05, 10), c, { y: 0.44 });
  },
  chest(k, c) {
    k.add(PT.box(0.9, 0.45, 0.5), c, { y: 0.225 });
    k.add(PT.box(0.94, 0.14, 0.54), dk(c, 1.1), { y: 0.52 });
    for (const sx of [-0.3, 0.3]) k.add(PT.box(0.06, 0.62, 0.52), IRON, { x: sx, y: 0.3 });
    k.add(PT.box(0.1, 0.12, 0.03), 0xc8a040, { y: 0.4, z: 0.26 });
  },
  shelf(k, c) {
    for (const sx of [-0.53, 0.53]) k.add(PT.box(0.04, 1.6, 0.34), c, { x: sx, y: 0.8 });
    for (const y of [0.05, 0.45, 0.9, 1.45]) k.add(PT.box(1.1, 0.04, 0.34), c, { y });
  },
  cupboard(k, c) {
    k.add(PT.box(1, 1.7, 0.5), c, { y: 0.85 });
    k.add(PT.box(0.47, 1.4, 0.03), dk(c, 1.15), { x: -0.25, y: 0.85, z: 0.26 });
    k.add(PT.box(0.47, 1.4, 0.03), dk(c, 1.15), { x: 0.25, y: 0.85, z: 0.26 });
    k.add(PT.box(1.08, 0.06, 0.56), c, { y: 1.72 });
  },
  bookcase(k, c) {
    MODELS.shelf(k, c);
    const cols = [0x6a2a2a, 0x2a4a6a, 0x4a6a3a, 0x7a5a2a, 0x3a3a4a];
    for (const y of [0.07, 0.47, 0.92])
      for (let i = 0; i < 6; i++)
        k.add(PT.box(0.12, 0.3 + (i % 3) * 0.04, 0.24), cols[(i + y * 10) % 5 | 0], { x: -0.42 + i * 0.16, y: y + 0.17 });
  },
  hearth(k, c) {
    k.add(PT.box(1.5, 0.9, 0.7), c, { y: 0.45 }, { uv: 0.6 });
    k.add(PT.box(0.9, 0.6, 0.72), 0x1e1a18, { y: 0.4, z: 0.01 }); // the fire's mouth
    k.add(PT.box(1.6, 0.12, 0.8), dk(c, 0.9), { y: 0.95 });
    k.add(PT.box(0.9, 1.6, 0.5), c, { y: 1.8, z: -0.1 }); // the chimney breast
    k.add(PT.blob(0.16, 0), 0xff9a3a, { y: 0.25, z: 0.12, sx: 1.6 }); // embers
  },
  stove(k, c) {
    k.add(PT.box(0.8, 0.9, 0.7), c, { y: 0.45 });
    k.add(PT.box(0.4, 0.3, 0.02), 0x2a2220, { y: 0.4, z: 0.36 });
    k.add(PT.cyl(0.1, 0.1, 1.6, 8), IRON, { y: 1.7, z: -0.2 });
  },
  barrel(k, c) {
    k.add(PT.cyl(0.26, 0.26, 0.12, 12), c, { y: 0.06 });
    k.add(PT.ball(0.32, 12, 8), c, { y: 0.5, sy: 1.55 });
    k.add(PT.cyl(0.27, 0.27, 0.05, 12), c, { y: 0.96 });
    for (const y of [0.25, 0.75]) k.add(PT.cyl(0.31, 0.31, 0.04, 12), IRON, { y });
  },
  crate(k, c) {
    k.add(PT.box(0.7, 0.7, 0.7), c, { y: 0.35 }, { jitter: 0.05 });
    k.add(PT.box(0.72, 0.08, 0.72), dk(c, 0.8), { y: 0.66 });
    k.add(PT.box(0.72, 0.08, 0.72), dk(c, 0.8), { y: 0.04 });
  },
  sack(k, c) {
    k.add(PT.ball(0.27, 10, 7), c, { y: 0.27, sy: 1.25 });
    k.add(PT.cone(0.12, 0.16, 8), c, { y: 0.62 });
  },
  rug(k, c) {
    k.add(PT.box(1.8, 0.015, 1.2), c, { y: 0.01 });
    k.add(PT.box(1.5, 0.018, 0.9), dk(c, 1.25), { y: 0.012 });
    k.add(PT.box(1.1, 0.02, 0.5), c, { y: 0.014 });
  },
  curtain(k, c) {
    k.add(PT.box(1.3, 0.04, 0.04), WOOD, { y: 2.2, z: -0.02 });
    for (const sx of [-0.4, 0.4]) k.add(PT.box(0.42, 2.0, 0.05), c, { x: sx, y: 1.18 });
  },
  tapestry(k, c) {
    k.add(PT.box(1.7, 0.05, 0.05), WOOD, { y: 2.5 });
    k.add(PT.box(1.6, 1.9, 0.03), c, { y: 1.55 });
    k.add(PT.box(1.2, 1.3, 0.035), dk(c, 1.5), { y: 1.6 });
    k.add(PT.box(0.5, 0.6, 0.04), 0xc8a040, { y: 1.65 });
  },
  loom(k, c) {
    for (const sx of [-0.6, 0.6]) k.add(PT.box(0.07, 1.6, 0.07), c, { x: sx, y: 0.8, z: -0.3 });
    for (const sx of [-0.6, 0.6]) k.add(PT.box(0.07, 0.8, 0.07), c, { x: sx, y: 0.4, z: 0.3 });
    k.add(PT.box(1.3, 0.07, 0.07), c, { y: 1.55, z: -0.3 });
    k.add(PT.box(1.3, 0.07, 0.7), c, { y: 0.8 });
    k.add(PT.box(1.1, 0.8, 0.02), 0xb84a4a, { y: 1.15, z: -0.3 });
  },
  wheel(k, c) {
    k.add(PT.box(0.9, 0.06, 0.25), c, { y: 0.35 });
    legs4(k, c, 0.85, 0.25, 0.35, 0.04);
    k.add(new THREE.TorusGeometry(0.32, 0.03, 5, 16), c, { x: 0.2, y: 0.75, ry: Math.PI / 2 });
    k.add(PT.box(0.05, 0.5, 0.05), c, { x: 0.2, y: 0.55 });
    k.add(PT.cyl(0.02, 0.02, 0.25, 5), 0xd8c8a0, { x: -0.3, y: 0.55, rz: 1.2 });
  },
  anvil(k, c) {
    k.add(PT.cyl(0.2, 0.25, 0.45, 8), WOOD, { y: 0.22 });
    k.add(PT.box(0.25, 0.15, 0.2), c, { y: 0.5 });
    k.add(PT.box(0.55, 0.14, 0.24), c, { y: 0.64 });
    k.add(PT.cone(0.1, 0.25, 6), c, { x: 0.38, y: 0.66, rz: -Math.PI / 2 });
  },
  forge(k, c) {
    k.add(PT.box(1.3, 0.85, 0.9), c, { y: 0.42 }, { uv: 0.6 });
    k.add(PT.box(1.0, 0.1, 0.6), 0x2a2220, { y: 0.88 });
    k.add(PT.blob(0.25, 0), 0xff7a2a, { y: 0.95, sx: 1.5, sy: 0.4 });
    k.add(PT.cone(0.6, 1.0, 4), dk(c, 0.8), { y: 1.9, ry: Math.PI / 4 });
    k.add(PT.box(0.3, 1.2, 0.3), dk(c, 0.8), { y: 2.9 });
  },
  workbench(k, c) {
    legs4(k, dk(c, 0.85), 1.4, 0.6, 0.86, 0.08);
    k.add(PT.box(1.4, 0.08, 0.6), c, { y: 0.88 });
    k.add(PT.box(1.3, 0.05, 0.5), dk(c, 0.85), { y: 0.25 });
  },
  counter(k, c) {
    k.add(PT.box(2.2, 0.95, 0.6), c, { y: 0.475 });
    k.add(PT.box(2.3, 0.06, 0.7), dk(c, 1.15), { y: 0.98 });
  },
  altar(k, c) {
    k.add(PT.box(1.4, 0.9, 0.7), c, { y: 0.45 }, { uv: 0.6 });
    k.add(PT.box(1.5, 0.1, 0.8), dk(c, 1.05), { y: 0.95 });
    k.add(PT.box(1.2, 0.5, 0.02), 0x8a2a2a, { y: 0.7, z: 0.36 });
  },
  lectern(k, c) {
    k.add(PT.box(0.4, 0.06, 0.4), c, { y: 0.03 });
    k.add(PT.box(0.12, 1.0, 0.12), c, { y: 0.5 });
    k.add(PT.box(0.5, 0.05, 0.4), c, { y: 1.08, rx: 0.4 });
  },
  rack(k, c) {
    for (const sx of [-0.55, 0.55]) k.add(PT.box(0.06, 1.5, 0.06), c, { x: sx, y: 0.75 });
    k.add(PT.box(1.2, 0.06, 0.06), c, { y: 1.3 });
    k.add(PT.box(1.2, 0.06, 0.2), c, { y: 0.15 });
    for (let i = 0; i < 4; i++)
      k.add(PT.box(0.04, 1.6, 0.04), i % 2 ? 0xb8b8c0 : WOOD, { x: -0.4 + i * 0.26, y: 0.85, rz: 0.06 });
  },
  drying(k, c) {
    for (const sx of [-0.55, 0.55]) k.add(PT.box(0.05, 1.8, 0.05), c, { x: sx, y: 0.9 });
    for (const y of [1.0, 1.5]) {
      k.add(PT.cyl(0.02, 0.02, 1.2, 5), c, { y, rz: Math.PI / 2 });
      for (let i = 0; i < 5; i++)
        k.add(PT.cone(0.07, 0.35, 5), i % 2 ? 0x5a8a3a : 0x7a8a4a, { x: -0.45 + i * 0.22, y: y - 0.18, rx: Math.PI });
    }
  },
  coffin(k, c) {
    k.add(PT.box(0.9, 0.6, 2.1), c, { y: 0.3 }, { uv: 0.6 });
    k.add(PT.box(0.95, 0.12, 2.15), dk(c, 1.08), { y: 0.66 });
    k.add(PT.box(0.3, 0.04, 0.9), dk(c, 0.8), { y: 0.73, z: -0.2 });
  },
  cart(k, c) {
    k.add(PT.box(0.8, 0.5, 1.2), c, { y: 0.55 });
    for (const [sx, sz] of [
      [-0.42, -0.4],
      [0.42, -0.4],
      [-0.42, 0.4],
      [0.42, 0.4],
    ])
      k.add(PT.cyl(0.18, 0.18, 0.06, 10), IRON, { x: sx, y: 0.2, z: sz, rz: Math.PI / 2 });
    k.add(PT.blob(0.3, 0), 0x6a6460, { y: 0.85, sx: 1.1, sz: 1.6 });
  },
  woodstack(k, c) {
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 4 - r; i++)
        k.add(PT.cyl(0.1, 0.1, 0.5, 6), i % 2 ? c : dk(c, 1.15), {
          x: -0.33 + i * 0.22 + r * 0.11,
          y: 0.1 + r * 0.18,
          rx: Math.PI / 2,
        });
  },
  waterjar(k, c) {
    vessel(k, c, 0.9, 0.3, 0.5);
  },
  nets(k, c) {
    k.add(PT.box(1.4, 0.05, 0.05), WOOD, { y: 2.0 });
    k.add(PT.box(1.3, 1.4, 0.02), c, { y: 1.3 });
    for (let i = 0; i < 3; i++) k.add(PT.ball(0.07, 6, 4), 0xc8a040, { x: -0.4 + i * 0.4, y: 0.7 });
  },
  // small things
  cup(k, c) {
    k.add(PT.cyl(0.045, 0.035, 0.1, 8), c, { y: 0.05 });
  },
  plate(k, c) {
    k.add(PT.cyl(0.12, 0.09, 0.025, 12), c, { y: 0.013 });
  },
  bowl(k, c) {
    k.add(new THREE.SphereGeometry(0.1, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, { y: 0.09 });
    k.add(PT.cyl(0.1, 0.1, 0.01, 10), dk(c, 0.6), { y: 0.085 });
  },
  jug(k, c) {
    vessel(k, c, 0.28, 0.1, 0.55);
    k.add(new THREE.TorusGeometry(0.06, 0.012, 4, 8, Math.PI), c, { x: 0.09, y: 0.16, rz: -Math.PI / 2 });
  },
  pot(k, c) {
    k.add(PT.ball(0.17, 10, 6), c, { y: 0.15, sy: 0.85 });
    k.add(PT.cyl(0.13, 0.15, 0.05, 10), c, { y: 0.28 });
  },
  pan(k, c) {
    k.add(PT.cyl(0.14, 0.12, 0.05, 10), c, { y: 0.025 });
    k.add(PT.box(0.22, 0.02, 0.03), WOOD, { x: 0.24, y: 0.04 });
  },
  kettle(k, c) {
    k.add(PT.ball(0.13, 10, 6), c, { y: 0.12, sy: 0.85 });
    k.add(PT.cone(0.03, 0.14, 5), c, { x: 0.15, y: 0.15, rz: -1 });
    k.add(new THREE.TorusGeometry(0.08, 0.01, 4, 8, Math.PI), c, { y: 0.22 });
  },
  spoon(k, c) {
    k.add(PT.box(0.15, 0.01, 0.015), c, { y: 0.008 });
    k.add(PT.ball(0.025, 6, 4), c, { x: 0.09, y: 0.012, sy: 0.4 });
  },
  knife(k, c) {
    k.add(PT.box(0.14, 0.01, 0.025), c, { x: 0.04, y: 0.008 });
    k.add(PT.box(0.09, 0.02, 0.025), WOOD, { x: -0.07, y: 0.01 });
  },
  bottle(k, c) {
    k.add(PT.cyl(0.045, 0.045, 0.17, 8), c, { y: 0.085 });
    k.add(PT.cyl(0.015, 0.03, 0.08, 8), c, { y: 0.21 });
  },
  bread(k, c) {
    k.add(PT.ball(0.1, 8, 6), c, { y: 0.05, sx: 1.4, sy: 0.6 });
  },
  cheese(k, c) {
    k.add(PT.cyl(0.11, 0.11, 0.08, 10), c, { y: 0.04 });
  },
  apple(k, c) {
    k.add(PT.ball(0.04, 8, 6), c, { y: 0.04 });
  },
  fish(k, c) {
    k.add(PT.ball(0.05, 8, 5), c, { y: 0.03, sx: 3.2, sy: 0.5 });
    k.add(PT.cone(0.05, 0.08, 4), c, { x: -0.18, y: 0.03, rz: Math.PI / 2 });
  },
  mushroom(k, c) {
    k.add(PT.cyl(0.02, 0.025, 0.08, 6), c, { y: 0.04 });
    k.add(new THREE.SphereGeometry(0.06, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), dk(c, 0.9), { y: 0.08 });
  },
  herbs(k, c) {
    k.add(PT.cone(0.06, 0.25, 6), c, { y: 0.03, rz: Math.PI / 2 });
    k.add(PT.cyl(0.015, 0.015, 0.06, 5), 0xc8a060, { x: -0.14, y: 0.03, rz: Math.PI / 2 });
  },
  basket(k, c) {
    k.add(PT.cyl(0.17, 0.13, 0.18, 10), c, { y: 0.09 }, { jitter: 0.1 });
    k.add(new THREE.TorusGeometry(0.15, 0.012, 4, 10, Math.PI), c, { y: 0.18 });
  },
  candle(k, c) {
    k.add(PT.cyl(0.05, 0.05, 0.015, 8), 0x8a7a5a, { y: 0.008 });
    k.add(PT.cyl(0.018, 0.018, 0.14, 6), c, { y: 0.08 });
    k.add(PT.cone(0.012, 0.03, 4), 0xffc050, { y: 0.165 });
  },
  lamp(k, c) {
    k.add(PT.ball(0.06, 8, 5), c, { y: 0.04, sx: 1.6, sy: 0.6 });
    k.add(PT.cone(0.012, 0.03, 4), 0xffc050, { x: 0.08, y: 0.07 });
  },
  broom(k, c) {
    k.add(PT.cyl(0.015, 0.015, 1.2, 5), WOOD, { y: 0.03, z: 0.1, rx: Math.PI / 2 });
    k.add(PT.cone(0.1, 0.35, 6), c, { y: 0.06, z: -0.55, rx: -Math.PI / 2 });
  },
  bucket(k, c) {
    k.add(PT.cyl(0.14, 0.11, 0.25, 10), c, { y: 0.125 });
    k.add(PT.cyl(0.145, 0.145, 0.02, 10), IRON, { y: 0.2 });
    k.add(new THREE.TorusGeometry(0.13, 0.008, 4, 8, Math.PI), IRON, { y: 0.25 });
  },
  hammer(k, c) {
    k.add(PT.box(0.3, 0.02, 0.025), WOOD, { y: 0.02 });
    k.add(PT.box(0.05, 0.05, 0.11), c, { x: 0.15, y: 0.03 });
  },
  tongs(k, c) {
    for (const s of [-1, 1]) k.add(PT.box(0.4, 0.015, 0.015), c, { y: 0.01, z: s * 0.02, ry: s * 0.06 });
  },
  saw(k, c) {
    k.add(PT.box(0.45, 0.005, 0.1), c, { y: 0.005 });
    k.add(PT.box(0.12, 0.03, 0.05), WOOD, { x: -0.28, y: 0.015 });
  },
  scythe(k, c) {
    k.add(PT.cyl(0.018, 0.018, 1.4, 5), WOOD, { y: 0.02, rz: Math.PI / 2 });
    k.add(PT.box(0.04, 0.005, 0.5), c, { x: 0.7, y: 0.02, z: 0.22, ry: 0.3 });
  },
  pick(k, c) {
    k.add(PT.cyl(0.02, 0.02, 0.8, 5), WOOD, { y: 0.03, rz: Math.PI / 2 });
    k.add(PT.box(0.04, 0.04, 0.5), c, { x: 0.38, y: 0.04 });
  },
  shovel(k, c) {
    k.add(PT.cyl(0.018, 0.018, 0.9, 5), WOOD, { y: 0.03, rz: Math.PI / 2 });
    k.add(PT.box(0.26, 0.01, 0.2), c, { x: 0.55, y: 0.02 });
  },
  horseshoe(k, c) {
    k.add(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI * 1.4), c, { y: 0.01, rx: Math.PI / 2 });
  },
  chain(k, c) {
    for (let i = 0; i < 6; i++)
      k.add(new THREE.TorusGeometry(0.03, 0.008, 4, 6), c, {
        x: -0.15 + i * 0.05,
        y: 0.01,
        rx: i % 2 ? Math.PI / 2 : 0,
        ry: i * 0.3,
      });
  },
  net(k, c) {
    k.add(PT.blob(0.2, 1), c, { y: 0.05, sy: 0.3, sx: 1.4 }, { jitter: 0.2 });
  },
  float(k, c) {
    k.add(PT.ball(0.07, 8, 6), c, { y: 0.07 });
  },
  spindle(k, c) {
    k.add(PT.cyl(0.008, 0.008, 0.3, 5), c, { y: 0.02, rz: Math.PI / 2 });
    k.add(PT.cyl(0.04, 0.04, 0.02, 8), c, { x: -0.1, y: 0.02, rz: Math.PI / 2 });
  },
  yarn(k, c) {
    k.add(PT.ball(0.06, 8, 6), c, { y: 0.06 });
  },
  inkpot(k, c) {
    k.add(PT.cyl(0.03, 0.035, 0.05, 8), c, { y: 0.025 });
    k.add(PT.cyl(0.004, 0.004, 0.22, 4), 0xefe8dc, { x: 0.02, y: 0.12, rz: -0.3 });
  },
  book(k, c) {
    k.add(PT.box(0.2, 0.05, 0.27), c, { y: 0.025 });
    k.add(PT.box(0.19, 0.04, 0.26), 0xe8dcc0, { x: 0.006, y: 0.025 });
  },
  scroll(k, c) {
    k.add(PT.cyl(0.025, 0.025, 0.28, 6), c, { y: 0.025, rz: Math.PI / 2 });
    k.add(PT.cyl(0.008, 0.008, 0.32, 4), WOOD, { y: 0.025, rz: Math.PI / 2 });
  },
  map(k, c) {
    k.add(PT.box(0.4, 0.004, 0.3), c, { y: 0.003 });
    k.add(PT.box(0.2, 0.005, 0.1), 0x6a8a5a, { x: -0.05, y: 0.004, z: 0.03 });
    k.add(PT.box(0.1, 0.005, 0.14), 0x4a6a8a, { x: 0.1, y: 0.004, z: -0.05 });
  },
  painting(k, c) {
    k.add(PT.box(0.55, 0.45, 0.04), 0x8a6a2a, { y: 0.225, rx: -0.15 });
    k.add(PT.box(0.47, 0.37, 0.045), c, { y: 0.225, z: 0.005, rx: -0.15 });
    k.add(PT.box(0.2, 0.1, 0.05), 0xc8a060, { x: 0.08, y: 0.26, z: 0.01, rx: -0.15 });
  },
  vase(k, c) {
    vessel(k, c, 0.35, 0.11, 0.45);
  },
  doll(k, c) {
    k.add(PT.cone(0.07, 0.18, 6), c, { y: 0.09 });
    k.add(PT.ball(0.045, 6, 5), 0xe8c8a8, { y: 0.21 });
  },
  toy(k, c) {
    k.add(PT.box(0.16, 0.07, 0.06), c, { y: 0.09 });
    k.add(PT.box(0.05, 0.08, 0.05), c, { x: 0.08, y: 0.15 });
    for (const [x, z] of [
      [-0.06, -0.02],
      [0.06, -0.02],
      [-0.06, 0.02],
      [0.06, 0.02],
    ])
      k.add(PT.box(0.02, 0.06, 0.02), c, { x, y: 0.03, z });
  },
  flute(k, c) {
    k.add(PT.cyl(0.012, 0.012, 0.32, 6), c, { y: 0.012, rz: Math.PI / 2 });
  },
  lute(k, c) {
    k.add(PT.ball(0.16, 10, 6), c, { y: 0.05, sy: 0.35, sz: 1.2 });
    k.add(PT.box(0.05, 0.03, 0.4), dk(c, 0.7), { y: 0.07, z: 0.33 });
  },
  drum(k, c) {
    k.add(PT.cyl(0.17, 0.17, 0.22, 10), c, { y: 0.11 });
    k.add(PT.cyl(0.175, 0.175, 0.02, 10), 0xe8dcc0, { y: 0.225 });
  },
  statuette(k, c) {
    k.add(PT.box(0.12, 0.04, 0.12), c, { y: 0.02 });
    k.add(PT.cone(0.06, 0.24, 6), c, { y: 0.16 });
    k.add(PT.ball(0.04, 6, 5), c, { y: 0.31 });
  },
  holy(k, c) {
    k.add(PT.box(0.03, 0.2, 0.02), c, { y: 0.1 });
    k.add(PT.box(0.12, 0.03, 0.02), c, { y: 0.14 });
    k.add(PT.box(0.08, 0.02, 0.06), c, { y: 0.01 });
  },
  keepsake(k, c) {
    k.add(PT.cyl(0.025, 0.025, 0.01, 10), c, { y: 0.006 });
  },
  ring(k, c) {
    k.add(new THREE.TorusGeometry(0.012, 0.004, 4, 8), c, { y: 0.004, rx: Math.PI / 2 });
  },
  comb(k, c) {
    k.add(PT.box(0.1, 0.01, 0.04), c, { y: 0.005 });
  },
  mirror(k, c) {
    k.add(PT.cyl(0.07, 0.07, 0.015, 12), 0xc8a040, { y: 0.008 });
    k.add(PT.cyl(0.06, 0.06, 0.017, 12), c, { y: 0.009 });
    k.add(PT.box(0.1, 0.012, 0.02), 0xc8a040, { x: 0.12, y: 0.006 });
  },
  dice(k, c) {
    k.add(PT.box(0.02, 0.02, 0.02), c, { y: 0.01 });
    k.add(PT.box(0.02, 0.02, 0.02), c, { x: 0.03, y: 0.01, ry: 0.5 });
  },
  urn(k, c) {
    vessel(k, c, 0.5, 0.17, 0.55);
    for (const s of [-1, 1]) k.add(new THREE.TorusGeometry(0.05, 0.012, 4, 8), c, { x: s * 0.13, y: 0.38, ry: Math.PI / 2 });
  },
  bones(k, c) {
    for (let i = 0; i < 4; i++)
      k.add(PT.cyl(0.015, 0.015, 0.32, 5), c, { x: -0.1 + i * 0.07, y: 0.015, rz: Math.PI / 2, ry: i * 0.7 });
    k.add(PT.ball(0.07, 6, 5), c, { x: 0.18, y: 0.03, sy: 0.6 });
  },
  skull(k, c) {
    k.add(PT.ball(0.09, 8, 6), c, { y: 0.09, sz: 1.15 });
    k.add(PT.box(0.09, 0.05, 0.08), c, { y: 0.03, z: 0.05 });
    for (const s of [-1, 1]) k.add(PT.ball(0.022, 5, 4), 0x2a2420, { x: s * 0.035, y: 0.1, z: 0.085 });
  },
  shell(k, c) {
    k.add(PT.cone(0.05, 0.1, 6), c, { y: 0.02, rz: Math.PI / 2 });
  },
  coral(k, c) {
    k.add(PT.cyl(0.015, 0.02, 0.2, 5), c, { y: 0.1 });
    k.add(PT.cyl(0.01, 0.015, 0.12, 5), c, { x: 0.04, y: 0.14, rz: -0.6 });
    k.add(PT.cyl(0.01, 0.015, 0.1, 5), c, { x: -0.04, y: 0.12, rz: 0.7 });
  },
  helmet(k, c) {
    k.add(new THREE.SphereGeometry(0.13, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), c, { y: 0 });
    k.add(PT.box(0.03, 0.12, 0.03), c, { y: 0.03, z: 0.12 });
  },
  shield(k, c) {
    k.add(PT.cyl(0.3, 0.3, 0.04, 12), c, { y: 0.02 });
    k.add(PT.cyl(0.08, 0.08, 0.06, 8), IRON, { y: 0.04 });
  },
};

/* ---------- a place's things, merged ---------- */
const GEOS = new Map(); // a model by kind, colour and age: its geometry, kept
function modelGeo(id, col, old, t) {
  t = t || {};
  const byUse = lookOn('furniture'),
    key = id + ':' + col + ':' + (old ? 1 : 0) + (byUse ? ':' + (t.g === undefined ? '' : t.g) + ':' + (t.dom || '') : '');
  let g = GEOS.get(key);
  if (g) return g;
  const kd = R.thingKind(id),
    k = kit(),
    m = MODELS[(kd && kd.model) || id] || MODELS.crate;
  // furniture with character (furniture.js, C8.5): the new kinds, a poor and a rich version, broken when old
  if (!(byUse && variant((kd && kd.model) || id, k, col, { g: t.g, old, dom: t.dom, fixed: kd && kd.fixed }))) m(k, col);
  g = k.build();
  if (old) {
    // old things: greyer and darker, as if dust lay on them
    const c = g.attributes.color.array;
    for (let i = 0; i < c.length; i += 3) {
      const l = (c[i] + c[i + 1] + c[i + 2]) / 3;
      c[i] = (c[i] * 0.5 + l * 0.5) * 0.85;
      c[i + 1] = (c[i + 1] * 0.5 + l * 0.5) * 0.85;
      c[i + 2] = (c[i + 2] * 0.5 + l * 0.5) * 0.82;
    }
  }
  GEOS.set(key, g);
  return g;
}
const colourOf = (t, mark) => {
  const kd = R.thingKind(t.k);
  let c = kd.grades && kd.gcol && t.g !== undefined ? kd.gcol[t.g] : kd.col || '#8a6a4a';
  c = parseInt(c.slice(1), 16);
  if (t.dom && R.C.pantheon) {
    const d = R.C.pantheon.domains.find((x) => x.id === t.dom); // the god's own colour on its shrine
    if (d) c = d.color;
  }
  if (t.ware && mark !== undefined) c = C(c).lerp(C(mark), 0.45).getHex(); // in the lost people's own colour
  return c;
};
const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _v = new THREE.Vector3(),
  _n = new THREE.Vector3(),
  _s = new THREE.Vector3(1, 1, 1),
  _y = new THREE.Vector3(0, 1, 0);
// Merge placed models into one geometry, each vertex knowing its model's middle (for folding far things away).
function merge(list) {
  let n = 0;
  for (const e of list) n += e.g.attributes.position.count;
  const pos = new Float32Array(n * 3),
    nor = new Float32Array(n * 3),
    col = new Float32Array(n * 3),
    mid = new Float32Array(n * 3);
  let o = 0;
  for (const e of list) {
    const p = e.g.attributes.position.array,
      nn = e.g.attributes.normal.array,
      cc = e.g.attributes.color.array,
      c = p.length / 3;
    _q.setFromAxisAngle(_y, e.ry);
    _v.set(e.x, e.y, e.z);
    _m.compose(_v, _q, _s);
    for (let i = 0; i < c; i++) {
      _n.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(_m);
      pos[(o + i) * 3] = _n.x;
      pos[(o + i) * 3 + 1] = _n.y;
      pos[(o + i) * 3 + 2] = _n.z;
      _n.set(nn[i * 3], nn[i * 3 + 1], nn[i * 3 + 2]).applyQuaternion(_q);
      nor[(o + i) * 3] = _n.x;
      nor[(o + i) * 3 + 1] = _n.y;
      nor[(o + i) * 3 + 2] = _n.z;
      mid[(o + i) * 3] = e.x;
      mid[(o + i) * 3 + 1] = e.y;
      mid[(o + i) * 3 + 2] = e.z;
    }
    col.set(cc, o * 3);
    o += c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('mid', new THREE.BufferAttribute(mid, 3));
  g.computeBoundingSphere();
  return g;
}
// small things fold away beyond `far` metres: each model's points all go to its middle, so it vanishes whole
const FOLD = { value: 40 };
let SMALL = null;
function smallMat() {
  if (SMALL) return SMALL;
  SMALL = kitMat();
  SMALL.onBeforeCompile = (sh) => {
    sh.uniforms.thFar = FOLD;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 mid;\nuniform float thFar;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nif (distance((modelMatrix * vec4(mid, 1.0)).xyz, cameraPosition) > thFar) transformed = mid;',
      );
  };
  SMALL.customProgramCacheKey = () => 'thingsSmall';
  SMALL.dispose = () => {};
  return SMALL;
}
let BIG = null;
const bigMat = () => BIG || ((BIG = kitMat()), (BIG.dispose = () => {}), BIG);

const BUILT = new Map(); // a place's merged things, by place, what is left and the quality
/* The things of area `id` (and what was dropped there), as a group in the area's own frame. pos(t) gives a thing's place:
   [x, y, z] of its tile's middle plus its offset, in metres. ts: metres a tile. */
// Super Feline Mode (C9): a cat asleep on a bed (nearly always), and on many a table, chest, bench and rug: any
// furniture with a top big enough to curl up on and low enough to reach. Seeded by the thing, the same every time.
function catOn(list, t, geo, x, y, z) {
  if (!geo.boundingBox) geo.computeBoundingBox();
  const b = geo.boundingBox,
    top = b.max.y,
    wide = Math.min(b.max.x - b.min.x, b.max.z - b.min.z);
  if (top > 1.3 || wide < 0.42 || /chair|stool|pew|throne|coffin|anvil/.test(t.k)) return;
  const h = Math.abs((t.x * 73856093) ^ (t.y * 19349663) ^ (String(t.k).length * 83492791) ^ Math.round((t.px || 0) * 1000)),
    bed = /bed|cot|cradle/.test(t.k);
  if ((h % 100) / 100 > (bed ? 0.9 : 0.35)) return;
  list.push({ g: curledCat(FURS[(h >> 7) % FURS.length]), x, y: y + top, z, ry: ((h >> 3) % 628) / 100 });
}
function thingsGroup(S, id, ts, pos, frame, list) {
  if (!thingsOn()) return null;
  const left = list || R.thingsLeft(S, id),
    map = list ? null : R.mapOf(S, id),
    dropped = [];
  // things put down again lie where they were left, as they would on any floor
  for (const k in (map && map.depots) || {})
    map.depots[k].items.forEach((it, i) => {
      if (!it.thing) return;
      const a = i * 2.4 + 0.5;
      dropped.push(
        Object.assign(
          {
            x: +k % R.W,
            y: Math.floor(+k / R.W),
            px: (Math.cos(a) * 0.12 * 4) / ts,
            pz: (Math.sin(a) * 0.12 * 4) / ts,
            h: 0,
            ry: a,
            k: it.thing.k,
          },
          it.thing,
        ),
      );
    });
  if (!left.length && !dropped.length) return null;
  const key = [id, S.seed, left.length, dropped.length, Q.label, S.realm || '', frame, ts, feline() ? 'cat' : ''].join('|');
  let g = BUILT.get(key);
  if (!g) {
    const mark = R.C.civ && S.civ ? (R.trait(S, 'affinity') || {}).color : undefined,
      big = [],
      small = [];
    for (const t of left.concat(dropped)) {
      const kd = R.thingKind(t.k);
      if (!kd) continue;
      const [x, y, z] = pos(t);
      const geo = modelGeo(t.k, colourOf(t, mark), t.old, t);
      (kd.fixed ? big : small).push({ g: geo, x, y: y + (t.h || 0), z, ry: t.ry || 0 });
      if (kd.fixed && feline()) catOn(big, t, geo, x, y + (t.h || 0), z); // C9: a cat asleep on it, often
    }
    g = new THREE.Group();
    g.userData.things = id;
    if (big.length) {
      const m = new THREE.Mesh(merge(big), bigMat());
      g.add(m);
      addOutline(m, 2, 30);
    }
    if (small.length) g.add(new THREE.Mesh(merge(small), smallMat()));
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose = () => {};
      o.frustumCulled = false;
    });
    BUILT.set(key, g);
    // forget the oldest when there are many (they are rebuilt quickly if wanted again)
    if (BUILT.size > 24) {
      const [k0, old] = BUILT.entries().next().value;
      BUILT.delete(k0);
      old.traverse((o) => o.geometry && THREE.BufferGeometry.prototype.dispose.call(o.geometry));
    }
  }
  FOLD.value = Q.lite ? 18 : (Q.outline || 0) >= 2 ? 40 : 28;
  if (g.parent) g.parent.remove(g);
  return g;
}
export { thingsGroup, MODELS as THING_MODELS, thingsOn };
