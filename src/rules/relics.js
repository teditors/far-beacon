/* The relic's nature, from content/relics.js: what it does while carried, by the first word of its name.
   Nothing is stored. Switch: s.off.relics. */
import { C, on, say } from './core.js';
import { SOURCES } from './stats.js';
import { NOTES, SWITCHES } from './hooks.js';

const natureOf = (s) => (s.quest && !s.off.relics ? C.relicNatures[s.quest.relic.split(' ')[0]] || null : null);
const carrying = (s) => s.player.items.some((it) => it.base === 'relic');

SOURCES.push({
  id: 'relics',
  fn(s, out) {
    const n = natureOf(s);
    if (n && carrying(s)) for (const m of n.mods) out.push(m);
  },
});
on('did', (s, d) => {
  const n = natureOf(s);
  if (d.id !== 'takeItem' || !n || !carrying(s) || s.quest.natureTold) return;
  s.quest.natureTold = true;
  say(s, 'The ' + s.quest.relic + ' is not only a thing to carry. ' + n.text, 'good');
});
SWITCHES.push(['relics', "The relic's nature"]);
NOTES.push((s) => (natureOf(s) && s.quest.natureTold ? [{ label: 'The ' + s.quest.relic, text: natureOf(s).text }] : []));

export { natureOf };
