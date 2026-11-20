/* The performance meter: frame rate, frame time, draw calls and triangles, the last scene build, the save's size and
   memory where the browser reports it. Turned on from Menu, Settings. It reads numbers the view already has, so when
   it is off it costs one comparison per frame. */
import { SET } from './quality.js';

const PF = { frames: 0, t0: 0, last: 0, worst: 0, sum: 0, calls: 0, tris: 0, build: 0, builds: [], save: 0, el: null };
const fmtK = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
function perfBuild(ms) {
  PF.build = ms;
  PF.builds.push(ms);
  if (PF.builds.length > 20) PF.builds.shift();
}
function perfSave(bytes) {
  PF.save = bytes;
}
function perfFrame(renderer) {
  const now = performance.now();
  if (PF.last) {
    const dt = now - PF.last;
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
  PF.el.textContent =
    Math.round(fps) +
    ' fps | ' +
    (PF.frames ? (PF.sum / PF.frames).toFixed(1) : '-') +
    ' ms, worst ' +
    Math.round(PF.worst) +
    '\n' +
    PF.calls +
    ' draws | ' +
    fmtK(PF.tris) +
    ' tris | build ' +
    Math.round(PF.build) +
    ' ms\nsave ' +
    Math.round(PF.save / 1024) +
    ' KB' +
    mem +
    ' | ' +
    SET.quality;
  PF.t0 = now;
  PF.frames = 0;
  PF.sum = 0;
  PF.worst = 0;
}
export { PF, perfBuild, perfFrame, perfSave };
