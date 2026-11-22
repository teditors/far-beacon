/* Sound and music (commission 5), made in the browser with the Web Audio API: no sound files.
   - The score (commission 7): every kind of place has a tune of its own, composed bar by bar by score.js from a theme
     rolled from the place's key (content/music.js): Baroque dances on a harpsichord in towns and halls, slow airs over
     washes of sound on the land by climate and hour, below ground, in the sky, at sea, beyond a door, in a fight.
     Short pieces mark a discovery, a win and a death. A change of place crossfades over a few seconds.
   - The world: wind (stronger high up and in storms), rain and hail, running water near a river or spring, the bustle
     of a town, a crackling fire by your camp, footsteps that sound like the ground underfoot (grass, sand, snow, stone,
     wood, water), creatures' calls, blows given and taken, and a soft click on every button.
   Sound starts only after the player's first tap or key (phones demand it), stops when the page is hidden, and is one
   look switch ('sound') with music and effects volumes and a mute in Menu, Settings. It costs a few oscillators and
   filtered noise at any one time. */
import { P, R, V } from './ctx.js';
import { LOOK_CHANGED, LOOK_SWITCHES, SET, lookOn, saveSettings } from './quality.js';
import { eventPiece, makeTune, nextBar } from './score.js';

LOOK_SWITCHES.push(['sound', 'Sound and music']);
if (SET.music === undefined) SET.music = 0.55;
if (SET.sfx === undefined) SET.sfx = 0.8;

let A = null, // the audio context, made on the first tap
  master,
  musicBus,
  sfxBus,
  verb,
  NOISE;
const on = () => lookOn('sound') && !SET.mute;

function start() {
  if (A) {
    if (A.state === 'suspended' && !document.hidden) A.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !on()) return;
  A = new AC();
  master = A.createGain();
  master.gain.value = 0.9;
  master.connect(A.destination);
  musicBus = A.createGain();
  sfxBus = A.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  // a hall made of noise: the score and distant sounds sit in it
  verb = A.createConvolver();
  const len = Math.floor(A.sampleRate * 2.6),
    ir = A.createBuffer(2, len, A.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  verb.buffer = ir;
  const wet = A.createGain();
  wet.gain.value = 0.55;
  verb.connect(wet);
  wet.connect(musicBus);
  NOISE = A.createBuffer(1, A.sampleRate * 2, A.sampleRate);
  const nd = NOISE.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  makeAmbience();
  volumes();
}
function volumes() {
  if (!A) return;
  const t = A.currentTime;
  musicBus.gain.setTargetAtTime(on() ? SET.music * 0.5 : 0, t, 0.3);
  sfxBus.gain.setTargetAtTime(on() ? SET.sfx : 0, t, 0.1);
}
['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, start, { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!A) return;
  if (document.hidden) A.suspend();
  else if (on()) A.resume();
});
LOOK_CHANGED.push((id) => {
  if (id !== 'sound') return;
  if (on()) start();
  volumes();
});
function setVolume(kind, v) {
  if (kind === 'mute') SET.mute = !!v;
  else SET[kind] = v;
  saveSettings();
  if (on()) start();
  volumes();
}

