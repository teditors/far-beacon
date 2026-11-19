# Journal of commission/1

Newest entry first. Win rates are from the playtest bot (`node tests/playtest.js 150`, seed set 0 unless stated).
Baseline before any piece: **24 / 150** (16%).

## Piece 11: generated biomes

**What it is.** Every world makes two countries of its own from slots: a climate (hot, temperate, cold, wet, ashen,
steppe), a landform (flat, rolling, rugged, broken), water (dry washes, streams, frozen rivers, clear brooks,
brackish creeks), woodland (thorn scrub, birch, pine, dead wood, fern brake, tall grass) and special ground (salt pan,
bog, frozen lake, ash field, flower meadow, hot springs, glass plain). Water, woodland and ground are drawn only from
those that suit the climate, and each slot brings its own colour, so the palette follows from the land. Names come
from the slots: "Cinder Fells", "Ash Teeth", "Weeping Wolds". One in eight is rare: strange-hued (violet grass,
green stone, a tinted sky) or great-wooded (giant trees, more of them). Half the regions away from home, and a
quarter of home regions, are one of these; the hand-written three still appear everywhere else. New kinds of ground
have new effects: hot springs warm you while you stand in them, a flower meadow makes rest go further, a glass plain
lets you see further.

**In play.** No two worlds share a map of countries any more. Bot win rate, sets 5 / 1000 / 2000: 16, 20, 30 with
generated biomes; 16, 22, 26 without (66 vs 64: no change).

**Commits.** "Generated biomes". Switch: `biomegen` (it acts when a world is made; `NO=biomegen` in the playtest).

**Shared bricks.**
- `SKETCHERS` (hooks.js): run in newGame right after the world sketch is made and before any land is built, so a
  piece can change what regions are. `LOADERS`: run on loading a save, before anything else.
- `byId` now keeps an index per list (it was a linear search, and generated biomes made the biome list grow).
- The view reads two optional biome fields, `lush` and `rocky`, instead of testing for 'taiga' and 'salt'.

**Choices made without asking.**
- A generated biome is rebuilt from the seed whenever it is needed and added to `C.biomes`, so every lookup finds
  it; only its id ('g<seed>_<n>') is stored. The world sketch and the starting biome draw only from the hand-written
  biomes, so their random draws do not change, and this piece gives out generated ones afterwards.
- The ashen palette was brightened after a screenshot: it was nearly black at dawn.
- The world snapshot was updated: terrain, sites and creatures change for seeds whose regions are now generated.

**Verdict: pearl.** It is the first row of the commission's table and it changes what every world looks and plays
like. The next step is more slots per climate and a rare that changes the rules of the land, not only its colour.

## Piece 10: odd weather

**What it is.** About one storm in seven is not the biome's own: a hailstorm (hurts out in the open, so get under
cover), a fall of ash from a clear sky (dries you out), a thick fog, a warm wind (warms you through, and dries you),
or a shower of falling stars, one of which comes down a few tiles away and is marked on your map: a smoking crater
with something good in it. Strange weather you have seen is listed in the Journal.

**In play.** Storms stop being a fixed tax, and the shower of stars is a little gift from the sky. Bot win rate, sets
5 / 1000 / 2000: 16, 22, 26 with it; 15, 24, 23 without (64 vs 62: no change).

**Commits.** "Odd weather". Switch: `oddweather`.

**Shared brick.** `stormOf(s)` in core.js, with `stormMakers` (a piece can supply the storm now blowing). Every place
that used `biomeOf(s).storm` now uses `stormOf(s)`; the "storm passes" message names the storm before it changes.

**Choices made without asking.**
- Whether a storm is odd is worked out from the seed and the time the storm ends, so nothing is stored for it and a
  reload gives the same storm. Only the fallen star is stored, as an ordinary cache site with `star: true`.
- Hail never takes you below 1 hit point: it is a reason to find shelter, not a way to die.

**Verdict: maybe.** Hail and the stars are good; ash, fog and the warm wind are thin. Weather that changes the land
(a flood that fills dry washes, a freeze that lets you walk on rivers) would be the next step.

## Piece 9: errands at the inn

