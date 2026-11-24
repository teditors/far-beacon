/* Water (C5.14): rivers, lakes and the sea as a surface of their own over a carved bed (terrain.js), instead of blue
   ground. The surface is a mesh over the same grid as the ground, only where there is water, and its shader does the
   rest per pixel:
   - ripples: the normal is stirred by a few crossing waves that drift with time, so the light breaks on it;
   - the sky: at a low angle the water mirrors the sky's colour (a Fresnel term), looking down you see into it;
   - the sun: a sharp glint where the sun's reflection falls (Phong's highlight);
   - depth: shallow water is clear and tinted, deep water darker and nearly opaque, and it fades out at the banks;
   - swell: deep water rises and falls in long slow waves;
   - ice: a frozen river is still, pale and opaque, with a cold gleam.
   On Low it is a plain see-through surface lit per vertex. Switch: `water`. */
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { WIND } from './kit.js';
import { feline } from './themeflag.js';

LOOK_SWITCHES.push(['water', 'Real water']);
const waterOn = () => lookOn('water') && lookOn('light');
const SKY = { value: new THREE.Color(0xa8c4dc) };

const MATS = {};
// the shared material, rich (ripples, Fresnel, glints, swell) or plain
function waterMat(far) {
  if (feline()) return kibbleMat(); // C9: in Super Feline Mode, water is kibble, and looks it
  const rich = !Q.lite && !far,
    key = rich ? 'rich' : 'plain';
  if (MATS[key]) return MATS[key];
  const m = rich
    ? new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, shininess: 90, specular: 0x9a9a90, depthWrite: false })
    : new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.wTime = WIND.time;
    sh.uniforms.wSky = SKY;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 wa;\nvarying vec3 vWa;\nvarying vec2 vWp;\nuniform float wTime;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWa = wa;
vWp = position.xz;
${rich ? 'transformed.y += (sin(position.x * 0.045 + wTime * 0.7) + sin(position.z * 0.06 - wTime * 0.55)) * 0.22 * wa.y * (1.0 - wa.z);' : ''}`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWa;\nvarying vec2 vWp;\nuniform float wTime;\nuniform vec3 wSky;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.a = vWa.x * mix(mix(0.62, 0.92, vWa.y), 1.0, vWa.z);
${
  rich
    ? `{
  // light dappling the water, and a soft line of foam where it meets the bank
  float calm0 = 1.0 - vWa.z;
  float dap = sin(vWp.x * 1.3 + wTime * 1.2 + sin(vWp.y * 0.9 + wTime)) * sin(vWp.y * 1.1 - wTime * 0.9 + sin(vWp.x * 0.7));
  diffuseColor.rgb *= 1.0 + 0.12 * dap * calm0;
  float foam = smoothstep(0.8, 0.3, vWa.x) * calm0 * (0.6 + 0.4 * sin(vWp.x * 2.7 + vWp.y * 1.9 + wTime * 1.6));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.95), foam * 0.55);
  diffuseColor.a = max(diffuseColor.a, foam * 0.7);
}`
    : ''
}`,
      );
    if (rich)
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
{
  vec2 p = vWp;
  float t = wTime;
  float calm = 1.0 - vWa.z;
  vec2 g = vec2(
    sin(p.x * 0.9 + t * 1.7) + sin(p.x * 0.37 + p.y * 0.6 - t * 1.1) + 0.5 * sin((p.x + p.y) * 2.3 + t * 2.9),
    cos(p.y * 0.8 - t * 1.5) + cos(p.y * 0.41 - p.x * 0.5 + t * 1.3) + 0.5 * cos((p.x - p.y) * 2.1 - t * 2.6));
  normal = normalize(normal + (viewMatrix * vec4(g.x * 0.13 * calm, 0.0, g.y * 0.13 * calm, 0.0)).xyz);
}`,
        )
        .replace(
          '#include <fog_fragment>',
          `{
  float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, wSky, fres * 0.6 * (1.0 - vWa.z * 0.6));
  gl_FragColor.a = mix(gl_FragColor.a, vWa.x, fres);
}
#include <fog_fragment>`,
        );
  };
  m.customProgramCacheKey = () => 'water-' + key;
  m.dispose = () => {};
  return (MATS[key] = m);
}
/* Kibble (C9, Super Feline Mode): wherever there is water, a heap of kibble instead, drawn per pixel on the same
   surface: crunchy pieces in a few browns, round, some with a hole, some star-shaped, tumbling slowly downstream in
   rivers, shaded as if rounded, dark gaps between them; opaque, and only thinning at the very edge of the bank. No
   reflections: kibble does not mirror the sky. The water's own depth and ice still choose the shade (deep is darker,
   frozen is pale: frost-dried). One material for every quality. */
