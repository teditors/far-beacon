// Checks for the commission's pieces: each one's own promises, in a few lines each.
const { Rules: R } = require('./lib');
const errs = [];
const need = (c, m) => { if (!c) errs.push(m); };
const findSeed = (fn, from = 1) => { for (let i = from; i < from + 3000; i++) { const s = R.newGame(i); if (fn(s)) return s; } return null; };

// The year: every world has one, switching it off at creation removes it, and a wide world is 5 x 5.
{
  for (let i = 1; i <= 60; i++) need(R.newGame(i).year, 'seed ' + i + ' has no year');
  need(!R.newGame(1, { year: true }).year, 'NO=year still rolled a year');
  const w = findSeed((s) => s.year === 'wide');
  need(w && w.world.cols === 5 && w.world.sketch.length === 25, 'a wide world is not 5 x 5');
  const ln = findSeed((s) => s.year === 'longnight');
  need(ln && !R.clock(Object.assign({}, ln, { time: 60 })).isDay, 'a year of long nights still has daylight at 7:00');
}
// Rolled gods: near their budget, and breaking a vow takes the gift away but leaves the cost.
{
  const P = R.C.pantheon, w = (list, id) => R.byId(list, id).worth;
  for (let i = 1; i <= 300; i++) {
    const g = R.newGame(i).godRoll;
    if (g.rare) continue;
    const tot = g.gifts.reduce((a, id) => a + w(P.gifts, id), 0) + g.costs.reduce((a, id) => a + w(P.costs, id), 0) + (g.vow ? w(P.vows, g.vow) : 0);
    need(Math.abs(tot - P.target) <= P.spread, 'seed ' + i + ': god worth ' + tot + ' is off budget');
  }
  const s = findSeed((s) => s.godRoll.vow === 'nofire' && !s.godRoll.rare);
  need(s, 'no world with a vow against fire');
  if (s) {
    const shrine = R.findSite(s, 'shrine');
    s.player.x = shrine.x; s.player.y = shrine.y;
    need(R.pact(s), 'could not swear');
    const gift = R.byId(P.gifts, s.godRoll.gifts[0]).mods[0], before = R.godOf(s).mods.length;
    s.player.fuel = 3; s.player.warmth = 50;
    need(R.fire(s) && s.pactBroken, 'lighting a fire did not break the vow');
    need(R.godOf(s).mods.length < before && !R.godOf(s).mods.includes(gift), 'the gift survived a broken vow');
    need(R.godOf(s).mods.length === before - R.byId(P.gifts, s.godRoll.gifts[0]).mods.length, 'the cost went with the gift');
    s.off.godslots = true;
    need(!R.godOf(s).rolled, 'switching rolled gods off did not bring the written god back');
  }
}
// Artifacts: one in the shop, one in a far region's cache, one with the relic; their powers work and switch off.
{
  for (let i = 1; i <= 20; i++) {
    const s = R.newGame(i);
    need(s.town.stock.filter((x) => x.art).length === 1, 'seed ' + i + ': no artifact in the shop');
    need(!s.artifacts.region, 'seed ' + i + ': the far artifact was not placed when its region was built');
    let n = 0;
    for (const id in s.areas) if (s.areas[id].map) for (const k in s.areas[id].map.depots) n += s.areas[id].map.depots[k].items.filter((x) => x.art).length;
    need(n === 1, 'seed ' + i + ': the far artifact is in ' + n + ' places');
    const v = R.findSite(s, 'vault');
    s.player.x = v.x; s.player.y = v.y; v.st.open = true; s.player.fuel = 5;
    s.player.items.push(Object.assign({}, s.town.stock[0], { base: 'lantern', id: 999, eq: 'tool' }));
    need(R.enterVault(s), 'seed ' + i + ': could not enter the vault');
    for (let lv = 1; lv < v.st.floors.length; lv++) { const st = R.findHere(s, 'stairsDown'); s.player.x = st.x; s.player.y = st.y; s.combat = null; R.goDown(s); }
    const relicD = Object.values(s.depots).find((d) => d.items.some((x) => x.base === 'relic'));
    need(relicD && relicD.items.some((x) => x.art), 'seed ' + i + ': no artifact beside the relic');
  }
  const s = findSeed((s) => s.town.stock.some((x) => x.art === 'stride'));
  const it = s.town.stock.find((x) => x.art === 'stride'), before = R.stat(s, 'moveTime', 1);
  s.player.items.push(it); it.eq = R.slotOf(it);
  need(R.stat(s, 'moveTime', 1) < before, 'Longstride does not speed you');
  s.off.artifacts = true;
  need(R.stat(s, 'moveTime', 1) === before, 'the artifacts switch does not turn powers off');
  need(!R.newGame(5, { artifacts: true }).artifacts, 'NO=artifacts still rolled artifacts');
}
// Rare regions: never home, built as promised, and told when you walk in.
{
  const mapOf = (s, id) => (id === s.area ? s : s.areas[id].map);
  let seen = {};
  for (let i = 1; i <= 120; i++) {
    const s = R.newGame(i);
    need(!s.regionRares.overworld, 'seed ' + i + ': the home region is rare');
    for (const id in s.regionRares) {
      if (!s.areas[id] || !mapOf(s, id)) continue; // not built yet (a wide world)
      const m = mapOf(s, id), rr = s.regionRares[id], springs = Object.values(m.sites).filter((x) => x.kind === 'spring');
      seen[rr] = 1;
      if (rr === 'empty') need(!m.creatures.length, 'seed ' + i + ': a silent region has creatures');
      if (rr === 'sweet') need(springs.every((x) => !x.foul), 'seed ' + i + ': a sweet-watered region has a foul spring');
      if (rr === 'bitter') need(springs.every((x) => x.foul || x.sure), 'seed ' + i + ': a bitter region has a sweet spring');
      if (rr === 'teeming') need(m.creatures.length > 5, 'seed ' + i + ': a teeming region has few creatures');
    }
  }
  need(Object.keys(seen).length === R.C.regionRares.list.length, 'not every rare region turned up in 120 worlds');
  const s = findSeed((s) => Object.values(s.regionRares).includes('heavy'));
  const id = Object.keys(s.regionRares).find((k) => s.regionRares[k] === 'heavy'), rec = s.areas[id], before = R.stat(s, 'staminaCost', 1);
  R.switchRegion(s, rec.cx, rec.cy, { x: 18, y: 18 });
  s.player.stamina = 100; s.creatures = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (R.move(s, dx, dy)) break;
  need(rec.rareTold && s.log.some((l) => /rare country/.test(l.msg)), 'walking into a rare region did not tell you');
  need(R.stat(s, 'staminaCost', 1) > before * 1.2 || R.stat(s, 'staminaCost', 1) > 1.2, 'a heavy region is not heavy');
  need(!R.newGame(5, { regionrares: true }).regionRares, 'NO=regionrares still rolled rare regions');
}
// Creature specials: the same in every save, used in a fight, and switched off cleanly.
{
  let any = 0;
  for (let i = 1; i <= 30; i++) {
    const s = R.newGame(i);
    for (const sp of s.species) { const a = R.specialOf(s, sp).id, b = R.specialOf(R.deserialize(R.serialize(s)).state, sp).id; need(a === b, 'seed ' + i + ': a special changed on reload'); if (a) any++; }
  }
  need(any > 20, 'too few species have specials');
  const s = findSeed((s) => s.creatures.some((c) => R.specialOf(s, s.species[c.sp]).id === 'thief'));
  const c = s.creatures.find((c) => R.specialOf(s, s.species[c.sp]).id === 'thief');
  s.player.x = c.x; s.player.y = c.y; s.player.water = 6; s.player.hp = 999; s.player.hpMax = 999;
  s.combat = { cid: c.id, lines: [], round: 0 };
  for (let k = 0; k < 30 && s.combat; k++) { const w = s.player.water; R.flee(s); if (s.player.water < w) break; s.combat = { cid: c.id, lines: [], round: 0 }; }
  need(s.player.water < 6, 'a thief never spilled your water');
  s.off.specials = true;
  need(!R.specialOf(s, s.species[c.sp]).id, 'the specials switch does not turn them off');
}
// Exotic races and classes: offered now and then, never as a town's people, and a votary sets out sworn.
{
  let n = 0;
  for (let i = 1; i <= 100; i++) {
    const s = R.newGame(i);
    need(!R.byId(R.C.races, s.town.race).exotic, 'seed ' + i + ': a town of an exotic race');
    if ([...s.offer.races, ...s.offer.classes].some((id) => R.byId([...R.C.races, ...R.C.classes], id).exotic)) n++;
  }
  need(n > 15 && n < 60, 'exotics offered in ' + n + ' of 100 worlds');
  const s = findSeed((s) => s.offer.classes.includes('votary'));
  const ch = R.makeChar(Math.random, s);
  ch.cls = 'votary';
  R.setCharacter(s, ch);
  need(s.pact === s.god, 'a votary does not set out sworn');
  const lb = findSeed((s) => s.offer.races.includes('lostborn'));
  const nm = R.nameFor(Math.random, 'lostborn', lb), st = R.byId(R.C.civ.style, lb.civ.style);
  need(st.a.some((a) => nm.startsWith(a)), 'a Lostborn name does not come from the lost people: ' + nm);
}
// Town cultures: prices follow the culture, the people who never fell tell all, and the switch restores prices.
{
  const s = findSeed((s) => s.townCulture.custom === 'hospitable');
  need(R.priceOf(s, 'innPrice') < R.C.town.innPrice, 'a hospitable town does not lower the price of a bed');
  s.off.towns = true;
  need(R.priceOf(s, 'innPrice') === R.C.town.innPrice, 'the towns switch does not restore prices');
  const u = findSeed((s) => s.townCulture.rare === 'unfallen');
  need(u && u.town.stock.filter((x) => x.mark).length >= 3, 'the people who never fell sell no marked gear');
  // walk in, find the elder, talk
  const d = R.townDoor(u);
  u.player.x = d.x; u.player.y = d.y; u.creatures = [];
  need(R.move(u, 0, -1) && u.area === 'town', 'could not enter the town');
  const el = R.findHere(u, 'elder');
  u.player.x = el.x; u.player.y = el.y;
  need(R.talkElder(u), 'could not talk to the elder');
  need(R.AXES.every((a) => u.civKnown[a]), 'the people who never fell did not tell all they were');
  need(!R.newGame(5, { towns: true }).townCulture, 'NO=towns still rolled a culture');
}
if (errs.length) { console.log('piece problems:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('pieces ok: year, rolled gods, artifacts, rare regions, creature specials, exotics, towns');
