/* Named artifacts: a few per world, rolled at creation from content/artifacts.js. One is for sale in the town, one lies
   beside the relic at the bottom of the locked place, one is in a cache in a region away from home.
   An artifact is an ordinary item with `art` (its power's id) and `artName`. Switch: s.off.artifacts (rolls none, and
   switches off the powers of any already found). */
import { C, H, W, byId, clamp, idx, on, say, stream } from './core.js';
import './interiors.js'; // the generators below are wrapped, so they must exist first
import './worldgen.js';
import { GENERATORS, HOME, sketchOf } from './areas.js';
import { makeItem } from './items.js';
import { active } from './equipment.js';
import { SYSTEMS } from './systems.js';
import { SOURCES, waterCap } from './stats.js';
import { NOTES, SWITCHES } from './hooks.js';

const A = () => C.artifacts;
const powerOf = (it) => (it && it.art ? byId(A().powers, it.art) : null);

function makeArtifact(s, r, used) {
  const pick = (a) => a[Math.floor(r() * a.length)],
    free = A().powers.filter((p) => !used.includes(p.id)),
    pw = pick(free.length ? free : A().powers),
    base = pick(pw.for),
    it = makeItem(s, base, null, null, true);
  used.push(pw.id);
  it.art = pw.id;
  const nm = pick(pw.names);
  it.artName = nm.charAt(0).toUpperCase() + nm.slice(1) + ', ' + byId(C.bases, base).name + ' of the ' + s.civ.name;
  return it;
}

on('worldBorn', (s, d) => {
  if (d.off.artifacts) return;
  const r = stream(s.seed, 'artifacts'),
    used = [],
    n = A().count;
  s.artifacts = { found: [] };
  if (n >= 1) s.town.stock.push(makeArtifact(s, r, used));
  if (n >= 2) s.artifacts.vault = makeArtifact(s, r, used);
  if (n >= 3) {
    // a region that is not home, as far away as the world allows
    const w = s.world,
      far = [];
    for (let cy = 0; cy < w.rows; cy++)
      for (let cx = 0; cx < w.cols; cx++)
        if (sketchOf(s, cx, cy).danger === Math.max(...w.sketch.map((e) => e.danger))) far.push([cx, cy]);
    const [cx, cy] = far[Math.floor(r() * far.length)];
    if (cx !== w.home.cx || cy !== w.home.cy) s.artifacts.region = { id: 'r' + cx + '_' + cy, item: makeArtifact(s, r, used) };
  }
});

// The relic's level of the locked place, and the far region, get theirs when they are first built.
{
  const vault = GENERATORS.vault;
  GENERATORS.vault = (s, rec) => {
    const m = vault(s, rec);
    if (s.artifacts && s.artifacts.vault && rec.level === rec.levels)
      for (const k in m.depots)
        if (m.depots[k].items.some((i) => i.base === 'relic')) {
          m.depots[k].items.push(s.artifacts.vault);
          delete s.artifacts.vault;
          break;
        }
    return m;
  };
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec),
      a = s.artifacts && s.artifacts.region;
    if (a && a.id === rec.id) {
      let at = null;
      for (const k in m.sites)
        if (
          m.sites[k].kind === 'cache' &&
          (at === null ||
            Math.abs((k % W) - 18) + Math.abs(Math.floor(k / W) - 18) <
              Math.abs((at % W) - 18) + Math.abs(Math.floor(at / W) - 18))
        )
          at = +k;
      if (at === null) at = idx(clamp(18, 0, W - 1), clamp(18, 0, H - 1));
      const d = m.depots || (m.depots = {});
      (d[at] = d[at] || { water: 0, fuel: 0, items: [] }).items.push(a.item);
      delete s.artifacts.region;
    }
    return m;
  };
}

// Powers that change numbers, while worn.
SOURCES.push({
  id: 'artifacts',
  fn(s, out) {
    for (const it of s.player.items) if (it.art && active(it)) for (const m of powerOf(it).mods) out.push(m);
  },
});
// Powers that act over time.
SYSTEMS.push({
  id: 'artifacts',
  fn(s, dt, ctx) {
    const p = s.player;
    for (const it of p.items) {
      const pw = powerOf(it);
      if (s.off.artifacts || !pw || !pw.tick || !active(it)) continue;
      if (pw.tick.water) p.water = Math.min(waterCap(s), p.water + pw.tick.water * dt);
      if (pw.tick.warmthFloor && !s.off.warmth) p.warmth = Math.max(p.warmth, pw.tick.warmthFloor);
      if (pw.tick.stamina && ctx.activity === 'move') p.stamina = Math.min(100, p.stamina + pw.tick.stamina * dt);
    }
  },
});
// Finding one: say so when you step onto the place it lies, and remember it once it is in your hands.
on('did', (s, d) => {
  if (!s.artifacts) return;
  const dep = s.depots[idx(s.player.x, s.player.y)];
  if (d.id === 'move' && dep && dep.items.some((i) => i.art))
    say(s, 'Something old and remarkable lies here: ' + dep.items.find((i) => i.art).artName + '. Open Pack to take it.', 'good');
  for (const it of s.player.items)
    if (it.art && !s.artifacts.found.includes(it.artName)) {
      s.artifacts.found.push(it.artName);
      say(s, 'You hold ' + it.artName + '. ' + powerOf(it).text, 'good');
    }
});
SWITCHES.push(['artifacts', 'Named artifacts']);
NOTES.push((s) =>
  s.artifacts
    ? [
        {
          label: 'Artifacts',
          text:
            'Three remarkable things were made by the ' +
            s.civ.name +
            ': one is for sale in ' +
            s.town.name +
            ', one lies with the relic, and one is in a cache in the farthest country.' +
            (s.artifacts.found.length ? ' You have held: ' + s.artifacts.found.join('; ') + '.' : ''),
        },
      ]
    : [],
);

export { powerOf };
export { makeArtifact };
