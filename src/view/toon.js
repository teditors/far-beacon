/* Toon touches (commission 6): soft bands of light on people, creatures, buildings and things, and distance that fades
   into the air in steps, so hills stack in bands like a painting.
   - Bands: things made with the kit (kitMat), people and creatures (actors.js) and the plain props (scene.js std) take
     a toon material from Low up: the sun's light on them falls in two or three bands (the look says how many and how
     soft), and the sky's fill light stays smooth under it, so form reads at a glance on a small screen without
     looking like a cartoon. The bands are one tiny texture, rewritten when the look's bands change.
   - Fog in steps: the fog's fade is drawn in five soft steps instead of one smooth ramp. Every material's fog goes
     through one shared piece of shader (patched once, here); the frame turns the steps on by handing the fog a
     negative near distance (run.js), which nothing else reads, so it costs no extra uniform and no recompiling.
   Switches: `toon`, `fogbands`. */
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';

LOOK_SWITCHES.push(['toon', 'Soft bands of light on people, creatures and things']);
LOOK_SWITCHES.push(['fogbands', 'Distance fading in steps']);
const toonOn = () => !!Q.toon && lookOn('toon') && lookOn('light');
const fogBandsOn = () => !!Q.fogBands && lookOn('fogbands') && lookOn('look') && lookOn('light');

/* ---------- bands ---------- */
const W = 64;
const BANDS = new THREE.DataTexture(new Uint8Array(W * 4), W, 1, THREE.RGBAFormat);
BANDS.minFilter = BANDS.magFilter = THREE.LinearFilter;
BANDS.generateMipmaps = false;
let bandKey = '';
/* The sun's share of light across a surface, from facing away (x = 0) to facing it (x = 1): in bands (2 or 3) with
   edges this soft (0 to 1). The first band is shade (the fill light only); the last is full sun. */
function setBands(bands, soft) {
  bands = Math.max(2, Math.min(4, Math.round(bands || 3)));
  soft = Math.max(0, Math.min(1, soft === undefined ? 0.45 : soft));
  const key = bands + ':' + soft.toFixed(2);
  if (key === bandKey) return;
  bandKey = key;
  const d = BANDS.image.data,
    w = 0.02 + soft * 0.16, // half the width of an edge, in the sun's share
    level = (i) => (i === 0 ? 0 : bands === 2 ? 1 : 0.5 + (0.5 * (i - 1)) / (bands - 2)),
    edge = (i) => 0.06 + ((i - 1) * 0.88) / (bands - 1); // where each band begins: the shade's edge, then evenly
  for (let p = 0; p < W; p++) {
    const lam = Math.max(0, (p / (W - 1)) * 2 - 1); // the light a smooth surface would get
    let v = level(0);
    for (let i = 1; i < bands; i++) {
      const e = edge(i),
        t = Math.max(0, Math.min(1, (lam - (e - w)) / (2 * w)));
      v += (level(i) - level(i - 1)) * t * t * (3 - 2 * t);
    }
    const b = Math.round(Math.max(0, Math.min(1, v)) * 255);
    d.set([b, b, b, 255], p * 4);
  }
  BANDS.needsUpdate = true;
}
setBands(3, 0.45);
// A toon material reading vertex colours (and, if given, a painted texture), or null when the bands are off.
const toonMat = (extra) =>
  toonOn() ? new THREE.MeshToonMaterial(Object.assign({ vertexColors: true, gradientMap: BANDS }, extra || {})) : null;

/* ---------- fog in steps ---------- */
const STEPS = 5;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
  #else
    float fogFactor = smoothstep( abs( fogNear ), fogFar, fogDepth );
    if ( fogNear < 0.0 ) {
      // in soft steps (C6): far things fade toward the air in bands, as hills do in a painting
      float fb = fogFactor * ${STEPS}.0, fi = floor( fb );
      fogFactor = mix( fogFactor, ( fi + smoothstep( 0.3, 0.7, fb - fi ) ) / ${STEPS}.0, 0.85 );
    }
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
export { toonOn, toonMat, setBands, fogBandsOn, BANDS };
