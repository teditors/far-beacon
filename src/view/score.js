/* The composer (commission 7): writes the score a bar at a time, as notes, from content/music.js. It makes no sound
   (sound.js plays the notes) and needs no screen, so it is tested in Node (tests/pieces.test.js).

   A place's tune is a theme rolled from the place's key: two bars of rhythm and melodic shape (a motif and its answer)
   and two chord progressions (an A and a B part of eight bars each). The tune is the theme stated over the A part's
   chords, carried through them in sequence (the motif's shape moved onto each chord, as Baroque music does), closing
   with a cadence; then the B part; then A again. Each time round it is varied: passing notes, an octave up, the shape
   turned upside down, trills and turns on long notes, a rest here and there. So the city's minuet is always the city's
   minuet, and never quite the same.
   Under the tune: a bass (a note a beat, a walking line, long notes, or a drone) and, where the place has it, an inner
   voice in thirds and sixths. Notes: { t, d } in beats from the bar's start, m (MIDI), v (0 to 1), voice. */

// small seeded dice
function dice(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h | 0;
};
// The place's entry: its own, or the nearest along its key ('town:city:salt' -> 'town:city' -> 'town').
function placeOf(X, key) {
  let k = key;
  while (k) {
    if (X.places[k]) return X.places[k];
    k = k.includes(':') ? k.slice(0, k.lastIndexOf(':')) : '';
  }
  return X.places.land;
}
// Chord progressions as scale degrees of each bar's chord: the A part ends on the home chord, the B part wanders
// (to the fifth, the relative, round the circle of fifths) and comes home.
const PROG_A = [
  [0, 3, 4, 4, 0, 3, 4, 0],
  [0, 4, 0, 4, 5, 3, 4, 0],
  [0, 5, 3, 4, 0, 5, 4, 0],
  [0, 0, 3, 4, 5, 1, 4, 0],
];
const PROG_B = [
  [4, 0, 4, 4, 5, 1, 4, 0],
  [5, 2, 5, 4, 3, 1, 4, 0],
  [3, 0, 3, 4, 2, 5, 4, 0],
  [0, 3, 6, 2, 5, 1, 4, 0], // round the circle of fifths
];
// A melodic shape over n notes, as degrees above the chord's root: begins on a chord tone, moves mostly by step.
function contour(r, n, start, down) {
  const out = [];
  let d = start;
  for (let i = 0; i < n; i++) {
    out.push(d);
    const x = r();
    d += x < 0.62 ? (down ? -1 : 1) * (x < 0.4 ? 1 : -1) : x < 0.8 ? (x < 0.71 ? 2 : -2) : x < 0.9 ? 0 : down ? -3 : 3;
    d = Math.max(-2, Math.min(7, d));
  }
  return out;
}
const notesIn = (cell) => cell.filter((u) => u > 0).length;
// The theme of a place: what makes its tune its own.
function themeOf(X, key) {
  const place = placeOf(X, key),
    dance = X.dances[place.dance] || X.dances.drift,
    r = dice(hash('theme:' + key)),
    pick = (a) => a[Math.floor(r() * a.length)],
    c1 = Math.floor(r() * dance.cells.length),
    c2 = (c1 + 1 + Math.floor(r() * (dance.cells.length - 1))) % dance.cells.length,
    c3 = Math.floor(r() * dance.cells.length),
    s1 = pick([0, 2, 4]),
    m1 = contour(r, notesIn(dance.cells[c1]), s1, false),
    m2 = contour(r, notesIn(dance.cells[c2]), Math.max(0, m1[m1.length - 1]), true),
    m3 = contour(r, notesIn(dance.cells[c3]), pick([2, 4]), r() < 0.5);
  return { key, place, dance, cells: [c1, c2, c3], shapes: [m1, m2, m3], A: pick(PROG_A), B: pick(PROG_B) };
}
// A tune being played: the theme and where it has got to.
function makeTune(X, key, seed) {
  const th = themeOf(X, key);
  return Object.assign(th, { bar: 0, r: dice(hash('play:' + key) ^ (seed | 0)), mode: X.modes[th.place.mode] || X.modes.ionian });
}
const deg2m = (mode, root, d, oct) => {
  const n = mode.length,
    k = ((d % n) + n) % n;
  return root + 12 * (oct || 0) + mode[k] + 12 * Math.floor(d / n);
};
/* The next bar of a tune: { beats, spb (seconds a beat), notes }. */
function nextBar(tu) {
  const { dance, place, mode } = tu,
    r = tu.r,
    root = place.root,
    bars = 16,
    i = tu.bar % bars,
    pass = Math.floor(tu.bar / bars),
    part = i < 8 ? tu.A : tu.B,
    b = i % 8,
    chord = part[b],
    next = part[(b + 1) % 8],
    sub = dance.sub,
    beats = dance.beats,
    units = beats * sub,
    density = place.density === undefined ? 1 : place.density,
    vary = (pass + (i < 8 ? 0 : 1)) % 4, // 0 plain, 1 passing notes, 2 an octave up, 3 the shape turned over
    notes = [],
    lead = place.voice,
    oct = vary === 2 && root < 70 ? 1 : 0;
  tu.bar++;
  // the tune: the motif (bars 1, 5), its answer (2, 6), the third shape (3, 7), the motif moved onto bar 4's chord, and
  // a cadence at the end of the part (a long home note, approached from the step above, trilled)
  if (b === 7) {
    const half = Math.max(1, Math.round(units / 2)) / sub;
    notes.push({ t: 0, d: half, m: deg2m(mode, root, chord + 1, oct), v: 0.11, voice: lead, trill: place.ornament > 0 });
    notes.push({ t: half, d: beats - half, m: deg2m(mode, root, chord, oct), v: 0.12, voice: lead });
  } else {
    const which = b === 1 || b === 5 ? 1 : b === 2 || b === 6 ? 2 : 0,
      cell = dance.cells[tu.cells[which]],
      shape = tu.shapes[which];
    let t = 0,
      k = 0;
    for (let j = 0; j < cell.length; j++) {
      const u = cell[j],
        dur = Math.abs(u) / sub;
      if (u < 0) {
        t += dur;
        continue;
      }
      let d = shape[k++ % shape.length];
      if (vary === 3) d = 4 - d; // turned over
      const m = deg2m(mode, root, chord + d, oct),
        restHere = density < 1 && j > 0 && r() > density;
      if (!restHere) {
        const strong = Math.abs(t - Math.round(t)) < 1e-6 && Math.round(t) % beats === 0;
        if (vary === 1 && u >= 2 && r() < 0.6) {
          // a passing note to the next: the long note split in two
          const nd = shape[k % shape.length],
            step = nd > d ? 1 : nd < d ? -1 : 1;
          notes.push({ t, d: dur / 2, m, v: strong ? 0.11 : 0.09, voice: lead });
          notes.push({ t: t + dur / 2, d: dur / 2, m: deg2m(mode, root, chord + d + step, oct), v: 0.08, voice: lead });
        } else {
          const orn = dur >= 1 && place.ornament && r() < place.ornament;
          notes.push({ t, d: dur, m, v: strong ? 0.11 : 0.09, voice: lead, trill: orn && r() < 0.5, turn: orn });
        }
        // the inner voice: a third or a sixth under the tune on the beats
        if (place.inner && Math.abs(t - Math.round(t)) < 1e-6)
          notes.push({ t, d: Math.min(dur, 1), m: deg2m(mode, root, chord + d - (k % 2 ? 2 : 5), oct), v: 0.05, voice: lead });
      }
      t += dur;
    }
  }
  // the bass, two octaves down (one for a high tune)
  const bo = root >= 60 ? -2 : -1,
    bvoice = lead === 'organ' ? 'organ' : lead === 'bell' || lead === 'pipe' ? 'pad' : 'bass',
    bass = (d, t, dur, v) => notes.push({ t, d: dur, m: deg2m(mode, root, d, bo), v, voice: bvoice });
  if (dance.bass === 'beat') {
    const pat = beats === 3 ? [0, 4, 4] : beats === 2 ? [0, 4] : [0, 4, 2, 4];
    pat.forEach((o, j) => bass(chord + o, j, 1, j === 0 ? 0.1 : 0.06));
  } else if (dance.bass === 'walk') {
    // step from this chord's root toward the next's, a note a beat
    let target = next;
    while (target - chord > 3) target -= 7;
    while (chord - target > 3) target += 7;
    for (let j = 0; j < beats; j++) {
      const f = j / beats,
        d = j === 0 ? chord : Math.round(chord + (target - chord) * f) + (j === beats - 1 && target === chord ? 1 : 0);
      bass(d, j, 1, j === 0 ? 0.1 : 0.07);
    }
  } else if (dance.bass === 'long') {
    bass(chord, 0, beats === 3 ? 2 : beats, 0.09);
    if (beats === 3) bass(chord + 4, 2, 1, 0.06);
  } else if (dance.bass === 'drone') {
    notes.push({ t: 0, d: beats, m: deg2m(mode, root, 0, -1), v: 0.05, voice: 'drone' });
    notes.push({ t: 0, d: beats, m: deg2m(mode, root, 4, -1), v: 0.035, voice: 'drone' });
  }
  // keep the tune in a singable range: an octave and a bit round its key note
  const lo = root - 5 + 12 * oct,
    hi = root + 16 + 12 * oct;
  for (const n of notes)
    if (n.voice === lead) {
      while (n.m > hi) n.m -= 12;
      while (n.m < lo) n.m += 12;
    }
  return { beats, spb: 60 / dance.tempo, chord: [0, 2, 4].map((o) => deg2m(mode, root, chord + o, -1)), notes };
}

