/* The insides of buildings (commission 7: the interiors piece). The rules give a house as a layout (rules/houses.js):
   a grid three tiles to a town tile, the room each tile belongs to, the inner walls with their doorways, and the door.
   Here it becomes a room in the style: a floor of boards (beaten earth in a poor house, stone in a temple or a hall),
   walls of plaster, logs or stone by the climate and the town, a beamed ceiling, windows that are bright by day and
   glow at night, and door frames. The walls stand a little inside the building's outer walls, so nothing of the
   outside (its windows, posts and beams) shows within. One group a house, kept, a few draw calls.
   A house's grid lies over the town's: its tile (0, 0) is the town tile (ox, oy). houseOrigin gives where the middle
   of its grid lies in the town's frame, so the view can stand it exactly where the building is. */
import { R, TOWN_TS } from './ctx.js';
import { P, kit, kitMat } from './kit.js';
import { surface } from './paint.js';
import { GLOW } from './buildings.js';
import { addOutline } from './outline.js';
import { MUSIC_KEYS } from './sound.js';

// each kind of room has its own tune (content/music.js): a hall's march, a temple's chorale, a rich house's minuet
const TUNES = { elder: 'hall', temple: 'temple', inn: 'inn', shop: 'shop', smith: 'smithy', mapmaker: 'library' };
MUSIC_KEYS.push((S, rec) => {
  if (rec.kind !== 'house') return null;
  const L = R.houseOf(S, S.area);
  if (!L) return 'in:home';
  return 'in:' + (L.empty ? 'abandoned' : TUNES[L.kind] || (L.grade >= 2 ? 'rich' : 'home'));
});

const HT = TOWN_TS / 3, // metres a house tile
  HH = (R.W * HT) / 2,
  TH = (R.W * TOWN_TS) / 2,
  INSET = 0.45, // the walls' faces stand this far inside the building's block
  CEIL = 2.9;
// where the middle of a house's grid lies, in the town's frame (metres from the town's middle)
const houseOrigin = (L) => ({ x: (L.ox + R.W / 6) * TOWN_TS - TH, z: (L.oy + R.W / 6) * TOWN_TS - TH });
const tileC = (i) => (i + 0.5) * HT - HH;

