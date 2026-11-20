// Checks for the fourth commission's pieces: god mode and world settings, dungeons, the sky, the sea, other worlds.
const { Rules: R } = require('./lib');
const errs = [];
const need = (c, m) => { if (!c) errs.push(m); };
const done = [];

// God mode: unhurt, unseen, through walls, jumps anywhere, and the world remembers it was used.
{
  const s = R.newGame(7);
  need(!s.cheated, 'a new world is marked as cheated');
  R.setGodMode(s, true);
  need(s.godMode && s.cheated, 'god mode did not switch on and mark the world');
  s.player.water = 0;
  for (let i = 0; i < 40; i++) R.rest(s);
  need(s.player.water >= 1 && s.player.stamina === 100 && s.player.warmth === 100 && !s.over, 'god mode still thirsts, tires or freezes');
  const list = R.places(s);
  need(list.filter((p) => p.group === 'Regions').length === s.world.cols * s.world.rows, 'the jump list does not hold every region');
  for (const p of list) {
    need(R.jumpTo(s, p.id), 'could not jump to ' + p.label);
    need(!s.over && !s.combat, 'jumping to ' + p.label + ' ended badly');
  }
  const t = list.find((p) => p.group === 'Towns');
  R.jumpTo(s, t.id);
  need(R.areaRec(s).kind === 'town', 'jumping to a town did not put the traveller in it');
  R.jumpTo(s, list[0].id);
  need(R.jumpMap(s, 5, 5) && R.inOverworld(s), 'a tap on the map did not jump');
  // walls do not stop a god
  s.terrain[s.player.y * R.W + s.player.x + 1] = R.WALL;
  need(R.passable(s, s.player.x + 1, s.player.y), 'a wall stops god mode');
  R.setGodMode(s, false);
  need(!s.godMode && s.cheated && !R.passable(s, s.player.x + 1, s.player.y), 'god mode off is not mortal again, or forgot it was used');
  need(!R.jumpTo(s, list[0].id), 'jumping works without god mode');
  const back = R.deserialize(R.serialize(s)).state;
  need(back.cheated, 'a save forgets that god mode was used');
  done.push('god mode');
}

