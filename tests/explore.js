// Explorer fuzz: worlds made to have everything (dungeons, sky, sea, doors), entered place by place by god mode, then
// random play there with god mode off: every button the player is offered is pressed, every dialog asked for, and
// everything the screen shows each frame is asked for too, so an error anywhere the view could reach is caught.
// (A floating town's trader once crashed every frame; the ordinary fuzz never went there.)
const { Rules: R } = require('./lib');
let a = 9;
const rnd = () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const problems = [];
// what the view asks of the rules every frame or every panel
function screen(s) {
  R.actions(s);
  R.objective(s);
  R.levelLook(s);
  R.levelTitle(s);
  R.isLevel(s);
  R.forecast(s);
  R.wellfinder(s);
  R.shrineBearing(s);
  R.serviceInfo(s);
  R.worldNotes(s);
  R.weight(s);
  R.carryCap(s);
  R.waterCap(s);
  R.plotsOf(s).forEach((p) => p.kind !== 'relic' && R.plotObjective(s, p));
  if (R.inOverworld(s)) R.worldPos(s);
}
let steps = 0,
  kinds = {};
for (let w = 0; w < 12; w++) {
  const s = R.newGame(100 + w, {}, { sky: 1, sea: 1, doors: 1, size: w % 2 ? '5x5' : '4x4', dungeons: 2 });
  R.setGodMode(s, true);
  const places = R.places(s);
  for (let k = 0; k < 18; k++) {
    // every kind of place as often as any other: a group first, then a place in it
    const groups = [...new Set(places.map((q) => q.group))],
      g = groups[k % groups.length],
      inG = places.filter((q) => q.group === g),
      p = inG[Math.floor(rnd() * inG.length)];
    const tag = 'world ' + (100 + w) + ' at ' + p.id;
    try {
      s.over = null;
      s.combat = null;
      R.setGodMode(s, true);
      if (!R.jumpTo(s, p.id)) throw new Error('could not jump there');
      R.setGodMode(s, false);
      s.player.hp = s.player.hpMax;
      s.player.water = R.waterCap(s);
      s.player.stamina = 100;
      kinds[R.areaRec(s).kind] = (kinds[R.areaRec(s).kind] || 0) + 1;
      for (let i = 0; i < 60 && !s.over; i++) {
        steps++;
        screen(s);
        const acts = R.actions(s),
          x = rnd();
        if (x < 0.5 || !acts.length) {
          const d = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ][Math.floor(rnd() * 4)];
          R.move(s, d[0], d[1]);
          continue;
        }
        const act = acts[Math.floor(rnd() * acts.length)];
        if (act.id === 'townAsk') {
          // the dialog the button opens: read it, and take one of its options
          const info = act.section === 'elder' ? (R.talkElder(s), null) : R.serviceInfo(s);
          if (info && info.options.length) {
            s.player.coin = 500;
            const o = info.options[Math.floor(rnd() * info.options.length)];
            R.useService(s, o.id, o.arg);
          }
          continue;
        }
        if (act.id === 'pactAsk') {
          R.pact(s);
          continue;
        }
        if (typeof R[act.id] === 'function') R[act.id](s, act.arg);
      }
      screen(s);
      // and it saves and loads
      const back = R.deserialize(R.serialize(s));
      if (!back.state) throw new Error('save did not load: ' + back.error);
      screen(back.state);
    } catch (e) {
      problems.push(tag + ': ' + e.message + ' / ' + (e.stack || '').split('\n')[1]);
    }
  }
}
if (problems.length) {
  console.log('explore problems:\n  ' + [...new Set(problems)].slice(0, 15).join('\n  '));
  process.exit(1);
}
console.log('explore ok: ' + steps + ' steps in ' + JSON.stringify(kinds));
