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
if (errs.length) { console.log('commission 4 problems:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('c4 ok: ' + done.join(', '));
