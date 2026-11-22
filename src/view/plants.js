/* Trees and plants (commission 5): a shape for each kind of woodland, built with the kit (kit.js) and drawn instanced,
   one draw call for each kind in view. Each comes in two levels of detail: near (the player's region and a little
   round it, on Medium and High) and far (everywhere else, and everywhere on Low), which costs about what the old cone
   did. Crowns are darker underneath and sway a little in the wind.

   The shape comes from the woodland's `tree.shape` in content if it has one, else from its name, so generated biomes
   (which reuse the named woodlands) need nothing new. A new shape is a function in SHAPES. */
import { wisp } from './toon.js';
import { P, kit, kitMat, swayPatch, swaying } from './kit.js';
import { addOutline, outlineMat, outlineOn } from './outline.js';
import { LOOK_SWITCHES, lookOn } from './quality.js';

LOOK_SWITCHES.push(['plants', 'Trees with shapes']);

const BARK = 0x5b4532,
  PALE_BARK = 0xe6e1d4,
  under = (y) => 0.62 + 0.38 * y; // a crown is darker underneath

/* Each shape is built at its usual proportions, `aspect` tall for 1 wide (radius), then squashed to unit height, so
   that the instance's scale (width, height, width) from the rules' numbers gives it back its proportions. */
const SHAPES = {
  conifer: {
    aspect: 4.5,
    make(k, leaf, far) {
      if (far) return k.add(P.cone(1, 4.5, 6), leaf, { y: 2.25 }, { shade: under });
      k.add(P.cyl(0.12, 0.2, 1.2, 5), BARK, { y: 0.6 });
      [
        [1, 1.9, 0.7],
        [0.78, 1.7, 1.9],
        [0.52, 1.5, 3.0],
      ].forEach(([r, h, y], i) => k.add(P.cone(r, h, 7), leaf, { y: y + h / 2, ry: i }, { shade: under }));
    },
  },
  birch: {
    aspect: 4.6,
    make(k, leaf, far) {
      k.add(P.cyl(0.07, 0.12, 3.2, far ? 4 : 6), PALE_BARK, { y: 1.6 });
      if (far) return k.add(new THREE.OctahedronGeometry(1, 0), leaf, { y: 3.3, sy: 1.5 }, { shade: under });
      [
        [0.75, 0, 2.9, 0],
        [0.6, 0.35, 3.7, 0.2],
        [0.55, -0.3, 3.5, -0.25],
        [0.45, 0.05, 4.2, 0.1],
      ].forEach(([r, x, y, z]) => k.add(P.blob(r), leaf, { x, y, z, sy: 1.25 }, { shade: under, jitter: 0.12 }));
    },
  },
  broad: {
    aspect: 2.6,
    make(k, leaf, far) {
      k.add(P.cyl(0.12, 0.2, 1.4, far ? 4 : 6), BARK, { y: 0.7 });
      if (far) return k.add(new THREE.OctahedronGeometry(1, 0), leaf, { y: 1.9, sy: 0.8 }, { shade: under });
      [
        [0.75, 0, 1.6, 0],
        [0.6, 0.45, 1.9, 0.2],
        [0.6, -0.4, 1.85, -0.25],
        [0.55, 0, 2.2, 0.1],
      ].forEach(([r, x, y, z]) => k.add(P.blob(r), leaf, { x, y, z }, { shade: under, jitter: 0.12 }));
    },
  },
  thorn: {
    aspect: 1.8,
    make(k, leaf, far) {
      if (far) return k.add(new THREE.OctahedronGeometry(1, 0), leaf, { y: 0.7, sy: 0.7 }, { shade: under });
      [
        [0.6, 0, 0.6, 0],
        [0.45, 0.45, 0.45, 0.2],
        [0.45, -0.4, 0.5, -0.3],
      ].forEach(([r, x, y, z]) => k.add(P.blob(r), leaf, { x, y, z, sy: 0.8 }, { shade: under, flat: true }));
      for (let i = 0; i < 4; i++) k.add(P.cyl(0.02, 0.04, 1.4, 3), BARK, { y: 0.8, ry: i * 1.6, rz: 0.5 + (i % 2) * 0.3 });
    },
  },
  dead: {
    aspect: 7,
    make(k, leaf, far) {
      k.add(P.cyl(0.06, 0.16, 7, far ? 4 : 5), leaf, { y: 3.5 });
      const n = far ? 2 : 5;
      for (let i = 0; i < n; i++) {
        const a = i * 2.3,
          h = 2.6 + i * 0.8;
        k.add(P.cyl(0.02, 0.06, 2.2, 3), leaf, { x: Math.cos(a) * 0.5, y: h + 0.5, z: Math.sin(a) * 0.5, ry: -a, rz: 0.9 });
      }
    },
  },
  fern: {
    aspect: 1.4,
    make(k, leaf, far) {
      const n = far ? 3 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        // a frond: a long flat blade leaning out, arching (two pieces)
        k.add(
          P.cone(0.22, 1.1, 3),
          leaf,
          { x: Math.cos(a) * 0.25, y: 0.55, z: Math.sin(a) * 0.25, ry: -a, rz: -0.55, sz: 0.3 },
          { shade: under },
        );
        if (!far)
          k.add(
            P.cone(0.16, 0.7, 3),
            leaf,
            { x: Math.cos(a) * 0.75, y: 1.05, z: Math.sin(a) * 0.75, ry: -a, rz: -1.2, sz: 0.3 },
            { shade: under },
          );
      }
    },
  },
  grass: {
    aspect: 1,
    make(k, leaf, far) {
      const n = far ? 4 : 9;
      for (let i = 0; i < n; i++) {
        const a = i * 2.4,
          d = 0.15 + (i % 3) * 0.25;
        k.add(
          P.cone(0.06, 1, 3),
          leaf,
          { x: Math.cos(a) * d, y: 0.5, z: Math.sin(a) * d, rx: Math.sin(a) * 0.25, rz: -Math.cos(a) * 0.25 },
          { shade: (y) => 0.75 + 0.45 * y },
        );
      }
    },
  },
};
const BY_NAME = [
  [/pine|fir|spruce|conifer|taiga/, 'conifer'],
  [/birch|aspen/, 'birch'],
  [/thorn|scrub|bush|brush/, 'thorn'],
  [/dead|bare|burnt|ash/, 'dead'],
  [/fern|bracken/, 'fern'],
  [/grass|reed|rush/, 'grass'],
];
function shapeOf(forest) {
  if (forest.tree.shape && SHAPES[forest.tree.shape]) return forest.tree.shape;
  const n = (forest.name || '').toLowerCase();
  for (const [re, s] of BY_NAME) if (re.test(n)) return s;
  return 'broad';
}
// The model of a woodland's tree, near or far, cached by shape, colour and detail (a few in view at a time).
const CACHE = {};
function treeModel(forest, far) {
  const shape = shapeOf(forest),
    key = shape + forest.tree.color + (far ? 'f' : 'n');
  if (CACHE[key]) return CACHE[key];
  const s = SHAPES[shape],
    k = kit();
  s.make(k, forest.tree.color, far);
  const g = k.build();
  g.scale(1, 1 / s.aspect, 1);
  if (shape === 'grass' || shape === 'fern') {
    // thin blades and fronds are lit as if they faced the sky, so they do not turn black edge-on to the light
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) {
      const x = n.getX(i) * 0.35,
        z = n.getZ(i) * 0.35,
        l = Math.hypot(x, 0.94, z);
      n.setXYZ(i, x / l, 0.94 / l, z / l);
    }
  }
  g.computeBoundingSphere();
  g.dispose = () => {}; // kept for the next build
  g.kept = true;
  return (CACHE[key] = g);
}
// The material for trees: vertex colours, and a sway in the wind for the tall ones.
const MATS = {};
function treeMat(forest) {
  const shape = shapeOf(forest),
    amt = { conifer: 0.025, birch: 0.04, broad: 0.03, dead: 0.015, thorn: 0.02, fern: 0.06, grass: 0.12 }[shape] || 0.03;
  if (MATS[shape]) return MATS[shape];
  const m = swaying(kitMat(), amt);
  if (['grass', 'fern', 'thorn', 'dead'].includes(shape)) wisp(m); // no ink on blades and twigs (toon.js)
  m.dispose = () => {};
  return (MATS[shape] = m);
}
const plantsOn = () => lookOn('plants') && lookOn('light');
/* Near and far. The trees that could ever come within `radius` of the player (the region and a band round it) are
   kept in a list; two instanced meshes draw them, one with the near shape and one with the far, and every time the
   player has walked a little way the list is sorted again into the two (updateLOD). That is one copy of some
   thousands of matrices, under a millisecond, every 25 m or so. */
