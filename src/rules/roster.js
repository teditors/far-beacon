/* The roster, from content/roster.js: many more races and classes (and hybrids of the usual races), many more of them
   offered per world, and what makes them play differently: fight moves, starting goods, gains each hour and on each
   kill. Switch: s.off.roster (at creation: the old three-and-three offer; in play: moves, ticks and kill gains stop). */
import { C, byId, clamp, on, say, srand, stream } from './core.js';
import { spawn } from './character.js';
import { enemyTurn, foe, spOf, strike } from './combat.js';
import { roll } from './progress.js';
import { makeItem } from './items.js';
import { SYSTEMS } from './systems.js';
import { waterCap } from './stats.js';
import { ACTIONS, NOTES, SWITCHES } from './hooks.js';

const X = () => C.roster;
const OLD_USUAL = ['human', 'dwarf', 'elf', 'halfling', 'orc'];

/* ---------- the new races, classes and hybrids join the content lists ---------- */
if (!C.races.some((r) => r.roster)) {
  for (const r of X().races) C.races.push(Object.assign({ roster: true }, r));
  for (const c of X().classes) C.classes.push(Object.assign({ roster: true }, c));
  // hybrids: every pair of usual races, half of each
  const usual = C.races.filter((r) => !r.exotic && (OLD_USUAL.includes(r.id) || r.roster)),
    half = (m) =>
      Object.assign({}, m, { value: m.op === 'mul' ? 1 + (m.value - 1) / 2 : m.op === 'add' ? m.value / 2 : m.value });
  for (let i = 0; i < usual.length; i++)
    for (let j = i + 1; j < usual.length; j++) {
      const a = usual[i],
        b = usual[j],
        adj = {};
      for (const k of new Set([...Object.keys(a.adj), ...Object.keys(b.adj)])) {
        const v = Math.round(((a.adj[k] || 0) + (b.adj[k] || 0)) / 2);
        if (v) adj[k] = v;
      }
      C.races.push({
        id: 'hy-' + a.id + '-' + b.id,
        roster: true,
        hybrid: true,
        name: a.name.replace(/^Half-/, '') + '-' + b.name.replace(/^Half-/, '').toLowerCase(),
        adj,
        text: 'Half ' + a.name.toLowerCase() + ', half ' + b.name.toLowerCase() + ': a little of what each is good at.',
        mods: [...a.mods.map(half), ...b.mods.map(half)],
        names: a.names.slice(0, 4).concat(b.names.slice(0, 4)),
      });
    }
}
const kind = (e) => (e.hybrid ? 'hybrid' : e.exotic ? 'exotic' : 'usual');

/* ---------- the offer ---------- */
on('worldBorn', (s, d) => {
  if (d.off.roster) return;
  const r = stream(s.seed, 'roster'),
    W8 = X().offer.weights,
    draw = (list, n) => {
      const pool = list.slice(),
        out = [];
      while (out.length < n && pool.length) {
        let t = pool.reduce((a, e) => a + W8[kind(e)], 0) * r();
        let k = 0;
        for (; k < pool.length - 1; k++) if ((t -= W8[kind(pool[k])]) < 0) break;
        out.push(pool.splice(k, 1)[0].id);
      }
      return out;
    },
    [r0, r1] = X().offer.races,
    [c0, c1] = X().offer.classes;
  s.offer = {
    races: draw(
      C.races.filter((e) => !(d.off.exotics && e.exotic)),
      r0 + Math.floor(r() * (r1 - r0 + 1)),
    ),
    classes: draw(
      C.classes.filter((e) => !(d.off.exotics && e.exotic)),
      c0 + Math.floor(r() * (c1 - c0 + 1)),
    ),
  };
  // the first traveller is one of this world's own
  const ch = s.char;
  ch.race = s.offer.races[Math.floor(r() * s.offer.races.length)];
  ch.cls = s.offer.classes[Math.floor(r() * s.offer.classes.length)];
  ch.name = byId(C.races, ch.race).names[Math.floor(r() * byId(C.races, ch.race).names.length)];
  spawn(s, ch);
  setOut(s);
});

