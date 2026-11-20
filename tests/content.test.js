// Content validation: catches broken references in the data files before they turn into odd bugs in play.
const { Rules: R } = require('./lib');
const C = R.C, errs = [];
const ids = (list) => new Set(list.map((e) => e.id));
const bases = ids(C.bases), slots = new Set(C.slots.map((s) => s[0]));
const need = (cond, msg) => { if (!cond) errs.push(msg); };
const unique = (list, what) => { const seen = new Set(); for (const e of list) { need(!seen.has(e.id), what + ' id repeated: ' + e.id); seen.add(e.id); } };
for (const [k, list] of Object.entries({ bases: C.bases, affixes: C.affixes, races: C.races, classes: C.classes, biomes: C.biomes, gods: C.gods })) unique(list, k);
for (const a of C.affixes) {
  need(a.pos === 'pre' || a.pos === 'suf', 'affix ' + a.id + ': pos must be pre or suf');
  if (a.for !== 'gear') for (const b of a.for) need(bases.has(b), 'affix ' + a.id + ' names unknown base ' + b);
}
for (const b of C.bases) {
  if (b.slot) need(slots.has(b.slot), 'base ' + b.id + ' has unknown slot ' + b.slot);
  if (b.w > 0 && !b.quest) need(C.value[b.id] !== undefined, 'base ' + b.id + ' can be found but has no value in tuning.js');
  if (b.consumable && !b.mystery) need(b.use, 'consumable ' + b.id + ' has no use');
}
for (const c of C.classes) {
  for (const k of c.kit) need(bases.has(k), 'class ' + c.id + ' kit has unknown item ' + k);
  need(c.hd > 0, 'class ' + c.id + ' has no hit die');
  if (c.caster) need(C.abilities.some((a) => a.id === c.caster), 'class ' + c.id + ' casts from unknown ability ' + c.caster);
}
for (const r of C.races) { for (const k in r.adj) need(C.abilities.some((a) => a.id === k), 'race ' + r.id + ' adjusts unknown ability ' + k); need(r.names.length >= 2, 'race ' + r.id + ' needs at least two names'); }
for (const b of C.biomes) {
  for (const k of ['forest', 'river', 'special', 'day', 'night', 'storm']) need(b[k], 'biome ' + b.id + ' is missing ' + k);
  need(b.colors && b.colors.length === 6, 'biome ' + b.id + ' needs 6 ground colours');
  need(typeof b.sky === 'number' && typeof b.creatureTint === 'number', 'biome ' + b.id + ' needs sky and creatureTint');
  need(C.creature.prefix[b.id], 'biome ' + b.id + ' has no creature name prefixes');
}
for (const g of C.gods) need(typeof g.color === 'number', 'god ' + g.id + ' needs a color');
for (const ax of ['habit', 'age', 'style', 'affinity', 'doom']) { need(C.civ[ax] && C.civ[ax].length >= 2, 'peoples: ' + ax + ' needs at least two options'); unique(C.civ[ax], 'peoples ' + ax); }
for (const st of C.civ.style) for (const f of st.favors) need(bases.has(f), 'style ' + st.id + ' favours unknown base ' + f);
for (const k of C.town.staples) need(bases.has(k), 'town staple ' + k + ' is not a base');
need(C.creature.speciesPerWorld <= C.creature.forms.length * C.creature.prefix.salt.length, 'too few forms and prefixes for speciesPerWorld');
// every stat a modifier names should be one the rules read (a typo here silently does nothing)
const known = new Set(['waterCap', 'cold', 'stormCold', 'staminaCost', 'nightSight', 'surveyRadius', 'carryCap', 'moveTime', 'moveTime.hill', 'moveTime.mountain', 'moveTime.plain', 'moveTime.forest', 'goalDistance', 'leak', 'waterDrain', 'fuelUse', 'restGain', 'wellfinder', 'hit', 'dmg', 'ac', 'studyTime', 'searchTime', 'luck', 'tasteWater', 'gatherYield', 'trapSafe', 'shrineSense', 'warm', 'quiet', 'wetSafe', 'foulSafe', 'moveTime.river', 'town.innPrice', 'town.fuelPrice', 'town.appraisePrice', 'town.sellRate', 'town.buy', 'town.buy.weapon', 'town.buy.armor', 'town.buy.consumable', 'town.buy.gear']);
const mods = [];
for (const b of C.bases) (b.mods || []).forEach((m) => mods.push(['base ' + b.id, m]));
for (const a of C.affixes) a.mods.forEach((m) => mods.push(['affix ' + a.id, m]));
for (const x of [...C.races, ...C.classes, ...C.gods, ...C.civ.affinity]) (x.mods || []).forEach((m) => mods.push([x.id, m]));
for (const b of C.biomes) for (const k of ['forest', 'river', 'special', 'day', 'night', 'storm']) (b[k].mods || []).forEach((m) => mods.push(['biome ' + b.id + '.' + k, m]));
for (const y of [...C.year.common, ...C.year.rare]) (y.mods || []).forEach((m) => mods.push(['year ' + y.id, m]));
for (const y of [...C.year.common, ...C.year.rare]) for (const k in y.tun || {}) need(C.tun[k] !== undefined, 'year ' + y.id + ' changes unknown tuning ' + k);
for (const x of [...C.pantheon.gifts, ...C.pantheon.costs]) x.mods.forEach((m) => mods.push(['pantheon ' + x.id, m]));
for (const x of C.pantheon.gifts) need(C.pantheon.domains.some((d) => d.id === x.domain), 'god gift ' + x.id + ' has unknown domain ' + x.domain);
for (const x of C.artifacts.powers) { x.mods.forEach((m) => mods.push(['artifact ' + x.id, m])); for (const b of x.for) need(bases.has(b), 'artifact ' + x.id + ' names unknown base ' + b); }
for (const x of C.regionRares.list) (x.mods || []).forEach((m) => mods.push(['region rare ' + x.id, m]));
for (const x of [...C.townCulture.trades, ...C.townCulture.customs, ...C.townCulture.rares]) { (x.mods || []).forEach((m) => mods.push(['town ' + x.id, m])); for (const b of (x.stock || { bases: [] }).bases) need(bases.has(b), 'town ' + x.id + ' stocks unknown base ' + b); }
for (const x of C.oddWeather.list) x.mods.forEach((m) => mods.push(['weather ' + x.id, m]));
for (const x of C.floorKinds.list) (x.mods || []).forEach((m) => mods.push(['floor ' + x.id, m]));
for (const k in C.relicNatures) C.relicNatures[k].mods.forEach((m) => mods.push(['relic ' + k, m]));
for (const r of C.quest.relics) need(C.relicNatures[r], 'relic ' + r + ' has no nature');
for (const x of [...C.townLife.lessons, C.townLife.blessing, C.townLife.mule]) x.mods.forEach((m) => mods.push(['town life ' + (x.id || 'blessing'), m]));
for (const a of C.abilities) a.mods(12).forEach((m) => mods.push(['ability ' + a.id, m]));
for (const [who, m] of mods) { need(known.has(m.stat), who + ' modifies unknown stat ' + m.stat); need(['add', 'mul', 'max'].includes(m.op), who + ' has unknown op ' + m.op); }
if (errs.length) { console.log('content problems:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('content ok: ' + C.bases.length + ' item bases, ' + C.affixes.length + ' affixes, ' + mods.length + ' modifiers checked');
