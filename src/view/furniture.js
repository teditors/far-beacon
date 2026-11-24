/* Furniture with character (commission 8): the new things of rooms by use, a poor, a middling and a rich version of the
   things a house has most of (bed, table, chair, chest, shelf, lamp, candle), the god's shrine on a temple's altar by
   its domain, and the broken, fallen and dusty state of a thing in an abandoned place. Each is a few strong shapes from
   the kit, in the art style. view/things.js calls `variant(id, kit, colour, thing)` before its own models: a model here
   wins when it has one for that kind and that state. */
import { P as PT } from './kit.js';

const C = (hex) => new THREE.Color(hex);
const dk = (hex, k) => C(hex).multiplyScalar(k).getHex();
const WOOD = 0x7a5634,
  IRON = 0x4a4a50,
  CLOTH = 0xd8ccb0,
  GOLD = 0xc8a040,
  STONE = 0x9a9488;
const legs4 = (k, c, w, d, h, t, short) => {
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const hh = short && sx > 0 && sz > 0 ? h * 0.45 : h; // one leg broken short
    k.add(PT.box(t, hh, t), c, { x: sx * (w / 2 - t), y: hh / 2, z: sz * (d / 2 - t) });
  }
};
const turned = (k, c, x, z, h) => {
  // a turned leg: a post with a bead and a foot
  k.add(PT.cyl(0.035, 0.045, h, 8), c, { x, y: h / 2, z });
  k.add(PT.ball(0.05, 8, 5), c, { x, y: h * 0.55, z });
  k.add(PT.ball(0.045, 8, 5), c, { x, y: 0.04, z });
};

