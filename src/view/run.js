/* Run control: saving, starting, acting, and the per-frame loop. */
import { $, CODEX, EYE, G, KEY, OLD_KEYS, P, R, V, VIEW, clamp, lerp, smooth, tileX, toTile } from './ctx.js';
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
  const indoor = R.indoors(V.S);
  P.x = tileX(V.S.player.x) + (indoor ? 0 : 6);
  P.z = tileX(V.S.player.y) + (indoor ? 0 : 7);
  P.y = V.terrain.height(P.x, P.z) + EYE;
  P.pitch = 0;
  P.walked = 0;
  // face somewhere useful: indoors, the open direction with the most floor ahead; outdoors, toward the town
  if (indoor) {
    // face the longest open view, but never back toward the door or stair you just came through
    let best = 0,
      bestRun = -1;
    [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].forEach(([dx, dy], i) => {
      const st = V.S.sites[(V.S.player.y + dy) * R.W + V.S.player.x + dx];
      if (st && (st.kind === 'exit' || st.kind === 'stairsUp')) return;
      let run = 0;
      while (run < 12 && R.passable(V.S, V.S.player.x + dx * (run + 1), V.S.player.y + dy * (run + 1))) run++;
      if (run > bestRun) {
        bestRun = run;
        best = i;
      }
    });
    P.yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][best];
  } else P.yaw = Math.atan2(-(tileX(V.S.town.x) - P.x), -(tileX(V.S.town.y) - P.z));
  shown.t = V.S.time;
  shown.area = V.S.area;
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
// After anything that might move the player into another area, rebuild the scene for where they are now.
function sync() {
  if (shown.area !== V.S.area) {
    buildStatic();
    placePlayer();
  }
}
function act(fn) {
  if (!V.S || V.S.over) return;
  fn();
  sync();
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
    indoor = R.indoors(V.S),
    sp = VIEW.speed * (indoor ? 0.65 : clamp(mc.base / mc.mins, 0.3, 1.15));
  // outdoors you can walk off the edge of a region, into its neighbour
  const open = R.inOverworld(V.S),
    lim = open ? G.half + 1 : G.half - 1,
    tileOf = open ? (x) => Math.floor((x + G.half) / G.ts) : toTile;
  let nx = clamp(P.x + dx * sp * dt, -lim, lim),
    nz = clamp(P.z + dz * sp * dt, -lim, lim);
  // walls: keep a little distance from them, and slide along them instead of stopping dead
  const pad = indoor ? 0.6 : 0,
    blocked = (x, z) =>
      !R.passable(V.S, toTile(x + Math.sign(x - P.x) * pad), toTile(z)) ||
      !R.passable(V.S, toTile(x), toTile(z + Math.sign(z - P.z) * pad));
  if (indoor && blocked(nx, nz)) {
    if (!blocked(nx, P.z)) nz = P.z;
    else if (!blocked(P.x, nz)) nx = P.x;
    else return;
  }
  const tx = tileOf(nx),
    tz = tileOf(nz);
  if (tx !== V.S.player.x || tz !== V.S.player.y) {
    if (now < V.blockedUntil) return;
    const before = V.S.log.length,
      wasArea = V.S.area,
      ok = R.move(V.S, tx - V.S.player.x, tz - V.S.player.y);
    if (!ok) {
      V.blockedUntil = now + 1500;
      render();
      return;
    }
    if (V.S.area !== wasArea && R.inOverworld(V.S)) {
      // crossed a border: same heading, same stride, on the facing edge of the next region
      buildStatic();
      shown.area = V.S.area;
      nx -= Math.floor(tx / R.W) * 2 * G.half;
      nz -= Math.floor(tz / R.H) * 2 * G.half;
    }
    sync();
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
  if (R.isDark(V.S)) {
    // underground: no sky, and you see only as far as your light reaches
    const lit = R.stat(V.S, 'nightSight', 0) > 0;
    scene.background.setHex(0x050608);
    scene.fog.color.setHex(0x050608);
    shown.far = lerp(shown.far, lit ? 26 : 6, 0.1);
    scene.fog.far = shown.far;
    scene.fog.near = 1;
    hemi.intensity = 0.05;
    sun.intensity = 0;
    lamp.intensity = lit ? 1.1 : 0.25;
    lamp.distance = lit ? 26 : 6;
    lamp.position.set(P.x, P.y + 0.8, P.z);
    return finishFrame();
  }
  lamp.distance = 45;
  const storm = V.S.weather.storm && !R.indoors(V.S);
  if (storm) skyC.lerp(stormC, 0.6).multiplyScalar(0.5 + 0.5 * day);
  scene.background.copy(skyC);
  scene.fog.color.copy(skyC);
  const sight = R.stat(V.S, 'nightSight', 0) > 0,
    far = storm ? 85 : lerp(sight ? 260 : 110, 620, day);
  shown.far = lerp(shown.far, R.indoors(V.S) ? Math.min(far, 160) : far, 0.05);
  scene.fog.far = shown.far;
  scene.fog.near = Math.min(40, shown.far * 0.2);
  hemi.intensity = lerp(0.22, 0.78, day);
  sun.intensity = lerp(0.03, 0.9, day) * (storm ? 0.4 : 1);
  const sa = ((h - 6) / 14) * Math.PI;
  sun.position.set(-Math.cos(sa) * 300, Math.max(20, Math.sin(sa) * 300), 120);
  lamp.intensity = sight && day < 0.5 ? 1.4 * (1 - day * 2) : 0;
  lamp.position.set(P.x, P.y + 0.3, P.z);
  finishFrame();
}
function finishFrame() {
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
  sync,
  finishFrame,
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
