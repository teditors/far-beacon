/* Towns and hamlets, built in their own style (commission 5). The rules give a town as a grid of wall and floor tiles;
   every block of wall is a building. Here each block becomes a house of its town's climate (what it is built of, its
   roof), dressed by the town's trade (what stands in the streets) and coloured by its custom (banners, lanterns,
   flowers, fences), from the data in content/townlooks.js. The elder's hall, the inn and the shop each get their
   marks. All of a town is merged into six meshes (walls, roofs, woodwork, stone, cloth, lights): six draw calls a town.
   At night its windows and lamps glow (setNight, called each frame). */
import { R } from './ctx.js';
import { P, WIND, kit, kitMat } from './kit.js';
import { addOutline } from './outline.js';
import { surface } from './paint.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';

LOOK_SWITCHES.push(['towns', 'Towns built in their own style']);
const townsOn = () => lookOn('towns') && lookOn('light');

// small seeded dice for one town
function dice(seed) {
  let a = seed | 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.pick = (list) => list[Math.floor(r() * list.length) % list.length];
  return r;
}
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h | 0;
};
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

/* ---------- the style of a town ---------- */
function climateOf(biome) {
  const L = R.C.townLooks;
  return (biome && biome.parts && biome.parts.climate) || (biome && L.biomeClimate[biome.id]) || 'temperate';
}
function styleOf(S, townId, biome) {
  const L = R.C.townLooks,
    t = townId ? R.townById(S, townId) : null,
    culture = t ? (t === S.town ? S.townCulture : t.culture) : null,
    area = t && t.area;
  if (!biome) biome = area && S.areas[area] ? R.byId(R.C.biomes, S.areas[area].biome) : R.biomeOf(S);
  const climate = climateOf(biome),
    st = Object.assign({ climate }, L.climates[climate] || L.climates.temperate),
    off = S.off && S.off.towns,
    tr = (culture && !off && L.trades[culture.trade]) || {},
    cu = (culture && !off && L.customs[culture.custom]) || {},
    ra = (culture && !off && culture.rare && L.rares[culture.rare]) || {};
  Object.assign(st, {
    props: tr.props || ['barrel', 'crates'],
    chimneys: tr.chimneys !== undefined ? tr.chimneys : 0.3,
    awning: tr.awning || '#8a5a3a',
    banners: cu.banners || ['#8a3a2a'],
    lanterns: cu.lanterns !== undefined ? cu.lanterns : 1,
    flowers: !!cu.flowers,
    fences: !!cu.fences,
    tower: !!cu.tower,
    shrine: !!cu.shrine,
    stones: !!cu.stones,
  });
  for (const k in ra) st[k] = ra[k];
  if (ra.walls) st.wallMix = [ra.walls];
  if (ra.lost) {
    // the people who never fell build in their own stone, under their own sign
    const stone = R.trait(S, 'style').stone;
    st.walls = 'stone';
    st.wall = [stone, stone];
    st.banners = [R.trait(S, 'affinity').color];
  }
  st.banners = st.banners.map((c) => (c === 'god' ? hex(R.godOf(S).color) : c));
  st.biome = biome;
  return st;
}

