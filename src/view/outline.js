/* Light outlines (commission 6): a thin line round people, creatures and nearby things of interest, tinted rather than
   black, so they stand out from the land on a small screen. Never on the land itself.
   How: the old trick of the inverted hull. Each outlined model gets a second copy of itself drawn from the inside,
   pushed out a little along its smoothed normals, in the dark of its own colour leaning toward the look's ink: what
   shows round the edges is the line. The push grows with distance so the line stays about one and a half pixels wide,
   and fades to nothing past a few tens of metres, so far things stay soft. One extra draw call per outlined mesh; a
   whole forest's outlines are one too. What is outlined depends on the quality (Q.outline): 1 people and creatures,
   2 also buildings, ruins and landmarks, 3 also near trees. Switch: `outlines`. */
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';

LOOK_SWITCHES.push(['outlines', 'Light outlines on people, creatures and nearby things']);
// Is level n of the outlines on (1 people and creatures, 2 buildings and places, 3 trees)?
const outlineOn = (n) => (Q.outline || 0) >= n && lookOn('outlines') && lookOn('light');

// shared by every outline, set each frame from the look (setOutline)
const U = {
  olW: { value: 1 }, // width, about this many pixels and a half
  olInk: { value: new THREE.Color(0x2a2a3a) },
  olK: { value: 0.5 }, // how far the line leans from its object's own dark toward the ink
  olPx: { value: 0.0025 }, // metres of push per metre of distance for one pixel (from the screen's height)
};
function setOutline(lk, screenH) {
  if (lk) {
    U.olInk.value.setRGB(lk.ink[0], lk.ink[1], lk.ink[2]);
    U.olW.value = 0.55 + lk.outline * 0.5; // C7.1: about one CSS pixel (two or three of a phone's), not four
    U.olK.value = 0.35 + lk.outline * 0.4;
  } else {
    U.olInk.value.setHex(0x2a2a3a);
    U.olW.value = 0.85;
    U.olK.value = 0.5;
  }
  // a pixel at one metre: the camera's view is 70 degrees high
  if (screenH) U.olPx.value = (2 * Math.tan((35 * Math.PI) / 180)) / screenH;
}

/* The normals of a model averaged where its parts meet, so the pushed-out copy closes round corners rather than
   splitting at them. Kept on the geometry (outN). */
function smoothNormals(geo) {
  if (geo.attributes.outN) return geo;
  const p = geo.attributes.position.array,
    n = geo.attributes.normal.array,
    count = p.length / 3,
    slot = new Map(), // a point (to half a centimetre) -> its index in sum
    at = new Int32Array(count),
    sum = new Float32Array(count * 3);
  let used = 0;
  for (let i = 0; i < count; i++) {
    // a number for the point, from its rounded coordinates (a rare clash only blurs one corner of one line)
    const k =
      (Math.round(p[i * 3] * 200) * 73856093) ^
      (Math.round(p[i * 3 + 1] * 200) * 19349663) ^
      (Math.round(p[i * 3 + 2] * 200) * 83492791);
    let j = slot.get(k);
    if (j === undefined) slot.set(k, (j = used++));
    at[i] = j;
    sum[j * 3] += n[i * 3];
    sum[j * 3 + 1] += n[i * 3 + 1];
    sum[j * 3 + 2] += n[i * 3 + 2];
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const j = at[i] * 3,
      x = sum[j],
      y = sum[j + 1],
      z = sum[j + 2],
      l = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / l;
    out[i * 3 + 1] = y / l;
    out[i * 3 + 2] = z / l;
  }
  geo.setAttribute('outN', new THREE.BufferAttribute(out, 3));
  return geo;
}
/* The outline's material. far: metres beyond which the line fades away. patch(shader): a further change to the
   vertex shader for models that move (actors.js: their joints), run first. */
const MATS = new Map();
function outlineMat(far, patch, key) {
  const k = far + ':' + (key || '');
  if (!patch && MATS.has(k)) return MATS.get(k);
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    if (patch) patch(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 outN;\nuniform float olW;\nuniform float olPx;')
      .replace(
        '#include <project_vertex>',
        `{
  vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
  float dist = distance((modelMatrix * wp).xyz, cameraPosition);
  float push = olW * olPx * dist * (1.0 - smoothstep(${(far * 0.6).toFixed(1)}, ${far.toFixed(1)}, dist));
  vec3 dir = outN;
#ifdef OUTLINE_JOINTS
  dir = joint(dir, bone);
#endif
  transformed += dir * push / max(0.2, length((modelMatrix * vec4(dir, 0.0)).xyz));
}
#include <project_vertex>`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 olInk;\nuniform float olK;')
      .replace(
        '#include <fog_fragment>',
        'gl_FragColor.rgb = mix(diffuseColor.rgb * 0.32, olInk, olK);\n#include <fog_fragment>',
      );
  };
  // C7.1: drawn only outside the silhouettes of outlined things (they mark the stencil: addOutline), so a part inside
  // the figure (an eye, a nose, a buckle, an arm across the body) never shows its own line on the figure
  Object.assign(m, {
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });
  m.customProgramCacheKey = () => 'outline' + k;
  m.dispose = () => {}; // shared
  if (!patch) MATS.set(k, m);
  return m;
}

// An outlined thing marks where it is drawn in the stencil (the outline is drawn only where nothing outlined is)
function markStencil(mat) {
  for (const m of Array.isArray(mat) ? mat : [mat])
    Object.assign(m, {
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
    });
}
/* Give mesh an outline: a child drawn from the inside with the outline material. For an instanced mesh the child is
   instanced too, sharing the same places and count. Returns the outline mesh, or null when off. */
function addOutline(mesh, level, far, mat) {
  if (!mesh || !outlineOn(level)) return null;
  smoothNormals(mesh.geometry);
  const m = mat || outlineMat(far || 60);
  markStencil(mesh.material);
  let o;
  if (mesh.isInstancedMesh) {
    o = new THREE.InstancedMesh(mesh.geometry, m, 1);
    o.instanceMatrix = mesh.instanceMatrix;
    Object.defineProperty(o, 'count', { get: () => mesh.count, set: () => {} });
  } else o = new THREE.Mesh(mesh.geometry, m);
  o.frustumCulled = mesh.frustumCulled;
  o.userData.outline = true;
  o.castShadow = o.receiveShadow = false;
  o.raycast = () => {};
  o.renderOrder = 1; // after everything that marks the stencil
  mesh.add(o);
  return o;
}
export { addOutline, outlineMat, outlineOn, setOutline, smoothNormals, U as OUTLINE };
