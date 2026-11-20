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
);