**What it is.** At the inn you can ask about work. Someone at the long table (a carter, a widow, an old soldier...)
sends you into one of the regions next to home: kill a named species that has been taking their goats, fetch their
father's ledger from a ruin, or go and see a cave nobody has visited in years. The place is marked on that region's
map, the direction is given, the Journal keeps it, and you are paid at the inn on your return: coin and, half the
time, a good item. One asker in seven is lying and is gone when you come back; they always show a tell ("an old
soldier who will not meet your eye", "a scribe whose purse looks very thin").

**In play.** The first reason in the game to leave the home region on purpose, which is what rare regions, the far
artifact and the wide world were waiting for. Bot win rate unchanged (the bot never asks).

**Commits.** "Errands at the inn". Switch: `errands`.

**Choices made without asking.**
- One errand at a time, each a single step and a return; chains of steps and escorts are left for later.
- The liar is honest about the work (the creature, the ledger and the cave are real), only not about the pay, so a
  player who reads the tell can still choose to go for the item or the experience.
- A new item base, `parcel` (never found by chance, cannot be sold), carries what you fetch.
- Errands are rolled from the play stream when you ask, not at world creation.

**Verdict: pearl.** Small, and it gives the wider world a purpose. Next: more kinds (deliver, escort, find out), chains,
and errands that send you two regions out.

## Piece 8: town cultures

**What it is.** The town's living people are now a trade and a custom. Trades: smiths (weapons and armor cheaper, and
more of them), herbalists (cheap salves and draughts), weavers, charcoal-burners (cheap, plentiful fuel) or traders
(they buy at a better price). Customs: hospitable (a bed costs almost nothing), suspicious of strangers (everything
costs more, but the elder marks every spring near the town), pious (the elder marks the shrine and tells the god's
terms), keepers of old lore (the elder tells you everything about the lost people) or thrifty. One town in eight is
rare: a town of pilgrims (free beds, the shrine marked), or **the people who never fell**: the town is of the lost
people themselves, named in their tongue, with their own marked gear in the shop, and the elder says "You think the
Urashki are gone? We are the Urashki. We only stopped building." You are told the town's culture at the gate.

**In play.** The town is no longer the same shop in every world, and the elder's first talk gives different help.
Bot win rate, sets 5 / 1000 / 2000: 15, 24, 23 with cultures; 16, 23, 21 without (62 vs 60: no change).

**Commits.** "Town cultures". Switch: `towns`.

**Shared bricks.** The town's prices now go through the stat stack as `town.innPrice`, `town.fuelPrice`,
`town.appraisePrice`, `town.sellRate`, `town.buy` and `town.buy.<weapon|armor|consumable|gear>`, read with
`priceOf(s, key)` and `buyPrice(s, item)` in quest.js; `sellPrice(item, s)` takes the state. The shop screen uses them.

**Choices made without asking.**
- "Lost-people slots reused for the living" is done only for the rare unfallen town (name, people, marked gear). A
  living culture with its own five traits would be the next step, once there are towns beyond home.
- The elder's extra help happens on the first talk only, after the quest is given.

**Verdict: pearl** for the unfallen town; **maybe** for the trades and customs, which are useful but quiet.

## Piece 7: exotic races and classes

