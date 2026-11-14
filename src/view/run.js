/* Run control: saving, starting, acting, and the per-frame loop. */
import { $, CODEX, EYE, HALF, KEY, OLD_KEYS, P, R, V, VIEW, clamp, lerp, smooth, tileX, toTile } from './ctx.js';
import { buildDynamic, buildStatic, camera, hemi, lamp, renderer, scene, sun } from './scene.js';
import { closeModal, lock, openCreate, render, showEnd } from './ui.js';

/* ---------- codex: what you have learned across every run ---------- */
let codex = {};
try {
  codex = JSON.parse(localStorage.getItem(CODEX) || '{}') || {};
} catch (e) {
  codex = {};
}
R.on('learned', (s, d) => {
  if (d.axis === 'god') return;
  codex[d.axis + ':' + d.id] = 1;
  try {
    localStorage.setItem(CODEX, JSON.stringify(codex));
  } catch (e) {}
});
const codexTotal = R.AXES.reduce((n, a) => n + R.C.civ[a].length, 0);
/* ---------- run control ---------- */
function save() {
  try {
    if (!V.S || (V.S.over && (V.S.over.won || R.livesLeft(V.S) <= 0))) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, R.serialize(V.S));
  } catch (e) {
    /* storage is optional */
  }
}
function load() {
  for (const k of [KEY].concat(OLD_KEYS)) {
    let t = null;
    try {
      t = localStorage.getItem(k);
    } catch (e) {}
    if (!t) continue;
    const res = R.deserialize(t);
    if (res.state) return res.state;
  }
  return null;
}
function placePlayer() {
  P.x = tileX(V.S.player.x) + 6;
  P.z = tileX(V.S.player.y) + 7;
  P.y = V.terrain.height(P.x, P.z) + EYE;
  P.pitch = 0;
  P.walked = 0;
  P.yaw = Math.atan2(-(tileX(V.S.town.x) - P.x), -(tileX(V.S.town.y) - P.z));
  shown.t = V.S.time;
}
function enter(state) {
  V.S = state;
  buildStatic();
  buildDynamic();
  placePlayer();
  lock(false);
  closeModal();
  render.stamp = '';
  render();
  save();
}
const randomSeed = () => 10000 + Math.floor(Math.random() * 90000),
  start = (seed) => {
    enter(R.newGame(seed));
    openCreate(false);
  };
function act(fn) {
  if (!V.S || V.S.over) return;
  fn();
  buildDynamic();
  render();
  save();
  if (V.S.over) showEnd();
}

/* ---------- per-frame ---------- */
const input = { fx: 0, fy: 0, keys: {} },
  shown = { t: 0, far: 600 },
  skyC = new THREE.Color(),
  dayC = new THREE.Color(),
  duskC = new THREE.Color(0xd99a6c),
  nightC = new THREE.Color(0x121827),
  stormC = new THREE.Color(0x8d8f8c);
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(dt, now) {
  if (!V.S || V.S.over || !$('modal').hidden) return;
  const k = input.keys;
  let fx = input.fx,
    fy = input.fy;
  if (V.S.combat) {
    fx = fy = 0;
    input.keys.w = input.keys.s = input.keys.a = input.keys.d = input.keys.arrowup = input.keys.arrowdown = false;
  }
  if (k.w || k.arrowup) fy += 1;
  if (k.s || k.arrowdown) fy -= 1;
  if (k.d) fx += 1;
  if (k.a) fx -= 1;
  if (k.arrowleft || k.q) P.yaw += 1.9 * dt;
  if (k.arrowright || k.e) P.yaw -= 1.9 * dt;
  let mag = Math.hypot(fx, fy);
  if (mag < 0.05) return;
  if (mag > 1) {
    fx /= mag;
    fy /= mag;
    mag = 1;
  }
  const sn = Math.sin(P.yaw),
    cs = Math.cos(P.yaw),
    dx = -sn * fy + cs * fx,
    dz = -cs * fy - sn * fx,
    mc = R.moveCost(V.S, V.S.player.x, V.S.player.y),
    sp = VIEW.speed * clamp(mc.base / mc.mins, 0.3, 1.15);
  const nx = clamp(P.x + dx * sp * dt, -HALF + 3, HALF - 3),
    nz = clamp(P.z + dz * sp * dt, -HALF + 3, HALF - 3),
    tx = toTile(nx),
    tz = toTile(nz);
  if (tx !== V.S.player.x || tz !== V.S.player.y) {
    if (now < V.blockedUntil) return;
    const before = V.S.log.length,
      ok = R.move(V.S, tx - V.S.player.x, tz - V.S.player.y);
    if (!ok) {
      V.blockedUntil = now + 1500;
      render();
      return;
    }
    buildDynamic();
    render();
    save();
    if (V.S.over) {
      showEnd();
      return;
    }
  }
  P.walked += Math.hypot(nx - P.x, nz - P.z);
  P.x = nx;
  P.z = nz;
}
const DIRN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function frame() {
  shown.t = lerp(shown.t, V.S.time, 0.06);
  const h = ((360 + shown.t) / 60) % 24,
    b = R.biomeOf(V.S),
    day = smooth(clamp((h - 5) / 2, 0, 1)) * (1 - smooth(clamp((h - 18.5) / 2, 0, 1))),
    dusk = Math.max(0, 1 - Math.abs(h - 6) / 1.3, 1 - Math.abs(h - 19.4) / 1.5);
  dayC.setHex(b.sky);
  skyC
    .copy(nightC)
    .lerp(dayC, day)
    .lerp(duskC, dusk * 0.55);
  const storm = V.S.weather.storm;
  if (storm) skyC.lerp(stormC, 0.6).multiplyScalar(0.5 + 0.5 * day);
  scene.background.copy(skyC);
  scene.fog.color.copy(skyC);
  const sight = R.stat(V.S, 'nightSight', 0) > 0,
    far = storm ? 85 : lerp(sight ? 260 : 110, 620, day);
  shown.far = lerp(shown.far, far, 0.05);
  scene.fog.far = shown.far;
  scene.fog.near = Math.min(40, shown.far * 0.2);
  hemi.intensity = lerp(0.22, 0.78, day);
  sun.intensity = lerp(0.03, 0.9, day) * (storm ? 0.4 : 1);
  const sa = ((h - 6) / 14) * Math.PI;
  sun.position.set(-Math.cos(sa) * 300, Math.max(20, Math.sin(sa) * 300), 120);
  lamp.intensity = sight && day < 0.5 ? 1.4 * (1 - day * 2) : 0;
  lamp.position.set(P.x, P.y + 0.3, P.z);
  const target = V.terrain.height(P.x, P.z) + EYE + (still ? 0 : Math.sin(P.walked * 1.7) * 0.05);
  P.y = lerp(P.y, target, 0.35);
  camera.position.set(P.x, P.y, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  const deg = ((((-P.yaw * 180) / Math.PI) % 360) + 360) % 360;
  $('facing').textContent = 'Facing ' + DIRN[Math.round(deg / 45) % 8];
  renderer.render(scene, camera);
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (V.S) {
    tick(dt, now);
    frame();
  }
  requestAnimationFrame(loop);
}

export {
  codex,
  codexTotal,
  save,
  load,
  placePlayer,
  enter,
  randomSeed,
  start,
  act,
  input,
  shown,
  skyC,
  dayC,
  duskC,
  nightC,
  stormC,
  still,
  tick,
  DIRN,
  frame,
  last,
  loop,
};
