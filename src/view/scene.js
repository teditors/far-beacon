/* The 3D scene: lights, models, and the static and moving parts of the world. */
import { $, G, N, P, R, TS, V, WORLD, setGeometry, tileX, toTile } from './ctx.js';
import { makeTerrain } from './terrain.js';

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(70, 1, 0.3, 3000);
camera.rotation.order = 'YXZ';
const hemi = new THREE.HemisphereLight(0xdfe7ee, 0x5a554c, 0.75),
  sun = new THREE.DirectionalLight(0xfff1dc, 0.9),
  lamp = new THREE.PointLight(0xffc477, 0, 45, 1.6);
scene.add(hemi, sun, lamp);
scene.fog = new THREE.Fog(0xb9c7d1, 40, 600);
scene.background = new THREE.Color(0xb9c7d1);
let staticGroup = null,
  dynGroup = null;
const std = (color, extra) =>
  new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 1 }, extra || {}));
const glow = (color, opacity) =>
  new THREE.MeshBasicMaterial({ color, fog: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const box = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x || 0, y || 0, z || 0);
  return m;
};
const dispose = (g) => {
  if (!g) return;
  scene.remove(g);
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
};
const BUILD = {
  well() {
    const g = new THREE.Group(),
      m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1, 10), std(0x5d5a55));
    m.position.y = 0.5;
    const w = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 12).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x3f8fc0 }),
    );
    w.position.y = 1.02;
    g.add(m, w);
    return g;
  },
  cave() {
    const g = new THREE.Group(),
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), std(0x55524c));
    m.scale.set(1.35, 0.8, 1.1);
    m.position.y = 1.5;
    const d = new THREE.Mesh(new THREE.SphereGeometry(3.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x08090b }));
    d.position.set(0, 0.6, 6.2);
    d.scale.set(1, 1, 0.5);
    g.add(m, d);
    return g;
  },
  cache() {
    const g = new THREE.Group(),
      s = std(0x6b675f);
    g.add(box(1.6, 0.8, 1.4, s, 0, 0.4, 0), box(1.1, 0.7, 1, s, 0.1, 1.15, 0), box(0.7, 0.6, 0.6, s, 0, 1.8, 0.1));
    return g;
  },
  shrine(s) {
    const g = new THREE.Group(),
      st = std(0x8d8a84);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094;
      g.add(box(0.7, 6, 0.7, st, Math.cos(a) * 3, 3, Math.sin(a) * 3));
    }
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), glow(R.godOf(s).color, 1));
    o.position.y = 4.4;
    g.add(o);
    return g;
  },
  town() {
    const g = new THREE.Group(),
      wall = std(0xb9a98a),
      roof = std(0x7a3f2c),
      spots = [
        [-9, -6, 1],
        [-2, -9, 1.2],
        [7, -7, 0.9],
        [9, 2, 1.1],
        [-8, 5, 1],
        [0, 8, 1.2],
        [6, 9, 0.8],
      ];
    for (const [x, z, k] of spots) {
      const h = box(5 * k, 3 * k, 4.5 * k, wall, x, 1.5 * k, z),
        rf = new THREE.Mesh(new THREE.ConeGeometry(4.2 * k, 2.4 * k, 4), roof);
      rf.position.set(x, 3 * k + 1.2 * k, z);
      rf.rotation.y = Math.PI / 4;
      g.add(h, rf);
    }
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1, 10), std(0x5d5a55));
    well.position.y = 0.5;
    g.add(well);
    for (const [x, z] of [
      [-2, -9],
      [9, 2],
    ]) {
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.4, 170, 8, 1, true), glow(0xd9d4c4, 0.42));
      sm.material.side = THREE.DoubleSide;
      sm.position.set(x, 88, z);
      g.add(sm);
    }
    return g;
  },
  vault(s) {
    const g = new THREE.Group(),
      id = s.quest.vault.id,
      st = std(id === 'temple' ? 0x5c7a78 : id === 'barrow' ? 0x5d6a4a : 0x55524e),
      dark = new THREE.MeshBasicMaterial({ color: 0x08090b });
    if (id === 'castle') {
      g.add(box(16, 7, 16, st, 0, 3.5, 0));
      for (const [x, z] of [
        [-8, -8],
        [8, -8],
        [-8, 8],
        [8, 8],
      ]) {
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 13, 8), st);
        tw.position.set(x, 6.5, z);
        g.add(tw);
      }
      g.add(box(3, 4, 0.4, dark, 0, 2, 8.05));
    } else if (id === 'barrow') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 8, 0, 6.283, 0, 1.571), st);
      m.scale.y = 0.55;
      g.add(
        m,
        box(1.2, 4, 1.2, std(0x8d8a84), -2, 2, 10.6),
        box(1.2, 4, 1.2, std(0x8d8a84), 2, 2, 10.6),
        box(5.6, 1, 1.4, std(0x8d8a84), 0, 4.4, 10.6),
        box(2.6, 3.4, 0.4, dark, 0, 1.7, 10.2),
      );
    } else {
      for (let i = 0; i < 3; i++) g.add(box(18 - i * 4, 1.6, 18 - i * 4, st, 0, 0.8 + i * 1.6, 0));
      for (const [x, z] of [
        [-5, -5],
        [5, -5],
        [-5, 5],
        [5, 5],
      ])
        g.add(box(1, 7, 1, st, x, 8.2, z));
      g.add(box(12, 1, 12, st, 0, 12.2, 0), box(3, 3, 0.4, dark, 0, 6.2, 5.05));
    }
    return g;
  },
  beacon() {
    const g = new THREE.Group(),
      p = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 30, 6), std(0x4b4843));
    p.position.y = 15;
    const o = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), glow(0xffb84a, 1));
    o.position.y = 33;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 420, 8, 1, true), glow(0xffb040, 0.45));
    b.position.y = 240;
    b.material.side = THREE.DoubleSide;
    g.add(p, o, b);
    return g;
  },
  ruin(s) {
    // shape = building habit, stone = style, height = age, tint and props = doom, flag = affinity
    const g = new THREE.Group(),
      body = new THREE.Group(),
      hb = s.civ.habit,
      doom = s.civ.doom,
      col = new THREE.Color(R.trait(s, 'style').stone);
    if (doom === 'fire') col.multiplyScalar(0.3);
    if (doom === 'plague') col.lerp(new THREE.Color(0xe6e6d6), 0.35);
    const st = std(col),
      dark = new THREE.MeshBasicMaterial({ color: 0x0b0c0e });
    if (hb === 'cistern') {
      body.add(
        box(9, 2.6, 0.9, st, 0, 1.3, -4),
        box(9, 1.8, 0.9, st, 0, 0.9, 4),
        box(0.9, 2.2, 8, st, -4, 1.1, 0),
        box(0.9, 3, 8, st, 4, 1.5, 0),
      );
      const w = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12).rotateX(-Math.PI / 2), std(0x2c3a44));
      w.position.y = 0.15;
      g.add(w);
    } else if (hb === 'tower') {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3, 17, 8), st);
      tw.position.y = 8.5;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.6, 2.2, 8), st);
      c.position.y = 18;
      body.add(tw, c);
    } else if (hb === 'tomb')
      body.add(
        box(10, 2.4, 7, st, 0, 1.2, 0),
        box(11.5, 0.8, 8.5, st, 0, 2.7, 0),
        box(0.9, 4.2, 0.9, st, -2.2, 2.1, 4.2),
        box(0.9, 4.2, 0.9, st, 2.2, 2.1, 4.2),
        box(2.4, 2.1, 0.3, dark, 0, 1.05, 3.55),
      );
    else if (hb === 'granary') {
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 4.6, 3, 4, 1), st);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 2.1);
      roof.position.y = 5.5;
      body.add(box(6, 4, 13, st, 0, 2, 0), roof, box(1.8, 2.4, 0.3, dark, 0, 1.2, 6.55));
    } else
      body.add(
        box(1.4, 6, 1.4, st, -3.2, 3, 0),
        box(1.4, 6, 1.4, st, 3.2, 3, 0),
        box(9, 1.3, 1.8, st, 0, 6.6, 0),
        box(7, 0.3, 12, st, 0, 0.15, 0),
      );
    body.scale.y = R.trait(s, 'age').scale;
    g.add(body);
    const prop = (geo, mat, n, rad, y) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + 0.4,
          m = new THREE.Mesh(geo, mat);
        m.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
        g.add(m);
      }
    };
    if (doom === 'plague') prop(new THREE.CylinderGeometry(0.12, 0.12, 7, 5), std(0xf2f2ea), 3, 8.5, 3.5);
    if (doom === 'war') prop(new THREE.ConeGeometry(0.35, 2.6, 5), std(0x3a3027), 12, 8.5, 1.3);
    if (doom === 'famine') prop(new THREE.CylinderGeometry(0.5, 0.35, 1, 8), std(0xa8623a), 4, 6.5, 0.5);
    const pole = box(0.2, 5, 0.2, std(0x3a3027), 6, 2.5, 6),
      flag = box(1.8, 1.1, 0.1, new THREE.MeshBasicMaterial({ color: R.trait(s, 'affinity').color }), 6.95, 4.4, 6);
    g.add(pole, flag);
    return g;
  },
};
const FLAT = { height: () => 0 };
const VAULT_STONE = { castle: 0x6a6660, barrow: 0x5d6a4a, temple: 0x4f6e6c };
// Inside the town or the locked place: a floor, and a block for every wall tile that borders open floor.
function buildInterior() {
  const rec = R.areaRec(V.S),
    town = rec.kind === 'town',
    ts = G.ts,
    size = R.W * ts,
    T = V.S.terrain,
    isWall = (x, y) => x < 0 || y < 0 || x >= R.W || y >= R.H || T[y * R.W + x] === R.WALL;
  V.terrain = FLAT;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), std(town ? 0x8f8a80 : 0x3e3a35));
  staticGroup.add(floor);
  const stone = town ? 0xc9bba0 : VAULT_STONE[V.S.quest.vault.id],
    tiles = [];
  for (let y = 0; y < R.H; y++)
    for (let x = 0; x < R.W; x++) {
      if (!isWall(x, y)) continue;
      if (
        !isWall(x + 1, y) ||
        !isWall(x - 1, y) ||
        !isWall(x, y + 1) ||
        !isWall(x, y - 1) ||
        !isWall(x + 1, y + 1) ||
        !isWall(x - 1, y - 1) ||
        !isWall(x + 1, y - 1) ||
        !isWall(x - 1, y + 1)
      )
        tiles.push([x, y]);
    }
  const outer = (x, y) => x === 0 || y === 0 || x === R.W - 1 || y === R.H - 1;
  const groups = town ? [tiles.filter(([x, y]) => outer(x, y)), tiles.filter(([x, y]) => !outer(x, y))] : [tiles];
  groups.forEach((list, gi) => {
    const h = town ? (gi === 0 ? 6 : 4.5) : 5,
      inst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(ts, h, ts),
        std(town && gi === 0 ? 0x8d8579 : stone),
        Math.max(1, list.length),
      ),
      m = new THREE.Matrix4();
    list.forEach(([x, y], i) => {
      m.makeTranslation(tileX(x), h / 2, tileX(y));
      inst.setMatrixAt(i, m);
    });
    inst.count = list.length;
    staticGroup.add(inst);
  });
  if (town) {
    // roofs: a flat dark cap on the house blocks reads as roof from the street
    const caps = groups[1],
      inst = new THREE.InstancedMesh(new THREE.BoxGeometry(ts * 1.02, 0.4, ts * 1.02), std(0x7a3f2c), Math.max(1, caps.length)),
      m = new THREE.Matrix4();
    caps.forEach(([x, y], i) => {
      m.makeTranslation(tileX(x), 4.7, tileX(y));
      inst.setMatrixAt(i, m);
    });
    inst.count = caps.length;
    staticGroup.add(inst);
  } else {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), std(0x1c1a18));
    ceiling.position.y = 5;
    staticGroup.add(ceiling);
  }
}
// Things inside that can change: people, stairs, traps, and anything lying on the floor.
function person(color, hat) {
  const g = new THREE.Group(),
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.5, 8), std(color)),
    head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), std(0xd9b896));
  body.position.y = 0.75;
  head.position.y = 1.75;
  g.add(body, head);
  if (hat) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 8), std(hat));
    h.position.y = 2.1;
    g.add(h);
  }
  return g;
}
function interiorSite(st) {
  const ts = G.ts,
    g = new THREE.Group();
  if (st.kind === 'elder') g.add(person(0x8a2c2c, 0x5a1c1c));
  else if (st.kind === 'inn') g.add(person(0x7a5a2e), box(1.6, 0.9, 0.8, std(0x5a3d22), 1.2, 0.45, 0));
  else if (st.kind === 'shop')
    g.add(person(0x2f5f8f), box(1.8, 0.9, 0.9, std(0x6b4a2a), 0, 0.45, -1.1), box(0.4, 0.4, 0.4, std(0xc9a227), -0.4, 1.1, -1.1));
  else if (st.kind === 'well') g.add(BUILD.well());
  else if (st.kind === 'exit' && R.areaRec(V.S).kind === 'town')
    g.add(
      box(0.6, 5, 0.6, std(0x6b6358), -ts / 2, 2.5, 0),
      box(0.6, 5, 0.6, std(0x6b6358), ts / 2, 2.5, 0),
      box(ts + 0.6, 0.6, 0.6, std(0x6b6358), 0, 5, 0),
    );
  else if (st.kind === 'exit' || st.kind === 'stairsUp') {
    for (let i = 0; i < 4; i++)
      g.add(box(ts * 0.8, 0.3 + i * 0.4, 0.6, std(0x77716a), 0, (0.3 + i * 0.4) / 2, -ts / 2 + 0.3 + i * 0.6));
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 5, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: st.kind === 'exit' ? 0xfff1c0 : 0xe0a84a,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    shaft.material.side = THREE.DoubleSide;
    shaft.position.set(0, 2.5, -ts * 0.35);
    g.add(shaft);
  } else if (st.kind === 'stairsDown') {
    g.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(ts * 0.8, ts * 0.8).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x050505 }),
      ),
    );
    g.children[0].position.y = 0.02;
    for (let i = 0; i < 3; i++) g.add(box(ts * 0.7, 0.12, 0.5, std(0x5a554e), 0, 0.04 - i * 0.01, -ts * 0.3 + i * 0.6));
    const marker = new THREE.Mesh(new THREE.TorusGeometry(ts * 0.42, 0.06, 6, 24).rotateX(Math.PI / 2), glow(0xe0a84a, 0.5));
    marker.position.y = 0.05;
    g.add(marker);
  } else if (st.kind === 'trap' && (st.sprung || st.seen))
    g.add(box(ts * 0.6, 0.06, ts * 0.6, std(st.sprung ? 0x2a2522 : 0x9a2a22), 0, 0.03, 0));
  return g;
}
function buildStatic() {
  dispose(staticGroup);
  staticGroup = new THREE.Group();
  scene.add(staticGroup);
  setGeometry(R.indoors(V.S));
  if (R.indoors(V.S)) return buildInterior();
  V.terrain = makeTerrain(V.S);
  const b = R.biomeOf(V.S),
    cols = b.colors.map((c) => new THREE.Color(c)),
    lush = new THREE.Color(b.id === 'taiga' ? 0x5d7a78 : 0x5f8a45),
    paved = new THREE.Color(0x8c8a86),
    c = new THREE.Color();
  const springs = Object.keys(V.S.sites)
    .filter((k) => V.S.sites[k].kind === 'spring')
    .map((k) => ({ x: tileX(k % R.W), z: tileX(Math.floor(k / R.W)) }));
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position,
    col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    pos.setY(i, V.terrain.height(x, z));
    const l = V.terrain.level(x, z);
    if (l <= 1) c.copy(cols[0]).lerp(cols[1], Math.max(0, l));
    else c.copy(cols[1]).lerp(cols[2], Math.min(1, l - 1));
    for (let mi = 0; mi < 3; mi++) {
      const mv = V.terrain.masks[mi](x, z);
      if (mv > 0) c.lerp(cols[3 + mi], mv * (mi === 0 ? 0.7 : 1));
    }
    if (V.terrain.roadAt(x, z)) c.lerp(paved, 0.85);
    c.multiplyScalar(0.88 + 0.2 * V.terrain.noise(x / 40 + 3, z / 40 + 3));
    for (const s of springs) {
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < 34) c.lerp(lush, (1 - d / 34) * 0.8);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  staticGroup.add(
    new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 })),
  );
  const r = V.terrain.rand,
    m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3();
  const nearSite = (x, z) => {
    const s = V.S.sites[toTile(z) * R.W + toTile(x)];
    return s && Math.hypot(tileX(toTile(x)) - x, tileX(toTile(z)) - z) < 11;
  };
  function scatter(geom, mat, count, fn) {
    const inst = new THREE.InstancedMesh(geom, mat, count);
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const x = (r() - 0.5) * (WORLD - 10),
        z = (r() - 0.5) * (WORLD - 10);
      if (nearSite(x, z)) continue;
      const o = fn(x, z, V.terrain.level(x, z));
      if (!o) continue;
      e.set(o.rx || 0, r() * 6.28, o.rz || 0);
      q.setFromEuler(e);
      sc.set(o.sx, o.sy, o.sx);
      v.set(x, V.terrain.height(x, z) + o.lift, z);
      m.compose(v, q, sc);
      inst.setMatrixAt(n++, m);
    }
    inst.count = n;
    staticGroup.add(inst);
  }
  const rockCol = cols[2].clone().multiplyScalar(0.85);
  scatter(new THREE.IcosahedronGeometry(1, 0), std(rockCol), b.id === 'salt' ? 800 : 450, (x, z, l) => {
    const s = 0.3 + r() * r() * (1.5 + l * 1.6);
    return { sx: s, sy: s * (0.6 + r() * 0.6), lift: s * 0.2, rx: r() * 3, rz: r() * 3 };
  });
  scatter(new THREE.IcosahedronGeometry(1, 0), std(rockCol), 16, () => {
    const s = 1.8 + r() * 1.6;
    return { sx: s, sy: s * (3 + r() * 2.5), lift: s, rx: r() * 0.15, rz: r() * 0.15 };
  });
  const tr = b.forest.tree,
    ftiles = [];
  for (let i = 0; i < V.S.terrain.length; i++) if (V.S.terrain[i] === 3) ftiles.push(i);
  if (ftiles.length) {
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), std(tr.color), ftiles.length * tr.n);
    let n = 0;
    for (const i of ftiles)
      for (let j = 0; j < tr.n; j++) {
        const x = tileX(i % R.W) + (r() - 0.5) * TS,
          z = tileX(Math.floor(i / R.W)) + (r() - 0.5) * TS;
        if (nearSite(x, z)) continue;
        const hgt = tr.h[0] + r() * (tr.h[1] - tr.h[0]),
          wd = tr.w * (0.7 + r() * 0.6);
        e.set(0, r() * 6.28, 0);
        q.setFromEuler(e);
        sc.set(wd, hgt, wd);
        v.set(x, V.terrain.height(x, z) + hgt / 2 - 0.3, z);
        m.compose(v, q, sc);
        trees.setMatrixAt(n++, m);
      }
    trees.count = n;
    staticGroup.add(trees);
  }
  for (const k in V.S.sites) {
    const st = V.S.sites[k];
    if (st.kind === 'spring') continue;
    const x = tileX(k % R.W),
      z = tileX(Math.floor(k / R.W)),
      g = BUILD[st.kind](V.S);
    g.position.set(x, V.terrain.height(x, z), z);
    if (st.kind !== 'beacon') g.rotation.y = (k % 7) * 0.9;
    staticGroup.add(g);
  }
}
function buildDynamic() {
  dispose(dynGroup);
  dynGroup = new THREE.Group();
  scene.add(dynGroup);
  const at = (k, dx, dz) => {
    const x = tileX(k % R.W) + (dx || 0),
      z = tileX(Math.floor(k / R.W)) + (dz || 0);
    return [x, V.terrain.height(x, z), z];
  };
  for (const k in V.S.sites) {
    const st = V.S.sites[k];
    if (st.kind !== 'spring') continue;
    const [x, y, z] = at(+k),
      w = new THREE.Mesh(
        new THREE.CircleGeometry(4.6, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: st.known && st.foul ? 0x6f6a35 : 0x3f8fc0 }),
      );
    w.position.set(x, y + 0.3, z);
    dynGroup.add(w);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + (+k % 5),
        d = 5.5 + (i % 3) * 1.6,
        rx = x + Math.cos(a) * d,
        rz = z + Math.sin(a) * d,
        c = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.4 + (i % 3), 5), std(0x587a40));
      c.position.set(rx, V.terrain.height(rx, rz) + 1.1, rz);
      dynGroup.add(c);
    }
  }
  const indoor = R.indoors(V.S),
    off = indoor ? G.ts / 28 : 1;
  if (indoor)
    for (const k in V.S.sites) {
      const st = V.S.sites[k],
        [x, y, z] = at(+k),
        g = interiorSite(st);
      g.position.set(x, y, z);
      if (st.kind === 'elder' || st.kind === 'inn' || st.kind === 'shop') g.rotation.y = Math.atan2(P.x - x, P.z - z);
      dynGroup.add(g);
    }
  for (const k in V.S.depots) {
    if (+k === R.campHere(V.S)) continue;
    const d = V.S.depots[k],
      relic = d.items.some((i) => i.base === 'relic'),
      [x, y, z] = at(+k, 3.5 * off, 2.5 * off);
    if (relic) {
      dynGroup.add(box(1.2, 1, 1.2, std(0x77716a), x, y + 0.5, z));
      const r = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glow(0xffd27a, 1));
      r.position.set(x, y + 1.45, z);
      dynGroup.add(r);
    } else dynGroup.add(box(1.2, 1, 1.2, std(0x8a5a2b), x, y + 0.5, z));
  }
  for (const c of V.S.creatures) {
    if (c.bound && !(V.S.combat && V.S.combat.cid === c.id)) continue;
    const sp = R.spOf(V.S, c),
      g = new THREE.Group(),
      col = sp.rare === 'gilded' ? 0xd9a520 : sp.rare === 'docile' ? 0x7fae7a : R.biomeOf(V.S).creatureTint,
      mat = std(col),
      k = (sp.rare === 'elder' ? 1.45 : 1) * (0.9 + c.tier * 0.12),
      eye = new THREE.MeshBasicMaterial({ color: 0xff3b2f, fog: false });
    if (sp.form === 'hound')
      g.add(
        box(0.6, 0.7, 1.7, mat, 0, 0.8, 0),
        box(0.5, 0.5, 0.6, mat, 0, 1.15, 1),
        box(0.15, 0.8, 0.15, mat, -0.2, 0.4, 0.6),
        box(0.15, 0.8, 0.15, mat, 0.2, 0.4, 0.6),
        box(0.15, 0.8, 0.15, mat, -0.2, 0.4, -0.6),
        box(0.15, 0.8, 0.15, mat, 0.2, 0.4, -0.6),
        box(0.3, 0.08, 0.05, eye, 0, 1.25, 1.31),
      );
    else if (sp.form === 'brute')
      g.add(
        box(1.8, 1.9, 1.5, mat, 0, 1.8, 0),
        box(0.9, 0.8, 0.9, mat, 0, 3, 0.3),
        box(0.55, 1.7, 0.55, mat, -1.2, 1.5, 0.2),
        box(0.55, 1.7, 0.55, mat, 1.2, 1.5, 0.2),
        box(0.6, 0.9, 0.6, mat, -0.5, 0.45, 0),
        box(0.6, 0.9, 0.6, mat, 0.5, 0.45, 0),
        box(0.5, 0.1, 0.05, eye, 0, 3.1, 0.76),
      );
    else if (sp.form === 'wight') {
      const pale = new THREE.MeshBasicMaterial({ color: 0xcfe9e4, transparent: true, opacity: 0.8, fog: false });
      g.add(
        box(0.5, 1.6, 0.3, pale, 0, 1.5, 0),
        box(0.35, 0.4, 0.35, pale, 0, 2.55, 0),
        box(0.14, 1.3, 0.14, pale, -0.4, 1.6, 0.1),
        box(0.14, 1.3, 0.14, pale, 0.4, 1.6, 0.1),
        box(0.25, 0.06, 0.05, eye, 0, 2.6, 0.19),
      );
    } else {
      for (let i = 0; i < 6; i++)
        g.add(box(0.4 - i * 0.03, 0.3, 0.75, mat, Math.sin(i * 1.1) * 0.45, 0.2 + (i === 0 ? 0.5 : 0), 1.6 - i * 0.7));
      g.add(box(0.25, 0.06, 0.05, eye, Math.sin(0) * 0.45, 0.75, 1.99));
    }
    g.scale.setScalar(k * (sp.form === 'wight' ? 0.85 : 1.1));
    let x, y, z;
    if (V.S.combat && V.S.combat.cid === c.id) {
      x = P.x - Math.sin(P.yaw) * (indoor ? 3 : 7.5);
      z = P.z - Math.cos(P.yaw) * (indoor ? 3 : 7.5);
      P.pitch = 0;
      y = V.terrain.height(x, z);
      g.rotation.y = P.yaw;
    } else {
      [x, y, z] = at(c.y * R.W + c.x, -4 * off, -5 * off);
      g.rotation.y = Math.atan2(P.x - x, P.z - z);
    }
    g.position.set(x, y, z);
    dynGroup.add(g);
  }
  if (R.campHere(V.S) !== null) {
    const [x, y, z] = at(R.campHere(V.S), 5, 3),
      t = new THREE.Mesh(new THREE.ConeGeometry(3, 3.6, 4), std(0xd9a24a));
    t.position.set(x, y + 1.8, z);
    const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 150, 8, 1, true), glow(0xf2f2ee, 0.38));
    sm.material.side = THREE.DoubleSide;
    sm.position.set(x + 3, y + 76, z - 2);
    dynGroup.add(t, sm);
  }
}
function resize() {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export {
  renderer,
  scene,
  camera,
  hemi,
  sun,
  lamp,
  staticGroup,
  dynGroup,
  std,
  glow,
  box,
  dispose,
  BUILD,
  buildStatic,
  buildDynamic,
  resize,
};
