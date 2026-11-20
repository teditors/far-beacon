// State tests: determinism, saving mid-run, world invariants, and a snapshot that notices when world generation changes.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { Rules: R, goPlace } = require('./lib');
const errs = [], warns = [];
const need = (c, m) => { if (!c) errs.push(m); };
function scripted(s, steps, seed) {
  let a = seed | 0;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < steps && !s.over; i++) {
    if (s.combat) { R.attack(s); continue; }
    if (rnd() < 0.6) { const d = [[1, 0], [0, 1], [0, -1], [-1, 0]][Math.floor(rnd() * 4)]; R.move(s, d[0], d[1]); }
    else { const acts = R.actions(s).filter((x) => x.id !== 'pactAsk' && x.id !== 'townAsk'); const x = acts[Math.floor(rnd() * acts.length)]; if (x) R[x.id](s); }
  }
  return s;
}
// 1. the same seed always makes the same world
for (const seed of [1, 99, 12345]) need(R.serialize(R.newGame(seed)) === R.serialize(R.newGame(seed)), 'seed ' + seed + ' is not deterministic');
// 2. saving and loading mid-run changes nothing
for (const seed of [3, 17, 404]) {
  const a = scripted(R.newGame(seed), 80, seed), res = R.deserialize(R.serialize(a));
  need(res.state, 'seed ' + seed + ': save did not load: ' + res.error);
  if (res.state) need(R.serialize(scripted(a, 80, seed + 1)) === R.serialize(scripted(res.state, 80, seed + 1)), 'seed ' + seed + ': a loaded save plays differently');
}
need(R.deserialize('not json').error, 'garbage text should be refused');
need(R.deserialize(JSON.stringify({ v: R.VERSION + 1, player: {}, terrain: [] })).error, 'a save from the future should be refused');
// 2b. saves from older versions still load and play on (fixtures/save-v*.json were written by those versions)
for (const f of fs.readdirSync(path.join(__dirname, 'fixtures')).filter((f) => f.startsWith('save-v'))) {
  const res = R.deserialize(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
  need(res.state, f + ': did not load: ' + res.error);
  if (!res.state) continue;
  need(res.state.v === R.VERSION, f + ': not upgraded to the current version');
  try {
    const s = scripted(res.state, 150, 7);
    need(R.serialize(s).length > 0, f + ': could not be saved again');
    const v = R.findSite(s, 'vault');
    if (v.st.open && !s.over) {
      s.player.x = v.x;
      s.player.y = v.y;
      s.combat = null;
      need(R.enterVault(s) || R.stat(s, 'nightSight', 0) <= 0, f + ': could not go into the open vault');
    }
  } catch (e) {
    errs.push(f + ': crashed after loading: ' + e.message);
  }
}
// 3. invariants over many worlds
for (let seed = 1; seed <= 150; seed++) {
  const s = R.newGame(seed), p = s.player, tile = (pt) => pt.y * R.W + pt.x;
  need(R.weight(s) <= R.carryCap(s), 'seed ' + seed + ': starts overloaded');
  need(s.terrain[tile(p)] !== 2, 'seed ' + seed + ': starts on a mountain');
  const v = R.findSite(s, 'vault'), dest = s.quest.dest === 'beacon' ? s.goal : R.findSite(s, 'shrine');
  need(v && dest && s.town, 'seed ' + seed + ': a quest place is missing');
  const where = (pt) => (pt.area || 'overworld') + ':' + tile(pt);
  need(new Set([where(Object.assign({ area: R.townArea(s) }, s.town)), where(v), where(dest), where(p)]).size === 4, 'seed ' + seed + ': two quest places share a tile');
  { let sure = 0; for (const id in s.areas) { const m = R.mapOf(s, id); if (m && m.sites && s.areas[id].kind === 'region') sure += Object.values(m.sites).filter((x) => x.sure).length; } need(sure >= 3, 'seed ' + seed + ': fewer than three guaranteed springs'); }
  for (const c of s.creatures) if (!c.key) need(Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y)) >= 7, 'seed ' + seed + ': a creature starts too close');
  for (const k in s.sites) need(+k >= 0 && +k < R.W * R.H, 'seed ' + seed + ': a site is off the map');
  // the town's block: nothing else stands in it, nobody can be in it, and the tile below its south side is on the map
  const door = R.townDoor(s);
  goPlace(s, { area: R.townArea(s), x: door.x, y: door.y });
  need(door.y < R.H - 1 && s.town.x >= 3 && s.town.x < R.W - 3 && s.town.y >= 3, 'seed ' + seed + ': the town is too near the edge');
  for (const k in s.sites) if (s.sites[k].kind !== 'town') need(!R.inTownBlock(s, k % R.W, Math.floor(k / R.W)), 'seed ' + seed + ': a ' + s.sites[k].kind + ' stands inside the town walls');
  for (const c of s.creatures) need(!R.inTownBlock(s, c.x, c.y), 'seed ' + seed + ': a creature starts inside the town walls');
  need(!R.inTownBlock(s, s.player.x, s.player.y) && !R.passable(s, s.town.x, s.town.y) && R.passable(s, door.x, door.y), 'seed ' + seed + ': the town block is wrong');
  need(s.areas.town && s.areas.town.map && s.areas.town.map.terrain.length === R.W * R.H, 'seed ' + seed + ': the town was not built ahead');
}
// 3a. a save from before the town had walls: a camp left on the town's tile ends up outside the gate
{
  const res = R.deserialize(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v8-camp-at-town.json'), 'utf8')), s = res.state, d = R.townDoor(s);
  need(s.camp && s.camp.i === d.y * R.W + d.x && s.depots[s.camp.i], 'old save: the camp at the town was not moved to the gate');
  need(s.player.x === d.x && s.player.y === d.y, 'old save: the traveller was left inside the town walls');
}
// 3b. the wider world: every region is sound, borders wrap, and a save with many regions round-trips
let bigWorld = '', bigSave = 0, borderSame = 0, borderAll = 0, edgeAll = 0, edgeSame = 0, riverAll = 0, riverSame = 0, roadAll = 0, roadSame = 0;
for (let seed = 1; seed <= 40; seed++) {
  const s = R.newGame(seed), w = s.world, tag = 'seed ' + seed + ': ';
  need(w.cols * w.rows === w.sketch.length && new Set(w.sketch.map((e) => e.biome)).size >= 2, tag + 'the world sketch is wrong');
  // walk east all the way round, one real step across each border
  s.player.stamina = 1e6;
  for (let k = 0; k < w.cols; k++) {
    const rec = R.areaRec(s), eastId = R.regionId(s, (rec.cx + 1) % w.cols, rec.cy);
    let crossed = false;
    for (let y = 0; y < R.H && !crossed; y++) {
      s.player.x = R.W - 1; s.player.y = y; s.combat = null;
      if (!R.passable(s, s.player.x, y)) continue;
      const edge = s.terrain.filter((_, i) => i % R.W === R.W - 1);
      crossed = R.move(s, 1, 0);
      if (crossed && k === 0) for (let yy = 0; yy < R.H; yy++) { borderAll++; if ((edge[yy] === 2) === (s.terrain[yy * R.W] === 2)) borderSame++; }
      if (s.over) break;
    }
    if (s.over) break;
    need(crossed && s.area === eastId && s.player.x === 0, tag + 'could not walk east out of ' + rec.id);
  }
  if (s.over) continue;
  need(s.area === 'overworld', tag + 'walking east round the world did not come home');
  // every region; the quest's places are spread over the regions, each exactly once
  const placeCount = {};
  for (let cy = 0; cy < w.rows; cy++) for (let cx = 0; cx < w.cols; cx++) {
    R.switchRegion(s, cx, cy, { x: 18, y: 18 });
    const id = R.regionId(s, cx, cy);
    need(s.area === id && s.biome === w.sketch[cy * w.cols + cx].biome, tag + id + ' has the wrong biome');
    need(s.terrain.length === R.W * R.H && s.elev.length === R.W * R.H, tag + id + ' has a bad map');
    need(Object.values(s.sites).some((x) => x.kind === 'spring' && x.sure), tag + id + ' has no sure spring');
    for (const k in s.sites) need(s.terrain[k] !== 2 && +k >= 0 && +k < R.W * R.H, tag + id + ' has a site in a bad place');
    for (const c of s.creatures) need(s.species[c.sp], tag + id + ' has a creature of no species');
    need(cx === w.home.cx && cy === w.home.cy ? true : !Object.values(s.sites).some((x) => x.kind === 'well'), tag + id + ' has a second well');
    for (const k of ['town', 'vault']) placeCount[k] = (placeCount[k] || 0) + Object.values(s.sites).filter((x) => x.kind === k).length;
  }
  // borders: mountains nearly always agree, and rivers and roads cross at the same tiles on both sides
  need(placeCount.town === 1 && placeCount.vault === 1, tag + 'the town and the locked place are not each in exactly one region: ' + JSON.stringify(placeCount));
  const mapOf = (cx, cy) => { const id = R.regionId(s, (cx + w.cols) % w.cols, (cy + w.rows) % w.rows); return id === s.area ? s : s.areas[id].map; };
  for (let cy = 0; cy < w.rows; cy++) for (let cx = 0; cx < w.cols; cx++) {
    const a = mapOf(cx, cy), e = mapOf(cx + 1, cy), so = mapOf(cx, cy + 1);
    for (let k = 0; k < R.W; k++) {
      const pairs = [[k * R.W + R.W - 1, k * R.W, e], [(R.H - 1) * R.W + k, k, so]];
      for (const [i, j, b] of pairs) {
        edgeAll++; if ((a.terrain[i] === 2) === (b.terrain[j] === 2)) edgeSame++;
        if (a.terrain[i] === 4 || b.terrain[j] === 4) { riverAll++; if (a.terrain[i] === 4 && b.terrain[j] === 4) riverSame++; }
        if (a.road[i] || b.road[j]) { roadAll++; if (a.road[i] && b.road[j]) roadSame++; }
      }
    }
  }
  const wp = R.worldPos(s);
  need(Math.abs(wp.x) <= R.W * w.cols && Math.abs(wp.y) <= R.H * w.rows, tag + 'world position out of range');
  // a camp pitched far away is not "here" at home; a save with every region loads and plays on identically
  s.camp = { area: s.area, i: 18 * R.W + 18 };
  need(R.campHere(s) === 18 * R.W + 18, tag + 'camp not found where it was pitched');
  const text = R.serialize(s), res = R.deserialize(text);
  if (text.length > bigSave) bigWorld = w.cols + ' x ' + w.rows;
  bigSave = Math.max(bigSave, text.length);
  need(res.state && R.serialize(scripted(s, 60, seed)) === R.serialize(scripted(res.state, 60, seed)), tag + 'a many-region save plays differently after loading');
  // dying far from home: the next traveller still sets out from the well
  if (!s.over) { if (s.area === 'overworld') R.switchRegion(s, 0, 0, { x: 18, y: 18 }); s.combat = null; s.over = { won: false, why: 'test' }; }
  if (!s.over.won && R.livesLeft(s) > 0 && R.nextTraveller(s, R.makeChar(() => 0.5, s))) {
    need(s.area === 'overworld' && s.player.x === s.start.x && s.player.y === s.start.y, tag + 'the next traveller did not start at the well');
    need(R.campHere(s) === null || s.camp.area === 'overworld', tag + 'a far camp shows up at home');
  }
}
need(edgeSame / edgeAll > 0.95, 'mountains disagree across borders too often: ' + edgeSame + ' / ' + edgeAll);
need(riverAll > 0 && riverSame === riverAll, 'rivers do not line up across borders: ' + riverSame + ' / ' + riverAll);
need(roadSame === roadAll, 'roads do not line up across borders: ' + roadSame + ' / ' + roadAll);
warns.push('borders: mountains agree on ' + ((100 * edgeSame) / edgeAll).toFixed(1) + '% of tiles, ' + riverAll + ' river crossings and ' + roadAll + ' road crossings all line up');
warns.push('largest save with every region visited: ' + Math.round(bigSave / 1024) + ' KB (' + bigWorld + ')');
// 4. snapshot: tells you when a change alters what existing seeds generate (that is sometimes intended)
const snapFile = path.join(__dirname, 'snapshot.json');
const hash = (s) => crypto.createHash('sha1').update(R.serialize(s)).digest('hex').slice(0, 12);
const now = {};
for (const seed of [1, 2, 3, 42, 1000]) {
  const s = R.newGame(seed);
  now[seed] = { terrain: hash({ t: s.terrain, e: s.elev }), people: hash(s.civ), sites: hash(s.sites), quest: hash({ q: s.quest, t: s.town.name }), creatures: hash(s.creatures), all: hash(s) };
}
if (process.argv.includes('--update') || !fs.existsSync(snapFile)) { fs.writeFileSync(snapFile, JSON.stringify(now, null, 1)); warns.push('snapshot written'); }
else {
  const old = JSON.parse(fs.readFileSync(snapFile, 'utf8')), changed = new Set();
  for (const seed in now) for (const part in now[seed]) if (part !== 'all' && old[seed] && old[seed][part] !== now[seed][part]) changed.add(part);
  if (changed.size) warns.push('world generation changed for: ' + [...changed].join(', ') + '. Fine if intended; accept with: node tests/state.test.js --update');
}
for (const w of warns) console.log('note: ' + w);
if (errs.length) { console.log('state problems:\n  ' + errs.slice(0, 20).join('\n  ')); process.exit(1); }
console.log('state ok: determinism, save round trip, old saves upgrade, 150 worlds checked');
