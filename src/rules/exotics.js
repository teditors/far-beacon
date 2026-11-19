/* Exotic races and classes from content/exotics.js: now and then a world offers one in place of a usual race or
   class. They are added to C.races and C.classes (marked exotic) so everything else finds them; the usual draws
   leave them out. Switch: s.off.exotics (no exotic offered at creation; at runtime nothing changes for one chosen). */
import { C, byId, on, say, stream } from './core.js';
import { NOTES, SWITCHES } from './hooks.js';

if (!C.races.some((r) => r.exotic)) C.races.push(...C.exoticRaces);
if (!C.classes.some((r) => r.exotic)) C.classes.push(...C.exoticClasses);

on('worldBorn', (s, d) => {
  if (d.off.exotics) return;
  const r = stream(s.seed, 'exotics'),
    X = C.exotics,
    pick = (a) => a[Math.floor(r() * a.length)];
  if (r() < X.raceChance) s.offer.races[s.offer.races.length - 1] = pick(C.exoticRaces).id;
  if (r() < X.classChance) s.offer.classes[s.offer.classes.length - 1] = pick(C.exoticClasses).id;
  sworn(s);
});
// A sworn class sets out already bound to the god.
function sworn(s) {
  if (!s.char || !byId(C.classes, s.char.cls).sworn) return;
  s.pact = s.god;
  s.pactBroken = false;
}
on('did', (s, d) => {
  if (d.id !== 'setCharacter' && d.id !== 'nextTraveller') return;
  if (!byId(C.classes, s.char.cls).sworn) return;
  sworn(s);
  say(s, 'You set out sworn to the god of this land.', 'good');
});
SWITCHES.push(['exotics', 'Exotic races and classes']);
NOTES.push((s) => {
  const ex = [...s.offer.races.map((id) => byId(C.races, id)), ...s.offer.classes.map((id) => byId(C.classes, id))].filter(
    (e) => e.exotic,
  );
  return ex.map((e) => ({ label: 'Rare among travellers here: ' + e.name, text: e.text }));
});
// Names: a race can take its names from this world's lost people.
function exoticName(rnd, race, s) {
  if (race.namesFrom !== 'civ' || !s || !s.civ) return null;
  const st = byId(C.civ.style, s.civ.style),
    pick = (a) => a[Math.floor(rnd() * a.length)];
  return pick(st.a) + pick(st.b);
}

export { exoticName };
