/* Generated biomes from content/biomeparts.js. Each world makes a few biomes of its own from slots and gives them
   to some of its regions. A generated biome has the same shape as a hand-written one, with gen: true and an id
   'g<seed>_<n>'; it is rebuilt from the seed whenever needed (a new world, a loaded save) and added to C.biomes so
   that every lookup finds it. Nothing about it is stored but its id. Switch: s.off.biomegen (at creation only). */
import { C, byId, stream } from './core.js';
import { LOADERS, NOTES, SKETCHERS, SWITCHES } from './hooks.js';

const G = () => C.biomeGen;
const ofSeed = (seed) => 'g' + (seed >>> 0) + '_';
const isGen = (id) => typeof id === 'string' && /^g\d+_\d+$/.test(id);

// Rotate a colour's hue by deg degrees (for the strange-hued rare).
function hueShift(c, deg) {
  const num = typeof c === 'number',
    n = num ? c : parseInt(c.slice(1), 16);
  let r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2,
    d = mx - mn;
  let h = 0,
    s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (((h + deg) % 360) + 360) % 360;
  const C2 = (1 - Math.abs(2 * l - 1)) * s,
    X = C2 * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - C2 / 2,
    [r1, g1, b1] =
      h < 60
        ? [C2, X, 0]
        : h < 120
          ? [X, C2, 0]
          : h < 180
            ? [0, C2, X]
            : h < 240
              ? [0, X, C2]
              : h < 300
                ? [X, 0, C2]
                : [C2, 0, X];
  const out = (Math.round((r1 + m) * 255) << 16) | (Math.round((g1 + m) * 255) << 8) | Math.round((b1 + m) * 255);
  return num ? out : '#' + out.toString(16).padStart(6, '0');
}

function makeBiome(seed, n) {
  const r = stream(seed, 'biomegen:' + n),
    pick = (a) => a[Math.floor(r() * a.length)],
    X = G(),
    cl = pick(X.climates),
    suits = (list) => list.filter((e) => e.climates.includes(cl.id)),
    lf = pick(X.landforms),
    wa = pick(suits(X.waters)),
    wo = pick(suits(X.woodlands)),
    gr = pick(suits(X.grounds)),
    rare = r() < X.rareChance ? pick(X.rares) : null,
    copy = (o) => JSON.parse(JSON.stringify(o));
  const forest = copy(wo.forest);
  if (rare && rare.treeMul) {
    forest.tree.h = forest.tree.h.map((h) => h * rare.treeMul);
    forest.frac = Math.min(0.4, forest.frac * rare.forestMul);
  }
  let colors = [...cl.ground, wo.color, wa.color, gr.color],
    sky = cl.sky,
    tint = cl.tint;
  if (rare && rare.hue) {
    colors = colors.map((c) => hueShift(c, rare.hue));
    sky = hueShift(sky, rare.hue / 3);
  }
  const name = (rare ? rare.word + ' ' : '') + pick(cl.words) + ' ' + pick(lf.nouns),
    b = {
      id: ofSeed(seed) + n,
      gen: true,
      parts: { climate: cl.id, landform: lf.id, water: wa.id, woodland: wo.id, ground: gr.id, rare: rare ? rare.id : null },
      sky,
      creatureTint: tint,
      name,
      blurb: cl.blurb + ' ' + wa.blurb + (rare ? ' ' + rare.text : ''),
      hills: lf.hills,
      mountains: lf.mountains,
      springs: wa.springs,
      foul: wa.foul,
      day: copy(cl.day),
      night: copy(cl.night),
      storm: copy(cl.storm),
      colors,
      forest,
      river: copy(wa.river),
      special: copy(gr.special),
      prefix: cl.words.slice(0, 3),
    };
  if (cl.melt) b.melt = cl.melt;
  if (cl.lush !== undefined) b.lush = rare && rare.hue ? hueShift(cl.lush, rare.hue) : cl.lush;
  if (cl.rocky !== undefined) b.rocky = cl.rocky;
  return b;
}
// Make sure this seed's biomes are in C.biomes (and their creature names in C.creature.prefix).
function ensureBiomes(seed) {
  for (let n = 0; n < G().perWorld; n++) {
    const id = ofSeed(seed) + n;
    if (byId(C.biomes, id)) continue;
    const b = makeBiome(seed, n);
    C.biomes.push(b);
    C.creature.prefix[id] = b.prefix;
  }
}

SKETCHERS.push((seed, world, off) => {
  if (off.biomegen) return;
  ensureBiomes(seed);
  const r = stream(seed, 'biomegen:sketch'),
    X = G();
  for (let cy = 0; cy < world.rows; cy++)
    for (let cx = 0; cx < world.cols; cx++) {
      const home = cx === world.home.cx && cy === world.home.cy,
        roll = r(),
        which = Math.floor(r() * X.perWorld);
      if (roll < (home ? X.homeChance : X.regionChance))
        world.sketch[cy * world.cols + cx].biome = ofSeed(seed) + (home ? 0 : which);
    }
});
LOADERS.push((s) => {
  if (s.world && s.world.sketch.some((e) => isGen(e.biome))) ensureBiomes(s.seed);
});
SWITCHES.push(['biomegen', 'Generated biomes (new worlds)']);
NOTES.push((s) => {
  const ids = [...new Set(s.world.sketch.map((e) => e.biome).filter(isGen))].filter((id) =>
    Object.values(s.areas).some((a) => a.biome === id && a.visited),
  );
  return ids.map((id) => {
    const b = byId(C.biomes, id);
    return { label: b.name + ' (a country of this world only)', text: b.blurb };
  });
});

export { makeBiome, ensureBiomes, isGen, hueShift };
