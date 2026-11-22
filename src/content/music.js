/* The score (commission 7): every kind of place and event has a tune of its own. The view's composer (src/view/score.js)
   makes each tune from a theme rolled from the place's name, so a place always sounds like itself (the city's
   minuet, the taiga's night air) while the details vary each time round. All of it is original, made by rule.

   dances: how a kind of piece moves.
     beats    beats a bar          sub      notes a beat in the finest rhythm (2: eighths, 3: a gigue's triplets)
     tempo    beats a minute       cells    rhythms of one bar of the tune, in subs (a negative number is a rest)
     bass     'beat' a note a beat, 'walk' notes stepping to the next chord, 'long' one or two a bar, 'drone' a held
              tonic and fifth, 'none'
   places: what plays where. The key is the place (see `placeKey` in score.js), the value:
     dance    from dances           mode     from modes            root     the key note (MIDI; 60 is middle C)
     voice    'harpsichord', 'lute', 'bell', 'organ' or 'pipe'
     inner    a second voice in thirds and sixths under the tune (counterpoint)
     pad, drone, drums   the old score's washes and drums under it
     ornament how often a long note is trilled or turned (0 to 1)
     density  how much of each rhythm is played rather than rested (1: all)
   A place with no entry falls back along its key ('town:city:salt' -> 'town:city' -> 'town'). */
