/* Crafting, from content/crafting.js: materials from what you kill, search and gather (hide, bone, salvage, herbs;
   wood is fuel), and recipes for what keeps you alive: waterskins, torches, bandages, salves, a fur cloak, a shelter.
   Materials are counts in s.player.mats (optional) and weigh something. Switch: s.off.crafting. */
import { C, byId, on, say, srand } from './core.js';
import { areaRec, inOverworld } from './areas.js';
import { autoEquip } from './equipment.js';
import { makeItem } from './items.js';
import { siteHere } from './map.js';
import { advance } from './systems.js';
import { gainXp } from './progress.js';
import { SOURCES } from './stats.js';
import { NOTES, SWITCHES, WEIGHTS } from './hooks.js';

const X = () => C.crafting;
for (const b of X().bases)
  if (!C.bases.some((e) => e.id === b.id)) {
    C.bases.push(Object.assign({}, b, { value: undefined }));
    C.value[b.id] = b.value;
  }
const mats = (s) => (s.player.mats = s.player.mats || {});
const matOf = (id) => byId(X().mats, id);
function addMats(s, got, why) {
  if (s.off.crafting) return;
  const m = mats(s),
    parts = [];
  for (const k in got) {
    m[k] = (m[k] || 0) + got[k];
    parts.push(got[k] + ' ' + matOf(k).name.toLowerCase());
  }
  if (parts.length) say(s, why + parts.join(' and ') + '.');
}
const has = (s, needs) => Object.keys(needs).every((k) => (k === 'fuel' ? s.player.fuel : mats(s)[k] || 0) >= needs[k]);
// What you could make here: [{ recipe, ok }].
function recipes(s) {
  if (s.off.crafting) return [];
  return X().recipes.map((r) => ({ r, ok: has(s, r.needs) && (r.makes !== 'shelter' || canShelter(s)) }));
}
const canShelter = (s) => inOverworld(s) && !siteHere(s);
function craft(s, id) {
  const r = byId(X().recipes, id);
  if (s.over || s.combat || s.off.crafting || !r || !has(s, r.needs)) return false;
  if (r.makes === 'shelter' && !canShelter(s)) {
    say(s, 'There is no room for a shelter here.');
    return false;
  }
  for (const k in r.needs) {
    if (k === 'fuel') s.player.fuel -= r.needs[k];
    else mats(s)[k] -= r.needs[k];
  }
  advance(s, r.mins, 'rest');
  if (s.over) return true;
  if (r.makes === 'shelter') {
    s.sites[s.player.y * 36 + s.player.x] = { kind: 'shelter', seen: true, visited: true };
    say(s, 'You raise a lean-to of poles and hide. It will stand.', 'good');
  } else {
    const it = makeItem(s, r.makes, null, null, true);
    s.player.items.push(it);
    autoEquip(s, it);
    say(s, 'You make ' + (r.name.endsWith('s') ? '' : 'a ') + r.name.toLowerCase() + '.', 'good');
  }
  if (!(s.crafted = s.crafted || {})[id]) {
    s.crafted[id] = 1;
    gainXp(s, 10);
  }
  return true;
}
on('killed', (s, d) => {
  const c = d.c;
  if (!c) return;
  const sp = s.species[c.sp],
    got = Object.assign({}, X().kills[sp && sp.form]);
  if (c.tier > 2) for (const k in got) got[k]++;
  addMats(s, got, 'You take from the carcass: ');
});
on('did', (s, d) => {
  if (s.off.crafting) return;
  if (d.id === 'search' && d.site && X().search[d.site]) addMats(s, X().search[d.site], 'Among it all: ');
  if (d.id === 'gather' && srand(s) < X().herbChance) addMats(s, { herbs: 1 }, 'And with the wood, ');
});
// a torch burns for its hours; materials weigh what they weigh
SOURCES.push({
  id: 'crafting',
  fn(s, out) {
    if (s.lightUntil && s.time < s.lightUntil && areaRec(s)) out.push({ stat: 'nightSight', op: 'add', value: 1 });
  },
});
WEIGHTS.push((s) => {
  let w = 0;
  const m = s.player.mats || {};
  for (const k in m) w += (m[k] || 0) * ((matOf(k) || {}).wt || 0);
  return w;
});
SWITCHES.push(['crafting', 'Crafting']);
NOTES.push((s) => {
  const m = s.player.mats || {},
    have = Object.keys(m).filter((k) => m[k] > 0);
  return have.length
    ? [{ label: 'Materials', text: have.map((k) => m[k] + ' ' + matOf(k).name.toLowerCase()).join(', ') + '.' }]
    : [];
});
export { craft, recipes, addMats };
