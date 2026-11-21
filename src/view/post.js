/* The finish (C5.19), High only: the scene is drawn into a picture of its own (multisampled, so edges stay smooth),
   then finished on the way to the screen, like a painting varnished:
   - bloom: what is brightest (the sun and its glow, fires, lamps, lit windows, glints on water) bleeds a soft light
     round itself, made from a quarter-size copy blurred twice;
   - grading: a touch more contrast and colour, the light warmed and the shadows cooled, the storybook palette;
   - a vignette: the corners darkened a little, to hold the eye in the middle.
   Three small extra passes a frame. Switch: `post`. */
import { Q, LOOK_SWITCHES, lookOn } from './quality.js';
import { NOW } from './mood.js';

LOOK_SWITCHES.push(['post', 'Bloom and colour grading (High)']);
const postOn = () => !!Q.post && lookOn('post') && lookOn('light');

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
};
const finish = new THREE.ShaderMaterial({
  uniforms: Object.assign({ src: { value: null }, glow: { value: null }, strength: { value: 0.5 } }, G),
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D src; uniform sampler2D glow; uniform float strength; varying vec2 vUv;
    uniform float sat; uniform float contrast; uniform vec3 liftT; uniform vec3 gainT; uniform vec3 liftC;
    uniform float vignette;
    void main(){
      vec3 c = texture2D(src, vUv).rgb + texture2D(glow, vUv).rgb * strength;
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(vec3(l), c, sat);                                   // colour
      c = (c - 0.5) * contrast + 0.5;                             // contrast
      c *= mix(liftT, gainT, smoothstep(0.15, 0.8, l));           // the lights and the darks each lean their way
      c += liftC * (1.0 - smoothstep(0.0, 0.45, l));              // shade the colour of the air, never black
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * vignette;        // the vignette
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
  depthTest: false,
  depthWrite: false,
});
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
    return;
  }
  G.sat.value = lk.sat;
  G.contrast.value = lk.contrast;
  tint(G.liftT.value, lk.lift, 0.1);
  tint(G.gainT.value, lk.gain, 0.45);
  G.liftC.value.set(lk.lift[0], lk.lift[1], lk.lift[2]).multiplyScalar(0.35);
  G.vignette.value = lk.vignette;
}
function targets(renderer) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2()),
    w = size.x,
    h = size.y;
  if (T && T.w === w && T.h === h) return T;
  if (T) for (const k of ['main', 'a', 'b']) T[k].dispose();
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
function draw(renderer, scene, camera) {
  if (!postOn()) {
    renderer.render(scene, camera);
    return null;
  }
  const t = targets(renderer);
  grade(NOW.look);
  renderer.setRenderTarget(t.main);
  renderer.render(scene, camera);
  const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  const ac = renderer.autoClear;
  bright.uniforms.src.value = t.main.texture;
  pass(renderer, bright, t.a);
  blur.uniforms.src.value = t.a.texture;
  blur.uniforms.dir.value.set(1 / t.qw, 0);
  pass(renderer, blur, t.b);
  blur.uniforms.src.value = t.b.texture;
  blur.uniforms.dir.value.set(0, 1 / t.qh);
  pass(renderer, blur, t.a);
  finish.uniforms.src.value = t.main.texture;
  finish.uniforms.glow.value = t.a.texture;
  pass(renderer, finish, null);
  renderer.autoClear = ac;
  // the meter and the benchmark read the scene's own numbers, not the last little pass's
  renderer.info.render.calls = info.calls + 4;
  renderer.info.render.triangles = info.triangles + 8;
  return info;
}
export { draw, postOn };
