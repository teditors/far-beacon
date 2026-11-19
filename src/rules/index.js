/* The public face of the rules. The view and the tests use only this object. */
import {
  actions,
  boil,
  depotHere,
  dig,
  fill,
  fire,
  forecast,
  gather,
  leaveItem,
  makeCamp,
  melt,
  move,
  moveCost,
  packCamp,
  pact,
  rest,
  search,
  shrineBearing,
  sleep,
  study,
  survey,
  takeItem,
  transfer,
  useItem,
  wellfinder,
} from './actions.js';
import {
  charSheet,
  charTitle,
  livesLeft,
  makeChar,
  nameFor,
  nextTraveller,
  rollAbilities,
  scores,
  setCharacter,
} from './character.js';
import { AXES, civOf, civTraits, trait, traitText } from './civ.js';
import { attack, firebolt, flee, foe, formOf, identify, mend, power, smite, spOf } from './combat.js';
import { C, FLOOR, H, TERR, VERSION, W, WALL, biomeOf, byId, clock, emit, godOf, on, siteHereKind, stormOf } from './core.js';
import { aOrAn } from './core.js';
import { active, equip, slotOf, unequip } from './equipment.js';
import { describeItem, isCursed, itemName, itemWeight, weight } from './items.js';
import { atCamp, bearing, groundHere, inShelter, passable, reveal, siteHere, siteName, terrainInfo } from './map.js';
import {
  areaRec,
  townDoor,
  inTownBlock,
  TOWN_GATE,
  TOWN_R,
  campHere,
  wrap,
  mapOf,
  ensureAround,
  inOverworld,
  indoors,
  isDark,
  outdoorRec,
  regionId,
  switchRegion,
  worldMap,
  worldPos,
} from './areas.js';
import './interiors.js'; // registers the town and vault generators
import { playerAC, weaponOf, xpFor } from './progress.js';
import {
  appraise,
  atTown,
  buy,
  buyFuel,
  enterTown,
  leaveTown,
  enterVault,
  findHere,
  findLoose,
  findSite,
  goDown,
  goUp,
  hasItem,
  inn,
  itemValue,
  buyPrice,
  priceOf,
  objective,
  offer,
  sell,
  sellPrice,
  talkElder,
  unlock,
} from './quest.js';
import { carryCap, stat, waterCap } from './stats.js';
import { newGame } from './worldgen.js';

import { serialize, deserialize } from './save.js';
import { SWITCHES, worldNotes } from './hooks.js';
import { localPos, townArea } from './areas.js';
import { keyRuin, beastOf } from './quest.js';
import { yearOf } from './year.js';
import './pantheon.js';
import './artifacts.js';
import { regionRareOf, regionName } from './regionrares.js';
import { specialOf } from './specials.js';
import './exotics.js';
import './towns.js';
import { askErrand, claimErrand, errandInfo } from './errands.js';
import './oddweather.js';
import './biomegen.js';
import './floors.js';
import './relics.js';
import './lairs.js';
import './farfinds.js';
import { serviceInfo, useService } from './townlife.js';
import { classMove } from './roster.js';
import './hamlets.js';
import './plot.js'; // last: it moves quest places that earlier pieces may have changed

const api = {
  // for tests and tinkering: put the traveller on a tile of any outdoor region (from outdoors)
  travelTo(s, area, x, y) {
    const rec = s.areas[area];
    if (rec && rec.kind === 'region' && s.area !== area) switchRegion(s, rec.cx, rec.cy, { x, y });
    s.player.x = x;
    s.player.y = y;
  },
  worldNotes,
  localPos,
  townArea,
  keyRuin,
  beastOf,
  classMove,
  serviceInfo,
  useService,
  stormOfNow: stormOf,
  askErrand,
  claimErrand,
  errandInfo,
  specialOf,
  regionRareOf,
  regionName,
  yearOf,
  findLoose,
  passable,
  areaRec,
  inOverworld,
  indoors,
  isDark,
  worldMap,
  worldPos,
  WALL,
  FLOOR,
  aOrAn,
  serialize,
  deserialize,
  VERSION,
  W,
  H,
  C,
  rollAbilities,
  nameFor,
  makeChar,
  scores,
  charSheet,
  charTitle,
  setCharacter,
  nextTraveller,
  livesLeft,
  shrineBearing,
  on,
  AXES,
  trait,
  traitText,
  civTraits,
  TERR,
  terrainInfo,
  groundHere,
  dig,
  gather,
  newGame,
  moveCost,
  move,
  survey,
  rest,
  sleep,
  fire,
  fill,
  boil,
  melt,
  search,
  pact,
  packCamp,
  makeCamp,
  study,
  useItem,
  transfer,
  leaveItem,
  takeItem,
  actions,
  clock,
  forecast,
  bearing,
  wellfinder,
  stat,
  weight,
  carryCap,
  waterCap,
  itemName,
  itemWeight,
  describeItem,
  isCursed,
  siteName,
  siteHere,
  depotHere,
  atCamp,
  inShelter,
  biomeOf,
  civOf,
  godOf,
  reveal,
  byId,
  wrap,
  mapOf,
  ensureAround,
  townDoor,
  inTownBlock,
  TOWN_GATE,
  TOWN_R,
  leaveTown,
  campHere,
  regionId,
  outdoorRec,
  switchRegion,
  objective,
  talkElder,
  buy,
  buyFuel,
  sell,
  sellPrice,
  appraise,
  inn,
  unlock,
  enterTown,
  enterVault,
  goDown,
  goUp,
  findHere,
  offer,
  itemValue,
  buyPrice,
  priceOf,
  hasItem,
  atTown,
  findSite,
  equip,
  unequip,
  slotOf,
  active,
  attack,
  power,
  firebolt,
  smite,
  mend,
  flee,
  identify,
  foe,
  spOf,
  formOf,
  playerAC,
  xpFor,
  weaponOf,
  SWITCHES: [
    ['weather', 'Weather'],
    ['warmth', 'Cold and warmth'],
    ['thirst', 'Thirst'],
    ['affixes', 'Item affixes'],
    ['gods', 'God pacts'],
    ...SWITCHES,
  ],
};
const ACTIONS = [
  'move',
  'survey',
  'rest',
  'sleep',
  'fire',
  'fill',
  'boil',
  'melt',
  'search',
  'pact',
  'packCamp',
  'makeCamp',
  'study',
  'transfer',
  'leaveItem',
  'takeItem',
  'dig',
  'gather',
  'equip',
  'unequip',
  'talkElder',
  'buy',
  'buyFuel',
  'sell',
  'appraise',
  'inn',
  'unlock',
  'enterTown',
  'enterVault',
  'goDown',
  'goUp',
  'offer',
  'askErrand',
  'claimErrand',
  'useService',
];
for (const k of ACTIONS) {
  const fn = api[k];
  api[k] = function (s) {
    if (s.combat) return false;
    return fn.apply(null, arguments);
  };
}
// Every action the player takes is announced as 'did' ({ id, site }), so a piece can react to what the player does.
for (const k of [
  ...ACTIONS,
  'attack',
  'power',
  'firebolt',
  'smite',
  'mend',
  'flee',
  'identify',
  'useItem',
  'setCharacter',
  'nextTraveller',
]) {
  const fn = api[k];
  api[k] = function (s) {
    const site = siteHereKind(s),
      r = fn.apply(null, arguments);
    if (r) emit(s, 'did', { id: k, site });
    return r;
  };
}

export const Rules = api;
export default api;
