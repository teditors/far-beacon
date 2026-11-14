// State tests: determinism, saving mid-run, world invariants, and a snapshot that notices when world generation changes.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { Rules: R } = require('./lib');
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
  need(new Set([tile(s.town), tile(v), tile(dest), tile(p)]).size === 4, 'seed ' + seed + ': two quest places share a tile');
  need(Object.values(s.sites).filter((x) => x.sure).length >= 3, 'seed ' + seed + ': fewer than three guaranteed springs');
  for (const c of s.creatures) if (!c.key) need(Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y)) >= 7, 'seed ' + seed + ': a creature starts too close');
  for (const k in s.sites) need(+k >= 0 && +k < R.W * R.H, 'seed ' + seed + ': a site is off the map');
}
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
