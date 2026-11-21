/* People and creatures that move (commission 5). Each is one merged model (kit.js) whose parts hang from joints: legs
   and arms swing from hip and shoulder, the head turns, a tail wags, a serpent's body ripples. The joints are worked in
   the vertex shader from a few numbers per actor (its stride's phase, how far the limbs swing, where the head looks),
   so an actor is one draw call however many limbs it has, and moving them costs the processor nothing.
   - Walking: when the rules move someone between two builds of the scene, they walk from where they were drawn to
     where they are, legs swinging, body bobbing, turned the way they go (track / animateActors).
   - Idle: a slow breath, a glance about, and the head turning to watch the traveller when near.
   - Fighting: the creature you fight crouches, lunges at you now and then, and flinches when hurt.
   Joints (bone numbers): 0 body, 1 and 2 the two halves of a gait (left leg and right foreleg, and so on), 3 and 4
   the arms, 5 the head, 6 a tail, 7 a serpent's body, 8 the eyes (on the head, and always bright). */
import { P as PT, kit } from './kit.js';
import { LOOK_SWITCHES, lookOn } from './quality.js';

LOOK_SWITCHES.push(['actors', 'People and creatures that move']);
const actorsOn = () => lookOn('actors') && lookOn('light');

/* ---------- the shader ---------- */
const COMMON = `
attribute float bone;
attribute vec3 pivot;
uniform float aPhase;
uniform float aSwing;
uniform float aHead;
uniform float aArm;
uniform float aTail;
varying float vGlow;
vec3 joint(vec3 p, float b) {
  float ang = 0.0;
  if (b > 0.5 && b < 1.5) ang = sin(aPhase) * aSwing;
  else if (b > 1.5 && b < 2.5) ang = -sin(aPhase) * aSwing;
  else if (b > 2.5 && b < 3.5) ang = -sin(aPhase) * aSwing * 0.8 - aArm;
  else if (b > 3.5 && b < 4.5) ang = sin(aPhase) * aSwing * 0.8 - aArm;
  if (ang != 0.0) { float c = cos(ang), s = sin(ang); p = vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
  float yaw = 0.0;
  if ((b > 4.5 && b < 5.5) || b > 7.5) yaw = aHead;
  else if (b > 5.5 && b < 6.5) yaw = aTail;
  if (yaw != 0.0) { float c = cos(yaw), s = sin(yaw); p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
  return p;
}
`;
function actorMat(opts) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, opts || {})),
    u = { aPhase: { value: 0 }, aSwing: { value: 0 }, aHead: { value: 0 }, aArm: { value: 0 }, aTail: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = joint(objectNormal, bone);')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vec3 q = transformed - pivot;
if (bone > 6.5 && bone < 7.5) q.x += sin(aPhase * 0.8 + pivot.z * 1.3) * (0.15 + aSwing * 0.5);
transformed = joint(q, bone) + pivot;
vGlow = bone > 7.5 ? 1.0 : 0.0;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vColor, vGlow);');
  };
  m.customProgramCacheKey = () => 'actor' + (opts && opts.transparent ? 't' : '');
  return m;
}

/* ---------- models ---------- */
const MODELS = {};
const kept = (g) => ((g.dispose = () => {}), (g.kept = true), g);
// A person about 1.8 m tall, facing +z: clothes, skin, and a hat or hair. Cached by their colours.
/* A person about 1.8 m tall, facing +z. look: { outfit, hairdo, beard, cloak, trim } (C5.20): a tunic, a long robe, a
   tunic under an apron, or a coat over trousers; hair cropped, long, in a bun or a braid, or none; a beard; a cloak
   down the back; a second colour for trousers, cloak and trim. Cached by all of it. */
