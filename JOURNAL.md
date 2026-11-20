# Commission 3

Newest entry first. Performance numbers are from `tools/bench.py` (a real browser on a software renderer at 412 x 915,
seeds 11 / 222 / 3333): slow in absolute terms, but comparable before and after. Bot win rates from
`node tests/playtest.js 150`, seed sets 5 / 1000 / 2000 unless stated.

## C3.2: worlds of varying size

**What it is.** The number of regions across and down is now rolled from the seed: a small world (2 or 3 by 3), an
ordinary one (3 or 4 each way), a long one (2 or 3 by 5 to 7, either way round), a broad one (4 or 5 by 4 to 6) or,
rarely, a vast one (6 or 7 each way). A 4 x 7 world is as likely as a 5 x 5. At most 49 regions. The rare wide year
still makes exactly 5 x 5. The world's shape is told at the start (unless it is ordinary) and listed in the Journal.

**In play.** Small worlds put the far country a step away; long and vast ones have land beyond the story to wander
into, with its lairs, rare countries and the far artifact (always in the farthest region). Bot win rate, sets 5 / 1000
/ 2000: 20, 18, 15 (53 / 450, 12%); with `NO=worldsize` 20, 19, 11 (50 / 450).

**Budget.** Drawing costs the same in any size of world: only the player's region and its eight neighbours are ever
built for the view. What grows is the save, with what you explore: a 7 x 7 world with every region visited saves in
162 KB (it would have been about 500 KB before C3.1's packing). Making a 7 x 7 world takes 50 ms in Node.

**Commits.** "Worlds of varying size". Switch: `worldsize` (at creation; off gives the old 3 x 3).

**Shared brick.** `TUNERS` in hooks.js: functions run in `newGame` after the year sets the tuning numbers and before
the world is sketched. `s.world.shape` names the shape (optional).

**Choices made without asking.**
- The first try let the plot's chain of regions (town, key, locked place, destination) wander away from home in large
  worlds, into regions of danger 2 and 3: the bot's win rate fell to 22 / 450 (5%). The chain now keeps to the ring of
  regions round home where it can, as it always did in a 3 x 3 world, and the win rate came back. Plots that go
  further afield are for C3.3.
- No world is narrower than 2 regions, so a region never borders itself.
- The artifacts and rare-region tests no longer assume every region is built at creation; in a large world a region
  is built (and its artifact placed) when you first get near.
- Errands at the inn now build the regions round the town if they are not yet built, and try a few times before
  saying there is no work: in a large world the first errand rolled could point into an unbuilt region.
  `ensureRegion(s, cx, cy)` (areas.js) builds any region on demand.

**Verdict: pearl.** Cheap, and every world now has a different map.

## C3.1: a performance meter, a quality setting, and a cheaper game

**What it is.** Menu now has a **Settings** section, kept per device rather than per run:
- **Graphics quality**, Low / Medium (the default) / High. It sets the screen resolution (1x, 1.5x, 2x pixels), edge
  smoothing (off on Low, applied on the next page load), how much of the neighbouring land is drawn (12 / 17 / 22 tiles
  round the region), how fine the ground is, and how many trees and rocks stand in it. Fog by day never reaches past
  the land that is drawn, so Low looks hazier rather than cut off.
- **Show the performance meter**: a small box in the bottom-left corner with frames per second, the average and worst
  frame time over the last half second, draw calls, triangles, how long the last scene build took (the hitch when you
  cross a border), the save's size and, in Chrome, the memory in use. Andrew can read it off his phone and send it.

**What it costs, measured** (`tools/bench.py`; the save is a fresh world plus its eight neighbours):

| | build ms | draw calls | triangles | frame ms (software) | save |
| --- | --- | --- | --- | --- | --- |
| before | 156 | 123 | 355,691 | 180 | 107 KB |
| after, High | 147 | 123 | 285,685 | 160 | 36 KB |
| after, Medium | 68 | 105 | 155,935 | 106 | 36 KB |
| after, Low | 54 | 89 | 86,934 | 76 | 36 KB |

The largest save in the state test (every region of every test world) went from 266 KB to 85 KB.

**Where the cost was.** Half the triangles were trees: ten thousand cones of 18 triangles each, of which only 6 can be
seen (the base is never visible, and six more were degenerate slivers at the tip). Trees are now 6-triangle cones.
The other half is the ground: two height grids, fine and coarse. Building the land was mostly colouring the ground,
which checked every spring in view for every vertex; springs are now bucketed by tile. The coarse grid no longer
computes heights under the fine one. The save was mostly three grids per region (ground, height, seen) written as
lists of 1296 numbers; they are now written as a short run-length text (`packGrid` in save.js). Old saves load as
they are; no version bump was needed because the state in memory is unchanged.

**Commits.** "Performance meter, graphics quality, smaller saves". No switch: it is the view and the save format.

**Choices made without asking.**
- Medium is the default, not High: a Pixel 9 can likely run High, but the meter will say, and Medium is a safe
  first impression on any phone.
- Rocks and trees roll the same dice at every quality, so a tree that is drawn on Low stands in the same place on High.
- The smoke test now turns the meter on, switches to Low, reads the meter, and switches back.
- `tools/bench.py` is the measuring stick for the rest of this commission (`CHROME=` picks a browser, as in the smoke
  test).

**Verdict: pearl.** It makes the phone budget a number.

---

# Commission 2

## Summary

Twelve entries: Andrew's six asks first, then my own. Every check passes; the bot still wins.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C2.1 | Open towns: no Enter or Leave buttons, most towns unwalled, walled ones with several gates | (change) | pearl |
| C2.2 | Town life: hamlet to city, generated streets, healer, temple, trainer, smith, mapmaker, stable, townsfolk with rumours, graveyards | `townlife` | pearl |
| C2.3 | Many races and classes: 2 to 12 races and 8 to 20 classes per world, 45 hybrids, fight moves, kill gains | `roster` | pearl |
| C2.4 | The plot across the world: town, key, locked place and destination in a chain of regions, roads and springs, a travelling bot | `plot` | pearl (needs easing) |
| C2.5 | One map: the world as a single continuous map, pan and zoom | (change) | pearl |
| C2.6 | Hamlets in the country between places | `hamlets` | pearl |
| C2.7 | Easier legs: springs every seven tiles | (balance) | |
| C2.8 | Finer things far from home: Fine and Superb items | `tiers` | pearl |
| C2.9 | Rare countries that change the land: Drowned, Dry, Burned | `regionrares` | maybe |
| C2.10 | Frail classes set out with an extra waterskin and coin | `roster` | (balance) |
| C2.11 | In a quarter of worlds the town is at home | `plot` | (balance) |
| C2.12 | Townsfolk wander the streets | `townlife` | maybe |

**Bot win rate, commission 2's switchable pieces on vs off** (`NO=townlife,roster,plot,hamlets,tiers`), sets 5 /
1000 / 2000: on 9, 16, 9 (34 / 450, 8%) before C2.10 and C2.11, 18, 17, 13 (48 / 450, 11%) after; off 24, 35, 32 (91 / 450, 20%). Almost all of the difference is the plot
across the world (C2.4) and the frailer new classes (C2.3). The game is now a journey; it is clearly harder, and the
bot, which now travels between regions, still wins about one world in twelve.

**My three best.** The plot across the world (C2.4), because it turns a map into a journey and gives every other piece
a reason to exist; town life (C2.2), because the town became a place; and the roster (C2.3), because the character
screen is now different every world and the new classes play differently in a fight.

**What I would do next.**
1. Ease the journey for people as well as the bot: some worlds with the town in the home region, a "first night"
   shelter on the road, or a third waterskin for frail classes. Then measure again.
2. More than one town: the hamlets (C2.6) show the way; full towns in other regions would need the town code to take
   a town id instead of the one 'town' area.
3. People who move beyond the town: travellers on the roads (townsfolk now wander, C2.12).
4. Named streams for items made at generation time, so pieces stop shifting each other's play dice.
5. Class balance: frail classes (d6, a dagger) die far more; give them more water, coin or a better start.

---

Newest entry first. Baseline before any piece (bot, sets 5 / 1000 / 2000): 17, 32, 25 (74 / 450).

## C2.12: townsfolk wander

Part of C2.2: as you walk about a town, its townsfolk wander the streets, a step at a time, never onto a door, a grave,
the well or you. Their rumours go with them. No change for the bot. Switch: `townlife`.

## C2.11: sometimes the town is at home

A variation of C2.4: in a quarter of worlds the town stands in the home region, near the well, and the chain of
regions (key, locked place, destination) starts from home. It varies the shape of the journey and eases it. Bot win
rate, sets 5 / 1000 / 2000: 18, 17, 13 (48 / 450, 11%), up from 40. Switch: part of `plot`.

## C2.10: frail classes set out better provided

A balance change to C2.3: a class with a hit die of d6 or less (Wizard, Rogue, Bard, Merchant, Scout, Herbalist,
Druid, Necromancer, Witch...) sets out with an extra waterskin, its skins topped up and 10 more coin. Bot win rate,
sets 5 / 1000 / 2000: 12, 15, 13 (40 / 450), up from 34. Switch: part of `roster`.

## C2.9: rare countries that change the land

**What it is.** Three new rare countries (C1 piece 5) that change the land itself rather than a number: **Drowned**
(nearly half the flat ground has gone under, bog and standing water everywhere), **Dry** (every spring has failed but
the sure one) and **Burned** (a great fire took every wood: no wood to gather and no cover from the wind). The change
never touches a region's outer rows, so its borders still meet its neighbours'.

**In play.** Crossing into such a country changes how you travel through it, which matters now that the story
crosses the world. Bot win rate, sets 5 / 1000 / 2000: see the summary (no change expected: rare regions are 15% of
regions away from home).

**Commits.** "Rare countries that change the land". Switch: `regionrares`, as before.

**Verdict: maybe.** The idea of rares that change the rules of the land is right; these three are the simplest.

## C2.8: finer things far from home

**What it is.** An item with affixes (or a lost people's mark) found away from home is finer: its tier is 1 plus the
distance of the region from home, plus one on the deepest level of the locked place, at most 3. A Fine item's affixes
do half again as much, a Superb item's twice as much, curses included ("Superb Keen Sword": to hit +2; "Fine
Threadbare Cloak": the cold bites even harder). The fineness shows in the name even before the item is studied, and
it is worth more in town.

**In play.** Now that the story crosses the world (C2.4), the far country pays for the risk. Bot win rate, sets 5 /
1000 / 2000: 9, 16, 10 (35; 37 before: no change).

**Commits.** "Finer things far from home". Switch: `tiers` (when an item is found).

**Shared brick.** `ITEM_HOOKS` in hooks.js: a piece may finish any item `genItem` makes. `itemAffixes` scales a finer
item's modifiers, so everything that reads affixes (stats, descriptions) sees the scaled numbers.

**Choices made without asking.** Tiers scale the existing affixes rather than adding new "greater" affixes: the
menu stays one list, and the Almanac needs only a rule. This is the commission-1 idea "item tiers by distance",
alongside far finds (C1 piece 15), which gives more items far away.

**Verdict: pearl.**

## C2.7: easier legs

A balance change to C2.4: sure springs along the legs of the journey every seven tiles instead of nine. Bot win rate,
sets 5 / 1000 / 2000: 11, 16, 10 (37 / 450, 8%), up from 17. I also tried putting every leg's springs on the map from
the start instead of having the elder mark them: no better (34), so the elder still marks them. Still half the old
win rate (72 without the plot); the next easing would be the town in the home region in some worlds.

## C2.6: hamlets

**What it is.** About half the regions away from home have a hamlet: a few turf-roofed houses round a well, by a road
when there is one. You can draw water there, sleep under a roof, pay 3 coin for a bed by the fire (eight hours, you
wake whole), buy wood, a salve, a tonic, a draught or a waterskin, and hear a rumour that marks a real place (the same
rumours as the townsfolk of C2.2). Told when you first walk in, listed in the Journal, drawn as houses round a well,
and marked on the map.

**In play.** The country between the places of the story has people in it, and the long legs of C2.4 have somewhere
to stop. Bot win rate, sets 5 / 1000 / 2000: 7, 5, 5 (17, against 19 before: the bot does not seek them out).

**Commits.** "Hamlets". Switch: `hamlets` (when a region is built; in play it stops the trading and beds).

**Shared bricks.** `TALK` in hooks.js: `{ info(s), use(s, option, arg) }` for anyone a piece puts in the world; the
one dialog (`serviceInfo` / `useService`) asks them first. `arrive()` no longer says anything for a kind of place it
does not know, so a piece's own kind of place can speak for itself.

**Verdict: pearl.** Cheap, and the world feels inhabited.

## C2.5: one map

**What it is.** Outdoors, the Map screen is now the whole world as one continuous map, drawn tile by tile from every
region you have seen, with fog where you have not been, the roads, every place you know of, your camp and you.
There is no grid of squares and no border lines (you see a border only where the land itself changes). It is
centred on you and wraps around like the world. Drag to look around; + and - zoom from a close view to more than the
whole world; "Centre on me" brings it back. Inside the town or the locked place the map shows that place as before.

**In play.** You can see the whole journey at once: the road to the town, the springs the elder marked across three
regions, the locked place two countries away. No change for the bot.

**Commits.** "One map". No switch: it replaces the old map screen.

**Choices made without asking.** The zoom and pan are kept between openings of the map (in the view, not the save).
The rare-country marks of C1 piece 5 are gone from the map with the grid; rare countries are still told in the log
and the Journal.

**Verdict: pearl.**

## C2.4: the plot across the world

**What it is.** The quest's places no longer all lie in the home region. You set out from the well at home; the town
is in a region next to it, the key (in a ruin, or carried by the beast) in the next, the locked place in the next and
the beacon or shrine in the next: a chain of regions, each sharing an edge with the one before, every place on the
side of its region nearest the place before it. Old paved roads join them, one leg to the next, carrying across region
borders, and sure springs lie every nine tiles or so along each leg: those on the way to the town are on your map
from the start, the elder marks the rest. The opening line, the objective, directions and the compass all point
across regions. Nothing about the world's size is assumed: the chain is built from neighbouring regions, and a region
with no room for a place passes it on to the next.

**In play.** The game is now a journey across the land instead of a tour of one map, which is what the other pieces
(rare regions, lairs, generated biomes) were waiting for. It is much harder. Bot win rate, sets 5 / 1000 / 2000:
8, 6, 5 with it; 22, 25, 25 without (19 vs 72 out of 450). The bot still wins sometimes.

**The bot now travels.** Places are given to it in the frame of the region it stands in (`localPos`), so it walks
off a region's edge toward them; it remembers water seen in the regions around; it commits to one water target
(held in home coordinates, so a border does not change its mind); it hops from spring to spring when a target is
beyond its water; and it makes for trees or shelter when freezing in a storm where no fire will light. Its
path-finder no longer loops forever on a target in another region.

**Commits.** "The plot across the world". Switch: `plot` (at creation).

**Choices made without asking.**
- Roads on every leg, and springs along them, after measuring: without roads almost every bot died of thirst or cold
  on the way to the town. Roads that run along a border are laid on both sides of it, so roads still line up.
- The beast clears the creatures near where it is put, and may stand in a Silent region (it came from elsewhere).
- Old saves keep their old layout (everything at home); `area` fields default to home.
- `travelTo(s, area, x, y)` was added for tests and tinkering; the tests use it to reach places in other regions.

**Verdict: pearl**, with a balance warning: it needs easing (more water, or the town in the home region in some
worlds) before it reaches main.

## C2.3: many races and classes

**What it is.** A world now offers 2 to 12 races and 8 to 20 classes (it was 3 and 3), drawn with usual ones three
times as likely as an exotic one, and the first traveller is one of them. New races: Gnome, Highlander, Riverfolk
(wades rivers fast and never gets chilled doing it), Plainsfolk and Forest-born; exotic Ghoul-kin (foul water does not
hurt, every kill heals), Half-giant, Scalekin, Crowfolk and Wispborn (creatures do not hunt you, mana comes back as
you walk). Every pair of usual races also has a **hybrid** (45 of them: Dwarf-elf, Gnome-riverfolk...), made from
half of each parent. New classes, each with something of its own in a fight or on the road:
- Knight (Shield wall blunts the next blow), Barbarian (Rage: a huge blow paid in blood), Monk (Flurry: two
  strikes), Hunter (Aimed shot; every kill gives water and strength), Bard (Lullaby: the creature loses its turn;
  cheaper in town), Merchant (40 coin, buys cheap and sells dear), Scout (Vanish: always escape), Herbalist (wounds
  mend as you walk, foul water is harmless), Pilgrim, Druid (Thorns and Regrow), Sapper (Firepot burns fuel to burn
  the creature), Duelist (Riposte);
- exotic: Necromancer (Drain life heals you by the damage; kills restore you), Witch (Hex), Dowser (water skins fill
  a little by themselves), Lamplighter (the lantern burns no oil; Flare), Gravedigger.

**In play.** The character screen is a real choice now, and different every world. Bot win rate, sets 5 / 1000 /
2000: 23, 18, 22 with it; 21, 35, 27 without (63 vs 83). Harder: many new classes are frail (d6 hit dice, a dagger),
and the bot picks at random. The bot now uses a class's fight move when it can afford it.

**Commits.** "Many races and classes". Switch: `roster`.

**Shared bricks.** `emit(s, 'killed', { sp, tier })` from combat; `s.combat.ward` (a blow blunted); `strike` takes a
`hit` bonus; new stats `wetSafe`, `foulSafe` and `moveTime.river`; the actions hook now also runs in a fight; the
view passes a button's `arg` to its action (`classMove(s, id)`).

**Choices made without asking.**
- New races and classes are added to the content lists by the piece's module, marked `roster`; the old draw and the
  town's people still use only the old ones, so `NO=roster` gives back the old game exactly.
- Regenerating creatures (C1 piece 6) now heal 1 a round, not 2: a frail class could not out-damage a plated,
  regenerating guardian. The quest test now finishes a fight that goes on too long.

**Verdict: pearl.** Balance needs a look later (perhaps frail classes start with more water or coin).

## C2.2: town life

**What it is.** A town now has a size: a hamlet, a village, a market town or a city. Its layout is generated:
main streets run out from the square to the edges (a ring road in towns and cities), and buildings stand on lots
along both sides of each street, so no two towns look alike. Beside the elder, the inn and the shop there are
services, each a building with a person at the door under a painted sign:
- **the healer** (all wounds, cold and weariness, for 6 coin);
- **the priest** of a temple to this world's god, who tells you the god's terms, marks the shrine, and gives a
  day's blessing;
- **the old campaigner**, who teaches lessons from a menu (foraging, the long march, swordwork, sleeping rough...),
  at most three per traveller, which die with them;
- **the smith**, who hones a weapon to Keen, reinforces armor, or strips a curse;
- **the mapmaker**, who sells a map of this country or of the lands beyond;
- **the stablehand**, who sells a pack mule (carry 10 more).

A hamlet has one service, a city six. The town's culture (C1 piece 8) decides some of them: smiths always have a
smithy, herbalists a healer, pious towns and pilgrims a temple, traders and lore-keepers a mapmaker. Townsfolk
stand about the streets with names and trades, and each has something to say: a rumour that marks a real place
(a lair, the far artifact, a sweet spring, the shrine, a rare country), a trait of the lost people, a warning about
a creature, or just talk. Villages and bigger have a graveyard with epitaphs that name this world's storms and
creatures. Bigger towns sell more and are more often walled.

**In play.** The town is somewhere to spend coin and time, and something to read. Bot win rate, sets 5 / 1000 /
2000: 21, 36, 27 with it; 24, 31, 27 without (84 vs 82). The bot uses only the elder, the shop and the inn.

**Commits.** "Town life". Switch: `townlife`.

**Shared bricks.** `ACTIONS` in hooks.js: a piece can add buttons for where the player stands. `serviceInfo(s)` and
`useService(s, option, arg)` let the view show any person's talk and offers with one generic dialog.

**Choices made without asking.**
- The elder's hall is always the first lot on the north street, so "the hall on the north side of the square" stays
  true.
- Service prices go through the stat stack (`town.heal`, `town.bless`...), so town cultures can change them later.
- The pack mule is a new item base with no slot (it works while you have it), added by this piece's module.
- Lessons are stored on the character (`s.char.lessons`), the blessing as `s.blessUntil`; both optional.

**Verdict: pearl.** It is the biggest single change to what a town is. Next: people who move about, and a market.

## C2.1: open towns, walked into from any side, with no buttons

**What it is.** The "Enter <town>" and "Leave <town>" buttons are gone. Three towns in four have no wall at all: walk
into the town's block from any side and you are in its streets; walk off any edge and you are back outside, on the
matching spot. One town in four is walled, with a gate wherever a main street meets the wall: always the south one,
and one to three more. A walled town's wall (and any house on an open town's edge) is solid from outside: you slide
along it.

**In play.** The town is part of the land now, not a door. Bot win rate unchanged (8 / 40 in the check run).

**Commits.** "Open towns". No switch: this changes something that already existed.

**How it works.** The town's map still exactly fills its 5 x 5 outdoor block. `townEntry` and `townExit` (areas.js)
map an outdoor tile and side to the matching edge tile of the town, and back. The view passes the exact town tile it
is about to step onto (`move(s, dx, dy, at)`) so the picture and the rules agree, and its wall collision outdoors is
now "is the town tile here a wall".

**Choices made without asking.**
- A walled town always has its south gate, so `townDoor` (the tile below it) still always leads in; the bot and the
  tests use it.
- Old saves keep their old walled town with one gate; you leave it by walking out through that gate. No migration.

# Journal of commission/1

## Summary (end of the first session)

Fifteen pieces, each in one commit with its own content file, its own rules module and its own switch. Every check
passes, the bot still wins, and old saves still load (no VERSION bump was needed: every new state field is optional).

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| 1 | The Almanac (`ALMANAC.md`, generated, checked for staleness) | | pearl |
| 2 | The year: drought, hard winter, long nights; rare wide world, two moons, the long dark | `year` | pearl |
| 3 | Rolled gods: gift, cost, vow, on a budget; rare generous, twin, jealous | `godslots` | pearl |
| 4 | Named artifacts: three per world (shop, beside the relic, far country) | `artifacts` | pearl |
| 5 | Rare regions: glowing, silent, teeming, bitter, hallowed... | `regionrares` | maybe |
| 6 | Creature specials: plated, thief, regenerating, nocturnal, coward, huge... | `specials` | pearl |
| 7 | Exotic races and classes: Lostborn, Votary and others | `exotics` | maybe |
| 8 | Town cultures: trade and custom; rare pilgrims, the people who never fell | `towns` | pearl / maybe |
| 9 | Errands at the inn, with liars who show a tell | `errands` | pearl |
| 10 | Odd weather: hail, ash, fog, warm wind, falling stars | `oddweather` | maybe |
| 11 | Generated biomes from climate, landform, water, woodland, ground | `biomegen` | pearl |
| 12 | Odd levels below: flooded, ossuary, archive, sleeping guardians | `floors` | maybe |
| 13 | The relic's nature: the Ember warms, the Lens sees in the dark | `relics` | pearl |
| 14 | Lairs: a unique creature on a hoard | `lairs` | maybe |
| 15 | Far finds: richer searches away from home | `farfinds` | maybe |

**Bot win rate, every piece on vs every piece off** (`NO=` all fifteen switches), five seed sets of 150 worlds:
on 17, 32, 25, 31, 29 (134, 18%); off 24, 29, 21, 28, 20 (122, 16%). The pieces that made the game harder (the year,
specials) are roughly balanced by the ones that made it easier (odd levels). The bot never leaves the home region,
never swears a pact, never asks for errands and never shops for artifacts, so it measures only part of what changed.

**My three best.** Generated biomes (11): every world now has countries no other world has. Rolled gods with vows (3):
the slot-and-budget pattern at its cleanest, and vows are a new kind of rule. Errands (9): the first reason to leave
home on purpose, which several other pieces (rare regions, lairs, far finds, the far artifact, the wide world) were
waiting for.

**What I would do next.**
1. Teach the bot to travel (take errands, visit a neighbouring region), so the playtest can measure the outer world.
2. Towns beyond home, each with a rolled culture from piece 8 (and its own errands), placed by the world sketch.
3. Real item tiers by distance (greater affixes far from home) instead of piece 15's extra items.
4. Give generation-time item rolls their own named streams, so pieces stop shifting each other's play dice.
5. More slots for generated biomes, and a rare that changes the rules of the land (rivers you can walk on, ground that
   moves), not only its colour.

**Lifting pieces into main.** Piece 2 carries the shared bricks (`hooks.js`, `newGame(seed, off)`, the `worldBorn`
event, `NO=` in the playtest); lift it first. Pieces 3 and 10 add `godMakers` and `stormMakers` to core.js, piece 3 the
`did` event in rules/index.js, piece 8 the town prices through the stat stack, piece 11 `SKETCHERS`, `LOADERS` and the
`byId` index. The rest only add files plus a line or two in `content/index.js`, `rules/index.js`, `tools/almanac.js`,
`tests/content.test.js` and `tests/pieces.test.js`.

---

Newest entry first. Win rates are from the playtest bot (`node tests/playtest.js 150`, seed set 0 unless stated).
Baseline before any piece: **24 / 150** (16%).

## Piece 15: far finds

**What it is.** The further from home, the less picked-over the land: for each region of distance, a search of a
ruin, cave or cache has a 45% chance of turning up one more good item, and the log says so ("Far from home, the old
things are less picked over").

**In play.** The commission's "item tiers that grow with distance from home", in its simplest form: a reward for
travel that the player can feel. No change for the bot, which stays home (set 5: 17 / 150, as before).

**Commits.** "Far finds". Switch: `farfinds`.

**Choices made without asking.** Extra items rather than stronger affixes, because it needs no change to items.js and
it is plain to see. Real tiers (greater affixes far away) would be the next step.

**Verdict: maybe.** Simple and right in spirit; tiers would be better.

## Piece 14: lairs

**What it is.** About a third of the regions away from home hold a lair: a creature that is the only one of its kind
("the One-Eyed Cinder Brute"), always an elder, tier 2 or 3, lying in a cave on a hoard of 20 to 40 coin and two good
items. You are told what it is when you first see it, and when it is dead; the Journal lists the ones you have met.

**In play.** Another reason to go out, and a fight you can choose to pick. Bot win rate over five seed sets
(5 / 1000 / 2000 / 3000 / 4000): 17, 32, 25, 31, 29 with lairs; 30, 24, 33, 26, 28 without (134 vs 141). The bot
never leaves home, so the difference is noise: building neighbours with lairs shifts the play dice (items in hoards
are rolled from the play stream), which reshuffles every later roll.

**Commits.** "Lairs". Switch: `lairs` (when a region is built).

**Choices made without asking.**
- A Silent region (piece 5) never gets a lair: the lair checks for it, and does nothing if that piece is absent.
- Hoard items come from the play stream, like every other found item, rather than a named stream. A later cleanup
  could give generation-time items their own stream so pieces stop shifting each other's dice.

**Verdict: maybe.** Good with errands (piece 9) and the wide world; on its own it is a little hidden.

## Piece 13: the relic's nature

**What it is.** The relic now does something while you carry it, matching its name: an Ember is warm in your hands
(cold bites half as hard), a Lens lets you see in the dark and further when you survey (so you can climb out of the
locked place even if your lantern is dry), a Horn sounds when you strike, a Crown guards you but weighs on every step,
a Bell keeps creatures from hunting you. Told when you first pick it up.

**In play.** The walk home with the relic is different in each world, and the relic feels like a thing, not a token.
Bot win rate, sets 5 / 1000 / 2000: 30, 24, 33 with it; 28, 24, 33 without (87 vs 85).

**Commits.** "The relic's nature". Switch: `relics`.

**Choices made without asking.** The nature follows the relic's first word, which the quest already rolls, so nothing
new is rolled or stored, and every relic name has a nature (the content test checks).

**Verdict: pearl.** Five lines of content, and it turns the most important object in the game into something.

## Piece 12: odd levels below

**What it is.** A level of the locked place (any but the last) is now sometimes something other than guards, loot or
traps: flooded (knee-deep black water, slow and very cold, but three pools you can drink from), an ossuary (three
more guardians standing up out of the bones), or an archive (a carved plan by the door shows the whole level, and two
good items lie on the shelves). Rarely, the guardians of a level are asleep and nothing will wake them. Told as you
arrive.

**In play.** The locked place is less the same three rooms every time. Bot win rate, sets 5 / 1000 / 2000: 28, 24, 33
with odd levels; 16, 20, 30 without (85 vs 66). Clearly easier, mostly from the archive's plan and the flooded
level's water (the bot dies of thirst below more than of anything else). I left it: it offsets the harder pieces.

**Commits.** "Odd levels below". Switch: `floors`.

**Choices made without asking.**
- About a quarter of the upper levels are odd (30% chance, 8% of it the sleeping rare); the last level is never odd,
  so the relic's level stays as it was.
- The world snapshot was updated: the locked place's list of levels changes for some seeds.

**Verdict: maybe.** Good variety cheaply; the balance shift is worth watching.

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
