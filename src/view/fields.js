/* Fields round the towns (commission 8, "made things"): the land a town lives from, worked and bounded. Round every
   town in sight lie a handful of fields, squared to the town's streets, on level open ground away from water, woods,
   roads and other places: ploughed in rows of a crop of the climate (wheat, barley, cabbages, flax, turnips, millet,
   hay) or lying fallow, each bounded by what its people build with: a drystone wall in the cold and the wet, a hedge in
   temperate lands, a low mud-brick wall in the heat, a post-and-rail fence on the steppe, with a gap for a gate on the
   side toward the town. View only: the rules know nothing of them, and they never block the way.
   One mesh for all the fields' ground and one instanced mesh for each kind of boundary: four draw calls at most.
   Switch: the look's `fields` (Settings). */
import { R, mulberry } from './ctx.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { climateOf } from './buildings.js';

LOOK_SWITCHES.push(['fields', 'Fields round the towns']);
const fieldsOn = () => lookOn('fields') && lookOn('light') && !Q.lite;

// crops by climate: [colour of the rows, colour between, chance]
const CROPS = {
  temperate: [
    [0xd8b850, 0x9a7a40, 3], // wheat
    [0xc8c070, 0x8a7a48, 2], // barley
    [0x5a8a3a, 0x6a5030, 2], // cabbages
    [0x6a90a0, 0x6a5a3a, 1], // flax in flower
    [0x8a6a44, 0x6a4e30, 1.5], // ploughed and fallow
  ],
  wet: [
    [0x7a9a4a, 0x5a7a3a, 3], // hay
    [0xc8c070, 0x7a6a40, 1.5],
    [0x6a5038, 0x4a3a28, 1],
  ],
  cold: [
    [0xb8b070, 0x7a6a48, 2], // barley
    [0x6a8a4a, 0x5a4a34, 2], // turnips
    [0x7a6a50, 0x5a4a38, 1.5],
  ],
  hot: [
    [0xd8b868, 0xa8864a, 3], // millet
    [0x8a9a4a, 0x9a7a4a, 1.5], // beans, watered
    [0xb08a58, 0x8a6a40, 1.5],
  ],
  steppe: [[0xb8a868, 0x8a7a4a, 1]], // grazing
  ashen: [[0x6a6050, 0x4a4238, 1]],
};
const BOUNDS = { temperate: 'hedge', wet: 'drystone', cold: 'drystone', hot: 'mudwall', steppe: 'fence', ashen: 'drystone' };

/* The fields round the towns of the drawn land: { group, inField(x, z) }. T: the land (terrain.js); towns: [{ x, z }]
   their middles; townHalf: half a town's width in metres. */
