// The Almanac: every menu the game rolls from, and every option on it, written out from src/content/ into ALMANAC.md.
// Usage: node tools/almanac.js           rewrite ALMANAC.md
//        node tools/almanac.js --check   fail if ALMANAC.md is out of date (tools/check.js runs this)
// A new content menu gets a section below. Anything in CONTENT that no section covers is listed at the end, so a new
// menu is never silently left out.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { buildRules } = require('./build.js');
const R = require(buildRules()).Rules;
const C = R.C;

const covered = new Set();
const use = (...keys) => keys.forEach((k) => covered.add(k));
const out = [];
const line = (t = '') => out.push(t);
const cell = (v) => String(v === undefined || v === null ? '' : v).replace(/\|/g, '/').replace(/\n/g, ' ');
function table(head, rows) {
  line('| ' + head.join(' | ') + ' |');
  line('| ' + head.map(() => '---').join(' | ') + ' |');
  for (const r of rows) line('| ' + r.map(cell).join(' | ') + ' |');
  line();
}
const pct = (v) => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
// One modifier as a short, exact phrase: "waterDrain x0.5", "carryCap +2", "waterCap at most 4 (night)".
function mod(m) {
  let t =
    m.op === 'mul' ? m.stat + ' x' + +m.value.toFixed(3) : m.op === 'max' ? m.stat + ' at most ' + m.value : m.stat + ' ' + (m.value >= 0 ? '+' : '') + m.value;
  if (m.when) t += ' (' + m.when + ')';
  if (m.needsFuel) t += ' (needs fuel)';
  return t;
}
const mods = (list) => (list && list.length ? list.map(mod).join('; ') : '');
const fields = (o, skip) =>
  Object.keys(o)
    .filter((k) => !skip.includes(k) && o[k] !== undefined && o[k] !== false)
    .map((k) => (o[k] === true ? k : k + ' ' + (Array.isArray(o[k]) ? o[k].join('/') : typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k])))
    .join(', ');

const sections = [];
const section = (title, keys, fn) => sections.push({ title, keys, fn });

/* ---------------- sections, one per menu ---------------- */

section('Tuning', ['tun', 'offer', 'slots'], () => {
  line('The numbers every world starts from. The Tinker panel edits them live; world traits may change them per world.');
  line();
  const T = C.tun;
  table(
    ['Number', 'Value'],
    Object.keys(T).map((k) => [k, typeof T[k] === 'object' ? JSON.stringify(T[k]) : T[k]]),
  );
  line('Each world offers ' + C.offer.races + ' races and ' + C.offer.classes + ' classes to choose from.');
  line();
  table(
    ['Equipment slot', 'Holds'],
    C.slots.map((s) => [s[1], s[2]]),
  );
});

section('Abilities', ['abilities'], () => {
  line('Rolled 4d6, drop the lowest. What a score of 8, 12 and 16 does:');
  line();
  table(
    ['Ability', 'Governs', 'At 8', 'At 12', 'At 16'],
    C.abilities.map((a) => [a.name, a.does, mods(a.mods(8)), mods(a.mods(12)), mods(a.mods(16))]),
  );
});

section('Races', ['races'], () => {
  line('A world offers ' + C.offer.races + ' of these.');
  line();
  table(
    ['Race', 'Ability changes', 'Trait', 'Modifiers', 'Names'],
    C.races.map((r) => [
      r.name + (r.exotic ? ' (exotic)' : ''),
      Object.keys(r.adj)
        .map((k) => k + ' ' + (r.adj[k] > 0 ? '+' : '') + r.adj[k])
        .join(', '),
      r.text,
      mods(r.mods),
      r.names.length,
    ]),
  );
});

