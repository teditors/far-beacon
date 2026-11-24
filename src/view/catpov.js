/* The cat's-eye view (commission 9, Super Feline Mode): you are a cat, and you can tell.
   - Two ears peek in at the top (wide screens), and flatten back when a fight begins.
   - A paw swipes across the view, claws out, every time you strike, cast or smite, and a happy little bat when you win.
   - A nap shows z's. (Whiskers and blinking eyelids were tried and taken out at Andrew's word: they did not work.)
   - Paw prints follow you over the ground: a trail of the last couple of hundred steps, fading as they age, gone
     when you cross into a new place.
   - The cat's inner monologue: now and then, when something happens (a nap, a swat, a kill, a storm, an empty bowl,
     a town, a new level, or nothing at all for a while), a thought in a bubble (content/felinevoice.js, `quips`).
   - The zoomies: between two and five in the morning, now and then, you run at twice the pace for five seconds. View
     only: the steps cost what they always cost.
   The overlay is plain page elements (styles in shell.html, under body.theme-feline), never in the way of a tap. View
   only: the rules know nothing of it. catFrame(dt) runs every frame from run.js. */
import { P, R, V, VIEW } from './ctx.js';
import { scene } from './scene.js';
import { TH } from './themeflag.js';
import { drawPaw } from './catsplash.js';
import { SHIFTS } from './actors.js';

const on = () => TH.id === 'feline';
let root = null;
function overlay() {
  if (root) return root;
  root = document.createElement('div');
  root.id = 'catpov';
  root.setAttribute('data-notheme', '1');
  root.setAttribute('aria-hidden', 'true');
  const ear = (side) =>
    '<svg class="ear ' +
    side +
    '" viewBox="0 0 100 80"><path class="fur" d="M5 80 L50 0 L95 80 Z"/><path class="pink" d="M28 80 L50 28 L72 80 Z"/></svg>';
  root.innerHTML =
    ear('left') +
    ear('right') +
    '<div class="think"></div><div class="zzz">z z z</div>' +
    '<svg class="paw" viewBox="0 0 200 260"><path class="arm" d="M70 260 C 60 180 50 120 60 80 C 70 40 140 40 150 80 C 160 120 150 180 140 260 Z"/>' +
    '<g class="claws"><path d="M70 52 l-6 -26 l14 22 Z"/><path d="M95 40 l-2 -28 l10 26 Z"/><path d="M120 40 l4 -28 l4 28 Z"/><path d="M143 52 l10 -24 l-2 26 Z"/></g>' +
    '<ellipse class="bean" cx="105" cy="105" rx="26" ry="20"/><ellipse class="bean" cx="72" cy="70" rx="10" ry="13"/>' +
    '<ellipse class="bean" cx="94" cy="58" rx="10" ry="13"/><ellipse class="bean" cx="118" cy="58" rx="10" ry="13"/><ellipse class="bean" cx="140" cy="70" rx="10" ry="13"/></svg>';
  document.body.appendChild(root); // over the scene and the panels (never in the way of a tap), under an open window
  return root;
}
// a one-off animation, restarted if it is already running
function flash(cls, ms) {
  const r = overlay();
  r.classList.remove(cls);
  void r.offsetWidth;
  r.classList.add(cls);
  clearTimeout(flash[cls]);
  flash[cls] = setTimeout(() => r.classList.remove(cls), ms);
}
/* ---------- the inner monologue ---------- */
const CHANCE = {
  attack: 0.3,
  rest: 0.6,
  sleep: 0.8,
  kill: 0.85,
  hurt: 0.25,
  idle: 1,
  win: 1,
  death: 1,
  thirsty: 1,
  storm: 1,
  levelUp: 1,
  town: 0.7,
};
let zoom = 0,
  zoomFrom = 7;
let quiet = 0, // seconds until another thought may come
  idleFor = 0,
  lastQuip = '';
function think(ev, force) {
  if (!on() || (!force && quiet > 0)) return;
  const t = R.themeById(TH.id),
    list = t && t.quips && t.quips[ev];
  if (!list || !list.length || Math.random() > (CHANCE[ev] === undefined ? 0.5 : CHANCE[ev])) return;
  let q = list[Math.floor(Math.random() * list.length)];
  if (q === lastQuip && list.length > 1) q = list[(list.indexOf(q) + 1) % list.length];
  lastQuip = q;
  showThought(q);
}
function showThought(q) {
  overlay().querySelector('.think').textContent = q;
  flash('thinking', 4200);
  quiet = 7;
  idleFor = 0;
}
R.on('did', (s, d) => {
  if (!on() || !d) return;
  idleFor = 0;
  think(d.id);
  if (['attack', 'firebolt', 'smite', 'power'].includes(d.id)) flash('swipe', 520);
  else if (d.id === 'rest' || d.id === 'sleep' || d.id === 'makeCamp') flash('nap', 2400);
  else if (d.id === 'search' || d.id === 'survey') flash('peek', 900);
});
R.on('killed', () => on() && (setTimeout(() => flash('bat', 700), 300), think('kill', true)));

