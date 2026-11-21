// Plays every plot of 120 worlds to its end, to prove each kind can be finished: the great trouble wins the world with
// its own ending, a side trouble pays. Outdoors the legs are teleported (the playtest covers walking); in towns the
// test walks to the elder. Also checks the links between plots: a feud's sides, a cure in a beast's hoard, a curse.
const { Rules: R, goPlace } = require('./lib');
const W = R.W,
  problems = [],
  done = {},
  seen = {};
const trouble = (s, p, m) => problems.push('seed ' + s.seed + ' ' + p.kind + (p.main ? '*' : '') + ': ' + m);
function fight(s) {
  for (let g = 0; s.combat && !s.over && g < 400; g++) {
    s.player.hp = s.player.hpMax = 999;
    const c = R.foe(s);
    if (c && g > 40) c.hp = 1;
    R.attack(s);
  }
}
// Into a town and up to its elder.
function toElder(s, id) {
  const t = R.townById(s, id) || s.town,
    d = R.townDoor(s, t);
  if (s.area !== id) {
    if (R.areaRec(s).kind === 'town') {
      s.player.x = 18;
      s.player.y = 35;
      R.move(s, 0, 1);
    }
    goPlace(s, { area: t.area || 'overworld', x: d.x, y: d.y });
    s.creatures = s.creatures.filter((c) => c.plot);
    for (const c of s.creatures) if (Math.abs(c.x - d.x) <= 1 && Math.abs(c.y - d.y) <= 1) c.x = c.x < 3 ? c.x + 3 : c.x - 3;
    s.combat = null;
    R.move(s, 0, -1);
  }
  const e = R.findHere(s, 'elder');
  if (!e) throw new Error('seed ' + s.seed + ': could not get into ' + t.name + ' (area ' + s.area + ', log: ' + s.log.slice(-2).map((l) => l.msg).join(' / ') + ')');
  s.player.x = e.x;
  s.player.y = e.y;
  return R.talkElder(s);
}
function outTo(s, at) {
  if (R.areaRec(s).kind === 'town') {
    s.player.x = 18;
    s.player.y = 35;
    R.move(s, 0, 1);
  }
  goPlace(s, at);
}
function play(s, p) {
  s.player.water = 6;
  for (let guard = 0; guard < 30 && !p.done && !p.failed && !s.over; guard++) {
    s.player.stamina = 100;
    s.player.hp = s.player.hpMax;
    s.player.water = Math.max(s.player.water, 4);
    if (!p.known) {
      toElder(s, p.giver);
      if (!p.known) return trouble(s, p, 'its elder did not tell it');
      continue;
    }
    const st = R.stepOf(p),
      at = R.plotGoal(s, p);
    if (!at) return trouble(s, p, 'no place for step ' + st.do);
    if (at.town) {
      const ch = R.plotChoices(s).filter((c) => c.plot === p.id);
      if (st.do === 'choose' && ch.length) {
        // try each side in turn over the worlds
        const o = ch[s.seed % ch.length];
        if (!R.choosePlot(s, p.id, o.id)) return trouble(s, p, 'could not choose');
        continue;
      }
      toElder(s, at.town);
      continue;
    }
    if (st.do === 'kill') {
      // stand next to it and walk into it
      outTo(s, { area: at.area, x: at.x, y: at.y });
      const c = s.creatures.find((x) => x.id === at.cid);
      if (!c) return trouble(s, p, 'the creature is not where the plot says');
      s.player.x = c.x > 0 ? c.x - 1 : c.x + 1;
      s.player.y = c.y;
      s.creatures.forEach((x) => (x.cool = x === c ? 0 : 99));
      R.move(s, c.x - s.player.x, 0);
      if (!s.combat) {
        // in its way stands something else: just finish it where it is
        R.startFight ? R.startFight(s, c) : null;
      }
      fight(s);
      continue;
    }
    outTo(s, { area: at.area, x: at.x, y: at.y });
    // kill whatever guards the place, if it is in the way of a free step
    if (st.do === 'free' && st.clear) {
      for (let g = 0; g < 6; g++) {
        const c = s.creatures.find((x) => x.plot === p.id && x.role === st.clear);
        if (!c) break;
        s.player.x = c.x > 0 ? c.x - 1 : c.x + 1;
        s.player.y = c.y;
        R.move(s, c.x - s.player.x, 0);
        fight(s);
      }
      goPlace(s, { area: at.area, x: at.x, y: at.y });
    }
    const d = R.depotHere(s);
    if (d) for (const it of d.items.slice()) if (it.plot) R.takeItem(s, it.id);
    if (st.do === 'free' || st.do === 'use') {
      const a = R.actions(s).find((x) => x.id === 'plotAct' && x.arg === p.id);
      if (!a) return trouble(s, p, 'no button to ' + st.do + ' at the place');
      if (!R.plotAct(s, p.id)) return trouble(s, p, 'could not ' + st.do);
    }
    s.combat = null;
  }
  if (!p.done && !p.failed && !(s.over && s.over.won)) trouble(s, p, 'not finished, at step ' + p.step + ' (' + (R.stepOf(p) || {}).do + ')');
}
let wins = 0,
  links = 0,
  hostile = 0,
  cursed = 0;
