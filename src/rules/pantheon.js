/* Rolled gods: a gift, a cost and sometimes a vow, from content/pantheon.js, kept near a budget. Switch: s.off.godslots
   (the world's hand-written god from content/gods.js comes back). The rolled god is stored as ids in s.godRoll. */
import { C, byId, godMakers, on, say, siteHereKind, stream } from './core.js';
import { NOTES, SWITCHES } from './hooks.js';

const P = () => C.pantheon;
const statsOf = (list) => new Set(list.flatMap((e) => e.mods.map((m) => m.stat)));
const sum = (list) => list.reduce((a, e) => a + e.worth, 0);

function rollGod(seed) {
  const r = stream(seed, 'pantheon'),
    pick = (a) => a[Math.floor(r() * a.length)],
    T = P(),
    rare = r() < T.rareChance ? pick(T.rares) : null,
    gifts = [pick(T.gifts)];
  if (rare && rare.id !== 'generous') {
    const other = T.gifts.filter((g) => g.domain !== gifts[0].domain);
    gifts.push(pick(other));
  }
  let vow = null;
  if ((rare && rare.id === 'jealous') || (!rare && r() < T.vowChance)) vow = pick(T.vows);
  // costs: none for the generous or the jealous; otherwise as many as there are gifts, never touching what a gift does,
  // chosen so the god's total worth lands near the target
  let costs = [];
  if (!rare || rare.id === 'twin') {
    const taken = statsOf(gifts),
      ok = T.costs.filter((c) => ![...statsOf([c])].some((st) => taken.has(st))),
      n = gifts.length,
      combos = n === 1 ? ok.map((c) => [c]) : ok.flatMap((a, i) => ok.slice(i + 1).map((b) => [a, b])),
      score = (cs) => Math.abs(sum(gifts) + (vow ? vow.worth : 0) + sum(cs) - T.target),
      fit = combos.filter((cs) => score(cs) <= T.spread);
    // a god with a cost is preferred; if no cost fits (a small gift and a vow), the vow is its only price
    costs = fit.length ? pick(fit) : score([]) <= T.spread ? [] : combos.sort((a, b) => score(a) - score(b))[0] || [];
  }
  const dom = byId(T.domains, gifts[0].domain),
    one = (d) => pick(T.names.a) + pick(T.names.b) + ', ' + pick(d.titles);
  const name =
    rare && rare.id === 'twin'
      ? pick(T.names.a) + pick(T.names.b) + ' and ' + pick(T.names.a) + pick(T.names.b) + ', the Twins'
      : one(dom);
  return {
    name,
    domain: dom.id,
    gifts: gifts.map((g) => g.id),
    costs: costs.map((c) => c.id),
    vow: vow ? vow.id : null,
    rare: rare ? rare.id : null,
  };
}

// The world's god, built from its rolled parts: the same shape as an entry of content/gods.js.
function rolledGod(s) {
  const g = s.godRoll;
  if (!g || s.off.godslots) return null;
  const T = P(),
    gifts = g.gifts.map((id) => byId(T.gifts, id)),
    costs = g.costs.map((id) => byId(T.costs, id)),
    vow = g.vow ? byId(T.vows, g.vow) : null,
    rare = g.rare ? byId(T.rares, g.rare) : null,
    broken = !!s.pactBroken;
  return {
    id: s.god,
    name: g.name,
    color: byId(T.domains, g.domain).color,
    rolled: true,
    vow,
    rare,
    terms: [
      ...gifts.map((x) => x.text),
      ...costs.map((x) => x.text),
      vow ? vow.text + ' Break that, and the gift is gone.' : '',
      rare ? rare.text : '',
      broken ? '(You broke your vow. The gift is gone.)' : '',
    ]
      .filter(Boolean)
      .join(' '),
    mods: [...(broken ? [] : gifts.flatMap((x) => x.mods)), ...costs.flatMap((x) => x.mods)],
  };
}
godMakers.push(rolledGod);

on('worldBorn', (s, d) => {
  if (!d.off.godslots) s.godRoll = rollGod(s.seed);
});
// Vows: every action the player takes is announced as 'did'; one a vow forbids breaks it.
on('did', (s, d) => {
  if (d.id === 'pact') {
    s.pactBroken = false;
    return;
  }
  const g = rolledGod(s);
  if (!s.pact || !g || !g.vow || s.pactBroken || !g.vow.breaks.includes(d.id)) return;
  if (g.vow.at && d.site !== g.vow.at) return;
  s.pactBroken = true;
  say(s, 'You have broken your vow. ' + g.name + ' turns away from you: the gift is gone, and the cost is not.', 'bad');
});
SWITCHES.push(['godslots', 'Rolled gods']);
NOTES.push((s) => {
  const g = rolledGod(s);
  if (!g || !s.known.god) return [];
  return [{ label: 'The god: ' + g.name + (g.rare ? ' (' + g.rare.name.toLowerCase() + ', rare)' : ''), text: g.terms }];
});

export { rollGod, rolledGod };