/* Short pieces for events, as notes with t and d in seconds: a discovery (a rising figure, trilled), a win (a run up
   and a full close over its bass), a death (a lament over the falling chromatic bass Baroque composers mourned with). */
function eventPiece(X, kind, seed) {
  const e = X.events[kind],
    mode = X.modes[e.mode],
    root = e.root,
    r = dice(hash('event:' + kind) ^ (seed | 0)),
    out = [],
    n = (d, o) => deg2m(mode, root, d, o),
    v = e.voice;
  if (kind === 'discovery') {
    const s = 0.11,
      steps = r() < 0.5 ? [0, 2, 4, 7] : [0, 4, 2, 7];
    steps.forEach((d, i) => out.push({ t: i * s, d: s, m: n(d), v: 0.1, voice: v }));
    out.push({ t: 4 * s, d: 0.7, m: n(8), v: 0.11, voice: v, trill: true });
    out.push({ t: 0, d: 1.2, m: n(0, -2), v: 0.08, voice: 'bass' });
  } else if (kind === 'win') {
    const b = 0.42;
    for (let i = 0; i < 8; i++) out.push({ t: i * b * 0.5, d: b * 0.5, m: n(i), v: 0.09, voice: v }); // a run up the scale
    const close = [
      [3, 5],
      [4, 6],
      [4, 8],
      [0, 7],
    ];
    close.forEach(([ch, top], i) => {
      out.push({ t: 4 * b + i * 2 * b, d: 2 * b, m: n(top), v: 0.11, voice: v, trill: i === 2 });
      out.push({ t: 4 * b + i * 2 * b, d: 2 * b, m: n(top - 2), v: 0.06, voice: v });
      out.push({ t: 4 * b + i * 2 * b, d: 2 * b, m: n(ch, -2), v: 0.1, voice: 'bass' });
    });
    out.push({ t: 12 * b, d: 3, m: n(7), v: 0.12, voice: v });
    out.push({ t: 12 * b, d: 3, m: n(0, -2), v: 0.1, voice: 'bass' });
  } else {
    // the lament: the bass falls by half steps from the home note to the fifth below; the tune sighs over it
    const b = 1.05,
      top = root + 12;
    for (let i = 0; i < 6; i++) {
      out.push({ t: i * b, d: b, m: root - 12 - i, v: 0.1, voice: 'bass' });
      if (i < 5) {
        const hi = top + 2 - i * 2 + (r() < 0.3 ? 1 : 0);
        out.push({ t: i * b, d: b * 0.6, m: hi, v: 0.1, voice: v });
        out.push({ t: i * b + b * 0.6, d: b * 0.4, m: hi - 1, v: 0.06, voice: v });
      }
    }
    out.push({ t: 6 * b, d: 3, m: root - 17, v: 0.1, voice: 'bass' });
    out.push({ t: 6 * b, d: 3, m: root - 1, v: 0.08, voice: v, trill: true });
  }
  return out;
}
export { themeOf, makeTune, nextBar, eventPiece, placeOf, deg2m };
