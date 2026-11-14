/* Systems that run as time passes (Lego rule 4: each can be switched off). */
import { biomeOf, clamp, clock, say, srand } from './core.js';
import { active } from './equipment.js';
import { isCursed, itemName } from './items.js';
import { phase } from './map.js';
import { stat } from './stats.js';

/* Systems: each reads state, changes its own part, and can be switched off (rule 4). */
const SYSTEMS = [
  {
    id: 'weather',
    fn(s) {
      if (s.off.weather) {
        s.weather.storm = false;
        return;
      }
      if (s.time >= s.weather.changeAt) {
        s.weather.storm = !s.weather.storm;
        s.weather.changeAt = s.time + (s.weather.storm ? 180 + srand(s) * 240 : (480 + srand(s) * 720) * s.tun.stormGap);
        say(
          s,
          s.weather.storm ? 'A ' + biomeOf(s).storm.name + ' breaks over you.' : 'The ' + biomeOf(s).storm.name + ' passes.',
          s.weather.storm ? 'bad' : 'good',
        );
      }
    },
  },
  {
    id: 'thirst',
    fn(s, dt, ctx) {
      let rate = stat(s, 'waterDrain', s.tun.waterPerHour);
      if (ctx.activity !== 'move') rate *= s.tun.restWaterFactor;
      if (s.player.water > 0) rate += stat(s, 'leak', 0);
      s.player.water = Math.max(0, s.player.water - rate * dt);
      if (s.player.water <= 0) {
        s.player.stamina -= 15 * dt;
        s.cause = 'thirst';
      }
    },
  },
  {
    id: 'warmth',
    fn(s, dt) {
      const cold =
        stat(s, 'cold', phase(s).cold * s.tun.coldScale) +
        (s.weather.storm ? stat(s, 'stormCold', biomeOf(s).storm.cold * s.tun.coldScale) : 0);
      const warm = stat(s, 'warm', phase(s).warm);
      s.player.warmth = clamp(s.player.warmth + (warm - cold) * dt, 0, 100);
      if (s.player.warmth <= 0) {
        s.player.stamina -= 12 * dt;
        s.cause = 'cold';
      }
    },
  },
  {
    id: 'lantern',
    fn(s, dt, ctx) {
      if (clock(s).isDay || ctx.activity !== 'move' || s.player.fuel <= 0) return;
      if (!s.player.items.some((it) => it.base === 'lantern')) return;
      s.player.fuel = Math.max(0, s.player.fuel - s.tun.lanternFuelPerHour * stat(s, 'fuelUse', 1) * dt);
      if (s.player.fuel <= 0) say(s, 'Your lantern gutters out. No fuel left.', 'bad');
    },
  },
  {
    id: 'identify',
    fn(s, dt) {
      for (const it of s.player.items)
        if (!it.known && active(it)) {
          it.carried += dt;
          if (it.carried >= s.tun.autoIdHours * stat(s, 'studyTime', 1)) {
            it.known = true;
            say(s, 'After long use you understand it: ' + itemName(it) + '.', isCursed(it) ? 'bad' : 'good');
          }
        }
    },
  },
  {
    id: 'vitals',
    fn(s) {
      const p = s.player,
        w = s.warn;
      if (p.water <= 1 && !w.water) {
        w.water = true;
        say(s, p.water <= 0 ? 'You are out of water.' : 'You are nearly out of water.', 'bad');
      } else if (p.water > 1.5) w.water = false;
      if (p.warmth <= 25 && !w.warmth) {
        w.warmth = true;
        say(s, 'You are shivering badly.', 'bad');
      } else if (p.warmth > 35) w.warmth = false;
      if (p.stamina <= 0) {
        p.stamina = 0;
        if (s.over) return;
        if ((p.water <= 0 && !s.off.thirst) || (p.warmth <= 0 && !s.off.warmth)) {
          s.over = { won: false, cause: p.water <= 0 ? 'thirst' : 'cold' };
          say(
            s,
            p.water <= 0 ? 'You collapse, dry as the ground. The land keeps you.' : 'The cold takes you in your sleep.',
            'bad',
          );
        }
      }
    },
  },
];
function advance(s, minutes, activity) {
  let left = minutes;
  while (left > 0 && !s.over) {
    const step = Math.min(15, left);
    left -= step;
    s.time += step;
    for (const sys of SYSTEMS) if (!s.off[sys.id]) sys.fn(s, step / 60, { activity });
  }
}

export { SYSTEMS, advance };
