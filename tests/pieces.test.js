// Checks for the commission's pieces: each one's own promises, in a few lines each.
const { Rules: R, goPlace } = require('./lib');
const errs = [];
const need = (c, m) => {
  if (!c) errs.push(m);
};
const findSeed = (fn, from = 1) => {
  for (let i = from; i < from + 3000; i++) {
    const s = R.newGame(i);
    if (fn(s)) return s;
  }
  return null;
};

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
  const P = R.C.pantheon,
    w = (list, id) => R.byId(list, id).worth;
  for (let i = 1; i <= 300; i++) {
    const g = R.newGame(i).godRoll;
    if (g.rare) continue;
    const tot =
      g.gifts.reduce((a, id) => a + w(P.gifts, id), 0) +
      g.costs.reduce((a, id) => a + w(P.costs, id), 0) +
      (g.vow ? w(P.vows, g.vow) : 0);
    need(Math.abs(tot - P.target) <= P.spread, 'seed ' + i + ': god worth ' + tot + ' is off budget');
  }
  const s = findSeed((s) => s.godRoll.vow === 'nofire' && !s.godRoll.rare);
  need(s, 'no world with a vow against fire');
  if (s) {
    const shrine = R.findSite(s, 'shrine');
    goPlace(s, shrine);
    need(R.pact(s), 'could not swear');
    const gift = R.byId(P.gifts, s.godRoll.gifts[0]).mods[0],
      before = R.godOf(s).mods.length;
    s.player.fuel = 3;
    s.player.warmth = 50;
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
    // in a world larger than 3 x 3 the far region may not be built yet: walk there, and it is placed as it is built
    if (s.artifacts.region) {
      const a = s.artifacts.region,
        cx = +a.id.slice(1).split('_')[0],
        cy = +a.id.split('_')[1];
      need(!(s.areas[a.id] && s.areas[a.id].map), 'seed ' + i + ': the far artifact was not placed when its region was built');
      R.switchRegion(s, cx, cy, { x: 18, y: 18 });
    }
    need(!s.artifacts.region, 'seed ' + i + ': the far artifact was not placed when its region was built');
    let n = 0;
    for (const id in s.areas)
      if (s.areas[id].map)
        for (const k in s.areas[id].map.depots) n += s.areas[id].map.depots[k].items.filter((x) => x.art).length;
    for (const k in s.depots) n += s.depots[k].items.filter((x) => x.art).length;
    need(n === 1, 'seed ' + i + ': the far artifact is in ' + n + ' places');
    const v = R.findSite(s, 'vault');
    goPlace(s, v);
    v.st.open = true;
    s.player.fuel = 5;
    s.player.items.push(Object.assign({}, s.town.stock[0], { base: 'lantern', id: 999, eq: 'tool' }));
    need(R.enterVault(s), 'seed ' + i + ': could not enter the vault');
    for (let lv = 1; lv < v.st.floors.length; lv++) {
      const st = R.findHere(s, 'stairsDown');
      s.player.x = st.x;
      s.player.y = st.y;
      s.combat = null;
      R.goDown(s);
    }
    const relicD = Object.values(s.depots).find((d) => d.items.some((x) => x.base === 'relic'));
    need(relicD && relicD.items.some((x) => x.art), 'seed ' + i + ': no artifact beside the relic');
  }
  const s = findSeed((s) => s.town.stock.some((x) => x.art === 'stride'));
  const it = s.town.stock.find((x) => x.art === 'stride'),
    before = R.stat(s, 'moveTime', 1);
  s.player.items.push(it);
  it.eq = R.slotOf(it);
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
      const m = mapOf(s, id),
        rr = s.regionRares[id],
        springs = Object.values(m.sites).filter((x) => x.kind === 'spring');
      seen[rr] = 1;
      if (rr === 'empty') need(!m.creatures.filter((c) => !c.key).length, 'seed ' + i + ': a silent region has creatures');
      if (rr === 'sweet')
        need(
          springs.every((x) => !x.foul),
          'seed ' + i + ': a sweet-watered region has a foul spring',
        );
      if (rr === 'bitter')
        need(
          springs.every((x) => x.foul || x.sure),
          'seed ' + i + ': a bitter region has a sweet spring',
        );
      if (rr === 'dry')
        need(
          springs.every((x) => x.sure),
          'seed ' + i + ': a dry region has an ordinary spring',
        );
      if (rr === 'burned')
        need(
          !m.terrain.some((t, k) => t === 3 && k % R.W > 1 && k % R.W < R.W - 2 && k > 2 * R.W && k < R.W * (R.H - 2)),
          'seed ' + i + ': a burned region has woods',
        );
      if (rr === 'teeming') need(m.creatures.length > 5, 'seed ' + i + ': a teeming region has few creatures');
    }
  }
  need(Object.keys(seen).length === R.C.regionRares.list.length, 'not every rare region turned up in 120 worlds');
  const homeRare = (s) => Object.keys(s.regionRares).find((k) => s.regionRares[k] === 'heavy' && !k.includes(':')); // not another world's
  const s = findSeed(homeRare);
  const id = homeRare(s),
    before = R.stat(s, 'staminaCost', 1);
  R.switchRegion(s, +id.slice(1).split('_')[0], +id.split('_')[1], { x: 18, y: 18 }); // built now if it was not yet
  const rec = s.areas[id];
  s.player.stamina = 100;
  s.creatures = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    if (R.move(s, dx, dy)) break;
  need(rec.rareTold && s.log.some((l) => /rare country/.test(l.msg)), 'walking into a rare region did not tell you');
  need(R.stat(s, 'staminaCost', 1) > before * 1.2 || R.stat(s, 'staminaCost', 1) > 1.2, 'a heavy region is not heavy');
  need(!R.newGame(5, { regionrares: true }).regionRares, 'NO=regionrares still rolled rare regions');
}
// Creature specials: the same in every save, used in a fight, and switched off cleanly.
{
  let any = 0;
  for (let i = 1; i <= 30; i++) {
    const s = R.newGame(i);
    for (const sp of s.species) {
      const a = R.specialOf(s, sp).id,
        b = R.specialOf(R.deserialize(R.serialize(s)).state, sp).id;
      need(a === b, 'seed ' + i + ': a special changed on reload');
      if (a) any++;
    }
  }
  need(any > 20, 'too few species have specials');
  const s = findSeed((s) => s.creatures.some((c) => R.specialOf(s, s.species[c.sp]).id === 'thief'));
  const c = s.creatures.find((c) => R.specialOf(s, s.species[c.sp]).id === 'thief');
  s.player.x = c.x;
  s.player.y = c.y;
  s.player.water = 6;
  s.player.hp = 999;
  s.player.hpMax = 999;
  s.combat = { cid: c.id, lines: [], round: 0 };
  for (let k = 0; k < 30 && s.combat; k++) {
    const w = s.player.water;
    R.flee(s);
    if (s.player.water < w) break;
    s.combat = { cid: c.id, lines: [], round: 0 };
  }
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
  need(n > 15, 'exotics offered in ' + n + ' of 100 worlds');
  const s = findSeed((s) => s.offer.classes.includes('votary'));
  s.pact = null;
  const ch = R.makeChar(Math.random, s);
  ch.cls = 'votary';
  R.setCharacter(s, ch);
  need(s.pact === s.god, 'a votary does not set out sworn');
  const lb = findSeed((s) => s.offer.races.includes('lostborn'));
  const nm = R.nameFor(Math.random, 'lostborn', lb),
    st = R.byId(R.C.civ.style, lb.civ.style);
  need(
    st.a.some((a) => nm.startsWith(a)),
    'a Lostborn name does not come from the lost people: ' + nm,
  );
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
  goPlace(u, { area: R.townArea(u), x: d.x, y: d.y });
  u.creatures = [];
  need(R.move(u, 0, -1) && u.area === 'town', 'could not enter the town');
  const el = R.findHere(u, 'elder');
  u.player.x = el.x;
  u.player.y = el.y;
  need(R.talkElder(u), 'could not talk to the elder');
  need(
    R.AXES.every((a) => u.civKnown[a]),
    'the people who never fell did not tell all they were',
  );
  need(!R.newGame(5, { towns: true }).townCulture, 'NO=towns still rolled a culture');
}
// Errands: offered at the inn, done by playing, paid at the inn (or not, by a liar).
{
  let paid = 0,
    lied = 0,
    kinds = {};
  for (let i = 1; i <= 40; i++) {
    const s = R.newGame(i),
      d = R.townDoor(s);
    goPlace(s, { area: R.townArea(s), x: d.x, y: d.y });
    s.creatures = [];
    R.move(s, 0, -1);
    const inn = R.findHere(s, 'inn');
    s.player.x = inn.x;
    s.player.y = inn.y;
    need(R.askErrand(s) && s.errand, 'seed ' + i + ': no errand offered');
    if (!s.errand) continue;
    const e = s.errand,
      m = s.areas[e.area].map;
    kinds[e.kind] = 1;
    // do it by hand: kill the creature, take the parcel, or stand on the spot
    if (e.kind === 'slay') m.creatures = m.creatures.filter((c) => c.id !== e.cid);
    if (e.kind === 'fetch') {
      const dep = m.depots[e.y * R.W + e.x];
      need(dep && dep.items.some((x) => x.errand), 'seed ' + i + ': the parcel is not where it was said to be');
      s.player.items.push(dep.items.find((x) => x.errand));
    }
    if (e.kind === 'find') {
      e.done = true;
    }
    R.rest(s);
    need(e.done, 'seed ' + i + ': a ' + e.kind + ' errand did not get done');
    const coin = s.player.coin;
    need(R.claimErrand(s), 'seed ' + i + ': could not claim');
    if (s.player.coin > coin) paid++;
    else if (e.liar) lied++;
    else errs.push('seed ' + i + ': an honest errand did not pay');
    need(!s.player.items.some((x) => x.errand), 'seed ' + i + ': the parcel stayed in the pack');
  }
  need(
    Object.keys(kinds).length === 3 && paid > 20,
    'errands: kinds ' + Object.keys(kinds) + ', paid ' + paid + ', lied ' + lied,
  );
}
// Odd weather: some storms are odd, the same after a reload, and a shower of stars leaves something to find.
{
  let odd = 0,
    storms = 0,
    star = false;
  for (let i = 1; i <= 30 && !star; i++) {
    const s = R.newGame(i);
    s.player.water = 99;
    s.player.stamina = 1e6;
    s.player.warmth = 100;
    s.creatures = [];
    for (let h = 0; h < 24 * 12 && !s.over; h++) {
      const before = s.weather.storm;
      R.rest(s);
      s.player.water = 6;
      s.player.warmth = 100;
      if (s.weather.storm && !before) {
        storms++;
        if (R.biomeOf(s).storm.name !== R.stormOfNow(s).name) odd++;
      }
      if (Object.values(s.sites).some((x) => x.star)) star = true;
    }
  }
  need(storms > 10 && odd > 0, 'odd weather: ' + odd + ' odd of ' + storms + ' storms');
  need(star, 'no shower of falling stars left a star in 30 worlds of 12 days');
}
// Generated biomes: given to regions, rebuilt from the seed on load, every one complete, and none with NO=biomegen.
{
  let n = 0;
  for (let i = 1; i <= 80; i++) {
    const s = R.newGame(i),
      ids = new Set(s.world.sketch.map((e) => e.biome).filter((id) => /^g/.test(id)));
    n += ids.size;
    for (const id of ids) {
      const b = R.byId(R.C.biomes, id);
      for (const k of ['forest', 'river', 'special', 'day', 'night', 'storm']) need(b[k], id + ' is missing ' + k);
      need(b.colors.length === 6 && b.colors.every((c) => /^#[0-9a-f]{6}$/.test(c)), id + ' has bad colours');
      need(R.C.creature.prefix[id], id + ' has no creature names');
    }
  }
  need(n > 80, 'only ' + n + ' generated biomes in use over 80 worlds');
  const s = findSeed((s) => R.biomeOf(s).gen),
    text = R.serialize(s);
  const keep = R.C.biomes.slice();
  R.C.biomes.length = 0;
  R.C.biomes.push(...keep.filter((b) => !b.gen)); // as a fresh page would have them
  const back = R.deserialize(text);
  need(
    back.state && R.biomeOf(back.state) && R.biomeOf(back.state).name === R.biomeOf(s).name,
    'a generated biome did not come back on load',
  );
  R.C.biomes.length = 0;
  R.C.biomes.push(...keep);
  need(
    !R.newGame(5, { biomegen: true }).world.sketch.some((e) => /^g/.test(e.biome)),
    'NO=biomegen still gave out generated biomes',
  );
}
// Odd levels: each kind turns up, is built as promised and is told on arrival.
{
  for (const kind of ['flooded', 'ossuary', 'archive', 'sleepers']) {
    const s = findSeed((s) => R.findSite(s, 'vault').st.floors[0] === kind);
    need(s, 'no world has a first level of kind ' + kind);
    if (!s) continue;
    const v = R.findSite(s, 'vault');
    goPlace(s, v);
    v.st.open = true;
    s.player.fuel = 5;
    s.creatures = [];
    s.player.items.push({ id: 998, base: 'lantern', known: true, carried: 0, eq: 'tool' });
    need(R.enterVault(s) && R.areaRec(s).floor === kind, kind + ': could not go in');
    need(
      s.log.slice(-3).some((l) => l.msg === R.C.floorKinds.list.concat(R.C.floorKinds.rare).find((k) => k.id === kind).text),
      kind + ': not told on arrival',
    );
    if (kind === 'flooded') need(Object.values(s.depots).filter((d) => d.water >= 3).length >= 3, 'flooded: no pools');
    if (kind === 'ossuary') need(s.creatures.length >= 4, 'ossuary: too few guardians');
    if (kind === 'archive') need(s.seen.filter(Boolean).length > 60, 'archive: the level is not revealed');
    if (kind === 'sleepers')
      need(
        s.creatures.every((c) => c.cool > 1e6 || c.warden),
        'sleepers: a guardian is awake',
      );
  }
}
// The relic's nature: acts only while carried, and is told on pickup.
{
  const s = findSeed((s) => s.quest.relic.startsWith('Ember'));
  const before = R.stat(s, 'cold', 1);
  const relic = { id: 997, base: 'relic', known: true, carried: 0, label: s.quest.relic };
  R.depotHere(s, true).items.push(relic);
  need(R.takeItem(s, 997) && R.stat(s, 'cold', 1) < before, 'carrying the Ember does not warm you');
  need(s.quest.natureTold, "the relic's nature was not told");
}
// Lairs: some regions have one, on a cave with a hoard; killing it is told.
{
  let n = 0;
  for (let i = 1; i <= 30; i++) {
    const s = R.newGame(i);
    for (const id in s.areas) {
      const m = s.areas[id].map;
      if (!m || !m.creatures) continue;
      for (const c of m.creatures.filter((c) => c.lair)) {
        n++;
        const k = c.y * R.W + c.x;
        need(
          m.sites[k] && m.sites[k].kind === 'cave' && m.depots[k] && m.depots[k].items.length >= 2 && m.depots[k].coin > 0,
          'seed ' + i + ': a lair without a hoard',
        );
      }
    }
  }
  need(n > 30, 'only ' + n + ' lairs in 30 worlds');
}
// Far finds: searching away from home sometimes turns up more.
{
  let extra = 0;
  for (let i = 1; i <= 40; i++) {
    const s = R.newGame(i),
      id = Object.keys(s.areas).find((k) => s.areas[k].kind === 'region' && k !== 'overworld'),
      rec = s.areas[id];
    R.switchRegion(s, rec.cx, rec.cy, { x: 18, y: 18 });
    s.creatures = [];
    for (const k in s.sites)
      if (['cave', 'cache'].includes(s.sites[k].kind)) {
        s.player.x = k % R.W;
        s.player.y = Math.floor(k / R.W);
        s.player.water = 6;
        s.player.stamina = 100;
        const n = s.log.length;
        R.search(s);
        if (s.log.slice(n).some((l) => /less picked over/.test(l.msg))) extra++;
      }
  }
  need(extra > 10, 'far finds turned up extra only ' + extra + ' times');
}
// Town life: sizes, people at their doors, services that do what they say, rumours, and the switch.
{
  const sizes = {},
    used = {};
  for (let i = 1; i <= 40; i++) {
    const s = R.newGame(i),
      m = R.mapOf(s, 'town');
    sizes[s.town.size] = 1;
    for (const id of s.town.services)
      need(
        Object.values(m.sites).some((x) => x.kind === id),
        'seed ' + i + ': no door for the ' + id,
      );
    need(m.terrain[(R.H - 1) * R.W + 18] !== R.WALL, 'seed ' + i + ': the south way in is walled');
    // walk in, then visit everyone
    const d = R.townDoor(s);
    goPlace(s, { area: R.townArea(s), x: d.x, y: d.y });
    s.creatures = [];
    need(R.move(s, 0, -1) && s.area === 'town', 'seed ' + i + ': could not walk in');
    s.player.coin = 999;
    for (const k in s.sites) {
      const st = s.sites[k];
      if (!R.C.townLife.services.some((x) => x.id === st.kind) && st.kind !== 'folk') continue;
      s.player.x = k % R.W;
      s.player.y = Math.floor(k / R.W);
      const info = R.serviceInfo(s);
      need(info && info.text.length, 'seed ' + i + ': ' + st.kind + ' has nothing to say');
      if (st.kind === 'folk') continue;
      need(
        R.actions(s).some((a) => a.id === 'townAsk'),
        'seed ' + i + ': no button to talk to the ' + st.kind,
      );
      for (const o of info.options.slice(0, 2)) {
        const coin = s.player.coin;
        need(
          R.useService(s, o.id, o.arg) && s.player.coin === coin - o.price,
          'seed ' + i + ': ' + o.id + ' at the ' + st.kind + ' did not work',
        );
        used[o.id] = 1;
      }
    }
  }
  need(Object.keys(sizes).length === 4, 'not every town size turned up: ' + Object.keys(sizes));
  {
    // townsfolk wander while you walk
    const s = R.newGame(2),
      d = R.townDoor(s);
    goPlace(s, { area: R.townArea(s), x: d.x, y: d.y });
    s.creatures = [];
    R.move(s, 0, -1);
    const where = () =>
        Object.keys(s.sites)
          .filter((k) => s.sites[k].kind === 'folk')
          .join(','),
      before = where();
    for (let i = 0; i < 12; i++) {
      s.player.stamina = 100;
      R.move(s, 0, i % 2 ? 1 : -1);
    }
    need(where() !== before, 'the townsfolk never moved');
  }
  for (const k of ['heal', 'bless', 'learn', 'mapHome', 'mule']) need(used[k], 'no service ' + k + ' was ever used');
  need(!R.newGame(5, { townlife: true }).town.size, 'NO=townlife still rolled a town size');
}
// The roster: many races and classes per world, moves that work, gains on a kill.
{
  for (let i = 1; i <= 60; i++) {
    const s = R.newGame(i),
      o = s.offer;
    need(
      o.races.length >= 2 && o.races.length <= 12 && o.classes.length >= 8 && o.classes.length <= 20,
      'seed ' + i + ': offers ' + o.races.length + ' races and ' + o.classes.length + ' classes',
    );
    need(
      o.races.includes(s.char.race) && o.classes.includes(s.char.cls),
      'seed ' + i + ': the first traveller is not of this world',
    );
  }
  // every class with moves: each move can be used in a fight
  for (const cls of R.C.classes.filter((c) => c.moves)) {
    const s = R.newGame(7),
      c = s.creatures[0];
    s.char.cls = cls.id;
    s.player.mana = s.player.manaMax = 20;
    s.player.fuel = 5;
    s.player.stamina = 100;
    s.player.hp = s.player.hpMax = 50;
    for (const m of cls.moves) {
      s.combat = { cid: c.id, lines: [], round: 0 };
      c.hp = c.hpMax = 999;
      need(
        R.actions(s).some((a) => a.id === 'classMove' && a.arg === m.id),
        cls.id + ': no button for ' + m.id,
      );
      need(R.classMove(s, m.id), cls.id + ': ' + m.id + ' did not work');
    }
  }
  const s = R.newGame(9),
    c = s.creatures[0];
  s.char.cls = 'hunter';
  s.player.water = 0;
  s.combat = { cid: c.id, lines: [], round: 0 };
  c.hp = 1;
  for (let k = 0; k < 50 && s.combat; k++) {
    s.player.hp = 50;
    R.attack(s);
    c.hp = Math.min(c.hp, 1);
  }
  need(s.player.water >= 1, 'a hunter got no water from a kill');
  {
    const f = R.newGame(11),
      ch = R.makeChar(Math.random, f);
    ch.cls = 'merchant';
    R.setCharacter(f, ch);
    need(f.player.items.filter((i) => i.base === 'waterskin').length >= 3, 'a frail class set out without its extra waterskin');
  }
  need(R.newGame(5, { roster: true }).offer.classes.length === 3, 'NO=roster still offers many classes');
}
// The plot across the world: the town, the locked place, the destination and the key each in a region other than home,
// along a chain of neighbouring regions, with water and a road on the way, and directions that point the right way.
{
  let spread = 0,
    homeTown = 0;
  for (let i = 1; i <= 60; i++) {
    const s = R.newGame(i),
      v = R.findSite(s, 'vault'),
      g = s.quest.dest === 'beacon' ? s.goal : R.findSite(s, 'shrine');
    const areas = [v.area, g.area];
    need(
      areas.every((a) => a && a !== 'overworld'),
      'seed ' + i + ': a place stayed home: ' + areas,
    );
    if (R.townArea(s) === 'overworld') homeTown++;
    if (new Set(areas.concat([R.townArea(s)])).size === 3) spread++; // a region with no room for one sends it on to the next
    if (s.quest.key === 'ruin') need(R.keyRuin(s).area !== 'overworld', 'seed ' + i + ': the key ruin is at home');
    if (s.quest.key === 'beast') need(R.beastOf(s) && R.beastOf(s).area !== 'overworld', 'seed ' + i + ': the beast is at home');
    // the objective points at the town, and the well has a known spring and a road on the way out
    const l = R.localPos(s, R.townArea(s), s.town.x, s.town.y),
      dir = R.objective(s).dir;
    const want = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][
      ((Math.round(Math.atan2(l.y - s.player.y, l.x - s.player.x) / (Math.PI / 4)) % 8) + 8) % 8
    ];
    need(dir === want, 'seed ' + i + ': the objective says ' + dir + ' but the town is ' + want);
    need(Object.keys(s.road).length > 0, 'seed ' + i + ': no road out from home');
  }
  need(spread >= 54, 'places in three different regions in only ' + spread + ' of 60 worlds');
  need(homeTown >= 5 && homeTown <= 30, 'the town stayed home in ' + homeTown + ' of 60 worlds');
  need(R.findSite(R.newGame(5, { plot: true }), 'vault').area === 'overworld', 'NO=plot still moved the locked place');
}
// Hamlets: in some regions away from home, with water, shelter, a bed and goods.
{
  let n = 0,
    used = 0;
  for (let i = 1; i <= 20; i++) {
    const s = R.newGame(i);
    for (const id in s.areas) {
      const m = s.areas[id].map;
      if (!m || !m.sites || id === 'overworld') continue;
      for (const k in m.sites) {
        if (m.sites[k].kind !== 'hamlet') continue;
        n++;
        if (used) continue;
        goPlace(s, { area: id, x: k % R.W, y: Math.floor(k / R.W) });
        s.player.water = 0;
        s.player.coin = 50;
        s.creatures = [];
        need(R.inShelter(s), 'a hamlet is not shelter');
        need(R.fill(s) && s.player.water > 1, 'no water at a hamlet');
        need(
          R.actions(s).some((a) => a.section === 'hamlet'),
          'no button to talk in a hamlet',
        );
        const info = R.serviceInfo(s);
        need(info && info.options.length >= 3, 'a hamlet has nothing to offer');
        s.player.hp = 1;
        need(R.useService(s, 'bed') && s.player.hp === s.player.hpMax, 'a bed in a hamlet did not heal');
        used++;
      }
    }
  }
  need(n > 20 && used, 'only ' + n + ' hamlets in 20 worlds');
}
// Tiers: finds away from home are finer, and a finer affix does more.
{
  const s = R.newGame(3),
    id = Object.keys(s.areas).find((k) => s.areas[k].kind === 'region' && k !== 'overworld');
  goPlace(s, { area: id, x: 18, y: 18 });
  let fine = 0;
  for (let i = 0; i < 40; i++) {
    const it = R.genItem(s, { relic: true, noConsumables: true });
    if (it.tier === 2) fine++;
  }
  need(fine > 20, 'only ' + fine + ' of 40 finds a region away were fine');
  const a = { id: 1, base: 'sword', pre: 'keen', known: true },
    b = Object.assign({}, a, { tier: 3 });
  need(
    R.itemAffixes(b)[0].mods[0].value === 2 && R.itemAffixes(a)[0].mods[0].value === 1,
    'a superb affix does not do twice as much',
  );
  need(/^Superb /.test(R.itemName(b)), 'a superb item is not named so');
  const h = R.newGame(3, { tiers: true });
  goPlace(h, { area: id, x: 18, y: 18 });
  need(!R.genItem(h, { relic: true, noConsumables: true }).tier, 'NO=tiers still made a fine item');
}
// Worlds of varying size: sizes vary, odd shapes happen, none is too large, and NO=worldsize gives 3 x 3.
{
  const sizes = new Set();
  let odd = 0;
  for (let i = 1; i <= 120; i++) {
    const s = R.newGame(i),
      w = s.world;
    sizes.add(w.cols + 'x' + w.rows);
    if (Math.abs(w.cols - w.rows) >= 3) odd++;
    need(
      w.cols >= 2 && w.rows >= 2 && w.cols * w.rows <= R.C.worldSize.most && w.sketch.length === w.cols * w.rows,
      'seed ' + i + ': a world of ' + w.cols + ' x ' + w.rows,
    );
    need(s.year !== 'wide' || (w.cols === 5 && w.rows === 5), 'seed ' + i + ': a wide year is not 5 x 5');
  }
  need(sizes.size >= 10 && odd >= 3, 'too little variety in world sizes: ' + [...sizes].join(' '));
  const o = R.newGame(1, { worldsize: true });
  need(o.world.cols === 3 && o.world.rows === 3, 'NO=worldsize is not 3 x 3');
}
// More towns: every world has others, each in its own region, each can be walked into and used like the first.
{
  let towns = 0,
    cultures = 0;
  for (let i = 1; i <= 12; i++) {
    const s = R.newGame(i);
    need((s.towns || []).length >= 1, 'seed ' + i + ': no other town');
    need(
      new Set(R.allTowns(s).map((t) => t.area || 'overworld')).size === R.allTowns(s).length,
      'seed ' + i + ': two towns in one region',
    );
    for (const t of (s.towns || []).filter((t) => !t.realm)) {
      // another world's town is walked into from there (c4.test.js)
      towns++;
      if (t.culture) cultures++;
      const d = R.townDoor(s, t);
      goPlace(s, { area: t.area, x: d.x, y: d.y });
      s.creatures = [];
      s.player.stamina = 100;
      s.player.coin = 100;
      need(
        R.move(s, 0, -1) && R.areaRec(s).kind === 'town' && s.area === t.id && R.curTown(s) === t,
        'seed ' + i + ': could not walk into ' + t.name,
      );
      const el = R.findHere(s, 'elder'),
        shop = R.findHere(s, 'shop'),
        inn = R.findHere(s, 'inn');
      need(el && shop && inn, 'seed ' + i + ': ' + t.name + ' lacks an elder, a shop or an inn');
      if (!el || !shop || !inn) continue;
      s.player.x = el.x;
      s.player.y = el.y;
      need(
        R.talkElder(s) && t.speech.length && !s.quest.told,
        'seed ' + i + ': the elder of ' + t.name + ' said nothing, or told the story',
      );
      need(s.town.speech.length === 0 || s.town !== t, 'the story town spoke instead');
      s.player.x = shop.x;
      s.player.y = shop.y;
      const n = t.stock.length;
      need(R.buy(s, t.stock[0].id) && t.stock.length === n - 1, 'seed ' + i + ': could not buy in ' + t.name);
      s.player.x = inn.x;
      s.player.y = inn.y;
      s.player.hp = 1;
      need(R.inn(s) && s.player.hp === s.player.hpMax, 'seed ' + i + ': no bed in ' + t.name);
      s.player.x = 18;
      s.player.y = 35;
      R.move(s, 0, 1);
      need(s.area === t.area, 'seed ' + i + ': could not walk out of ' + t.name);
    }
  }
  need(cultures === towns, 'some other towns have no culture');
  need(!(R.newGame(3, { moretowns: true }).towns || []).length, 'NO=moretowns still made towns');
}
// Crafting: kills, searches and gathering give materials; each recipe makes what it says; a torch lights the dark.
{
  const s = R.newGame(4);
  s.creatures = [];
  const c =
    s.areas[Object.keys(s.areas).find((k) => s.areas[k].kind === 'region' && s.areas[k].map && s.areas[k].map.creatures.length)]
      .map.creatures[0];
  R.emit(s, 'killed', { sp: c.sp, tier: c.tier, c });
  need(
    Object.values(s.player.mats || {}).some((n) => n > 0),
    'a kill gave no materials',
  );
  const before = R.weight(s);
  s.player.mats = { hide: 9, bone: 9, salvage: 9, herbs: 9 };
  need(R.weight(s) > before + 5, 'materials weigh nothing');
  s.player.fuel = 20;
  for (const r of R.C.crafting.recipes) {
    if (r.makes === 'shelter') continue;
    const n = s.player.items.length;
    need(R.craft(s, r.id) && s.player.items.length === n + 1 && s.player.items[n].base === r.makes, 'could not make ' + r.id);
  }
  const torch = s.player.items.find((i) => i.base === 'torch');
  s.player.items.forEach((i) => {
    if (i.base === 'lantern') delete i.eq;
  });
  const dark = R.stat(s, 'nightSight', 0);
  R.useItem(s, torch.id);
  need(R.stat(s, 'nightSight', 0) > dark, 'a torch gives no light');
  // a shelter, on open ground
  let k = 0;
  while (s.sites[k] || s.terrain[k] === 2 || s.terrain[k] >= 4) k++;
  s.player.x = k % R.W;
  s.player.y = Math.floor(k / R.W);
  need(!R.inShelter(s) && R.craft(s, 'shelter') && R.inShelter(s), 'a shelter is not shelter');
  // a traveller's materials lie with the body
  s.player.mats = { hide: 3 };
  s.over = { won: false, cause: 'thirst' };
  const at = s.player.y * R.W + s.player.x,
    area = s.area;
  R.nextTraveller(s, R.makeChar(Math.random, s));
  const body = R.mapOf(s, area).depots[at];
  need(body && body.mats && body.mats.hide === 3 && !(s.player.mats || {}).hide, 'materials did not stay with the body');
  const o = R.newGame(4, { crafting: true });
  o.off.crafting = true;
  need(!R.recipes(o).length, 'NO=crafting still offers recipes');
}
// Trade: a town sells cheap what it makes and buys dear what it does not; goods weigh; a profit is to be had.
{
  let profit = 0,
    worlds = 0;
  for (let i = 1; i <= 15; i++) {
    const s = R.newGame(i),
      prices = {};
    for (const t of R.allTowns(s)) {
      const d = R.townDoor(s, t);
      R.travelTo(s, t.area || 'overworld', d.x, d.y);
      s.creatures = [];
      R.move(s, 0, -1);
      for (const g of R.market(s)) (prices[g.id] = prices[g.id] || []).push(g);
      s.player.x = 18;
      s.player.y = 35;
      R.move(s, 0, 1);
    }
    let best = 0;
    for (const id in prices) {
      const made = prices[id].filter((g) => g.made),
        want = prices[id].filter((g) => !g.made);
      if (made.length && want.length)
        best = Math.max(best, Math.max(...want.map((g) => g.sell)) - Math.min(...made.map((g) => g.buy)));
    }
    if (best > 0) worlds++;
    profit += best;
  }
  need(worlds >= 10, 'only ' + worlds + ' of 15 worlds have a trade worth making');
  const s = R.newGame(2),
    t = s.town,
    d = R.townDoor(s);
  R.travelTo(s, t.area || 'overworld', d.x, d.y);
  s.creatures = [];
  R.move(s, 0, -1);
  const g = R.market(s).find((x) => x.made && x.stock > 0);
  if (g) {
    s.player.coin = 100;
    const w = R.weight(s);
    need(R.buyGood(s, g.id) && s.player.coin === 100 - g.buy && R.weight(s) > w, 'could not buy ' + g.id);
    need(
      R.sellGood(s, g.id) && s.player.coin === 100 - g.buy + g.sell && g.sell < g.buy,
      'selling back did not pay less than buying',
    );
  }
  s.player.mats = { hide: 2 };
  need(R.sellMat(s, 'hide') && s.player.mats.hide === 1, 'could not sell a hide');
}
// Things (commission 7): made from the seed the same every time, in levels and round ruins and caves, never stored;
// taking one makes an item of it, remembered by id; the switch makes none.
{
  const X = R.C.things,
    kinds = new Set(X.kinds.map((k) => k.id));
  const all = [X.rooms, X.places, X.trades, X.climates, X.years];
  for (const group of all)
    for (const k in group)
      for (const f of ['wall', 'middle', 'small'])
        for (const [id] of group[k][f] || []) need(kinds.has(id), 'things: ' + k + ' names no thing ' + id);
  for (const k in X.buildings) for (const room of X.buildings[k]) need(X.rooms[room], 'things: ' + k + ' has no room ' + room);
  for (const sec of X.secrets.list) for (const id of sec.of) need(kinds.has(id), 'things: a secret names no thing ' + id);
  for (const k of X.kinds) {
    if (k.fixed) need(X.sizes[k.id], 'things: furniture ' + k.id + ' has no size');
    else need(k.wt > 0 && k.value >= 0 && R.byId(R.C.bases, 'th_' + k.id), 'things: ' + k.id + ' cannot be carried');
  }
  let levels = 0,
    regions = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const s = R.newGame(seed);
    R.setGodMode(s, true);
    for (const p of R.places(s)) {
      if (p.group !== 'Below' && p.group !== 'Regions' && p.group !== 'Above' && p.group !== 'Water') continue;
      R.jumpTo(s, p.id);
      const a = R.thingsIn(s, s.area),
        b = R.thingsIn(s, s.area);
      need(a === b || JSON.stringify(a) === JSON.stringify(b), 'things are not the same twice');
      need(new Set(a.map((t) => t.id)).size === a.length, 'two things share an id in ' + s.area);
      for (const t of a) {
        need(
          t.x >= 0 && t.y >= 0 && t.x < R.W && t.y < R.H && Math.abs(t.px) <= 0.75 && Math.abs(t.pz) <= 0.75,
          'a thing out of place',
        );
        need(
          R.passable(s, t.x, t.y) || R.areaRec(s).kind === 'region' || s.terrain[t.y * R.W + t.x] === R.FLOOR,
          'a thing in a wall',
        );
      }
      if (R.areaRec(s).kind === 'region') regions += a.length;
      else levels += a.length;
    }
    need(!JSON.stringify(R.serialize(s)).includes('"k":"cup"'), 'things are stored in the save');
  }
  need(levels > 200 && regions > 200, 'too few things: ' + levels + ' in levels, ' + regions + ' round ruins and caves');
  // taking: an item of the same name, gone from the place, remembered across a save, and weighing what it should
  const s = R.newGame(11);
  R.setGodMode(s, true);
  R.jumpTo(s, R.places(s).find((p) => p.group === 'Below').id);
  s.godMode = false;
  const t = R.thingsLeft(s, s.area).find((x) => !R.thingKind(x.k).fixed),
    w0 = R.weight(s);
  s.player.x = t.x;
  s.player.y = t.y;
  const btn = R.actions(s).find((a) => a.id === 'takeThing' && a.arg === t.id);
  need(btn, 'no button to take a thing in reach');
  need(R.takeThing(s, t.id), 'could not take a thing');
  const it = s.player.items[s.player.items.length - 1];
  need(
    it.thing && it.thing.k === t.k && btn.label.toLowerCase().includes(R.itemName(it).toLowerCase()),
    'the item is not the thing: ' + R.itemName(it),
  );
  need(Math.abs(R.weight(s) - w0 - R.thingKind(t.k).wt) < 1e-6, 'a thing weighs nothing');
  need(!R.thingsLeft(s, s.area).some((x) => x.id === t.id) && !R.takeThing(s, t.id), 'a thing taken is still there');
  const back = R.deserialize(R.serialize(s)).state;
  need(!R.thingsLeft(back, back.area).some((x) => x.id === t.id), 'a taken thing comes back after loading');
  // put down, it lies there as an item
  need(R.leaveItem(s, it.id) && s.depots[s.player.y * R.W + s.player.x].items.some((i) => i.thing), 'a thing put down is lost');
  // too heavy: refused
  s.player.items.push(...Array.from({ length: 40 }, () => R.makeItem(s, 'th_pick')));
  const heavy = R.thingsLeft(s, s.area).find((x) => !R.thingKind(x.k).fixed && x.x === s.player.x && x.y === s.player.y);
  if (heavy) need(!R.takeThing(s, heavy.id), 'took a thing past the carry limit');
  // switched off: none
  const off = R.newGame(11, { things: true });
  R.setGodMode(off, true);
  R.jumpTo(off, R.places(off).find((p) => p.group === 'Below').id);
  need(R.thingsIn(off, off.area).length === 0, 'NO=things still makes things');
}
// The look (commission 6, view only): built from layers of content/looks.js by src/view/look.js, which needs no screen.
async function lookChecks() {
  const L = await import('../src/view/look.js'),
    X = R.C.looks;
  let plain = 1;
  while (L.oddLook(plain, 'r1_1')) plain++; // a world and a country with no rare look
  const ctx = (o) =>
    Object.assign(
      {
        seed: plain,
        biome: 'x',
        climate: 'temperate',
        biomeSky: null,
        region: 'r1_1',
        year: '',
        trouble: '',
        cursed: false,
        rare: '',
        realm: null,
      },
      o,
    );
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  // every climate a biome can have has a look, and every year, rare country, trouble and fall of weather named is real
  for (const cl of R.C.biomeGen.climates) need(X.climates[cl.id], 'no look for the climate ' + cl.id);
  for (const b of ['salt', 'moor', 'taiga']) need(X.climates[X.biomeClimate[b]], 'no look for the biome ' + b);
  const ids = (list) => new Set(list.map((e) => e.id));
  const years = ids(R.C.year.common.concat(R.C.year.rare)),
    rares = ids(R.C.regionRares.list),
    kinds = ids(R.C.plots.kinds);
  for (const k in X.years) need(years.has(k), 'the look names a year that is not one: ' + k);
  for (const k in X.rares) need(rares.has(k), 'the look names a rare country that is not one: ' + k);
  for (const k in X.troubles) need(k === 'curse' || kinds.has(k), 'the look names a trouble that is not one: ' + k);
  for (const k in X.weather) need(['storm', 'rain', 'snow', 'dust', 'hail', 'ash', 'stars'].includes(k), 'odd weather look ' + k);
  // the same world always looks the same; worlds differ (one's taiga steel blue, another's violet-grey)
  const a = L.lookFor(ctx({ climate: 'cold' }), 1, 0, null),
    b = L.lookFor(ctx({ climate: 'cold' }), 1, 0, null);
  need(L.toHex(a.zenith) === L.toHex(b.zenith), 'the same world rolled two looks');
  const zen = new Set();
  for (let seed = 1; seed <= 40; seed++) zen.add(L.toHex(L.lookFor(ctx({ seed, climate: 'cold' }), 1, 0, null).zenith));
  need(zen.size > 20, 'worlds do not vary their look: ' + zen.size + ' skies in 40 worlds');
  // the hour, the weather and the troubles each do what they say
  const day = L.lookFor(ctx(), 1, 0, null),
    night = L.lookFor(ctx(), 0, 0, null),
    dusk = L.lookFor(ctx(), 0.6, 1, null);
  need(lum(night.horizon) < lum(day.horizon) * 0.4, 'night is not dark');
  need(dusk.sun[2] < day.sun[2] - 0.15 && dusk.horizon[0] > dusk.horizon[2], 'dusk is not warm');
  const storm = L.lookFor(ctx(), 1, 0, 'rain');
  need(storm.sat < day.sat - 0.1 && storm.names.includes('Grey storm'), 'a storm is not grey');
  const cursed = L.lookFor(ctx({ cursed: true }), 1, 0, null);
  need(cursed.horizon[1] > cursed.horizon[2] + 0.05 && cursed.names.includes('Sickly green'), 'a cursed land is not green');
  // another world is drawn in clean line: ink everywhere, two bands; and in a palette of its own
  const realm = L.lookFor(ctx({ realm: 99 }), 1, 0, null);
  need(
    realm.line > 0.9 && Math.round(realm.bands) === 2 && realm.names.includes('Clean line'),
    'another world is not drawn in clean line',
  );
  need(day.line === 0, 'the home world has ink lines on the land');
  const pals = new Set();
  for (let seed = 1; seed <= 60; seed++) pals.add(L.realmPalette(seed).name);
  need(pals.size >= X.realm.palettes.length - 1, 'other worlds roll only ' + pals.size + ' palettes');
  // rare looks come about as often as they should, and never to home
  let worlds = 0,
    countries = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const o = L.oddLook(seed, 'overworld');
    if (o) worlds++;
    else if (L.oddLook(seed, 'r2_3')) countries++;
  }
  need(worlds > 2000 * X.worldChance * 0.5 && worlds < 2000 * X.worldChance * 1.6, 'rare world looks: ' + worlds + ' in 2000');
  need(countries > 1900 * X.countryChance * 0.5 && countries < 1900 * X.countryChance * 1.6, 'rare country looks: ' + countries);
  // from a real world: its year and its great trouble are read
  const s = R.newGame(11),
    c = L.lookContext(R, s);
  need(
    c.year === s.year && c.trouble === R.mainPlot(s).kind && c.climate,
    'the look does not read the world: ' + JSON.stringify(c),
  );
  need(L.lookFor(c, 1, 0, null).names.length >= 1, 'a real world has no look');
}
// The score (commission 7, view only): src/view/score.js composes from content/music.js with no sound.
async function scoreChecks() {
  const S = await import('../src/view/score.js'),
    X = R.C.music;
  for (const k in X.places) {
    const p = X.places[k];
    need(X.dances[p.dance], 'music: ' + k + ' names no dance');
    need(X.modes[p.mode], 'music: ' + k + ' names no mode');
    need(['harpsichord', 'lute', 'bell', 'organ', 'pipe'].includes(p.voice), 'music: ' + k + ' has an unknown voice');
  }
  for (const k in X.dances)
    for (const c of X.dances[k].cells) {
      const d = X.dances[k];
      need(c.reduce((a, u) => a + Math.abs(u), 0) === d.beats * d.sub, 'music: a ' + k + ' rhythm does not fill its bar');
    }
  // a place's theme is its own (the same each time), different places differ, and it falls back along its key
  const sig = (key) => JSON.stringify(S.themeOf(X, key).shapes);
  need(sig('town:city') === sig('town:city'), 'a theme is not the same twice');
  const keys = ['town:city', 'town:hamlet', 'land:cold:day:taiga', 'land:cold:day:x9', 'deep:crypt', 'sea:merhall', 'fight'];
  need(new Set(keys.map(sig)).size === keys.length, 'two places share a theme');
  need(S.placeOf(X, 'town:city:salt') === X.places['town:city'] && S.placeOf(X, 'nowhere') === X.places.land, 'fallback');
  // tunes play: notes in range, a bar fills its beats, the towns are on the harpsichord, the tune varies as it repeats
  for (const k of Object.keys(X.places).concat(['land:hot:night:salt', 'elsewhere:r2'])) {
    const tu = S.makeTune(X, k, 7);
    let n = 0;
    const firsts = [];
    for (let b = 0; b < 64; b++) {
      const bar = S.nextBar(tu);
      need(bar.spb > 0.2 && bar.spb < 1.5, 'music: ' + k + ' tempo');
      for (const x of bar.notes) {
        n++;
        need(
          x.m >= 24 && x.m <= 100 && x.t >= 0 && x.t + x.d <= bar.beats + 1e-6 && x.d > 0,
          'music: a bad note in ' + k + ': ' + JSON.stringify(x),
        );
      }
      if (b % 16 === 0) firsts.push(JSON.stringify(bar.notes.filter((x) => x.voice === tu.place.voice).map((x) => x.m)));
    }
    need(n > 40, 'music: ' + k + ' hardly plays (' + n + ' notes in 64 bars)');
    need(new Set(firsts).size > 1, 'music: ' + k + ' never varies');
  }
  need(
    X.places['town:city'].voice === 'harpsichord' && X.dances[X.places['town:city'].dance].beats === 3,
    'the city has no minuet',
  );
  for (const e of ['discovery', 'win', 'death']) need(S.eventPiece(X, e, 3).length >= 6, 'music: no piece for ' + e);
}
lookChecks()
  .catch((e) => errs.push('the look: ' + (e.stack || e)))
  .then(() => scoreChecks())
  .catch((e) => errs.push('the score: ' + (e.stack || e)))
  .then(() => {
    if (errs.length) {
      console.log('piece problems:\n  ' + errs.join('\n  '));
      process.exit(1);
    }
    console.log(
      'pieces ok: year, rolled gods, artifacts, rare regions, creature specials, exotics, towns, errands, odd weather, generated biomes, odd levels, relic natures, lairs, far finds, town life, roster, plot, hamlets, tiers, world size, more towns, crafting, trade, the look, the score, things',
    );
  });