// World settings: plain options into newGame, kept in the world, and an ordinary world keeps none.
{
  need(!R.newGame(5).gen, 'an ordinary world stores settings');
  const s = R.newGame(5, {}, { size: '4x4', towns: 0, races: ['human', 'dwarf'], nRaces: 2, trouble: 'curse', bogus: 3 });
  need(s.world.cols === 4 && s.world.rows === 4, 'the chosen size was not used');
  need(!(s.towns || []).length, 'a world with no other towns has ' + (s.towns || []).length);
  need(s.offer.races.length === 2 && s.offer.races.every((r) => r === 'human' || r === 'dwarf'), 'the chosen races were not offered: ' + s.offer.races);
  need(R.mainPlot(s) && R.mainPlot(s).kind === 'curse', 'the chosen great trouble was not used');
  need(s.gen && s.gen.cols === 4 && !('bogus' in s.gen), 'the settings were not kept, or kept junk');
  const t = R.newGame(5, {}, { towns: 5, size: '7x7' });
  need(t.towns.length >= 3, 'asked for five more towns and got ' + t.towns.length);
  need(R.serialize(R.newGame(9, {}, { size: '3x3' })) === R.serialize(R.newGame(9, {}, { size: '3x3' })), 'settings make worlds that differ');
  need(R.genOf(R.newGame(5)).sky === R.C.worldSet.defaults.sky, 'genOf does not give the defaults');
  done.push('world settings');
}
// Dungeons: rolled with the world, a stair in a cave, ruin or cellar, every level walkable from its stair to the next,
// a heart and a prize at the bottom, and a level that survives saving.
{
  const W = R.W, path = (s, from, to) => { // can you walk from one tile to another on this level?
    const seen = new Set([from]), q = [from];
    for (let h = 0; h < q.length; h++) { const i = q[h]; if (i === to) return true;
      for (const j of [i + 1, i - 1, i + W, i - W]) if (j >= 0 && j < W * W && !seen.has(j) && Math.abs((j % W) - (i % W)) + Math.abs(Math.floor(j / W) - Math.floor(i / W)) === 1 && s.terrain[j] !== R.WALL) { seen.add(j); q.push(j); } }
    return false; };
  let worlds = 0, levels = 0, themes = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const s = R.newGame(seed);
    if (!s.deeps.length) continue;
    worlds++;
    for (const d of s.deeps) {
      themes.add(d.theme);
      R.setGodMode(s, true);
      need(R.jumpTo(s, 'deep:' + d.id + ':1') && R.areaRec(s).kind === 'deep', 'seed ' + seed + ': could not reach ' + d.name);
      R.setGodMode(s, false);
      const up = R.findHere(s, 'exit');
      need(up, 'seed ' + seed + ': ' + d.name + ' has no way out on level 1');
      for (let n = 1; n <= d.depth; n++) {
        levels++;
        const here = s.player.y * W + s.player.x, down = R.findHere(s, 'stairsDown');
        if (n < d.depth) {
          need(down && path(s, here, down.y * W + down.x), 'seed ' + seed + ': no way down on ' + d.name + ' level ' + n);
          if (!down) break;
          s.player.x = down.x; s.player.y = down.y; s.combat = null;
          s.player.items.push({ id: 99000 + n, base: 'lantern', known: true, eq: 'tool' }); s.player.fuel = 9;
          need(R.goDown(s) && R.areaRec(s).level === n + 1, 'seed ' + seed + ': could not go down ' + d.name + ' from level ' + n);
        } else {
          const prize = Object.keys(s.depots).find((k) => s.depots[k].prize === d.id), heart = s.creatures.find((c) => c.heart === d.id);
          need(prize !== undefined && (heart || d.plot), 'seed ' + seed + ': no prize or heart at the bottom of ' + d.name); // the plot's villain stands in for a Heart
          if (prize !== undefined) need(path(s, here, +prize), 'seed ' + seed + ': the prize of ' + d.name + ' cannot be reached');
        }
      }
      // a save in the deep loads in the deep
      const back = R.deserialize(R.serialize(s)).state;
      need(back && back.area === s.area && back.terrain.join() === s.terrain.join(), 'seed ' + seed + ': a save at the bottom of ' + d.name + ' did not come back');
    }
  }
  need(worlds >= 10, 'only ' + worlds + ' of 12 worlds have dungeons');
  need(themes.size >= 5, 'only ' + themes.size + ' dungeon themes in 12 worlds');
  need(!R.newGame(3, { deeps: true }).deeps, 'NO=deeps still rolled dungeons');
  need(!R.newGame(3, {}, { dungeons: 0 }).deeps.length, 'a world with dungeons set to none has some');
  // up and out again, to the stair you came down
  const s = R.newGame(4), d = s.deeps[0];
  R.setGodMode(s, true); R.jumpTo(s, 'deep:' + d.id + ':1'); R.setGodMode(s, false);
  const ex = R.findHere(s, 'exit'); s.player.x = ex.x; s.player.y = ex.y;
  need(R.goUp(s) && s.player.x === d.x && s.player.y === d.y && s.sites[d.y * W + d.x].deep === d.id, 'climbing out of a dungeon did not come back to its stair');
  need(R.actions(s).some((a) => a.id === 'enterDeep'), 'no button to go down at a dungeon stair');
  done.push('dungeons (' + levels + ' levels, ' + themes.size + ' themes)');
}
// Memory: maps away from the traveller keep their grids packed, and come back whole when asked for.
{
  const s = R.newGame(12, {}, { size: '7x7' });
  R.setGodMode(s, true);
  const regions = R.places(s).filter((p) => p.group === 'Regions');
  for (const p of regions) R.jumpTo(s, p.id);
  const cold = Object.keys(s.areas).filter((id) => s.areas[id].map && typeof s.areas[id].map.terrain === 'string');
  need(cold.length >= 30, 'only ' + cold.length + ' far maps are packed in a 7 x 7 world');
  const id = cold[0], m = R.mapOf(s, id);
  need(Array.isArray(m.terrain) && m.terrain.length === R.W * R.H && Array.isArray(m.seen), 'a packed map did not come back whole');
  const back = R.deserialize(R.serialize(s)).state;
  need(back && R.serialize(back) === R.serialize(s), 'a world with packed maps does not save and load the same');
  done.push('far maps packed (' + cold.length + ' of ' + Object.keys(s.areas).length + ')');
}
// The sky: about one world in four, a way to fly within reach, flying over anything at a cost, up to a sky place by its
// shadow, through its levels, and down again.
{
  let worlds = 0, kinds = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const s = R.newGame(seed);
    if (!s.skies || !s.skies.length) continue;
    worlds++;
    s.skies.forEach((k) => kinds.add(k.kind));
    const shop = R.allTowns(s).some((t) => t.stock.some((i) => i.base === 'wingboots')), deep = s.deeps.some((d) => (d.extra || []).some((i) => i.base === 'wingboots'));
    need(shop || deep || R.plotsOf(s).some((p) => p.kind === 'tyrant'), 'seed ' + seed + ': a sky world has no way to fly within reach'); // the tyrant's elder gives one
  }
  need(worlds >= 30 && worlds <= 70, worlds + ' of 200 worlds have sky places, not about 1 in 4');
  need(kinds.size >= 3, 'only ' + [...kinds] + ' kinds of sky place');
  need(!R.newGame(5, {}, { sky: 0 }).skies && R.newGame(5, {}, { sky: 1 }).skies.length, 'the sky setting does nothing');
  const s = R.newGame(9, {}, { sky: 1 }), k = s.skies[0];
  need(!R.canFly(s) && !R.takeOff(s), 'flew with nothing to fly with');
  const boots = { id: 9900, base: 'wingboots', known: true, eq: 'boots' };
  s.player.items.forEach((i) => { if (i.eq === 'boots') delete i.eq; });
  s.player.items.push(boots);
  s.weather.storm = false; s.weather.changeAt = 1e9; s.creatures = [];
  need(R.canFly(s) && R.takeOff(s) && R.aloft(s), 'could not take off with winged boots');
  need(R.actions(s).every((a) => ['land', 'survey', 'mend'].includes(a.id) || a.air), 'aloft, ground actions are still offered');
  // over a mountain or river at a flat cost; the cost is stamina
  const st0 = s.player.stamina, mc = R.moveCost(s, s.player.x + 1, s.player.y);
  need(mc.mins < s.tun.moveMin.plain, 'flying is not quicker than walking');
  R.move(s, 1, 0);
  need(s.player.stamina < st0, 'flying cost no stamina');
  // to the shadow and up
  R.setGodMode(s, true); R.jumpTo(s, 'region:' + k.area); R.setGodMode(s, false); s.player.x = k.x; s.player.y = k.y; s.player.stamina = 100; s.player.aloft = true; s.creatures = [];
  need(R.flyUp(s) && R.areaRec(s).kind === 'sky' && !R.aloft(s), 'could not fly up to ' + k.name);
  need(R.levelLook(s) && R.levelLook(s).void, 'a sky place has no look');
  need(s.terrain.some((t) => t === R.VOID) && !R.passable(s, 0, 0), 'the open air round a sky place can be walked on');
  for (let n = 1; n < k.levels; n++) {
    const up = R.findHere(s, 'skyway'), ups = Object.keys(s.sites).filter((q) => s.sites[q].kind === 'skyway' && !s.sites[q].back);
    need(ups.length, k.name + ' level ' + n + ' has no way on');
    if (!ups.length) break;
    s.player.x = ups[0] % R.W; s.player.y = Math.floor(ups[0] / R.W); s.combat = null;
    need(R.skyOn(s) && R.areaRec(s).level === n + 1, 'could not climb ' + k.name);
  }
  // and down again: back to the landing, then off the edge
  for (let g = 0; R.areaRec(s).level > 1 && g < 9; g++) { const b = +Object.keys(s.sites).find((q) => s.sites[q].kind === 'skyway' && s.sites[q].back); s.player.x = b % R.W; s.player.y = Math.floor(b / R.W); s.combat = null; R.skyOn(s); }
  const ld = R.findHere(s, 'landing'); s.player.x = ld.x; s.player.y = ld.y; s.combat = null;
  need(R.flyDown(s) && R.inOverworld(s) && R.aloft(s) && s.player.x === k.x && s.player.y === k.y, 'flying down did not come back over the shadow');
  // a storm throws you down
  s.weather.storm = true; R.rest(s);
  need(!R.aloft(s), 'a storm did not bring the traveller down');
  const back = R.deserialize(R.serialize(s)).state;
  need(back && back.skies.length === s.skies.length, 'sky places did not survive a save');
  done.push('the sky (' + worlds + ' of 200 worlds, ' + [...kinds].join(', ') + ')');
}
// The sea: seas in some worlds, lakes in others, deep water closed to the unready, boats and gills, places on and
// under the water, and drowning.
{
  let worlds = 0, kinds = new Set();
  for (let seed = 1; seed <= 120; seed++) {
    const s = R.newGame(seed);
    if (!s.world.sea) continue;
    worlds++;
    need(R.allTowns(s).some((t) => t.stock.some((i) => i.base === 'coracle')), 'seed ' + seed + ': a sea world sells no boat');
  }
  need(worlds >= 15, 'only ' + worlds + ' of 120 worlds have a sea');
  need(!R.newGame(4, {}, { sea: 0, size: '5x5' }).world.sea && R.newGame(4, {}, { sea: 1, size: '5x5' }).world.sea, 'the sea setting does nothing');
  const s = R.newGame(4, {}, { sea: 1, size: '5x5' });
  R.setGodMode(s, true);
  for (const p of R.places(s).filter((p) => p.group === 'Water')) { R.jumpTo(s, p.id); kinds.add(R.areaRec(s).place); need(R.areaRec(s).kind === 'sea' && R.levelLook(s), 'could not reach ' + p.label); }
  need(kinds.size >= 4, 'only ' + [...kinds] + ' kinds of place in the water');
  const raft = s.seaPlaces.find((p) => p.kind === 'raft'), under = s.seaPlaces.find((p) => p.kind === 'wreck' || p.kind === 'merhall');
  R.jumpTo(s, 'region:' + raft.area);
  R.setGodMode(s, false);
  s.creatures = []; s.weather.storm = false; s.weather.changeAt = 1e9; s.player.stamina = 100;
  // deep water is shut without a boat, open with one
  const deepNext = () => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = s.player.x + dx, y = s.player.y + dy; if (x >= 0 && y >= 0 && x < R.W && y < R.H && s.terrain[y * R.W + x] === R.DEEP) return [dx, dy]; } return null; };
  s.player.x = raft.x; s.player.y = raft.y; delete s.player.swims;
  need(!R.passable(s, raft.x, raft.y), 'deep water can be walked on with no boat');
  s.player.items.push({ id: 9950, base: 'coracle', known: true });
  R.rest(s);
  need(R.passable(s, raft.x, raft.y) && R.hasBoat(s), 'a coracle does not carry you over deep water');
  need(R.enterWater(s) && R.areaRec(s).place === 'raft' && R.findHere(s, 'trader'), 'could not board the floating town, or it has no trader');
  const ex = R.findHere(s, 'exit'); s.player.x = ex.x; s.player.y = ex.y; R.goUp(s);
  need(R.inOverworld(s) && s.player.x === raft.x, 'leaving the floating town did not put you back on the water');
  // under the water: a way to breathe first, and drowning without it
  R.travelTo(s, under.area, under.x, under.y); s.player.x = under.x; s.player.y = under.y; s.combat = null;
  need(!R.enterWater(s), 'dived with no way to breathe');
  s.player.items.push({ id: 9951, base: 'gills', known: true });
  R.useItem(s, 9951);
  need(R.breathes(s) && R.enterWater(s) && R.areaRec(s).kind === 'sea', 'a draught of gills did not let you dive');
  s.creatures = []; s.breatheUntil = 0; const hp = s.player.hp = s.player.hpMax = 50;
  R.rest(s);
  need(s.player.hp < hp, 'no harm with no breath under the water');
  const back = R.deserialize(R.serialize(s)).state;
  need(back && back.area === s.area && back.seaPlaces.length === s.seaPlaces.length, 'a save under the sea did not come back');
  done.push('the sea (' + worlds + ' of 120 worlds; ' + [...kinds].join(', ') + ')');
}
// Other worlds: rare doors, each to a world of its own seed and stranger countries, made only where touched; through
// and back, saved on the far side, a new traveller sets out from home.
{
  let worlds = 0, many = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const s = R.newGame(seed);
    if (!s.doors) continue;
    worlds++;
    if (s.doors.length > 1) many++;
  }
  need(worlds >= 8 && worlds <= 50, worlds + ' of 300 worlds have a door, not rarely');
  const s = R.newGame(5, {}, { doors: 1, maxDoors: 3 });
  need(s.doors.length >= 1 && s.doors.every((d) => s.realms[d.realm] && s.realms[d.realm].seed !== s.seed), 'a door without a world of its own');
  const d = s.doors[0], o = s.realms[d.realm], made = () => Object.keys(s.areas).filter((id) => id.startsWith(d.realm + ':')).length;
  need(made() <= 12, 'another world made ' + made() + ' areas before anyone went there');
  const gens = o.world.sketch.filter((e) => /^g/.test(e.biome)).length;
  need(gens >= o.world.sketch.length * 0.3, 'another world is no stranger than home: ' + gens + ' of ' + o.world.sketch.length + ' own countries');
  R.setGodMode(s, true); R.jumpTo(s, 'door:' + d.realm); R.setGodMode(s, false);
  const homeSeed = s.seed;
  need(R.stepThrough(s) && s.realm === d.realm && s.seed === o.seed && s.area.startsWith(d.realm + ':'), 'stepping through the door did not lead to the other world');
  need(/back through the door/.test(R.objective(s).text), 'the goal does not point home through the door: ' + R.objective(s).text);
  for (let i = 0; i < 30; i++) R.move(s, 1, 0);
  const text = R.serialize(s), back = R.deserialize(text).state;
  need(back && back.realm === d.realm && R.serialize(back) === text, 'a save in another world does not load the same');
  R.setGodMode(back, true); R.jumpTo(back, 'realm:' + d.realm + ':0_0'); R.jumpTo(back, 'door:' + d.realm); R.setGodMode(back, false);
  need(!back.realm && back.seed === homeSeed && back.area === d.area, 'god mode did not jump between the worlds');
  R.setGodMode(s, true); R.jumpTo(s, 'realm:' + d.realm + ':' + d.back.area.split(':r')[1]); R.setGodMode(s, false);
  s.player.x = d.back.x; s.player.y = d.back.y;
  need(R.stepThrough(s) && !s.realm && s.seed === homeSeed && s.area === d.area && s.player.x === d.x, 'the door home did not lead home');
  // dying in another world: the next traveller sets out from the well at home
  R.stepThrough(s); s.over = { won: false, cause: 'test' }; s.combat = null;
  need(R.nextTraveller(s, R.makeChar(() => 0.5, s)) && !s.realm && s.area === 'overworld', 'the next traveller did not set out from home');
  const ot = s.towns.find((t) => t.realm === d.realm);
  R.setGodMode(s, true);
  need(ot && R.jumpTo(s, 'town:' + ot.id) && R.areaRec(s).kind === 'town' && s.realm === d.realm && R.findHere(s, 'elder'), 'could not walk into the town of another world');
  R.setGodMode(s, false);
  need(!R.newGame(5, { realms: true }, { doors: 1 }).doors && !R.newGame(5, {}, { doors: 0 }).doors, 'doors with doors switched off');
  done.push('other worlds (' + worlds + ' of 300 worlds, ' + many + ' with more than one door)');
}
// The plot goes below, above, under and beyond: each new trouble can be finished by following its route (teleporting
// along each leg of the way and taking each step's action, so this checks the way, not the walking).
{
  const W = R.W;
  const talk = (s, id) => { R.setGodMode(s, true); R.jumpTo(s, 'town:' + id); R.setGodMode(s, false); const e = R.findHere(s, 'elder'); s.player.x = e.x; s.player.y = e.y; s.combat = null; R.talkElder(s); };
  function follow(s, goal, tag) {
    for (let g = 0; g < 30; g++) {
      const rt = R.route(s, goal);
      if (!rt) return tag + ': no route';
      if (rt.here || (goal.area === s.area && goal.x === undefined)) {
        if (rt.x !== undefined) { s.player.x = rt.x; s.player.y = rt.y; }
        return null;
      }
      if (rt.up && rt.x === undefined) return tag + ': no way out of ' + s.area;
      if (rt.x === undefined) return tag + ': a leg with no place, in ' + s.area + ' toward ' + goal.area;
      if (R.inOverworld(s) && (rt.x < 0 || rt.y < 0 || rt.x >= W || rt.y >= W)) {
        // in another region: go there (god mode, for the test), then on
        R.setGodMode(s, true); R.jumpTo(s, 'region:' + rt.area); R.setGodMode(s, false);
        if (s.area !== rt.area) { const c = rt.area.match(/:r(\d+)_(\d+)$/); if (c) { R.setGodMode(s, true); R.jumpTo(s, 'realm:' + rt.area.split(':')[0] + ':' + c[1] + '_' + c[2]); R.setGodMode(s, false); } }
        continue;
      }
      s.player.x = rt.x; s.player.y = rt.y; s.combat = null; s.player.stamina = 100; s.player.hp = s.player.hpMax;
      if (rt.fly && !R.aloft(s)) { s.weather.storm = false; R.takeOff(s); }
      if (!rt.act) return tag + ': a leg with nothing to do, in ' + s.area;
      if (rt.act === 'enterWater' && !R.breathes(s)) { const gl = s.player.items.find((i) => i.base === 'gills'); if (gl) R.useItem(s, gl.id); }
      const was = s.area;
      if (rt.act === 'leaveTown') { R.leaveTown(s); continue; }
      if (!R[rt.act](s)) return tag + ': could not ' + rt.act + ' at ' + s.area + ' ' + rt.x + ',' + rt.y + ' (' + s.log.slice(-1)[0].msg + ')';
      if (R.aloft(s)) R.land(s);
      if (s.area === was && rt.act !== 'stepThrough') return tag + ': ' + rt.act + ' went nowhere';
    }
    return tag + ': the way is too long';
  }
  const lantern = (s) => { s.player.items.forEach((i) => { if (i.eq === 'tool') delete i.eq; }); s.player.items.push({ id: 99100, base: 'lantern', known: true, eq: 'tool' }); s.player.fuel = 50; };
  const finished = [];
  for (const [trouble, set] of [['deepking', {}], ['tyrant', {}], ['drowned', { sea: 1, size: '5x5' }], ['beyond', { doors: 1 }], ['beast', { doors: 1 }]]) {
    let s = null;
    for (let seed = 7; seed < 60 && !s; seed++) {
      const w = R.newGame(seed, {}, Object.assign({ trouble }, set)), m = R.mainPlot(w);
      if (m && m.kind === trouble && (trouble !== 'beast' || m.roles.lair.where === 'realm' || m.roles.lair.where === 'deep')) s = w;
    }
    if (!s) { if (trouble !== 'beast') errs.push('no world with ' + trouble + ' as its great trouble'); continue; }
    const m = R.mainPlot(s);
    lantern(s); s.tun.carryCap = 99; s.player.hp = s.player.hpMax = 300; s.creatures = []; s.weather.storm = false; s.weather.changeAt = 1e9;
    talk(s, m.giver);
    need(m.known, trouble + ': the elder did not tell it');
    let problem = null;
    for (let step = 0; step < 8 && !s.over && !problem; step++) {
      const g = R.plotGoal(s, m);
      if (!g) { problem = trouble + ': no goal at step ' + m.step; break; }
      if (g.town) { talk(s, g.town); continue; }
      problem = follow(s, g, trouble + ' step ' + m.step);
      if (problem) break;
      const st = R.stepOf(m), before = m.step;
      if (st.do === 'kill') {
        const c = s.creatures.find((x) => x.plot === m.id); need(c, trouble + ': the creature is not where the route led');
        if (!c) break;
        // walk into it from beside it (with nothing else about to step in first)
        s.creatures = s.creatures.filter((x) => x.plot); c.hp = 1; c.cool = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (R.passable(s, c.x + dx, c.y + dy)) { s.player.x = c.x + dx; s.player.y = c.y + dy; break; }
        R.move(s, c.x - s.player.x, c.y - s.player.y);
        for (let k = 0; k < 40 && s.combat; k++) { s.player.hp = s.player.hpMax; R.attack(s); }
        const d = R.depotHere(s); if (d) for (const it of d.items.slice()) if (it.plot) R.takeItem(s, it.id);
      } else if (st.do === 'take') {
        for (const k in s.depots) for (const it of s.depots[k].items.slice()) if (it.plot === m.id) { s.player.x = k % W; s.player.y = Math.floor(k / W); R.takeItem(s, it.id); R.rest(s); }
      } else if (st.do === 'free') {
        s.player.water = 9; const a = R.actions(s).find((x) => x.id === 'plotAct'); if (a) R.plotAct(s, a.arg);
      }
      if (m.step === before && !m.done) { problem = trouble + ': step ' + st.do + ' did not finish (in ' + s.area + ')'; }
    }
    if (problem) errs.push(problem);
    else need(s.over && s.over.won, trouble + ': followed every step and did not win: ' + R.objective(s).text);
    if (s.over && s.over.won) finished.push(trouble);
  }
  done.push('troubles below, above, under and beyond (' + finished.join(', ') + ')');
}
// Kin: the windborn and the merrow are offered only where their places are, and do what they say.
{
  let wrong = 0, offered = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const s = R.newGame(seed), o = s.offer.races;
    if (o.includes('windborn') || o.includes('merrow')) offered++;
    if ((o.includes('windborn') && !(s.skies || []).length) || (o.includes('merrow') && !s.world.sea)) wrong++;
  }
  need(!wrong && offered >= 10, 'kin offered in ' + offered + ' worlds, ' + wrong + ' without their places');
  const s = R.newGame(9, {}, { sea: 1, size: '5x5' }), ch = R.makeChar(() => 0.5, s);
  ch.race = 'merrow'; R.setCharacter(s, ch);
  need(R.breathes(s) && s.player.swims, 'a merrow cannot breathe water or go on deep water');
  ch.race = 'windborn'; R.setCharacter(s, ch);
  need(R.canFly(s) && !s.player.swims, 'the windborn cannot fly, or swim when they should not');
  done.push('kin (' + offered + ' of 150 worlds)');
}
if (errs.length) { console.log('commission 4 problems:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('c4 ok: ' + done.join(', '));