/* ---------- setting out: starting goods, and a sworn class ---------- */
function setOut(s) {
  if (s.off.roster) return;
  const p = s.player;
  for (const e of [byId(C.races, s.char.race), byId(C.classes, s.char.cls)]) {
    const st = e.start;
    if (!st) continue;
    p.coin += st.coin || 0;
    p.fuel += st.fuel || 0;
    p.water = Math.min(waterCap(s), p.water + (st.water || 0));
  }
  const fr = X().frail,
    cls = byId(C.classes, s.char.cls);
  if (fr && cls.hd <= fr.hd) {
    for (const b of fr.items) p.items.push(makeItem(s, b, null, null, true));
    p.coin += fr.coin;
    p.water = Math.min(waterCap(s), p.water + 3);
  }
  if (byId(C.classes, s.char.cls).sworn) {
    s.pact = s.god;
    s.pactBroken = false;
  }
}
on('did', (s, d) => {
  if (d.id === 'setCharacter' || d.id === 'nextTraveller') setOut(s);
});

/* ---------- gains each hour and on each kill ---------- */
const parts = (s) => (s.char ? [byId(C.races, s.char.race), byId(C.classes, s.char.cls)] : []);
function gain(s, g) {
  const p = s.player;
  if (g.hp) p.hp = Math.min(p.hpMax, p.hp + g.hp);
  if (g.water) p.water = Math.min(waterCap(s), p.water + g.water);
  if (g.stamina) p.stamina = Math.min(100, p.stamina + g.stamina);
  if (g.mana) p.mana = Math.min(p.manaMax, p.mana + g.mana);
}
SYSTEMS.push({
  id: 'roster',
  fn(s, dt, ctx) {
    for (const e of parts(s))
      if (e.tick) {
        const t = Object.assign({}, e.tick);
        if (ctx.activity !== 'move') delete t.stamina;
        for (const k in t) t[k] *= dt;
        gain(s, t);
      }
  },
});
on('killed', (s) => {
  if (s.off.roster) return;
  for (const e of parts(s))
    if (e.onKill) {
      gain(s, e.onKill);
      say(s, 'The kill puts heart into you.', 'good');
    }
});

/* ---------- fight moves ---------- */
const movesOf = (s) => (s.off.roster ? [] : byId(C.classes, s.char.cls).moves || []);
function classMove(s, id) {
  if (!s.combat || s.over) return false;
  const mv = movesOf(s).find((m) => m.id === id) || movesOf(s)[0];
  if (!mv) return false;
  const p = s.player,
    cost = mv.cost || {},
    short = Object.keys(cost).find((k) => (k === 'hp' ? p.hp <= cost.hp : (p[k] || 0) < cost[k]));
  if (short) {
    say(s, 'Not enough ' + (short === 'hp' ? 'strength left' : short) + ' for that.');
    return false;
  }
  for (const k in cost) p[k] -= cost[k];
  const c = foe(s),
    before = c.hp;
  if (mv.ward) s.combat.ward = mv.ward;
  if (mv.heal) {
    const n = roll(s, mv.heal[0], mv.heal[1]);
    p.hp = Math.min(p.hpMax, p.hp + n);
    say(s, mv.label + ': ' + n + ' hit points back.', 'good');
  }
  if (mv.flee) {
    c.cool = 5;
    s.combat = null;
    say(s, 'You are gone before the ' + spOf(s, c).name + ' knows it.', 'good');
    return true;
  }
  if (mv.strike)
    for (let k = 0; k < (mv.strike.times || 1) && s.combat; k++)
      strike(s, {
        dmg: (mv.strike.dice ? roll(s, mv.strike.dice[0], mv.strike.dice[1]) : 0) + (mv.strike.flat || 0),
        hit: mv.strike.hit,
        ranged: mv.strike.ranged,
      });
  if (mv.drain) {
    const dealt = Math.max(0, before - Math.max(0, c.hp));
    p.hp = Math.min(p.hpMax, p.hp + dealt);
    if (dealt) say(s, 'You drink ' + dealt + ' of its life.', 'good');
  }
  if (!s.combat) return true;
  s.combat.round++;
  if (mv.stun) say(s, 'The ' + spOf(s, c).name + ' reels, and does nothing.', 'good');
  else enemyTurn(s);
  return true;
}
ACTIONS.push((s, st, a) => {
  if (!s.combat) return;
  for (const m of movesOf(s)) a.push({ id: 'classMove', arg: m.id, label: m.label, hint: m.hint });
});
SWITCHES.push(['roster', 'Many races and classes']);
NOTES.push((s) =>
  s.off.roster
    ? []
    : [
        {
          label: 'Peoples and callings of this world',
          text:
            s.offer.races.length +
            ' races and ' +
            s.offer.classes.length +
            ' classes: ' +
            s.offer.races.map((id) => byId(C.races, id).name).join(', ') +
            '; ' +
            s.offer.classes.map((id) => byId(C.classes, id).name).join(', ') +
            '.',
        },
      ],
);

export { classMove };
