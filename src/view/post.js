/* The finish (C5.19), High only: the scene is drawn into a picture of its own (multisampled, so edges stay smooth),
   then finished on the way to the screen, like a painting varnished:
   - bloom: what is brightest (the sun and its glow, fires, lamps, lit windows, glints on water) bleeds a soft light
     round itself, made from a quarter-size copy blurred twice;
   - grading: a touch more contrast and colour, the light warmed and the shadows cooled, the storybook palette;
   - a vignette: the corners darkened a little, to hold the eye in the middle.
   Three small extra passes a frame. Switch: `post`. */
import { Q, LOOK_SWITCHES, lookOn } from './quality.js';

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
const finish = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, glow: { value: null }, strength: { value: 0.5 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D src; uniform sampler2D glow; uniform float strength; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(src, vUv).rgb + texture2D(glow, vUv).rgb * strength;
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(vec3(l), c, 1.1);                                  // a touch more colour
      c = (c - 0.5) * 1.06 + 0.5;                                // a touch more contrast
      c *= mix(vec3(0.97, 0.99, 1.05), vec3(1.04, 1.0, 0.95), smoothstep(0.15, 0.8, l)); // warm light, cool shade
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.55;            // the vignette
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
  depthTest: false,
  depthWrite: false,
});
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
