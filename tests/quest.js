// Completes the whole quest in 200 worlds, to prove every rolled variant can be finished.
// The overworld legs are teleported (the playtest covers walking outdoors); inside the town and the locked place the
// test walks every step, so it also proves each level is connected and its stairs and relic can be reached.
const { Rules: R, goPlace } = require('./lib');
const W = R.W,
  tally = {},
  problems = [];
let fail = 0;

// Teleport to a tile of a region (home unless `area` says otherwise); quest places may be in any region.
function go(s, x, y, area) {
  goPlace(s, { area: area || s.area, x, y });
}
function fight(s) {
  for (let g = 0; s.combat && !s.over && g < 400; g++) {
    s.player.hp = s.player.hpMax = 999;
    R.attack(s);
  }
  // a weak traveller against a creature that heals: a real player would leave; the test just finishes it
  const c = R.foe(s);
  if (c) {
    c.hp = 1;
    for (let g = 0; s.combat && !s.over && g < 400; g++) R.attack(s);
  }
}
const take = (s) => {
  const d = R.depotHere(s);
  if (d) for (const it of d.items.slice()) R.takeItem(s, it.id);
};
// Walk inside the current area along the shortest open path, fighting whatever gets in the way.
function walkTo(s, tx, ty) {
  const prev = new Array(W * W).fill(-1),
    start = s.player.y * W + s.player.x,
    goal = ty * W + tx,
    q = [start];
  prev[start] = start;
  while (q.length && prev[goal] < 0) {
    const i = q.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = (i % W) + dx,
        y = Math.floor(i / W) + dy,
        j = y * W + x;
      if (R.passable(s, x, y) && prev[j] < 0) {
        prev[j] = i;
        q.push(j);
      }
    }
  }
  if (prev[goal] < 0) return 'no path';
  const path = [];
  for (let i = goal; i !== start; i = prev[i]) path.unshift(i);
  for (const j of path) {
    s.player.stamina = 100;
    s.player.water = Math.max(s.player.water, 3);
    s.player.warmth = 100;
    if (!R.move(s, (j % W) - s.player.x, Math.floor(j / W) - s.player.y)) return 'blocked at ' + s.player.x + ',' + s.player.y;
    fight(s);
    if (s.over) return 'died';
  }
  return null;
}