/* ---------- small instruments ---------- */
const env = (g, t, a, peak, d) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// a bell: a sine and an inharmonic partial, ringing out
function bell(t, m, vel, out) {
  for (const [mul, k] of [
    [1, 1],
    [2.76, 0.3],
    [5.4, 0.08],
  ]) {
    const o = A.createOscillator(),
      g = A.createGain();
    o.frequency.value = mtof(m) * mul;
    env(g, t, 0.005, vel * k, 2.8 / mul);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 3.2);
  }
}
// a plucked string: a triangle through a closing lowpass
function pluck(t, m, vel, out) {
  const o = A.createOscillator(),
    f = A.createBiquadFilter(),
    g = A.createGain();
  o.type = 'triangle';
  o.frequency.value = mtof(m);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(mtof(m) * 6, t);
  f.frequency.exponentialRampToValueAtTime(mtof(m) * 1.2, t + 0.6);
  env(g, t, 0.004, vel, 1.1);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + 1.3);
}
// a soft pad: two detuned waves, slow in and out
function pad(t, m, vel, dur, out, wave) {
  const f = A.createBiquadFilter(),
    g = A.createGain();
  f.type = 'lowpass';
  f.frequency.value = Math.min(2400, mtof(m) * 3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const det of [-7, 6]) {
    const o = A.createOscillator();
    o.type = wave || 'triangle';
    o.frequency.value = mtof(m);
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  f.connect(g).connect(out);
}
// a drum: a falling sine and a breath of noise
function drum(t, vel, out, pitch) {
  const o = A.createOscillator(),
    g = A.createGain();
  o.frequency.setValueAtTime(pitch || 110, t);
  o.frequency.exponentialRampToValueAtTime((pitch || 110) * 0.45, t + 0.25);
  env(g, t, 0.003, vel, 0.35);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.5);
  noiseHit(t, vel * 0.25, 900, 0.08, out);
}
function noiseHit(t, vel, freq, dur, out, type, q) {
  const s = A.createBufferSource(),
    f = A.createBiquadFilter(),
    g = A.createGain();
  s.buffer = NOISE;
  f.type = type || 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q || 1;
  env(g, t, 0.004, vel, dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}

/* ---------- the score (commission 7: a tune for every place, composed by score.js) ---------- */
// The harpsichord: one oscillator with the spectrum of a string plucked near its end (strong upper partials, the ones
// at multiples of the pluck point missing), through a filter that closes as the note dies, and a quill's click.
let HARP = null;
function harpWave() {
  if (HARP) return HARP;
  const n = 32,
    re = new Float32Array(n),
    im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (Math.abs(Math.sin(k * Math.PI * 0.13)) / k) * (k < 3 ? 1 : 1.3);
  return (HARP = A.createPeriodicWave(re, im));
}
function harpsichord(t, m, vel, dur, out) {
  const o = A.createOscillator(),
    f = A.createBiquadFilter(),
    g = A.createGain(),
    fr = mtof(m),
    ring = 0.25 + Math.max(0, 84 - m) * 0.018; // low strings ring longer
  o.setPeriodicWave(harpWave());
  o.frequency.value = fr;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(Math.min(14000, fr * 12), t);
  f.frequency.setTargetAtTime(fr * 2.5, t + 0.01, ring * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.003);
  g.gain.setTargetAtTime(0.0001, t + 0.004, ring);
  g.gain.setTargetAtTime(0.0001, t + Math.max(0.05, dur), 0.03); // the damper falls when the key is let go
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + Math.min(dur + 0.25, ring * 5));
}
// the organ of a temple or a crypt: two soft pipes, an octave apart, slow to speak
function organ(t, m, vel, dur, out) {
  const g = A.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.7, t + 0.06);
  g.gain.setValueAtTime(vel * 0.7, t + Math.max(0.07, dur - 0.05));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.15);
  for (const [mul, type, k] of [
    [1, 'sine', 1],
    [2, 'triangle', 0.35],
  ]) {
    const o = A.createOscillator(),
      og = A.createGain();
    o.type = type;
    o.frequency.value = mtof(m) * mul;
    og.gain.value = k;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
  g.connect(out);
}
// a wooden pipe (a recorder's breath): a sine that wavers a little, soft in and out
function pipe(t, m, vel, dur, out) {
  const o = A.createOscillator(),
    lfo = A.createOscillator(),
    lg = A.createGain(),
    g = A.createGain();
  o.frequency.value = mtof(m);
  lfo.frequency.value = 5.2;
  lg.gain.value = mtof(m) * 0.006;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.8, t + 0.07);
  g.gain.setTargetAtTime(0.0001, t + Math.max(0.1, dur * 0.9), 0.08);
  o.connect(g).connect(out);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.5);
  lfo.stop(t + dur + 0.5);
}
// Play one note of the score: its voice, and a trill (fast turns with the note above) or a turn when it has one.
function playNote(n, t, dur, out) {
  const voice = n.voice,
    one = (tt, m, v, d) => {
      if (voice === 'harpsichord' || voice === 'bass') harpsichord(tt, m, v * (voice === 'bass' ? 0.9 : 1), d, out);
      else if (voice === 'lute') pluck(tt, m, v, out);
      else if (voice === 'organ') organ(tt, m, v * 0.8, d, out);
      else if (voice === 'pipe') pipe(tt, m, v, d, out);
      else if (voice === 'pad') pad(tt, m, v * 0.4, Math.max(1, d), out, 'sine');
      else if (voice === 'drone') pad(tt, m, v, Math.max(1, d), out, 'sine');
      else bell(tt, m, v * 0.6, out);
    };
  if (n.trill && dur > 0.3 && voice !== 'bell' && voice !== 'organ') {
    const s = 0.07,
      k = Math.min(8, Math.floor((dur * 0.6) / s));
    for (let i = 0; i < k; i++) one(t + i * s, i % 2 ? n.m : n.m + 2, n.v * 0.8, s);
    one(t + k * s, n.m, n.v, dur - k * s);
  } else if (n.turn && dur > 0.4 && voice !== 'bell' && voice !== 'organ') {
    const s = 0.08;
    [n.m + 2, n.m, n.m - 1].forEach((m, i) => one(t + i * s, m, n.v * 0.8, s));
    one(t + 3 * s, n.m, n.v, dur - 3 * s);
  } else one(t, n.m, n.v, dur);
}
/* Where the traveller is, as a key into content/music.js's places: the fight, the level, the town, the land by its
   climate and the hour. Interiors and other pieces add their own (KEYS: functions (S, rec) -> key or null). */
