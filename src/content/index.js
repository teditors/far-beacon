/* CONTENT: every biome, people, god, creature, item and quest part is data. Adding an entry needs no code change.
   Each file below holds one theme; this file merges them into the single CONTENT object the rules read. */
import tuning from './tuning.js';
import characters from './characters.js';
import biomes from './biomes.js';
import gods from './gods.js';
import peoples from './peoples.js';
import creatures from './creatures.js';
import items from './items.js';
import quest from './quest.js';
import years from './years.js';
import pantheon from './pantheon.js';
import artifacts from './artifacts.js';
import regionRares from './regionrares.js';
import specials from './specials.js';
import exotics from './exotics.js';
import towns from './towns.js';
import errands from './errands.js';
import weather from './weather.js';
import biomeparts from './biomeparts.js';
import floors from './floors.js';
import relics from './relics.js';
import lairs from './lairs.js';
import farfinds from './farfinds.js';
import townlife from './townlife.js';
import roster from './roster.js';
import hamlets from './hamlets.js';
import tiers from './tiers.js';
import worldSize from './worldsize.js';
import moreTowns from './moretowns.js';
import plots from './plots.js';
import crafting from './crafting.js';
import trade from './trade.js';
import worldSet from './worldset.js';
import deeps from './deeps.js';
import sky from './sky.js';
import sea from './sea.js';
import realms from './realms.js';
import kin from './kin.js';
import wayfarers from './wayfarers.js';
import townLooks from './townlooks.js';
import looks from './looks.js';
import music from './music.js';
import things from './things.js';
import rooms from './rooms.js';
import feline from './feline.js';

export const CONTENT = Object.assign(
  {},
  tuning,
  characters,
  biomes,
  gods,
  peoples,
  creatures,
  items,
  quest,
  years,
  pantheon,
  artifacts,
  regionRares,
  specials,
  exotics,
  towns,
  errands,
  weather,
  biomeparts,
  floors,
  relics,
  lairs,
  farfinds,
  townlife,
  roster,
  hamlets,
  tiers,
  worldSize,
  moreTowns,
  plots,
  crafting,
  trade,
  worldSet,
  deeps,
  sky,
  sea,
  realms,
  kin,
  wayfarers,
  townLooks,
  looks,
  music,
  things,
  rooms,
  feline,
);
// Rooms by use (C8.5) adds its furniture, small things and rooms to the things' own lists, so every piece sees them.
{
  const T = CONTENT.things,
    U = CONTENT.roomsByUse;
  for (const k of U.kinds) if (!T.kinds.some((e) => e.id === k.id)) T.kinds.push(k);
  Object.assign(T.sizes, U.sizes);
  for (const id in U.rooms) if (!T.rooms[id]) T.rooms[id] = U.rooms[id];
}