section('Classes', ['classes'], () => {
  line('A world offers ' + C.offer.classes + ' of these.');
  line();
  table(
    ['Class', 'Hit die', 'Casts from', 'Kit', 'In a fight', 'Modifiers'],
    C.classes.map((c) => [
      c.name,
      'd' + c.hd,
      c.caster ? c.caster + ' (' + c.manaPer + ' mana a level)' : '',
      c.kit.join(', '),
      c.fight,
      mods(c.mods),
    ]),
  );
});

section('Biomes', ['biomes'], () => {
  line('Each region of the world is one of these. Day, night and storm give cold and warmth per hour.');
  line();
  table(
    ['Biome', 'Hills', 'Mountains', 'Springs', 'Foul', 'Day cold/warm', 'Night cold/warm', 'Storm', 'Sky'],
    C.biomes.map((b) => [
      b.name,
      pct(b.hills).replace('+', ''),
      pct(b.mountains).replace('+', ''),
      b.springs,
      pct(b.foul).replace('+', ''),
      b.day.cold + '/' + b.day.warm + (b.day.mods.length ? ' ' + mods(b.day.mods) : ''),
      b.night.cold + '/' + b.night.warm + (b.night.mods.length ? ' ' + mods(b.night.mods) : ''),
      b.storm.name + ', cold ' + b.storm.cold + (b.storm.mods.length ? ', ' + mods(b.storm.mods) : ''),
      hex(b.sky),
    ]),
  );
  table(
    ['Biome', 'Ground', 'Name', 'Share', 'Minutes', 'Stamina', 'Other'],
    C.biomes.flatMap((b) =>
      ['forest', 'river', 'special'].map((k) => {
        const g = b[k];
        return [
          b.name,
          k,
          g.name,
          g.frac !== undefined ? pct(g.frac).replace('+', '') : g.count + ' rivers',
          g.moveMin,
          g.moveSta,
          [fields(g, ['name', 'frac', 'count', 'moveMin', 'moveSta', 'mods', 'tree']), mods(g.mods)].filter(Boolean).join('; '),
        ];
      }),
    ),
  );
});

section('Gods', ['gods'], () => {
  line('The hand-written gods. Each world has one shrine. With rolled gods on (the default), these are only used when that switch is off.');
  line();
  table(
    ['God', 'Terms', 'Modifiers'],
    C.gods.map((g) => [g.name, g.terms, mods(g.mods)]),
  );
});

section('Lost peoples', ['civ'], () => {
  line('A lost people is five traits, one from each menu below, plus a name built from its style.');
  line();
  const P = C.civ;
  line('### What they built (habit)');
  line();
  table(
    ['Habit', 'Ruin', 'Sign', 'Effect', 'Numbers'],
    P.habit.map((h) => [h.label, h.ruin, h.sign, h.text, fields(h, ['id', 'label', 'ruin', 'sign', 'text'])]),
  );
  line('### How long ago (age)');
  line();
  table(
    ['Age', 'Sign', 'Effect', 'Numbers'],
    P.age.map((h) => [h.label, h.sign, h.text, fields(h, ['id', 'label', 'sign', 'text'])]),
  );
  line('### How they ended (doom)');
  line();
  table(
    ['Doom', 'Sign', 'Effect', 'Numbers'],
    P.doom.map((h) => [h.label, h.sign, h.text, fields(h, ['id', 'label', 'sign', 'text'])]),
  );
  line('### Their sign (affinity): the mark on their gear');
  line();
  table(
    ['Sign', 'Effect', 'Modifiers', 'Colour'],
    P.affinity.map((h) => [h.name, h.text, mods(h.mods), hex(h.color)]),
  );
  line('### Who they were (style)');
  line();
  table(
    ['Style', 'Favoured finds', 'Name parts', 'Stone'],
    P.style.map((h) => [h.label, h.favors.join(', '), h.a.join('/') + ' + ' + h.b.join('/') + ' + ' + h.c.map((x) => x || '-').join('/'), hex(h.stone)]),
  );
});