for (let seed = 1; seed <= 120; seed++) {
  const s = R.newGame(seed),
    plots = R.plotsOf(s);
  s.tun.carryCap = 60; // the test carries every plot's things at once
  if (plots.filter((p) => p.main).length !== 1) problems.push('seed ' + seed + ': not exactly one great trouble');
  if (s.curses && Object.keys(s.curses).length) cursed++;
  // side troubles first, the great trouble last (it ends the world)
  for (const p of plots.filter((q) => !q.main).concat(plots.filter((q) => q.main))) {
    if (p.kind === 'relic') continue; // tests/quest.js plays the relic
    // below, above, under the water or beyond a door: tests/c4.test.js follows those routes
    if (p.realm || Object.values(p.roles || {}).some((r) => r && r.where && r.where !== 'land')) {
      seen.away = (seen.away || 0) + 1;
      continue;
    }
    seen[p.kind] = (seen[p.kind] || 0) + 1;
    if (p.linked) links++;
    play(s, p);
    if (p.hostile) {
      hostile++;
      const t = R.townById(s, p.hostile) || s.town;
      toElder(s, p.hostile);
      const shop = R.findHere(s, 'shop');
      s.player.x = shop.x;
      s.player.y = shop.y;
      if (!(R.stat(s, 'town.buy', 1) > 1.2)) trouble(s, p, 'the town you crossed in the feud does not sell dear');
      if (!t.speech.some((l) => /other side/.test(l))) trouble(s, p, 'the town you crossed does not say so');
    }
    if (p.done) done[p.kind] = (done[p.kind] || 0) + 1;
    if (p.main) {
      if (!(s.over && s.over.won && s.over.ending)) trouble(s, p, 'finishing the great trouble did not win, with an ending');
      else wins++;
    } else if (s.over) trouble(s, p, 'a side trouble ended the world');
    if (s.over) break;
  }
  if (s.curses && Object.keys(s.curses).some((a) => R.plotsOf(s).find((p) => p.id === s.curses[a]).done)) problems.push('seed ' + seed + ': a curse outlived its plot');
}
// switching plots off gives the old story alone
if (R.plotsOf(R.newGame(7, { plots: true })).length) problems.push('NO=plots still made plots');
const away = ['deepking', 'tyrant', 'drowned', 'beyond']; // always below, above, under or beyond: tests/c4.test.js
const kinds = R.C.plots.kinds.filter((k) => k.id !== 'relic' && !away.includes(k.id)).map((k) => k.id);
for (const k of kinds) if (!done[k]) problems.push('no ' + k + ' plot was finished in 120 worlds (seen ' + (seen[k] || 0) + ')');
if (!links) problems.push('no cure in a beast\'s hoard in 120 worlds');
if (!hostile) problems.push('no feud chose a side in 120 worlds');
if (!cursed) problems.push('no cursed land in 120 worlds');
if (problems.length) {
  console.log(problems.slice(0, 15).join('\n'));
  process.exit(1);
}
console.log(
  'plots ok: ' + Object.keys(done).map((k) => k + ' ' + done[k]).join(', ') + '; ' + wins + ' great troubles won, ' + links + ' cures in a hoard, ' + hostile + ' feuds taken sides in, ' + cursed + ' cursed lands',
);