for (let seed = 1; seed <= 200; seed++) {
  const s = R.newGame(seed),
    q = s.quest,
    shape = q.key + '/' + q.vault.id + '/' + q.dest,
    trouble = (msg) => problems.push('seed ' + seed + ' (' + shape + '): ' + msg);
  s.tun.carryCap = 999;
  s.player.hp = s.player.hpMax = 999;
  tally[shape] = (tally[shape] || 0) + 1;
  // the town: walk in, find the elder, buy a lantern if needed, walk out
  // the wall keeps you out everywhere but at the gate: in from the tile south of it, walking north
  const door = R.townDoor(s),
    ta = R.townArea(s);
  // from the west: in if the town's west edge is open there, turned back by a wall if not, and out the same way
  go(s, s.town.x - 3, s.town.y, ta);
  const westOpen = R.mapOf(s, 'town').terrain[18 * W] !== R.WALL;
  if (!!R.move(s, 1, 0) !== westOpen || (s.area === 'town') !== westOpen)
    trouble('the west side of the town did not do what its edge says');
  if (s.area === 'town') {
    R.move(s, -1, 0);
    if (s.area !== ta || s.player.x !== s.town.x - 3 || s.player.y !== s.town.y) trouble('did not come out where I went in');
  }
  go(s, door.x, door.y, ta);
  if (!R.move(s, 0, -1) || s.area !== 'town') trouble('could not walk in through the town gate');
  if (s.player.x !== R.TOWN_GATE.x || s.player.y !== R.TOWN_GATE.y) trouble('did not arrive in the gateway');
  const elder = R.findHere(s, 'elder'),
    shop = R.findHere(s, 'shop');
  let e = walkTo(s, elder.x, elder.y);
  if (e) trouble('town, to the elder: ' + e);
  // in a world whose great trouble is another plot, the elder tells that first and the relic's story on the next talk
  for (let k = 0; k < 3 && !q.told; k++) R.talkElder(s);
  if (!q.told) trouble('the elder did not give the quest');
  e = walkTo(s, shop.x, shop.y);
  if (e) trouble('town, to the shop: ' + e);
  if (!R.stat(s, 'nightSight', 0)) {
    const l = s.town.stock.find((i) => i.base === 'lantern');
    s.player.coin = 99;
    R.buy(s, l.id);
    R.equip(s, l.id);
    s.player.fuel = 6;
  }
  e = walkTo(s, R.TOWN_GATE.x, R.TOWN_GATE.y);
  if (e) trouble('town, to the gateway: ' + e);
  R.move(s, 0, 1);
  if (s.area !== ta) trouble('still in town after walking out of the gate');
  if (s.player.x !== door.x || s.player.y !== door.y) trouble('did not come out below the gate');
  // the key
  if (q.key === 'ruin') {
    const kr = R.keyRuin(s);
    go(s, kr.x, kr.y, kr.area);
    s.player.stamina = 100;
    R.search(s);
    take(s);
  }
  if (q.key === 'beast') {
    const b = R.beastOf(s),
      c = b.c;
    go(s, c.x - 1 >= 0 ? c.x - 1 : c.x + 1, c.y, b.area);
    s.player.stamina = 100;
    R.move(s, c.x - s.player.x, 0);
    fight(s);
    take(s);
  }
  if (!R.hasItem(s, 'key')) trouble('no key');
  // the locked place, level by level
  const v = R.findSite(s, 'vault');
  go(s, v.x, v.y, v.area);
  R.unlock(s);
  if (!R.enterVault(s)) trouble('could not go in');
  for (let lvl = 1; lvl <= v.st.floors.length && !s.over && !R.inOverworld(s); lvl++) {
    const down = R.findHere(s, 'stairsDown');
    if (down) {
      e = walkTo(s, down.x, down.y);
      if (e) trouble('level ' + lvl + ', to the stairs: ' + e);
      R.goDown(s);
    } else {
      let relicAt = null;
      for (const k in s.depots) if (s.depots[k].items.some((i) => i.base === 'relic')) relicAt = +k;
      if (relicAt === null) trouble('no relic on the last level');
      else {
        e = walkTo(s, relicAt % W, Math.floor(relicAt / W));
        if (e) trouble('last level, to the relic: ' + e);
        take(s);
      }
    }
  }
  if (!R.hasItem(s, 'relic')) trouble('did not get the relic');
  // and out again, climbing every level
  for (let g = 0; g < 6 && !R.inOverworld(s) && !s.over; g++) {
    const up = R.findHere(s, 'stairsUp') || R.findHere(s, 'exit');
    e = walkTo(s, up.x, up.y);
    if (e) trouble('climbing out: ' + e);
    R.goUp(s);
  }
  if (!R.inOverworld(s)) trouble('could not climb out');
  const d = q.dest === 'beacon' ? s.goal : R.findSite(s, 'shrine');
  go(s, d.x - 1, d.y, d.area || 'overworld');
  s.player.stamina = 100;
  s.player.water = 5;
  R.move(s, 1, 0);
  fight(s);
  if (q.dest === 'shrine') R.offer(s);
  const relicPlot = (s.plots || []).find((p) => p.kind === 'relic');
  if (!(s.over && s.over.won) && !(relicPlot && !relicPlot.main && relicPlot.done)) {
    fail++;
    trouble('not won: ' + JSON.stringify(R.objective(s)));
  }
}
if (problems.length) console.log(problems.slice(0, 12).join('\n'));
console.log(
  'quest: ' + Object.keys(tally).length + ' quest shapes, 200 worlds, failures ' + fail + ', problems ' + problems.length,
);
if (fail || problems.length) process.exit(1);
