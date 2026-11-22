/* Ruins with character (commission 5). A ruin is built the way its people built, then aged and marked by how they
   ended, so the five traits of a lost people (rules/civ.js, content/peoples.js) can be read from a distance:
   - style: what they built with. River-valley builders lay big mud bricks and step their walls up; steppe riders pile
     rough boulders low; highland monastics taper white walls and string flags; sea traders raise columns of drums
     under a lintel; forest clans set dark stone with timber beams.
   - habit: what they built (a cistern, a tower, a tomb, a granary, a road's gateway): the plan of the ruin.
   - age: how much stands. Recent ruins keep their full height and their roofs; long-fallen ones stand to the eaves
     with ragged tops; ancient ones are stumps, a course or two, the rest fallen round about. Moss comes with age.
   - doom: plague leaves pale poles with rags; fire leaves the stone black, soot heaviest at the top; famine leaves
     empty jars at the doors; war a ring of sharpened stakes; a quiet end leaves doors standing open.
   - affinity: their sign, carved on a stele by the door in their colour.
   Walls are laid course by course as blocks, so decay can take blocks away and leave a jagged top. One ruin is four
   or five meshes: stone, wood, cloth, and the dark of doorways. */
import { R } from './ctx.js';
import { P, kit, kitMat } from './kit.js';
import { addOutline } from './outline.js';
import { toonOn } from './toon.js';
// fieldstones: rounded and softly banded with the toon bands on (C6), cut-faced otherwise
const ROUND = () => (toonOn() ? 1 : 0);
import { surface } from './paint.js';
import { LOOK_SWITCHES, lookOn } from './quality.js';

LOOK_SWITCHES.push(['ruins', 'Ruins with character']);
const ruinsOn = () => lookOn('ruins') && lookOn('light');

function dice(seed) {
  let a = seed | 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return r;
}
const STYLE = {
  river: { tex: 'brick', block: [1.4, 0.55], round: 0, steps: true },
  steppe: { tex: 'plaster', block: [1.3, 0.8], rough: true },
  highland: { tex: 'plaster', block: [1.1, 0.5], taper: true, flags: true },
  sea: { tex: 'stone', block: [1.2, 0.5], columns: true },
  forest: { tex: 'stone', block: [1, 0.5], beams: true, moss: 0.25 },
};
// how much of a ruin stands, by age: the share of its height left, and the chance a block is gone
const AGE = {
  recent: { stand: 1, gone: 0.04, roof: true, moss: 0 },
  old: { stand: 0.85, gone: 0.16, roof: false, moss: 0.25 },
  ancient: { stand: 0.32, gone: 0.3, roof: false, moss: 0.55 },
};

const C = (h) => new THREE.Color(h);
/* Lay a wall from (x0, z0) to (x1, z1), h high and t thick, as courses of blocks. Each column of blocks stands to its
   own height (a ragged top as a ruin ages); blocks are lost at random; what falls lies about the foot. */
function wall(Z, x0, z0, x1, z1, h, t, o) {
  const len = Math.hypot(x1 - x0, z1 - z0),
    ry = -Math.atan2(z1 - z0, x1 - x0),
    [bw, bh] = Z.st.block,
    cols = Math.max(1, Math.round(len / bw)),
    rows = Math.max(1, Math.round(h / bh)),
    r = Z.r;
  for (let c = 0; c < cols; c++) {
    const f = (c + 0.5) / cols,
      x = x0 + (x1 - x0) * f,
      z = z0 + (z1 - z0) * f;
    if (o && o.gap && Math.abs(f - 0.5) * len < o.gap / 2) {
      // a doorway: dark inside, a lintel over it while the wall stands high enough
      const top = Math.round(rows * Z.age.stand * (0.9 + r() * 0.2));
      if (top * bh > 2.6)
        Z.stone.add(P.box(o.gap + 0.8, bh, t * 1.05), Z.colAt(2.6, r), { x, y: 2.6 + bh / 2, z, ry }, { uv: 1.5 });
      continue;
    }
    // this column's height: full when young, ragged and shorter with age, never below one course
    let top = rows * (Z.age.stand + (r() - 0.5) * (1 - Z.age.stand) * 1.2);
    top = Math.max(1, Math.min(rows, Math.round(top)));
    for (let k = 0; k < top; k++) {
      if (k > 0 && r() < Z.age.gone * (0.3 + k / rows)) {
        // a block is gone: what stood on it has mostly come down too, and lies about the foot
        if (r() < 0.5) Z.fallen(x, z, ry);
        if (r() < 0.8) break;
        continue;
      }
      const taper = Z.st.taper ? 1 - (k / rows) * 0.25 : 1,
        y = k * bh + bh / 2,
        w = (len / cols) * (0.94 + r() * 0.06);
      if (Z.st.rough)
        Z.stone.add(
          P.blob(bh * 0.75, ROUND()),
          Z.colAt(y, r),
          { x, y, z, ry: r() * 6, sx: (w / bh) * 0.7, sz: t * 0.8 },
          { flat: !ROUND(), uv: 1.5 },
        );
      else Z.stone.add(P.box(w, bh * 0.97, t * taper), Z.colAt(y, r), { x, y, z, ry: ry + (r() - 0.5) * 0.05 }, { uv: 1.5 });
    }
  }
}

