/* Items: generation, names, weight and descriptions. */
import { trait } from './civ.js';
import { C, byId, srand } from './core.js';
import { ITEM_HOOKS, WEIGHTS } from './hooks.js';

/* Items */
function makeItem(s, baseId, pre, suf, known) {
  const b = byId(C.bases, baseId);
  const it = { id: s.nextId++, base: baseId, pre: pre || null, suf: suf || null, known: !!known || !!b.plain, carried: 0 };
  if (b.mystery) it.effect = Math.floor(srand(s) * C.flasks.length);
  return it;
}
function genItem(s, o) {
  o = o || {};
  const fav = o.civ ? trait(s, 'style').favors : [],
    wOf = (b) => b.w * (fav.includes(b.id) ? 3 : 1);
  const pool = C.bases.filter((b) => b.w > 0 && !(o.noConsumables && b.consumable) && !(o.onlyConsumables && !b.consumable));
  let tot = pool.reduce((a, b) => a + wOf(b), 0),
    r = srand(s) * tot,
    base = pool[0];
  for (const b of pool) {
    r -= wOf(b);
    if (r <= 0) {
      base = b;
      break;
    }
  }
  let pre = null,
    suf = null;
  if (!base.consumable) {
    const fits = (pos) => C.affixes.filter((a) => a.pos === pos && (a.for === 'gear' || a.for.includes(base.id)));
    const pick = (a) => a[Math.floor(srand(s) * a.length)];
    const ch = o.relic ? 0.8 : 0.45;
    if (srand(s) < ch) pre = pick(fits('pre')).id;
    if (srand(s) < ch) suf = pick(fits('suf')).id;
  }
  const it = makeItem(s, base.id, pre, suf, false);
  if (o.civ && !base.consumable && srand(s) < 0.5) {
    it.mark = s.civ.affinity;
    it.markName = s.civ.name;
  }
  for (const f of ITEM_HOOKS) f(s, it, o); // pieces may finish a found item (tiers by distance, ...)
  return it;
}
function itemName(it) {
  const b = byId(C.bases, it.base);
  if (it.label) return it.label;
  if (it.artName) return it.artName;
  if (!it.known) return (it.tier >= 3 ? 'Superb ' : it.tier === 2 ? 'Fine ' : '') + b.name + ' (unstudied)'; // fine work shows
  if (b.mystery) return C.flasks[it.effect].name;
  const p = it.pre ? byId(C.affixes, it.pre).name + ' ' : '',
    f = it.suf ? ' ' + byId(C.affixes, it.suf).name : '';
  const mk = it.mark ? it.markName + ' ' : '',
    tq = it.tier >= 3 ? 'Superb ' : it.tier === 2 ? 'Fine ' : '';
  return p || f || mk ? tq + mk + p + b.name + f : b.plain ? b.name : 'Plain ' + b.name;
}
function itemAffixes(it) {
  const a = [it.pre, it.suf].filter(Boolean).map((id) => byId(C.affixes, id));
  if (it.mark) a.push(byId(C.civ.affinity, it.mark));
  if (!it.tier || it.tier < 2) return a;
  // a finer item: every affix it has does more (a curse included). Half again for each tier above the first.
  const k = 1 + 0.5 * (it.tier - 1),
    up = (m) =>
      Object.assign({}, m, {
        value: m.op === 'mul' ? 1 + (m.value - 1) * k : m.op === 'add' ? Math.round(m.value * k * 10) / 10 : m.value,
      });
  return a.map((x) => Object.assign({}, x, { mods: x.mods.map(up) }));
}
function itemWeight(s, it) {
  let w = byId(C.bases, it.base).wt;
  if (!s.off.affixes) for (const a of itemAffixes(it)) if (a.wtMul !== undefined) w *= a.wtMul;
  return w;
}
function weight(s) {
  let w = s.player.water + s.player.fuel * 0.5 + s.player.items.reduce((a, it) => a + itemWeight(s, it), 0);
  for (const f of WEIGHTS) w += f(s);
  return w;
}