// What the cat notices on its own: being hurt, a storm, an empty bowl, a new level, a town, the end, or boredom.
const seen = {};
function watch(dt) {
  quiet -= dt;
  const s = V.S;
  if (!s) return;
  const p = s.player,
    low = p.water <= Math.max(1, R.waterCap(s) * 0.2),
    kind = R.areaRec(s).kind,
    over = s.over ? (s.over.won ? 'win' : 'death') : null;
  if (seen.hp !== undefined && p.hp < seen.hp - 0.5) think('hurt');
  if (seen.storm === false && s.weather.storm && !R.indoors(s)) think('storm');
  if (seen.low === false && low) think('thirsty');
  if (seen.level !== undefined && p.level > seen.level) think('levelUp', true);
  if (seen.kind !== undefined && kind === 'town' && seen.kind !== 'town') think('town');
  if (over && over !== seen.over) setTimeout(() => think(over, true), 1200);
  Object.assign(seen, { hp: p.hp, storm: !!s.weather.storm, low, level: p.level, kind, over });
  // the zoomies: in the small hours, now and then, you run twice as fast for a few seconds, for no reason at all
  const hr = R.clock(s).hour;
  if (zoom > 0) {
    if ((zoom -= dt) <= 0) VIEW.speed = zoomFrom;
  } else if (hr >= 2 && hr < 5 && !s.combat && Math.random() < dt / 40) {
    zoomFrom = VIEW.speed;
    VIEW.speed = zoomFrom * 2.2;
    zoom = 5;
    showThought('ZOOMIES!!!');
    flash('zoomies', 5000);
  }
  // nothing happening for a while: the mind wanders
  if ((idleFor += dt) > 25 && !s.combat) {
    idleFor = 0;
    think('idle');
  }
}

/* ---------- paw prints ---------- */
const MAX = 220;
let prints = null,
  trail = [],
  lastX = null,
  lastZ = null,
  lastArea = null,
  side = 1;
const M = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  E = new THREE.Euler(),
  S = new THREE.Vector3(),
  T = new THREE.Vector3();
function printMesh() {
  if (prints) return prints;
  // one paw print, drawn on a little canvas and laid flat
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  drawPaw(g, 32, 34, 22, 0, 'rgba(40,24,30,0.85)');
  const tex = new THREE.CanvasTexture(cv);
  const geo = new THREE.PlaneGeometry(0.34, 0.34);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7, fog: true });
  prints = new THREE.InstancedMesh(geo, mat, MAX);
  prints.count = 0;
  prints.frustumCulled = false;
  prints.renderOrder = 2;
  scene.add(prints);
  return prints;
}
function layPrints() {
  const m = printMesh(),
    n = trail.length;
  m.count = n;
  for (let i = 0; i < n; i++) {
    const p = trail[i],
      age = (n - i) / MAX,
      k = 1 - age * 0.6;
    E.set(0, p.yaw, 0);
    Q.setFromEuler(E);
    T.set(p.x, p.y, p.z);
    S.set(k, 1, k);
    m.setMatrixAt(i, M.compose(T, Q, S));
  }
  m.instanceMatrix.needsUpdate = true;
}
function clearPrints() {
  trail = [];
  if (prints) prints.count = 0;
}
// every frame, from run.js
function catFrame(dt, still) {
  const feline = on();
  document.body.classList.toggle('in-fight', feline && !!(V.S && V.S.combat));
  if (!feline) {
    if (zoom > 0) (zoom = 0), (VIEW.speed = zoomFrom);
    if (prints) prints.visible = false;
    return;
  }
  overlay();
  watch(dt);
  const m = printMesh();
  m.visible = true;
  const area = V.S && V.S.area;
  if (area !== lastArea || lastX === null || Math.hypot(P.x - lastX, P.z - lastZ) > 12 || R.aloft(V.S)) {
    clearPrints();
    lastArea = area;
    lastX = P.x;
    lastZ = P.z;
    return;
  }
  const d = Math.hypot(P.x - lastX, P.z - lastZ);
  if (d < 0.55 || !V.terrain) return;
  // a print a little to each side of the way you went, turned the way you went
  const yaw = Math.atan2(-(P.x - lastX), -(P.z - lastZ)),
    ox = Math.cos(yaw) * 0.14 * side,
    oz = -Math.sin(yaw) * 0.14 * side,
    x = P.x + ox,
    z = P.z + oz;
  side = -side;
  trail.push({ x, z, y: V.terrain.height(x, z) + 0.03, yaw });
  if (trail.length > MAX) trail.shift();
  lastX = P.x;
  lastZ = P.z;
  layPrints();
}
// the frame of the scene moved (a border crossed, a town gate passed): the trail moves with it
function shiftPrints(dx, dz, dy) {
  for (const p of trail) (p.x += dx), (p.z += dz), (p.y += dy || 0);
  if (lastX !== null) (lastX += dx), (lastZ += dz);
  if (trail.length) layPrints();
}
SHIFTS.push(shiftPrints);
export { catFrame, shiftPrints, clearPrints };
