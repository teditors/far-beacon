/* Graphics quality and the performance meter's switch: settings of this device, not of the run, so they live in their
   own browser storage key and survive a new world. Every visual piece reads Q (the preset in use) rather than
   hard-coding detail, so "low" stays cheap on a phone. */
const KEY = 'farbeacon.settings';
// margin: tiles of the neighbouring regions drawn around the player's region. fine: ground cells across a region.
// coarse: how many fine cells one cell of the far ground spans. trees, rocks: share drawn near (n) and far (f).
// sky: a shaded sky with a sun and moon. grain: a fine pattern on the ground. weather: how many drops or flakes fall.
// ratio: the most screen pixels per CSS pixel. fog: how far the eye sees by day, as a share of the drawn margin.
const QUALITY = {
  low: {
    label: 'Low',
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
  },
  medium: {
    label: 'Medium',
    ratio: 1.5,
    aa: true,
    margin: 17,
    fine: 180,
    coarse: 3,
    treesN: 1,
    treesF: 0.5,
    rocksN: 1,
    rocksF: 0.5,
    sky: true,
    grain: true,
    weather: 700,
  },
  high: {
    label: 'High',
    ratio: 2,
    aa: true,
    margin: 22,
    fine: 216,
    coarse: 2,
    treesN: 1,
    treesF: 0.5,
    rocksN: 1,
    rocksF: 1,
    sky: true,
    grain: true,
    weather: 1600,
  },
};
const SET = { quality: 'medium', meter: false };
try {
  Object.assign(SET, JSON.parse(localStorage.getItem(KEY) || '{}') || {});
} catch (e) {
  /* storage is optional */
}
if (!QUALITY[SET.quality]) SET.quality = 'medium';
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
  Object.assign(Q, QUALITY[name]);
  saveSettings();
}
export { QUALITY, Q, SET, setQuality, saveSettings };