const KEYS = [];
function placeKey() {
  const S = V.S;
  if (!S) return 'land';
  if (S.combat) {
    const foe = S.creatures.find((c) => c.id === S.combat.cid);
    return foe && (foe.lair || foe.boss || foe.named) ? 'fight:boss' : 'fight';
  }
  const rec = R.areaRec(S);
  for (const f of KEYS) {
    const k = f(S, rec);
    if (k) return k;
  }
  if (rec.kind === 'deep') return 'deep:' + rec.theme;
  if (rec.kind === 'vault') return 'vault';
  if (rec.kind === 'sky') return 'sky:' + rec.place;
  if (rec.kind === 'sea') return 'sea:' + rec.place;
  if (R.levelLook(S)) return 'deep';
  if (rec.kind === 'town') {
    const t = R.curTown(S),
      cul = t === S.town ? S.townCulture : t && t.culture;
    return 'town:' + ((cul && cul.rare) || (t && t.size) || 'town');
  }
  if (R.aloft && R.aloft(S)) return 'sky';
  if (S.weather.storm) return 'storm';
  if (S.player.swims || S.terrain[S.player.y * R.W + S.player.x] === R.DEEP) return 'sea';
  if (S.realm) return 'elsewhere:' + S.realm;
  if (S.curses && S.curses[R.outdoorRec(S).id]) return 'blight';
  const b = R.biomeOf(S),
    climate = (b.parts && b.parts.climate) || { salt: 'hot', taiga: 'cold', moor: 'wet' }[b.id] || 'temperate',
    h = R.clock(S).hour;
  return 'land:' + climate + ':' + (h >= 20 || h < 5 ? 'night' : 'day') + ':' + b.id;
}
const M = { key: null, tune: null, next: 0, gain: null, duck: 0 };
function music(now) {
  const key = placeKey(),
    X = R.C.music;
  if (key !== M.key) {
    // a new tune for the new place, the old one fading out under it
    const old = M.gain;
    if (old) {
      old.gain.setTargetAtTime(0, now, 1.2);
      setTimeout(() => old.disconnect(), 6000);
    }
    M.gain = A.createGain();
    M.gain.gain.setValueAtTime(0.0001, now);
    M.gain.gain.setTargetAtTime(1, now, 1.5);
    M.gain.connect(musicBus);
    M.gain.connect(verb);
    M.key = key;
    M.tune = makeTune(X, key, Math.floor(Math.random() * 1e9));
    M.next = Math.max(M.next, now + 0.1);
  }
  const tu = M.tune,
    pl = tu.place,
    out = M.gain;
  // schedule a bar ahead at a time
  while (M.next < now + 0.6) {
    const t = M.next,
      bar = nextBar(tu),
      len = bar.beats * bar.spb;
    for (const n of bar.notes) playNote(n, t + n.t * bar.spb, n.d * bar.spb, out);
    // the old washes under the land's airs: a drone on the key note, a pad on the bar's chord
    if (pl.drone && tu.bar % 2 === 1) pad(t, bar.chord[0] - 12, 0.045, len * 2.1, out, 'sine');
    if (pl.pad && tu.bar % 2 === 0) for (const m of bar.chord) pad(t, m, 0.024, len * 1.9, out, 'triangle');
    if (pl.drums)
      for (let i = 0; i < bar.beats; i++)
        if (i !== 3 || Math.random() < 0.5) drum(t + i * bar.spb, i === 0 ? 0.3 : 0.18, out, i === 0 ? 90 : 120);
    M.next += len;
  }
}
// A short piece for an event, over the score (which bows out under it for a moment).
let lastEvent = 0;
function eventMusic(kind) {
  if (!A || !on() || A.state !== 'running') return;
  const now = A.currentTime;
  if (kind === 'discovery' && now - lastEvent < 4) return; // not a fanfare for every step
  lastEvent = now;
  const notes = eventPiece(R.C.music, kind, Math.floor(Math.random() * 1e9)),
    g = A.createGain(),
    end = notes.reduce((a, n) => Math.max(a, n.t + n.d), 0);
  g.gain.value = 1;
  g.connect(musicBus);
  g.connect(verb);
  for (const n of notes) playNote(n, now + 0.05 + n.t, n.d, g);
  setTimeout(() => g.disconnect(), (end + 4) * 1000);
  if (M.gain) {
    M.gain.gain.setTargetAtTime(kind === 'discovery' ? 0.45 : 0.1, now, 0.15);
    M.gain.gain.setTargetAtTime(1, now + end, 1.2);
  }
}
R.on('learned', () => eventMusic('discovery'));
R.on('plotDone', () => eventMusic('discovery'));

