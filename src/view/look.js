/* The look in force (commission 6): which palette and style a place is seen in, built from the layers in
   content/looks.js (see the top of that file for the order). Pure arithmetic on plain numbers, with no Three.js and
   no screen, so it runs in Node and is tested there (tests/pieces.test.js); the view turns its colours into light, sky,
   fog and the finish (light.js, run.js, sky.js, post.js).

   lookContext(S) reads what the look depends on from the state. lookFor(ctx) gives the look: colours as [r, g, b]
   from 0 to 1, numbers as numbers, and `names`, the layers that went into it (for the meter and the Almanac). The
   part that does not change by the hour is kept, so a frame costs a few dozen multiplications. */
import { CONTENT as C } from '../content/index.js';

const COLS = ['zenith', 'horizon', 'fog', 'sun', 'shade', 'bounce', 'cloud', 'lift', 'gain', 'ink'];
const NUMS = ['sunK', 'fillK', 'sat', 'contrast', 'bands', 'soft', 'reach', 'outline', 'paper', 'vignette', 'wash'];
const L = () => C.looks;

const hex = (h) => {
  const n = typeof h === 'number' ? h : parseInt(String(h).replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const toHex = (c) =>
  '#' +
  c
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// a small hash of a seed and a name, 0 to 1: the same world always rolls the same look, and asks nothing of the rules
function roll(seed, name) {
  const fmix = (h) => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return fmix(h ^ fmix((seed >>> 0) + 0x9e3779b9)) / 4294967296;
}
// turn a colour's hue by deg degrees and scale its saturation
function turn(c, deg, sat) {
  const [r, g, b] = c,
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2,
    d = mx - mn;
  let h = 0,
    s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (((h * 60 + deg) % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s * sat));
  const C2 = (1 - Math.abs(2 * l - 1)) * s,
    X = C2 * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - C2 / 2,
    k = Math.floor(h / 60);
  const [r1, g1, b1] = [
    [C2, X, 0],
    [X, C2, 0],
    [0, C2, X],
    [0, X, C2],
    [X, 0, C2],
    [C2, 0, X],
  ][k % 6];
  return [r1 + m, g1 + m, b1 + m];
}

// a look from its content entry: every colour as numbers
function fresh(entry) {
  const o = { names: [] };
  for (const k of COLS) o[k] = hex(entry[k] || entry.horizon || '#000000');
  for (const k of NUMS) o[k] = entry[k];
  if (!entry.fog) o.fog = o.horizon.slice();
  return o;
}
// pull look o toward layer e by k (e.k, scaled by w); a layer names only what it changes
function layer(o, e, w) {
  if (!e) return o;
  const k = (e.k === undefined ? 1 : e.k) * (w === undefined ? 1 : w);
  if (k <= 0) return o;
  for (const c of COLS) if (e[c]) o[c] = mix(o[c], hex(e[c]), k);
  // a layer with a horizon but no fog of its own pulls the fog with it
  if (e.horizon && !e.fog) o.fog = mix(o.fog, hex(e.horizon), k);
  for (const n of NUMS) if (e[n] !== undefined) o[n] += (e[n] - o[n]) * k;
  if (e.name && k > 0.05) o.names.push(e.name);
  return o;
}

// The climate a biome's look starts from.
function climateOf(biome) {
  return (biome && biome.parts && biome.parts.climate) || (biome && L().biomeClimate[biome.id]) || 'temperate';
}
// The rare look of this world or this country, if it has one.
function oddLook(seed, region) {
  const X = L(),
    pick = (r) => X.odd[Math.floor(r * X.odd.length) % X.odd.length];
  if (roll(seed, 'look:world') < X.worldChance) return pick(roll(seed, 'look:world:which'));
  if (region && region !== 'overworld' && roll(seed, 'look:' + region) < X.countryChance)
    return pick(roll(seed, 'look:which:' + region));
  return null;
}
// The palette of another world, from its seed.
const realmPalette = (seed) => L().realm.palettes[Math.floor(roll(seed, 'look:realm') * L().realm.palettes.length)];

/* What the look depends on, read from the state. biome: a biome object (the one under the player unless given). */
function lookContext(R, S, biome) {
  const rec = R.outdoorRec ? R.outdoorRec(S) : null,
    b = biome || R.biomeOf(S),
    realm = S.realm && S.realms && S.realms[S.realm],
    rr = rec && R.regionRareOf ? R.regionRareOf(S, rec.id) : null,
    mp = R.mainPlot ? R.mainPlot(S) : null;
  return {
    seed: S.seed >>> 0,
    biome: b ? b.id : '',
    climate: climateOf(b),
    biomeSky: b && b.sky !== undefined ? b.sky : null,
    region: rec ? (S.realm ? S.realm + ':' : '') + rec.id : '',
    year: S.year || '',
    trouble: mp ? mp.kind : '',
    cursed: !!(S.curses && rec && S.curses[rec.id]),
    rare: rr ? rr.id : '',
    realm: realm ? realm.seed >>> 0 : null,
  };
}

const KEPT = new Map();
// The look of a place by day, before the weather and the hour.
function dayLook(ctx) {
  const key = [
    ctx.seed,
    ctx.biome,
    ctx.climate,
    ctx.biomeSky,
    ctx.region,
    ctx.year,
    ctx.trouble,
    ctx.cursed,
    ctx.rare,
    ctx.realm,
  ].join('|');
  let o = KEPT.get(key);
  if (o) return o;
  const X = L(),
    cl = X.climates[ctx.climate] || X.climates.temperate;
  o = layer(fresh(X.base), cl);
  o.names = [cl.name];
  // this world's version of its climate: turned a little in hue and saturation, all its colours alike
  const v = cl.vary || { hue: [0, 0], sat: 0 },
    dh = v.hue[0] + roll(ctx.seed, 'look:hue:' + ctx.climate) * (v.hue[1] - v.hue[0]),
    ds = 1 + (roll(ctx.seed, 'look:sat:' + ctx.climate) * 2 - 1) * v.sat;
  if (dh || v.sat)
    for (const c of ['zenith', 'horizon', 'fog', 'shade', 'lift', 'cloud']) o[c] = turn(o[c], c === 'zenith' ? dh * 0.6 : dh, ds);
  o.turned = Math.round(dh);
  if (ctx.biomeSky !== null && ctx.biomeSky !== undefined) {
    const bs = hex(ctx.biomeSky);
    o.horizon = mix(o.horizon, bs, X.biomeSky);
    o.fog = mix(o.fog, bs, X.biomeSky);
  }
  const odd = ctx.realm === null ? oddLook(ctx.seed, ctx.region) : null;
  if (odd) layer(o, odd);
  if (ctx.realm !== null && ctx.realm !== undefined) {
    layer(o, X.realm.style);
    layer(o, realmPalette(ctx.realm));
  }
  layer(o, X.years[ctx.year]);
  if (X.troubles[ctx.trouble]) layer(o, X.troubles[ctx.trouble], X.troubleK);
  if (ctx.cursed) layer(o, X.troubles.curse, X.curseK);
  layer(o, X.rares[ctx.rare]);
  if (KEPT.size > 64) KEPT.clear();
  KEPT.set(key, o);
  return o;
}
/* The look now. Besides the context: day (0 night to 1 day), dusk (0 to 1 near dawn and dusk), storm (what falls,
   as sky.js names it: rain, snow, dust, hail, ash, stars, or '' for a storm of fog; null when no storm blows). */
function lookFor(ctx, day, dusk, storm) {
  const X = L(),
    d = dayLook(ctx),
    o = { names: d.names.slice(), turned: d.turned };
  for (const c of COLS) o[c] = d[c].slice();
  for (const n of NUMS) o[n] = d[n];
  if (storm !== null && storm !== undefined) {
    layer(o, X.weather.storm);
    layer(o, X.weather[storm]);
  }
  if (dusk > 0) layer(o, X.dusk, dusk * (0.4 + 0.6 * day));
  if (day < 1) layer(o, X.night, 1 - (day === undefined ? 1 : day));
  return o;
}
// The menus, for the Almanac and the tests: every layer by name.
function lookMenus() {
  const X = L();
  return {
    climates: Object.keys(X.climates).map((k) => [k, X.climates[k].name, X.climates[k].vary]),
    odd: X.odd.map((e) => [e.id, e.name]),
    realm: X.realm.palettes.map((e) => e.name),
    years: Object.keys(X.years).map((k) => [k, X.years[k].name]),
    troubles: Object.keys(X.troubles).map((k) => [k, X.troubles[k].name]),
    rares: Object.keys(X.rares).map((k) => [k, X.rares[k].name]),
    weather: Object.keys(X.weather).map((k) => [k, X.weather[k].name]),
  };
}
export { lookContext, lookFor, dayLook, lookMenus, climateOf, oddLook, realmPalette, roll, hex, toHex, turn, COLS, NUMS };
