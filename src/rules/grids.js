/* A map's grids (the ground, its height, what has been seen) as a short text instead of a list of 1296 numbers: the
   different values once, then one letter per run of tiles with how many tiles it runs for ("~0|1|2~A40B3A12...").
   Saves write grids this way, and maps far from the traveller are kept this way in memory (see coolDown in areas.js). */
const GRIDS = ['terrain', 'elev', 'seen'],
  LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function packGrid(a) {
  const vals = [],
    at = new Map();
  for (const v of a) {
    if (typeof v !== 'number') return a;
    if (!at.has(v)) {
      if (vals.length === LETTERS.length) return a;
      at.set(v, vals.length);
      vals.push(v);
    }
  }
  let out = '~' + vals.join('|') + '~';
  for (let i = 0; i < a.length; ) {
    let j = i;
    while (j < a.length && a[j] === a[i]) j++;
    out += LETTERS[at.get(a[i])] + (j - i > 1 ? j - i : '');
    i = j;
  }
  return out;
}
function unpackGrid(t) {
  if (typeof t !== 'string' || t[0] !== '~') return t;
  const end = t.indexOf('~', 1),
    vals = t.slice(1, end).split('|').map(Number),
    out = [];
  for (let i = end + 1; i < t.length; ) {
    const v = vals[LETTERS.indexOf(t[i++])];
    let n = 0;
    while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) n = n * 10 + t.charCodeAt(i++) - 48;
    for (let k = Math.max(1, n); k > 0; k--) out.push(v);
  }
  return out;
}
// Pack a map's grids in place (it is then "cold"), or unpack them (warm again). Both are safe to call twice.
function freezeMap(m) {
  if (!m) return m;
  for (const f of GRIDS) if (Array.isArray(m[f]) && m[f].length > 64) m[f] = packGrid(m[f]);
  return m;
}
function thawMap(m) {
  if (!m) return m;
  for (const f of GRIDS) if (typeof m[f] === 'string') m[f] = unpackGrid(m[f]);
  return m;
}
const isCold = (m) => !!m && typeof m.terrain === 'string';
export { GRIDS, packGrid, unpackGrid, freezeMap, thawMap, isCold };
