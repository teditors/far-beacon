/* The look in the frame (commission 6): each frame, the look in force (look.js, from content/looks.js) for where the
   traveller stands, the hour and the weather, blended across a border between two biomes as the sky already was.
   NOW.look is what the light (light.js), the sky (sky.js), the fog (run.js) and the finish (post.js) read; it is null
   when the switch is off or indoors, and they then do as they did in commission 5. Switch: `look`. */
import { R, V } from './ctx.js';
import { COLS, NUMS, lookContext, lookFor } from './look.js';
import { LOOK_SWITCHES, lookOn } from './quality.js';

LOOK_SWITCHES.push(['look', 'Palettes rolled from the land, the hour and the world']);
const lookOnNow = () => lookOn('look') && lookOn('light');

const NOW = { look: null, ctx: null };
const C = (a) => new THREE.Color(a[0], a[1], a[2]);
// the look's colours as Three.js colours, made once and reused
const TC = {};
for (const k of COLS) TC[k] = new THREE.Color();

/* The look for this frame. day, dusk: as run.js has them; at, a point (x, z) where the land's share of each biome is
   read (near a border the look shades from one into the next); storm: what falls in a storm (sky.js kindOf), or null.
   Returns NOW.look, or null. */
function updateLook(day, dusk, at, storm) {
  if (!lookOnNow() || !V.S || R.isDark(V.S) || R.levelLook(V.S)) return (NOW.look = null);
  const S = V.S,
    base = V.base;
  let look;
  if (base && base.share && base.share.length > 1 && at) {
    // near a border: each biome's look, weighted by its share of the land here
    look = null;
    let total = 0;
    base.share.forEach((f, i) => {
      const w = f(at.x, at.z);
      if (w <= 0.001) return;
      const l = lookFor(lookContext(R, S, base.land.biomes[i]), day, dusk, storm);
      if (!look) {
        look = l;
        total = w;
        return;
      }
      total += w;
      const t = w / total;
      for (const k of COLS) for (let j = 0; j < 3; j++) look[k][j] += (l[k][j] - look[k][j]) * t;
      for (const k of NUMS) look[k] += (l[k] - look[k]) * t;
    });
  }
  if (!look) look = lookFor(lookContext(R, S), day, dusk, storm);
  for (const k of COLS) TC[k].setRGB(look[k][0], look[k][1], look[k][2]);
  look.c = TC; // as Three.js colours
  NOW.look = look;
  return look;
}
export { NOW, updateLook, lookOnNow, C };