section('Creatures', ['creature'], () => {
  const K = C.creature;
  line(
    'A species is a form, a name from its biome, a temper and, ' +
      Math.round(K.rareChance * 100) +
      '% of the time, a rare trait. ' +
      K.speciesPerWorld +
      ' species per biome; ' +
      K.count +
      ' creatures in the home region.',
  );
  line();
  table(
    ['Form', 'Hit points', 'Armor', 'To hit', 'Damage', 'XP', 'Special'],
    K.forms.map((f) => [f.name, f.hp[0] + ' +' + f.hp[1] + '/tier', f.ac, '+' + f.hit, f.dice[0] + 'd' + f.dice[1], f.xp, f.text]),
  );
  table(
    ['Temper', 'Behaviour'],
    K.tempers.map((t) => [t.id, t.text]),
  );
  table(
    ['Rare', 'Effect'],
    K.rares.map((t) => [t.name, t.text]),
  );
  table(
    ['Biome', 'Name prefixes'],
    Object.keys(K.prefix).map((k) => [k, K.prefix[k].join(', ')]),
  );
});

section('Items', ['bases', 'value', 'flasks', 'affixes'], () => {
  line('An item is a base, up to one prefix and one suffix, and sometimes a lost people\'s mark. "Weight" is how often it turns up.');
  line();
  table(
    ['Item', 'Slot', 'Carry wt', 'Find weight', 'Price', 'Does'],
    C.bases.map((b) => [
      b.name,
      b.slot || '',
      b.wt,
      b.w,
      C.value[b.id] !== undefined ? C.value[b.id] : '',
      [b.weapon ? b.weapon.dice[0] + 'd' + b.weapon.dice[1] + (b.weapon.finesse ? ' finesse' : '') : '', mods(b.mods), b.use ? JSON.stringify(b.use) : '', b.mystery ? 'one of the flasks below' : '', b.quest || '']
        .filter(Boolean)
        .join('; '),
    ]),
  );
  line('### Flasks (a flask is one of these, unknown until drunk or studied)');
  line();
  table(
    ['Flask', 'Effect'],
    C.flasks.map((f) => [f.name, JSON.stringify(f.use)]),
  );
  line('### Affixes');
  line();
  table(
    ['Affix', 'Place', 'Fits', 'Cursed', 'Modifiers'],
    C.affixes.map((a) => [
      a.name,
      a.pos === 'pre' ? 'prefix' : 'suffix',
      a.for === 'gear' ? 'any gear' : a.for.join(', '),
      a.cursed ? 'yes' : '',
      [mods(a.mods), a.wtMul !== undefined ? 'weight x' + a.wtMul : ''].filter(Boolean).join('; '),
    ]),
  );
});

section('The town', ['town'], () => {
  const T = C.town;
  table(
    ['Number', 'Value'],
    [
      ['Name parts', T.a.join('/') + ' + ' + T.b.join('/')],
      ['Always stocked', T.staples.join(', ')],
      ['Extra stock', T.stock + ' rolled items'],
      ['Fuel', T.fuel + ' at ' + T.fuelPrice + ' coin'],
      ['A bed', T.innPrice + ' coin'],
      ['Appraisal', T.appraisePrice + ' coin'],
      ['Sells at', Math.round(T.sellRate * 100) + '% of price'],
    ],
  );
});

section('The quest', ['quest'], () => {
  const Q = C.quest;
  table(
    ['Slot', 'Options'],
    [
      ['Who holds the key', Q.keys.join(', ')],
      ['The locked place', Q.vaults.map((v) => v.name + ' (guards: ' + v.guard + ')').join(', ')],
      ['The relic', Q.relics.join(', ') + ' (of the lost people)'],
      ['Where it goes', Q.dests.join(', ')],
      ['Beast names', Q.beastNames.join(', ')],
      ['Levels of the locked place', Q.floors.join(', ') + '; the last is always guard'],
    ],
  );
});

