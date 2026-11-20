// Shared test helper: builds the rules fresh and returns them, so tests always run against the current source.
const { buildRules } = require('../tools/build.js');
const Rules = require(buildRules()).Rules;
globalThis.Rules = Rules;
module.exports = { Rules, R: Rules };
// Put the traveller on a place outdoors, in whatever region it is in: { area, x, y } (area defaults to home).
function goPlace(s, p) {
  const area = p.area || 'overworld',
    rec = s.areas[area];
  if (rec && rec.kind === 'region' && s.area !== area) Rules.switchRegion(s, rec.cx, rec.cy, { x: p.x, y: p.y });
  s.player.x = p.x;
  s.player.y = p.y;
}
module.exports.goPlace = goPlace;
