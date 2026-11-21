/* The 3D scene: lights, models, and the static and moving parts of the world. */
import { $, FR, G, HALF, P, R, TOWN_TS, TS, V, clamp, setGeometry } from './ctx.js';
const clampI = (i, n) => (i < 0 ? 0 : i > n ? n : i);
import { EW, MARGIN, PAD, SINK, makeTerrainG } from './terrain.js';
import { LOOK_SWITCHES, Q, SET, lookOn } from './quality.js';
import { PF, perfBuild } from './perf.js';
import { groundMaterial, paintOn, surface, surfaceOf } from './paint.js';
import { hamletGroup, townGroup, townsOn } from './buildings.js';
import { levelFloor, levelKit, levelMat, levelWalls } from './levels.js';
import { ruinGroup, ruinsOn } from './ruins.js';
import * as FX from './fx.js';
import { landmark } from './landmarks.js';
import { makeGrass } from './grass.js';
import { seaSheet, waterMesh, waterOn } from './water.js';
import { blob, fire, water } from './fx.js';
import { actorsOn, clearActors, creatureActor, markKilled, personActor, settleActors, shiftActors, track } from './actors.js';
R.on('killed', (s, d) => d && d.c && markKilled(d.c.id));
import { kitMat } from './kit.js';
import { makeLOD, plantsOn, treeMat, treeModel, updateLOD } from './plants.js';

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: Q.aa, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.ratio));
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(70, 1, 0.3, 3000);
camera.rotation.order = 'YXZ';
const hemi = new THREE.HemisphereLight(0xdfe7ee, 0x5a554c, 0.75),
  sun = new THREE.DirectionalLight(0xfff1dc, 0.9),
  lamp = new THREE.PointLight(0xffc477, 0, 45, 1.6);
scene.add(hemi, sun, lamp, sun.target);
// Real-time shadows, on High only (C5.10): the sun casts from the places and near trees onto the ground, in a box
// that follows the player. Everything else keeps its painted shading and blob shadows.
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 700 });
sun.shadow.bias = -0.0015;
sun.shadow.normalBias = 0.4;
const shadowsOn = () => !!Q.shadows && lookOn('light') && lookOn('shadows');
LOOK_SWITCHES.push(['shadows', 'Real-time shadows (High only)']);
function setShadows() {
  const on = shadowsOn();
  renderer.shadowMap.enabled = on;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft edges (C5.18)
  sun.castShadow = on;
}
scene.fog = new THREE.Fog(0xb9c7d1, 40, 600);
scene.background = new THREE.Color(0xb9c7d1);
let staticGroup = null,
  dynGroup = null;
// A plain painted surface. With the look's light on (light.js) it is a Lambert material, lit per vertex: smooth, and
// the cheapest light there is. Faceted shapes (roofs, rocks) get their facets from their geometry instead (facet()).
const std = (color, extra) =>
  lookOn('light')
    ? new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}))
    : new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 1 }, extra || {}));
