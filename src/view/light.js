/* Light (commission 5): the sun, the sky's soft light and the moon, outdoors and in. The style is a storybook one, so
   the light is warm where the sun falls and cool in the shade: the hemisphere light gives every surface a sky colour
   from above and a warm earth colour from below, and one directional light is the sun by day and the moon by night.
   Everything here is per vertex (Lambert materials), the cheapest light three.js has, so it costs nothing on Low. */
import { lerp } from './ctx.js';
import { hemi, sun } from './scene.js';
import { lookOn, LOOK_SWITCHES } from './quality.js';

LOOK_SWITCHES.push(['light', 'Warm sun and cool shade']);

const C = (h) => new THREE.Color(h);
const PAL = {
  sunHigh: C(0xfff1d6), // the sun overhead: nearly white, a little warm
  sunLow: C(0xffa25c), // at dawn and dusk: orange
  moon: C(0x8fa6dc), // moonlight: pale blue
  skyDay: C(0xbcd4f0), // the sky's light from above, by day (mixed with the land's own sky colour)
  skyNight: C(0x34426e),
  earthDay: C(0x7a6248), // light thrown back up by the ground: warm brown
  earthNight: C(0x15161e),
  storm: C(0x9aa0a6),
};
const tmp = C(0);
/* Outdoors. h: hour of the day (0-24); day: 0 at night to 1 by day; dusk: how near dawn or dusk; skyC: the sky's colour
   now; storm: whether a storm blows; sight: whether the traveller sees in the dark; lk: the look in force (C6, mood.js),
   whose sun, shade and bounce colours replace the fixed ones here. */
function lightOutdoors(h, day, dusk, skyC, storm, sight, lk) {
  if (!lookOn('light')) {
    // the old light, to compare
    hemi.color.setHex(0xdfe7ee);
    hemi.groundColor.setHex(0x5a554c);
    hemi.intensity = lerp(0.22, 0.78, day);
    sun.color.setHex(0xfff1dc);
    sun.intensity = lerp(0.03, 0.9, day) * (storm ? 0.4 : 1);
    const sa = ((h - 6) / 14) * Math.PI;
    sun.position.set(-Math.cos(sa) * 300, Math.max(20, Math.sin(sa) * 300), 120);
    return;
  }
  const sa = ((h - 6) / 14) * Math.PI,
    sy = Math.sin(sa),
    up = Math.max(0, sy); // how high the sun stands, 0 to 1
  // the sky light: the land's sky colour lifted toward blue by day, a deep blue by night
  tmp.copy(skyC).lerp(PAL.skyDay, 0.45);
  hemi.color.copy(PAL.skyNight).lerp(tmp, day);
  hemi.groundColor.copy(PAL.earthNight).lerp(PAL.earthDay, day);
  if (storm) {
    hemi.color.lerp(PAL.storm, 0.6);
    hemi.groundColor.lerp(PAL.storm, 0.3);
  }
  hemi.intensity = lerp(sight ? 0.55 : 0.42, storm ? 0.75 : 0.5, day) + dusk * 0.22;
  if (lk) {
    // the look's palette: a sun, the sky's light in the shade, the light thrown up by the ground
    hemi.color.copy(lk.c.shade);
    hemi.groundColor.copy(lk.c.bounce);
    hemi.intensity *= lk.fillK;
  }
  if (day > 0.02) {
    // the sun: orange when low, nearly white when high
    sun.color.copy(PAL.sunLow).lerp(PAL.sunHigh, Math.min(1, up * 2.2));
    if (dusk > 0) sun.color.lerp(PAL.sunLow, dusk * 0.5);
    sun.intensity = (0.3 + 0.85 * Math.min(1, up * 2.5)) * day * (storm ? 0.3 : 1);
    if (lk) {
      sun.color.copy(lk.c.sun);
      sun.intensity *= lk.sunK;
    }
    sun.position.set(-Math.cos(sa) * 300, Math.max(25, sy * 300), 120);
  } else {
    // the moon, opposite the sun, as the sky shows it (sky.js)
    sun.color.copy(PAL.moon);
    sun.intensity = (storm ? 0.05 : 0.28) * (lk ? lk.sunK : 1);
    if (lk) sun.color.copy(lk.c.sun);
    sun.position.set(Math.cos(sa) * 300, Math.max(60, Math.abs(sy) * 300), -120);
  }
}
// Underground and in levels: no sun; a faint light from above in the level's own glow.
function lightIndoors() {
  sun.intensity = 0;
  hemi.groundColor.setHex(lookOn('light') ? 0x2a2420 : 0x5a554c);
}
export { lightOutdoors, lightIndoors, PAL };