/* ---------- the new kinds ---------- */
const NEW = {
  nightstand(k, c, t) {
    legs4(k, dk(c, 0.85), 0.42, 0.38, 0.55, 0.04);
    k.add(PT.box(0.44, 0.04, 0.4), c, { y: 0.6 });
    k.add(PT.box(0.4, 0.16, 0.36), dk(c, 1.1), { y: 0.48 }); // a drawer
    k.add(PT.ball(0.018, 6, 4), t.g === 2 ? GOLD : IRON, { y: 0.48, z: 0.19 });
  },
  sideboard(k, c, t) {
    k.add(PT.box(1.36, 0.78, 0.48), c, { y: 0.45 });
    k.add(PT.box(1.42, 0.05, 0.52), dk(c, 1.15), { y: 0.86 });
    for (const sx of [-0.45, 0, 0.45]) k.add(PT.box(0.4, 0.6, 0.02), dk(c, 1.12), { x: sx, y: 0.45, z: 0.25 });
    for (const sx of [-0.45, 0, 0.45]) k.add(PT.ball(0.02, 6, 4), t.g === 2 ? GOLD : IRON, { x: sx + 0.14, y: 0.5, z: 0.27 });
    for (const sx of [-0.62, 0.62]) k.add(PT.box(0.06, 0.08, 0.44), dk(c, 0.8), { x: sx, y: 0.04 });
    if (t.g === 2) k.add(PT.box(1.42, 0.12, 0.04), dk(c, 0.9), { y: 1.0, z: -0.24 }); // a carved back rail
  },
  pew(k, c) {
    for (const sx of [-0.55, 0.55]) k.add(PT.box(0.06, 0.95, 0.42), dk(c, 0.9), { x: sx, y: 0.47 });
    k.add(PT.box(1.2, 0.05, 0.38), c, { y: 0.45 });
    k.add(PT.box(1.2, 0.45, 0.04), c, { y: 0.78, z: -0.19 });
    k.add(PT.box(1.2, 0.04, 0.1), dk(c, 0.85), { y: 0.62, z: -0.26 }); // the book rest behind, for the row after
  },
  washstand(k, c) {
    legs4(k, c, 0.58, 0.42, 0.76, 0.04);
    k.add(PT.box(0.6, 0.04, 0.44), c, { y: 0.78 });
    k.add(new THREE.SphereGeometry(0.17, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xd8d0c0, { y: 0.97 }); // the basin
    k.add(PT.box(0.5, 0.03, 0.36), dk(c, 0.85), { y: 0.2 });
  },
  cradle(k, c) {
    for (const sz of [-0.38, 0.38])
      k.add(new THREE.TorusGeometry(0.28, 0.03, 4, 12, Math.PI), c, { y: 0.03, z: sz, rz: Math.PI });
    k.add(PT.box(0.44, 0.3, 0.8), c, { y: 0.38 });
    k.add(PT.box(0.38, 0.06, 0.74), CLOTH, { y: 0.52 });
    k.add(PT.box(0.44, 0.2, 0.04), dk(c, 0.9), { y: 0.62, z: -0.4 });
  },
  candlestand(k, c) {
    k.add(PT.cone(0.18, 0.12, 3), c, { y: 0.06 });
    k.add(PT.cyl(0.025, 0.03, 1.4, 6), c, { y: 0.75 });
    k.add(PT.cyl(0.11, 0.06, 0.05, 8), c, { y: 1.45 });
    k.add(PT.cyl(0.035, 0.035, 0.22, 8), 0xefe6cf, { y: 1.58 });
    k.add(PT.blob(0.03, 0), 0xffd27a, { y: 1.72, sy: 1.6 });
  },
  robes(k, c) {
    k.add(PT.box(1.2, 0.04, 0.04), WOOD, { y: 1.9, z: -0.05 });
    const hues = [c, 0x8a3a3a, c, 0x3a4a6a];
    for (let i = 0; i < 4; i++) {
      k.add(PT.cone(0.17, 1.45, 6), hues[i], { x: -0.42 + i * 0.28, y: 1.14, z: 0.02 });
      k.add(PT.box(0.2, 0.08, 0.06), hues[i], { x: -0.42 + i * 0.28, y: 1.84 });
    }
  },
  cobweb(k, c) {
    // a fan of threads across a corner of the wall, high up
    for (let i = 0; i < 5; i++) k.add(PT.box(0.008, 0.7, 0.008), c, { x: -0.25 + i * 0.03, y: 2.0, rz: -0.9 + i * 0.4 });
    for (const r of [0.15, 0.3, 0.45])
      k.add(new THREE.TorusGeometry(r, 0.006, 3, 10, Math.PI / 2), c, { x: -0.3, y: 2.3, rz: -Math.PI / 2 });
  },
  rubble(k, c) {
    k.add(PT.ball(0.4, 7, 5), c, { y: 0.05, sy: 0.4, sz: 0.8 }, { flat: true, jitter: 0.08 });
    for (let i = 0; i < 5; i++)
      k.add(PT.box(0.16 + (i % 3) * 0.05, 0.05, 0.12), dk(c, 0.9 + (i % 2) * 0.15), {
        x: -0.35 + i * 0.17,
        y: 0.12 + (i % 2) * 0.05,
        z: (i % 3) * 0.12 - 0.12,
        ry: i * 0.9,
        rz: 0.2,
      });
  },
  planks(k, c) {
    for (let i = 0; i < 3; i++)
      k.add(PT.box(1.2 - i * 0.2, 0.04, 0.14), dk(c, 0.9 + i * 0.1), {
        x: i * 0.08,
        y: 0.03 + i * 0.05,
        z: -0.15 + i * 0.15,
        ry: -0.3 + i * 0.35,
        rz: i * 0.06,
      });
  },
  icon(k, c, t) {
    // the god's shrine on the altar, by what the god is god of
    const dom = t.dom || 'sight';
    if (dom === 'water') {
      k.add(PT.cyl(0.16, 0.1, 0.12, 12), STONE, { y: 0.06 });
      k.add(PT.cyl(0.14, 0.14, 0.01, 12), 0x5a8ab0, { y: 0.115 });
    } else if (dom === 'heights')
      for (let i = 0; i < 4; i++)
        k.add(PT.ball(0.11 - i * 0.02, 6, 4), STONE, { y: 0.06 + i * 0.13, sy: 0.6, ry: i }, { flat: true });
    else if (dom === 'night') {
      k.add(PT.cyl(0.2, 0.2, 0.03, 14), 0x2a2440, { y: 0.24, rx: Math.PI / 2 });
      k.add(PT.ball(0.07, 10, 6), 0xe8e0ff, { y: 0.24, z: 0.03, sz: 0.4 });
      k.add(PT.ball(0.03, 8, 5), 0x1a1020, { y: 0.24, z: 0.06 });
      k.add(PT.box(0.04, 0.12, 0.04), IRON, { y: 0.06 });
    } else if (dom === 'hearth') {
      k.add(PT.cyl(0.16, 0.08, 0.18, 8), IRON, { y: 0.09 });
      k.add(PT.blob(0.1, 0), 0xff8a3a, { y: 0.22, sy: 1.4 });
    } else if (dom === 'road') {
      k.add(PT.cyl(0.02, 0.025, 0.9, 6), WOOD, { x: -0.1, y: 0.42, rz: 0.25 });
      for (const sx of [0.05, 0.16]) k.add(PT.box(0.08, 0.03, 0.2), 0x8a6a44, { x: sx, y: 0.015 });
    } else if (dom === 'war') {
      k.add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12, 1, false, 0, Math.PI * 1.6), c, { y: 0.24, rx: Math.PI / 2 });
      k.add(PT.box(0.04, 0.5, 0.04), 0xb8b8c0, { x: 0.12, y: 0.25, rz: -0.5 });
    } else if (dom === 'harvest') {
      for (let i = 0; i < 7; i++)
        k.add(PT.cyl(0.012, 0.012, 0.5, 4), 0xd8b860, { x: -0.06 + i * 0.02, y: 0.25, rz: -0.12 + i * 0.04 });
      k.add(PT.cyl(0.06, 0.06, 0.05, 8), 0xa8843a, { y: 0.2 });
    } else {
      k.add(PT.cyl(0.18, 0.18, 0.03, 14), c, { y: 0.26, rx: Math.PI / 2 });
      k.add(PT.ball(0.08, 10, 6), 0xf0ecdc, { y: 0.26, z: 0.03, sz: 0.4 });
      k.add(PT.ball(0.04, 8, 5), 0x3a6a8a, { y: 0.26, z: 0.06 });
      k.add(PT.box(0.04, 0.12, 0.04), c, { y: 0.06 });
    }
  },
  shards(k, c) {
    for (let i = 0; i < 4; i++)
      k.add(new THREE.SphereGeometry(0.07, 6, 3, i, 1.2, 0.8, 0.9), c, {
        x: -0.08 + i * 0.05,
        y: 0.01,
        z: (i % 2) * 0.06,
        rx: 1.4 + i * 0.3,
        ry: i,
      });
  },
  candlestick(k, c) {
    k.add(PT.cyl(0.06, 0.07, 0.02, 10), c, { y: 0.01 });
    k.add(PT.cyl(0.015, 0.02, 0.2, 8), c, { y: 0.11 });
    k.add(PT.cyl(0.04, 0.025, 0.03, 8), c, { y: 0.22 });
    k.add(PT.cyl(0.02, 0.02, 0.12, 8), 0xefe6cf, { y: 0.29 });
  },
  ladle(k, c) {
    k.add(new THREE.SphereGeometry(0.04, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, { y: 0.04 });
    k.add(PT.cyl(0.008, 0.008, 0.28, 5), c, { x: 0.13, y: 0.04, rz: Math.PI / 2 - 0.15 });
  },
  ledger(k, c) {
    k.add(PT.box(0.3, 0.06, 0.22), c, { y: 0.03 });
    k.add(PT.box(0.29, 0.05, 0.21), 0xe8dcc0, { y: 0.035, x: 0.005 });
  },
  scales(k, c) {
    k.add(PT.cyl(0.05, 0.07, 0.03, 8), c, { y: 0.015 });
    k.add(PT.cyl(0.01, 0.01, 0.3, 6), c, { y: 0.16 });
    k.add(PT.box(0.36, 0.015, 0.015), c, { y: 0.3 });
    for (const sx of [-0.17, 0.17]) k.add(PT.cyl(0.06, 0.05, 0.015, 10), c, { x: sx, y: 0.2 });
  },
  censer(k, c) {
    k.add(PT.ball(0.07, 10, 6), c, { y: 0.07 });
    k.add(PT.cone(0.05, 0.06, 8), c, { y: 0.15 });
    k.add(PT.blob(0.03, 0), 0xc8c0b8, { y: 0.22, sy: 1.5 });
  },
  offering(k, c) {
    k.add(new THREE.SphereGeometry(0.11, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x8a6a4a, { y: 0.09 });
    for (const [x, z, col] of [
      [-0.03, 0, 0xb83a2a],
      [0.04, 0.02, 0xd8b030],
      [0, -0.04, 0x7a9a3a],
    ])
      k.add(PT.ball(0.035, 8, 5), col, { x, y: 0.1, z });
  },
};

/* ---------- a poor, a middling and a rich one ---------- */
const GRADED = {
  bed(k, c, t) {
    if (t.g === 0) {
      // a straw pallet on the floor, a rough blanket
      k.add(PT.box(0.9, 0.16, 1.85), 0xc8b070, { y: 0.08 }, { jitter: 0.05 });
      k.add(PT.box(0.84, 0.05, 1.1), c, { y: 0.18, z: 0.3, rx: 0.03 });
      k.add(PT.box(0.45, 0.08, 0.28), 0xd8ccb0, { y: 0.2, z: -0.7 });
      return true;
    }
    if (t.g === 2) {
      // a four-poster with curtains
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        k.add(PT.box(0.07, 2.1, 0.07), WOOD, { x: sx * 0.48, y: 1.05, z: sz * 0.96 });
      k.add(PT.box(1.04, 0.06, 2.0), WOOD, { y: 2.12 });
      k.add(PT.box(1.0, 0.3, 1.95), WOOD, { y: 0.3 });
      k.add(PT.box(0.92, 0.16, 1.88), CLOTH, { y: 0.52 });
      k.add(PT.box(0.9, 0.07, 1.25), c, { y: 0.62, z: 0.28 });
      for (const sx of [-0.35, 0.35]) k.add(PT.box(0.36, 0.12, 0.3), 0xf0e8dc, { x: sx * 0.6, y: 0.64, z: -0.72 });
      for (const sx of [-1, 1]) k.add(PT.box(0.04, 1.5, 0.5), c, { x: sx * 0.5, y: 1.35, z: -0.68 }); // curtains tied back
      k.add(PT.box(1.04, 0.3, 0.04), c, { y: 1.95, z: 0.98 });
      return true;
    }
    return false;
  },
  table(k, c, t) {
    if (t.g === 0) {
      // a trestle table: boards on two crossed trestles
      for (const sx of [-0.4, 0.4]) {
        k.add(PT.box(0.05, 0.8, 0.05), dk(c, 0.85), { x: sx, y: 0.37, z: -0.15, rx: 0.35 });
        k.add(PT.box(0.05, 0.8, 0.05), dk(c, 0.85), { x: sx, y: 0.37, z: 0.15, rx: -0.35 });
      }
      for (const sz of [-0.24, 0, 0.24]) k.add(PT.box(1.15, 0.04, 0.24), dk(c, 0.95 + Math.abs(sz) * 0.3), { y: 0.76, z: sz });
      return true;
    }
    if (t.g === 2) {
      for (const [sx, sz] of [
        [-0.5, -0.3],
        [0.5, -0.3],
        [-0.5, 0.3],
        [0.5, 0.3],
      ])
        turned(k, dk(c, 0.85), sx, sz, 0.72);
      k.add(PT.box(1.1, 0.08, 0.7), dk(c, 0.9), { y: 0.68 });
      k.add(PT.box(1.2, 0.05, 0.8), c, { y: 0.76 });
      k.add(PT.box(0.5, 0.005, 0.82), 0xe8e0d0, { y: 0.79 }); // a runner of linen
      return true;
    }
    return false;
  },
  chair(k, c, t) {
    if (t.g === 2) {
      // a carved chair with a high back and arms
      legs4(k, c, 0.5, 0.48, 0.44, 0.05);
      k.add(PT.box(0.5, 0.05, 0.48), c, { y: 0.46 });
      k.add(PT.box(0.08, 0.03, 0.44), 0x8a3a3a, { y: 0.49 }); // a cushion's edge
      k.add(PT.box(0.44, 0.03, 0.4), 0x8a3a3a, { y: 0.495 });
      for (const sx of [-0.23, 0.23]) k.add(PT.box(0.05, 1.0, 0.05), c, { x: sx, y: 0.95, z: -0.21 });
      k.add(PT.box(0.5, 0.14, 0.04), c, { y: 1.42, z: -0.21 });
      k.add(PT.box(0.36, 0.5, 0.03), dk(c, 1.15), { y: 0.95, z: -0.21 });
      for (const sx of [-0.25, 0.25]) k.add(PT.box(0.05, 0.05, 0.42), c, { x: sx, y: 0.68 });
      return true;
    }
    if (t.g === 1) {
      // a ladder-back chair
      legs4(k, c, 0.45, 0.45, 0.44, 0.04);
      k.add(PT.box(0.45, 0.04, 0.45), c, { y: 0.45 });
      for (const sx of [-0.2, 0.2]) k.add(PT.box(0.04, 0.6, 0.04), c, { x: sx, y: 0.75, z: -0.2 });
      for (const y of [0.62, 0.78, 0.94]) k.add(PT.box(0.4, 0.06, 0.02), dk(c, 1.1), { y, z: -0.2 });
      return true;
    }
    return false;
  },
  chest(k, c, t) {
    if (t.g === 2) {
      // a painted chest with a domed lid and brass corners
      k.add(PT.box(0.9, 0.42, 0.5), c, { y: 0.24 });
      k.add(new THREE.CylinderGeometry(0.26, 0.26, 0.92, 12, 1, false, 0, Math.PI), dk(c, 1.1), {
        y: 0.45,
        rz: Math.PI / 2,
        sx: 0.5,
      });
      k.add(PT.box(0.6, 0.2, 0.01), 0xd8b860, { y: 0.25, z: 0.255 }); // a painted panel
      for (const sx of [-0.43, 0.43]) k.add(PT.box(0.06, 0.44, 0.52), GOLD, { x: sx, y: 0.24 });
      for (const sx of [-0.3, 0.3]) k.add(PT.box(0.08, 0.05, 0.52), 0x3a2a1a, { x: sx, y: 0.02 });
      return true;
    }
    if (t.g === 0) {
      k.add(PT.box(0.8, 0.4, 0.45), c, { y: 0.2 }, { jitter: 0.04 });
      k.add(PT.box(0.82, 0.06, 0.47), dk(c, 0.9), { y: 0.43 });
      k.add(PT.box(0.12, 0.08, 0.02), 0x5a3a24, { y: 0.36, z: 0.235 }); // a rope hasp
      return true;
    }
    return false;
  },
  lamp(k, c, t) {
    if (t.g === 2) {
      // a branched candelabrum
      k.add(PT.cyl(0.07, 0.09, 0.03, 10), c, { y: 0.015 });
      k.add(PT.cyl(0.015, 0.02, 0.3, 8), c, { y: 0.16 });
      k.add(PT.box(0.3, 0.02, 0.02), c, { y: 0.3 });
      for (const sx of [-0.15, 0, 0.15]) {
        k.add(PT.cyl(0.02, 0.02, 0.1, 6), 0xefe6cf, { x: sx, y: 0.36 + (sx ? 0 : 0.04) });
        k.add(PT.blob(0.018, 0), 0xffd27a, { x: sx, y: 0.43 + (sx ? 0 : 0.04), sy: 1.6 });
      }
      return true;
    }
    if (t.g === 0) {
      // a clay oil lamp
      k.add(PT.ball(0.07, 8, 5), 0xa0603a, { y: 0.035, sy: 0.5, sz: 1.4 });
      k.add(PT.blob(0.02, 0), 0xffd27a, { y: 0.08, z: 0.08, sy: 1.6 });
      return true;
    }
    return false;
  },
};

/* ---------- broken, fallen, dusty: a thing of an abandoned place ---------- */
const BROKEN = {
  bed(k, c) {
    // the frame fallen in at one end, the bedding gone to rags
    k.add(PT.box(0.95, 0.12, 1.95), WOOD, { y: 0.2, rx: 0.15 });
    legs4(k, WOOD, 0.95, 1.95, 0.35, 0.08, true);
    k.add(PT.box(0.7, 0.05, 0.9), 0x8a8070, { y: 0.32, z: 0.3, rx: 0.12, ry: 0.3 }, { jitter: 0.1 });
    k.add(PT.box(0.95, 0.6, 0.08), WOOD, { y: 0.3, z: -0.96, rx: -0.3 });
  },
  table(k, c) {
    legs4(k, dk(c, 0.85), 1.15, 0.75, 0.74, 0.07, true);
    k.add(PT.box(1.15, 0.05, 0.75), c, { y: 0.62, rx: 0.22, rz: 0.12 });
  },
  chair(k, c) {
    // on its side
    k.add(PT.box(0.45, 0.04, 0.45), c, { x: -0.1, y: 0.23, rz: Math.PI / 2 });
    k.add(PT.box(0.45, 0.5, 0.04), c, { x: 0.15, y: 0.03, z: -0.2, rz: Math.PI / 2 });
    for (const sz of [-0.18, 0.18]) k.add(PT.box(0.42, 0.05, 0.05), c, { x: 0.12, y: 0.4, z: sz });
  },
  stool(k, c) {
    k.add(PT.cyl(0.17, 0.17, 0.05, 10), c, { y: 0.17, rx: Math.PI / 2 });
    k.add(PT.cyl(0.025, 0.03, 0.43, 5), c, { x: 0.15, y: 0.025, rz: Math.PI / 2 });
  },
  bench(k, c) {
    // broken in the middle
    k.add(PT.box(0.7, 0.05, 0.35), c, { x: -0.36, y: 0.24, rz: -0.55 });
    k.add(PT.box(0.7, 0.05, 0.35), c, { x: 0.36, y: 0.24, rz: 0.55 });
    for (const sx of [-0.55, 0.55]) k.add(PT.box(0.06, 0.42, 0.3), dk(c, 0.85), { x: sx, y: 0.21 });
  },
  shelf(k, c) {
    // leaning, a board gone
    k.add(PT.box(0.04, 1.6, 0.34), c, { x: -0.53, y: 0.8 });
    k.add(PT.box(0.04, 1.3, 0.34), c, { x: 0.53, y: 0.65 });
    for (const [y, rz] of [
      [0.05, 0],
      [0.9, 0.25],
    ])
      k.add(PT.box(1.1, 0.04, 0.34), c, { y, rz });
    k.add(PT.box(1.0, 0.04, 0.3), c, { x: 0.25, y: 0.06, z: 0.3, ry: 0.5 });
  },
  chest(k, c) {
    k.add(PT.box(0.9, 0.45, 0.5), c, { y: 0.225 });
    k.add(PT.box(0.94, 0.14, 0.54), dk(c, 1.1), { y: 0.65, z: -0.32, rx: -1.2 }); // its lid flung back
    k.add(PT.box(0.84, 0.05, 0.44), 0x2a2420, { y: 0.44 });
  },
  cupboard(k, c) {
    k.add(PT.box(1, 1.7, 0.5), c, { y: 0.85 });
    k.add(PT.box(0.9, 1.5, 0.02), 0x2a2420, { y: 0.85, z: 0.25 });
    k.add(PT.box(0.47, 1.4, 0.03), dk(c, 1.15), { x: 0.4, y: 0.7, z: 0.55, ry: 1.2 }); // a door hanging off
  },
  pew(k, c) {
    k.add(PT.box(1.2, 0.05, 0.38), c, { y: 0.25, rz: 0.35 });
    k.add(PT.box(0.06, 0.95, 0.42), dk(c, 0.9), { x: -0.55, y: 0.47 });
    k.add(PT.box(1.2, 0.45, 0.04), c, { y: 0.2, z: -0.3, rx: -1.3 });
  },
  altar(k, c) {
    k.add(PT.box(1.4, 0.9, 0.7), c, { y: 0.45 }, { uv: 0.6 });
    k.add(PT.box(0.8, 0.1, 0.8), dk(c, 1.05), { x: -0.3, y: 0.95 });
    k.add(PT.box(0.7, 0.1, 0.5), dk(c, 1.05), { x: 0.6, y: 0.15, rz: 0.3 }); // the top cracked and fallen
  },
};

// Draw thing t's model into kit k with colour c, if this module has one for it; true if it did.
function variant(id, k, c, t) {
  if (t.old && BROKEN[id] && t.fixed) return BROKEN[id](k, c), true;
  if (NEW[id]) return NEW[id](k, c, t), true;
  if (GRADED[id] && t.g !== undefined) return GRADED[id](k, c, t) === true;
  return false;
}
export { variant, NEW as FURNITURE_MODELS };