function makeLOD(group, forest, list, tint) {
  const n = list.length / 16;
  if (!n) return null;
  const mk = (geo) => {
    const m = new THREE.InstancedMesh(geo, treeMat(forest), n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    group.add(m);
    return m;
  };
  const near = mk(treeModel(forest, false));
  near.userData.near = true; // casts a shadow on High (scene.js)
  // outlined on High (C6): the trees about you, the line swaying with them
  const sway = near.material.userData.sway || 0;
  if (outlineOn(3))
    addOutline(
      near,
      3,
      45,
      outlineMat(45, (sh) => swayPatch(sh, sway), 'sway' + sway),
    );
  return {
    list: new Float32Array(list),
    tint: new Float32Array(tint),
    n,
    near,
    far: mk(treeModel(forest, true)),
    at: null,
  };
}
function updateLOD(rec, x, z, radius, force) {
  if (!force && rec.at && Math.abs(rec.at.x - x) + Math.abs(rec.at.z - z) < 25) return;
  rec.at = { x, z };
  const r2 = radius * radius,
    L = rec.list,
    T = rec.tint,
    nm = rec.near.instanceMatrix.array,
    fm = rec.far.instanceMatrix.array,
    nc = rec.near.instanceColor.array,
    fc = rec.far.instanceColor.array;
  let a = 0,
    b = 0;
  for (let i = 0; i < rec.n; i++) {
    const dx = L[i * 16 + 12] - x,
      dz = L[i * 16 + 14] - z;
    if (dx * dx + dz * dz < r2) {
      nm.set(L.subarray(i * 16, i * 16 + 16), a * 16);
      nc.set(T.subarray(i * 3, i * 3 + 3), a * 3);
      a++;
    } else {
      fm.set(L.subarray(i * 16, i * 16 + 16), b * 16);
      fc.set(T.subarray(i * 3, i * 3 + 3), b * 3);
      b++;
    }
  }
  rec.near.count = a;
  rec.far.count = b;
  rec.near.instanceMatrix.needsUpdate = rec.far.instanceMatrix.needsUpdate = true;
  rec.near.instanceColor.needsUpdate = rec.far.instanceColor.needsUpdate = true;
}
export { treeModel, treeMat, shapeOf, plantsOn, SHAPES, makeLOD, updateLOD };
