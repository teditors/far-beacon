/* Graphics quality and the performance meter's switch: settings of this device, not of the run, so they live in their
   own browser storage key and survive a new world. Every visual piece reads Q (the preset in use) rather than
   hard-coding detail, so "low" stays cheap on a phone. */
const KEY = 'farbeacon.settings';
// margin: tiles of the neighbouring regions drawn around the player's region. fine: ground cells across a region.
// coarse: how many fine cells one cell of the far ground spans. trees, rocks: share drawn near (n) and far (f).
// sky: a shaded sky with a sun and moon. grain: a fine pattern on the ground. weather: how many drops or flakes fall.
// ratio: the most screen pixels per CSS pixel. fog: how far the eye sees by day, as a share of the drawn margin.
/* Commission 6: what was High is now the least the game offers (Low), and new Medium and High sit above it for the
   painted look (toon bands, outlines, far hills, grain). The old Low lives on hidden, as Fallback, for weak devices:
   the game drops to it by itself if the frame rate stays poor (perf.js), and says so.
   The look's own fields: toon (banded light on things), outline (0 none, 1 people and creatures, 2 and buildings,
   ruins and landmarks, 3 and near trees), ink (clean ink lines in other worlds), skyline (bands of far hills),
   paper (a painted grain over the picture), fogBands (distance fades in steps). */
const OLD_HIGH = {
  ratio: 2,
  aa: true,
  margin: 24,
  fine: 288,
  coarse: 2,
  treesN: 1,
  treesF: 0.5,
  rocksN: 1,
  rocksF: 1,
  sky: true,
  grain: true,
  weather: 1600,
  treeNear: 420,
  grass: 45,
  grassMax: 14000,
  texPx: 256,
  aniso: 8,
  post: true, // bloom, colour grading and a vignette (C5.19)
  shadows: true, // real-time shadows from the sun, near the player (C5.10)
  shadowPx: 2048,
};
const QUALITY = {
  fallback: {
    label: 'Fallback',
    hidden: true, // offered only while in use
    ratio: 1,
    aa: false,
    margin: 12,
    fine: 144,
    coarse: 3,
    treesN: 0.6,
    treesF: 0.3,
    rocksN: 0.6,
    rocksF: 0,
    sky: false,
    grain: false,
    weather: 0,
    grass: 0, // metres round the player where grass grows (C5.18), and the most tufts
    grassMax: 0,
    texPx: 64, // painted textures' size (C5.17)
    aniso: 1,
    lite: true, // towns without their small things (shutters, flowers, street props)
    treeNear: 0, // metres round the player within which trees have their full shape (C5.3); 0: nowhere
    fogBands: true,
  },
  low: Object.assign({}, OLD_HIGH, { label: 'Low', toon: true, outline: 1, ink: true, skyline: 2, fogBands: true }),
  medium: Object.assign({}, OLD_HIGH, {
    label: 'Medium',
    toon: true,
    outline: 2,
    ink: true,
    skyline: 3,
    paper: true,
    fogBands: true,
  }),
  high: Object.assign({}, OLD_HIGH, {
    label: 'High',
    ratio: 2.5,
    margin: 26,
    treeNear: 560,
    grass: 56,
    grassMax: 20000,
    shadowPx: 4096,
    toon: true,
    outline: 3,
    ink: true,
    skyline: 4,
    paper: true,
    fogBands: true,
  }),
};
const ORDER = ['fallback', 'low', 'medium', 'high'];
const SET = { quality: 'medium', meter: false, off: {}, qv: 2 };
try {
  const old = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  // settings from before commission 6 named the old levels: old Low is Fallback now, old Medium is the new Low
  if (old.quality && old.qv !== 2) old.quality = { low: 'fallback', medium: 'low', high: 'high' }[old.quality];
  old.qv = 2;
  Object.assign(SET, old);
} catch (e) {
  /* storage is optional */
}
if (!QUALITY[SET.quality]) SET.quality = 'medium';
if (!SET.off || typeof SET.off !== 'object') SET.off = {};
const Q = Object.assign({}, QUALITY[SET.quality]);
function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(SET));
  } catch (e) {}
}
// Switch preset. The caller rebuilds the scene; antialiasing only changes when the page is next loaded.
function setQuality(name) {
  if (!QUALITY[name]) return;
  SET.quality = name;
  for (const k of Object.keys(Q)) delete Q[k]; // nothing of the last level may linger (shadows, outlines...)
  Object.assign(Q, QUALITY[name]);
  saveSettings();
}
/* The look's own switches (commission 5): each visual or sound piece registers [id, label] here and asks on(id). They
   are settings of this device, like the quality, not of the run: a piece of the look never changes the game. */
const LOOK_SWITCHES = [];
const lookOn = (id) => !SET.off[id];
// functions (id) told when a look switch is changed, for pieces that keep running state (the sound)
const LOOK_CHANGED = [];
const lookChanged = (id) => LOOK_CHANGED.forEach((fn) => fn(id));
export { ORDER, QUALITY, Q, SET, setQuality, saveSettings, LOOK_SWITCHES, lookOn, LOOK_CHANGED, lookChanged };
