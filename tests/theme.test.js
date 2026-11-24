// Commission 9: Super Feline Mode. In the mode no player-facing text of the base game leaks through untranslated (as
// far as it can be gathered without a browser: content, the rules' and screens' strings, the log of played worlds,
// the goal line, the journal's notes), and with the mode off every text is exactly as it was. The rules never read
// the theme: a world played with it on and off is the same world.
const { Rules: R } = require('./lib');
const K = require('./corpus.js');
const W = require('./themewords.js');
const errs = [];
const need = (c, m) => c || errs.push(m);
const ID = 'feline',
  T = (x) => R.themed(x, ID),
  t = R.themeById(ID);
need(t, 'no feline theme in content');

// the words a catted text must not hold: names and core words of the base game, less those the theme itself uses
const banned = W.banned(R, ID);
for (const o of [t.exact, t.phrases, t.words])
  for (const k in o) for (const w of o[k].toLowerCase().match(/[a-z']+/g) || []) banned.delete(w.replace(/'s$/, ''));
const leaks = new Map();
function check(text, where) {
  if (typeof text !== 'string' || !/[A-Za-z]{2}/.test(text)) return;
  const y = T(text);
  if (y === text && /[A-Za-z]{4}/.test(text)) errs.length < 40 && errs.push(where + ': unchanged in the mode: "' + text + '"');
  for (const w of y.match(/[A-Za-z][A-Za-z']*/g) || []) {
    const lw = w.toLowerCase().replace(/'s$/, '');
    if (banned.has(lw) && !leaks.has(lw)) leaks.set(lw, where + ': "' + text + '" -> "' + y + '"');
  }
  need(R.themed(text, null) === text, where + ': changed with no theme: ' + text);
}
const content = [...new Set(K.contentStrings(R.C))],
  view = [...new Set(K.viewStrings())],
  rules = [...new Set(K.rulesStrings())];
for (const x of content) check(x, 'content');
for (const x of view) check(x, 'screens');
for (const x of rules) check(x, 'rules');

// played worlds: every log line, the goal, the place, the journal's notes, every name of every creature and town
let lines = 0;
for (let seed = 1; seed <= 25; seed++) {
  const s = R.newGame(seed);
  R.setTheme(s, ID);
  let r = seed * 7919;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300 && !s.over; i++) {
    if (s.combat || rnd() < 0.15) {
      const a = R.actions(s).filter((x) => typeof R[x.id] === 'function' && !/Ask$/.test(x.id));
      const x = a[Math.floor(rnd() * a.length)];
      if (x) R[x.id](s);
    } else {
      const d = [
        [1, 0],
        [0, 1],
        [0, -1],
        [-1, 0],
      ][Math.floor(rnd() * 4)];
      R.move(s, d[0], d[1]);
    }
  }
  for (const l of s.log) check(l.msg, 'log'), lines++;
  check(R.objective(s).text, 'goal');
  for (const n of R.worldNotes(s)) check(n.label, 'notes'), check(n.text, 'notes');
  for (const sp of s.species) check(sp.name, 'creature');
  check(s.town.name + ' of ' + s.town.elder, 'town');
  check(R.charTitle(s.char), 'traveller');
}
need(lines > 500, 'too few log lines played: ' + lines);
if (leaks.size)
  errs.push(leaks.size + ' base-game words leak through the mode, e.g.\n    ' + [...leaks.values()].slice(0, 12).join('\n    '));

// a sample, to see that it reads
const sample = ['You fill up at the spring.', 'Hound', 'The tyrant in the sky', 'Human Paladin', 'You rest for an hour.'];
const want = ['kibble bowl', 'Woofer', 'Vacuum Tyrant', 'Tabby Meowladin', 'nap'];
sample.forEach((x, i) => need(T(x).includes(want[i]), 'sample "' + x + '" gave "' + T(x) + '"'));
// names: built from content's syllables, they become cat names, the same every time
const town = R.newGame(3).town.name;
need(T(town) !== town && T(town) === T(town), 'the town name ' + town + ' is not catted: ' + T(town));
// "a" and "an" mended: an elf is a Siamese
need(T('You meet an elf.') === 'You meet a Siamese.', 'an elf: ' + T('You meet an elf.'));

// choosing and refusing: off by default, chosen, refused, and rolled about one world in fifty unless switched off
{
  let rolled = 0;
  for (let i = 1; i <= 2000; i++) {
    const s = R.newGame(i);
    if (R.themeOf(s)) rolled++;
  }
  need(rolled > 15 && rolled < 70, 'feline worlds rolled ' + rolled + ' of 2000 (want about 40)');
  const s = R.newGame(5);
  need(R.themeOf(s) === null || R.themeRolled(s), 'seed 5 is feline without being rolled');
  R.setTheme(s, ID);
  need(R.themeOf(s) === ID && !R.themeRolled(s), 'choosing the mode did not take');
  R.setTheme(s, null);
  need(R.themeOf(s) === null, 'refusing the mode did not take');
  let r = null;
  for (let i = 1; i <= 400 && !r; i++) if (R.themeRolled(R.newGame(i))) r = i;
  need(r, 'no rolled feline world in 400 seeds');
  if (r) {
    need(R.themeOf(R.newGame(r, { felineroll: true })) === null, 'NO=felineroll still rolled a feline world');
    const s2 = R.newGame(r);
    need(
      R.worldNotes(s2).some((n) => n.label === t.name),
      'a rolled feline world has no journal note',
    );
    // the save holds nothing new for a rolled world, and loads the same
    const back = R.deserialize(R.serialize(s2)).state;
    need(back && R.themeOf(back) === ID, 'a rolled feline world is not feline after loading');
  }
  // the rules ignore it: the same moves give the same world with the mode on and off
  const a = R.newGame(11),
    b = R.newGame(11);
  R.setTheme(a, ID);
  R.setTheme(b, null);
  for (let i = 0; i < 200; i++) for (const s of [a, b]) R.move(s, i % 3 ? 1 : 0, i % 3 ? 0 : 1);
  const strip = (s) => JSON.stringify(Object.assign({}, s, { theme: 0 }));
  need(strip(a) === strip(b), 'the mode changed what happens in a world');
}

if (errs.length) {
  console.log('theme problems:\n  ' + errs.join('\n  '));
  process.exit(1);
}
console.log(
  'theme ok: ' +
    (content.length + view.length + rules.length) +
    ' texts and ' +
    lines +
    ' log lines catted, ' +
    banned.size +
    ' words watched',
);
