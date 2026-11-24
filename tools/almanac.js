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
const cell = (v) =>
  String(v === undefined || v === null ? '' : v)
    .replace(/\|/g, '/')
    .replace(/\n/g, ' ');
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
    m.op === 'mul'
      ? m.stat + ' x' + +m.value.toFixed(3)
      : m.op === 'max'
        ? m.stat + ' at most ' + m.value
        : m.stat + ' ' + (m.value >= 0 ? '+' : '') + m.value;
  if (m.when) t += ' (' + m.when + ')';
  if (m.needsFuel) t += ' (needs fuel)';
  return t;
}
const mods = (list) => (list && list.length ? list.map(mod).join('; ') : '');
const fields = (o, skip) =>
  Object.keys(o)
    .filter((k) => !skip.includes(k) && o[k] !== undefined && o[k] !== false)
    .map((k) =>
      o[k] === true
        ? k
        : k + ' ' + (Array.isArray(o[k]) ? o[k].join('/') : typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k]),
    )
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
    C.races
      .filter((r) => !r.hybrid)
      .map((r) => [
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
      c.name + (c.exotic ? ' (exotic)' : ''),
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
  line(
    'The hand-written gods. Each world has one shrine. With rolled gods on (the default), these are only used when that switch is off.',
  );
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
    P.style.map((h) => [
      h.label,
      h.favors.join(', '),
      h.a.join('/') + ' + ' + h.b.join('/') + ' + ' + h.c.map((x) => x || '-').join('/'),
      hex(h.stone),
    ]),
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
    K.forms.map((f) => [
      f.name,
      f.hp[0] + ' +' + f.hp[1] + '/tier',
      f.ac,
      '+' + f.hit,
      f.dice[0] + 'd' + f.dice[1],
      f.xp,
      f.text,
    ]),
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
  line(
    'An item is a base, up to one prefix and one suffix, and sometimes a lost people\'s mark. "Weight" is how often it turns up.',
  );
  line();
  table(
    ['Item', 'Slot', 'Carry wt', 'Find weight', 'Price', 'Does'],
    C.bases.map((b) => [
      b.name,
      b.slot || '',
      b.wt,
      b.w,
      C.value[b.id] !== undefined ? C.value[b.id] : '',
      [
        b.weapon ? b.weapon.dice[0] + 'd' + b.weapon.dice[1] + (b.weapon.finesse ? ' finesse' : '') : '',
        mods(b.mods),
        b.use ? JSON.stringify(b.use) : '',
        b.mystery ? 'one of the flasks below' : '',
        b.quest || '',
      ]
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
    [
      mods(e.mods),
      Object.keys(e.tun || {})
        .map((k) => k + ' ' + (e.tun[k][0] === 'mul' ? 'x' : '= ') + JSON.stringify(e.tun[k][1]))
        .join('; '),
      e.day ? 'day ' + e.day[0] + ':00 to ' + e.day[1] + ':00' : '',
    ]
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

section('Named artifacts', ['artifacts'], () => {
  const A = C.artifacts;
  line(
    A.count +
      ' per world, each with a different power: one for sale in the town (' +
      A.value +
      ' coin on top of its base), one beside the relic, one in a cache in the farthest region. Named "<Name>, <Base> of the <lost people>".',
  );
  line();
  table(
    ['Power', 'Names', 'Can be', 'Does', 'Modifiers', 'Each hour'],
    A.powers.map((p) => [p.id, p.names.join('; '), p.for.join(', '), p.text, mods(p.mods), p.tick ? JSON.stringify(p.tick) : '']),
  );
});

section('Rare regions', ['regionRares'], () => {
  const X = C.regionRares;
  line(
    'Each region except home has a ' +
      Math.round(X.chance * 100) +
      '% chance of one of these. Its name goes before the biome ("Glowing High Moor"), and you are told on walking in.',
  );
  line();
  table(
    ['Rare', 'Text', 'Modifiers', 'When built'],
    X.list.map((x) => [x.name, x.text, mods(x.mods), x.gen ? fields(x.gen, []) : '']),
  );
});

section('Creature specials', ['specials'], () => {
  const X = C.specials;
  line(
    Math.round(X.chance * 100) +
      '% of species have one of these besides their form (never the named beast). Told when you first see or fight one.',
  );
  line();
  table(
    ['Special', 'Text', 'Numbers'],
    X.list.map((x) => [x.id, x.text, fields(x, ['id', 'text'])]),
  );
});

section('Exotic races and classes', ['exotics', 'exoticRaces', 'exoticClasses'], () => {
  const X = C.exotics;
  line(
    'The races and classes marked "(exotic)" above are offered only now and then: ' +
      Math.round(X.raceChance * 100) +
      '% of worlds offer one exotic race, and ' +
      Math.round(X.classChance * 100) +
      '% one exotic class, in place of one of the usual three. The Lostborn take their names from the lost people of the world; the Votary sets out already sworn to its god.',
  );
  line();
});

section('Town cultures', ['townCulture'], () => {
  const X = C.townCulture;
  line(
    'The living people of the town: one trade and one custom, and ' +
      Math.round(X.rareChance * 100) +
      "% of the time a rare culture as well. Their numbers act on the town's prices (town.* stats); told at the gate.",
  );
  line();
  const row = (x) => [
    x.name,
    x.text,
    mods(x.mods),
    [
      x.stock ? '+' + x.stock.n + ' of ' + x.stock.bases.join('/') : '',
      x.fuel ? '+' + x.fuel + ' fuel' : '',
      x.elder ? 'elder: ' + x.elder : '',
      x.marked ? x.marked + ' marked items' : '',
    ]
      .filter(Boolean)
      .join('; '),
  ];
  table(['Trade', 'Text', 'Modifiers', 'Other'], X.trades.map(row));
  table(['Custom', 'Text', 'Modifiers', 'Other'], X.customs.map(row));
  table(['Rare', 'Text', 'Modifiers', 'Other'], X.rares.map(row));
});

section('How towns look', ['townLooks'], () => {
  const X = C.townLooks;
  line(
    "For the view only (commission 5): a town is built of what its land's climate offers, dressed by its trade and coloured by its custom. The hand-made biomes' climates: " +
      Object.entries(X.biomeClimate)
        .map(([b, c]) => b + ' ' + c)
        .join(', ') +
      '.',
  );
  line();
  table(
    ['Climate', 'Walls', 'Roof', 'Storeys', 'Town wall'],
    Object.entries(X.climates).map(([id, c]) => [
      id,
      (c.wallMix || [c.walls]).join('/') + (c.timber ? ', timber-framed' : ''),
      c.roof + ' of ' + (c.roofMix || [c.roofTex]).join('/') + (c.snow ? ', snow' : ''),
      c.storeys.join('/'),
      c.outer,
    ]),
  );
  table(
    ['Trade', 'In the streets', 'Chimneys', 'Awnings'],
    Object.entries(X.trades).map(([id, c]) => [id, c.props.join(', '), Math.round(c.chimneys * 100) + '%', c.awning]),
  );
  table(
    ['Custom', 'Banners', 'Lamps', 'Other'],
    Object.entries(X.customs).map(([id, c]) => [
      id,
      c.banners.join(', ') || 'none',
      String(c.lanterns),
      ['flowers', 'fences', 'tower', 'shrine', 'stones'].filter((k) => c[k]).join(', '),
    ]),
  );
  table(
    ['Rare', 'Changes'],
    Object.entries(X.rares).map(([id, c]) => [id, Object.keys(c).join(', ')]),
  );
});

section('Things', ['things'], () => {
  const X = C.things;
  line(
    'Commission 7: the ordinary things in rooms, ruins, caves and levels, made from the seed when a place is seen ' +
      '(src/rules/things.js) and never stored; only what is taken is kept. Furniture stays put; the rest can be carried. ' +
      'Old things (in ruins, caves, levels and empty houses) are worth half, and ' +
      Math.round(X.secrets.chance * 100) +
      '% of those that could be are secretly valuable.',
  );
  line();
  table(
    ['Thing', 'Weight', 'Worth', 'Grades', 'Old', 'Use'],
    X.kinds.map((k) => [
      k.name,
      k.fixed ? 'furniture' : k.wt,
      k.fixed ? '' : k.value,
      k.grades ? k.grades.join(' / ') : '',
      k.fixed ? '' : k.old || X.oldWord,
      k.use
        ? Object.entries(k.use)
            .map(([a, b]) => a + ' ' + b)
            .join(', ')
        : '',
    ]),
  );
  line();
  const list = (l) => (l || []).map(([k]) => k).join(', ');
  table(
    ['Room', 'Along the walls', 'In the middle', 'Small things'],
    Object.entries(X.rooms).map(([k, r]) => [k, list(r.wall), list(r.middle), list(r.small)]),
  );
  line();
  table(
    ['Building', 'Rooms, the first by the door'],
    Object.entries(X.buildings).map(([k, r]) => [k, r.join(', ')]),
  );
  line();
  table(
    ['Place', 'Furniture', 'Things', 'Abandoned'],
    Object.entries(X.places).map(([k, r]) => [k, list(r.wall), list(r.small), r.old ? 'yes' : 'lived in']),
  );
  line();
  table(
    ['Secret', 'Hidden in', 'Appraised as', 'Worth'],
    X.secrets.list.map((x) => [x.id, x.of.join(', '), x.name, x.value]),
  );
  line();
});
section('The score', ['music'], () => {
  const X = C.music;
  line(
    'For the view only (commission 7): a tune for each kind of place, composed bar by bar from a theme rolled from the ' +
      "place's name (src/view/score.js), so a place always sounds like itself and never quite the same. A place with " +
      'no entry of its own takes the nearest along its name. Events: ' +
      Object.keys(X.events).join(', ') +
      '.',
  );
  line();
  table(
    ['Dance', 'Beats a bar', 'Tempo', 'Bass'],
    Object.entries(X.dances).map(([k, d]) => [k, d.beats + (d.sub === 3 ? ' (in threes)' : ''), d.tempo, d.bass]),
  );
  line();
  table(
    ['Place', 'Dance', 'Mode', 'Key', 'Voice', 'Also'],
    Object.entries(X.places).map(([k, p]) => [
      k,
      p.dance,
      p.mode,
      p.root,
      p.voice,
      ['inner', 'pad', 'drone', 'drums'].filter((f) => p[f]).join(', '),
    ]),
  );
  line();
});
section('The look', ['looks'], () => {
  const X = C.looks,
    sw = (e) =>
      ['zenith', 'horizon', 'sun', 'shade', 'lift', 'gain']
        .filter((k) => e[k])
        .map((k) => k + ' ' + e[k])
        .join(', ');
  line(
    'For the view only (commission 6): the palette and style a place is seen in, built in layers: the climate by day, ' +
      "this world's turn of it, a rare look, another world's style, the year, the great trouble (faintly, " +
      Math.round(X.troubleK * 100) +
      '%), a curse (' +
      Math.round(X.curseK * 100) +
      "%), the country's rare trait, the weather, dusk and night. See ART.md. Hand-made biomes' climates: " +
      Object.entries(X.biomeClimate)
        .map(([b, c]) => b + ' ' + c)
        .join(', ') +
      '.',
  );
  line();
  table(
    ['Climate', 'Mood', 'Varies by world', 'Colours'],
    Object.entries(X.climates).map(([id, c]) => [
      id,
      c.name,
      c.vary ? 'hue ' + c.vary.hue[0] + '° to +' + c.vary.hue[1] + '°, saturation ±' + Math.round(c.vary.sat * 100) + '%' : 'no',
      sw(c),
    ]),
  );
  line(
    'Rare looks: a whole world ' +
      Math.round(X.worldChance * 100) +
      '% of the time, otherwise one country ' +
      Math.round(X.countryChance * 100) +
      '% of the time (never home).',
  );
  line();
  table(
    ['Rare look', 'Pull', 'Colours'],
    X.odd.map((e) => [e.name, Math.round(e.k * 100) + '%', sw(e)]),
  );
  const st = X.realm.style;
  line(
    'Other worlds: ' +
      st.name +
      ' (' +
      st.bands +
      ' bands, sun ' +
      st.sunK +
      ', fill ' +
      st.fillK +
      ', saturation ' +
      st.sat +
      '), in one of these palettes, by the world:',
  );
  line();
  table(
    ['Palette', 'Colours', 'Outline tint'],
    X.realm.palettes.map((e) => [e.name, sw(e), e.ink]),
  );
  const layers = [
    ['Hour', 'dusk', X.dusk],
    ['Hour', 'night', X.night],
  ]
    .concat(Object.entries(X.weather).map(([k, e]) => ['Weather', k, e]))
    .concat(Object.entries(X.years).map(([k, e]) => ['Year', k, e]))
    .concat(Object.entries(X.troubles).map(([k, e]) => ['Trouble', k, e]))
    .concat(Object.entries(X.rares).map(([k, e]) => ['Rare country', k, e]));
  table(
    ['Layer', 'Of', 'Name', 'Pull', 'Changes'],
    layers.map(([a, b, e]) => [
      a,
      b,
      e.name,
      e.k === undefined ? '-' : Math.round(e.k * 100) + '%',
      Object.keys(e)
        .filter((k) => k !== 'name' && k !== 'k')
        .join(', '),
    ]),
  );
});

section('Errands', ['errands'], () => {
  const X = C.errands;
  line(
    'Work at the inn, one errand at a time, in a region next to home. ' +
      Math.round(X.liarChance * 100) +
      '% of those who ask are lying and will not pay; they always show a tell. An honest errand pays coin and, ' +
      Math.round(X.itemChance * 100) +
      '% of the time, a good item.',
  );
  line();
  table(
    ['Errand', 'Offer', 'Coin'],
    X.kinds.map((k) => [k.id, k.text, k.reward.join(' to ')]),
  );
  table(
    ['Slot', 'Options'],
    [
      ['Who asks', X.givers.join(', ')],
      ['Tells of a liar', X.tells.join('; ')],
      ['Victims', X.kinds[0].victims.join(', ')],
      ['Things to fetch', X.kinds[1].things.join(', ')],
    ],
  );
});

section('Odd weather', ['oddWeather'], () => {
  const X = C.oddWeather;
  line(
    Math.round(X.chance * 100) + "% of storms are one of these instead of the biome's own. Cold is per hour (negative warms).",
  );
  line();
  table(
    ['Weather', 'Cold', 'Text', 'Modifiers', 'Other'],
    X.list.map((w) => [
      w.name,
      w.cold,
      w.text,
      mods(w.mods),
      [w.hurt ? w.hurt + ' hit points an hour in the open' : '', w.star ? 'leaves a fallen star holding an item' : '']
        .filter(Boolean)
        .join('; '),
    ]),
  );
});

section('Generated biomes', ['biomeGen'], () => {
  const X = C.biomeGen;
  line(
    'Every world makes ' +
      X.perWorld +
      ' biomes of its own from these slots. Each region away from home is one of them ' +
      Math.round(X.regionChance * 100) +
      '% of the time, the home region ' +
      Math.round(X.homeChance * 100) +
      '%. Water, woodland and ground are drawn only from those that suit the climate. ' +
      Math.round(X.rareChance * 100) +
      '% of generated biomes are rare. The name is a word of the climate and a noun of the landform.',
  );
  line();
  table(
    ['Climate', 'Words', 'Day cold/warm', 'Night cold/warm', 'Storm', 'Other'],
    X.climates.map((c) => [
      c.id,
      c.words.join(', '),
      c.day.cold + '/' + c.day.warm + (c.day.mods.length ? ' ' + mods(c.day.mods) : ''),
      c.night.cold + '/' + c.night.warm,
      c.storm.name + ', cold ' + c.storm.cold + (c.storm.mods.length ? ', ' + mods(c.storm.mods) : ''),
      c.melt ? 'snow melts for ' + c.melt : '',
    ]),
  );
  table(
    ['Landform', 'Hills', 'Mountains', 'Nouns'],
    X.landforms.map((l) => [l.id, pct(l.hills).replace('+', ''), pct(l.mountains).replace('+', ''), l.nouns.join(', ')]),
  );
  table(
    ['Water', 'Climates', 'Springs', 'Foul', 'River', 'Minutes', 'Stamina', 'Other'],
    X.waters.map((w) => [
      w.id,
      w.climates.join(', '),
      w.springs,
      pct(w.foul).replace('+', ''),
      w.river.name,
      w.river.moveMin,
      w.river.moveSta,
      [fields(w.river, ['name', 'count', 'moveMin', 'moveSta', 'mods']), mods(w.river.mods)].filter(Boolean).join('; '),
    ]),
  );
  table(
    ['Woodland', 'Climates', 'Share', 'Minutes', 'Stamina', 'Other'],
    X.woodlands.map((w) => [
      w.forest.name,
      w.climates.join(', '),
      pct(w.forest.frac).replace('+', ''),
      w.forest.moveMin,
      w.forest.moveSta,
      [fields(w.forest, ['name', 'frac', 'moveMin', 'moveSta', 'mods', 'tree']), mods(w.forest.mods)].filter(Boolean).join('; '),
    ]),
  );
  table(
    ['Ground', 'Climates', 'Share', 'Minutes', 'Stamina', 'Other'],
    X.grounds.map((w) => [
      w.special.name,
      w.climates.join(', '),
      pct(w.special.frac).replace('+', ''),
      w.special.moveMin,
      w.special.moveSta,
      [fields(w.special, ['name', 'frac', 'moveMin', 'moveSta', 'mods']), mods(w.special.mods)].filter(Boolean).join('; '),
    ]),
  );
  table(
    ['Rare', 'Name word', 'Text'],
    X.rares.map((r) => [r.id, r.word, r.text]),
  );
});

section('Odd levels below', ['floorKinds'], () => {
  const X = C.floorKinds;
  line(
    'Each level of the locked place above the last is one of these ' +
      Math.round((X.chance - X.rareChance) * 100) +
      '% of the time, and the rare one ' +
      Math.round(X.rareChance * 100) +
      '%, instead of a guard, loot or trap level.',
  );
  line();
  table(
    ['Level', 'Text', 'Numbers', 'Modifiers'],
    [...X.list, X.rare].map((k) => [
      k.id + (k === X.rare ? ' (rare)' : ''),
      k.text,
      fields(k, ['id', 'text', 'mods']),
      mods(k.mods),
    ]),
  );
});

section("The relic's nature", ['relicNatures'], () => {
  line('What the relic does while you carry it, by the first word of its name. Told when you first pick it up.');
  line();
  table(
    ['Relic', 'Text', 'Modifiers'],
    Object.keys(C.relicNatures).map((k) => [k, C.relicNatures[k].text, mods(C.relicNatures[k].mods)]),
  );
});

section('Lairs', ['lairs'], () => {
  const X = C.lairs;
  line(
    Math.round(X.chance * 100) +
      '% of regions away from home have a lair: a creature that is the only one of its kind (always elder, tier 2 or 3, guards its ground) in a cave, on ' +
      X.hoard.coin.join(' to ') +
      ' coin and ' +
      X.hoard.items +
      ' good items. Named: ' +
      X.names.join(', ') +
      ', then a name of its biome and its form.',
  );
  line();
});

section('Far finds', ['farFinds'], () => {
  line(
    'For each region of distance from home, a search of a ruin, cave or cache has a ' +
      Math.round(C.farFinds.chance * 100) +
      '% chance of one more good item.',
  );
  line();
});

section('Town life', ['townLife'], () => {
  const X = C.townLife;
  line(
    'The size of a town sets how many services and townsfolk it has, how much is for sale, and how likely a wall is. Every town has the elder, the inn and the shop; services are added from those its culture calls for (always), then at random.',
  );
  line();
  table(
    ['Size', 'Chance weight', 'Services', 'Townsfolk', 'Extra stock', 'Walled', 'Graveyard'],
    X.sizes.map((z) => [z.name, z.w, z.services, z.folk, z.stock, pct(z.walled).replace('+', ''), z.graveyard ? 'yes' : '']),
  );
  table(
    ['Service', 'Person', 'Always in a town of', 'Text'],
    X.services.map((v) => [v.id, v.role, v.always.join(', '), v.text]),
  );
  table(
    ['Price', 'Coin'],
    Object.keys(X.prices).map((k) => [k, X.prices[k]]),
  );
  line(
    'A trainer offers ' +
      X.lessonsOffered +
      ' lessons, and a traveller learns at most ' +
      X.maxLessons +
      '. Lessons die with the traveller.',
  );
  line();
  table(
    ['Lesson', 'Price', 'Text', 'Modifiers'],
    X.lessons.map((l) => [l.name, l.price, l.text, mods(l.mods)]),
  );
  line('A blessing lasts ' + X.blessing.hours + ' hours: ' + mods(X.blessing.mods) + '. A pack mule: ' + mods(X.mule.mods) + '.');
  line();
  line(
    'Townsfolk tell rumours that mark real places (a lair, the far artifact, a sweet spring, the shrine, a rare country), teach a trait of the lost people, or warn of a creature; otherwise one of ' +
      X.flavour.length +
      ' lines of talk. Graves carry one of ' +
      X.epitaphs.length +
      ' epitaphs.',
  );
  line();
});

section('The roster', ['roster'], () => {
  const X = C.roster,
    hy = C.races.filter((r) => r.hybrid);
  line(
    'A world offers ' +
      X.offer.races.join(' to ') +
      ' races and ' +
      X.offer.classes.join(' to ') +
      ' classes, drawn with weights: usual ' +
      X.offer.weights.usual +
      ', hybrid ' +
      X.offer.weights.hybrid +
      ', exotic ' +
      X.offer.weights.exotic +
      '. The first traveller is one of them.',
  );
  line();
  line(
    'A frail class (hit die d' +
      X.frail.hd +
      ' or less) sets out with ' +
      X.frail.items.join(', ') +
      ', ' +
      X.frail.coin +
      ' more coin and its skins topped up.',
  );
  line();
  line(
    'Hybrids (' +
      hy.length +
      "), one for every pair of usual races, with half of each parent's modifiers: " +
      hy.map((r) => r.name).join(', ') +
      '.',
  );
  line();
  const extra = (e) =>
    [
      e.start ? 'starts with ' + JSON.stringify(e.start) : '',
      e.tick ? 'each hour ' + JSON.stringify(e.tick) : '',
      e.onKill ? 'on a kill ' + JSON.stringify(e.onKill) : '',
    ]
      .filter(Boolean)
      .join('; ');
  table(
    ['Race', 'Kind', 'Beyond its modifiers'],
    C.races.filter((r) => !r.hybrid && extra(r)).map((r) => [r.name, r.exotic ? 'exotic' : 'usual', extra(r)]),
  );
  table(
    ['Class', 'Fight moves', 'Beyond its modifiers'],
    C.classes
      .filter((c) => c.moves || extra(c))
      .map((c) => [c.name, (c.moves || []).map((m) => m.label + ' (' + m.hint + ')').join('; '), extra(c)]),
  );
});

section('Hamlets', ['hamlets'], () => {
  const X = C.hamlets;
  line(
    Math.round(X.chance * 100) +
      '% of regions away from home have a hamlet: a well, shelter, a bed for ' +
      X.bed +
      ' coin, wood for ' +
      X.fuel +
      ', and a rumour. Named ' +
      X.a.join('/') +
      ' + ' +
      X.b.join('/') +
      '.',
  );
  line();
  table(
    ['Goods', 'Price'],
    X.goods.map((g) => [g.base, g.price]),
  );
});

section('Tiers by distance', ['tiers'], () => {
  line(
    'An item with affixes found in a region away from home is finer: tier 1 + the distance of that region from home (+1 on the deepest level of the locked place), at most ' +
      C.tiers.max +
      ". A Fine (2) or Superb (3) item's affixes, curses included, do " +
      C.tiers.step * 100 +
      '% more per tier above the first. Its fineness shows even before it is studied, and adds 8 coin of value per tier.',
  );
  line();
});

section('Crafting', ['crafting'], () => {
  const X = C.crafting;
  line(
    'Materials are carried in the pack and weigh something; wood is your fuel. Kills leave ' +
      Object.keys(X.kills)
        .map((f) => f + 's ' + JSON.stringify(X.kills[f]))
        .join(', ') +
      ' (one more of each from a tier 3 creature); searching a ruin, cache or cave gives ' +
      JSON.stringify(X.search) +
      '; gathering wood finds herbs ' +
      Math.round(X.herbChance * 100) +
      '% of the time.',
  );
  line();
  table(
    ['Material', 'Weight', 'Value', 'Notes'],
    X.mats.map((m) => [m.name, m.wt, m.value, m.text]),
  );
  table(
    ['Recipe', 'Needs', 'Minutes', 'Makes'],
    X.recipes.map((r) => [
      r.name,
      Object.keys(r.needs)
        .map((k) => r.needs[k] + ' ' + (k === 'fuel' ? 'wood' : k))
        .join(', '),
      r.mins,
      r.text,
    ]),
  );
});

section('Trade', ['trade'], () => {
  const X = C.trade;
  line(
    'A town that makes a good sells it at ' +
      X.made +
      ' of its price and has ' +
      X.stock.join(' to ') +
      ' to sell; one that does not pays ' +
      X.wanted +
      " times. Each town's prices wander " +
      Math.round(X.wander * 100) +
      '% either way, and a town buys from you at ' +
      X.spread +
      ' of its own price. Materials from crafting sell in every town at their value.',
  );
  line();
  table(
    ['Good', 'Price', 'Weight', 'Made where'],
    X.goods.map((g) => [g.name, g.price, g.wt, JSON.stringify(g.made)]),
  );
  table(
    ['Year', 'Prices'],
    Object.keys(X.year).map((y) => [y, JSON.stringify(X.year[y])]),
  );
});

section('Plots', ['plots'], () => {
  const X = C.plots;
  line(
    "Every world has one great trouble, told by the elder of the story's town; finishing it wins the world, with its own ending. When it is not the relic, the old story is still there, told on the next talk, and carrying the relic home pays " +
      X.relicSide.coin +
      ' coin. Each other town may have a trouble of its own (' +
      X.side.join(' to ') +
      ' in a world), paying ' +
      X.reward.coin.join(' to ') +
      ' coin. A sickness and a great beast in one world: ' +
      Math.round(X.linkChance * 100) +
      "% of the time the cure is in the beast's hoard. Finishing a side trouble tells you of the next one " +
      Math.round(X.chainChance * 100) +
      '% of the time. A town you crossed in a feud sells at ' +
      X.hostile.buy +
      ' times the price; one you helped at ' +
      X.friend.buy +
      '.',
  );
  line();
  table(
    ['Plot', 'As the great trouble', 'As a side trouble', 'Steps'],
    X.kinds.map((k) => [
      k.name,
      k.main || '',
      k.side || '',
      k.steps ? k.steps.map((st) => st.text).join('; ') + (k.branches ? '; then by the side chosen' : '') : k.text,
    ]),
  );
  line();
  table(
    ['Place', 'Told'],
    Object.keys(X.sites).map((k) => [X.sites[k].name, X.sites[k].text]),
  );
});

section('More towns', ['moreTowns'], () => {
  const X = C.moreTowns;
  line(
    'Besides the town of the story, one more town for about every ' +
      X.perRegions +
      ' regions (at least ' +
      X.least +
      ', at most ' +
      X.most +
      '), never at home and never two in a region. Each is made like the first: a name, an elder, a merchant, a shop, a size and services (town life), a culture (town cultures) and its own streets.',
  );
  line();
});

section('The size of the world', ['worldSize'], () => {
  const X = C.worldSize;
  line(
    'Rolled from the seed before the land is made (a year that sets the size, such as the wide world, wins). At most ' +
      X.most +
      ' regions. Turned on its side means the across and down ranges may swap.',
  );
  line();
  table(
    ['Shape', 'Weight', 'Across', 'Down', 'On its side', 'Told'],
    X.shapes.map((e) => [e.name, e.w, e.cols.join(' to '), e.rows.join(' to '), e.swap ? 'yes' : '', e.text]),
  );
});

section('World settings', ['worldSet'], () => {
  const X = C.worldSet;
  line(
    'The choices on the new world screen (folded away: an ordinary world uses the defaults). They are plain settings passed into `newGame(seed, off, set)`, and the playtest takes them as `SET=key=value,...`.',
  );
  line();
  const label = { size: 'cols, rows' };
  table(
    ['Setting', 'Default', 'Offered'],
    Object.keys(X.menus).map((k) => [
      label[k] || k,
      k === 'size' ? 'rolled' : JSON.stringify(X.defaults[k]),
      X.menus[k].map((o) => o[1]).join('; '),
    ]),
  );
  line();
});

section('Dungeons', ['deeps'], () => {
  const X = C.deeps;
  line(
    'Places below the world, rolled when the world is made: about ' +
      X.perRegion +
      ' a region at the usual setting, and a cellar under ' +
      Math.round(X.townChance * 100) +
      '% of towns. Each goes ' +
      X.depth.join(' to ') +
      ' levels down (the world setting caps it; a dungeon the plot uses goes ' +
      X.plotDepth.join(' to ') +
      '). A level is built the first time you reach it. ' +
      Math.round(X.quirkChance * 100) +
      '% of levels above the bottom are odd levels (see Odd levels below). The bottom holds a store-room and a Heart, an elder of the theme; the deepest dungeon of a world also holds a named artifact.',
  );
  line();
  table(
    ['Theme', 'Entered from', 'Layout', 'Dark', 'Creatures', 'Tier (level 1, per level)', 'Per level', 'Traps', 'Pools', 'Told'],
    X.themes.map((t) => [
      t.name,
      t.entry.join(', '),
      t.layout,
      t.dark === false ? 'no (it glows)' : 'yes',
      t.creature.join(' / ') + ' ' + t.forms.join(', '),
      t.tier.join(', '),
      t.per,
      t.traps,
      t.pools,
      t.text,
    ]),
  );
  line();
});

section('The sky', ['sky'], () => {
  const X = C.sky;
  line(
    'Places in the sky come in about 1 world in ' +
      Math.round(1 / X.chance) +
      ' (the world setting), ' +
      X.places.join(' to ') +
      " of them, over the far country, each marked on the ground by a shadow with no cloud to cast it. Flying: aloft, every kind of ground costs the same short time, nothing on the ground can reach you, and you can fly up to a sky place from its shadow; but each tile costs stamina (times the item's flyEffort), you are " +
      X.cold +
      ' colder an hour and use ' +
      X.thirst +
      ' times the water, a storm throws you down (' +
      X.fall.join(' to ') +
      ' damage), below ' +
      X.lowStamina +
      " stamina you must land, and you must land to drink, search, gather, make a fire or sleep. A world with sky places always has a way to fly within reach: Boots of the Updraft in a town's shop, or with the deepest dungeon's prize.",
  );
  line();
  table(
    ['Flying item', 'Slot', 'Weight', 'Does'],
    X.items.map((b) => [
      b.name,
      b.slot,
      b.wt,
      b.mods.map((m) => m.stat + ' ' + (m.op === 'mul' ? 'x' : '+') + m.value).join(', '),
    ]),
  );
  line();
  table(
    ['Place', 'Levels', 'Weight', 'Creatures', 'Tier', 'Told'],
    X.kinds.map((k) => [
      k.name + (k.rare ? ' (rare)' : ''),
      k.levels,
      k.weight,
      k.creature.join(' / ') + (k.forms.length ? ' ' + k.forms.join(', ') : 'people'),
      k.tier || '',
      k.text,
    ]),
  );
  line();
});

section('The sea', ['sea'], () => {
  const X = C.sea;
  line(
    'In about ' +
      Math.round(X.chance * 100) +
      '% of worlds big enough to have country far from home (the world setting), ' +
      X.regions.join(' to ') +
      ' neighbouring far regions are open sea, with islands where the land stands high. ' +
      Math.round(X.lakeChance * 100) +
      '% of other regions with sweet water have a lake: deep in the middle, a wadeable margin. Deep water needs a boat (a coracle, carried), a way to breathe water (a diving helm, or a draught of gills for ' +
      X.breathHours +
      ' hours) or wings; walking along the bottom is twice as slow. Under water with no way to breathe you lose ' +
      X.drown +
      ' health an hour. The town nearest the sea sells ' +
      X.shop.join(', ') +
      '.',
  );
  line();
  table(
    ['Item', 'Weight', 'Price', 'Does'],
    X.items.map((b) => [
      b.name,
      b.wt,
      X.value[b.id],
      b.boat
        ? 'crosses deep water'
        : b.use
          ? 'breathe water for ' + b.use.breathe + ' hours'
          : b.mods.map((m) => m.stat).join(', '),
    ]),
  );
  line();
  table(
    ['Place', 'Where', 'Levels', 'Creatures', 'Told'],
    X.kinds.map((k) => [
      k.name,
      (k.lake ? 'a lake' : k.coast ? 'a sea shore' : 'the sea') + (k.under ? ', under the water' : ', on the water'),
      k.levels,
      k.forms.length ? k.creature.join(' / ') + ' ' + k.forms.join(', ') : k.trader ? 'people: ' + k.trader.name : '',
      k.text,
    ]),
  );
  line();
});

section('Other worlds', ['realms'], () => {
  const X = C.realms;
  line(
    'Rarely (the doors world setting) a world has a door of old stone in one of its regions, and through it lies another world: made from a seed of its own, ' +
      X.sizes.map((z) => z.join(' x ')).join(', ') +
      ' regions, its countries its own ' +
      Math.round(X.genChance * 100) +
      '% of the time and something strange in ' +
      Math.round(X.rareChance * 100) +
      '% of its regions, with one town of its own. A second door (and a third) comes ' +
      Math.round(X.moreDoors * 100) +
      '% of the time. Only the regions you or the plot touch are made. The plot always uses a door.',
  );
  line();
  line('Names: ' + X.names.join(', ') + '.');
  line();
});

section('Kin of the new places', ['kin'], () => {
  const X = C.kin;
  line(
    'Two rare races, offered beside the usual ones (each ' +
      Math.round(X.chance * 100) +
      '% of the time) only in a world that has what they were born to.',
  );
  line();
  table(
    ['Race', 'In a world with', 'Abilities', 'Does'],
    X.races.map((r) => [
      r.name,
      r.kin === 'sky' ? 'places in the sky' : 'a sea',
      Object.keys(r.adj)
        .map((k) => (r.adj[k] > 0 ? '+' : '') + r.adj[k] + ' ' + k)
        .join(', '),
      r.text,
    ]),
  );
  line();
});

section('Wayfarers', ['wayfarers'], () => {
  const X = C.wayfarers;
  line(
    'People at a small fire in the wilds, in ' +
      Math.round(X.chance * 100) +
      '% of regions away from home, put there when the region is first built. Once dealt with, each moves on.',
  );
  line();
  table(
    ['Wayfarer', 'Weight', 'Offers', 'Says'],
    X.kinds.map((k) => [k.name, k.weight, Object.keys(k.offers).join(', '), k.talk]),
  );
  line();
});

section('Themes: Super Feline Mode', ['themes'], () => {
  for (const t of C.themes) {
    const T = (x) => R.themed(x, t.id);
    line(
      '**' +
        t.name +
        '** (`' +
        t.id +
        '`): the same rules, every word in its own. Rolled by itself in about 1 world in ' +
        Math.round(1 / t.rare) +
        ' (switch `' +
        t.id +
        'roll`). ' +
        Object.keys(t.exact).length +
        ' whole texts, ' +
        Object.keys(t.phrases).length +
        ' phrases and ' +
        Object.keys(t.words).length +
        ' words are renamed; names built from content get a name in its style (' +
        t.nameStyles.join(', ') +
        '); a text with nothing renamed gets a flourish (' +
        t.flourishes.join(' ') +
        ').',
    );
    line();
    table(
      ['Race', 'As a cat'],
      C.races.filter((r) => !/-/.test(r.id)).map((r) => [r.name, T(r.name)]),
    );
    table(
      ['Class', 'As a cat'],
      C.classes.map((c) => [c.name, T(c.name)]),
    );
    table(
      ['Creature', 'As a cat sees it'],
      C.creature.forms.map((f) => [f.name, T(f.name)]),
    );
    table(
      ['Trouble', 'As a cat'],
      C.plots.kinds.map((k) => [k.name, T(k.name)]),
    );
    table(
      ['Item', 'As a cat'],
      C.bases.map((b) => [b.name, T(b.name)]),
    );
    table(['Whole text', 'Becomes'], Object.entries(t.exact));
    table(['Phrase', 'Becomes'], Object.entries(t.phrases));
    table(['Word', 'Becomes'], Object.entries(t.words));
  }
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