function personModel(cloth, skin, hat, hair, look) {
  look = look || {};
  const outfit = look.outfit || 'tunic',
    hairdo = look.hairdo || 'cap',
    trim = look.trim || new THREE.Color(cloth).multiplyScalar(0.6).getHex(),
    key = ['p', cloth, skin, hat, hair, outfit, hairdo, look.beard ? 1 : 0, look.cloak ? 1 : 0, trim].join();
  if (MODELS[key]) return MODELS[key];
  const k = kit(),
    dark = new THREE.Color(cloth).multiplyScalar(0.6).getHex(),
    legs = outfit === 'coat' ? trim : dark,
    boot = 0x3a2a1e,
    H = [0, 1.62, 0];
  for (const [sx, b] of [
    [-0.12, 1],
    [0.12, 2],
  ]) {
    k.add(PT.cyl(0.08, 0.065, 0.42, 6), legs, { x: sx, y: 0.67 }, { bone: b, pivot: [sx, 0.88, 0] }); // thigh
    k.add(PT.cyl(0.065, 0.055, 0.4, 6), legs, { x: sx, y: 0.3 }, { bone: b, pivot: [sx, 0.88, 0] }); // shin
    k.add(PT.box(0.15, 0.12, 0.3), boot, { x: sx, y: 0.06, z: 0.05 }, { bone: b, pivot: [sx, 0.88, 0] });
  }
  if (outfit === 'robe') {
    // a long robe to the ankles, a rope belt
    k.add(PT.cyl(0.23, 0.4, 1.35, 10), cloth, { y: 0.85 }, { bone: 0 });
    k.add(PT.cyl(0.25, 0.25, 0.06, 10), 0xc8b080, { y: 0.98 }, { bone: 0 });
  } else {
    k.add(PT.cyl(0.22, 0.27, 0.58, 10), cloth, { y: 1.22 }, { bone: 0 }); // chest
    k.add(
      PT.cyl(0.27, outfit === 'coat' ? 0.38 : 0.33, outfit === 'coat' ? 0.55 : 0.36, 10),
      cloth,
      { y: outfit === 'coat' ? 0.68 : 0.76 },
      { bone: 0 },
    ); // skirt of the tunic or coat
    k.add(PT.cyl(0.255, 0.255, 0.07, 10), 0x3a2a1e, { y: 0.93 }, { bone: 0 }); // belt
    k.add(PT.box(0.07, 0.06, 0.02), 0xc8a040, { y: 0.93, z: 0.26 }, { bone: 0 }); // its buckle
    if (outfit === 'apron') {
      k.add(PT.box(0.38, 0.62, 0.03), 0xe6dcc6, { y: 0.66, z: 0.3, rx: -0.12 }, { bone: 0 });
      k.add(PT.box(0.3, 0.3, 0.03), 0xe6dcc6, { y: 1.15, z: 0.24 }, { bone: 0 });
    }
    if (outfit === 'coat') k.add(PT.box(0.42, 0.12, 0.3), trim, { y: 1.5 }, { bone: 0 }); // a collar
  }
  if (look.cloak) {
    k.add(PT.box(0.56, 1.05, 0.04), trim, { y: 1.0, z: -0.26, rx: 0.08 }, { bone: 0 });
    k.add(PT.cyl(0.3, 0.3, 0.08, 10), trim, { y: 1.5 }, { bone: 0 });
  }
  for (const [sx, b] of [
    [-0.31, 3],
    [0.31, 4],
  ]) {
    k.add(PT.ball(0.09, 8, 6), cloth, { x: sx, y: 1.47 }, { bone: b, pivot: [sx, 1.47, 0] }); // shoulder
    k.add(PT.cyl(0.065, 0.06, 0.34, 6), cloth, { x: sx, y: 1.28 }, { bone: b, pivot: [sx, 1.47, 0] }); // upper arm
    k.add(
      PT.cyl(0.058, 0.05, 0.32, 6),
      outfit === 'apron' ? skin : cloth,
      { x: sx, y: 0.98, z: 0.03 },
      { bone: b, pivot: [sx, 1.47, 0] },
    ); // forearm (bare with an apron's sleeves rolled)
    k.add(PT.ball(0.06, 6, 4), skin, { x: sx, y: 0.8, z: 0.03 }, { bone: b, pivot: [sx, 1.47, 0] }); // hand
  }
  k.add(PT.cyl(0.07, 0.08, 0.14, 6), skin, { y: 1.6 }, { bone: 0 });
  k.add(PT.ball(0.16, 12, 9), skin, { y: 1.8, sy: 1.12 }, { bone: 5, pivot: H });
  k.add(PT.ball(0.035, 4, 3), skin, { y: 1.78, z: 0.16 }, { bone: 5, pivot: H }); // nose
  k.add(PT.ball(0.03, 4, 3), 0x1a1410, { x: -0.055, y: 1.83, z: 0.14 }, { bone: 5, pivot: H });
  k.add(PT.ball(0.03, 4, 3), 0x1a1410, { x: 0.055, y: 1.83, z: 0.14 }, { bone: 5, pivot: H });
  if (look.beard) k.add(PT.cone(0.12, 0.24, 8), hair, { y: 1.66, z: 0.08, rx: Math.PI }, { bone: 5, pivot: H });
  if (hat) {
    k.add(PT.cyl(0.25, 0.25, 0.04, 12), hat, { y: 1.95 }, { bone: 5, pivot: H });
    k.add(PT.cone(0.16, 0.34, 10), hat, { y: 2.12 }, { bone: 5, pivot: H });
  } else if (hairdo !== 'bald') {
    k.add(
      new THREE.SphereGeometry(0.172, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair,
      { y: 1.83, z: -0.02, sy: 1.1 },
      { bone: 5, pivot: H },
    );
    if (hairdo === 'long') k.add(PT.box(0.3, 0.36, 0.08), hair, { y: 1.66, z: -0.13 }, { bone: 5, pivot: H });
    if (hairdo === 'bun') k.add(PT.ball(0.08, 8, 6), hair, { y: 1.9, z: -0.16 }, { bone: 5, pivot: H });
    if (hairdo === 'braid') k.add(PT.cyl(0.035, 0.025, 0.5, 6), hair, { y: 1.55, z: -0.17, rx: 0.15 }, { bone: 5, pivot: H });
  } else k.add(PT.cyl(0.165, 0.165, 0.06, 12), hair, { y: 1.76, z: -0.01 }, { bone: 5, pivot: H }); // a fringe round a bald pate
  return (MODELS[key] = kept(k.build()));
}
// The creatures, one model for each form, white where the creature's own tint goes and coloured where it should not
// change (eyes, teeth, claws). The eyes carry the temper's colour, so they are made per colour.
function creatureModel(form, eye) {
  const key = ['c', form, eye].join();
  if (MODELS[key]) return MODELS[key];
  const k = kit(),
    W = 0xffffff,
    D = 0xb8b8b8,
    H = [0, 0, 0];
  if (form === 'hound') {
    k.add(PT.blob(0.5, 1), W, { y: 0.85, sx: 0.62, sy: 0.6, sz: 1.5 }, { bone: 0 });
    k.add(PT.blob(0.36, 1), W, { y: 0.95, z: 0.55, sx: 1.05, sy: 1.05 }, { bone: 0 });
    const hp = [0, 1.05, 0.75];
    k.add(PT.box(0.36, 0.34, 0.42), W, { y: 1.2, z: 0.98 }, { bone: 5, pivot: hp });
    k.add(PT.box(0.24, 0.2, 0.32), D, { y: 1.1, z: 1.3 }, { bone: 5, pivot: hp });
    k.add(PT.cone(0.08, 0.22, 4), D, { x: -0.13, y: 1.45, z: 0.9 }, { bone: 5, pivot: hp, flat: true });
    k.add(PT.cone(0.08, 0.22, 4), D, { x: 0.13, y: 1.45, z: 0.9 }, { bone: 5, pivot: hp, flat: true });
    k.add(PT.box(0.08, 0.06, 0.03), eye, { x: -0.1, y: 1.28, z: 1.2 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.08, 0.06, 0.03), eye, { x: 0.1, y: 1.28, z: 1.2 }, { bone: 8, pivot: hp });
    for (const [x, z, b] of [
      [-0.2, 0.55, 1],
      [0.2, 0.55, 2],
      [-0.2, -0.55, 2],
      [0.2, -0.55, 1],
    ])
      k.add(PT.cyl(0.07, 0.09, 0.75, 5), W, { x, y: 0.4, z }, { bone: b, pivot: [x, 0.8, z] });
    k.add(PT.cyl(0.03, 0.07, 0.7, 5), W, { y: 1.05, z: -0.95, rx: -0.9 }, { bone: 6, pivot: [0, 1, -0.75] });
  } else if (form === 'brute') {
    for (const [x, b] of [
      [-0.45, 1],
      [0.45, 2],
    ])
      k.add(PT.cyl(0.24, 0.3, 1, 6), W, { x, y: 0.5 }, { bone: b, pivot: [x, 1, 0] });
    k.add(PT.blob(0.9, 1), W, { y: 1.9, z: 0.1, sx: 1.05, sy: 0.9, sz: 0.75, rx: 0.25 }, { bone: 0 });
    k.add(PT.blob(0.5, 0), D, { y: 2.55, z: -0.3, sx: 1.3 }, { bone: 0, flat: true }); // a hump of shoulders
    const hp = [0, 2.5, 0.4];
    k.add(PT.blob(0.36, 1), W, { y: 2.7, z: 0.62 }, { bone: 5, pivot: hp });
    k.add(PT.box(0.4, 0.12, 0.2), 0xe8e0c8, { y: 2.55, z: 0.9 }, { bone: 5, pivot: hp }); // teeth
    k.add(PT.box(0.11, 0.07, 0.03), eye, { x: -0.13, y: 2.8, z: 0.95 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.11, 0.07, 0.03), eye, { x: 0.13, y: 2.8, z: 0.95 }, { bone: 8, pivot: hp });
    for (const [x, b] of [
      [-1.05, 3],
      [1.05, 4],
    ]) {
      k.add(PT.cyl(0.2, 0.26, 1.6, 6), W, { x, y: 1.65, z: 0.2 }, { bone: b, pivot: [x, 2.4, 0.2] });
      k.add(PT.blob(0.3, 0), D, { x, y: 0.85, z: 0.2 }, { bone: b, pivot: [x, 2.4, 0.2], flat: true });
    }
  } else if (form === 'wight') {
    // a hooded robe that tapers to rags and never touches the ground
    k.add(PT.cone(0.55, 2.1, 9), W, { y: 1.35, rx: Math.PI }, { bone: 0 });
    k.add(PT.cyl(0.3, 0.55, 0.6, 9), W, { y: 2.3 }, { bone: 0 });
    const hp = [0, 2.5, 0];
    k.add(PT.cone(0.33, 0.75, 9), W, { y: 2.85 }, { bone: 5, pivot: hp });
    k.add(PT.ball(0.24, 8, 6), 0x101418, { y: 2.68, z: 0.12 }, { bone: 5, pivot: hp });
    k.add(PT.box(0.08, 0.04, 0.02), eye, { x: -0.08, y: 2.72, z: 0.35 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.08, 0.04, 0.02), eye, { x: 0.08, y: 2.72, z: 0.35 }, { bone: 8, pivot: hp });
    for (const [x, b] of [
      [-0.5, 3],
      [0.5, 4],
    ])
      k.add(PT.cyl(0.05, 0.1, 1.4, 5), W, { x, y: 1.7, z: 0.15 }, { bone: b, pivot: [x, 2.35, 0.1] });
  } else {
    // a serpent: a ripple of segments, head raised
    for (let i = 0; i < 8; i++) {
      const z = 1.1 - i * 0.5,
        r = 0.32 - i * 0.025;
      k.add(PT.blob(r, 1), i % 2 ? D : W, { y: r * 0.9, z, sz: 1.5 }, { bone: 7, pivot: [0, 0, i] });
    }
    const hp = [0, 0.7, 1.2];
    k.add(PT.blob(0.3, 1), W, { y: 0.75, z: 1.5, sx: 1.1, sy: 0.75, sz: 1.4 }, { bone: 5, pivot: hp });
    k.add(PT.box(0.07, 0.05, 0.03), eye, { x: -0.13, y: 0.85, z: 1.8 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.07, 0.05, 0.03), eye, { x: 0.13, y: 0.85, z: 1.8 }, { bone: 8, pivot: hp });
  }
  return (MODELS[key] = kept(k.build()));
}

/* ---------- actors in the scene ---------- */
const SKIN = [0xe8c4a0, 0xd9b08c, 0xc08a64, 0x9a6a48, 0x6e4a32],
  HAIR = [0x2a1e16, 0x4a3020, 0x7a5a30, 0xb08a50, 0x8a8478];
// a person, for the view: the colour of their clothes and hat; seed picks their skin and hair
const TRIMS = [0x4a3a2a, 0x2e3a4a, 0x5a2e2a, 0x3a4a2e, 0x6a5a3a, 0x2a2a2e, 0x7a6a50];
// a person, for the view: the colour of their clothes and hat; seed picks the rest (skin, hair and its style, a beard,
// a cloak, the second colour, how tall and broad); outfit, if given, is what their trade wears
function personActor(cloth, hat, seed, outfit) {
  const s = Math.abs(seed | 0),
    r = (k) => (((s * 2654435761 + k * 40503) >>> 0) % 997) / 997,
    look = {
      outfit: outfit || ['tunic', 'tunic', 'coat', 'apron', 'robe'][Math.floor(r(1) * 5)],
      hairdo: ['cap', 'long', 'bun', 'braid', 'bald', 'cap'][Math.floor(r(2) * 6)],
      beard: r(3) < 0.3,
      cloak: r(4) < 0.25,
      trim: TRIMS[Math.floor(r(5) * TRIMS.length)],
    },
    mesh = new THREE.Mesh(personModel(cloth, SKIN[s % 5], hat || 0, HAIR[(s >> 3) % 5], look), actorMat());
  mesh.scale.set(0.9 + r(6) * 0.25, 0.92 + r(7) * 0.16, 0.9 + r(6) * 0.25);
  mesh.userData.actor = { kind: 'person', seed: s };
  return mesh;
}
function creatureActor(form, color, eye) {
  const ghost = form === 'wight',
    mesh = new THREE.Mesh(
      creatureModel(form, eye),
      actorMat(ghost ? { color, transparent: true, opacity: 0.8, depthWrite: false } : { color }),
    );
  mesh.userData.actor = { kind: form };
  return mesh;
}

/* Where each tracked actor was last drawn, so a rebuild of the scene can walk it on from there. key: a creature's id,
   or for townsfolk (who have no lasting id) 'folk:<area>' with the nearest one taken.

   Nothing teleports:
   - an actor moved by the rules walks from where it was drawn to where it now is; the further it has to go (several
     tiles while you rested), the faster it goes, so it always arrives within a few seconds;
   - its feet follow the ground on the way (o.ground), over hills rather than through them;
   - between your actions everyone wanders a little about their spot (o.roam metres), pausing, looking about;
   - someone new rises into view rather than popping in; a creature that is killed topples and sinks away, one that
     leaves sinks away;
   - when the frame of the scene moves (a border crossed, a town gate passed), what is remembered moves with it
     (shiftActors), so the walk carries on across it. */
const LAST = new Map(),
  live = [];
let clock = 0,
  prev = [], // last build's actors, to see who has gone
  killed = new Set(),
  dying = [];
function clearActors() {
  prev = live.slice();
  live.length = 0;
}
// Track g (the group standing at the actor's place) with its animated mesh.
// o: { key, pool, near, speed, fight, hurt, roam, ground(x, z) }
function track(g, mesh, o) {
  const to = g.position.clone();
  let from = null;
  if (o.key && LAST.has(o.key)) {
    const l = LAST.get(o.key);
    if (l.pos.distanceTo(to) < (o.near || 400)) from = l;
  } else if (o.pool) {
    // the nearest of the pool's last places not yet claimed
    let best = null,
      bd = o.near || 10;
    for (const [k, l] of LAST)
      if (k.startsWith(o.pool + '#') && !l.claimed) {
        const d = l.pos.distanceTo(to);
        if (d < bd) (bd = d), (best = l);
      }
    if (best) (best.claimed = true), (from = best);
  }
  const dist = from ? Math.hypot(from.pos.x - to.x, from.pos.z - to.z) : 0,
    a = {
      g,
      mesh,
      u: mesh.material.userData.u,
      key: o.key || (o.pool ? o.pool + '#' + live.length : null),
      anchor: to.clone(),
      to: to.clone(),
      ground: o.ground || null,
      roam: o.fight ? 0 : o.roam || 0,
      // far to go: hurry, so as to be there within a few seconds
      speed: Math.max(o.speed || 3, dist / 3),
      base: o.speed || 3,
      fight: !!o.fight,
      hurt: o.hurt ? 1 : 0,
      phase: (from && from.phase) || Math.random() * 6,
      swing: 0,
      yaw: from ? from.yaw : g.rotation.y,
      face: g.rotation.y,
      seed: Math.random() * 100,
      rest: 1 + Math.random() * 3, // seconds before it next wanders
      rise: from || !o.key || o.rise === false ? 0 : 1, // a newcomer rises out of the ground
    };
  if (from) {
    g.position.copy(from.pos);
    // walking somewhere new: it turns that way and goes, rather than gliding backwards
  }
  g.rotation.y = a.yaw;
  mesh.userData.key = a.key; // for the tests: who this is
  live.push(a);
  return a;
}
// A new world, or a run loaded: nobody remembered walks on from the world before.
function forgetActors() {
  LAST.clear();
  live.length = 0;
  prev = [];
  for (const d of dying) if (d.g.parent) d.g.parent.remove(d.g);
  dying.length = 0;
}
// After a build: everyone who was drawn before and is not now goes away gently, a killed creature falling over.
function settleActors(group) {
  const now = new Set(live.map((a) => a.key));
  for (const a of prev) {
    if (!a.key || now.has(a.key) || a.key.startsWith('site:')) continue;
    if (group) {
      // the old group, put back for a moment (its model is kept; its material is remade)
      if (a.g.parent) a.g.parent.remove(a.g);
      group.add(a.g);
      dying.push({ g: a.g, mesh: a.mesh, t: 0, fall: killed.has(a.key) });
    }
  }
  prev = [];
  killed.clear();
}
// A creature's id, told by the rules' 'killed' event (see scene.js), so its going is a fall.
const markKilled = (id) => killed.add('c:' + id);
// The frame of the scene moved by (dx, dz): move what is remembered with it.
function shiftActors(dx, dz, dy) {
  dy = dy || 0;
  for (const [, l] of LAST) (l.pos.x += dx), (l.pos.y += dy), (l.pos.z += dz);
  for (const a of live) {
    a.g.position.x += dx;
    a.g.position.y += dy;
    a.g.position.z += dz;
  }
}
const angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
// Every frame: walk each actor toward where it is going, swing its limbs, turn its head; px, pz: the traveller.
function animateActors(dt, px, pz, still) {
  clock += dt;
  for (let i = dying.length - 1; i >= 0; i--) {
    const d = dying[i];
    d.t += dt;
    if (d.fall) d.mesh.rotation.z = Math.min(Math.PI / 2, d.t * 2.2);
    d.g.position.y -= dt * (d.fall ? (d.t > 1.2 ? 1.2 : 0) : 1.6);
    if (d.t > (d.fall ? 2.6 : 1.4)) {
      if (d.g.parent) d.g.parent.remove(d.g);
      dying.splice(i, 1);
    }
  }
  if (!live.length) return;
  for (const [, l] of LAST) l.claimed = false;
  const keep = new Map();
  for (const a of live) {
    const g = a.g;
    // idling: now and then wander to a new spot near where the rules have it, unhurried
    if (a.roam && !still) {
      const atGoal = Math.hypot(a.to.x - g.position.x, a.to.z - g.position.z) < 0.1;
      if (atGoal && (a.rest -= dt) <= 0) {
        const ang = Math.random() * Math.PI * 2,
          r = a.roam * Math.sqrt(Math.random());
        a.to.set(a.anchor.x + Math.cos(ang) * r, a.anchor.y, a.anchor.z + Math.sin(ang) * r);
        a.speed = a.base * 0.4;
        a.rest = 2 + Math.random() * 5;
      }
    }
    const dx = a.to.x - g.position.x,
      dz = a.to.z - g.position.z,
      d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 0.08 && !still) {
      const step = Math.min(d, a.speed * dt);
      g.position.x += (dx / d) * step;
      g.position.z += (dz / d) * step;
      if (a.ground) g.position.y = a.ground(g.position.x, g.position.z);
      else g.position.y += (a.to.y - g.position.y) * Math.min(1, (step / d) * 1.5);
      moving = true;
      a.yaw += angDiff(a.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
    } else {
      if (d > 0) g.position.copy(a.to);
      if (a.ground && d > 0) g.position.y = a.ground(g.position.x, g.position.z);
      if (!a.roam || a.fight || Math.hypot(px - g.position.x, pz - g.position.z) < 12)
        a.yaw += angDiff(a.yaw, a.roam ? Math.atan2(px - g.position.x, pz - g.position.z) : a.face) * Math.min(1, dt * 3);
      a.speed = Math.max(a.base * 0.4, a.speed * 0.98);
    }
    g.rotation.y = a.yaw;
    const pace = Math.min(1.6, a.speed / a.base);
    a.swing += ((moving ? 0.45 + 0.25 * pace : a.fight ? 0.18 : 0) - a.swing) * Math.min(1, dt * 6);
    a.phase += dt * (moving ? Math.min(a.speed, a.base * 1.8) * 2.4 : a.fight ? 5 : 1.2);
    const u = a.u,
      t = clock + a.seed;
    u.aPhase.value = a.phase;
    u.aSwing.value = still ? 0 : a.swing;
    // the head: watching the traveller when near, else glancing about now and then
    const tx = px - g.position.x,
      tz = pz - g.position.z,
      near = Math.hypot(tx, tz) < 18,
      look = near ? Math.max(-1, Math.min(1, angDiff(a.yaw, Math.atan2(tx, tz)))) : Math.sin(t * 0.37) * Math.sin(t * 0.21) * 0.8;
    u.aHead.value += (look - u.aHead.value) * Math.min(1, dt * 4);
    u.aTail.value = Math.sin(t * (a.fight || moving ? 9 : 4)) * 0.35;
    // breath when standing; a bob in the stride when walking; a crouch and lunge in a fight; a flinch when hurt
    let bob = moving ? Math.abs(Math.sin(a.phase)) * 0.07 : Math.sin(t * 1.8) * 0.012;
    if (a.mesh.userData.actor.kind === 'wight') bob += 0.25 + Math.sin(t * 1.3) * 0.12;
    if (a.rise > 0) {
      a.rise = Math.max(0, a.rise - dt * 1.5);
      bob -= a.rise * a.rise * 2.5;
    }
    let fwd = 0,
      lean = moving ? Math.min(0.15, (a.speed / a.base - 1) * 0.08) : 0; // leaning into a hurry
    if (a.fight && !still) {
      const cyc = (t * 0.55) % 1,
        l = cyc > 0.8 ? Math.sin(((cyc - 0.8) / 0.2) * Math.PI) : 0;
      fwd = l * 1.2;
      lean += l * 0.25;
      u.aArm.value = 0.6 + l * 1.2;
    } else u.aArm.value += (0 - u.aArm.value) * Math.min(1, dt * 4);
    if (a.hurt > 0) {
      a.hurt = Math.max(0, a.hurt - dt * 2.5);
      lean -= a.hurt * 0.35;
      fwd -= a.hurt * 0.5;
    }
    a.mesh.position.set(0, bob, fwd);
    a.mesh.rotation.x = lean;
    if (a.key) keep.set(a.key, { pos: g.position.clone(), yaw: a.yaw, phase: a.phase });
  }
  for (const [k, v] of keep) LAST.set(k, v);
  if (LAST.size > 300) for (const k of [...LAST.keys()].slice(0, LAST.size - 300)) LAST.delete(k);
}
export {
  actorsOn,
  personActor,
  creatureActor,
  track,
  animateActors,
  clearActors,
  settleActors,
  shiftActors,
  forgetActors,
  markKilled,
  personModel,
  creatureModel,
};