/* ---------- the world ---------- */
const AMB = {};
function loopNoise(type, freq, q) {
  const s = A.createBufferSource(),
    f = A.createBiquadFilter(),
    g = A.createGain();
  s.buffer = NOISE;
  s.loop = true;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q || 0.7;
  g.gain.value = 0;
  s.connect(f).connect(g).connect(sfxBus);
  s.start();
  return { f, g };
}
function makeAmbience() {
  AMB.wind = loopNoise('bandpass', 500, 0.6);
  AMB.rain = loopNoise('highpass', 2500, 0.5);
  AMB.water = loopNoise('bandpass', 1100, 1.2);
  AMB.bustle = loopNoise('bandpass', 380, 1.5);
}
const level = (n, v, k) => n.g.gain.setTargetAtTime(v, A.currentTime, k || 0.6);
// is there running water near the traveller (a river tile or a spring within a couple of tiles)?
function waterNear(S) {
  if (R.levelLook(S)) return 0;
  const { x, y } = S.player;
  let best = 0;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= R.W || yy >= R.H) continue;
      const i = yy * R.W + xx,
        st = S.sites[i];
      if (S.terrain[i] === 4 || (st && (st.kind === 'spring' || st.kind === 'pool' || st.kind === 'well')))
        best = Math.max(best, 1 - Math.hypot(dx, dy) / 3);
    }
  return best;
}
let gust = 0,
  lastWalk = 0,
  nextCall = 0,
  nextClink = 0,
  nextCrackle = 0;
