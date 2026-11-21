// Writes save fixtures in the CURRENT save format, to be kept as "old saves" once the format moves on.
// Run before bumping VERSION:  node tools/once/make-fixtures.js
const fs = require('fs');
const { Rules: R } = require('../../tests/lib');
const out = (name, s) => fs.writeFileSync(__dirname + '/../../tests/fixtures/save-v' + R.VERSION + '-' + name + '.json', R.serialize(s));
const go = (s, x, y) => { s.player.x = x; s.player.y = y; };
{ const s = R.newGame(11); R.survey(s); R.move(s, 1, 0); out('outdoors', s); }
{ const s = R.newGame(12); go(s, s.town.x, s.town.y); R.enterTown(s); R.move(s, 0, -1); out('in-town', s); }
{ const s = R.newGame(13); go(s, s.town.x, s.town.y); s.camp = { area: 'overworld', i: s.town.y * R.W + s.town.x }; s.depots[s.camp.i] = { items: [], fuel: 1 }; out('camp-at-town', s); }
{ const s = R.newGame(14); R.switchRegion(s, 0, 0, { x: 5, y: 5 }); R.move(s, 1, 0); out('far-region', s); }
// commission 4's places: down a dungeon, up in the sky, flying, under the sea, beyond a door (made by god mode, then
// switched off, so the save is an ordinary one that has been there)
const there = (name, seed, set, id, fn) => {
  const s = R.newGame(seed, {}, set);
  R.setGodMode(s, true);
  if (id) R.jumpTo(s, typeof id === 'function' ? id(s) : id);
  R.setGodMode(s, false);
  delete s.cheated;
  if (fn) fn(s);
  out(name, s);
};
there('c4-in-dungeon', 31, {}, (s) => 'deep:' + s.deeps[0].id + ':' + s.deeps[0].depth);
there('c4-in-sky', 32, { sky: 1 }, (s) => 'sky:' + s.skies[0].id + ':1');
there('c4-aloft', 33, { sky: 1 }, null, (s) => { s.player.items.push({ id: 9701, base: 'wingboots', known: true, eq: 'boots' }); s.weather.storm = false; R.takeOff(s); });
there('c4-under-sea', 34, { sea: 1, size: '5x5' }, (s) => R.places(s).find((p) => p.group === 'Water').id);
there('c4-beyond-door', 35, { doors: 1 }, (s) => 'realm:' + s.doors[0].realm + ':' + s.doors[0].back.area.split(':r')[1]);
console.log('wrote v' + R.VERSION + ' fixtures');