section('The year', ['year'], () => {
  const Y = C.year;
  line(
    'Every world has a year. ' +
      Math.round(Y.rareChance * 100) +
      '% of worlds roll from the rare menu instead. "Chance" is the share of worlds that get it.',
  );
  line();
  const tot = (l) => l.reduce((a, e) => a + (e.w || 1), 0);
  const row = (e, share) => [
    e.name,
    (share * 100).toFixed(1) + '%',
    e.text,
    [mods(e.mods), Object.keys(e.tun || {}).map((k) => k + ' ' + (e.tun[k][0] === 'mul' ? 'x' : '= ') + JSON.stringify(e.tun[k][1])).join('; '), e.day ? 'day ' + e.day[0] + ':00 to ' + e.day[1] + ':00' : '']
      .filter(Boolean)
      .join('; '),
  ];
  table(
    ['Year', 'Chance', 'Text', 'Effect'],
    Y.common.map((e) => row(e, ((1 - Y.rareChance) * (e.w || 1)) / tot(Y.common))),
  );
  line('### Rare years');
  line();
  table(
    ['Year', 'Chance', 'Text', 'Effect'],
    Y.rare.map((e) => row(e, (Y.rareChance * (e.w || 1)) / tot(Y.rare))),
  );
});

section('Rolled gods', ['pantheon'], () => {
  const P = C.pantheon;
  line(
    'A god is a gift, a cost and, ' +
      Math.round(P.vowChance * 100) +
      '% of the time, a vow, chosen so that its total worth is ' +
      P.target +
      ' give or take ' +
      P.spread +
      '. A cost never touches what the gift does. ' +
      Math.round(P.rareChance * 100) +
      '% of gods are rare. The gift names the god and colours its shrine.',
  );
  line();
  table(
    ['Gift', 'Domain', 'Worth', 'Text', 'Modifiers'],
    P.gifts.map((g) => [g.id, g.domain, g.worth, g.text, mods(g.mods)]),
  );
  table(
    ['Cost', 'Worth', 'Text', 'Modifiers'],
    P.costs.map((g) => [g.id, g.worth, g.text, mods(g.mods)]),
  );
  table(
    ['Vow', 'Worth', 'Text', 'Broken by'],
    P.vows.map((g) => [g.id, g.worth, g.text, g.breaks.join(', ') + (g.at ? ' at a ' + g.at : '')]),
  );
  table(
    ['Rare god', 'Text'],
    P.rares.map((g) => [g.name, g.text]),
  );
  table(
    ['Domain', 'Shrine colour', 'Titles'],
    P.domains.map((d) => [d.id, hex(d.color), d.titles.join('; ')]),
  );
  line('Names: ' + P.names.a.join('/') + ' + ' + P.names.b.join('/') + ', then a title from the domain.');
  line();
});

/* ---------------- writing it out ---------------- */

function render() {
  out.length = 0;
  covered.clear();
  line('# The Almanac');
  line();
  line('Every menu Far Beacon rolls from, and every option on it. Generated by `node tools/almanac.js` from `src/content/`;');
  line('do not edit by hand. `node tools/check.js` fails when it is out of date.');
  line();
  line('Contents: ' + sections.map((s) => s.title).join(', ') + '.');
  line();
  for (const s of sections) {
    use(...s.keys);
    line('## ' + s.title);
    line();
    s.fn();
  }
  const left = Object.keys(C).filter((k) => !covered.has(k));
  if (left.length) {
    line('## Not yet catalogued');
    line();
    line('These content menus have no section in tools/almanac.js yet: ' + left.join(', ') + '.');
    line();
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

const file = path.join(ROOT, 'ALMANAC.md');
const text = render();
if (process.argv.includes('--check')) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (old !== text) {
    console.log('ALMANAC.md is out of date: run node tools/almanac.js');
    process.exit(1);
  }
  console.log('almanac ok: ' + sections.length + ' sections');
} else {
  fs.writeFileSync(file, text);
  console.log('wrote ALMANAC.md: ' + sections.length + ' sections, ' + text.split('\n').length + ' lines');
}