const isCursed = (it) => itemAffixes(it).some((a) => a.cursed);

function describeMods(mods) {
  const N = {
    studyTime: 'time to understand items',
    searchTime: 'search time',
    waterDrain: 'water use',
    cold: 'cold',
    stormCold: 'storm cold',
    staminaCost: 'effort',
    moveTime: 'travel time',
    'moveTime.hill': 'time on hills',
    'moveTime.mountain': 'time on mountains',
    'moveTime.plain': 'time on flat ground',
    restGain: 'rest',
    fuelUse: 'fuel use',
  };
  return mods
    .map((m) => {
      if (m.op === 'mul') {
        if (m.value === 0) return 'no ' + (N[m.stat] || m.stat);
        const p = Math.round((m.value - 1) * 100);
        if (!p) return '';
        return (N[m.stat] || m.stat) + ' ' + (p > 0 ? '+' : '') + p + '%';
      }
      if (m.stat === 'waterCap') return m.op === 'max' ? 'water limit ' + m.value : 'holds ' + m.value + ' water';
      if (m.stat === 'ac') return 'armor ' + (m.value > 0 ? '+' : '') + m.value;
      if (m.stat === 'hit') return 'to hit ' + (m.value > 0 ? '+' : '') + m.value;
      if (m.stat === 'dmg') return 'damage +' + m.value;
      if (m.stat === 'carryCap') return m.value ? 'carry ' + (m.value > 0 ? '+' : '') + m.value : '';
      if (m.stat === 'luck') return m.value ? 'luck +' + Math.round(m.value * 100) + '%' : '';
      if (m.stat === 'surveyRadius') return m.value ? 'survey range ' + (m.value > 0 ? '+' : '') + m.value : '';
      if (m.stat === 'nightSight') return m.needsFuel ? 'lights the night (burns fuel)' : 'see in the dark';
      if (m.stat === 'leak') return 'leaks ' + m.value + ' water an hour';
      if (m.stat === 'goalDistance') return 'shows distance to the beacon';
      if (m.stat === 'wellfinder') return 'points to the nearest spring';
      return m.stat;
    })
    .filter(Boolean)
    .join(', ');
}
function describeItem(s, it) {
  const b = byId(C.bases, it.base);
  if (b.quest) return b.quest;
  if (!it.known) return 'Unstudied. Whatever it does, it is already doing.';
  if (b.mystery) return describeUse(C.flasks[it.effect].use);
  if (b.consumable) return describeUse(b.use);
  if (b.id === 'campkit') return 'Pitch it in any shelter to make camp.';
  let mods = (b.mods || []).slice();
  const ax = itemAffixes(it);
  for (const a of ax) mods = mods.concat(a.mods);
  const pw = it.art && C.artifacts ? byId(C.artifacts.powers, it.art) : null;
  let t = b.weapon ? b.weapon.dice[0] + 'd' + b.weapon.dice[1] + ' damage' + (b.weapon.finesse ? ', uses Dexterity' : '') : '';
  {
    const dm = describeMods(mods);
    t += (t && dm ? ', ' : '') + dm;
  }
  if (pw) t = pw.text + (t ? ' Also: ' + t : '');
  for (const a of ax)
    if (a.wtMul !== undefined) t += (t ? ', ' : '') + (a.wtMul === 0 ? 'weighs nothing' : 'weighs ' + a.wtMul + ' times normal');
  return t;
}
const describeUse = (u) =>
  Object.keys(u)
    .map((k) => (u[k] > 0 ? '+' : '') + u[k] + ' ' + (k === 'hp' ? 'hit points' : k))
    .join(', ');

export { makeItem, genItem, itemName, itemAffixes, itemWeight, weight, isCursed, describeMods, describeItem, describeUse };
