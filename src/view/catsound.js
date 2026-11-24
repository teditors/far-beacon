/* The cat voices of Super Feline Mode (commission 9), made with the Web Audio API like every other sound (sound.js):
   - meow: a buzzy voice through two formant filters that open "m-e" and close "-ow", gliding up and back down, at
     the note's pitch; a short note is a "mew", a very short one a chirp;
   - mrrow: a meow an octave down with a rolled start (for the bass);
   - trill: the rolling "brrrp" a cat greets you with: a sine, its loudness shaken thirty times a second;
   - purr: a low rumble, noise and a low wave pulsed at about 25 a second, for pads, drones and naps;
   - hiss: filtered noise with a sharp start, for danger;
   - woof, vacuum, spray, squeak: the foes' voices.
   Which instrument of the score becomes which voice is content (content/feline.js, `sounds`). */
let A = null,
  NOISE = null;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// sound.js hands over its audio context and noise once they exist
function useAudio(ctx, noise) {
  A = ctx;
  NOISE = noise;
}
function voice(t, f0, vel, dur, out, shape) {
  const o = A.createOscillator(),
    f1 = A.createBiquadFilter(),
    f2 = A.createBiquadFilter(),
    g = A.createGain(),
    mix = A.createGain();
  o.type = 'sawtooth';
  const up = shape.up || 1.12,
    down = shape.down || 0.78;
  o.frequency.setValueAtTime(f0 * 0.92, t);
  o.frequency.linearRampToValueAtTime(f0 * up, t + dur * 0.35);
  o.frequency.linearRampToValueAtTime(f0 * down, t + dur);
  // formants: "m" (closed) to "e" (open) to "ow" (rounded)
  f1.type = f2.type = 'bandpass';
  f1.Q.value = 5;
  f2.Q.value = 7;
  f1.frequency.setValueAtTime(350, t);
  f1.frequency.linearRampToValueAtTime(shape.open || 900, t + dur * 0.3);
  f1.frequency.linearRampToValueAtTime(600, t + dur);
  f2.frequency.setValueAtTime(1200, t);
  f2.frequency.linearRampToValueAtTime(shape.bright || 2400, t + dur * 0.3);
  f2.frequency.linearRampToValueAtTime(900, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + Math.min(0.05, dur * 0.2));
  g.gain.setTargetAtTime(vel * 0.7, t + dur * 0.3, dur * 0.3);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.05);
  o.connect(f1);
  o.connect(f2);
  f1.connect(mix);
  f2.connect(mix);
  mix.gain.value = 2.2;
  mix.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.4);
}
// a meow at a note (MIDI number m); short notes are mews and chirps
function meow(t, m, vel, dur, out) {
  const d = Math.max(0.12, Math.min(1.2, dur));
  if (d < 0.18) return voice(t, mtof(m + 12), vel * 0.8, d, out, { up: 1.35, down: 1.2, open: 1100, bright: 3000 }); // chirp
  if (d < 0.35) return voice(t, mtof(m + 12), vel, d, out, { up: 1.18, down: 0.9, open: 1000, bright: 2800 }); // mew
  voice(t, mtof(m + 12), vel, d, out, { up: 1.12, down: 0.72 });
}
function mrrow(t, m, vel, dur, out) {
  const d = Math.max(0.2, Math.min(1.4, dur));
  trill(t, m, vel * 0.5, 0.12, out);
  voice(t + 0.08, mtof(m), vel, d, out, { up: 1.08, down: 0.8, open: 700, bright: 1800 });
}
function trill(t, m, vel, dur, out) {
  const o = A.createOscillator(),
    am = A.createOscillator(),
    ag = A.createGain(),
    g = A.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(mtof(m + 12) * 0.9, t);
  o.frequency.linearRampToValueAtTime(mtof(m + 12) * 1.15, t + dur);
  am.frequency.value = 30;
  ag.gain.value = vel * 0.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.03);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
  am.connect(ag).connect(g.gain);
  o.connect(g).connect(out);
  o.start(t);
  am.start(t);
  o.stop(t + dur + 0.3);
  am.stop(t + dur + 0.3);
}
function purr(t, m, vel, dur, out) {
  const d = Math.max(0.6, dur),
    s = A.createBufferSource(),
    f = A.createBiquadFilter(),
    o = A.createOscillator(),
    am = A.createOscillator(),
    ag = A.createGain(),
    g = A.createGain();
  s.buffer = NOISE;
  s.loop = true;
  f.type = 'lowpass';
  f.frequency.value = 220;
  o.type = 'sawtooth';
  o.frequency.value = m ? Math.max(40, Math.min(110, mtof(m) / 2)) : 55;
  am.frequency.value = 24 + Math.random() * 3;
  ag.gain.value = vel * 0.6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.6, t + d * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + d);
  am.connect(ag).connect(g.gain);
  s.connect(f);
  o.connect(f);
  f.connect(g).connect(out);
  s.start(t, Math.random());
  o.start(t);
  am.start(t);
  for (const x of [s, o, am]) x.stop(t + d + 0.1);
}
function noise(t, vel, freq, dur, out, type, attack) {
  const s = A.createBufferSource(),
    f = A.createBiquadFilter(),
    g = A.createGain();
  s.buffer = NOISE;
  f.type = type || 'highpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + (attack || 0.01));
  g.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.2);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random());
  s.stop(t + dur + 0.2);
  return f;
}
const hiss = (t, vel, out) => noise(t, vel, 3500, 0.9, out, 'highpass', 0.015);
function woof(t, vel, out) {
  for (const dt of [0, 0.32]) {
    const o = A.createOscillator(),
      f = A.createBiquadFilter(),
      g = A.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(260, t + dt);
    o.frequency.exponentialRampToValueAtTime(120, t + dt + 0.18);
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.linearRampToValueAtTime(vel, t + dt + 0.01);
    g.gain.setTargetAtTime(0.0001, t + dt + 0.1, 0.04);
    o.connect(f).connect(g).connect(out);
    o.start(t + dt);
    o.stop(t + dt + 0.4);
    noise(t + dt, vel * 0.4, 700, 0.12, out, 'bandpass');
  }
}
function vacuum(t, vel, out) {
  // a motor winding up: noise through a rising band, and a whine
  const f = noise(t, vel * 0.9, 300, 2.2, out, 'bandpass', 0.3);
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(1800, t + 1.5);
  const o = A.createOscillator(),
    g = A.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 1.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.15, t + 0.4);
  g.gain.setTargetAtTime(0.0001, t + 1.8, 0.2);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 2.5);
}
const spray = (t, vel, out) => (noise(t, vel, 5000, 0.18, out), noise(t + 0.25, vel, 5000, 0.18, out));
function squeak(t, vel, out) {
  const o = A.createOscillator(),
    g = A.createGain();
  o.frequency.setValueAtTime(1800, t);
  o.frequency.exponentialRampToValueAtTime(2600, t + 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel * 0.3, t + 0.01);
  g.gain.setTargetAtTime(0.0001, t + 0.08, 0.03);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.3);
}
// Play a cat voice by name (from content's sound bank); false if the name is not a cat voice.
function catVoice(name, t, m, vel, dur, out) {
  if (!A) return false;
  if (name === 'meow') meow(t, m, vel, dur, out);
  else if (name === 'mrrow') mrrow(t, m, vel, dur, out);
  else if (name === 'trill') trill(t, m, vel, Math.max(0.15, Math.min(0.6, dur)), out);
  else if (name === 'purr') purr(t, m, vel, dur, out);
  else return false;
  return true;
}
// A sound of the world by name: hiss, woof, vacuum, spray, squeak, purr, trill, meow, chirp.
function catSound(name, t, vel, out) {
  if (!A) return false;
  if (name === 'hiss') hiss(t, vel, out);
  else if (name === 'woof') woof(t, vel, out);
  else if (name === 'vacuum') vacuum(t, vel, out);
  else if (name === 'spray') spray(t, vel, out);
  else if (name === 'squeak') squeak(t, vel, out);
  else if (name === 'purr') purr(t, 0, vel, 2.6, out);
  else if (name === 'trill') trill(t, 72, vel, 0.35, out);
  else if (name === 'chirp') meow(t, 76, vel, 0.12, out);
  else if (name === 'meow') meow(t, 67, vel, 0.8, out);
  else return false;
  return true;
}
export { useAudio, catVoice, catSound };