function kibbleMat() {
  if (MATS.kibble) return MATS.kibble;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.wTime = WIND.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 wa;\nvarying vec3 vWa;\nvarying vec2 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWa = wa;\nvWp = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWa;\nvarying vec2 vWp;\nuniform float wTime;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  // pieces about 30 cm across (kibble for giants, so it reads from a distance), in two jumbled layers so they pile up,
  // drifting where the water would run
  vec2 drift = vec2(wTime * 0.12, wTime * 0.05) * (1.0 - vWa.z) * (1.0 - vWa.y * 0.7);
  vec3 kib = vec3(0.16, 0.09, 0.05); // the dark between the pieces
  for (int L = 0; L < 2; L++) {
    vec2 q = (vWp * 3.2 + drift) * (L == 0 ? 1.0 : 1.13) + (L == 0 ? vec2(0.0) : vec2(0.5, 0.37));
    vec2 c = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = fract(sin(dot(c + float(L) * 31.7, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 o = (vec2(fract(h * 17.0), fract(h * 29.0)) - 0.5) * 0.3;
    float rot = h * 6.28;
    vec2 d2 = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * (f - o);
    float a = atan(d2.y, d2.x);
    float r = length(d2 * vec2(1.0, 1.0 + h * 0.5));
    float edge = 0.46 + (h > 0.72 ? 0.08 * cos(a * 5.0) : 0.0); // some are stars
    float piece = smoothstep(edge + 0.04, edge - 0.04, r);
    if (h < 0.28) piece *= smoothstep(0.06, 0.11, r); // some have a hole
    vec3 brown = mix(vec3(0.42, 0.24, 0.11), vec3(0.78, 0.5, 0.25), fract(h * 7.0));
    brown = mix(brown, vec3(0.62, 0.32, 0.2), step(0.85, fract(h * 3.0))); // a few fish-flavoured ones
    float round = clamp(1.0 - r / max(edge, 0.01), 0.0, 1.0);
    brown *= 0.7 + 0.45 * round - 0.22 * smoothstep(0.0, 0.3, d2.y); // lit from above, as if rounded
    kib = mix(kib, brown, piece);
  }
  kib *= mix(1.0, 0.72, vWa.y * (1.0 - vWa.z)); // deep: a deeper heap, darker
  kib = mix(kib, vec3(0.86, 0.8, 0.72), vWa.z * 0.55); // frozen: frost-dried
  diffuseColor.rgb = kib;
  diffuseColor.a = smoothstep(0.0, 0.25, vWa.x);
}`,
      );
  };
  m.customProgramCacheKey = () => 'kibble';
  m.dispose = () => {};
  return (MATS.kibble = m);
}
// the sky's colour now, for the water to mirror (run.js, every frame)
function setWaterSky(c) {
  SKY.value.copy(c);
}

/* A water surface over one of the land's height grids (terrain.js `fine` or `coarse`): a vertex wherever a cell
   touches water, at the water's level. colourAt(x, z, out) gives the water's tint there (the land's river colour).
   hollow: leave out the middle, where the fine grid's water lies. */
function* waterMesh(T, g, sink, hollow, keep, colourAt) {
  const W = T.water,
    n = g.n,
    N1 = n + 1,
    idx = new Int32Array(N1 * N1).fill(-1),
    m = new Float32Array(N1 * N1),
    pos = [],
    wa = [],
    col = [],
    tri = [],
    c = new THREE.Color(),
    inner = (x, z) => Math.abs(x) < keep && Math.abs(z) < keep;
  for (let iz = 0; iz <= n; iz++) {
    for (let ix = 0; ix <= n; ix++) m[iz * N1 + ix] = W.mask(-g.half + ix * g.cell, -g.half + iz * g.cell);
    if ((iz & 15) === 15) yield; // a pause now and then, for a build spread over frames
  }
  const vert = (ix, iz) => {
    const k = iz * N1 + ix;
    if (idx[k] >= 0) return idx[k];
    const x = -g.half + ix * g.cell,
      z = -g.half + iz * g.cell,
      deep = W.deep(x, z),
      ice = W.ice(x, z);
    idx[k] = pos.length / 3;
    pos.push(x, W.level(x, z) - sink, z);
    wa.push(Math.min(1, m[k] * 1.6), deep, ice);
    colourAt(x, z, c);
    if (ice > 0) c.lerp(new THREE.Color(0xe4eef4), ice);
    else c.multiplyScalar(1 - 0.45 * deep);
    col.push(c.r, c.g, c.b);
    return idx[k];
  };
  for (let iz = 0; iz < n; iz++) {
    if ((iz & 15) === 15) yield;
    for (let ix = 0; ix < n; ix++) {
      const a = iz * N1 + ix;
      if (m[a] <= 0.01 && m[a + 1] <= 0.01 && m[a + N1] <= 0.01 && m[a + N1 + 1] <= 0.01) continue;
      const x = -g.half + ix * g.cell,
        z = -g.half + iz * g.cell;
      if (hollow && inner(x, z) && inner(x + g.cell, z + g.cell)) continue;
      const v00 = vert(ix, iz),
        v10 = vert(ix + 1, iz),
        v01 = vert(ix, iz + 1),
        v11 = vert(ix + 1, iz + 1);
      tri.push(v00, v01, v10, v01, v11, v10);
    }
  }
  if (!tri.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('wa', new THREE.Float32BufferAttribute(wa, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(tri);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, waterMat(hollow)); // far water needs no ripples: the plain material
  mesh.renderOrder = 2; // after the ground and things on it, being see-through
  mesh.frustumCulled = false;
  return mesh;
}
// A sheet of open water (the sea round a floating town): size metres across, deep and swelling.
function seaSheet(size, color) {
  const seg = 48,
    geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2),
    n = geo.attributes.position.count,
    wa = new Float32Array(n * 3),
    col = new Float32Array(n * 3),
    c = new THREE.Color(color).multiplyScalar(0.7);
  for (let i = 0; i < n; i++) {
    wa.set([1, 1, 0], i * 3);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('wa', new THREE.BufferAttribute(wa, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, waterMat());
}
export { waterOn, waterMesh, seaSheet, setWaterSky, waterMat };