export default {
  music: {
    modes: {
      ionian: [0, 2, 4, 5, 7, 9, 11],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      aeolian: [0, 2, 3, 5, 7, 8, 10],
      harmonic: [0, 2, 3, 5, 7, 8, 11], // minor with a leading note: the Baroque's minor
      hijaz: [0, 1, 4, 5, 7, 8, 10], // hot lands
      whole: [0, 2, 4, 6, 8, 10],
      penta: [0, 2, 4, 7, 9],
      minpenta: [0, 3, 5, 7, 10],
    },
    dances: {
      minuet: {
        beats: 3,
        sub: 2,
        tempo: 126,
        cells: [
          [2, 2, 2],
          [2, 1, 1, 2],
          [1, 1, 1, 1, 2],
          [4, 2],
          [3, 1, 2],
        ],
        bass: 'beat',
      },
      sarabande: {
        beats: 3,
        sub: 2,
        tempo: 60,
        cells: [
          [2, 3, 1],
          [2, 4],
          [2, 2, 2],
          [1, 1, 4],
        ],
        bass: 'long',
      },
      gigue: {
        beats: 2,
        sub: 3,
        tempo: 100,
        cells: [
          [1, 1, 1, 1, 1, 1],
          [2, 1, 2, 1],
          [3, 1, 1, 1],
          [2, 1, 3],
        ],
        bass: 'beat',
      },
      gavotte: {
        beats: 4,
        sub: 2,
        tempo: 104,
        cells: [
          [2, 2, 2, 2],
          [1, 1, 1, 1, 2, 2],
          [2, 1, 1, 4],
          [4, 2, 2],
        ],
        bass: 'walk',
      },
      bourree: {
        beats: 2,
        sub: 4,
        tempo: 92,
        cells: [
          [2, 2, 2, 2],
          [1, 1, 2, 4],
          [2, 1, 1, 2, 2],
          [4, 4],
        ],
        bass: 'walk',
      },
      musette: {
        beats: 2,
        sub: 3,
        tempo: 88,
        cells: [
          [2, 1, 2, 1],
          [1, 1, 1, 3],
          [3, 3],
        ],
        bass: 'drone',
      },
      air: {
        beats: 4,
        sub: 2,
        tempo: 66,
        cells: [
          [3, 1, 2, 2],
          [4, 4],
          [2, 2, 4],
          [2, 1, 1, 4],
        ],
        bass: 'walk',
      },
      chorale: {
        beats: 4,
        sub: 1,
        tempo: 54,
        cells: [
          [1, 1, 1, 1],
          [2, 1, 1],
          [2, 2],
        ],
        bass: 'beat',
      },
      march: {
        beats: 4,
        sub: 2,
        tempo: 108,
        cells: [
          [3, 1, 2, 2],
          [2, 2, 4],
          [1, 1, 2, 2, 2],
        ],
        bass: 'beat',
      },
      // the land's slow airs: a few notes a bar over washes of sound, resting often
      drift: { beats: 4, sub: 1, tempo: 50, cells: [[2, 2], [1, 1, 2], [3, 1], [4], [-2, 2], [2, -2]], bass: 'none' },
      fight: {
        beats: 4,
        sub: 2,
        tempo: 132,
        cells: [
          [1, 1, 1, 1, 2, 2],
          [2, 2, 2, 2],
          [1, 1, 2, 1, 1, 2],
        ],
        bass: 'beat',
      },
    },
    places: {
      // towns: the harpsichord's home, a dance for each size, and their own for the strange ones
      town: { dance: 'gavotte', mode: 'ionian', root: 64, voice: 'harpsichord', inner: true, ornament: 0.35 },
      'town:hamlet': { dance: 'musette', mode: 'mixolydian', root: 62, voice: 'lute', ornament: 0.2 },
      'town:village': { dance: 'bourree', mode: 'ionian', root: 62, voice: 'lute', ornament: 0.25 },
      'town:town': { dance: 'gavotte', mode: 'ionian', root: 64, voice: 'harpsichord', inner: true, ornament: 0.35 },
      'town:city': { dance: 'minuet', mode: 'ionian', root: 67, voice: 'harpsichord', inner: true, ornament: 0.45 },
      'town:unfallen': { dance: 'sarabande', mode: 'dorian', root: 62, voice: 'harpsichord', inner: true, ornament: 0.5 },
      'town:pilgrims': { dance: 'chorale', mode: 'aeolian', root: 60, voice: 'organ', inner: true, ornament: 0 },
      // inside buildings (the interiors piece)
      'in:hall': { dance: 'march', mode: 'ionian', root: 62, voice: 'harpsichord', inner: true, ornament: 0.4 },
      'in:temple': { dance: 'chorale', mode: 'dorian', root: 57, voice: 'organ', inner: true, ornament: 0 },
      'in:library': { dance: 'sarabande', mode: 'harmonic', root: 64, voice: 'harpsichord', inner: true, ornament: 0.5 },
      'in:rich': { dance: 'minuet', mode: 'ionian', root: 69, voice: 'harpsichord', inner: true, ornament: 0.5 },
      'in:inn': { dance: 'gigue', mode: 'mixolydian', root: 62, voice: 'lute', ornament: 0.3 },
      'in:home': { dance: 'air', mode: 'aeolian', root: 62, voice: 'lute', density: 0.7, ornament: 0.2 },
      'in:shop': { dance: 'bourree', mode: 'ionian', root: 60, voice: 'harpsichord', ornament: 0.3 },
      'in:smithy': { dance: 'march', mode: 'mixolydian', root: 55, voice: 'lute', ornament: 0.1 },
      'in:abandoned': {
        dance: 'drift',
        mode: 'harmonic',
        root: 57,
        voice: 'harpsichord',
        density: 0.6,
        drone: true,
        ornament: 0.3,
      },
      // the land by day and night, by climate (each biome has its own theme within it)
      land: { dance: 'drift', mode: 'penta', root: 62, voice: 'bell', pad: true, drone: true },
      'land:temperate:day': { dance: 'drift', mode: 'penta', root: 62, voice: 'bell', pad: true, drone: true },
      'land:temperate:night': { dance: 'drift', mode: 'aeolian', root: 57, voice: 'bell', pad: true, drone: true, density: 0.6 },
      'land:wet:day': { dance: 'drift', mode: 'dorian', root: 60, voice: 'pipe', pad: true, drone: true },
      'land:wet:night': { dance: 'drift', mode: 'dorian', root: 55, voice: 'bell', pad: true, drone: true, density: 0.6 },
      'land:hot:day': { dance: 'drift', mode: 'hijaz', root: 62, voice: 'lute', pad: true, drone: true },
      'land:hot:night': { dance: 'drift', mode: 'hijaz', root: 57, voice: 'bell', pad: true, drone: true, density: 0.6 },
      'land:cold:day': { dance: 'drift', mode: 'lydian', root: 64, voice: 'bell', pad: true, drone: true },
      'land:cold:night': { dance: 'drift', mode: 'aeolian', root: 59, voice: 'bell', pad: true, drone: true, density: 0.5 },
      'land:ashen:day': { dance: 'drift', mode: 'phrygian', root: 57, voice: 'bell', pad: true, drone: true },
      'land:ashen:night': { dance: 'drift', mode: 'phrygian', root: 52, voice: 'bell', pad: true, drone: true, density: 0.5 },
      'land:steppe:day': { dance: 'drift', mode: 'minpenta', root: 60, voice: 'pipe', pad: true, drone: true },
      'land:steppe:night': { dance: 'drift', mode: 'minpenta', root: 55, voice: 'bell', pad: true, drone: true, density: 0.6 },
      // below, above, on and under the water, beyond
      deep: { dance: 'drift', mode: 'phrygian', root: 50, voice: 'bell', pad: true, drone: true, density: 0.5 },
      'deep:crypt': { dance: 'sarabande', mode: 'harmonic', root: 50, voice: 'organ', drone: true, density: 0.6 },
      'deep:mine': { dance: 'drift', mode: 'dorian', root: 48, voice: 'lute', pad: true, drone: true, density: 0.6 },
      'deep:hold': { dance: 'march', mode: 'phrygian', root: 50, voice: 'bell', drone: true, density: 0.5 },
      vault: { dance: 'sarabande', mode: 'harmonic', root: 52, voice: 'harpsichord', drone: true, density: 0.6, ornament: 0.3 },
      sky: { dance: 'drift', mode: 'lydian', root: 69, voice: 'bell', pad: true },
      'sky:city': { dance: 'minuet', mode: 'lydian', root: 72, voice: 'harpsichord', inner: true, pad: true, ornament: 0.5 },
      'sky:castle': { dance: 'sarabande', mode: 'lydian', root: 67, voice: 'harpsichord', pad: true, ornament: 0.4 },
      sea: { dance: 'drift', mode: 'mixolydian', root: 60, voice: 'lute', pad: true, drone: true },
      'sea:merhall': {
        dance: 'sarabande',
        mode: 'mixolydian',
        root: 60,
        voice: 'harpsichord',
        inner: true,
        pad: true,
        ornament: 0.4,
      },
      'sea:raft': { dance: 'gigue', mode: 'mixolydian', root: 62, voice: 'lute', ornament: 0.25 },
      elsewhere: { dance: 'drift', mode: 'whole', root: 66, voice: 'bell', pad: true },
      blight: { dance: 'drift', mode: 'phrygian', root: 53, voice: 'bell', drone: true, density: 0.4 },
      storm: { dance: 'drift', mode: 'minpenta', root: 55, voice: 'bell', pad: true, drone: true, density: 0.4 },
      fight: { dance: 'fight', mode: 'phrygian', root: 52, voice: 'lute', drums: true, density: 0.8 },
      'fight:boss': { dance: 'fight', mode: 'harmonic', root: 50, voice: 'harpsichord', inner: true, drums: true },
    },
    // short pieces for events, played over the score: a discovery, a win, a death (see score.js `eventPiece`)
    events: {
      discovery: { mode: 'ionian', root: 72, voice: 'harpsichord' },
      win: { mode: 'ionian', root: 67, voice: 'harpsichord' },
      death: { mode: 'harmonic', root: 57, voice: 'harpsichord' },
    },
  },
};
