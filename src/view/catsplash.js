/* The splash for Super Feline Mode (commission 9): when a world turns feline (chosen on the new world screen or in
   Settings, or rolled by itself), a flashy full-screen celebration. Cats in every coat (tabby, tuxedo, calico, ginger,
   Siamese points, black, grey, cream) fly across in capes, spin, bounce and wave; balls of yarn unspool, fish, mice,
   feathers, bells on collars, bows, crowns, sunglasses and red laser dots whizz about; paw prints rain down; the
   title wobbles in rainbow letters. All drawn in code on one canvas (no pictures, no files), for a few seconds, or
   until a tap. With reduced motion asked for, a still card instead. */

const COATS = [
  { fur: '#f0a040', dark: '#b8661c', belly: '#fbe2c0', pattern: 'tabby' }, // ginger tabby
  { fur: '#2b2a30', dark: '#121116', belly: '#f4f2ee', pattern: 'tuxedo' },
  { fur: '#f2ead8', dark: '#3b2a20', belly: '#ffffff', pattern: 'calico', patch2: '#e08a3a' },
  { fur: '#8f8f98', dark: '#5c5c66', belly: '#d8d8de', pattern: 'tabby' }, // grey tabby
  { fur: '#f3e6cc', dark: '#5a3b2a', belly: '#fff8ea', pattern: 'points' }, // Siamese
  { fur: '#1c1b20', dark: '#000000', belly: '#2c2b30', pattern: 'plain' }, // black
  { fur: '#e8c890', dark: '#b08850', belly: '#fff2d8', pattern: 'plain' }, // cream
  { fur: '#a07050', dark: '#5a3a24', belly: '#e8cfb0', pattern: 'tabby' }, // brown tabby
  { fur: '#c9b0e8', dark: '#8a68c0', belly: '#f2e8ff', pattern: 'tabby' }, // a lilac one, for fun
];
const EYES = ['#7ad04a', '#f0c030', '#4ab0e8', '#e8803a'];
const CAPES = ['#e8344a', '#3a6ae8', '#f0c020', '#9a3ae8', '#20b878', '#ff70b0'];
const EMOJI = ['🐱', '😺', '😸', '😻', '😹', '🐈', '🐈‍⬛', '🐾', '🧶', '🐟', '🐭', '🎀', '👑', '🔔', '🥛', '🐠', '🪶', '📦'];