function fieldsGroup(S, T, towns, townHalf) {
  const group = new THREE.Group(),
    fields = [];
  if (!fieldsOn() || !towns.length) return { group, inField: () => false };
  const land = T.land,
    clear = (x, z) => {
      const e = T.etile(x, z),
        ter = land.terrain[e];
      if (ter !== 0 || land.siteAt[e]) return false;
      if (T.water && T.water.mask(x, z) > 0.02) return false;
      if (T.roadNear ? T.roadNear(x, z) < 5 : T.roadAt(x, z)) return false;
      for (const t of towns) if (Math.abs(x - t.x) < townHalf + 6 && Math.abs(z - t.z) < townHalf + 6) return false;
      return true;
    };
  const hi = !!Q.shadows && Q.ratio > 2,
    reach = hi ? 900 : 560, // only the towns near enough to see their fields
    cell = hi ? 2 : 4;
  for (const t of towns) {
    if (Math.max(Math.abs(t.x), Math.abs(t.z)) > reach) continue;
    const r = mulberry((S.seed ^ Math.imul(Math.round(t.x) + 9973, 2654435761) ^ Math.imul(Math.round(t.z) + 7919, 40503)) | 0),
      bio = land.biomes[land.biome[T.etile(t.x, t.z)]],
      cl = climateOf(bio),
      crops = CROPS[cl] || CROPS.temperate,
      bound = BOUNDS[cl] || 'hedge',
      want = 5 + Math.floor(r() * 5);
    for (let tries = 0; tries < 60 && fields.filter((f) => f.town === t).length < want; tries++) {
      const a = r() * Math.PI * 2,
        d = townHalf + 14 + r() * 80,
        cx = t.x + Math.cos(a) * d,
        cz = t.z + Math.sin(a) * d,
        w = 18 + r() * 16,
        h = 12 + r() * 12,
        f = { town: t, x0: cx - w / 2, x1: cx + w / 2, z0: cz - h / 2, z1: cz + h / 2, bound };
      // on clear ground at its corners, middle and edges, nearly level, and apart from the others
      const pts = [];
      for (const u of [0, 0.5, 1]) for (const v of [0, 0.5, 1]) pts.push([f.x0 + (f.x1 - f.x0) * u, f.z0 + (f.z1 - f.z0) * v]);
      if (!pts.every(([x, z]) => clear(x, z))) continue;
      const hs = pts.map(([x, z]) => T.height(x, z));
      if (Math.max(...hs) - Math.min(...hs) > 3.5) continue;
      if (fields.some((o) => o.x0 < f.x1 + 4 && o.x1 > f.x0 - 4 && o.z0 < f.z1 + 4 && o.z1 > f.z0 - 4)) continue;
      // its crop, which way its rows run, and its gate: on the side toward the town
      let tot = crops.reduce((s, c) => s + c[2], 0) * r();
      f.crop = crops.find((c) => (tot -= c[2]) < 0) || crops[0];
      f.rowsX = r() < 0.5;
      f.gate = Math.abs(t.x - cx) > Math.abs(t.z - cz) ? (t.x > cx ? 'e' : 'w') : t.z > cz ? 's' : 'n';
      f.r = r;
      fields.push(f);
    }
  }
  if (!fields.length) return { group, inField: () => false };
  // the ground of every field: a grid of 2 m cells on the land, coloured in rows
  const pos = [],
    col = [],
    idx = [],
    cA = new THREE.Color(),
    cB = new THREE.Color();
  for (const f of fields) {
    const nx = Math.max(2, Math.round((f.x1 - f.x0) / cell)),
      nz = Math.max(2, Math.round((f.z1 - f.z0) / cell)),
      base = pos.length / 3;
    cA.setHex(f.crop[0]);
    cB.setHex(f.crop[1]);
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = f.x0 + ((f.x1 - f.x0) * i) / nx,
          z = f.z0 + ((f.z1 - f.z0) * j) / nz;
        pos.push(x, T.height(x, z) + 0.12, z);
        // rows: every other line of points is the furrow
        const row = f.rowsX ? i : j,
          c = row % 2 ? cB : cA,
          k = 0.92 + f.r() * 0.16;
        col.push(c.r * k, c.g * k, c.b * k);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i,
          b = a + nx + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const gmat = new THREE.MeshLambertMaterial({ vertexColors: true });
  gmat.polygonOffset = true;
  gmat.polygonOffsetFactor = -1;
  gmat.polygonOffsetUnits = -1;
  const ground = new THREE.Mesh(geo, gmat);
  ground.receiveShadow = true;
  ground.userData.fields = true;
  group.add(ground);
  // the boundaries: a piece every so often along each side, with a gap for the gate
  const pieces = { drystone: [], hedge: [], mudwall: [], fence: [], rail: [] };
  for (const f of fields) {
    const sides = [
      ['n', f.x0, f.z0, f.x1, f.z0],
      ['s', f.x0, f.z1, f.x1, f.z1],
      ['w', f.x0, f.z0, f.x0, f.z1],
      ['e', f.x1, f.z0, f.x1, f.z1],
    ];
    for (const [side, ax, az, bx, bz] of sides) {
      const len = Math.hypot(bx - ax, bz - az),
        step = f.bound === 'fence' ? 2.4 : f.bound === 'hedge' ? 1.6 : 1.1,
        n = Math.max(2, Math.round(len / step)),
        yaw = Math.atan2(bx - ax, bz - az);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (side === f.gate && Math.abs(t - 0.5) < 2.2 / len) continue; // the gate
        const x = ax + (bx - ax) * t,
          z = az + (bz - az) * t,
          y = T.height(x, z),
          k = f.r();
        if (f.bound === 'fence') {
          pieces.fence.push([x, y, z, yaw, 1, k]);
          if (i < n && !(side === f.gate && Math.abs(t + 0.5 / n - 0.5) < 2.2 / len))
            pieces.rail.push([x + (bx - ax) / n / 2, y, z + (bz - az) / n / 2, yaw, step, k]);
        } else pieces[f.bound].push([x, y, z, yaw + (k - 0.5) * 0.25, 1, k]);
      }
    }
  }
  const SETS = {
    drystone: [() => new THREE.DodecahedronGeometry(0.55, 0), 0x9a958a, 0.25, (s) => s.set(1.1, 0.75, 0.85), 0.25],
    hedge: [() => new THREE.IcosahedronGeometry(0.9, hi ? 1 : 0), 0x4e6e34, 0.2, (s) => s.set(1, 1.1, 0.75), 0.6],
    mudwall: [() => new THREE.BoxGeometry(0.5, 1.0, 1.15), 0xb08a5e, 0.12, (s) => s.set(1, 1, 1), 0.45],
    fence: [() => new THREE.BoxGeometry(0.14, 1.3, 0.14), 0x6a5038, 0.2, (s) => s.set(1, 1, 1), 0.5],
    rail: [() => new THREE.BoxGeometry(0.07, 0.09, 1), 0x7a5c3c, 0.15, null, 0.85],
  };
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    c = new THREE.Color();
  for (const k in pieces) {
    const L = pieces[k];
    if (!L.length) continue;
    const [mk, hex, vary, scale, lift] = SETS[k],
      geo2 = mk();
    if (k === 'rail') {
      // two rails, at knee and hip
      const g2 = geo2.clone().translate(0, 0.45, 0);
      geo2.translate(0, 1.0, 0);
      const merged = new THREE.BufferGeometry();
      const a = geo2.toNonIndexed(),
        b = g2.toNonIndexed(),
        p = new Float32Array(a.attributes.position.array.length * 2),
        nn = new Float32Array(p.length);
      p.set(a.attributes.position.array);
      p.set(b.attributes.position.array, a.attributes.position.array.length);
      nn.set(a.attributes.normal.array);
      nn.set(b.attributes.normal.array, a.attributes.normal.array.length);
      merged.setAttribute('position', new THREE.BufferAttribute(p, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
      L.geo = merged;
    }
    const im = new THREE.InstancedMesh(L.geo || geo2, new THREE.MeshLambertMaterial({ color: 0xffffff }), L.length);
    L.forEach(([x, y, z, yaw, len, t], i) => {
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      if (scale) scale(sc);
      else sc.set(1, 1, len);
      if (k === 'drystone' || k === 'hedge') sc.multiplyScalar(0.85 + t * 0.3);
      v.set(x, y + (k === 'rail' ? 0 : lift * sc.y), z);
      im.setMatrixAt(i, m.compose(v, q, sc));
      c.setHex(hex).multiplyScalar(1 - vary / 2 + t * vary);
      im.setColorAt(i, c);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false;
    im.userData.fields = k;
    group.add(im);
  }
  const inField = (x, z) => fields.some((f) => x > f.x0 - 1.5 && x < f.x1 + 1.5 && z > f.z0 - 1.5 && z < f.z1 + 1.5);
  return { group, inField, count: fields.length };
}
export { fieldsGroup, fieldsOn };