/* ---------- materials shared by every town: lit windows and lamp halos change with the hour ---------- */
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
GLOW.dispose = () => {};
let HALO = null;
function haloMat() {
  if (HALO) return HALO;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'),
    grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,214,150,1)');
  grad.addColorStop(0.25, 'rgba(255,180,90,0.45)');
  grad.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  HALO = new THREE.PointsMaterial({
    map: tex,
    size: 7,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  HALO.dispose = () => {};
  return HALO;
}
// night: 0 by day, 1 at night. Windows go from dark glass to warm light, the halos round lamps fade in.
function setNight(night) {
  GLOW.color.setScalar(0.22 + 0.78 * night);
  if (HALO) {
    HALO.opacity = night * 0.85;
    HALO.visible = night > 0.05;
  }
}

/* Smoke from the chimneys: a few soft puffs over each, rising, growing, drifting with the wind and fading, all of it
   worked out on the graphics card from the time, so a whole town's smoke is one draw call and costs the processor
   nothing. */
let PUFF = null;
function smokeOf(at, color) {
  const n = 7,
    pos = new Float32Array((at.length / 3) * n * 3),
    seed = new Float32Array((at.length / 3) * n);
  for (let c = 0, q = 0; c < at.length; c += 3)
    for (let i = 0; i < n; i++, q++) {
      pos.set([at[c], at[c + 1], at[c + 2]], q * 3);
      seed[q] = i / n + (c % 7) * 0.13;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  if (!PUFF) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d'),
      grad = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, 32, 32);
    PUFF = new THREE.CanvasTexture(c);
  }
  const m = new THREE.PointsMaterial({
    map: PUFF,
    color: color || 0xcfcac2,
    size: 4,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.sTime = WIND.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float seed;\nuniform float sTime;\nvarying float vFade;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float ph = fract(sTime * 0.08 + seed);
transformed.y += ph * 13.0;
transformed.x += ph * ph * 6.0 + sin(sTime * 0.7 + seed * 9.0) * 0.6;
transformed.z += ph * ph * 2.0;
vFade = sin(ph * 3.14159);`,
      )
      .replace('gl_PointSize = size;', 'gl_PointSize = size * (0.5 + ph * 2.0);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
  };
  m.customProgramCacheKey = () => 'smoke';
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* ---------- one town ---------- */
const FH = 3.1; // metres a storey
// a point turned by ry about the y axis, as three turns things
const turn = (lx, lz, ry) => [lx * Math.cos(ry) + lz * Math.sin(ry), -lx * Math.sin(ry) + lz * Math.cos(ry)];

// A kit for each wall and roof texture a town uses (keyed 'name:variant'); K.wall and K.roof send parts to the one the
// building being made has chosen (K.wall.cur), so every house can be of its own stuff at one draw call per texture.
function switchKit(table, cur) {
  const self = {
    cur,
    add(...a) {
      (table[self.cur] = table[self.cur] || kit()).add(...a);
      return self;
    },
  };
  return self;
}
function kits(st) {
  const walls = {},
    roofs = {};
  return {
    ground: kit(),
    cobble: kit(),
    walls,
    roofs,
    wall: switchKit(walls, st.walls + ':0'),
    roof: switchKit(roofs, st.roofTex + ':0'),
    wood: kit(),
    stone: kit(),
    cloth: kit(),
    glow: kit(),
    lamps: [],
    smoke: [],
  };
}
// what this building is made of: one of its climate's wall and roof textures, in one of three variants
function choose(K, st, r) {
  const mix = st.wallMix || [st.walls],
    rmix = st.roofMix || [st.roofTex];
  K.wall.cur = r.pick(mix) + ':' + Math.floor(r() * 3);
  K.roof.cur = r.pick(rmix) + ':' + Math.floor(r() * 3);
}
// The kits made into meshes, each with its painted surface.
function finish(K, st, group) {
  // line: outlined (C6), for the houses and what stands in the streets, never the streets themselves
  const add = (k, mat, line) => {
    if (k.empty) return;
    const m = new THREE.Mesh(k.build(), mat);
    group.add(m);
    if (line) addOutline(m, 2, 70);
  };
  add(K.ground, kitMat({ map: surface('dirt', 0) }));
  add(K.cobble, kitMat({ map: surface('cobble', 0) }));
  for (const key in K.walls) add(K.walls[key], kitMat({ map: surface(key.split(':')[0], +key.split(':')[1]) }), true);
  for (const key in K.roofs) add(K.roofs[key], kitMat({ map: surface(key.split(':')[0], +key.split(':')[1]) }), true);
  add(K.wood, kitMat({ map: surface('wood') }), true);
  add(K.stone, kitMat({ map: surface('stone') }), true);
  add(K.cloth, kitMat({ map: surface('cloth'), side: THREE.DoubleSide }));
  add(K.glow, GLOW);
  if (K.smoke.length && !Q.lite) group.add(smokeOf(K.smoke, st.smoke));
  if (K.lamps.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(K.lamps, 3));
    const pts = new THREE.Points(g, haloMat());
    pts.frustumCulled = false;
    group.add(pts);
  }
  return group;
}

// along a face, as turn() measures it, which way the x (s, n) or z (e, w) of the world runs
const FACE_SIGN = { s: 1, n: -1, e: -1, w: 1 };
/* A building on a block of ground: cx, cz its middle, w along x, d along z (metres), door: the side its door is on
   ('n', 's', 'e', 'w'), kind: 'elder', 'inn', 'shop' or a house. */
function building(K, st, r, b) {
  const { cx, cz, kind } = b;
  let { w, d } = b;
  if (st.roof === 'dome') return tents(K, st, r, b);
  choose(K, st, r);
  const storeys = kind === 'elder' ? 2 : kind ? Math.max(1, r.pick(st.storeys)) : r.pick(st.storeys),
    wallH = storeys * FH + 0.4,
    wcol = r.pick(st.wall),
    trim = st.trim;
  if (!b.open) K.stone.add(P.box(w + 0.3, 0.6, d + 0.3), st.plinth, { x: cx, y: 0.3, z: cz }, { uv: 2 });
  else {
    // a building you walk into stands on a plinth round its foot only: inside is its own floor (C8.5: the solid plinth
    // was the floor of every room, grey slabs half a metre above where the furniture stood)
    for (const sz of [-1, 1])
      K.stone.add(P.box(w + 0.3, 0.6, 0.3), st.plinth, { x: cx, y: 0.3, z: cz + sz * (d / 2) }, { uv: 2 });
    for (const sx of [-1, 1])
      K.stone.add(P.box(0.3, 0.6, d + 0.3), st.plinth, { x: cx + sx * (w / 2), y: 0.3, z: cz }, { uv: 2 });
  }
  // grime and splash toward the foot, weathering a little higher on some houses than others
  const grime = 0.2 + r() * 0.15,
    wopt = { uv: 3, jitter: 0.05, shade: (y) => 1 - grime * Math.max(0, 1 - y * 3) },
    doorOff = b.doorOff || 0;
  if (!b.open) K.wall.add(P.box(w, wallH, d), wcol, { x: cx, y: wallH / 2, z: cz }, wopt);
  else {
    // a building you can walk into (C7): four walls, with a doorway where its door is, and nothing inside (the room
    // is drawn by rooms.js, a little within these walls)
    const t = 0.3,
      gw = 1.2,
      gh = 2.4;
    for (const [side, fx, fz, len, ry] of [
      ['s', 0, d / 2 - t / 2, w, 0],
      ['n', 0, -d / 2 + t / 2, w, 0],
      ['e', w / 2 - t / 2, 0, d - 2 * t, Math.PI / 2],
      ['w', -w / 2 + t / 2, 0, d - 2 * t, Math.PI / 2],
    ]) {
      const seg = (a, bb, y0, y1) => {
        if (bb - a < 0.01) return;
        const [ox, oz] = turn((a + bb) / 2, 0, ry);
        K.wall.add(P.box(bb - a, y1 - y0, t), wcol, { x: cx + fx + ox, y: (y0 + y1) / 2, z: cz + fz + oz, ry }, wopt);
      };
      // along the face, measured the way turn() measures it
      const o = side === b.door ? (side === 'n' || side === 's' ? doorOff : -doorOff) * (ry ? 1 : 1) : null;
      if (o === null) seg(-len / 2, len / 2, 0, wallH);
      else {
        seg(-len / 2, o - gw / 2, 0, wallH);
        seg(o + gw / 2, len / 2, 0, wallH);
        seg(o - gw / 2, o + gw / 2, gh, wallH);
      }
    }
  }
  if (st.timber) {
    // dark beams over the plaster: corner posts, a beam at each storey, and posts between
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      K.wood.add(P.box(0.32, wallH, 0.32), st.timber, { x: cx + (sx * w) / 2, y: wallH / 2, z: cz + (sz * d) / 2 }, { uv: 2 });
    for (let s = 1; s <= storeys; s++) {
      const y = s * FH + 0.2;
      K.wood.add(P.box(w + 0.1, 0.26, d + 0.1), st.timber, { x: cx, y, z: cz }, { uv: 2 });
    }
    for (const [len, along, side] of [
      [w, 'x', d],
      [d, 'z', w],
    ])
      for (let i = 1, n = Math.floor(len / 3.2); i < n; i++)
        for (const sgn of [-1, 1]) {
          const o = -len / 2 + (i * len) / n;
          K.wood.add(
            P.box(0.22, wallH, 0.22),
            st.timber,
            along === 'x'
              ? { x: cx + o, y: wallH / 2, z: cz + (sgn * side) / 2 }
              : { x: cx + (sgn * side) / 2, y: wallH / 2, z: cz + o },
            { uv: 2 },
          );
        }
  }
  // windows and the door, on every face
  const faces = [
    ['s', 0, d / 2, w, 0],
    ['n', 0, -d / 2, w, Math.PI],
    ['e', w / 2, 0, d, Math.PI / 2],
    ['w', -w / 2, 0, d, -Math.PI / 2],
  ];
  for (const [side, fx, fz, len, ry] of faces) {
    const n = Math.max(1, Math.floor(len / 3.4));
    for (let s = 0; s < storeys; s++)
      for (let i = 0; i < n; i++) {
        const o = -len / 2 + ((i + 0.5) * len) / n;
        if (s === 0 && side === b.door && Math.abs(o - doorOff * FACE_SIGN[side]) < 1.6) continue; // the door is here
        if (r() < 0.12) continue;
        const [ox, oz] = turn(o, 0.06, ry),
          y = s * FH + 1.9;
        K.glow.add(P.box(0.8, 1.05, 0.12), 0xffcf80, { x: cx + fx + ox, y, z: cz + fz + oz, ry });
        if (Q.lite) continue;
        if (st.climate === 'temperate' || st.climate === 'cold') {
          // shutters
          for (const sg of [-1, 1]) {
            const [sx, sz] = turn(o + sg * 0.62, 0.1, ry);
            K.wood.add(P.box(0.42, 1.1, 0.06), trim, { x: cx + fx + sx, y, z: cz + fz + sz, ry });
          }
        }
        if (st.flowers && s === 0) {
          const [bx, bz] = turn(o, 0.3, ry);
          K.wood.add(P.box(1, 0.25, 0.35), trim, { x: cx + fx + bx, y: y - 0.65, z: cz + fz + bz, ry });
          for (let f = 0; f < 3; f++) {
            const [qx, qz] = turn(o - 0.3 + f * 0.3, 0.32, ry);
            K.cloth.add(P.blob(0.16), r.pick(['#d04a4a', '#e8c040', '#d070b0', '#f0f0f0']), {
              x: cx + fx + qx,
              y: y - 0.45,
              z: cz + fz + qz,
            });
          }
        }
      }
    if (side === b.door) {
      const along = doorOff * FACE_SIGN[side],
        at = (lx, lz) => {
          const [ox, oz] = turn(along + lx, lz, ry);
          return { x: cx + fx + ox, z: cz + fz + oz };
        };
      if (b.open) {
        // the door stands open against the wall beside its doorway, under a lintel, over a step
        const leaf = at(-0.6 - 0.62, 0.12),
          step = at(0, 0.35);
        K.wood.add(P.box(1.2, 2.3, 0.08), '#4a3424', { x: leaf.x, y: 1.15 + 0.3, z: leaf.z, ry }, { uv: 1.5 });
        K.stone.add(P.box(1.5, 0.12, 0.5), st.plinth, { x: step.x, y: 0.34, z: step.z, ry }, { uv: 2 });
        for (const sg of [-1, 1]) {
          const j = at(sg * 0.68, 0.05);
          K.wood.add(P.box(0.16, 2.5, 0.22), '#4a3424', { x: j.x, y: 1.25, z: j.z, ry }, { uv: 1.5 });
        }
      } else {
        const p = at(0, 0.08);
        K.wood.add(P.box(1.4, 2.4, 0.16), '#4a3424', { x: p.x, y: 1.2 + 0.3, z: p.z, ry }, { uv: 1.5 });
      }
      const l = at(0, 0.2);
      K.stone.add(P.box(1.9, 0.3, 0.4), st.plinth, { x: l.x, y: 2.85, z: l.z, ry }, { uv: 2 });
      const a0 = at(0, 0);
      b.doorAt = { x: a0.x, z: a0.z, ry };
    }
  }
  roof(K, st, r, cx, cz, w, d, wallH, wcol, kind);
  if (r() < st.chimneys || kind === 'inn') {
    const h = wallH + (st.roof === 'flat' ? 1.6 : Math.min(w, d) * st.pitch * 0.5 + 1.2);
    K.stone.add(
      P.box(0.9, h - wallH + 0.5, 0.9),
      st.plinth,
      { x: cx + w * 0.25, y: wallH + (h - wallH) / 2, z: cz - d * 0.15 },
      { uv: 2 },
    );
    K.smoke.push(cx + w * 0.25, h + 0.4, cz - d * 0.15);
  }
  if (kind) dress(K, st, r, b, wallH);
  if (st.fences && !kind) {
    // a low fence round the yard
    const fw = w + 1.6,
      fd = d + 1.6;
    for (const [x, z, a, b2] of [
      [0, fd / 2, fw, 0.12],
      [0, -fd / 2, fw, 0.12],
      [fw / 2, 0, 0.12, fd],
      [-fw / 2, 0, 0.12, fd],
    ])
      K.wood.add(P.box(a, 0.9, b2), trim, { x: cx + x, y: 0.45, z: cz + z }, { uv: 1.5 });
  }
}
// The roof over a building: its climate's shape, a gable end in the wall's colour, snow on cold roofs.
function roof(K, st, r, cx, cz, w, d, wallH, wcol, kind) {
  const col = r.pick(st.roofCol);
  if (st.roof === 'flat') {
    K.roof.add(P.box(w + 0.2, 0.3, d + 0.2), col, { x: cx, y: wallH + 0.15, z: cz }, { uv: 3 });
    for (const [x, z, a, b] of [
      [0, d / 2, w + 0.2, 0.3],
      [0, -d / 2, w + 0.2, 0.3],
      [w / 2, 0, 0.3, d],
      [-w / 2, 0, 0.3, d],
    ])
      K.wall.add(P.box(a, 0.7, b), wcol, { x: cx + x, y: wallH + 0.5, z: cz + z }, { uv: 3 });
    // a rooftop shade of cloth on some
    if (r() < 0.4) {
      K.wood.add(P.box(0.15, 2, 0.15), st.trim, { x: cx - w * 0.2, y: wallH + 1.2, z: cz - d * 0.2 });
      K.wood.add(P.box(0.15, 2, 0.15), st.trim, { x: cx + w * 0.2, y: wallH + 1.2, z: cz - d * 0.2 });
      K.cloth.add(P.box(w * 0.5, 0.06, d * 0.35), st.awning === 'stripes' ? '#c8b080' : st.awning, {
        x: cx,
        y: wallH + 2.2,
        z: cz - d * 0.1,
        rx: 0.12,
      });
    }
    return;
  }
  if (st.roof === 'hip') {
    const h = Math.min(w, d) * st.pitch * 0.5 + 0.5;
    K.roof.add(
      P.cone(1, 1, 4),
      col,
      { x: cx, y: wallH + h / 2, z: cz, ry: Math.PI / 4, sx: (w + 1.2) / Math.SQRT2, sy: h, sz: (d + 1.2) / Math.SQRT2 },
      { flat: true, uv: 2 },
    );
    return;
  }
  // gable or steep: the ridge runs along the longer side
  const along = d >= w,
    span = along ? w : d,
    len = (along ? d : w) + 1,
    h = (span + 1) * st.pitch * 0.5,
    ry = along ? 0 : Math.PI / 2,
    half = (span + 1.2) / 2,
    slope = Math.hypot(half, h),
    a = Math.atan2(h, half);
  K.wall.add(P.prism(span, h * (span / (span + 1.2)), along ? d : w), wcol, { x: cx, y: wallH, z: cz, ry }, { uv: 3 });
  for (const sg of [-1, 1]) {
    const [ox, oz] = turn((sg * half) / 2, 0, ry);
    K.roof.add(
      P.box(slope + 0.2, 0.28, len),
      col,
      { x: cx + ox, y: wallH + h / 2 + 0.1, z: cz + oz, ry, rz: -sg * a },
      { uv: 2, jitter: 0.06 },
    );
    if (st.snow) {
      const [sx, sz] = turn((sg * half) / 4, 0, ry);
      K.roof.add(
        P.box(slope * 0.55, 0.12, len - 0.2),
        '#eef3f6',
        { x: cx + sx, y: wallH + h * 0.75 + 0.3, z: cz + sz, ry, rz: -sg * a },
        { uv: 2 },
      );
    }
  }
  K.wood.add(P.box(0.3, 0.3, len + 0.1), st.trim, { x: cx, y: wallH + h + 0.18, z: cz, ry }, { uv: 2 });
}
// Round tents (the steppe): as many as fit along the block, each with a dome of felt and a smoke hole.
function tents(K, st, r, b) {
  choose(K, st, r);
  const { cx, cz, w, d } = b,
    along = w >= d,
    span = Math.min(w, d),
    n = Math.max(1, Math.round((along ? w : d) / span));
  for (let i = 0; i < n; i++) {
    const o = -((along ? w : d) / 2) + ((i + 0.5) * (along ? w : d)) / n,
      x = cx + (along ? o : 0),
      z = cz + (along ? 0 : o),
      rad = span / 2 - 0.3,
      h = 2.6 + (b.kind ? 1 : 0),
      col = r.pick(st.wall);
    K.wall.add(P.cyl(rad, rad, h, 14), col, { x, y: h / 2, z }, { uv: 2 });
    K.roof.add(
      new THREE.SphereGeometry(rad + 0.15, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      r.pick(st.roofCol),
      { x, y: h, z, sy: st.pitch + 0.25 },
      { uv: 2 },
    );
    K.wood.add(P.cyl(0.5, 0.5, 0.4, 8), st.trim, { x, y: h + (rad + 0.15) * (st.pitch + 0.25), z }, { uv: 1 });
    // a band of colour round the tent and the door
    K.cloth.add(P.cyl(rad + 0.03, rad + 0.03, 0.4, 14, 1, true), r.pick(st.banners.length ? st.banners : ['#9a4a3a']), {
      x,
      y: h - 0.5,
      z,
    });
    K.wood.add(P.box(1.2, 2, 0.2), '#5a3a24', { x, y: 1, z: z + rad });
  }
  if (b.kind) dress(K, st, r, b, 3);
}
// The marks of the three buildings that matter: banners and a tower or steeple on the hall, a sign and lamps at the inn,
// an awning at the shop.
function dress(K, st, r, b, wallH) {
  const at = b.doorAt || { x: b.cx, z: b.cz + b.d / 2, ry: 0 },
    put = (lx, lz) => {
      const [ox, oz] = turn(lx, lz, at.ry);
      return [at.x + ox, at.z + oz];
    };
  if (b.kind === 'elder') {
    for (const sg of [-1, 1]) {
      const [x, z] = put(sg * 2.4, 0.6),
        col = st.banners.length ? st.banners[((sg + 1) / 2) % st.banners.length] : '#8a7a6a';
      K.wood.add(P.cyl(0.08, 0.08, 6, 5), st.trim, { x, y: 3, z });
      K.cloth.add(P.box(1.1, 2.4, 0.05), col, { x, y: 4.6, z, ry: at.ry });
    }
    if (st.tower) {
      // a watchtower at one corner
      const x = b.cx - b.w / 2 + 2,
        z = b.cz - b.d / 2 + 2,
        h = wallH + 6;
      K.stone.add(P.box(3.6, h, 3.6), st.plinth, { x, y: h / 2, z }, { uv: 2 });
      K.roof.add(P.cone(3.2, 3, 4), r.pick(st.roofCol), { x, y: h + 1.5, z, ry: Math.PI / 4 }, { flat: true, uv: 2 });
      K.glow.add(P.box(0.6, 0.9, 3.7), 0xffcf80, { x, y: h - 1.5, z });
    }
    if (st.shrine) {
      // a steeple over the hall, with a gilded ball
      const h = wallH + 5;
      K.wall.add(P.box(2.6, 5, 2.6), r.pick(st.wall), { x: b.cx, y: wallH + 2.5, z: b.cz }, { uv: 3 });
      K.roof.add(P.cone(2.2, 6, 4), r.pick(st.roofCol), { x: b.cx, y: h + 3, z: b.cz, ry: Math.PI / 4 }, { flat: true, uv: 2 });
      K.glow.add(P.ball(0.45, 8, 6), 0xffd060, { x: b.cx, y: h + 6.3, z: b.cz });
    }
  } else if (b.kind === 'inn') {
    const [x, z] = put(2.2, 1.4),
      [lx, lz] = put(-1.4, 0.4),
      [rx, rz] = put(1.4, 0.4);
    K.wood.add(P.box(0.12, 0.12, 1.6), st.trim, { x, y: 3.6, z, ry: at.ry });
    K.wood.add(P.box(1.2, 0.8, 0.08), st.awning === 'stripes' ? '#9a3a2a' : st.awning, {
      x,
      y: 3.0,
      z: z,
      ry: at.ry + Math.PI / 2,
    });
    for (const [px, pz] of [
      [lx, lz],
      [rx, rz],
    ]) {
      K.glow.add(P.box(0.3, 0.4, 0.3), 0xffc070, { x: px, y: 2.9, z: pz });
      K.lamps.push(px, 2.9, pz);
    }
  } else if (b.kind === 'shop') {
    // an awning over the front, striped for traders
    const n = 6;
    for (let i = 0; i < n; i++) {
      const [x, z] = put(-2.4 + (i + 0.5) * 0.8, 1);
      K.cloth.add(P.box(0.8, 0.06, 2), st.awning === 'stripes' ? (i % 2 ? '#e8e0cc' : '#b8483a') : st.awning, {
        x,
        y: 3.2,
        z,
        ry: at.ry,
        rx: 0.35,
      });
    }
    for (const sg of [-1, 1]) {
      const [x, z] = put(sg * 2.4, 1.9);
      K.wood.add(P.box(0.12, 2.9, 0.12), st.trim, { x, y: 1.45, z });
    }
  }
}

/* Things standing in the streets, by trade. Each adds parts round (x, z), turned by ry. */
const PROPS = {
  barrel(K, st, r, x, z) {
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++)
      K.wood.add(P.cyl(0.42, 0.38, 1, 8), '#7a5634', { x: x + (i % 2) * 0.9, y: 0.5, z: z + Math.floor(i / 2) * 0.9 }, { uv: 1 });
  },
  crates(K, st, r, x, z) {
    K.wood.add(P.box(1, 1, 1), '#9a7a4e', { x, y: 0.5, z, ry: r() }, { uv: 1 });
    K.wood.add(P.box(0.9, 0.9, 0.9), '#8a6a42', { x: x + 1.1, y: 0.45, z, ry: r() }, { uv: 1 });
    K.wood.add(P.box(0.8, 0.8, 0.8), '#a08050', { x: x + 0.5, y: 1.4, z, ry: r() }, { uv: 1 });
  },
  woodpile(K, st, r, x, z, ry) {
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4 - row; i++) {
        const [ox, oz] = turn(-1 + i * 0.55 + row * 0.27, 0, ry);
        K.wood.add(
          P.cyl(0.25, 0.25, 2, 6),
          '#6a4a2e',
          { x: x + ox, y: 0.25 + row * 0.45, z: z + oz, rx: Math.PI / 2, ry },
          { uv: 1 },
        );
      }
  },
  anvil(K, st, r, x, z) {
    K.stone.add(P.box(0.7, 0.7, 0.7), '#6a5a4a', { x, y: 0.35, z }, { uv: 1 });
    K.stone.add(P.box(1.1, 0.35, 0.5), '#3a3a3e', { x, y: 0.85, z }, { uv: 1 });
    K.glow.add(P.box(0.9, 0.5, 0.9), 0xff8a3a, { x: x + 1.4, y: 0.6, z }); // the forge's coals
    K.stone.add(P.box(1.4, 0.4, 1.4), st.plinth, { x: x + 1.4, y: 0.2, z }, { uv: 1 });
    K.lamps.push(x + 1.4, 1, z);
  },
  planter(K, st, r, x, z) {
    K.wood.add(P.box(2.2, 0.5, 0.8), st.trim, { x, y: 0.25, z }, { uv: 1 });
    for (let i = 0; i < 4; i++)
      K.cloth.add(P.blob(0.35), r.pick(['#5a8a3a', '#6a9a4a', '#4a7a3a', '#9a6aaa']), { x: x - 0.8 + i * 0.55, y: 0.7, z });
  },
  clothline(K, st, r, x, z, ry) {
    const ends = [turn(-2, 0, ry), turn(2, 0, ry)];
    for (const [ox, oz] of ends) K.wood.add(P.box(0.12, 2.6, 0.12), st.trim, { x: x + ox, y: 1.3, z: z + oz });
    K.wood.add(P.box(4, 0.04, 0.04), '#d8d0c0', { x, y: 2.5, z, ry });
    for (let i = 0; i < 3; i++) {
      const [ox, oz] = turn(-1.2 + i * 1.2, 0, ry);
      K.cloth.add(
        P.box(0.9, 1.1 + r() * 0.4, 0.03),
        r.pick(st.banners.length ? st.banners.concat(['#3a6a9a', '#c08a3a']) : ['#3a6a9a', '#c08a3a', '#8a3a6a']),
        {
          x: x + ox,
          y: 1.85,
          z: z + oz,
          ry,
        },
      );
    }
  },
  kiln(K, st, r, x, z) {
    K.stone.add(P.cone(1.4, 2, 8), '#4a3e36', { x, y: 1, z }, { uv: 1 });
    K.glow.add(P.box(0.5, 0.5, 0.2), 0xff7a2a, { x, y: 0.4, z: z + 1 });
    K.lamps.push(x, 0.6, z + 1.2);
  },
  stall(K, st, r, x, z, ry) {
    for (const [lx, lz] of [
      [-1.2, -0.7],
      [1.2, -0.7],
      [-1.2, 0.7],
      [1.2, 0.7],
    ]) {
      const [ox, oz] = turn(lx, lz, ry);
      K.wood.add(P.box(0.12, 2.4, 0.12), st.trim, { x: x + ox, y: 1.2, z: z + oz });
    }
    K.wood.add(P.box(2.6, 0.9, 1.2), '#8a6a44', { x, y: 0.45, z, ry }, { uv: 1 });
    for (let i = 0; i < 4; i++) {
      const [ox, oz] = turn(-0.975 + i * 0.65, 0, ry);
      K.cloth.add(P.box(0.65, 0.05, 1.8), i % 2 ? '#e8e0cc' : r.pick(['#b8483a', '#3a6a9a', '#3a8a5a']), {
        x: x + ox,
        y: 2.45,
        z: z + oz,
        ry,
        rx: 0.15,
      });
    }
    for (let i = 0; i < 3; i++) {
      const [ox, oz] = turn(-0.8 + i * 0.8, 0, ry);
      K.cloth.add(P.blob(0.25), r.pick(['#d0a030', '#a83a2a', '#6a9a3a']), { x: x + ox, y: 1.05, z: z + oz });
    }
  },
  cart(K, st, r, x, z, ry) {
    K.wood.add(P.box(1.6, 0.5, 2.6), '#7a5a38', { x, y: 1, z, ry }, { uv: 1 });
    for (const sg of [-1, 1]) {
      const [ox, oz] = turn(sg * 0.9, 0.3, ry);
      K.wood.add(P.cyl(0.6, 0.6, 0.12, 10), '#4a3424', { x: x + ox, y: 0.6, z: z + oz, rz: Math.PI / 2, ry }, { uv: 1 });
    }
    const [hx, hz] = turn(0, -2, ry);
    K.wood.add(P.box(0.1, 0.1, 1.8), '#5a4028', { x: x + hx, y: 0.9, z: z + hz, ry, rx: 0.2 });
  },
};
// A street lamp: a post, a glowing lantern, and its halo at night.
function lamp(K, st, x, z) {
  K.wood.add(P.box(0.16, 3.2, 0.16), st.trim, { x, y: 1.6, z });
  K.wood.add(P.box(0.7, 0.1, 0.1), st.trim, { x: x + 0.3, y: 3.15, z });
  K.glow.add(P.box(0.32, 0.42, 0.32), 0xffc070, { x: x + 0.6, y: 2.85, z });
  K.lamps.push(x + 0.6, 2.85, z);
}

// The blocks of wall in a town's grid (the outer ring apart): each is a building.
function blocks(map, walled) {
  const W = R.W,
    H = R.H,
    T = map.terrain,
    seen = new Uint8Array(W * H),
    out = [],
    ring = (x, y) => walled && (x === 0 || y === 0 || x === W - 1 || y === H - 1);
  for (let i = 0; i < W * H; i++) {
    const x0 = i % W,
      y0 = Math.floor(i / W);
    if (seen[i] || T[i] !== R.WALL || ring(x0, y0)) continue;
    const b = { x0, y0, x1: x0, y1: y0 },
      stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop(),
        x = k % W,
        y = Math.floor(k / W);
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || T[n] !== R.WALL || ring(nx, ny)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    out.push(b);
  }
  return out;
}

/* The whole town, as a group centred on its own middle (as interiorGroup in scene.js draws it). */
function townGroup(S, townId, map, ts) {
  const st = styleOf(S, townId),
    r = dice(hash((townId || 'town') + ':' + S.seed)),
    K = kits(st),
    group = new THREE.Group(),
    W = R.W,
    size = W * ts,
    at = (t) => (t + 0.5) * ts - size / 2,
    edge = (t) => t * ts - size / 2,
    T = map.terrain,
    walled = !!(S.areas[townId] && S.areas[townId].walled),
    c = 18;
  // the ground: streets of packed earth, the plaza paved
  K.ground.add(P.box(size, 0.1, size), st.ground, { y: 0.03 }, { uv: 2.5, jitter: 0.04 });
  K.cobble.add(P.box(13 * ts, 0.1, 13 * ts), st.plinth, { y: 0.06 }, { uv: 3, jitter: 0.03 });
  // buildings
  const kindAt = {};
  for (const k in map.sites) {
    const s = map.sites[k];
    if (s.kind === 'elder' || s.kind === 'inn' || s.kind === 'shop') kindAt[k] = s.kind;
  }
  // buildings you can walk into (C7): the rules say where each one's door is
  const ruled = R.interiorsOn && R.interiorsOn(S, townId || 'town') ? R.buildingsOf(S, townId || 'town') : [];
  for (const b of blocks(map, walled)) {
    const rb = ruled.find((x) => x.x0 === b.x0 && x.y0 === b.y0);
    if (rb) {
      const cx = (edge(b.x0) + edge(b.x1 + 1)) / 2,
        cz = (edge(b.y0) + edge(b.y1 + 1)) / 2,
        // the door: the middle of its tile, along the face, from the face's middle
        off = rb.door.side === 'n' || rb.door.side === 's' ? at(rb.door.x) - cx : at(rb.door.y) - cz;
      building(K, st, r, {
        cx,
        cz,
        w: (b.x1 - b.x0 + 1) * ts - 0.5,
        d: (b.y1 - b.y0 + 1) * ts - 0.5,
        kind: ['elder', 'inn', 'shop'].includes(rb.kind) ? rb.kind : null,
        door: rb.door.side,
        doorOff: off,
        open: true,
      });
      continue;
    }
    // which special building is this (its site is on the floor beside it), and which way its door faces
    let kind = null,
      door = null;
    for (let x = b.x0 - 1; x <= b.x1 + 1 && !kind; x++)
      for (let y = b.y0 - 1; y <= b.y1 + 1 && !kind; y++) {
        const k = kindAt[y * W + x];
        if (!k) continue;
        kind = k;
        door = y > b.y1 ? 's' : y < b.y0 ? 'n' : x > b.x1 ? 'e' : 'w';
      }
    const cx = (edge(b.x0) + edge(b.x1 + 1)) / 2,
      cz = (edge(b.y0) + edge(b.y1 + 1)) / 2;
    if (!door) {
      const dx = c - (b.x0 + b.x1) / 2,
        dy = c - (b.y0 + b.y1) / 2;
      door = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
    }
    building(K, st, r, { cx, cz, w: (b.x1 - b.x0 + 1) * ts - 0.5, d: (b.y1 - b.y0 + 1) * ts - 0.5, kind, door });
  }
  // the outer wall, and towers by each gate
  if (walled) outerWall(K, st, r, map, ts, at);
  // street lamps along the main streets, and the trade's things beside the houses
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < W && T[y * W + x] !== R.WALL && !map.sites[y * W + x];
  const step = Math.max(2, Math.round(5 / Math.max(0.3, st.lanterns)));
  for (let i = 3; i < W - 3; i += step)
    for (const [x, y] of [
      [c - 2, i],
      [c + 2, i],
      [i, c - 2],
      [i, c + 2],
    ])
      if (open(x, y) && (Math.abs(x - c) > 6 || Math.abs(y - c) > 6)) lamp(K, st, at(x), at(y));
  for (const [x, y] of [
    [c - 6, c - 6],
    [c + 6, c - 6],
    [c - 6, c + 6],
    [c + 6, c + 6],
  ])
    if (open(x, y)) lamp(K, st, at(x), at(y));
  let placed = 0;
  for (let tries = 0; tries < 300 && placed < (Q.lite ? 0 : 14); tries++) {
    const x = 2 + Math.floor(r() * (W - 4)),
      y = 2 + Math.floor(r() * (W - 4));
    if (!open(x, y) || Math.abs(x - c) <= 1 || Math.abs(y - c) <= 1 || (Math.abs(x - c) <= 6 && Math.abs(y - c) <= 6)) continue;
    // beside a house
    const by = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].find(([dx, dy]) => T[(y + dy) * W + x + dx] === R.WALL);
    if (!by) continue;
    const name = st.props[placed % st.props.length];
    PROPS[name](K, st, r, at(x), at(y), by[0] ? Math.PI / 2 : 0);
    placed++;
  }
  // standing stones round the plaza for keepers of lore
  if (st.stones)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      K.stone.add(
        P.box(0.9, 2.6 + r() * 1.2, 0.6),
        '#8a887e',
        { x: Math.cos(a) * 5 * ts, y: 1.4, z: Math.sin(a) * 5 * ts, ry: a },
        { uv: 1.5 },
      );
    }
  // prayer flags on lines across the streets for pilgrims
  if (st.flags)
    for (let i = 0; i < 4; i++) {
      const y0 = at(c - 9 + i * 6);
      for (let f = 0; f < 8; f++)
        K.cloth.add(P.box(0.5, 0.7, 0.02), st.banners[f % st.banners.length], {
          x: at(c) - 2.6 + f * 0.75,
          y: 4.8 - Math.abs(f - 3.5) * 0.15,
          z: y0,
        });
    }
  return finish(K, st, group);
}
// A walled town's wall: stone with battlements, a log palisade, or banked mud, by climate; towers at the gates.
function outerWall(K, st, r, map, ts, at) {
  K.wall.cur = (st.outer === 'mud' ? 'adobe' : st.walls) + ':0';
  K.roof.cur = st.roofTex + ':0';
  const W = R.W,
    T = map.terrain;
  for (let i = 0; i < W * W; i++) {
    const x = i % W,
      y = Math.floor(i / W);
    if (!(x === 0 || y === 0 || x === W - 1 || y === W - 1)) continue;
    const px = at(x),
      pz = at(y),
      gate = T[i] !== R.WALL,
      nearGate =
        !gate &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const nx = x + dx,
            ny = y + dy;
          return (
            nx >= 0 &&
            ny >= 0 &&
            nx < W &&
            ny < W &&
            (nx === 0 || ny === 0 || nx === W - 1 || ny === W - 1) &&
            T[ny * W + nx] !== R.WALL
          );
        });
    if (gate) continue;
    if (st.outer === 'palisade') {
      for (let k = 0; k < 3; k++) {
        const o = -ts / 3 + (k * ts) / 3,
          ox = y === 0 || y === W - 1 ? o : 0,
          oz = y === 0 || y === W - 1 ? 0 : o,
          h = 5.6 + ((x * 7 + y * 3 + k) % 3) * 0.3;
        K.wood.add(P.cyl(0.62, 0.62, h + 3, 6), '#6a4c30', { x: px + ox, y: (h - 3) / 2, z: pz + oz }, { uv: 1.5 });
        K.wood.add(P.cone(0.62, 0.9, 6), '#6a4c30', { x: px + ox, y: h + 0.45, z: pz + oz }, { uv: 1.5 });
      }
    } else {
      const h = st.outer === 'mud' ? 5 : 6,
        col = st.outer === 'mud' ? st.wall[0] : st.plinth;
      (st.outer === 'mud' ? K.wall : K.stone).add(
        P.box(ts + 0.02, h + 3, ts + 0.02),
        col,
        { x: px, y: (h - 3) / 2, z: pz },
        { uv: 2.5 },
      );
      if ((x + y) % 2 === 0)
        (st.outer === 'mud' ? K.wall : K.stone).add(
          P.box(ts * 0.5, 0.9, ts * 0.9),
          col,
          { x: px, y: h + 0.45, z: pz },
          { uv: 2.5 },
        );
    }
    if (nearGate) {
      // a gate tower
      const h = 9;
      K.stone.add(P.box(ts * 1.1, h + 3, ts * 1.1), st.plinth, { x: px, y: (h - 3) / 2, z: pz }, { uv: 2.5 });
      K.roof.add(
        P.cone(ts * 0.95, 3, 4),
        r.pick(st.roofCol),
        { x: px, y: h + 1.5, z: pz, ry: Math.PI / 4 },
        { flat: true, uv: 2 },
      );
      K.cloth.add(P.box(1.2, 2.4, 0.05), st.banners.length ? st.banners[0] : '#8a3a2a', { x: px, y: h - 2, z: pz + ts * 0.56 });
    }
  }
}

/* A hamlet on the land: four or five small houses of the region's style round a well, a woodpile and a lamp. */
function hamletGroup(S, biome, seed) {
  const st = styleOf(S, null, biome),
    r = dice(seed),
    K = kits(st),
    group = new THREE.Group();
  st.props = ['woodpile', 'barrel'];
  st.banners = [];
  for (const [x, z, a] of [
    [-6, -4, 0.3],
    [5, -5, -0.4],
    [6, 5, 1.2],
    [-5, 6, 2],
  ]) {
    const w = 4.5 + r() * 2 + a * 0,
      d = 3.6 + r() * 1.5;
    building(K, Object.assign({}, st, { storeys: [1] }), r, {
      cx: x,
      cz: z,
      w,
      d,
      door: Math.abs(x) > Math.abs(z) ? (x > 0 ? 'w' : 'e') : z > 0 ? 'n' : 's',
    });
  }
  PROPS.woodpile(K, st, r, 0, -8, 0.4);
  lamp(K, st, 2.4, 2.4);
  return finish(K, st, group);
}
export { townGroup, hamletGroup, styleOf, setNight, townsOn, PROPS, climateOf, GLOW };