const seen = { hp: null, chp: null, combat: false };
function world(now, dt) {
  const S = V.S,
    look = R.levelLook(S),
    rec = R.areaRec(S),
    under = look && !look.void,
    storm = S.weather.storm ? R.stormOfNow(S) : null,
    stormName = storm ? (storm.name || '').toLowerCase() : '',
    up = R.aloft && R.aloft(S);
  // wind: always a little outdoors, gusting; more aloft and in a storm; little below ground
  gust += dt * 0.3;
  const w = under ? 0.01 : (0.035 + 0.025 * Math.sin(gust) * Math.sin(gust * 0.37)) * (storm ? 3 : 1) * (up ? 2.2 : 1);
  level(AMB.wind, w, 1);
  AMB.wind.f.frequency.setTargetAtTime(380 + 260 * (0.5 + 0.5 * Math.sin(gust * 0.7)) + (up ? 300 : 0), now, 1);
  // rain and hail on the land; nothing indoors but a hush
  const wet = storm && !under && /rain|hail|storm|sleet/.test(stormName) && !/dust|sand|ash/.test(stormName);
  level(AMB.rain, wet ? (rec.kind === 'town' ? 0.05 : 0.08) : 0, 1.2);
  level(AMB.water, waterNear(S) * 0.06, 0.8);
  level(AMB.bustle, rec.kind === 'town' ? 0.045 + 0.02 * Math.sin(now * 0.5) : 0, 1);
  // the town: now and then a hammer, a cart, a voice-like murmur
  if (rec.kind === 'town' && now > nextClink) {
    nextClink = now + 1.5 + Math.random() * 4;
    if (Math.random() < 0.5) noiseHit(now, 0.05, 2400 + Math.random() * 1200, 0.12, sfxBus, 'bandpass', 8);
    else pluck(now, 72 + Math.floor(Math.random() * 5) * 2, 0.02, sfxBus);
  }
  // a fire crackles at your camp
  const camp =
    S.camp &&
    S.camp.area === S.area &&
    Math.abs((S.camp.i % R.W) - S.player.x) + Math.abs(Math.floor(S.camp.i / R.W) - S.player.y) <= 1;
  if (camp && now > nextCrackle) {
    nextCrackle = now + 0.05 + Math.random() * 0.4;
    noiseHit(now, 0.03 + Math.random() * 0.05, 1800 + Math.random() * 3000, 0.03, sfxBus, 'highpass');
  }
  // footsteps, a stride apart, sounding like the ground
  const stride = 1.7;
  if (P.walked - lastWalk > stride) {
    lastWalk = P.walked;
    step(now, S, look);
  } else if (P.walked < lastWalk) lastWalk = P.walked;
  // creatures call now and then when near
  if (now > nextCall) {
    nextCall = now + 6 + Math.random() * 10;
    const c = S.creatures.find((c) => Math.abs(c.x - S.player.x) + Math.abs(c.y - S.player.y) <= 4 && !c.bound);
    if (c) call(now, R.spOf(S, c).form, 0.08);
  }
  // a fight: the blows, the hurts, the creature's cry when it begins
  const cbt = S.combat,
    foe = cbt && S.creatures.find((c) => c.id === cbt.cid);
  if (cbt && !seen.combat && foe) call(now, R.spOf(S, foe).form, 0.18);
  seen.combat = !!cbt;
  if (seen.hp !== null && S.player.hp < seen.hp) hurt(now);
  seen.hp = S.player.hp;
  const chp = foe ? foe.hp : null;
  if (seen.chp !== null && chp !== null && chp < seen.chp) blow(now);
  seen.chp = chp;
}
function step(t, S, look) {
  const ti = S.player.y * R.W + S.player.x,
    ter = S.terrain[ti],
    b = R.biomeOf(S),
    climate = (b.parts && b.parts.climate) || { salt: 'hot', taiga: 'cold', moor: 'wet' }[b.id] || 'temperate',
    kind = R.areaRec(S).kind;
  let ground = 'grass';
  if (look) ground = look.kit === 'planks' ? 'wood' : look.void && !look.kit ? 'grass' : 'stone';
  else if (kind === 'town') ground = 'stone';
  else if (ter === 4 || ter === R.DEEP) ground = 'water';
  else if (climate === 'cold') ground = 'snow';
  else if (climate === 'hot' || climate === 'ashen' || climate === 'steppe') ground = 'sand';
  else if (ter === 2) ground = 'stone';
  const v = 0.05 + Math.random() * 0.02;
  if (ground === 'grass') noiseHit(t, v, 500 + Math.random() * 200, 0.09, sfxBus, 'lowpass');
  else if (ground === 'sand') noiseHit(t, v, 2200 + Math.random() * 800, 0.1, sfxBus, 'bandpass', 0.8);
  else if (ground === 'snow') {
    noiseHit(t, v, 1500, 0.13, sfxBus, 'bandpass', 2);
    noiseHit(t + 0.03, v * 0.6, 3500, 0.06, sfxBus, 'highpass');
  } else if (ground === 'water') noiseHit(t, v * 1.3, 900 + Math.random() * 400, 0.18, sfxBus, 'bandpass', 3);
  else if (ground === 'wood') drum(t, v * 0.8, sfxBus, 180 + Math.random() * 30);
  else noiseHit(t, v * 1.1, 3000 + Math.random() * 1500, 0.04, sfxBus, 'bandpass', 4);
}
// a creature's voice, by form: a hound's howl, a brute's grunt, a wight's moan, a serpent's hiss
function call(t, form, vel) {
  if (form === 'serpent') return noiseHit(t, vel * 0.8, 5000, 0.9, sfxBus, 'highpass');
  const o = A.createOscillator(),
    f = A.createBiquadFilter(),
    g = A.createGain(),
    [a, b, dur, type] =
      form === 'hound' ? [440, 700, 1.4, 'sawtooth'] : form === 'brute' ? [90, 60, 0.7, 'sawtooth'] : [220, 180, 2.2, 'sine'];
  o.type = type;
  o.frequency.setValueAtTime(a, t);
  o.frequency.linearRampToValueAtTime(b, t + dur * 0.4);
  o.frequency.linearRampToValueAtTime(a * 0.8, t + dur);
  f.type = 'lowpass';
  f.frequency.value = form === 'brute' ? 500 : 1400;
  env(g, t, dur * 0.25, vel, dur * 0.75);
  o.connect(f).connect(g).connect(sfxBus);
  g.connect(verb);
  o.start(t);
  o.stop(t + dur + 0.1);
}
const blow = (t) => (noiseHit(t, 0.35, 700, 0.12, sfxBus, 'lowpass'), drum(t, 0.3, sfxBus, 70));
const hurt = (t) => (noiseHit(t, 0.3, 400, 0.2, sfxBus, 'lowpass'), pluck(t, 40, 0.15, sfxBus));
// a swish for a blow that misses, from the action itself
R.on('did', (s, d) => {
  if (!A || !on()) return;
  const t = A.currentTime;
  if (d.id === 'attack') noiseHit(t, 0.12, 1600, 0.18, sfxBus, 'bandpass', 0.7);
  else if (d.id === 'drink' || d.id === 'fill' || d.id === 'fillWater') noiseHit(t, 0.08, 900, 0.4, sfxBus, 'bandpass', 4);
});
R.on('killed', () => {
  if (!A || !on()) return;
  const t = A.currentTime;
  for (const [i, m] of [67, 71, 74].entries()) bell(t + i * 0.12, m, 0.06, sfxBus);
});
// a soft click on every button
document.addEventListener('click', (e) => {
  if (!A || !on() || !(e.target && e.target.closest && e.target.closest('button'))) return;
  const t = A.currentTime,
    o = A.createOscillator(),
    g = A.createGain();
  o.frequency.setValueAtTime(1300, t);
  o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
  env(g, t, 0.002, 0.05, 0.06);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + 0.1);
});