**What it is.** One world in five offers an exotic race in place of one of the usual three, and one in five an exotic
class. Races: the Lostborn (descended from this world's lost people, named in their tongue, quick and lucky in their
ruins), the Ashborn (cold hardly touches you, water burns away), the Saltkin (little water, cruel cold), the Mothfolk
(see in the dark, carry little) and the Stone-kin (armored and strong, slow). Classes: the Votary (sets out already
sworn to this world's god, and always knows where its shrine is), the Delver (a ruin-robber) and the Nomad.

**In play.** The character screen is sometimes a surprise, and two of the exotics are tied to the world itself: the
Lostborn to its lost people, the Votary to its rolled god (and its vow). Bot win rate, sets 5 / 1000 / 2000: 16, 23,
21 with exotics; 22, 23, 16 without (60 vs 61: no change).

**Commits.** "Exotic races and classes". Switch: `exotics`.

**Choices made without asking.**
- The exotics are pushed into `C.races` and `C.classes` when the module loads, marked `exotic`, so every lookup finds
  them; the offer draw and the town's people filter them out, so no existing world's offer or town changes.
- The first traveller of a world (made in newGame) is never exotic; the character screen and later travellers can be.
- The idea of hybrid races (half-this, half-that) is left for later: the texts would need writing per pair.

**Verdict: maybe.** The Votary and the Lostborn are the good ones; the other three are plain stat bundles.

## Piece 6: creature specials

**What it is.** Half of all species now have a special besides their form: plated (hard to hit), a thief (each hit
spills your water), regenerating, strikes twice, nocturnal (hunts only at night, sleeps by day), frost, venom, swift
(almost impossible to outrun), a coward (badly hurt, it runs), a hoarder (carries coin), or huge (twice the hit
points). It is told when you first sight one and when you first fight it, and listed under "Creatures met".

**In play.** Four forms times eleven specials times three tempers: a "Mist Hound" is no longer one thing. Bot win
rate, sets 5 / 1000 / 2000: 22, 23, 16 with specials; 21, 23, 25 without. Somewhat harder (61 vs 69 over 450 worlds),
mostly from huge brutes and plated creatures.

**Commits.** "Creature specials". Switch: `specials`.

**Choices made without asking.**
- Nothing is stored: a species' special is worked out from the seed and its name, so saves need no change and it is
  identical after loading. The named beast that holds the key never gets one, so its fight stays as it was.
- The hooks are inside combat.js (eight small edits: making a creature, its blows, fleeing, cowardice, coin, hunting
  by night only, and the texts). This is the least liftable piece so far; it touches the same function as nothing else.
- The world snapshot was updated (`--update`): creatures' hit points and armor change for existing seeds.

**Verdict: pearl.** Cheap variety in the part of the game that most needs surprise.

## Piece 5: rare regions

**What it is.** A region away from home sometimes (15%, about one or two per world) is a rare country: Glowing (you can
see by the ground at night), Heavy (every step is harder), Sweet-watered or Bitter (every spring sweet, or all foul
save one), Silent (no creatures at all), Teeming (six more), Hallowed (rest restores half again), Parched, Rich (every
cache full) or Hollow (storms bite twice as hard). Its name goes before the biome, "Silent Snowbound Taiga", you are
told as you walk in, it is listed in the Journal, and a violet mark appears on its square of the world map.

**In play.** Travel away from home has surprises, good and bad, and they are told plainly. Bot win rate unchanged
(21 / 23 / 25 on sets 5 / 1000 / 2000): the bot stays at home, and home is never rare.

**Commits.** "Rare regions". Switch: `regionrares`.

**Choices made without asking.**
- Home is never rare, so the quest's region stays readable; rares are a reason to travel.
- One small view change: the violet mark on the world map, for rare countries you have walked into.

**Verdict: maybe.** It works and it is cheap, but in a 3 x 3 world you seldom go far enough to meet one. It will be
worth more once there are reasons to travel (side quests, the far artifact, towns beyond home).

## Piece 4: named artifacts

**What it is.** Every world has three artifacts, each a common thing with a power no affix has, named for the lost
people: "Dewcatcher, Waterskin of the Urashki" fills itself with water; "Hush, Cloak of the Temug" means creatures
never hunt you; "Emberheart" keeps you from ever growing colder than a hearth would let you; "Longstride" boots,
"Peakwalker" rope, a Tireless pack that gives stamina back as you walk, a Starglass, a Widowmaker blade, a Bulwark.
One is for sale in the town's shop (about 50 to 60 coin), one lies beside the relic at the bottom of the locked place,
and one is in a cache in the farthest country. You are told when you step onto one and when you first hold one.

**In play.** A reason to save coin, a reward for the deepest level, and a reason to go far from home. Bot win rate,
three seed sets (5 / 1000 / 2000): 21, 23, 25 with artifacts; 20, 28, 20 without. Noise: the bot neither buys them
nor goes far, and the one by the relic is picked up only at the very end.

**Commits.** "Named artifacts". Switch: `artifacts` (rolls none at creation; at runtime, switches their powers off).

**Choices made without asking.**
- Three per world, each power different. The far one goes in the cache nearest the middle of a region at the
  greatest distance from home (any neighbour in a 3 x 3 world).
- Artifacts are always known: a named thing should not be a mystery.
- Generators are wrapped from the piece's own module (`GENERATORS.vault`, `GENERATORS.region`) rather than edited.
  Small edits elsewhere: `itemName` and `describeItem` (items.js), `itemValue` (quest.js), and one condition in
  `stepCreatures` (combat.js) for the new `quiet` stat.

**Verdict: pearl.** Named things are what people remember from a roguelike run.

## Piece 3: rolled gods

**What it is.** The god of a world is no longer one of three: it is rolled from a gift, a cost and, half the time, a
vow ("You must never light a fire", "never run from a fight", "never disturb the ruins of the dead"). Its name and
shrine colour come from the gift's domain (water, heights, night, hearth, road, war, harvest, sight): "Karna, Who
Counts the Slain: Blows glance off you. You see less far when you survey. You must never run from a fight." Break a
vow and the god turns away: the gift is gone and the cost stays. One god in eight is rare: a generous god (no cost),
twin gods (two gifts, two costs), or a jealous god (two gifts and a vow, no cost).

**In play.** Each shrine is a real decision, different every world, and a vow changes how you play for the rest of
that traveller's life. The budget (gift + cost + vow = 1, give or take 1) keeps gods mildly worth swearing to.
Bot win rate unchanged (20 / 150 on set 5, 28 on set 1000), because the bot never swears a pact.

**Commits.** "Gods are rolled from a gift, a cost and a vow". Switch: `godslots` (the hand-written god of
content/gods.js comes back).

**Shared bricks.** `godMakers` in core.js (a piece can supply the world's god), and every player action is announced
as `emit(s, 'did', { id, site })` from the wrapper in rules/index.js.

**Choices made without asking.**
- The written gods stay as the fallback, and `s.god` is still rolled from them, so the switch and old saves work.
- A cost may not touch any stat its gift touches, so a god never gives and takes the same thing.
- When a small gift and a vow already meet the budget, the vow is the god's only price.
- The ideas "a dead god", "rival gods" and "a god only reachable far from home" are not done; the far god needs
  sites placed in other regions, which I would do after towns beyond home exist.
- tests/pieces.test.js is new: one block per piece checking its own promises (budget, vow breaking, the switch).

**Verdict: pearl.** It is the commission's slot pattern in its purest form, and vows are a new kind of rule.

## Piece 2: the year

**What it is.** Every world has a year: a drought, a hard winter, a still year, long nights, a lean year, and so on.
One world in seven gets a rare year instead: a wide world (5 x 5 regions), two moons (you can see at night), thin
air, heavy ground, or the long dark (the sun is up only from ten until four). The year is announced in the first
lines of the log and listed in the Journal under "This world".

**In play.** The weather, light and water budget of a world now differ from world to world even when the biome is the
same. Bot win rate: seed set 5: 20 / 150 with the year, 24 without; set 1000: 28 vs 29. A little harder on average,
as expected, since several years are pure hardship.

**Commits.** "Every world has a year". Switch: `year` (in the Tinker panel; `NO=year` in the playtest turns it off from
world creation on).

**Shared bricks this piece added** (later pieces use them, so lift this piece first):
- `src/rules/hooks.js`: `NOTES` (lines for the Journal's "This world"), `SWITCHES` (extra Tinker switches).
- `newGame(seed, off)`: switches passed in apply while the world is made too, and end up in `s.off`.
- `emit(s, 'worldBorn', { rnd, off })` at the end of `newGame`, so a piece can roll and announce its part.
- A piece adds a stat source with `SOURCES.push` from its own module.
- `clock()` reads `s.tun.dawn` and `s.tun.dusk` when present.
- `tests/playtest.js` reads `NO=a,b` to switch pieces off.

**Choices made without asking.**
- New state fields are optional (`s.year` absent means no year), so old saves keep loading with no VERSION bump. I
  will follow this rule in every piece where I can: it keeps pieces independent of each other's migrations.
- The year's changes to tuning numbers (storm gap, lantern fuel, world size, dawn and dusk) are made once, into `s.tun`,
  so the Tinker panel shows them. The runtime switch turns off only the year's modifiers; `NO=year` turns off all of it.
- The game still starts at 6:00, so in a year of long nights or the long dark you set out in the dark.

**Verdict: pearl.** Small, cheap, felt from the first line of the log. The wide world in particular is a genuinely
different game, once there is more to do away from home.

## Piece 1: the Almanac

**What it is.** `ALMANAC.md` is a catalogue of every menu the game rolls from and every option on it, with the numbers
that matter. It is written by `node tools/almanac.js` straight from `src/content/`, so it cannot drift: `tools/check.js`
now runs `node tools/almanac.js --check` and fails if the file is out of date.

**In play.** Nothing changes. Win rate unchanged (24 / 150).

**Commits.** "Almanac: a generated catalogue of every menu the game rolls from". No switch (it is a document).

**Choices made without asking.**
- Modifiers are written exactly (`waterDrain x0.5`, `carryCap +2`) rather than in the game's friendlier wording, because the
  Almanac is for the designer, not the player.
- A content key that no section covers is listed under "Not yet catalogued", so a new menu shows up even before it gets
  its own section.

**Verdict: pearl.** Cheap, and it makes every later piece reviewable at a glance.
