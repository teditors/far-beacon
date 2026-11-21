/* Old worlds deepen: a world made before commission 4 has no dungeons and nothing in the sky. When such a save loads,
   it rolls them once, as a new world would (from its own seed, so the same save always gains the same), with stairs put
   in caves and ruins and shadows on the ground of regions already walked as well as those still to come. Seas and
   doors cannot be added (a sea is chosen before any land is made; a door belongs to the plot), and the troubles stay
   as they were. Wayfarers come by themselves, in every region built from now on. New worlds are marked (s.deep), so
   this happens once. Switch: s.off.deepen. */
import { on, say } from './core.js';
import { AFTER_LOAD, SWITCHES } from './hooks.js';
import { rollDeeps } from './deeps.js';
import { rollSky } from './sky.js';
import { genOf } from './worldset.js';

on('worldBorn', (s) => {
  s.deep = 1;
});
AFTER_LOAD.push((s) => {
  if (s.deep || (s.off && s.off.deepen) || !s.world || !s.player) return;
  s.deep = 1;
  const ev = { off: s.off || {}, set: genOf(s) };
  if (s.deeps === undefined) rollDeeps(s, ev);
  if (s.skies === undefined) rollSky(s, ev);
  const n = (s.deeps || []).length,
    k = (s.skies || []).length;
  if (n || k)
    say(
      s,
      'This land is deeper than you knew: ' +
        (n ? n + (n === 1 ? ' stair goes' : ' stairs go') + ' down into the dark somewhere in it' : '') +
        (n && k ? ', and ' : '') +
        (k ? 'something hangs in its sky' : '') +
        '.',
      'good',
    );
});
SWITCHES.push(['deepen', 'Old worlds gain dungeons and sky places']);
