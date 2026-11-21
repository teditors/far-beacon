/* The performance meter: frame rate, frame time, the work each frame takes (out of the screen's budget, which is
   what shows the margin when the frame rate is capped at the screen's 60), draw calls and triangles, the last scene
   build and its parts, the save's size and memory where the browser reports it. Turned on from Menu, Settings. It reads numbers the view already has, so when
   it is off it costs one comparison per frame. */
import { SET } from './quality.js';

const PF = {
  work: 0,
  workWorst: 0,
  workN: 0,
  parts: {},
  frames: 0,
  t0: 0,
  last: 0,
  worst: 0,
  sum: 0,
  calls: 0,
  tris: 0,
  build: 0,
  builds: [],
  save: 0,
  el: null,
};
const fmtK = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
function perfBuild(ms) {
  PF.build = ms;
  PF.builds.push(ms);
  if (PF.builds.length > 20) PF.builds.shift();
}
// The time spent in one frame: moving, the rules, and handing the scene to the GPU (the GPU's own time is not seen).
function perfWork(ms) {
  PF.work += ms;
  PF.workN++;
  PF.workWorst = Math.max(PF.workWorst, ms);
}
function perfSave(bytes) {
  PF.save = bytes;
}
/* Watching for a device that cannot keep up (C6): when the frames stay slow (under about 22 a second) for a dozen
   seconds of play, the game steps its graphics down a level, by itself, and says so (ui.js shows the note). A hitch
   (a long single frame, a build) or a hidden page says nothing. */
const AUTO = { on: true, slow: -8, win: 0, n: 0, fn: null },
  SLOW_MS = 45,
  SLOW_SECS = 12;
function autoWatch(dt) {
  if (!AUTO.on || !AUTO.fn || (typeof document !== 'undefined' && document.hidden) || dt > 400) {
    AUTO.win = AUTO.n = 0;
    return;
  }
  AUTO.win += dt;
  AUTO.n++;
  if (AUTO.win < 1000) return;
  const avg = AUTO.win / AUTO.n;
  AUTO.win = AUTO.n = 0;
  AUTO.slow = avg > SLOW_MS ? AUTO.slow + 1 : Math.max(Math.min(AUTO.slow, 0), AUTO.slow - 2);
  if (AUTO.slow >= SLOW_SECS) {
    AUTO.slow = -8; // a grace while the lower level settles
    AUTO.fn();
  }
}
// fn() is called to step down; on(false) stops the watching (the benchmark, the tests, a player who chose a level)
const autoQuality = (fn, on) => {
  if (fn) AUTO.fn = fn;
  if (on !== undefined) AUTO.on = on;
  AUTO.slow = -8;
};
function perfFrame(renderer) {
  const now = performance.now();
  if (PF.last) {
    const dt = now - PF.last;
    autoWatch(dt);
    PF.sum += dt;
    PF.worst = Math.max(PF.worst, dt);
    PF.frames++;
  }
  PF.last = now;
  if (!SET.meter) {
    if (PF.el) PF.el.hidden = true;
    return;
  }
  PF.calls = renderer.info.render.calls;
  PF.tris = renderer.info.render.triangles;
  if (now - PF.t0 < 500) return;
  if (!PF.el) {
    PF.el = document.createElement('pre');
    PF.el.id = 'perf';
    document.body.appendChild(PF.el);
  }
  PF.el.hidden = false;
  const fps = PF.frames ? (1000 * PF.frames) / PF.sum : 0,
    mem = performance.memory ? ' | heap ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '';
  const avg = PF.frames ? PF.sum / PF.frames : 16.7,
    work = PF.workN ? PF.work / PF.workN : 0,
    parts = Object.keys(PF.parts)
      .map((k) => k + ' ' + Math.round(PF.parts[k]))
      .join(', ');
  PF.el.textContent =
    Math.round(fps) +
    ' fps | ' +
    avg.toFixed(1) +
    ' ms, worst ' +
    Math.round(PF.worst) +
    '\nwork ' +
    work.toFixed(1) +
    ' ms (' +
    Math.round((100 * work) / Math.max(avg, 16.7)) +
    '% of the frame), worst ' +
    Math.round(PF.workWorst) +
    '\n' +
    PF.calls +
    ' draws | ' +
    fmtK(PF.tris) +
    ' tris | build ' +
    Math.round(PF.build) +
    ' ms' +
    (parts ? '\n(' + parts + ')' : '') +
    '\nsave ' +
    Math.round(PF.save / 1024) +
    ' KB' +
    mem +
    ' | ' +
    SET.quality;
  PF.t0 = now;
  PF.frames = 0;
  PF.sum = 0;
  PF.worst = 0;
  PF.work = PF.workN = PF.workWorst = 0;
}
export { autoQuality, PF, perfBuild, perfFrame, perfSave, perfWork };
