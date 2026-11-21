/* The walls and floors of levels (commission 5): dungeons, the locked place, places in the sky and in the water. The
   rules give a level as a grid of wall and floor; its look (LOOKS, content) names a `kit`, and each kit says how a wall
   tile is built and what the walls and floor are made of. Every wall tile of a level is one instance of the kit's
   tile model, so a whole level's walls stay one draw call, now with shape and a painted surface.
     stone   dressed blocks          castle  blocks with battlements   brick   small bricks (cisterns)
     rock    rough faceted boulders  mine    rock propped with timber  marble  white walls under gilded domes
     planks  boarded walls on posts  coral   rounded pillars of coral and shell */
import { P, kit, kitMat } from './kit.js';
import { surface } from './paint.js';
import { lookOn } from './quality.js';

const KITS = {
  stone: { wall: 'stone', floor: 'stone', floorRep: 2 },
  castle: { wall: 'stone', floor: 'stone', floorRep: 2 },
  brick: { wall: 'brick', floor: 'stone', floorRep: 1.5 },
  rock: { wall: 'plaster', floor: 'plaster', floorRep: 4 },
  mine: { wall: 'plaster', floor: 'plaster', floorRep: 4 },
  marble: { wall: 'plaster', floor: 'stone', floorRep: 2.5 },
  planks: { wall: 'wood', floor: 'wood', floorRep: 2 },
  coral: { wall: 'plaster', floor: 'plaster', floorRep: 3 },
};
// The model of one wall tile, ts across and h high, from the floor up: white, tinted by the level's stone colour.
function tileModel(name, ts, h) {
  const k = kit(),
    W = 0xffffff;
  if (name === 'castle') {
    k.add(P.box(ts, h, ts), W, { y: h / 2 }, { uv: 2.5 });
    k.add(P.box(ts * 0.45, 0.9, ts * 0.45), W, { y: h + 0.45, x: -ts * 0.22, z: -ts * 0.22 }, { uv: 2.5 });
    k.add(P.box(ts * 0.45, 0.9, ts * 0.45), W, { y: h + 0.45, x: ts * 0.22, z: ts * 0.22 }, { uv: 2.5 });
  } else if (name === 'rock' || name === 'mine') {
    k.add(P.box(ts * 0.9, h, ts * 0.9), 0xcccccc, { y: h / 2 }, { uv: 3 });
    k.add(P.blob(ts * 0.62, 0), W, { y: h * 0.3, sy: (h * 0.45) / (ts * 0.62), ry: 0.7 }, { flat: true, uv: 3 });
    k.add(P.blob(ts * 0.55, 0), 0xe0e0e0, { y: h * 0.75, sy: (h * 0.4) / (ts * 0.55), ry: 2.1 }, { flat: true, uv: 3 });
    if (name === 'mine') {
      k.add(P.box(0.35, h, 0.35), 0x9a7a5a, { x: ts * 0.48, y: h / 2, z: ts * 0.48 }, { uv: 1 });
      k.add(P.box(ts, 0.35, 0.35), 0x9a7a5a, { y: h - 0.2, z: ts * 0.48 }, { uv: 1 });
    }
  } else if (name === 'marble') {
    k.add(P.box(ts, h, ts), W, { y: h / 2 }, { uv: 3 });
    k.add(P.box(ts * 1.04, 0.4, ts * 1.04), 0xe8d8a8, { y: h + 0.2 }, { uv: 2 });
    k.add(new THREE.SphereGeometry(ts * 0.36, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xf0c860, { y: h + 0.4 }, { uv: 2 });
  } else if (name === 'planks') {
    k.add(P.box(ts * 0.86, h, ts * 0.86), W, { y: h / 2 }, { uv: 2 });
    for (const [x, z] of [
      [-1, -1],
      [1, 1],
    ])
      k.add(P.box(0.4, h + 0.6, 0.4), 0x8a7058, { x: (x * ts) / 2.3, y: (h + 0.6) / 2, z: (z * ts) / 2.3 }, { uv: 1 });
  } else if (name === 'coral') {
    k.add(P.cyl(ts * 0.36, ts * 0.5, h, 9), W, { y: h / 2 }, { uv: 2 });
    k.add(P.blob(ts * 0.42, 0), 0xf0b8b0, { y: h + 0.1, sy: 0.6 }, { uv: 2 });
    k.add(P.blob(ts * 0.18, 0), 0xe8e0d0, { x: ts * 0.3, y: h * 0.55, z: ts * 0.25 }, { flat: true, uv: 1 });
  } else k.add(P.box(ts, h, ts), W, { y: h / 2 }, { uv: name === 'brick' ? 1.5 : 2.5 });
  return k.build();
}
const levelsOn = () => lookOn('towns') && lookOn('light');
// The kit a level's look names, or null to keep the plain blocks.
function levelKit(look) {
  if (!levelsOn() || !look) return null;
  return KITS[look.kit] ? Object.assign({ name: look.kit }, KITS[look.kit]) : Object.assign({ name: 'stone' }, KITS.stone);
}
// Wall tiles as instances of the kit's tile; `list` is [[x, z], ...] in metres, the tile's middle.
function levelWalls(K, ts, h, color, list, y0) {
  const mesh = new THREE.InstancedMesh(
      tileModel(K.name, ts, h),
      kitMat({ color, map: surface(K.wall) }),
      Math.max(1, list.length),
    ),
    m = new THREE.Matrix4();
  list.forEach(([x, z], i) => {
    m.makeTranslation(x, y0 || 0, z);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = list.length;
  mesh.frustumCulled = false;
  return mesh;
}
// A floor (or ceiling) of `size` metres with the kit's surface, its texture repeating every floorRep metres.
function levelFloor(K, size, color, up) {
  const g = new THREE.PlaneGeometry(size, size).rotateX(up ? Math.PI / 2 : -Math.PI / 2),
    uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * size) / K.floorRep, (uv.getY(i) * size) / K.floorRep);
  return new THREE.Mesh(g, kitMat({ vertexColors: false, color, map: surface(up ? K.wall : K.floor) }));
}
export { levelKit, levelWalls, levelFloor, KITS };
