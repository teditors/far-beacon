/* The 3D scene: lights, models, and the static and moving parts of the world. */
import { $, FR, G, HALF, P, R, TOWN_TS, TS, V, setGeometry } from './ctx.js';
import { EW, MARGIN, PAD, SINK, makeTerrain } from './terrain.js';

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
// The town or a level of the locked place, as a group centred on its own middle: a floor, and a block for every wall
// tile that borders open floor. The town has no ceiling, so it can stand out of doors and be seen from far off.
function interiorGroup(map, rec, ts) {
  const group = new THREE.Group(),
    town = rec.kind === 'town',
    size = R.W * ts,
    T = map.terrain,
    at = (t) => (t + 0.5) * ts - size / 2,
    isWall = (x, y) => x < 0 || y < 0 || x >= R.W || y >= R.H || T[y * R.W + x] === R.WALL;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), std(town ? 0x8f8a80 : 0x3e3a35));
  floor.position.y = town ? 0.08 : 0;
  group.add(floor);
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
        !isWall(x - 1, y + 1) ||
        town // the town's outer wall is seen from outside too
      )
        tiles.push([x, y]);
    }
  const outer = (x, y) => x === 0 || y === 0 || x === R.W - 1 || y === R.H - 1;
  const groups = town ? [tiles.filter(([x, y]) => outer(x, y)), tiles.filter(([x, y]) => !outer(x, y))] : [tiles];
  groups.forEach((list, gi) => {
    const h = town ? (gi === 0 ? 6 : 4.5) : 5,
      inst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(ts, h + (town ? 3 : 0), ts),
        std(town && gi === 0 ? 0x8d8579 : stone),
        Math.max(1, list.length),
      ),
      m = new THREE.Matrix4();
    list.forEach(([x, y], i) => {
      m.makeTranslation(at(x), (h - (town ? 3 : 0)) / 2, at(y)); // town walls reach 3 m into the ground, for uneven land
      inst.setMatrixAt(i, m);
    });
    inst.count = list.length;
    inst.frustumCulled = false;
    group.add(inst);
  });
  if (town) {
    // roofs: a flat dark cap on the house blocks reads as roof from the street
    const caps = groups[1],
      inst = new THREE.InstancedMesh(new THREE.BoxGeometry(ts * 1.02, 0.4, ts * 1.02), std(0x7a3f2c), Math.max(1, caps.length)),
      m = new THREE.Matrix4();
    caps.forEach(([x, y], i) => {
      m.makeTranslation(at(x), 4.7, at(y));
      inst.setMatrixAt(i, m);
    });
    inst.count = caps.length;
    inst.frustumCulled = false;
    group.add(inst);
    // hearth smoke over the hall and the inn, to find the town by from far off
    for (const k in map.sites) {
      const st = map.sites[k];
      if (st.kind !== 'elder' && st.kind !== 'inn') continue;
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.4, 170, 8, 1, true), glow(0xd9d4c4, 0.42));
      sm.material.side = THREE.DoubleSide;
      sm.position.set(
        at(k % R.W) + (st.kind === 'inn' ? 3 * ts : 0),
        90,
        at(Math.floor(k / R.W)) - (st.kind === 'elder' ? 3 * ts : 0),
      );
      group.add(sm);
    }
  } else {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), std(0x1c1a18));
    ceiling.position.y = 5;
    group.add(ceiling);
  }
  return group;
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
function interiorSite(st, ts, inTown) {
  const g = new THREE.Group();
  if (st.kind === 'elder') g.add(person(0x8a2c2c, 0x5a1c1c));
  else if (st.kind === 'inn') g.add(person(0x7a5a2e), box(1.6, 0.9, 0.8, std(0x5a3d22), 1.2, 0.45, 0));
  else if (st.kind === 'shop')
    g.add(person(0x2f5f8f), box(1.8, 0.9, 0.9, std(0x6b4a2a), 0, 0.45, -1.1), box(0.4, 0.4, 0.4, std(0xc9a227), -0.4, 1.1, -1.1));
  else if (st.kind === 'well') g.add(BUILD.well());
  else if (st.kind === 'folk') g.add(person(0x6a6a5a));
  else if (st.kind === 'grave') g.add(box(0.5, 1, 0.2, std(0x8a8a86), 0, 0.5, 0), box(1.2, 0.15, 2, std(0x5a5650), 0, 0.08, 0.9));
  else if (R.C.townLife && R.byId(R.C.townLife.services, st.kind)) {
    // a person at the door of their trade, and a painted sign above it
    const sv = R.byId(R.C.townLife.services, st.kind);
    g.add(person(sv.color, sv.hat), box(1.4, 0.8, 0.12, std(sv.hat), 0, 3.4, -ts / 2 + 0.2));
  } else if ((st.kind === 'exit' || st.kind === 'gate') && inTown)
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
// Which frame the player is in: the region's own, or (inside the town) one centred on the town. Nothing is rebuilt
// when this changes; the same scene is simply looked at from the other origin.
function applyFrame() {
  const kind = R.areaRec(V.S).kind,
    inTown = kind === 'town' && V.townAt;
  if (kind === 'vault') return;
  FR.x = inTown ? V.townAt.x : 0;
  FR.y = inTown ? V.townAt.y : 0;
  FR.z = inTown ? V.townAt.z : 0;
  setGeometry(inTown ? 'town' : 'region');
  staticGroup.position.set(-FR.x, -FR.y, -FR.z);
  V.terrain = inTown ? { height: (x, z) => V.base.height(x + FR.x, z + FR.z) - FR.y } : V.base;
}
function buildStatic() {
  dispose(staticGroup);
  staticGroup = new THREE.Group();
  scene.add(staticGroup);
  V.townAt = null;
  if (R.areaRec(V.S).kind === 'vault') {
    setGeometry('vault');
    FR.x = FR.y = FR.z = 0;
    V.base = V.terrain = FLAT;
    staticGroup.add(interiorGroup(V.S, R.areaRec(V.S), G.ts));
    return;
  }
  V.base = makeTerrain(V.S);
  const T = V.base,
    land = T.land,
    pal = land.biomes.map((b) => ({
      cols: b.colors.map((c) => new THREE.Color(c)),
      lush: new THREE.Color(b.lush !== undefined ? b.lush : b.id === 'taiga' ? 0x5d7a78 : 0x5f8a45),
    })),
    paved = new THREE.Color(0x8c8a86),
    c = new THREE.Color(),
    cb = new THREE.Color(),
    lush = new THREE.Color(),
    centre = (t) => (t + 0.5) * TS - HALF,
    springs = land.sites.filter((q) => q.st.kind === 'spring').map((q) => ({ x: centre(q.x), z: centre(q.y) }));
  // The colour of the ground at a point: each biome's own palette, mixed where two biomes meet.
  const colourAt = (x, z) => {
    const l = T.level(x, z),
      mv = [T.masks[0](x, z), T.masks[1](x, z), T.masks[2](x, z)];
    let total = 0;
    c.setRGB(0, 0, 0);
    lush.setRGB(0, 0, 0);
    for (let b = 0; b < pal.length; b++) {
      const w = pal.length === 1 ? 1 : T.share[b](x, z);
      if (w < 0.002) continue;
      const cols = pal[b].cols;
      if (l <= 1) cb.copy(cols[0]).lerp(cols[1], Math.max(0, l));
      else cb.copy(cols[1]).lerp(cols[2], Math.min(1, l - 1));
      for (let mi = 0; mi < 3; mi++) if (mv[mi] > 0) cb.lerp(cols[3 + mi], mv[mi] * (mi === 0 ? 0.7 : 1));
      c.r += cb.r * w;
      c.g += cb.g * w;
      c.b += cb.b * w;
      lush.r += pal[b].lush.r * w;
      lush.g += pal[b].lush.g * w;
      lush.b += pal[b].lush.b * w;
      total += w;
    }
    c.multiplyScalar(1 / total);
    lush.multiplyScalar(1 / total);
    if (T.roadAt(x, z)) c.lerp(paved, 0.85);
    c.multiplyScalar(0.88 + 0.2 * T.tint(x, z));
    for (const s of springs) {
      const dx = s.x - x,
        dz = s.z - z;
      if (dx > 34 || dx < -34 || dz > 34 || dz < -34) continue;
      const d = Math.hypot(dx, dz);
      if (d < 34) c.lerp(lush, (1 - d / 34) * 0.8);
    }
    return c;
  };
  // One ground mesh from a height grid. The coarse one leaves out the middle, where the fine one lies.
  const ground = (g, sink, hollow) => {
    const geo = new THREE.PlaneGeometry(g.half * 2, g.half * 2, g.n, g.n);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position,
      col = new Float32Array(pos.count * 3),
      keep = HALF - g.cell * 1.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, g.h[Math.round((z + g.half) / g.cell) * (g.n + 1) + Math.round((x + g.half) / g.cell)] - sink);
      if (hollow && Math.abs(x) < keep - g.cell && Math.abs(z) < keep - g.cell) continue; // never drawn
      const k = colourAt(x, z);
      col[i * 3] = k.r;
      col[i * 3 + 1] = k.g;
      col[i * 3 + 2] = k.b;
    }
    if (hollow) {
      const ix = geo.index.array,
        out = [],
        inner = (i) => Math.abs(pos.getX(i)) < keep && Math.abs(pos.getZ(i)) < keep;
      for (let i = 0; i < ix.length; i += 3)
        if (!(inner(ix[i]) && inner(ix[i + 1]) && inner(ix[i + 2]))) out.push(ix[i], ix[i + 1], ix[i + 2]);
      geo.setIndex(out);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    staticGroup.add(
      new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 })),
    );
  };
  ground(T.fine, 0, false);
  ground(T.coarse, SINK, true);
  // Rocks and trees, tile by tile, from a source that depends only on where the tile is in the world.
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    rocks = pal.map(() => []),
    trees = pal.map(() => []);
  const townSite = land.sites.find((q) => q.st.kind === 'town'),
    townHalf = (R.W * TOWN_TS) / 2;
  if (townSite) V.townAt = { x: centre(townSite.x), y: T.height(centre(townSite.x), centre(townSite.y)), z: centre(townSite.y) };
  const nearSite = (x, z) => {
    if (V.townAt && Math.abs(x - V.townAt.x) < townHalf + 4 && Math.abs(z - V.townAt.z) < townHalf + 4) return true;
    const site = land.siteAt[T.etile(x, z)];
    return site && Math.hypot(centre(site.x) - x, centre(site.y) - z) < (PAD[site.st.kind] || 8) + 3;
  };
  const put = (list, x, z, sx, sy, lift, rx, ry, rz) => {
    e.set(rx, ry, rz);
    q.setFromEuler(e);
    sc.set(sx, sy, sx);
    v.set(x, T.height(x, z) + lift, z);
    m.compose(v, q, sc);
    for (let i = 0; i < 16; i++) list.push(m.elements[i]);
  };
  for (let ey = 0; ey < EW; ey++)
    for (let ex = 0; ex < EW; ex++) {
      const x = ex - MARGIN,
        y = ey - MARGIN,
        en = ey * EW + ex,
        bi = land.biome[en],
        bio = land.biomes[bi],
        r = T.tileRand(x, y, 1),
        x0 = x * TS - HALF,
        z0 = y * TS - HALF,
        far = x < -8 || y < -8 || x >= R.W + 8 || y >= R.H + 8;
      for (let n = Math.floor((bio.rocky !== undefined ? bio.rocky : bio.id === 'salt' ? 0.62 : 0.35) + r()); n > 0; n--) {
        const px = x0 + r() * TS,
          pz = z0 + r() * TS,
          s = 0.3 + r() * r() * (1.5 + T.level(px, pz) * 1.6),
          sy = s * (0.6 + r() * 0.6),
          rx = r() * 3,
          ry = r() * 6.28,
          rz = r() * 3;
        if (!nearSite(px, pz)) put(rocks[bi], px, pz, s, sy, s * 0.2, rx, ry, rz);
      }
      if (r() < 0.0125) {
        const px = x0 + r() * TS,
          pz = z0 + r() * TS,
          s = 1.8 + r() * 1.6,
          sy = s * (3 + r() * 2.5);
        if (!nearSite(px, pz)) put(rocks[bi], px, pz, s, sy, s, r() * 0.15, r() * 6.28, r() * 0.15);
      }
      if (land.terrain[en] !== 3) continue;
      const tr = bio.forest.tree;
      for (let j = 0, n = far ? Math.ceil(tr.n / 2) : tr.n; j < n; j++) {
        const px = x0 + r() * TS,
          pz = z0 + r() * TS,
          hgt = tr.h[0] + r() * (tr.h[1] - tr.h[0]),
          wd = tr.w * (0.7 + r() * 0.6),
          ry = r() * 6.28;
        if (nearSite(px, pz)) continue;
        e.set(0, ry, 0);
        q.setFromEuler(e);
        sc.set(wd, hgt, wd);
        v.set(px, T.height(px, pz) + hgt / 2 - 0.3, pz);
        m.compose(v, q, sc);
        for (let i = 0; i < 16; i++) trees[bi].push(m.elements[i]);
      }
    }
  const instances = (geom, mat, list) => {
    if (!list.length) return;
    const inst = new THREE.InstancedMesh(geom, mat, list.length / 16);
    inst.instanceMatrix.array.set(list);
    inst.frustumCulled = false; // its instances are spread over the whole land
    staticGroup.add(inst);
  };
  pal.forEach((p, bi) => {
    instances(new THREE.IcosahedronGeometry(1, 0), std(p.cols[2].clone().multiplyScalar(0.85)), rocks[bi]);
    instances(new THREE.ConeGeometry(1, 1, 6), std(land.biomes[bi].forest.tree.color), trees[bi]);
  });
  for (const site of land.sites) {
    const st = site.st,
      x = centre(site.x),
      z = centre(site.y);
    if (st.kind === 'spring') {
      if (site.here) continue; // the springs of this region can change, and are drawn with the moving things
      const w = new THREE.Mesh(
        new THREE.CircleGeometry(4.6, 12).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x3f8fc0 }),
      );
      w.position.set(x, T.height(x, z) + 0.3, z);
      staticGroup.add(w);
      continue;
    }
    if (st.kind === 'town') {
      // the town itself, wall by wall, standing where it is
      const g = interiorGroup(R.mapOf(V.S, 'town'), V.S.areas.town, TOWN_TS);
      g.position.set(V.townAt.x, V.townAt.y, V.townAt.z);
      staticGroup.add(g);
      continue;
    }
    const g = BUILD[st.kind](V.S);
    g.position.set(x, T.height(x, z), z);
    if (st.kind !== 'beacon') g.rotation.y = (site.k % 7) * 0.9;
    staticGroup.add(g);
  }
  applyFrame();
}
// Everything that can change, for every area in view: outdoors that is the region and, if it stands here, the town.
function buildDynamic() {
  dispose(dynGroup);
  dynGroup = new THREE.Group();
  scene.add(dynGroup);
  const kind = R.areaRec(V.S).kind;
  if (kind === 'vault') return drawArea(V.S.area, 'vault');
  drawArea(R.outdoorRec(V.S).id, 'region');
  if (V.townAt && V.S.areas.town) drawArea('town', 'town');
}
function drawArea(id, kind) {
  const map = R.mapOf(V.S, id),
    current = id === V.S.area,
    indoor = kind !== 'region',
    ts = kind === 'town' ? TOWN_TS : kind === 'vault' ? G.ts : TS,
    half = (R.W * ts) / 2,
    off = indoor ? ts / 28 : 1;
  // a tile of this area, plus an offset in metres, as a point in the frame the player is in
  const at = (k, dx, dz) => {
    let x = ((k % R.W) + 0.5) * ts - half + (dx || 0),
      z = (Math.floor(k / R.W) + 0.5) * ts - half + (dz || 0),
      y = 0;
    if (kind === 'town') {
      x += V.townAt.x;
      z += V.townAt.z;
      y = V.townAt.y + 0.08;
    } else if (kind === 'region') y = V.base.height(x, z);
    return [x - FR.x, y - FR.y, z - FR.z];
  };
  const ground = (x, z) => V.terrain.height(x, z);
  if (!indoor)
    for (const k in map.sites) {
      const st = map.sites[k];
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
        c.position.set(rx, ground(rx, rz) + 1.1, rz);
        dynGroup.add(c);
      }
    }
  if (indoor)
    for (const k in map.sites) {
      const st = map.sites[k],
        [x, y, z] = at(+k),
        g = interiorSite(st, ts, kind === 'town');
      g.position.set(x, y, z);
      if (st.kind === 'elder' || st.kind === 'inn' || st.kind === 'shop') g.rotation.y = Math.atan2(P.x - x, P.z - z);
      dynGroup.add(g);
    }
  const camp = V.S.camp && V.S.camp.area === id ? V.S.camp.i : null;
  for (const k in map.depots) {
    if (+k === camp) continue;
    const d = map.depots[k],
      relic = d.items.some((i) => i.base === 'relic'),
      [x, y, z] = at(+k, 3.5 * off, 2.5 * off);
    if (relic) {
      dynGroup.add(box(1.2, 1, 1.2, std(0x77716a), x, y + 0.5, z));
      const r = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glow(0xffd27a, 1));
      r.position.set(x, y + 1.45, z);
      dynGroup.add(r);
    } else dynGroup.add(box(1.2, 1, 1.2, std(0x8a5a2b), x, y + 0.5, z));
  }
  for (const c of map.creatures) {
    const fighting = current && V.S.combat && V.S.combat.cid === c.id;
    if (c.bound && !fighting) continue;
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
    if (fighting) {
      x = P.x - Math.sin(P.yaw) * (indoor ? 3 : 7.5);
      z = P.z - Math.cos(P.yaw) * (indoor ? 3 : 7.5);
      P.pitch = 0;
      y = ground(x, z);
      g.rotation.y = P.yaw;
    } else {
      [x, y, z] = at(c.y * R.W + c.x, -4 * off, -5 * off);
      g.rotation.y = Math.atan2(P.x - x, P.z - z);
    }
    // stand on the lowest ground under the body, so nothing hovers on a slope
    if (!indoor)
      for (const [ox, oz] of [
        [1.2, 0],
        [-1.2, 0],
        [0, 1.2],
        [0, -1.2],
      ])
        y = Math.min(y, ground(x + ox, z + oz));
    g.position.set(x, y, z);
    dynGroup.add(g);
  }
  if (camp !== null) {
    const [x, y, z] = at(camp, 5, 3),
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
  applyFrame,
  resize,
};
