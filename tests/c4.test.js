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
          need(prize !== undefined && heart, 'seed ' + seed + ': no prize or heart at the bottom of ' + d.name);
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
if (errs.length) { console.log('commission 4 problems:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('c4 ok: ' + done.join(', '));
