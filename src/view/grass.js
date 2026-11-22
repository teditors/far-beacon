/* Grass and wildflowers round the traveller (C5.18): tufts of blades, and here and there a flower, scattered over the
   ground within a few dozen metres and swaying in the wind; beyond that the ground's painted grain carries on. They
   are placed from where each patch is in the world (so they never move as you walk), re-scattered round you every few
   metres you walk, and drawn instanced: two draw calls in all. How much grows is the land's own: lush in temperate
   and wet lands and on flower meadows, sparse and straw-coloured in hot ones, none on snow, water, roads, bare rock,
   high mountains or in towns.
   Quality: none on Low; a ring of `Q.grass` metres on Medium and High (High denser). Switch: `grass`. */
import { wisp } from './toon.js';
import { R, mulberry } from './ctx.js';
import { Q, LOOK_SWITCHES, lookOn } from './quality.js';
import { swaying } from './kit.js';

LOOK_SWITCHES.push(['grass', 'Grass and flowers underfoot']);
const grassOn = () => lookOn('grass') && lookOn('light') && Q.grass > 0;

// a tuft: seven single-triangle blades leaning out, dark at the foot, light at the tip (made once)
let TUFT = null,
  BLOOM = null;
function tuftGeo() {
  if (TUFT) return TUFT;
  const pos = [],
    col = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + i * 0.7,
      w = 0.025,
      lean = 0.12 + (i % 3) * 0.06,
      cx = Math.cos(a),
      cz = Math.sin(a),
      px = -cz * w,
      pz = cx * w,
      h = 0.32 + (i % 3) * 0.1;
    pos.push(-px + cx * 0.05, 0, -pz + cz * 0.05, px + cx * 0.05, 0, pz + cz * 0.05, cx * lean, h, cz * lean);
    col.push(0.6, 0.6, 0.55, 0.6, 0.6, 0.55, 1.25, 1.25, 1.1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // blades are lit as if facing up, so both sides of a blade look alike
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.3, 0.95, n.getZ(i) * 0.3);
  g.dispose = () => {};
  return (TUFT = g);
}
// a flower: a stalk and a little star of petals
function bloomGeo() {
  if (BLOOM) return BLOOM;
  const pos = [],
    col = [],
    h = 0.45;
  pos.push(-0.01, 0, 0, 0.01, 0, 0, 0, h, 0);
  col.push(0.35, 0.55, 0.3, 0.35, 0.55, 0.3, 0.35, 0.55, 0.3);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2,
      b = a + 0.5;
    pos.push(0, h + 0.02, 0, Math.cos(a) * 0.09, h, Math.sin(a) * 0.09, Math.cos(b) * 0.09, h, Math.sin(b) * 0.09);
    col.push(1.2, 1.15, 0.6, 1, 1, 1, 1, 1, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.dispose = () => {};
  return (BLOOM = g);
}
const SUNLIT = new THREE.Color(0xc8d070); // grass catches the light a little yellower than the ground
const FLOWERS = [0xe8d040, 0xd04a5a, 0xf2f0f0, 0x8a6ad0, 0xe08a3a];
// how much grows on a biome, and its colour: from its climate
function growthOf(b, lush) {
  const cl = (b.parts && b.parts.climate) || { salt: 'hot', moor: 'wet', taiga: 'cold' }[b.id] || 'temperate';
  return (
    {
      temperate: { n: 1, flowers: 0.12, col: lush },
      wet: { n: 1.1, flowers: 0.08, col: lush },
      steppe: { n: 0.8, flowers: 0.05, col: new THREE.Color(0xb0a660) },
      hot: { n: 0.25, flowers: 0.01, col: new THREE.Color(0xa89a60) },
      ashen: { n: 0.2, flowers: 0, col: new THREE.Color(0x5a5a40) },
      cold: { n: 0.05, flowers: 0, col: new THREE.Color(0x6a7a5a) },
    }[cl] || { n: 0.6, flowers: 0.05, col: lush }
  );
}
/* The grass of one land (built with it in scene.js). T: the land (terrain.js); lush: each biome's lush colour; towns:
   [{ x, z }] and townHalf, where nothing grows. Returns { tufts, blooms, update(x, z) } with the meshes added to group. */
function makeGrass(group, T, lush, towns, townHalf, seed) {
  if (!grassOn()) return null;
  const max = Q.grassMax,
    tufts = new THREE.InstancedMesh(
      tuftGeo(),
      wisp(swaying(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.18)),
      max,
    ),
    blooms = new THREE.InstancedMesh(
      bloomGeo(),
      wisp(swaying(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.3)),
      Math.ceil(max / 6),
    );
  tufts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  blooms.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.ceil(max / 6) * 3), 3);
  for (const m of [tufts, blooms]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    m.userData.grass = true;
    group.add(m);
  }
  const grows = T.land.biomes.map((b, i) => growthOf(b, lush[i])),
    mat = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    c = new THREE.Color(),
    CELL = 1.3,
    rad = Q.grass;
  let at = null;
  function update(px, pz, force) {
    if (!force && at && Math.abs(at.x - px) + Math.abs(at.z - pz) < 6) return;
    at = { x: px, z: pz };
    let n = 0,
      nb = 0;
    const i0 = Math.floor((px - rad) / CELL),
      i1 = Math.floor((px + rad) / CELL),
      j0 = Math.floor((pz - rad) / CELL),
      j1 = Math.floor((pz + rad) / CELL);
    for (let j = j0; j <= j1 && n < max; j++)
      for (let i = i0; i <= i1 && n < max; i++) {
        const cx = (i + 0.5) * CELL,
          cz = (j + 0.5) * CELL,
          dx = cx - px,
          dz = cz - pz,
          d2 = dx * dx + dz * dz;
        if (d2 > rad * rad) continue;
        // the patch's own dice, from where it is in the world (the land's frame is the region's)
        const r = mulberry((seed ^ Math.imul(i + T.land.cx * 4096, 374761393) ^ Math.imul(j + T.land.cy * 4096, 668265263)) | 0),
          x = (i + r()) * CELL,
          z = (j + r()) * CELL,
          e0 = T.etile(x, z),
          ter = T.land.terrain[e0];
        if (ter === 4 || ter === R.DEEP || ter === 2 || T.roadAt(x, z)) continue;
        if (T.water && T.water.mask(x, z) > 0.05) continue;
        if (T.level(x, z) > 1.6) continue;
        let inTown = false;
        for (const t of towns) if (Math.abs(x - t.x) < townHalf + 2 && Math.abs(z - t.z) < townHalf + 2) inTown = true;
        if (inTown) continue;
        const g = grows[T.land.biome[e0]],
          rich = (ter === 3 ? 1.3 : ter === 5 ? 1.2 : 1) * g.n,
          // thinning toward the edge of the ring, so it fades rather than stops
          edge = 1 - Math.max(0, (Math.sqrt(d2) - rad * 0.7) / (rad * 0.3));
        if (r() > rich * edge) continue;
        const y = T.height(x, z) - 0.03,
          s = 0.7 + r() * 0.6;
        e.set((r() - 0.5) * 0.3, r() * 6.28, (r() - 0.5) * 0.3);
        q.setFromEuler(e);
        sc.set(s * 1.2, s * (0.7 + r() * 0.6), s * 1.2);
        v.set(x, y, z);
        mat.compose(v, q, sc);
        mat.toArray(tufts.instanceMatrix.array, n * 16);
        const k = 0.8 + r() * 0.35;
        c.copy(g.col)
          .lerp(SUNLIT, 0.25)
          .multiplyScalar(k * 1.15);
        c.toArray(tufts.instanceColor.array, n * 3);
        n++;
        if (r() < g.flowers * (ter === 5 ? 4 : 1) && nb < blooms.instanceMatrix.count) {
          v.set(x + 0.3, y, z + 0.2);
          sc.setScalar(0.8 + r() * 0.5);
          mat.compose(v, q, sc);
          mat.toArray(blooms.instanceMatrix.array, nb * 16);
          c.setHex(FLOWERS[Math.floor(r() * FLOWERS.length)]);
          c.toArray(blooms.instanceColor.array, nb * 3);
          nb++;
        }
      }
    tufts.count = n;
    blooms.count = nb;
    tufts.instanceMatrix.needsUpdate = tufts.instanceColor.needsUpdate = true;
    blooms.instanceMatrix.needsUpdate = blooms.instanceColor.needsUpdate = true;
  }
  return { tufts, blooms, update };
}
export { makeGrass, grassOn };