const LOOKS = {
  // walls and floor by climate, then by the building
  temperate: { wall: 'plaster', wcol: '#e8dcc0', floor: 'wood', fcol: '#a87e56' },
  cold: { wall: 'logs', wcol: '#c09060', floor: 'wood', fcol: '#9a7450' },
  wet: { wall: 'stone', wcol: '#a8a294', floor: 'wood', fcol: '#7a5c40' },
  hot: { wall: 'adobe', wcol: '#d8b48a', floor: 'tiles', fcol: '#b8704a' },
  steppe: { wall: 'plaster', wcol: '#d8c8a0', floor: 'dirt', fcol: '#a08060' },
  ashen: { wall: 'stone', wcol: '#8a8278', floor: 'stone', fcol: '#6a625a' },
};
function lookOf(L) {
  const lk = Object.assign({}, LOOKS[L.climate] || LOOKS.temperate);
  if (L.kind === 'temple' || L.kind === 'elder') Object.assign(lk, { floor: 'stone', fcol: '#b8b0a0' });
  if (L.grade === 0 && L.kind === 'house') Object.assign(lk, { floor: 'dirt', fcol: '#8a7058' });
  if (L.empty) lk.wcol = '#a89c88';
  return lk;
}
const BUILT = new Map();
/* A house's room, as a group in the house's own frame (its grid's middle at the origin). */
function houseGroup(S, id, L) {
  const key = id + '|' + S.seed;
  if (BUILT.has(key)) return BUILT.get(key);
  const lk = lookOf(L),
    walls = kit(),
    floor = kit(),
    ceil = kit(),
    wood = kit(),
    glow = kit(),
    W = R.W,
    cells = L.cells;
  // the footprint
  let x0 = W,
    y0 = W,
    x1 = -1,
    y1 = -1;
  for (let k = 0; k < W * W; k++)
    if (cells[k] >= 0) {
      const x = k % W,
        y = Math.floor(k / W);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const left = x0 * HT - HH + INSET,
    right = (x1 + 1) * HT - HH - INSET,
    top = y0 * HT - HH + INSET,
    bot = (y1 + 1) * HT - HH - INSET,
    cx = (left + right) / 2,
    cz = (top + bot) / 2,
    w = right - left,
    d = bot - top;
  floor.add(P.box(w + 0.6, 0.1, d + 0.6), lk.fcol, { x: cx, y: 0.04, z: cz }, { uv: 1.0, jitter: 0.04 });
  ceil.add(P.box(w + 0.6, 0.12, d + 0.6), '#6a5038', { x: cx, y: CEIL + 0.06, z: cz }, { uv: 2 });
  // beams across the shorter span
  const along = w < d;
  for (let i = 1, n = Math.max(2, Math.round((along ? d : w) / 1.6)); i < n; i++) {
    const o = (along ? top : left) + (i * (along ? d : w)) / n;
    wood.add(
      P.box(along ? w : 0.2, 0.22, along ? 0.2 : d),
      '#5a4030',
      along ? { x: cx, y: CEIL - 0.11, z: o } : { x: o, y: CEIL - 0.11, z: cz },
    );
  }
  // the outer walls, with the door's gap and windows
  const door = L.entry,
    doorX = tileC(door.x),
    doorZ = tileC(door.y),
    T = 0.14; // a wall's thickness
  const wallLine = (ax, az, bx, bz, gaps, windows) => {
    // a straight wall from a to b (one of x or z the same), with gaps [centre, width] along it
    const horiz = az === bz,
      lo = horiz ? Math.min(ax, bx) : Math.min(az, bz),
      hi = horiz ? Math.max(ax, bx) : Math.max(az, bz),
      cuts = gaps.slice().sort((a, b) => a[0] - b[0]);
    let p = lo;
    const piece = (from, to, y0, y1) => {
      if (to - from < 0.02) return;
      const m = (from + to) / 2,
        len = to - from;
      walls.add(
        P.box(horiz ? len : T, y1 - y0, horiz ? T : len),
        lk.wcol,
        horiz ? { x: m, y: (y0 + y1) / 2, z: az } : { x: ax, y: (y0 + y1) / 2, z: m },
        { uv: 2.2, shade: (yy) => 0.86 + 0.14 * yy },
      );
    };
    for (const [c, gw] of cuts) {
      piece(p, c - gw / 2, 0, CEIL);
      piece(c - gw / 2, c + gw / 2, 2.15, CEIL); // the lintel over a doorway
      // the frame
      for (const sg of [-1, 1])
        wood.add(
          P.box(horiz ? 0.1 : T + 0.06, 2.15, horiz ? T + 0.06 : 0.1),
          '#5a4030',
          horiz ? { x: c + (sg * gw) / 2, y: 1.075, z: az } : { x: ax, y: 1.075, z: c + (sg * gw) / 2 },
        );
      wood.add(
        P.box(horiz ? gw + 0.2 : T + 0.06, 0.12, horiz ? T + 0.06 : gw + 0.2),
        '#5a4030',
        horiz ? { x: c, y: 2.15, z: az } : { x: ax, y: 2.15, z: c },
      );
      p = c + gw / 2;
    }
    piece(p, hi, 0, CEIL);
    // windows: bright panes, set in the wall (they glow at night as the town's do)
    if (windows)
      for (let q = lo + 1.4; q < hi - 1.2; q += 2.8) {
        if (cuts.some(([c, gw]) => Math.abs(q - c) < gw / 2 + 0.9)) continue;
        glow.add(
          P.box(horiz ? 0.75 : 0.04, 0.95, horiz ? 0.04 : 0.75),
          0xffe2b0,
          horiz ? { x: q, y: 1.55, z: az } : { x: ax, y: 1.55, z: q },
        );
        wood.add(
          P.box(horiz ? 0.9 : 0.08, 0.08, horiz ? 0.08 : 0.9),
          '#5a4030',
          horiz ? { x: q, y: 1.04, z: az } : { x: ax, y: 1.04, z: q },
        );
      }
  };
  const gapOn = (side) => (L.side === side ? [[side === 'n' || side === 's' ? doorX : doorZ, 1.1]] : []);
  wallLine(left, top, right, top, gapOn('n'), true);
  wallLine(left, bot, right, bot, gapOn('s'), true);
  wallLine(left, top, left, bot, gapOn('w'), true);
  wallLine(right, top, right, bot, gapOn('e'), true);
  // inner walls: where a tile of one room meets the next, with the doorways the rules opened in them
  const lines = new Map(); // a wall line's key -> { horiz, at, from, to, gaps }
  for (let k = 0; k < W * W; k++) {
    if (cells[k] < 0) continue;
    const x = k % W,
      y = Math.floor(k / W);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      const n = k + dy * W + dx;
      if (cells[n] < 0 || cells[n] === cells[k]) continue;
      const horiz = dy === 1,
        at = horiz ? (y + 1) * HT - HH : (x + 1) * HT - HH,
        key = (horiz ? 'h' : 'v') + at.toFixed(2),
        e = lines.get(key) || { horiz, at, from: Infinity, to: -Infinity, gaps: [] };
      const a = (horiz ? x : y) * HT - HH;
      e.from = Math.min(e.from, a);
      e.to = Math.max(e.to, a + HT);
      // a doorway: the rules opened this tile of the inner wall
      if (L.open.some(([t, ox, oy]) => (t === k || t === n) && ox === dx && oy === dy && t !== L.open[0][0]))
        e.gaps.push([a + HT / 2, 1.1]);
      lines.set(key, e);
    }
  }
  for (const e of lines.values()) {
    const from = Math.max(e.from, e.horiz ? left : top),
      to = Math.min(e.to, e.horiz ? right : bot);
    if (e.horiz) wallLine(from, e.at, to, e.at, e.gaps, false);
    else wallLine(e.at, from, e.at, to, e.gaps, false);
  }
  const g = new THREE.Group(),
    add = (k, mat, line) => {
      if (k.empty) return;
      const m = new THREE.Mesh(k.build(), mat);
      m.geometry.dispose = () => {};
      g.add(m);
      if (line) addOutline(m, 2, 20);
    };
  add(floor, kitMat({ map: surface(lk.floor, 1) }));
  add(walls, kitMat({ map: surface(lk.wall, 1) }));
  add(ceil, kitMat({ map: surface('wood', 2) }));
  add(wood, kitMat({ map: surface('wood', 0) }), true);
  add(glow, GLOW);
  g.traverse((o) => (o.frustumCulled = false));
  g.userData.room = id;
  BUILT.set(key, g);
  if (BUILT.size > 12) {
    const [k0, old] = BUILT.entries().next().value;
    BUILT.delete(k0);
    old.traverse((o) => o.geometry && THREE.BufferGeometry.prototype.dispose.call(o.geometry));
  }
  return g;
}
export { houseGroup, houseOrigin, HT as HOUSE_TS, INSET as HOUSE_INSET };