// every frame, from the frame loop
let lastUpdate = 0;
function updateSound(dt) {
  if (!A || !V.S || A.state !== 'running') return;
  if (!on()) return;
  const now = A.currentTime;
  if (now - lastUpdate < 0.1) return; // ten times a second is plenty
  lastUpdate = now;
  music(now);
  world(now, 0.1);
  // the end of a run: a full close for a win, a lament for a death
  const over = V.S.over ? (V.S.over.won ? 'win' : 'death') : null;
  if (over && over !== seen.over) eventMusic(over);
  seen.over = over;
}
// for the tests: how loud the sound is now (the peak and the mean of the last few hundredths of a second)
let METER = null;
function soundLevel() {
  if (!A) return null;
  if (!METER) {
    METER = A.createAnalyser();
    METER.fftSize = 2048;
    master.connect(METER);
  }
  const d = new Float32Array(METER.fftSize);
  METER.getFloatTimeDomainData(d);
  let peak = 0,
    sum = 0;
  for (const x of d) (peak = Math.max(peak, Math.abs(x))), (sum += x * x);
  return { peak, rms: Math.sqrt(sum / d.length) };
}
const soundState = () => ({ running: !!A && A.state === 'running', mood: M.key, level: soundLevel() });
export { updateSound, setVolume, soundState, KEYS as MUSIC_KEYS, eventMusic };
