/* The finish (C5.19), High only: the scene is drawn into a picture of its own (multisampled, so edges stay smooth),
   then finished on the way to the screen, like a painting varnished:
   - bloom: what is brightest (the sun and its glow, fires, lamps, lit windows, glints on water) bleeds a soft light
     round itself, made from a quarter-size copy blurred twice;
   - grading: a touch more contrast and colour, the light warmed and the shadows cooled, the storybook palette;
   - a vignette: the corners darkened a little, to hold the eye in the middle.
   Three small extra passes a frame. Switch: `post`.
   Commission 6 adds, in the last pass:
   - the look's grade (above, `grade`);
   - ink: in other worlds (the look's `line`), thin ink lines on everything, land and all, found where the depth of the
     picture jumps or bends: the scene is then drawn into a picture that keeps its depth (and is not multisampled: the
     lines cover the edges). Fainter with distance. Switch: `ink`; from Low.
   - paper: a painted grain, fine speckle and long faint brush strokes fixed to the screen, so flat colour reads as
     paint on paper (the look's `paper`). Switch: `paper`; Medium and High. */
import { Q, LOOK_SWITCHES, lookOn } from './quality.js';
import { NOW } from './mood.js';
import { setWisps } from './toon.js';

LOOK_SWITCHES.push(['post', 'Bloom and colour grading']);
LOOK_SWITCHES.push(['ink', 'Ink lines in other worlds']);
LOOK_SWITCHES.push(['paper', 'A painted grain over the picture']);
const postOn = () => !!Q.post && lookOn('post') && lookOn('light');
const inkOn = () => !!Q.ink && lookOn('ink') && !!NOW.look && NOW.look.line > 0.02;
const paperOn = () => !!Q.paper && lookOn('paper') && !!NOW.look;

let T = null; // the render targets, sized to the screen
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)),
  qScene = new THREE.Scene(),
  qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