function ruinGroup(S, seed) {
  const civ = S.civ,
    style = R.trait(S, 'style'),
    st = STYLE[civ.style] || STYLE.river,
    age = AGE[civ.age] || AGE.old,
    doom = civ.doom,
    affinity = R.trait(S, 'affinity'),
    r = dice(seed),
    Z = { st, age, r, stone: kit(), wood: kit(), cloth: kit(), dark: kit() },
    base = C(style.stone),
    moss = C(0x5a7a3a),
    soot = C(0x1e1a18),
    tmp = C(0);
  const mossy = Math.min(0.8, age.moss + (st.moss || 0));
  // a block's colour: the people's stone, varied, greener near the ground with age, blackened toward the top by fire
  Z.colAt = (y, rr) => {
    tmp.copy(base).multiplyScalar(0.85 + rr() * 0.25);
    if (mossy && rr() < mossy * (1.2 - Math.min(1, y / 4))) tmp.lerp(moss, 0.35 + rr() * 0.3);
    if (doom === 'fire') tmp.lerp(soot, Math.min(0.9, 0.45 + y * 0.08));
    if (doom === 'plague') tmp.lerp(C(0xe6e6d6), 0.25);
    return tmp.getHex();
  };
  Z.fallen = (x, z, ry) => {
    const d = 1 + r() * 2.5,
      a = r() * 6.28,
      [bw, bh] = st.block;
    Z.stone.add(
      P.box(bw * 0.9, bh, bh * 1.2),
      Z.colAt(0, r),
      { x: x + Math.cos(a) * d, y: bh * 0.4, z: z + Math.sin(a) * d, ry: ry + r(), rx: (r() - 0.5) * 0.4, rz: (r() - 0.5) * 0.4 },
      { uv: 1.5 },
    );
  };
  const H = 5.5 * (civ.age === 'recent' ? 1.15 : 1),
    T = 0.9,
    doors = [];
  // the plan, by habit
  const box4 = (w, d, h, door) => {
    wall(Z, -w / 2, d / 2, w / 2, d / 2, h, T, door ? { gap: 1.8 } : null);
    wall(Z, w / 2, -d / 2, -w / 2, -d / 2, h, T);
    wall(Z, -w / 2, -d / 2, -w / 2, d / 2, h, T);
    wall(Z, w / 2, d / 2, w / 2, -d / 2, h, T);
    if (door) doors.push([0, d / 2]);
  };
  if (civ.habit === 'tower') {
    const rad = 3.2,
      n = 12,
      h = 15 * age.stand + 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2,
        a1 = ((i + 1) / n) * Math.PI * 2;
      wall(
        Z,
        Math.cos(a0) * rad,
        Math.sin(a0) * rad,
        Math.cos(a1) * rad,
        Math.sin(a1) * rad,
        h,
        1,
        i === 3 ? { gap: 1.6 } : null,
      );
    }
    doors.push([Math.cos((3.5 / 12) * Math.PI * 2) * rad, Math.sin((3.5 / 12) * Math.PI * 2) * rad]);
    if (age.roof) Z.stone.add(P.cone(4.2, 4, 12), Z.colAt(h, r), { y: h + 2 }, { flat: true, uv: 2 });
  } else if (civ.habit === 'cistern') {
    box4(10, 9, 2.6, false);
    for (let i = 0; i < 3; i++)
      Z.stone.add(P.box(2.4, 0.35, 0.8), Z.colAt(0, r), { y: 0.2 + i * 0.4, z: 5.2 - i * 0.6 }, { uv: 1.5 });
    Z.dark.add(P.box(7.6, 0.1, 6.6), 0x24343e, { y: 0.15 }); // the water, dark and still
    doors.push([0, 4.6]);
  } else if (civ.habit === 'tomb') {
    box4(10, 7, 2.6, true);
    if (age.stand > 0.5) Z.stone.add(P.box(11.4, 0.7, 8.4), Z.colAt(3, r), { y: 2.9 }, { uv: 2 });
    for (const sx of [-2.4, 2.4]) {
      const n = Math.max(1, Math.round((4.4 * age.stand + 1) / st.block[1]));
      for (let k = 0; k < n; k++)
        Z.stone.add(
          P.box(0.9, st.block[1] * 0.97, 0.9),
          Z.colAt(k, r),
          { x: sx, y: (k + 0.5) * st.block[1], z: 4.4, ry: (r() - 0.5) * 0.1 },
          { uv: 1.5 },
        );
    }
  } else if (civ.habit === 'granary') {
    box4(6.5, 13, H, true);
    if (age.roof) {
      const h = 3.2,
        half = 3.6,
        a = Math.atan2(h, half),
        sl = Math.hypot(half, h);
      for (const sg of [-1, 1])
        Z.wood.add(P.box(sl, 0.3, 13.6), 0x6a5040, { x: (sg * half) / 2, y: H + h / 2, rz: -sg * a }, { uv: 2 });
    }
    // the roof's bare beams
    else
      for (let i = 0; i < 4; i++)
        Z.wood.add(P.box(7.2, 0.3, 0.3), 0x3a2a20, { y: H * age.stand - 0.2, z: -5 + i * 3.3, rz: (r() - 0.5) * 0.3 }, { uv: 1 });
  } else {
    // a road's gateway: two piers and a lintel, and paving running through
    const h = 6.5 * Math.max(0.45, age.stand);
    wall(Z, -3.6, 0, -2.4, 0, h, 1.6);
    wall(Z, 2.4, 0, 3.6, 0, h, 1.6);
    if (age.stand > 0.6) Z.stone.add(P.box(8.4, 1.2, 1.8), Z.colAt(h, r), { y: h + 0.6 }, { uv: 2 });
    for (let i = 0; i < 9; i++)
      if (r() > age.gone * 2)
        Z.stone.add(P.box(3.6, 0.2, 1.2), Z.colAt(0, r), { y: 0.08, z: -5.6 + i * 1.4, ry: (r() - 0.5) * 0.1 }, { uv: 2 });
    doors.push([0, 0.8]);
  }
  // the style's own marks
  if (st.columns)
    for (const [x, z] of [
      [-4.2, 6.2],
      [-1.4, 6.6],
      [1.4, 6.6],
      [4.2, 6.2],
    ]) {
      const drums = Math.max(1, Math.round(6 * age.stand * (0.6 + r() * 0.5)));
      for (let k = 0; k < drums; k++)
        Z.stone.add(P.cyl(0.42, 0.45, 0.9, 10), Z.colAt(k, r), { x, y: 0.45 + k * 0.9, z }, { uv: 1.5 });
      if (drums >= 5) Z.stone.add(P.box(1.2, 0.35, 1.2), Z.colAt(5, r), { x, y: drums * 0.9 + 0.17, z }, { uv: 1.5 });
      else
        Z.stone.add(
          P.cyl(0.42, 0.42, 0.9, 10),
          Z.colAt(0, r),
          { x: x + 1.4, y: 0.42, z: z + 0.6, rz: Math.PI / 2, ry: r() * 3 },
          { uv: 1.5 },
        );
    }
  if (st.steps && age.stand > 0.5)
    for (let i = 0; i < 3; i++)
      Z.stone.add(P.box(3.4 - i * 0.9, 0.5, 1.2), Z.colAt(0, r), { y: 0.25 + i * 0.5, z: 5.8 - i * 0.3, x: -3.6 }, { uv: 1.5 });
  if (st.beams && age.stand > 0.5 && civ.habit !== 'cistern' && civ.habit !== 'road')
    for (let i = 0; i < 3; i++)
      Z.wood.add(
        P.box(0.3, 0.3, 5 + r() * 3),
        0x3e3024,
        { x: -2 + i * 2, y: H * age.stand * 0.9, z: 0, rx: (r() - 0.5) * 0.4 },
        { uv: 1 },
      );
  if (st.flags && age.stand > 0.3) {
    Z.wood.add(P.box(0.08, 0.08, 9), 0x8a8070, { x: 0, y: H * age.stand + 0.4, z: 0, ry: 0.6 });
    for (let i = 0; i < 7; i++)
      if (r() > 0.25)
        Z.cloth.add(P.box(0.5, 0.6, 0.02), ['#c04a3a', '#e0c050', '#3a6aa0', '#f0ece0', '#4a8a4a'][i % 5], {
          x: Math.sin(0.6) * (-3.6 + i * 1.2),
          y: H * age.stand + 0.05,
          z: Math.cos(0.6) * (-3.6 + i * 1.2),
          ry: 0.6 + Math.PI / 2,
        });
  }
  // the sign of their end
  if (doom === 'plague')
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28 + 0.4;
      Z.wood.add(P.cyl(0.1, 0.12, 6.5, 5), 0xf0f0e6, { x: Math.cos(a) * 9, y: 3.2, z: Math.sin(a) * 9, rz: (r() - 0.5) * 0.15 });
      Z.cloth.add(P.box(0.7, 1.2, 0.02), 0xd8d4b8, { x: Math.cos(a) * 9 + 0.4, y: 5.6, z: Math.sin(a) * 9, ry: a });
    }
  if (doom === 'war')
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.28;
      Z.wood.add(
        P.cone(0.2, 2.8, 5),
        0x4a3a2a,
        { x: Math.cos(a) * 9, y: 1.1, z: Math.sin(a) * 9, rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 },
        { flat: true },
      );
    }
  if (doom === 'famine')
    for (const [dx, dz] of doors)
      for (let i = 0; i < 4; i++) {
        const jx = dx - 1.4 + i * 0.9 + (i > 1 ? 0.8 : 0),
          jz = dz + 1.2 + r() * 0.4,
          tip = r() < 0.4;
        Z.stone.add(
          P.cyl(0.25, 0.38, 0.9, 8),
          0xa8623a,
          { x: jx, y: tip ? 0.3 : 0.45, z: jz, rz: tip ? Math.PI / 2 : 0, ry: r() * 3 },
          { uv: 1 },
        );
        Z.dark.add(P.cyl(0.2, 0.2, 0.05, 8), 0x1a1210, { x: jx, y: tip ? 0.3 : 0.91, z: jz, rz: tip ? Math.PI / 2 : 0 });
      }
  if (doom === 'quiet')
    for (const [dx, dz] of doors)
      Z.wood.add(P.box(1.6, 2.4, 0.12), 0x5a4030, { x: dx + 1.4, y: 1.25, z: dz + 0.7, ry: -1.2 }, { uv: 1 });
  // their sign on a stele by the door, in their colour
  {
    const [dx, dz] = doors[0] || [0, 5],
      x = dx + 3,
      z = dz + 1.6;
    Z.stone.add(P.box(1.1, 2.6, 0.45), Z.colAt(1, r), { x, y: 1.3, z }, { uv: 1.5 });
    Z.cloth.add(P.blob(0.36, 0), affinity.color, { x, y: 1.9, z: z + 0.25, sz: 0.3 }, { flat: true });
    Z.cloth.add(P.box(0.7, 0.12, 0.05), affinity.color, { x, y: 1.25, z: z + 0.24 });
  }
  const dh = Math.min(2.4, H * age.stand - 0.4);
  if (dh > 1 && civ.habit !== 'cistern')
    for (const [dx, dz] of doors) Z.dark.add(P.box(1.7, dh, 0.3), 0x0b0c0e, { x: dx, y: dh / 2, z: dz - 0.2 });
  const g = new THREE.Group(),
    add = (k, mat, line) => {
      if (k.empty) return;
      const m = new THREE.Mesh(k.build(), mat);
      g.add(m);
      if (line) addOutline(m, 2, 90); // outlined (C6)
    };
  add(Z.stone, kitMat({ map: surface(st.tex, seed >>> 3) }), true); // each ruin's stone a variant of its people's
  add(Z.wood, kitMat({ map: surface('wood') }), true);
  add(Z.cloth, kitMat({ side: THREE.DoubleSide }));
  add(Z.dark, new THREE.MeshBasicMaterial({ vertexColors: true }));
  g.scale.y = 1; // height already follows age
  return g;
}
export { ruinGroup, ruinsOn };