// Shapes with few sides (a four-sided roof, a six-sided tower, a rock) read as cut faces, not as a blur: each face gets
// its own normals. Run over a finished group; shared geometry (marked kept) is left alone.
const FACETED = {
  ConeGeometry: 8,
  CylinderGeometry: 8,
  IcosahedronGeometry: 99,
  OctahedronGeometry: 99,
  DodecahedronGeometry: 99,
};
function facet(group) {
  if (!lookOn('light')) return group;
  group.traverse((o) => {
    const g = o.geometry;
    if (!o.isMesh || !g || g.faceted || g.kept) return;
    const most = FACETED[g.type];
    if (!most || (g.parameters && g.parameters.radialSegments > most)) return;
    const n = g.index ? g.toNonIndexed() : g;
    n.computeVertexNormals();
    n.faceted = true;
    if (n !== g) {
      g.dispose();
      o.geometry = n;
    }
  });
  return group;
}
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
    if (o.isInstancedMesh && o.dispose) o.dispose(); // its own instance buffers
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
};
// A tree: a six-sided cone with no base, which is never seen (6 triangles instead of 18). Shared by every build.
const TREE = (() => {
  const g = new THREE.ConeGeometry(1, 1, 6, 1, true),
    p = g.attributes.position,
    ix = g.index.array,
    keep = [];
  for (let i = 0; i < ix.length; i += 3) {
    const tip = (k) => p.getY(k) > 0.49 && Math.abs(p.getX(k)) + Math.abs(p.getZ(k)) < 1e-6;
    if (!(tip(ix[i]) && tip(ix[i + 1])) && !(tip(ix[i + 1]) && tip(ix[i + 2])) && !(tip(ix[i]) && tip(ix[i + 2])))
      keep.push(ix[i], ix[i + 1], ix[i + 2]);
  }
  g.setIndex(keep);
  g.dispose = () => {}; // shared: never thrown away with a scene
  g.kept = true;
  return g;
})();
// The ground's grain: soft speckles and a few darker strokes, tiled. Made once.
const GRAIN = (() => {
  const n = 64,
    d = new Uint8Array(n * n * 4);
  let a = 7;
  const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n * n; i++) {
    const v = 214 + Math.floor(r() * 41);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  for (let k = 0; k < 40; k++) {
    let x = Math.floor(r() * n),
      y = Math.floor(r() * n);
    for (let j = 0; j < 4; j++) {
      const i = ((y & (n - 1)) * n + (x & (n - 1))) * 4;
      d[i] = d[i + 1] = d[i + 2] = 190;
      x += r() < 0.5 ? 1 : 0;
      y += 1;
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
})();
const BUILD = {
  // the shadow of a place in the sky, and the place itself hanging high above it, seen from far off
  shadow(S, st) {
    const g = new THREE.Group(),
      k = (S.skies || []).find((x) => x.id === st.sky),
      kind = k ? k.kind : 'isle',
      d = new THREE.Mesh(new THREE.CircleGeometry(16, 20).rotateX(-Math.PI / 2), glow(0x1d2430, 0.35));
    d.position.y = 0.4;
    g.add(d);
    // seen from far off, through any haze: drawn without fog, a little faded, like a mountain on the skyline
    const up = new THREE.Group(),
      far = (c) => std(c, { fog: false, transparent: true, opacity: 0.85 });
    if (kind === 'moon') {
      up.add(new THREE.Mesh(new THREE.SphereGeometry(55, 18, 12), glow(0xdcdce4, 0.9)));
      up.position.y = 420;
    } else {
      const rock = new THREE.Mesh(new THREE.ConeGeometry(34, 46, 9).rotateX(Math.PI), far(0x6e6458));
      rock.position.y = -23;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 2, 9), far(kind === 'city' ? 0xe8ecf2 : 0x6f8f52));
      up.add(rock, top);
      if (kind === 'castle')
        for (const [x, z, h] of [
          [0, 0, 30],
          [12, 8, 18],
          [-12, 8, 18],
          [0, -12, 22],
        ])
          up.add(box(7, h, 7, far(0xd2cfc7), x, h / 2, z));
      if (kind === 'city')
        for (let i = 0; i < 9; i++)
          up.add(box(6, 5 + (i % 3) * 3, 6, far(0xf4f4f6), Math.cos(i) * 20, 4, Math.sin(i * 1.7) * 20));
      if (kind === 'isle') up.add(box(5, 9, 3, far(0xb9b4a6), 6, 4.5, -4), box(3, 6, 6, far(0xb9b4a6), -8, 3, 6));
      up.position.y = 130;
    }
    g.add(up);
    return g;
  },
  // someone at a small fire in the wilds (only the ashes, once they have gone on)
  wayfarer(S, st) {
    const g = new THREE.Group();
    if (fxOn()) {
      // a small fire, and someone sitting by it (gone on: only the ashes)
      if (st.gone) g.add(box(1.4, 0.15, 1.4, std(0x3a3027), 0, 0.08, 0));
      else {
        g.add(fire(0.9));
        const who = person(0x6a5a40, 0x8a7a5a, st.who ? String(st.who).length : 3);
        who.position.set(2.2, 0, 0.6);
        who.rotation.y = -1.9;
        g.add(who);
      }
      return g;
    }
    g.add(box(1.4, 0.3, 1.4, std(0x3a3027), 0, 0.15, 0));
    if (!st.gone) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 6), glow(0xffa040, 0.9));
      f.position.y = 0.9;
      const who = new THREE.Group(),
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.2, 8), std(0x6a5a40)),
        head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), std(0xd9b896));
      body.position.y = 1.1;
      head.position.y = 2.5;
      who.add(body, head);
      who.position.set(2.2, 0, 0.6);
      g.add(f, who);
    }
    return g;
  },
  // a door of old stone, alone in the land, with another sky showing through it
  door(S, st) {
    const g = new THREE.Group(),
      stone = std(0x77736a);
    g.add(box(1.2, 7, 1.2, stone, -2.6, 3.5, 0), box(1.2, 7, 1.2, stone, 2.6, 3.5, 0), box(6.6, 1.2, 1.4, stone, 0, 7.4, 0));
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(4, 6.8), glow(st.back ? 0xbfd8f0 : 0xb48ce0, 0.85));
    sky.material.side = THREE.DoubleSide;
    sky.position.y = 3.4;
    g.add(sky);
    return g;
  },
  // a place in the water: a mast for a wreck, a cluster of hulls for a floating town, a ring of standing stones for
  // the merfolk's halls or a drowned shrine, and a dark cave mouth on the shore
  seaplace(S, st) {
    const g = new THREE.Group(),
      p = (S.seaPlaces || []).find((x) => x.id === st.place),
      kind = p ? p.kind : 'wreck';
    if (kind === 'wreck') g.add(box(0.5, 9, 0.5, std(0x4a3a2a), 0, 2.5, 0), box(4, 0.3, 0.3, std(0x4a3a2a), 0, 5.5, 0));
    else if (kind === 'raft') {
      for (let i = 0; i < 7; i++) g.add(box(3, 1.2, 7, std(0x6a4a30), Math.cos(i * 0.9) * 7, 0.2, Math.sin(i * 0.9) * 7));
      g.add(box(0.3, 7, 0.3, std(0x4a3a2a), 0, 3.5, 0), box(3, 2, 0.1, std(0xe8e0c8), 1.6, 5, 0));
    } else if (kind === 'seacave') {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 1), std(0x3a3a38));
      m.scale.set(1, 0.6, 1);
      g.add(m, box(3, 2.5, 1, std(0x050608), 0, 1.2, 5.6));
    } else
      for (let i = 0; i < 6; i++) g.add(box(0.8, 3, 0.8, std(0x7a8a80), Math.cos(i * 1.05) * 4, 0.5, Math.sin(i * 1.05) * 4));
    return g;
  },
  well() {
    const lm = landmark('well');
    if (lm) return lm;
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
    const lm = landmark('cave');
    if (lm) return lm;
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
  hamlet(S, st, at) {
    // a few small houses round a well, in the region's own style when the towns are (buildings.js)
    if (townsOn() && at)
      return cachedModel('hamlet' + S.seed + ':' + at.seed, () => hamletGroup(S, at.biome, at.seed).add(BUILD.well()));
    const g = new THREE.Group(),
      wall = std(0xb8a888),
      roof = std(0x6a4a32);
    g.add(BUILD.well());
    for (const [x, z, r] of [
      [-5, -3, 0.3],
      [4, -4, -0.4],
      [5, 4, 1.2],
      [-4, 5, 2],
    ]) {
      const h = new THREE.Group();
      h.add(box(4, 2.6, 3.2, wall, 0, 1.3, 0));
      const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2, 4), roof);
      top.position.y = 3.6;
      top.rotation.y = Math.PI / 4;
      h.add(top);
      h.position.set(x, 0, z);
      h.rotation.y = r;
      g.add(h);
    }
    return g;
  },
  // the places of the plots (rules/plots.js): a den, a camp, someone's lean-to, a black stone, a herb patch
  den(s) {
    const g = BUILD.cave(s),
      bone = std(0xd8d2bf);
    for (let i = 0; i < 5; i++) g.add(box(0.2, 0.2, 1.4, bone, Math.cos(i * 1.3) * 3, 0.1, 8 + Math.sin(i * 2.1) * 1.5));
    return g;
  },
  camp() {
    const g = new THREE.Group(),
      cloth = std(0x7a5a3a),
      fire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 6), glow(0xff8a2a, 1));
    for (const [x, z, r] of [
      [-4, -2, 0.4],
      [3, -3, -0.6],
      [0, 4, 1.8],
    ]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.6, 4), cloth);
      t.position.set(x, 1.3, z);
      t.rotation.y = r;
      g.add(t);
    }
    fire.position.y = 0.7;
    g.add(
      fxOn() ? FX.fire(1.3) : fire,
      box(0.15, 4, 0.15, std(0x3a2a1a), 2, 2, 1),
      box(1.4, 0.9, 0.05, glow(0xb03a2a, 1), 2.7, 3.4, 1),
    );
    return g;
  },
  siege(s) {
    return BUILD.camp(s);
  },
  shelter() {
    const g = new THREE.Group(),
      hide = std(0x8a6a48),
      pole = std(0x4a3a2a),
      roof = box(3.4, 0.12, 3, hide, 0, 1.5, 0);
    roof.rotation.x = 0.5;
    g.add(roof, box(0.15, 2.4, 0.15, pole, -1.5, 1.2, -1.2), box(0.15, 2.4, 0.15, pole, 1.5, 1.2, -1.2));
    return g;
  },
  lost() {
    const g = new THREE.Group(),
      w = std(0x6a5038),
      lean = box(3, 0.15, 2.4, w, 0, 1.1, 0);
    lean.rotation.x = 0.6;
    g.add(lean, box(0.15, 1.6, 0.15, w, -1.4, 0.8, -0.8), box(0.15, 1.6, 0.15, w, 1.4, 0.8, -0.8));
    return g;
  },
  stone() {
    const g = new THREE.Group(),
      m = box(1.6, 7, 1.1, std(0x161616), 0, 3.3, 0);
    m.rotation.z = 0.08;
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(6, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x5c5c58 }),
    );
    ring.position.y = 0.06;
    g.add(m, ring);
    return g;
  },
  herbs() {
    const g = new THREE.Group(),
      leaf = std(0x6f9a5a);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 5), leaf);
      c.position.set(Math.cos(i * 2.4) * (1 + (i % 3)), 0.45, Math.sin(i * 2.4) * (1 + (i % 3)));
      g.add(c);
    }
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
  ruin(s, site, at) {
    if (ruinsOn() && at) return cachedModel('ruin' + s.seed + ':' + at.seed, () => ruinGroup(s, at.seed)); // laid block by block and aged (ruins.js)
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
/* Built models of places (towns, ruins, hamlets) kept between builds: after a border is crossed most of the same places
   are still in view, so they are reused rather than built again. A model's geometry and materials are shared by every
   copy and survive dispose(); the oldest are let go when there are too many. The key holds whatever the model is made
   from (the world's seed, the site, the quality and the look's switches). */
const MODELS = new Map();
const noop = () => {};
function cachedModel(key, make) {
  key += '|' + Q.label + '|' + JSON.stringify(SET.off);
  let m = MODELS.get(key);
  if (!m) {
    m = make();
    m.traverse((o) => {
      if (o.geometry) (o.geometry.dispose = noop), (o.geometry.kept = true);
      if (o.material) o.material.dispose = noop;
    });
    MODELS.set(key, m);
    if (MODELS.size > 48) {
      const [k, old] = MODELS.entries().next().value;
      MODELS.delete(k);
      old.traverse((o) => o.geometry && THREE.BufferGeometry.prototype.dispose.call(o.geometry));
    }
  }
  return m.clone();
}
const FLAT = { height: () => 0 };
// The town or a level of the locked place, as a group centred on its own middle: a floor, and a block for every wall
// tile that borders open floor. The town has no ceiling, so it can stand out of doors and be seen from far off.
function interiorGroup(map, rec, ts, id) {
  const group = new THREE.Group(),
    town = rec.kind === 'town',
    size = R.W * ts,
    T = map.terrain,
    at = (t) => (t + 0.5) * ts - size / 2,
    isWall = (x, y) => x < 0 || y < 0 || x >= R.W || y >= R.H || T[y * R.W + x] === R.WALL;
  if (town && townsOn()) {
    // built in its own style (buildings.js), with the hearth smoke over it as before
    return cachedModel('town' + V.S.seed + ':' + (id || 'town') + ':' + (V.S.realm || ''), () => {
      const g = townGroup(V.S, id || 'town', map, ts);
      hearthSmoke(g, map, ts, at);
      return g;
    });
  }
  const look = town ? null : R.levelLook(V.S) || { stone: 0x6a6660, floor: 0x3e3a35 };
  const LK = town ? null : levelKit(look); // walls and floors with shape and surface (levels.js)
  if (look && look.void) group.add(skyGround(map, ts, at, look, LK));
  else if (LK) group.add(levelFloor(LK, size, look.floor));
  else {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), std(town ? 0x8f8a80 : look.floor));
    floor.position.y = town ? 0.08 : 0;
    group.add(floor);
  }
  const stone = town ? 0xc9bba0 : look.stone,
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
    if (LK)
      return group.add(
        levelWalls(
          LK,
          ts,
          5,
          stone,
          list.map(([x, y]) => [at(x), at(y)]),
        ),
      );
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
    hearthSmoke(group, map, ts, at);
  } else if (look.ceiling !== false) {
    const ceiling = LK
      ? levelFloor(LK, size, look.roof || 0x2a2622, true)
      : new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), std(look.roof || 0x1c1a18));
    ceiling.position.y = 5;
    group.add(ceiling);
  }
  return group;
}
// hearth smoke over the hall and the inn, to find the town by from far off
function hearthSmoke(group, map, ts, at) {
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
}
// A place in the sky: a slab of ground under every tile you can stand on, and rock hanging below it, with the open air
// all round (VOID tiles are not drawn at all).
function skyGround(map, ts, at, look, LK) {
  const g = new THREE.Group(),
    T = map.terrain,
    tiles = [];
  for (let i = 0; i < T.length; i++) if (T[i] !== R.VOID) tiles.push(i);
  const slab = new THREE.InstancedMesh(
      new THREE.BoxGeometry(ts, 1.2, ts),
      LK ? levelMat({ color: look.floor, map: surface(LK.floor) }) : std(look.floor),
      Math.max(1, tiles.length),
    ),
    under = new THREE.InstancedMesh(
      new THREE.ConeGeometry(ts * 0.75, ts * 3, 5).rotateX(Math.PI),
      std(look.stone),
      Math.max(1, tiles.length),
    ),
    m = new THREE.Matrix4();
  tiles.forEach((i, n) => {
    const x = at(i % R.W),
      z = at(Math.floor(i / R.W));
    m.makeTranslation(x, -0.6, z);
    slab.setMatrixAt(n, m);
    m.makeTranslation(x, -1.2 - ts * 1.5 - ((i * 7) % 5), z);
    under.setMatrixAt(n, m);
  });
  slab.count = under.count = tiles.length;
  slab.frustumCulled = under.frustumCulled = false;
  g.add(slab, under);
  if (look.water) {
    // a town that floats: the sea all round, a little below the decks
    const sea = waterOn()
      ? seaSheet(R.W * ts * 6, 0x2f6f9a)
      : new THREE.Mesh(new THREE.PlaneGeometry(R.W * ts * 6, R.W * ts * 6).rotateX(-Math.PI / 2), std(0x2f6f9a));
    sea.position.y = -0.9;
    under.visible = false;
    g.add(sea);
  }
  return g;
}
// Things inside that can change: people, stairs, traps, and anything lying on the floor.
function person(color, hat, seed) {
  if (actorsOn()) {
    // a jointed person who breathes, looks about and walks (actors.js)
    const g = new THREE.Group();
    g.add(personActor(color, hat, seed || color));
    if (fxOn()) g.add(blob(0.5));
    return g;
  }
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
const FOLK = [0x6a6a5a, 0x7a5a3a, 0x4a5a7a, 0x8a6a4a, 0x5a6a4a, 0x8a4a3a, 0x6a5a7a, 0xa08a60];
function interiorSite(st, ts, inTown, k) {
  const g = new THREE.Group();
  if (st.kind === 'elder') g.add(person(0x8a2c2c, 0x5a1c1c, k));
  else if (st.kind === 'inn') g.add(person(0x7a5a2e, 0, k), box(1.6, 0.9, 0.8, std(0x5a3d22), 1.2, 0.45, 0));
  else if (st.kind === 'shop')
    g.add(
      person(0x2f5f8f, 0, k),
      box(1.8, 0.9, 0.9, std(0x6b4a2a), 0, 0.45, -1.1),
      box(0.4, 0.4, 0.4, std(0xc9a227), -0.4, 1.1, -1.1),
    );
  else if (st.kind === 'well') g.add(BUILD.well());
  else if (st.kind === 'folk')
    g.add(person(actorsOn() ? FOLK[hashStr(st.name || '') % FOLK.length] : 0x6a6a5a, 0, hashStr(st.name || '')));
  else if (st.kind === 'grave') g.add(box(0.5, 1, 0.2, std(0x8a8a86), 0, 0.5, 0), box(1.2, 0.15, 2, std(0x5a5650), 0, 0.08, 0.9));
  else if (R.C.townLife && R.byId(R.C.townLife.services, st.kind)) {
    // a person at the door of their trade, and a painted sign above it
    const sv = R.byId(R.C.townLife.services, st.kind);
    g.add(person(sv.color, sv.hat, k), box(1.4, 0.8, 0.12, std(sv.hat), 0, 3.4, -ts / 2 + 0.2));
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
  else if (st.kind === 'landing' || st.kind === 'skyway') {
    // a post with a pennant where you came in; a stair is a ring of gold, as below
    if (st.kind === 'landing')
      g.add(box(0.15, 3, 0.15, std(0x5a4632), 0, 1.5, 0), box(1, 0.6, 0.05, glow(0xe0a84a, 0.9), 0.55, 2.7, 0));
    const marker = new THREE.Mesh(new THREE.TorusGeometry(ts * 0.42, 0.06, 6, 24).rotateX(Math.PI / 2), glow(0xe0a84a, 0.6));
    marker.position.y = 0.05;
    g.add(marker);
  } else if (st.kind === 'trader') g.add(person(0x3a6a9a, 0xd8dde4, k));
  // a plot's places, when a plot puts them down below, up above or under the water
  else if (st.kind === 'throne')
    g.add(
      box(1.6, 0.6, 1.4, std(0x5a1c1c), 0, 0.3, 0),
      box(1.6, 2.6, 0.3, std(0x5a1c1c), 0, 1.3, -0.6),
      box(2.2, 0.15, 2, std(0x8a7a50), 0, 0.05, 0),
    );
  else if (st.kind === 'stone') g.add(box(0.9, 3.4, 0.7, std(0x111111), 0, 1.7, 0));
  else if (st.kind === 'herbs')
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 5), std(0x6fae4f));
      c.position.set(Math.cos(i) * 0.7, 0.3, Math.sin(i * 1.3) * 0.7);
      g.add(c);
    }
  else if (st.kind === 'den')
    for (let i = 0; i < 5; i++) g.add(box(0.7, 0.12, 0.12, std(0xe8e0d0), Math.cos(i * 2) * 0.6, 0.06, Math.sin(i * 2) * 0.6));
  else if (st.kind === 'camp' || st.kind === 'lost') {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 4), std(st.kind === 'camp' ? 0x7a5a3a : 0x8a9a6a));
    tent.position.y = 0.9;
    g.add(tent);
  } else if (st.kind === 'cellar') {
    g.add(box(ts * 0.8, 0.04, ts * 0.8, new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, 0.02, 0));
    const marker = new THREE.Mesh(new THREE.TorusGeometry(ts * 0.42, 0.06, 6, 24).rotateX(Math.PI / 2), glow(0xe0a84a, 0.5));
    marker.position.y = 0.05;
    g.add(marker);
  } else if (st.kind === 'ruin')
    g.add(box(1.4, 2.2, 1.4, std(0xa49f92), 0, 1.1, 0), box(2.6, 0.5, 0.6, std(0xa49f92), 0.6, 0.25, 1));
  else if (st.kind === 'spring' || st.kind === 'pool') {
    const w = new THREE.Mesh(
      new THREE.CircleGeometry(ts * 0.4, 12).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x3f8fc0 }),
    );
    w.position.y = 0.05;
    g.add(w);
  }
  return g;
}
// Which frame the player is in: the region's own, or (inside the town) one centred on the town. Nothing is rebuilt
// when this changes; the same scene is simply looked at from the other origin.
function applyFrame() {
  const kind = R.areaRec(V.S).kind,
    inTown = kind === 'town' && V.townAt;
  if (R.isLevel(V.S)) return;
  const was = { x: FR.x, y: FR.y, z: FR.z };
  FR.x = inTown ? V.townAt.x : 0;
  FR.y = inTown ? V.townAt.y : 0;
  FR.z = inTown ? V.townAt.z : 0;
  setGeometry(inTown ? 'town' : 'region');
  // everyone remembered moves with the frame, however it moved (the gate, an action, a jump): they walk on
  if (was.x !== FR.x || was.y !== FR.y || was.z !== FR.z) shiftActors(was.x - FR.x, was.z - FR.z, was.y - FR.y);
  const sh = V.shift || { x: 0, z: 0 };
  staticGroup.position.set(-FR.x - sh.x, -FR.y, -FR.z - sh.z);
  V.terrain = inTown ? { height: (x, z) => V.base.height(x + FR.x, z + FR.z) - FR.y } : V.base;
}
function buildStatic() {
  setShadows();
  const t0 = performance.now();
  buildStaticInner();
  perfBuild(performance.now() - t0);
}
function buildStaticInner() {
  pending = null;
  V.raw = null;
  V.shift = { x: 0, z: 0 };
  if (R.isLevel(V.S)) {
    dispose(staticGroup);
    staticGroup = new THREE.Group();
    scene.add(staticGroup);
    V.townAt = V.townId = null;
    V.towns = [];
    setGeometry('vault');
    FR.x = FR.y = FR.z = 0;
    V.base = V.terrain = FLAT;
    staticGroup.add(facet(interiorGroup(V.S, R.areaRec(V.S), G.ts)));
    return;
  }
  const g = buildLand(V.S, true);
  let r;
  while (!(r = g.next()).done);
  install(r.value);
}
// Put a finished land on screen in place of the old one.
function install(res) {
  dispose(staticGroup);
  staticGroup = res.group;
  scene.add(staticGroup);
  V.base = res.base;
  V.towns = res.towns;
  V.raw = null;
  V.shift = { x: 0, z: 0 };
  townsHere();
  applyFrame();
}
// The town of the player's region, which can be walked into, in the frame the player is in.
function townsHere() {
  const t = R.townInRegion(V.S, R.outdoorRec(V.S).id),
    id = t ? t.id || 'town' : null,
    w = (V.towns || []).find((x) => x.id === id);
  V.townAt = w ? { x: w.x - V.shift.x, y: w.y, z: w.z - V.shift.z } : null;
  V.townId = w ? id : null;
}
/* Crossing a border without a hitch. The old land is still the right land: the new region lay in its margin. So it
   stays on screen, moved one region over, while the new land is built a few milliseconds a frame (stepBuild, called
   from the frame loop); then the two are swapped. rx, rz: how many regions across and down the player moved. */
