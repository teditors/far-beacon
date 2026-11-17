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
console.log('wrote v' + R.VERSION + ' fixtures');