qScene.add(quad);
quad.frustumCulled = false;
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const bright = new THREE.ShaderMaterial({
  uniforms: { src: { value: null } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D src; varying vec2 vUv;
    void main(){ vec3 c = texture2D(src, vUv).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
      gl_FragColor = vec4(c * smoothstep(0.8, 1.0, l), 1.0); }`,
  depthTest: false,
  depthWrite: false,
});
const blur = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, dir: { value: new THREE.Vector2() } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(src, vUv).rgb * 0.227;
      c += (texture2D(src, vUv + dir * 1.385).rgb + texture2D(src, vUv - dir * 1.385).rgb) * 0.316;
      c += (texture2D(src, vUv + dir * 3.231).rgb + texture2D(src, vUv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0); }`,
  depthTest: false,
  depthWrite: false,
});
/* The grade (C6): from the look in force (mood.js) when there is one: its saturation and contrast, the darks leaning
   toward its lift colour and the lights toward its gain colour, and the darks lifted a little into the lift colour, so
   shade is never black but the colour of the air. Without a look, the storybook grade of commission 5. */
const G = {
  sat: { value: 1.1 },
  contrast: { value: 1.06 },
  liftT: { value: new THREE.Vector3(0.97, 0.99, 1.05) },
  gainT: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
  liftC: { value: new THREE.Vector3(0, 0, 0) },
  vignette: { value: 0.55 },
  gainC: { value: new THREE.Vector3(1, 1, 1) },
  wash: { value: 0 },
};
const FU = Object.assign(
  {
    src: { value: null },
    glow: { value: null },
    strength: { value: 0.5 },
    depth: { value: null },
    texel: { value: new THREE.Vector2(1, 1) },
    cNear: { value: 0.3 },
    cFar: { value: 3000 },
    inkK: { value: 0 },
    inkC: { value: new THREE.Vector3(0.16, 0.16, 0.2) },
    inkFar: { value: 600 },
    paper: { value: 0 },
  },
  G,
);
const makeFinish = (defines) =>
  new THREE.ShaderMaterial({
    uniforms: FU,
    defines,
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D src; uniform sampler2D glow; uniform float strength; varying vec2 vUv;
    uniform float sat; uniform float contrast; uniform vec3 liftT; uniform vec3 gainT; uniform vec3 liftC;
    uniform float vignette; uniform float paper; uniform vec3 gainC; uniform float wash;
#ifdef INK
    uniform sampler2D depth; uniform vec2 texel; uniform float cNear; uniform float cFar;
    uniform float inkK; uniform vec3 inkC; uniform float inkFar;
    // one over the distance: on a flat surface it changes evenly across the screen, so its bend is zero there and
    // large at an edge or a crease
    float invZ(vec2 uv) { float d = texture2D(depth, uv).x; return (cFar - d * (cFar - cNear)) / (cNear * cFar); }
#endif
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
    }
    void main(){
      vec3 c = texture2D(src, vUv).rgb + texture2D(glow, vUv).rgb * strength;
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(vec3(l), c, sat);                                   // colour
      c = (c - 0.5) * contrast + 0.5;                             // contrast
      c *= mix(liftT, gainT, smoothstep(0.15, 0.8, l));           // the lights and the darks each lean their way
      c += liftC * (1.0 - smoothstep(0.0, 0.45, l));              // shade the colour of the air, never black
      c = mix(c, gainC, wash);                                    // washed pale toward the paper (other worlds)
#ifdef INK
      float w = invZ(vUv), wl = invZ(vUv - vec2(texel.x, 0.0)), wr = invZ(vUv + vec2(texel.x, 0.0)),
        wd = invZ(vUv - vec2(0.0, texel.y)), wu = invZ(vUv + vec2(0.0, texel.y));
      float wmax = max(w, max(max(wl, wr), max(wd, wu)));
      float bend = (abs(wl + wr - 2.0 * w) + abs(wd + wu - 2.0 * w)) / wmax;
      float e = smoothstep(0.015, 0.05, bend) * inkK;
      e *= mix(0.9, 0.25, smoothstep(inkFar * 0.15, inkFar * 0.8, 1.0 / wmax)); // far lines fainter, as if drawn lighter
      c = mix(c, inkC, e);
#endif
      if (paper > 0.0) {
        vec2 px = gl_FragCoord.xy;
        float grain = hash(floor(px / 1.5)) - 0.5;                                     // a fine speckle
        vec2 q = vec2(px.x * 0.8 + px.y * 0.6, px.y * 0.8 - px.x * 0.6);                 // dabs on the slant
        float dab = vnoise(q * vec2(0.025, 0.07)) + vnoise(q * vec2(0.06, 0.15)) * 0.5 - 0.75; // soft brush dabs
        c *= 1.0 + paper * (grain * 0.045 + dab * 0.045) * (0.4 + 0.6 * smoothstep(0.05, 0.4, l));
      }
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * vignette;        // the vignette
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    depthTest: false,
    depthWrite: false,
  });
const finish = makeFinish({}),
  finishInk = makeFinish({ INK: '' });
// a colour as a tint to multiply by: its hue at luminance 1, pulled toward white (k: how much of it)
const tint = (v, c, k) => {
  const l = Math.max(0.02, c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11);
  v.set(1 + (c[0] / l - 1) * k, 1 + (c[1] / l - 1) * k, 1 + (c[2] / l - 1) * k);
};
function grade(lk) {
  if (!lk) {
    G.sat.value = 1.1;
    G.contrast.value = 1.06;
    G.liftT.value.set(0.97, 0.99, 1.05);
    G.gainT.value.set(1.04, 1.0, 0.95);
    G.liftC.value.set(0, 0, 0);
    G.vignette.value = 0.55;
    G.wash.value = 0;
    return;
  }
  G.sat.value = lk.sat;
  G.contrast.value = lk.contrast;
  tint(G.liftT.value, lk.lift, 0.1);
  tint(G.gainT.value, lk.gain, 0.45);
  G.liftC.value.set(lk.lift[0], lk.lift[1], lk.lift[2]).multiplyScalar(0.35);
  G.vignette.value = lk.vignette;
  G.gainC.value.set(lk.gain[0], lk.gain[1], lk.gain[2]);
  G.wash.value = lk.wash || 0;
}
function targets(renderer) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2()),
    w = size.x,
    h = size.y;
  if (T && T.w === w && T.h === h) return T;
  if (T) for (const k of ['main', 'a', 'b', 'ink']) if (T[k]) T[k].dispose();
  const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat },
    main =
      renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget
        ? new THREE.WebGLMultisampleRenderTarget(w, h, opt)
        : new THREE.WebGLRenderTarget(w, h, opt);
  if (main.samples !== undefined) main.samples = 4;
  const qw = Math.max(1, w >> 2),
    qh = Math.max(1, h >> 2);
  T = { w, h, main, a: new THREE.WebGLRenderTarget(qw, qh, opt), b: new THREE.WebGLRenderTarget(qw, qh, opt), qw, qh };
  return T;
}
const pass = (renderer, mat, to) => {
  quad.material = mat;
  renderer.setRenderTarget(to);
  renderer.render(qScene, qCam);
};
// Draw a frame: through the finish when it is on, else straight to the screen. Returns the draw calls and triangles
// of the scene itself, for the meter.
// The picture that keeps its depth, for the ink (made when first needed).
function inkTarget(t) {
  if (t.ink) return t.ink;
  const rt = new THREE.WebGLRenderTarget(t.w, t.h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
  rt.depthTexture = new THREE.DepthTexture(t.w, t.h);
  rt.depthTexture.type = THREE.UnsignedIntType;
  return (t.ink = rt);
}
function draw(renderer, scene, camera) {
  if (!postOn()) {
    renderer.render(scene, camera);
    return null;
  }
  const t = targets(renderer),
    ink = inkOn();
  setWisps(ink);
  const to = ink ? inkTarget(t) : t.main;
  grade(NOW.look);
  FU.paper.value = paperOn() ? NOW.look.paper : 0;
  if (ink) {
    const lk = NOW.look,
      px = Math.max(1, renderer.getPixelRatio() * 0.55); // lines about a pixel and a half wide on a phone
    FU.depth.value = to.depthTexture;
    FU.texel.value.set(px / t.w, px / t.h);
    FU.cNear.value = camera.near;
    FU.cFar.value = camera.far;
    FU.inkK.value = Math.min(1, lk.line);
    FU.inkC.value.set(lk.ink[0], lk.ink[1], lk.ink[2]);
    FU.inkFar.value = scene.fog ? scene.fog.far : 600;
  }
  renderer.setRenderTarget(to);
  renderer.render(scene, camera);
  const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  const ac = renderer.autoClear;
  bright.uniforms.src.value = to.texture;
  pass(renderer, bright, t.a);
  blur.uniforms.src.value = t.a.texture;
  blur.uniforms.dir.value.set(1 / t.qw, 0);
  pass(renderer, blur, t.b);
  blur.uniforms.src.value = t.b.texture;
  blur.uniforms.dir.value.set(0, 1 / t.qh);
  pass(renderer, blur, t.a);
  FU.src.value = to.texture;
  FU.glow.value = t.a.texture;
  pass(renderer, ink ? finishInk : finish, null);
  renderer.autoClear = ac;
  // the meter and the benchmark read the scene's own numbers, not the last little pass's
  renderer.info.render.calls = info.calls + 4;
  renderer.info.render.triangles = info.triangles + 8;
  return info;
}
export { draw, postOn };