function cat(c, o, t) {
  const coat = o.coat,
    r = o.size;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rot);
  // a flying body with a cape, legs out like a hero
  if (o.body) {
    c.fillStyle = o.cape;
    c.beginPath();
    c.moveTo(-r * 0.4, r * 0.2);
    const flap = Math.sin(t * 14 + o.seed) * r * 0.25;
    c.quadraticCurveTo(-r * 1.6, r * 0.9 + flap, -r * 2.6, r * 0.4 + flap * 1.6);
    c.lineTo(-r * 2.2, r * 1.4 + flap);
    c.quadraticCurveTo(-r * 1.2, r * 1.6, -r * 0.1, r * 0.9);
    c.fill();
    c.fillStyle = coat.fur;
    c.beginPath();
    c.ellipse(-r * 0.9, r * 0.85, r * 1.0, r * 0.5, -0.1, 0, Math.PI * 2);
    c.fill();
    for (const [lx, ly] of [
      [-1.7, 1.0],
      [-1.5, 1.25],
      [0.0, 1.1],
      [0.15, 0.85],
    ]) {
      c.beginPath();
      c.ellipse(lx * r, ly * r, r * 0.3, r * 0.14, 0.3, 0, Math.PI * 2);
      c.fill();
    }
    // the tail, waving
    c.strokeStyle = coat.fur;
    c.lineWidth = r * 0.22;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 1.8, r * 0.7);
    c.quadraticCurveTo(-r * 2.6, r * (0.1 + Math.sin(t * 6 + o.seed) * 0.5), -r * 2.4, -r * 0.6);
    c.stroke();
  }
  // ears
  c.fillStyle = coat.pattern === 'points' ? coat.dark : coat.fur;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * r * 0.85, -r * 0.35);
    c.lineTo(s * r * 0.7, -r * 1.25);
    c.lineTo(s * r * 0.15, -r * 0.8);
    c.fill();
  }
  c.fillStyle = '#f4a0b0';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * r * 0.72, -r * 0.45);
    c.lineTo(s * r * 0.66, -r * 1.02);
    c.lineTo(s * r * 0.32, -r * 0.75);
    c.fill();
  }
  // the head
  c.fillStyle = coat.fur;
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
  c.fill();
  if (coat.pattern === 'tabby') {
    c.strokeStyle = coat.dark;
    c.lineWidth = r * 0.09;
    for (const dx of [-0.25, 0, 0.25]) {
      c.beginPath();
      c.moveTo(dx * r, -r * 0.82);
      c.lineTo(dx * r * 0.6, -r * 0.45);
      c.stroke();
    }
    for (const s of [-1, 1])
      for (const dy of [-0.05, 0.18]) {
        c.beginPath();
        c.moveTo(s * r * 0.98, dy * r);
        c.lineTo(s * r * 0.7, dy * r + r * 0.04);
        c.stroke();
      }
  } else if (coat.pattern === 'tuxedo' || coat.pattern === 'calico') {
    c.fillStyle = coat.pattern === 'tuxedo' ? coat.belly : coat.dark;
    c.beginPath();
    if (coat.pattern === 'tuxedo') {
      c.moveTo(0, -r * 0.3);
      c.lineTo(-r * 0.55, r * 0.85);
      c.lineTo(r * 0.55, r * 0.85);
    } else c.ellipse(-r * 0.45, -r * 0.35, r * 0.42, r * 0.35, 0.3, 0, Math.PI * 2);
    c.fill();
    if (coat.patch2) {
      c.fillStyle = coat.patch2;
      c.beginPath();
      c.ellipse(r * 0.5, -r * 0.3, r * 0.35, r * 0.3, -0.4, 0, Math.PI * 2);
      c.fill();
    }
  } else if (coat.pattern === 'points') {
    c.fillStyle = coat.dark;
    c.beginPath();
    c.ellipse(0, r * 0.3, r * 0.45, r * 0.42, 0, 0, Math.PI * 2);
    c.fill();
  }
  // eyes: big, with slit pupils; now and then a slow blink
  const blink = Math.sin(t * 1.7 + o.seed * 3) > 0.96;
  for (const s of [-1, 1]) {
    c.fillStyle = o.eye;
    c.beginPath();
    c.ellipse(s * r * 0.38, -r * 0.08, r * 0.2, blink ? r * 0.03 : r * 0.24, 0, 0, Math.PI * 2);
    c.fill();
    if (!blink) {
      c.fillStyle = '#111';
      c.beginPath();
      c.ellipse(s * r * 0.38, -r * 0.08, r * 0.06, r * 0.2, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(s * r * 0.33, -r * 0.18, r * 0.05, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (o.shades) {
    c.fillStyle = '#111';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(s * r * 0.4, -r * 0.1, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillRect(-r * 0.15, -r * 0.16, r * 0.3, r * 0.06);
  }
  // nose, mouth and whiskers
  c.fillStyle = '#f07890';
  c.beginPath();
  c.moveTo(-r * 0.1, r * 0.2);
  c.lineTo(r * 0.1, r * 0.2);
  c.lineTo(0, r * 0.32);
  c.fill();
  c.strokeStyle = coat.pattern === 'plain' && coat.fur < '#4' ? '#ddd' : '#2a2020';
  c.lineWidth = Math.max(1, r * 0.04);
  c.beginPath();
  c.moveTo(0, r * 0.32);
  c.quadraticCurveTo(-r * 0.12, r * 0.48, -r * 0.24, r * 0.38);
  c.moveTo(0, r * 0.32);
  c.quadraticCurveTo(r * 0.12, r * 0.48, r * 0.24, r * 0.38);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  for (const s of [-1, 1])
    for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.moveTo(s * r * 0.3, r * 0.3);
      c.lineTo(s * r * 1.35, r * (0.22 + k * 0.16));
      c.stroke();
    }
  // a crown, a bow or a collar with a bell
  if (o.hat === 'crown') {
    c.fillStyle = '#f8d030';
    c.beginPath();
    c.moveTo(-r * 0.45, -r * 0.78);
    for (let i = 0; i <= 4; i++) c.lineTo(-r * 0.45 + i * r * 0.225, -r * (i % 2 ? 0.98 : 1.3));
    c.lineTo(r * 0.45, -r * 0.78);
    c.fill();
  } else if (o.hat === 'bow') {
    c.fillStyle = '#ff4f9a';
    c.beginPath();
    c.ellipse(r * 0.55, -r * 0.72, r * 0.22, r * 0.14, 0.6, 0, Math.PI * 2);
    c.ellipse(r * 0.85, -r * 0.5, r * 0.22, r * 0.14, 0.6, 0, Math.PI * 2);
    c.fill();
  } else if (o.hat === 'bell') {
    c.fillStyle = '#e8344a';
    c.fillRect(-r * 0.6, r * 0.72, r * 1.2, r * 0.14);
    c.fillStyle = '#f8d030';
    c.beginPath();
    c.arc(0, r * 0.95, r * 0.16, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
function yarn(c, o, t) {
  const r = o.size * 0.7;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rot);
  c.fillStyle = o.color;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = Math.max(1, r * 0.08);
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.ellipse(0, 0, r * 0.95, r * (0.25 + Math.abs(i) * 0.15), i * 0.6, 0, Math.PI * 2);
    c.stroke();
  }
  // the loose end, trailing behind
  c.strokeStyle = o.color;
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.moveTo(r, 0);
  for (let i = 1; i < 8; i++) c.lineTo(r + i * r * 0.5, Math.sin(t * 8 + i) * r * 0.3);
  c.stroke();
  c.restore();
}
function fish(c, o) {
  const r = o.size * 0.6;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rot);
  c.fillStyle = o.color;
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2);
  c.moveTo(r * 0.8, 0);
  c.lineTo(r * 1.5, -r * 0.5);
  c.lineTo(r * 1.5, r * 0.5);
  c.fill();
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(-r * 0.55, -r * 0.1, r * 0.09, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
function mouse(c, o, t) {
  const r = o.size * 0.5;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rot);
  c.fillStyle = '#9a9aa4';
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(-r * 0.5, -r * 0.55, r * 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f4a0b0';
  c.beginPath();
  c.arc(-r * 0.5, -r * 0.55, r * 0.17, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#f4a0b0';
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.moveTo(r, 0);
  c.quadraticCurveTo(r * 1.8, Math.sin(t * 9) * r, r * 2.3, -r * 0.4);
  c.stroke();
  c.restore();
}
function feather(c, o, t) {
  const r = o.size;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rot + Math.sin(t * 3 + o.seed) * 0.5);
  c.fillStyle = o.color;
  c.beginPath();
  c.ellipse(0, 0, r * 0.18, r * 0.75, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.moveTo(0, -r * 0.75);
  c.lineTo(0, r);
  c.stroke();
  c.restore();
}
function paw(c, x, y, r, rot, color) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(0, r * 0.35, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
  c.fill();
  for (const [dx, dy] of [
    [-0.55, -0.25],
    [-0.2, -0.6],
    [0.2, -0.6],
    [0.55, -0.25],
  ]) {
    c.beginPath();
    c.ellipse(dx * r, dy * r, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
function laser(c, o, t) {
  const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size * 0.6);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.25, '#ff2030');
  g.addColorStop(1, 'rgba(255,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(o.x, o.y, o.size * (0.5 + Math.sin(t * 20) * 0.08), 0, Math.PI * 2);
  c.fill();
}

const still = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Show the splash. o: { title, sub, rolled, onDone, ms }. Returns a function that closes it. */
function catSplash(o) {
  o = o || {};
  const old = document.getElementById('catsplash');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'catsplash';
  wrap.setAttribute('data-notheme', '1');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', o.title || 'Super Feline Mode');
  const cv = document.createElement('canvas');
  wrap.appendChild(cv);
  const card = document.createElement('div');
  card.className = 'cs-card';
  const h = document.createElement('h1');
  let li = 0;
  for (const word of (o.title || 'SUPER FELINE MODE').split(' ')) {
    const wd = document.createElement('span');
    wd.className = 'cs-word';
    for (const ch of word) {
      const sp = document.createElement('span');
      sp.textContent = ch;
      sp.style.animationDelay = li++ * 0.06 + 's';
      wd.appendChild(sp);
    }
    h.appendChild(wd);
    h.appendChild(document.createTextNode(' '));
  }
  const p = document.createElement('p');
  p.textContent = o.sub || 'Everything is cats now.';
  const tap = document.createElement('p');
  tap.className = 'cs-tap';
  tap.textContent = 'Tap to pounce';
  card.append(h, p, tap);
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  const c = cv.getContext('2d');
  let W = 0,
    H = 0,
    dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
  };
  size();
  window.addEventListener('resize', size);
  const rnd = Math.random,
    pick = (l) => l[Math.floor(rnd() * l.length)];
  const kinds = ['cat', 'cat', 'cat', 'hero', 'hero', 'yarn', 'fish', 'mouse', 'feather', 'laser', 'emoji', 'emoji'];
  const spawn = (fromEdge) => {
    const k = pick(kinds),
      s = Math.min(W, H) * (0.04 + rnd() * 0.07) * (k === 'hero' ? 1.1 : 1),
      ang = rnd() * Math.PI * 2,
      sp = Math.min(W, H) * (0.25 + rnd() * 0.5);
    let x = rnd() * W,
      y = rnd() * H;
    if (fromEdge) {
      const e = Math.floor(rnd() * 4);
      x = e === 0 ? -s * 3 : e === 1 ? W + s * 3 : rnd() * W;
      y = e === 2 ? -s * 3 : e === 3 ? H + s * 3 : rnd() * H;
    }
    const tx = W * (0.2 + rnd() * 0.6),
      ty = H * (0.2 + rnd() * 0.6),
      d = Math.hypot(tx - x, ty - y) || 1;
    return {
      k,
      x,
      y,
      vx: fromEdge ? ((tx - x) / d) * sp : Math.cos(ang) * sp,
      vy: fromEdge ? ((ty - y) / d) * sp : Math.sin(ang) * sp,
      rot: rnd() * 6,
      spin: (rnd() - 0.5) * (k === 'hero' ? 0.6 : 5),
      size: s,
      seed: rnd() * 10,
      coat: pick(COATS),
      eye: pick(EYES),
      cape: pick(CAPES),
      color: pick(['#ff5a8a', '#5ab0ff', '#ffd23a', '#8af06a', '#c07aff', '#ff8a3a', '#f0f0f0']),
      hat: pick(['crown', 'bow', 'bell', null, null]),
      shades: rnd() < 0.15,
      body: k === 'hero',
      glyph: pick(EMOJI),
      life: 0,
    };
  };
  const things = [];
  const N = Math.round(Math.min(70, 30 + (W * H) / 25000));
  for (let i = 0; i < N; i++) things.push(spawn(i % 3 !== 0));
  const paws = [];
  let t = 0,
    last = performance.now(),
    done = false,
    raf = 0;
  const ms = o.ms || 7000,
    stillMode = still();
  function frame(now) {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // a sunburst behind it all, turning
    const cx = W / 2,
      cy = H / 2,
      R0 = Math.hypot(W, H);
    c.fillStyle = '#ff9ec7';
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = i % 2 ? '#ffd1e6' : '#ffb2d4';
      c.beginPath();
      c.moveTo(cx, cy);
      const a = t * 0.25 + (i / 18) * Math.PI * 2;
      c.arc(cx, cy, R0, a, a + Math.PI / 18);
      c.fill();
    }
    // paw prints raining down, fading
    if (rnd() < dt * 18) paws.push({ x: rnd() * W, y: -20, r: 8 + rnd() * 14, rot: (rnd() - 0.5) * 0.8, v: 60 + rnd() * 120 });
    for (let i = paws.length - 1; i >= 0; i--) {
      const q = paws[i];
      q.y += q.v * dt;
      paw(c, q.x, q.y, q.r, q.rot, 'rgba(150,40,90,0.35)');
      if (q.y > H + 30) paws.splice(i, 1);
    }
    for (const o2 of things) {
      o2.life += dt;
      o2.x += o2.vx * dt;
      o2.y += o2.vy * dt;
      o2.rot += o2.spin * dt;
      if (o2.k === 'hero') o2.rot = Math.atan2(o2.vy, o2.vx) * 0.3 + Math.sin(t * 2 + o2.seed) * 0.1;
      // bounce off the sides now and then, so the screen stays busy
      const m = o2.size * 4;
      if (o2.x < -m || o2.x > W + m || o2.y < -m || o2.y > H + m) Object.assign(o2, spawn(true));
      if (o2.k === 'cat' || o2.k === 'hero') cat(c, o2, t);
      else if (o2.k === 'yarn') yarn(c, o2, t);
      else if (o2.k === 'fish') fish(c, o2);
      else if (o2.k === 'mouse') mouse(c, o2, t);
      else if (o2.k === 'feather') feather(c, o2, t);
      else if (o2.k === 'laser') {
        o2.vx += Math.sin(t * 7 + o2.seed) * 900 * dt;
        o2.vy += Math.cos(t * 5 + o2.seed) * 900 * dt;
        laser(c, o2, t);
      } else {
        c.save();
        c.translate(o2.x, o2.y);
        c.rotate(o2.rot);
        c.font = Math.round(o2.size * 1.4) + 'px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(o2.glyph, 0, 0);
        c.restore();
      }
    }
    if (stillMode) return;
    if (t * 1000 > ms) close();
    else raf = requestAnimationFrame(frame);
  }
  function close() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', size);
    wrap.classList.add('cs-out');
    setTimeout(() => wrap.remove(), 450);
    if (o.onDone) o.onDone();
  }
  wrap.addEventListener('click', close);
  wrap.addEventListener('touchend', (e) => {
    e.preventDefault();
    close();
  });
  if (stillMode) {
    // one still picture of the party instead of the animation
    t = 1;
    frame(performance.now());
  } else raf = requestAnimationFrame(frame);
  return close;
}
export { catSplash, paw as drawPaw };