let pending = null;
function buildStaticSoon(rx, rz) {
  if (R.isLevel(V.S) || !V.base || V.base === FLAT) return buildStatic();
  if (!V.raw) V.raw = V.base; // the land the old group was built with, and its frame
  const d = { x: V.shift.x + rx * 2 * HALF, z: V.shift.z + rz * 2 * HALF },
    o = V.raw;
  V.shift = d;
  V.base = {
    land: o.land,
    height: (x, z) => o.height(x + d.x, z + d.z),
    level: (x, z) => o.level(x + d.x, z + d.z),
    share: o.share && o.share.map((f) => (x, z) => f(x + d.x, z + d.z)),
    waterAt: o.waterAt && ((x, z) => o.waterAt(x + d.x, z + d.z)),
  };
  townsHere();
  applyFrame();
  pending = { gen: buildLand(V.S, false), busy: 0 };
}
// Spend up to `budget` milliseconds on the land being built; swap it in when it is done.
function stepBuild(budget) {
  if (!pending) return false;
  const t0 = performance.now();
  let r;
  do r = pending.gen.next();
  while (!r.done && performance.now() - t0 < budget);
  pending.busy += performance.now() - t0;
  pending.slices = (pending.slices || 0) + 1;
  pending.longest = Math.max(pending.longest || 0, performance.now() - t0);
  if (!r.done) return true;
  const busy = pending.busy,
    longest = pending.longest,
    slices = pending.slices;
  pending = null;
  install(r.value);
  perfBuild(busy);
  // a build spread over frames: its total, how many frames it took, and the most any one frame spent on it
  PF.parts = { spread: busy, frames: slices, longest };
  buildDynamic();
  return true;
}
// The land of the region the player is in (with its margin of the regions around), built into a group of its own and
// returned with its height field and towns, touching nothing else: so it can be built all at once, or a little each
// frame while the old land stays on screen (buildStaticSoon). It yields every so often.
function* buildLand(S, timed) {
  const group = new THREE.Group();
  let tp = performance.now();
  const part = (k) => {
    if (!timed) return;
    const n = performance.now();
    PF.parts[k] = n - tp;
    tp = n;
  };
  const base = yield* makeTerrainG(S);
  part('land');
  yield;
  const T = base,
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
  // each spring, listed under every tile it greens, so a point looks only at the springs near it
  const springsNear = {},
    NONE = [];
  for (const sp of springs)
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const k = T.etile(sp.x + dx * TS, sp.z + dz * TS);
        (springsNear[k] = springsNear[k] || []).push(sp);
      }
  for (const k in springsNear) springsNear[k] = [...new Set(springsNear[k])];
  const painted = lookOn('light'),
    bed = new THREE.Color(),
    MUD = new THREE.Color(0x3a3226);
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
      for (let mi = 0; mi < 3; mi++)
        if (mv[mi] > 0)
          // under real water the bed is dark mud, the water itself drawn over it (water.js)
          cb.lerp(
            mi === 1 && T.water ? bed.copy(cols[4]).multiplyScalar(0.3).lerp(MUD, 0.5) : cols[3 + mi],
            mv[mi] * (mi === 0 ? 0.7 : 1),
          );
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
    for (const s of springsNear[T.etile(x, z)] || NONE) {
      const dx = s.x - x,
        dz = s.z - z;
      if (dx > 34 || dx < -34 || dz > 34 || dz < -34) continue;
      const d = Math.hypot(dx, dz);
      if (d < 34) c.lerp(lush, (1 - d / 34) * 0.8);
    }
    if (painted) {
      // the storybook palette: the land's colours a little richer than life
      const L = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b,
        f = 1 + 0.35 * clamp((0.85 - L) / 0.35, 0, 1); // pale snow and salt stay pale
      c.setRGB(L + (c.r - L) * f, L + (c.g - L) * f, L + (c.b - L) * f);
    }
    return c;
  };
  // One ground mesh from a height grid. The coarse one leaves out the middle, where the fine one lies.
  // One ground mesh from a height grid, laid out the way three's PlaneGeometry would be (rows down the z axis), but
  // built directly: no normals (flat shading takes each face's from the screen) and nothing to rotate afterwards. The
  // coarse one leaves out the middle, where the fine one lies.
  const ground = function* (g, sink, hollow) {
    const n = g.n,
      N1 = n + 1,
      cnt = N1 * N1,
      P = new Float32Array(cnt * 3),
      UV = new Float32Array(cnt * 2),
      col = new Float32Array(cnt * 3),
      keep = HALF - g.cell * 1.5,
      inner = (x, z) => Math.abs(x) < keep && Math.abs(z) < keep;
    const smooth = lookOn('light'),
      painted = paintOn(),
      NR = smooth ? new Float32Array(cnt * 3) : null,
      SF = painted ? new Float32Array(cnt * 4) : null,
      sw = [0, 0, 0, 0],
      H = (ix, iz) => g.h[clampI(iz, n) * N1 + clampI(ix, n)];
    for (let iz = 0; iz <= n; iz++) {
      const z = -g.half + iz * g.cell;
      for (let ix = 0; ix <= n; ix++) {
        const x = -g.half + ix * g.cell,
          k = iz * N1 + ix;
        P[k * 3] = x;
        P[k * 3 + 1] = g.h[k] - sink;
        P[k * 3 + 2] = z;
        UV[k * 2] = ix / n;
        UV[k * 2 + 1] = 1 - iz / n;
        if (hollow && Math.abs(x) < keep - g.cell && Math.abs(z) < keep - g.cell) continue; // never drawn
        const c = colourAt(x, z);
        let shade = 1;
        if (smooth) {
          // a smooth normal from the slope across the neighbouring points, so the land shows no triangles
          const hx = H(ix + 1, iz) - H(ix - 1, iz),
            hz = H(ix, iz + 1) - H(ix, iz - 1),
            d = 2 * g.cell,
            nl = Math.hypot(hx, d, hz);
          NR[k * 3] = -hx / nl;
          NR[k * 3 + 1] = d / nl;
          NR[k * 3 + 2] = -hz / nl;
          // painted shading baked into the colour: hollows a little darker, crests a little lighter, and steep ground
          // toward bare earth, as a painter would lay it in
          const around = (H(ix + 2, iz) + H(ix - 2, iz) + H(ix, iz + 2) + H(ix, iz - 2)) / 4,
            bulge = clamp((g.h[k] - around) / (g.cell * 0.9), -1, 1),
            steep = 1 - d / nl;
          shade = 1 + bulge * 0.16 - steep * 0.22;
          if (painted) {
            // what kind of ground this is, for its painted grain (paint.js)
            surfaceOf(c, steep, sw);
            SF.set(sw, k * 4);
          }
        }
        col[k * 3] = c.r * shade;
        col[k * 3 + 1] = c.g * shade;
        col[k * 3 + 2] = c.b * shade;
      }
      if ((iz & 3) === 3) yield;
    }
    const idx = new Uint32Array(n * n * 6);
    let m = 0;
    for (let iz = 0; iz < n; iz++)
      for (let ix = 0; ix < n; ix++) {
        const a = iz * N1 + ix,
          b = a + N1,
          c = b + 1,
          d = a + 1,
          za = -g.half + iz * g.cell,
          xa = -g.half + ix * g.cell,
          zb = za + g.cell,
          xd = xa + g.cell;
        // in the coarse ground, a triangle wholly under the fine ground is left out
        if (!hollow || !(inner(xa, za) && inner(xa, zb) && inner(xd, za))) {
          idx[m++] = a;
          idx[m++] = b;
          idx[m++] = d;
        }
        if (!hollow || !(inner(xa, zb) && inner(xd, zb) && inner(xd, za))) {
          idx[m++] = b;
          idx[m++] = c;
          idx[m++] = d;
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    geo.setIndex(new THREE.BufferAttribute(idx.subarray(0, m), 1));
    yield;
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // with the old light, no vertex normals: flat shading takes each face's from the screen
    if (smooth) geo.setAttribute('normal', new THREE.BufferAttribute(NR, 3));
    if (painted) geo.setAttribute('surf', new THREE.BufferAttribute(SF, 4));
    const mat = smooth
      ? groundMaterial()
      : new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
    if (Q.grain && !painted) {
      // a fine pattern of light and dark in the ground, about every six metres, so near ground reads as ground
      const tex = GRAIN.clone();
      tex.needsUpdate = true;
      tex.repeat.set((g.half * 2) / 6, (g.half * 2) / 6);
      mat.map = tex;
    }
    const gm = new THREE.Mesh(geo, mat);
    gm.userData.ground = !hollow; // only the fine ground takes shadows (they never reach the far land)
    gm.userData.farGround = hollow;
    group.add(gm);
  };
  yield* ground(T.fine, 0, false);
  yield* ground(T.coarse, SINK, true);
  if (T.water) {
    // rivers, lakes and the sea over their beds (water.js), tinted with each land's own water colour
    const tint = (x, z, out) => {
      out.setRGB(0, 0, 0);
      let tot = 0;
      for (let b = 0; b < pal.length; b++) {
        const w = pal.length === 1 ? 1 : T.share[b](x, z);
        if (w < 0.002) continue;
        out.r += pal[b].cols[4].r * w;
        out.g += pal[b].cols[4].g * w;
        out.b += pal[b].cols[4].b * w;
        tot += w;
      }
      return out.multiplyScalar(1 / (tot || 1));
    };
    yield;
    for (const [g, sink, hollow] of [
      [T.fine, 0, false],
      [T.coarse, SINK, true],
    ]) {
      const w = yield* waterMesh(T, g, sink, hollow, HALF - g.cell * 1.5, tint);
      if (w) group.add(w);
      yield;
    }
  }
  part('ground');
  // Rocks and trees, tile by tile, from a source that depends only on where the tile is in the world.
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    rocks = pal.map(() => []),
    trees = pal.map(() => []),
    treesNear = pal.map(() => []),
    shaped = plantsOn(),
    tints = pal.map(() => ({ n: [], f: [] }));
  // every town in view (a world may have several); V.townAt is the one in the player's region, which can be walked into
  const townHalf = (R.W * TOWN_TS) / 2,
    towns = land.sites
      .filter((q) => q.st.kind === 'town')
      .map((q) => ({
        id: q.st.town || 'town',
        here: q.here,
        x: centre(q.x),
        y: T.height(centre(q.x), centre(q.y)),
        z: centre(q.y),
      }));
  const nearSite = (x, z) => {
    for (const t of towns) if (Math.abs(x - t.x) < townHalf + 4 && Math.abs(z - t.z) < townHalf + 4) return true;
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
  for (let ey = 0; ey < EW; ey++) {
    if ((ey & 3) === 3) yield;
    for (let ex = 0; ex < EW; ex++) {
      const x = ex - MARGIN,
        y = ey - MARGIN,
        en = ey * EW + ex,
        bi = land.biome[en],
        bio = land.biomes[bi],
        r = T.tileRand(x, y, 1),
        x0 = x * TS - HALF,
        z0 = y * TS - HALF,
        far = x < -8 || y < -8 || x >= R.W + 8 || y >= R.H + 8,
        rockShare = far ? Q.rocksF : Q.rocksN;
      for (let n = Math.floor((bio.rocky !== undefined ? bio.rocky : bio.id === 'salt' ? 0.62 : 0.35) + r()); n > 0; n--) {
        const px = x0 + r() * TS,
          pz = z0 + r() * TS,
          s = 0.3 + r() * r() * (1.5 + T.level(px, pz) * 1.6),
          sy = s * (0.6 + r() * 0.6),
          rx = r() * 3,
          ry = r() * 6.28,
          rz = r() * 3;
        // the same dice are rolled at every quality, so a rock that is drawn is always in the same place
        if (r() < rockShare && !nearSite(px, pz)) put(rocks[bi], px, pz, s, sy, s * 0.2, rx, ry, rz);
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
      for (let j = 0, n = Math.ceil(tr.n * (far ? Q.treesF : Q.treesN)); j < n; j++) {
        const px = x0 + r() * TS,
          pz = z0 + r() * TS,
          hgt = tr.h[0] + r() * (tr.h[1] - tr.h[0]),
          wd = tr.w * (0.7 + r() * 0.6),
          ry = r() * 6.28;
        if (nearSite(px, pz)) continue;
        if (shaped) {
          // a shaped tree stands from its foot, leans a little, and is a shade lighter or darker than its neighbours
          const lean = (r() - 0.5) * 0.08,
            band = Math.ceil(Q.treeNear / TS),
            near = Q.treeNear > 0 && x >= -band && y >= -band && x < R.W + band && y < R.H + band, // could come near
            shade = 0.85 + r() * 0.3;
          e.set(lean, ry, -lean);
          q.setFromEuler(e);
          sc.set(wd, hgt, wd);
          v.set(px, T.height(px, pz) - 0.3, pz);
          m.compose(v, q, sc);
          const list = near ? treesNear[bi] : trees[bi];
          for (let i = 0; i < 16; i++) list.push(m.elements[i]);
          (near ? tints[bi].n : tints[bi].f).push(shade, shade * (0.95 + r() * 0.1), shade * 0.95);
          continue;
        }
        e.set(0, ry, 0);
        q.setFromEuler(e);
        sc.set(wd, hgt, wd);
        v.set(px, T.height(px, pz) + hgt / 2 - 0.3, pz);
        m.compose(v, q, sc);
        for (let i = 0; i < 16; i++) trees[bi].push(m.elements[i]);
      }
    }
  }
  {
    // grass and flowers round the player (grass.js), re-scattered as they walk (treesNear)
    const gr = makeGrass(
      group,
      T,
      pal.map((p) => p.lush),
      towns,
      townHalf,
      S.seed,
    );
    if (gr) group.userData.grass = gr;
  }
  part('trees');
  const instances = (geom, mat, list, tint) => {
    if (!list.length) return;
    const inst = new THREE.InstancedMesh(geom, mat, list.length / 16);
    inst.instanceMatrix.array.set(list);
    if (tint) inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(tint), 3);
    inst.frustumCulled = false; // its instances are spread over the whole land
    group.add(inst);
  };
  yield;
  pal.forEach((p, bi) => {
    const rock = new THREE.IcosahedronGeometry(1, 0);
    rock.computeVertexNormals(); // one normal per face: a rock with cut faces
    rock.faceted = true;
    instances(rock, std(p.cols[2].clone().multiplyScalar(0.85)), rocks[bi]);
    const forest = land.biomes[bi].forest;
    if (shaped) {
      instances(treeModel(forest, true), treeMat(forest), trees[bi], tints[bi].f);
      const lod = makeLOD(group, forest, treesNear[bi], tints[bi].n);
      if (lod) (group.userData.lods = group.userData.lods || []).push(lod);
    } else instances(TREE, std(forest.tree.color), trees[bi]);
  });
  for (const site of land.sites) {
    if (site.st.kind !== 'spring') yield;
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
      group.add(w);
      continue;
    }
    if (st.kind === 'town') {
      // the town itself, wall by wall, standing where it is
      const id = st.town || 'town',
        tw = towns.find((t) => t.id === id);
      if (!S.areas[id] || !R.mapOf(S, id) || !tw) continue;
      const g = interiorGroup(R.mapOf(S, id), S.areas[id], TOWN_TS, id);
      g.position.set(tw.x, tw.y, tw.z);
      group.add(g);
      continue;
    }
    if (!BUILD[st.kind]) continue; // a kind of place with no model yet is still on the map
    const g =
      (st.kind !== 'well' && st.kind !== 'cave' && landmark(st.kind, S, st)) ||
      BUILD[st.kind](S, st, {
        biome: land.biomes[land.biome[(site.y + MARGIN) * EW + site.x + MARGIN]],
        seed: S.seed ^ Math.imul(site.k + 1, 2654435761) ^ (land.cx * 977 + land.cy * 131),
      });
    g.position.set(x, T.height(x, z), z);
    if (st.kind !== 'beacon') g.rotation.y = (site.k % 7) * 0.9;
    group.add(g);
  }
  facet(group);
  if (shadowsOn())
    group.traverse((o) => {
      if (!o.isMesh || o.material.transparent || o.material.isMeshBasicMaterial) return;
      if (o.userData.ground) o.receiveShadow = true;
      else if (o.userData.farGround) return;
      else if (!o.isInstancedMesh || o.userData.near) o.castShadow = true; // not the land's far trees and rocks
    });
  part('places');
  return { group, base, towns };
}
// Trees near the player in their full shape, the rest in their far one (plants.js). Called every frame; it does work
// only when the player has walked a little way. The land's group may be shifted (a border just crossed) or seen from
// the town's frame, so the player is put into the land's own coordinates first.
function treesNear(force) {
  const lods = (staticGroup && staticGroup.userData.lods) || [];
  if (!staticGroup) return;
  const x = P.x - staticGroup.position.x,
    z = P.z - staticGroup.position.z;
  for (const rec of lods) updateLOD(rec, x, z, Q.treeNear, force);
  if (staticGroup.userData.grass) staticGroup.userData.grass.update(x, z, force);
}
const fxOn = () => lookOn('fx') && lookOn('light');
LOOK_SWITCHES.push(['fx', 'Fire, water and shadows']);
// each townsperson's own id: the rules keep the same object for them as they move about (two may share a name)
const FOLK_IDS = new WeakMap();
let folkN = 0;
const folkId = (st) => FOLK_IDS.get(st) || (FOLK_IDS.set(st, ++folkN + ':' + st.name), FOLK_IDS.get(st));
const HP = new Map(); // creatures' health when last drawn, to see a hit land
const hashStr = (s) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const REEDS = { name: 'reeds', tree: { color: 0x6f8f48 } }; // round a spring, drawn as a clump of grass
// Everything that can change, for every area in view: outdoors that is the region and, if it stands here, the town.
function buildDynamic() {
  clearActors();
  dispose(dynGroup);
  dynGroup = new THREE.Group();
  scene.add(dynGroup);
  if (R.isLevel(V.S))
    drawArea(V.S.area, 'vault'); // any level below or above the world
  else {
    const rec = R.outdoorRec(V.S);
    drawArea(rec.id, 'region');
    if (V.townAt && V.townId && V.S.areas[V.townId]) drawArea(V.townId, 'town');
    // the creatures of the regions round about, near the borders (built ahead by the rules; never built here)
    if (actorsOn())
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nid = R.regionId(V.S, R.wrap(rec.cx + dx, V.S.world.cols), R.wrap(rec.cy + dy, V.S.world.rows));
          if (nid !== rec.id && V.S.areas[nid] && V.S.areas[nid].map !== undefined && R.mapOf(V.S, nid))
            drawArea(nid, 'region', { x: dx * 2 * HALF, z: dy * 2 * HALF });
        }
  }
  facet(dynGroup);
  settleActors(dynGroup);
}
// nb: for a neighbouring region, its offset in metres; only its creatures near the border are drawn, so that they are
// already there, and walking, when the border is crossed.
function drawArea(id, kind, nb) {
  const map = R.mapOf(V.S, id),
    current = id === V.S.area,
    indoor = kind !== 'region',
    ts = kind === 'town' ? TOWN_TS : kind === 'vault' ? G.ts : TS,
    half = (R.W * ts) / 2,
    off = indoor ? ts / 28 : 1;
  // a tile of this area, plus an offset in metres, as a point in the frame the player is in
  const at = (k, dx, dz) => {
    let x = ((k % R.W) + 0.5) * ts - half + (dx || 0) + (nb ? nb.x : 0),
      z = (Math.floor(k / R.W) + 0.5) * ts - half + (dz || 0) + (nb ? nb.z : 0),
      y = 0;
    if (kind === 'town') {
      x += V.townAt.x;
      z += V.townAt.z;
      y = V.townAt.y + 0.08;
    } else if (kind === 'region') y = V.base.height(x, z);
    return [x - FR.x, y - FR.y, z - FR.z];
  };
  const ground = (x, z) => V.terrain.height(x, z);
  if (!indoor && !nb)
    for (const k in map.sites) {
      const st = map.sites[k];
      if (st.kind !== 'spring') continue;
      const [x, y, z] = at(+k),
        w = fxOn()
          ? water(4.6, st.known && st.foul)
          : new THREE.Mesh(
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
          c = plantsOn()
            ? new THREE.Mesh(treeModel(REEDS, false), treeMat(REEDS))
            : new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.4 + (i % 3), 5), std(0x587a40));
        if (plantsOn()) {
          c.scale.set(1.3, 2.2 + (i % 3) * 0.6, 1.3);
          c.position.set(rx, ground(rx, rz) - 0.2, rz);
        } else c.position.set(rx, ground(rx, rz) + 1.1, rz);
        dynGroup.add(c);
      }
    }
  if (indoor)
    for (const k in map.sites) {
      const st = map.sites[k],
        [x, y, z] = at(+k),
        g = interiorSite(st, ts, kind === 'town', +k);
      g.position.set(x, y, z);
      if (st.kind === 'elder' || st.kind === 'inn' || st.kind === 'shop') g.rotation.y = Math.atan2(P.x - x, P.z - z);
      else if (st.kind === 'folk') g.rotation.y = (+k * 2.4) % 6.28;
      dynGroup.add(g);
      let who = null; // the person's figure, within the group of their place
      if (actorsOn()) g.traverse((o) => (who = who || (o.userData.actor ? o : null)));
      if (who)
        track(
          g,
          who,
          st.kind === 'folk'
            ? // a townsperson is known by name, wherever the rules have them stand: they walk there
              { key: 'folk:' + id + ':' + folkId(st), speed: 1.4, roam: ts * 0.3, rise: false }
            : { key: 'site:' + id + ':' + k },
        );
    }
  const camp = !nb && V.S.camp && V.S.camp.area === id ? V.S.camp.i : null;
  for (const k in nb ? {} : map.depots) {
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
    if (nb) {
      // a neighbour's creature: only those near enough to see
      const [cx, , cz] = at(c.y * R.W + c.x);
      if (Math.hypot(cx - P.x, cz - P.z) > 360) continue;
    }
    const sp = R.spOf(V.S, c),
      g = new THREE.Group(),
      col = sp.rare === 'gilded' ? 0xd9a520 : sp.rare === 'docile' ? 0x7fae7a : R.biomeOf(V.S).creatureTint,
      mat = std(col),
      k = (sp.rare === 'elder' ? 1.45 : 1) * (0.9 + c.tier * 0.12),
      // its eyes tell its temper at a glance: red hunts you, orange guards its ground, yellow keeps to itself
      eye = new THREE.MeshBasicMaterial({
        color:
          sp.rare === 'docile' ? 0x9fe39f : sp.temper === 'hunter' ? 0xff3b2f : sp.temper === 'skittish' ? 0xffe06a : 0xff9a2a,
        fog: false,
      });
    if (actorsOn()) {
      g.add(creatureActor(sp.form, col, eye.color.getHex()));
      if (fxOn()) g.add(blob({ hound: 0.9, brute: 1.4, wight: 0.7, serpent: 1.1 }[sp.form] || 1));
    } else if (sp.form === 'hound')
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
    if (actorsOn()) {
      // walks from where it was drawn; in a fight it lunges, and flinches when hurt
      const hurt = HP.has(c.id) && c.hp < HP.get(c.id);
      HP.set(c.id, c.hp);
      track(g, g.children[0], {
        key: 'c:' + c.id,
        speed: 4.5,
        fight: fighting,
        hurt,
        roam: indoor ? 0.8 : 7,
        // outdoors its feet keep to the ground as it goes (the lowest point under its body, as when it stands)
        ground: indoor
          ? null
          : (gx, gz) => Math.min(ground(gx + 1.2, gz), ground(gx - 1.2, gz), ground(gx, gz + 1.2), ground(gx, gz - 1.2)),
      });
    }
  }
  if (camp !== null) {
    const [x, y, z] = at(camp, 5, 3),
      t = new THREE.Mesh(new THREE.ConeGeometry(3, 3.6, 4), std(0xd9a24a));
    t.position.set(x, y + 1.8, z);
    if (fxOn()) {
      // your camp: the tent of cloth, and a fire before it that lights up the night
      t.material = kitMat({ vertexColors: false, color: 0xd9a24a, map: surface('cloth') });
      const f = fire(1);
      f.position.set(x - 3.5, ground(x - 3.5, z + 3) + 0.05, z + 3);
      dynGroup.add(f);
    }
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
  buildStaticSoon,
  stepBuild,
  buildDynamic,
  applyFrame,
  resize,
  treesNear,
  shadowsOn,
};
