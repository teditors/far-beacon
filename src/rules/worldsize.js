/* Worlds of varying size: the number of regions across and down is rolled from the seed (content/worldsize.js), from
   a small 2 x 3 world to a vast 7 x 7 one, and odd shapes such as 3 x 7. A year that sets the size itself (the rare
   wide world) wins. Switch: s.off.worldsize (at creation: off gives the old 3 x 3). */
import { C, byId, on, say, stream } from './core.js';
import { NOTES, SWITCHES, TUNERS } from './hooks.js';

const Z = () => C.worldSize;
function rollSize(seed) {
  const r = stream(seed, 'worldsize'),
    shapes = Z().shapes;
  let t = shapes.reduce((a, e) => a + e.w, 0) * r(),
    sh = shapes[shapes.length - 1];
  for (const e of shapes)
    if ((t -= e.w) < 0) {
      sh = e;
      break;
    }
  const span = ([a, b]) => a + Math.floor(r() * (b - a + 1));
  let cols = span(sh.cols),
    rows = span(sh.rows);
  if (sh.swap && r() < 0.5) [cols, rows] = [rows, cols];
  while (cols * rows > Z().most) cols > rows ? cols-- : rows--;
  return { shape: sh.id, cols, rows };
}
TUNERS.push((seed, tun, off, year, set) => {
  if (set && set.cols && set.rows) {
    tun.world = { cols: set.cols, rows: set.rows }; // chosen on the new world screen
    return;
  }
  if (off.worldsize || (year && year.tun && year.tun.world)) return;
  const z = rollSize(seed);
  tun.world = { cols: z.cols, rows: z.rows, shape: z.shape };
});
const shapeOf = (s) => (s.world && s.world.shape ? byId(Z().shapes, s.world.shape) : null);
SWITCHES.push(['worldsize', 'Worlds of varying size']);
NOTES.push((s) => {
  const sh = shapeOf(s);
  return sh ? [{ label: sh.name, text: s.world.cols + ' regions across and ' + s.world.rows + ' down: ' + sh.text + '.' }] : [];
});
on('worldBorn', (s) => {
  const sh = shapeOf(s);
  if (sh && sh.id !== 'usual') say(s, sh.name + ', ' + s.world.cols + ' regions by ' + s.world.rows + ': ' + sh.text + '.');
});
export { rollSize, shapeOf };
