/* Levels, hit points, mana and experience. */
import { scores } from './character.js';
import { C, byId, on, say, srand } from './core.js';
import { stat } from './stats.js';

/* Level, hit points, mana */
const amod = (v) => Math.floor((v - 10) / 2),
  clsOf = (s) => byId(C.classes, s.char.cls),
  prof = (s) => 1 + Math.floor(s.player.level / 2);
const xpFor = (level) => 50 * level * (level + 1);
function manaMax(s) {
  const c = clsOf(s);
  return c.caster ? s.player.level * (c.manaPer + Math.max(0, amod(scores(s.char)[c.caster]))) : 0;
}
function gainXp(s, n) {
  if (s.over || !n) return;
  const p = s.player;
  p.xp += n;
  while (p.xp >= xpFor(p.level)) {
    p.level++;
    const up = Math.max(1, Math.floor(clsOf(s).hd / 2) + 1 + amod(scores(s.char).con));
    p.hpMax += up;
    p.hp += up;
    p.manaMax = manaMax(s);
    p.mana = p.manaMax;
    say(
      s,
      'Level ' +
        p.level +
        '. You are harder to kill: ' +
        p.hpMax +
        ' hit points' +
        (p.manaMax ? ', ' + p.manaMax + ' mana' : '') +
        '.',
      'good',
    );
  }
}
on('learned', (s, d) => {
  if (d.axis !== 'god') gainXp(s, 15);
});
const playerAC = (s) => 10 + amod(scores(s.char).dex) + stat(s, 'ac', 0);
function weaponOf(s) {
  const it = s.player.items.find((i) => i.eq === 'weapon');
  return it ? { it, w: byId(C.bases, it.base).weapon } : { it: null, w: { dice: [1, 3] } };
}
function roll(s, n, sides) {
  let t = 0;
  for (let i = 0; i < n; i++) t += 1 + Math.floor(srand(s) * sides);
  return t;
}

export { amod, clsOf, prof, xpFor, manaMax, gainXp, playerAC, weaponOf, roll };
