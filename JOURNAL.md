# Commission 8

The brief (COMMISSION.md): character. Surfaces you can tell apart at a glance and no visible tiling, roads that look
made, made things that read as made, rooms furnished by what they are for, High pushed much further, and two bugs (the
traveller at the fire, small towns that are only a menu). Pieces with switches, as before.

## C8.7: fields round the towns

**What it is** (`view/fields.js`). Round every town in sight lie five to nine fields, squared to the town's streets,
on level open ground away from water, woods, roads and other places: ploughed in rows of a crop of the climate (wheat,
barley, cabbages, flax in flower and fallow in temperate lands; hay in the wet; barley and turnips in the cold;
millet and watered beans in the heat; grazing on the steppe), each bounded by what its people build with: a drystone
wall in the cold, wet and ashen lands, a hedge in temperate ones, a low mud-brick wall in the heat, a post-and-rail
fence on the steppe, with a gap for the gate on the side toward the town. Trees, rocks and grass keep off them. View
only: the rules know nothing of them and they never block the way. A town now sits in worked land, so it reads as a
place people live from, and it answers "field boundaries" in the brief's list of made things.

**Cost.** One mesh for the fields' ground and one instanced mesh per kind of boundary (four draw calls at most); 4 m
cells and plain hedges below High, 2 m cells and rounder hedges on High; only towns within about 560 m (900 m on High).
Not on the hidden Fallback.

**Switch.** `fields` (Settings, the look). Picture: `docs/look/after/fields.jpg`.

## C8.6: High pushed further, and the cheaper levels kept as they were

**What changed on High** (`quality.js`): more land drawn (30 tiles round the region, was 26), trees whole out to
720 m (560), a deeper and denser ring of grass and flowers (74 m and 42,000 tufts; 56 m and 20,000), and **stones and
fallen leaves underfoot** (`pebbles`, grass.js: up to 9,000 small stones, lit as balls, and leaves under trees, most
where little grass grows). High alone reads the ground's macro per pixel, adds a second, turned reading of the grain,
a finer one close to, and the meadow's flowers; and has finer roads (a point every 1.2 m, close-set kerbs) and fields.

**For every level:**
- **Grass blades are green from behind** (kit.js `frontLit`): three's two-sided Lambert material lit a blade's back as
  if it faced the ground, so half of every tuft was black: the dark spikes all over the fields in the pictures.
- **Rooms a little lighter** (run.js): the sky's light through the windows and the lamp are stronger indoors, so what
  is in a room reads.

**Keeping Low and Medium as they were.** Measured as the work went (the probe below), the new ground, roads and fields
first cost Low and Medium about 45% more frame time on this renderer. Brought back: on Low and Medium the ground's
macro noise is given to each point of the land (`macroAt`) rather than read per pixel, and there is no finer reading
or flowers, so the ground is two texture reads a pixel as before; roads are laid coarser with longer kerb stones, and
their edges and the fields only near the player's region; hedges are plainer; the hidden Fallback keeps the old grey
road tiles and has no fields. The macro's tile is 168 m (a region is six) and the grain's 4.8 m (210 to a region), so
neither jumps when the land is rebuilt across a border.

**Numbers** (`python3 tools/bench.py fallback low medium high rooms`, software renderer at 412 x 915, seeds 11 / 222 /
3333, about 8% noise; before is v0.18 measured the same day):

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| before, Fallback | 80 | 75 | 110,521 | 63.7 |
| after, Fallback | 74 | 70 | 109,635 | 66.8 |
| before, Low | 307 | 124 | 583,226 | 361.3 |
| after, Low | 447 | 124 | 594,852 | 367.6 |
| before, Medium | 320 | 145 | 595,388 | 359.5 |
| after, Medium | 418 | 141 | 606,908 | 378.9 |
| before, High | 343 | 154 | 767,856 | 464.7 |
| after, High | 539 | 161 | 1,089,715 | 893.7 |

Low and Medium draw within the noise of before (+2% and +5%), with the same draw calls. Their land takes about 100 ms
more to build (the ground's eight kinds and macro per point, the roads and fields), but it is built in slices over
frames while the old land stands, so it is not a pause. High spends about twice the frame of before on this
renderer, which is where Andrew asked for it to go; on the Pixel the software renderer's cost per texture read and per
pixel is far higher than a phone GPU's, so expect much less. **A full room** (seed 11's elder's hall, 68 things, and a
house, 97 things): 108 / 113 ms on Low (was 113 / 113), 110 / 116 on Medium (121 / 118), 145 / 148 on High (153 /
152): more things, a little cheaper, since the room's floor is no longer hidden under the building's plinth.

**Switches.** None of its own: the quality levels, and `grass`, `grounds`, `roads`, `fields` (Settings).

## C8.5: rooms furnished by what they are for

**What it was.** Commission 7's rooms had the right kinds of things, but placed at random along the walls and over
the floor, in big bare rooms; and every room's floor was the building's own solid stone plinth, grey slabs drawn half
a metre above the real floor, with the furniture standing sunk into it (`docs/look/before/dwelling-*.jpg`).

**What changed.**
- **The floor** (view): a building you walk into stands on a plinth round its foot only, so inside you see the room's
  own floor: boards in a house, earth in a poor one, stone in a temple or a hall, tiles in the heat; boards narrower.
- **Rooms by wealth and kind** (`rules/rooms.js`, `content/rooms.js`): a poor dwelling a living room with the hearth,
  a sleeping room, a store and a workroom; a middling one a kitchen of its own as well; a rich one a dining room and a
  study besides. A temple has a **nave** and a **vestry**, a mapmaker's house its **stacks**. Rooms are about 5 m a side
  now (four tiles, was five), so a house has more of them, each fuller. A fire only where people sit, cook or sleep.
- **Placed by function**: an altar against the far wall from the door; pews (or a library's bookcases) in rows with an
  aisle up the middle from the door; nothing in front of a doorway; a table where there is room round it, with a chair
  on every side there is room for, facing it, and a place laid before each in a living room, kitchen, dining room, hall
  or taproom (a plate, and a cup where they have them). **What goes with each piece**: pots and a kettle on the floor
  before the hearth with firewood beside it and a stool facing it; a nightstand or a chest beside a bed; a stool at the
  workbench; an anvil before the forge with a bucket; the god's shrine and candlesticks on the altar; scales and a
  ledger on the counter; a jug on the washstand.
- **Small things where they belong** (`near`): pots by the hearth, plates on the table, tools on the bench, books in the
  bookcase, candles on the nightstand and the altar; buckets, brooms and baskets on the floor against a wall.
- **Abandoned houses**: some furniture gone, the rest broken (a bed fallen in, a table on a short leg, chairs on their
  side, a chest's lid flung back, a cupboard's door hanging, pews collapsed), cobwebs, fallen plaster and boards,
  shards; one thing in two such houses has come through whole.
- **The god's place**: the shrine on a temple's altar is the world's god's own, by its domain (a bowl of still water, a
  cairn, a lidless eye, an ever-burning brazier, a staff and sandals, a broken shield, a sheaf, an open eye), in its
  colour; holy symbols in its temple are named for it ("holy symbol of Tethael").
- **More things, with variants** (`view/furniture.js`): new furniture (nightstand, sideboard, pew, washstand, cradle,
  tall candlestand, vestments) and small things (candlestick in tin, brass or silver; ladle, ledger, scales, censer,
  offerings); a poor, a middling and a rich bed (straw pallet, wooden bed, four-poster with curtains), table (trestle,
  plank, turned legs with a linen runner), chair (stool-like, ladder-back, carved with arms and a cushion), chest (rope
  hasp, iron-bound, painted with a domed lid) and lamp (clay oil lamp, lamp, candelabrum); broken versions as above.

**Also.** A hamlet in an old save whose region's map was packed away could not become a town (C8.2: it read the packed
map); it reads it unpacked now.

**Switches.** `rooms` (Tinker; `NO=rooms`: commission 7's furnishing), and the look's `furniture` (Settings: the plain
models). Tests (pieces.test.js, `rooms`): in 16 worlds every temple has its altar, the shrine of the god on it and pews;
most tables have two seats or more; fewer than one small thing in twenty lies loose in the middle of a floor; rich
houses have a dining room or a study; every abandoned house is cobwebbed and old; NO=rooms furnishes as before.
Pictures: `docs/look/{before,after}/dwelling-1.jpg` to `dwelling-3.jpg`, `empty-house.jpg`, `temple.jpg`,
`shop.jpg`, `smithy.jpg`.

## C8.4: roads that look made, and bridges

**What it was.** A road was its whole 28 m tile painted grey: as wide as a field, blocky, a staircase wherever it ran
on a slant (the rules lay roads tile by tile), and hard to tell from bare ground (`docs/look/before/road.jpg`).

**What it is now** (`src/view/roads.js`). Each road is its own narrow ribbon laid on the land along a smoothed line
through its tiles (three passes of corner cutting turn the staircase into a road that runs on the slant and bends),
with a made surface, an edge, and a verge of trodden ground that fades into the land. Three kinds:
- **A street** within about 110 m of a town's block: rows of rounded setts with dark joints, lit on top, worn lighter
  down the middle, and a kerb of dressed stones along both sides (4.2 m).
- **An old road of the lost people**, in a world where they were road-builders: big slabs in staggered courses, turf
  in the joints, whole stretches half-buried under the grass (or sand, or snow: the ground's own colour), an edge that
  wanders where stones are missing, and edge blocks still standing in places, some tipped or sunk (4.8 m).
- **A track** where they were not (the plot's old ways): beaten earth with two dark wheel ruts, a strip of grass
  between them that thins where the wheels wander, a wide trodden verge, and now and then a leaning waymark post (3.2 m).
- **Bridges**: where a road crosses a stream or a river it rises on ramps to a deck a little above the water, with
  stone parapets for a street or an old road, and a rail on posts over a deck of planks for a track.

The ribbons are one mesh per kind; the kerbs, blocks, posts, parapets, rails and planks are instanced: at most nine
draw calls for every road in sight, and a few thousand triangles. Building them takes about 25 ms of the land's build
(one slice of it). Grass no longer grows on the made way (`roadNear`), but does on the rest of the old road tile.

**Switch.** `roads` (Settings, the look): off, the old grey tiles. Tests (pieces.test.js, `the ground`): a staircase
of road tiles becomes one smooth line close to its tiles, a straight road stops at a town's block, and two roads make
two lines. Pictures: `docs/look/{before,after}/road.jpg`, `road-2.jpg`, and after only `road-old.jpg`,
`road-old-2.jpg`, `road-town.jpg`, `bridge.jpg`.

## C8.3: ground with character

**What it was.** The ground had one texture of four grains (grass, grains, rock, snow) repeated every 5 m, mixed by
weights read from the colour, with a finer copy close to. In an open field the repeat showed plainly, and sand, earth,
mud, gravel and salt were all "grains": told apart only by their colour. Salt flats and snow were blown out to white in
the sun.

**What it is now** (`src/view/grounds.js`).
- **Eight kinds** in two textures: grass (clumps of blades, lit tips, shaded roots), sand (long bent wind ripples with a
  lit crest and a shaded lee), rock (broad plates of their own tone split by dark cracks), snow (drifts and glitter),
  earth (clods lit on top, cracks between), gravel (round pebbles packed close, each lit above and shaded below), mud
  (dark pools with light rims, streaks), crust (a salt or ash pan's big pale polygons with raised dark cracks). Each
  pattern has its own scale and shape, exaggerated, and each kind its own tint over the biome's colour (sand warm, rock
  cool, mud dark, earth russet).
- **Which kind** comes from the colour (so generated biomes work), the slope (cliffs are rock), and the rules: a bog is
  mud, a salt pan or ash field crust, a frozen lake snow, scree gravel, a wood's floor earth and leaf, a stream's banks
  mud (`kindsOf`, `specialKind`).
- **No tiling**: a macro texture of four noises over a 190 m tile slides where the grain is read by up to 1.7 m, so the
  repeat never lines up; on High a second reading, turned 37 degrees and at 1.6 times the scale, is blended in by the
  noise as well. The land's own colour also wanders more (warmer and cooler, lighter and darker, over a few hundred m).
- **Patches a painter would lay in**: lusher and drier grass in drifts of 20 to 40 m, sharp-edged bare earth through
  the grass, and close to, in a meadow's low patches, a few round dots of flowers (white, yellow, violet).
- **Edges**: where two kinds meet, the weights are nudged by noise and cubed, so the stronger kind wins with a crisp,
  wobbling edge; a thin darker line runs along it.
- **Chalky, not white**: pale ground's lightness is eased above one half, so salt shows its polygons and snow its
  drifts in full sun (ART.md: whites stay chalky).

**Cost.** Five texture reads a pixel of ground on Low and Medium (two before), seven on High; the vertex data grows by
four numbers a point. Measured with the rest at the end.

**Switch.** `grounds` (Settings, the look): off, the ground of commission 7. Tests (pieces.test.js, `the ground`): the
colour and context of a point give the right kind (green grass, pale warm sand, pale salt where hot and snow where
cold, brown earth, a cliff rock, a bog mud), the weights sum to one, and the hand-made biomes' special grounds read as
crust, mud and snow. Pictures: `docs/look/{before,after}/field-near.jpg`, `field-far.jpg`, `field-knolls.jpg`,
`field-moor.jpg`, `salt-day.jpg`, `taiga-day.jpg`.

## C8.2: hamlets are real places (steads)

**What it was.** A hamlet on the land was four little houses you could not enter round a well, and a menu (a bed by
the fire, a bundle of wood, a few potions, a rumour): a town in name only.

**What it is now.** Every hamlet is a small town of its own, of the size the town life piece already knew as a
hamlet: lanes and a little square, an elder with news and errands, an inn with a bed, a shop, one more service (a
healer, a priest, a mapmaker...), a few dwellings, every building one you walk into with rooms and things like any
town's, and its own culture, people and tune (the hamlet's musette). It stands on its 5 x 5 block of the land like any
town, is told as a hamlet the first time you walk in ("Coldcroft, a hamlet. Smoke from three chimneys, a dog, a well
with a bucket on a chain. Every door is open to a traveller."), and keeps the hamlet's name.

**How.** `rules/steads.js`, imported last. The hamlet is still rolled where it always was (with its region), so no
world changes as it is made; once the world exists (`worldBorn`, last of all), every hamlet becomes a town through
`townAt` (split out of `addTown` in moretowns.js, so the two make towns the same way) at the size asked for
(`want`, read by town life's `rollLife`). A region built later has its hamlet made a town as it is built. Where the
hamlet's own tile has no room for a block (a spring beside it, water), the nearest place within five tiles that has
room is used; a hamlet in a region that already has a town, or with no room near, is gone (its region's town stands in
for it). Things left on the block go to the tile below its gate, as when towns first got blocks. **Old saves**: their
hamlets become towns as they load (`AFTER_LOAD`), except one the traveller is standing among, which waits until they
have walked off. No change to the shape of the state (a town record has three optional fields, `hamlet`, `talk`,
`told`), so no migration.

Some 3 to 5 hamlets a world. The largest save with every region visited goes from 153 to 180 KB (a town's streets are
kept like any town's).

**Also.** A bed at an inn now gives drink through the night: a traveller with nine measures of water died of thirst in
an inn's bed in a hot land while the tests walked through more towns than before.

**Switch.** `steads` (at creation, and in play: no more hamlets become towns). Tests (pieces.test.js, `steads`): in 16
worlds every hamlet is a town of size hamlet with a site on the land, a hall, an inn, a shop and a dwelling to walk into
and plenty of rooms; none is left a menu; an old save's hamlets become towns; NO=steads keeps them hamlets. The
more-towns test now walks into each of them too. Picture: `docs/look/after/hamlet.jpg`.

**Verdict.** The fix the brief asked for, and more places worth finding.

## C8.1: the traveller at the fire answers

**What it was.** At a wayfarer's fire, "Sit and listen" (and any choice after which the wayfarer moves on: a measure of
water that was the last, the map, sharing water with the lost traveller) did its work in the rules, but the window
asked the rules again what the wayfarer offered, got nothing (they had gone on), and returned without changing: the
same window, the same "Yes", and the answer hidden in the log behind it. It looked like nothing happened.

**What changed.** A choice in any of these windows (a wayfarer, a hamlet, a town's healer, priest, trainer, smith,
mapmaker or stable, the sky's people) now shows what it brought at the top of the window, in italics: the pilgrim's
news, the price paid, "You cannot afford that". When the person has gone on, the window stays on what they said, with
a "Go on" button. The browser test now sits down at a wayfarer's fire, takes the first choice and checks the answer is
in the window.

**Switch.** None (a fix).

# Commission 7

**On merging (v0.18):** Andrew kept everything except the ink lines over everything in other worlds (C6.5, switch
`ink`), which he felt did not work. They were taken out on the merge: the ink pass in `post.js`, the look's `line`, the
inked rims of the sun and moon, the flat land, and the wisps that kept grass out of the ink. Other worlds keep their own
palettes, two bands, the wash and the paper grain, and their clouds again. Outlines keep the look's `ink` colour as their tint.

The brief (COMMISSION.md): visual fixes Andrew found on his Pixel 9 (townspeople's outlines, far shimmer, black boxes
far off), more music (a harpsichord and Baroque pieces, a tune for each kind of place and event), and the main work:
buildings you can walk into, full of ordinary things you can pick up, with theft in houses and secret value in
abandoned places. Pieces with switches, as before.

**Measuring.** As commission 6: `python3 tools/bench.py fallback low medium high` and `python3 tools/look.py`, with
`CHROME=/opt/pw-browsers/chromium` (the full `node tools/check.js` needs it too for the browser test in a cloud session).

## Summary

Seven entries, newest first below, in four commits (C7.4 to C7.6 went in together: they were built and checked as one,
each with its own switch). Every check passes, the full one with the browser test, which now walks into a house through
its door, takes something (and, seen, is made to put it back first), and walks out. No save migration: the new state
(`s.taken`, areas of kind `house`, `s.stats.caught`) is optional, and old saves load as they were.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C7.1 | Outlines only outside the figure (stencil), thin; caves fade into the air far off; bands and far outlines that do not crawl | `outlines` | a needed fix |
| C7.2 | A harpsichord, Baroque dances and a tune of its own for every kind of place; pieces for a discovery, a win and a death | `sound` | pearl |
| C7.3 | Ninety kinds of ordinary things in levels and round ruins and caves, made from the seed, to pick up, carry, eat, light or sell | `things` | groundwork, and a pleasure to poke about in |
| C7.4 | Every town building is a place you walk into, with rooms that suit it, drawn where it stands | `interiors` | pearl |
| C7.5 | Taking in someone's house is seen and undone; a window says who saw you | `theft` | small, replaceable |
| C7.6 | Some old things are secretly valuable, until a merchant appraises them | `secrets` | small pearl |
| C7.7 | Inside a building only the town of the land is drawn; measurements | (none) | pearl for the phone |

**Numbers, before and after** (`python3 tools/bench.py fallback low medium high rooms`, software renderer at 412 x 915,
seeds 11 / 222 / 3333; slow in absolute terms, comparable across rows, about 8% noise). Before is the end of
commission 6.

| | build ms | draw calls | triangles | frame ms | page |
| --- | --- | --- | --- | --- | --- |
| before, Fallback | 82 | 73 | 106,484 | 75.4 | 818 KB |
| after, Fallback | 74 | 75 | 110,521 | 72.9 | 935 KB |
| before, Low | 362 | 124 | 578,686 | 401.7 | |
| after, Low | 389 | 124 | 583,226 | 403.9 | |
| before, Medium | 381 | 146 | 590,024 | 405.6 | |
| after, Medium | 362 | 145 | 595,389 | 401.0 | |
| before, High | 389 | 154 | 762,489 | 513.3 | |
| after, High | 435 | 153 | 767,854 | 525.0 | |

Outdoors nothing changed but a few thousand triangles of old things round the ruins. **A full room** (seed 11's
elder's hall, 54 things, and a house of four rooms, 86 things):

| | the room's draw calls | the room's triangles | the whole frame inside: calls, triangles, ms |
| --- | --- | --- | --- |
| Fallback | 7 | 4,502 / 9,312 | 67 / 58 calls; 135k / 145k; 112 / 119 ms (before C7.7) |
| Low | 7 | 4,502 / 9,312 | 120 / 95 calls; 698k / 705k; 555 / 538 ms (before C7.7) |
| Medium | 8 to 9 | 6,766 / 14,232 | 144 / 104 calls; 709k / 722k; 526 / 552 ms (before C7.7) |
| Medium, after C7.7 | 9 | 7,114 / 14,796 | **65 / 68 calls; 29k / 47k; 183 / 199 ms** |
| High | 8 | 6,766 / 14,232 | 148 / 106 calls; 976k / 978k; 735 / 733 ms (before C7.7) |

A room is cheap (walls, floor, ceiling, woodwork, window glow, furniture, small things, two outlines); what cost was the
land behind its walls, which C7.7 stops drawing indoors: inside a building is now the cheapest place in the game.

**Saves and memory** (Node, a world's every place visited by god mode, three worlds): a new world's save is the same
(77 / 57 / 56 KB); after every place, 157 → 159, 108 → 109 and 124 → 126 KB (the god-mode jumps into a house each leave
an area a few hundred bytes, which C7.4's `forgetHouses` now removes); thirty things taken add 0.3 to 0.9 KB (about 30
bytes each). Making every thing of a whole world at once (3,500 to 5,000 things in every level and round every ruin,
and 41 to 57 buildings' rooms) costs some 2 to 8 MB of memory more than before; in play only the places near you are
made, and the caches keep at most 64 places' things and 32 houses.

The bot: 30 / 150 (20%), 19 / 150 (13%) and 22 / 150 (15%) over three seed sets, every piece on (floor: 8%).

**My three best.**
1. **The town's buildings opened (C7.4)**: no loading, no jump, the same trick as the town's gate. The room is made
   from the seed, drawn where the building stands within its walls, and forgotten when you leave; the house's trade,
   wealth, climate and year decide its rooms and things, so a hamlet's cottage and a city merchant's house really are
   different places, and none of it is stored.
2. **Tunes with identity (C7.2)**: a theme per place, varied each time round, so the city's minuet is the city's, and
   the Baroque's own devices (sequence, walking bass, a lament over a chromatic bass) make it sound composed, for a few
   oscillators.
3. **Outlines in the stencil (C7.1)**: one line of state per material fixed the masks on faces for good, for nothing.

**What I would do next.**
1. People inside: the smith at the forge, the innkeeper at the counter, a family at the table (the actors exist; they
   need a place to stand and a reason).
2. A real crime system in place of C7.5: unseen at night or with the household asleep, a fine or a night in the cells,
   a bad name in the town that raises its prices.
3. Rooms in the steppe's tents and the hamlets on the land; upper floors and cellars.
4. More things for the strange places (the moon's, other worlds'), and the lost people's wares drawn in their own
   style (their marks and shapes), not only their colour.
5. On the Pixel: walk into a few houses with the meter on; if the room's things cost, `FOLD` in view/things.js is the
   lever.

**CHANGELOG row for the merge into `main`** (ready to paste, with the version that merge gets):

| v0.18 | Commission 7: rooms full of things. Every building in a town is a place you walk into through its open door, with rooms that suit it (a house's living room, bedroom, kitchen and workroom; the inn's taproom; the elder's hall; the temple's chapel; the smithy), furnished by the town's trade, size, climate and the year. Ninety kinds of ordinary things in rooms, levels, ruins and caves, made from the seed and never stored, to pick up and carry, eat, light or sell; taking in someone's house is seen; some old things are secretly valuable until appraised. Music: a harpsichord, Baroque dances and a tune of its own for every kind of place, and pieces for a discovery, a win and a death. Fixes: thin outlines only round the outside of people (no masks on faces), caves that fade into the distance, less shimmer far off. See `JOURNAL.md` |

## C7.7: indoors, only the town; measurements

**What it is.** Inside a building the land behind its walls was still drawn: 700,000 triangles to look at a wall. Now,
while the traveller is in a house, only the town of the whole land is drawn (`indoorView` in scene.js, each frame, a
flag on the land's parts); through the open door you see the street and the houses across it, and haze beyond. The frame
inside a house went from 526 to 183 ms on Medium on this renderer, 144 to 65 draw calls. Also: `tools/bench.py rooms`
measures a full room on each quality; `tools/nofog.py` lists dark things that skip the fog; `tools/look.py` has the new
pictures (`person-*`, `things-*`, `house-*`).

**About the browser test.** It now takes eight minutes here, so `tools/check.js` gives that step twenty (it was cut off
at ten once); and its walk over a border starts 5 m from the edge instead of 14, since on this software renderer the
walk manages about a metre a second (frames are capped at 0.05 s of walking each), so 15 seconds was borderline. It
failed that way twice in this commission, both times with no error but the timeout; neither is a fault in the game.

## C7.6: secret value

**What it is.** A few old things are not what they seem. In ruins, caves, dungeons and empty houses, about one old
thing in twenty-five that could be one (rings, cups, bowls, plates, statuettes, lockets, vases, urns, books, scrolls,
maps, dolls, combs, holy symbols, skulls, paintings, lutes, flutes, mirrors, bones) is a secret: a dull ring that is
**old gold** (60), a cracked bowl **of rare Tokhirut make** (40), a mouldering book that is a **lost book of the
Tokhirut** (50), a rag doll **with a gem hidden in it** (45), **a saint's bones** (35), a painting **by a master's
hand** (55). It is picked up as its plain self, and a merchant who has not looked at it pays as for anything unknown
(3 coin). **Appraised** in a town (the shop's "appraise", 4 coin), it takes its true name and worth. Studying it by the
fire or a wizard's spell learns nothing (there is nothing to study in a bowl); the merchant's eye does. The lost
people's name comes from the world's own (`s.civ`), so their wares and their secrets are theirs.

Which things are secrets is rolled with the rest of a place's things (`THING_FINISH`), from the seed; the roll is
always drawn, so turning the piece off leaves every place exactly as it was. Some 25 to 30 secrets a world.

**Switch.** `secrets`.

## C7.5: theft

**What it is.** In someone's house or shop, and in the places people live (a cloud city, a merfolk hall, a floating
town), every thing belongs to someone. Taking one: you are always seen, a window says who saw you ("Tamsin, the smith,
sees you lift the iron hammer. 'That is not yours.' You put it back where it was."), the thing stays, and the journal
counts the times. The owner is named where the town knows them (the elder, the merchant, the person at a service's
door) and otherwise is the woman or the man of the house, a child, an old man by the hearth. Where nobody lives
(ruins, caves, dungeons, the wild, an empty house) things are anyone's.

**Choices.** Kept deliberately small, as the brief asks: one check on taking (`TAKE_CHECKS` in things.js) and one
event (`'caught'`) the view shows as a window. A real crime system (being unseen at night, a fine, a bad name in the
town, the watch) can replace this module without touching anything else.

**Switch.** `theft` (off: take anything anywhere).

## C7.4: buildings you can walk into

**What it is.** Every building in a town is a place you walk into, with no menu and no jump.
- **The door** (rules/houses.js): each block of wall in a town's grid is a building (as the view has always drawn
  them); one beside the elder's, inn's, shop's or a service's door is theirs, the rest are houses, and each has its
  door on the side facing a main street. The building's wall there is open: a doorway with its door standing open
  against the wall, a step, a lintel (buildings.js). Walk into it and you are inside (`MOVES` in hooks.js, run at the
  start of `move()`); walk back out of it and you are in the street before it.
- **Inside**: the building's own small map (an area of kind `house`), three tiles to a town tile (about 1.3 m), over a
  window of the town round the building. Its outer ring is the room's edge, where furniture stands against the walls;
  inner walls with doorways part it into rooms of five to eight tiles a side, both ways for a big building, as many as
  its kind has: a house a living room, a bedroom, a kitchen and a store or workroom; the inn a taproom, kitchen and
  bedrooms; the elder's hall a hall and a study; the temple a chapel; the healer a sickroom; the smith a smithy; the
  mapmaker a study; the stable a stable and store. What stands in a room's middle (a table, a counter, an anvil) is in
  the way, so long as every corner can still be reached.
- **What it holds** follows from the building, the town's trade (looms in the weavers' town, drying racks among the
  herbalists, anvils among the smiths, nets and floats and dried fish in a town by the water), its size and so its
  wealth (a hamlet's cot and rush mat and wooden cups; a city's curtained bed, fine carpet, tapestry, painting and
  silver), its climate (a stove and firewood in the cold, water jars in the heat), the year (no food in a lean year,
  firewood in a hard winter, candles in the long dark), and in the unfallen town the lost people's own wares under
  their mark. About one house in fourteen stands empty, its things old, dusty and free to take.
- **Seamless**: the view (rooms.js) draws the room where the building stands, within its outer walls, with the town
  round it: a floor of boards (earth in a poor house, stone in a hall or a temple), walls of plaster, logs, stone or
  adobe by climate, a beamed ceiling, windows bright by day and glowing at night, door frames. Walking through the door
  only moves the frame's origin (as the town's gate does); nothing is rebuilt. The rooms of the buildings whose doors
  are near you are drawn too, so you see in through an open door before you step through it. Inside, the light is the
  sky's through the windows and a warm lamp, and the score plays the room's own tune (a march in the hall, a chorale in
  the temple, a gigue at the inn, a minuet in a rich house, a drifting air in an empty one).
- **Memory and saves**: nothing of a house is stored. Its layout and things are made from the seed when wanted; the
  house's area is forgotten when you walk out, unless you put something down there. A save made inside a house loads
  inside it. Measured below (C7.7).

**Not done.** Tents (a steppe town) stay closed: a round tent and a square room do not fit; hamlets on the land have
no interiors yet. Upper floors are not walked (a house's upper storey is roof space as before).

**Switch.** `interiors` (off: solid buildings, as before). God mode lists the story town's hall, inn and a house
("Houses"). Tests (pieces.test.js, `interiors`): in 25 worlds' towns every building has a door into a street and rooms
with things, every floor tile can be reached from the door, a house is the same twice, walking in and out puts you
where you should be, a save inside a house loads, a house left is forgotten, and the switch closes the doors. The
browser test walks in through a door, takes something (and, seen, is made to put it back), and walks out.
Pictures: `docs/look/after/house-hall.jpg`, `house-home.jpg`, `house-inn.jpg`, `house-door.jpg`.

## C7.3: things in levels, ruins and caves, and picking them up

**What it is.** The first half of the commission's main work: ordinary things, made in code and in the style, put
where they belong, that you can pick up.
- **Ninety kinds** (`content/things.js`): furniture (beds, tables, benches, chests, shelves, hearths, barrels, crates,
  rugs, tapestries, looms, spinning wheels, anvils, forges, altars, lecterns, coffins, ore carts...), the kitchen
  (cups, plates, bowls, jugs, pots, pans, kettles, spoons, knives, bread, cheese, apples, dried fish, herbs), light
  (candles, oil lamps), tools (brooms, buckets, hammers, tongs, saws, scythes, picks, shovels, horseshoes, chains,
  nets and floats, spindles and yarn), and keepsakes (books, scrolls, maps, paintings, vases, dolls, wooden horses,
  flutes, lutes, drums, statuettes, holy symbols, lockets, rings, combs, mirrors, dice, urns, bones, skulls, shells,
  coral, old helmets and shields). Many come in three grades by wealth (a wooden, pewter or silver cup), old ones have
  a word of their own (cracked, rusted, mouldering, moth-eaten), and the lost people's wares carry their name and a
  touch of their colour.
- **Where they are**: every level has its theme's things (a crypt's coffins, urns, bones and candles; a mine's carts,
  picks and lamps; a wreck's barrels, bottles and maps; a merfolk hall's shells and coral; a cloud city's vases and
  flutes; a sky castle's racks, shields and silver cups), furniture against the walls and small things on it or on
  the floor; round every ruin and cave a few old things lie a stone's throw off. All of it **from the seed**:
  `thingsIn` makes a place's things the same every time, and only `s.taken` (ids per place) is saved. A world's 70 or
  so levels and regions hold some thousands of things; a save holds a few bytes for each one taken.
- **Picking up**: standing by things, up to three buttons offer the nearest ("Take the cracked Tokhirut bowl", with
  its weight); taking makes an item of the same name and weight, so the carry limit applies (too heavy: refused).
  Most are worth a coin or two, bones and skulls nothing; food can be eaten (bread, cheese, apples, dried fish,
  mushrooms), herbs make a poultice, a candle or an oil lamp lights the dark for an hour or three, a jug of water is
  drunk. Put down, a thing lies where it was dropped, drawn as itself (not a crate). There is nothing to study in a
  cup: studying and the wizard's identifying pass things by.
- **Drawing** (`view/things.js`): sixty-odd models from the kit, a few strong shapes each, banded like everything
  else; a place's things are merged into two meshes (furniture, outlined on Medium and up; small things, which fold
  away to nothing past 28 to 40 m in the vertex shader, so far cups neither cost nor crawl). Kept per place and what is
  left, so walking rebuilds nothing.

Hooks for the next pieces: `THING_MAKERS` (houses), `TAKE_CHECKS` (theft), `THING_FINISH` (secret value),
`ITEM_NAMES` / `ITEM_VALUES`. Tests (pieces.test.js, `things`): every name in the content is a thing, furniture has a
size and the rest can be carried, things are the same twice and never stored, ids are unique, nothing stands in a wall,
taking makes the right item and weight, a taken thing stays gone after loading, a thing put down is kept, the carry
limit holds, and the switch makes none. Pictures: `docs/look/after/things-level.jpg`, `things-ruin.jpg`.

**Switch.** `things` (Tinker; `NO=things`), and `thingsDrawn` (Settings) to compare the drawing.

## C7.2: a harpsichord, Baroque dances, and a tune for every place

**What it is.** The score is composed now, not wandered. `src/view/score.js` writes it a bar at a time from
`content/music.js`:
- **A theme per place**, rolled from the place's key (`town:city`, `land:cold:night:taiga`, `deep:crypt`,
  `sea:merhall`, `elsewhere:<world>`...): a motif and its answer (two bars of rhythm and melodic shape), a third shape,
  and two chord progressions. The tune states the motif over the A part's chords, carries it through them in sequence,
  and closes with a trilled cadence; then the B part (to the fifth, the relative, or round the circle of fifths); then A
  again. **Each time round it varies**: passing notes, an octave up, the shape turned over, trills and turns on long
  notes, rests. So the city's minuet is recognisably the city's, every visit, and does not wear thin.
- **Baroque dances**: minuet, sarabande, gigue (in threes), gavotte, bourrée, musette (over a drone), air, chorale,
  march, with a bass of a note a beat, a walking line to the next chord, long notes or a drone, and an inner voice in
  thirds and sixths under the tune (simple counterpoint). The land keeps slow airs (`drift`) over the old washes and
  drone, but now each biome by day and by night has its own air in its climate's mode (hot lands in a hijaz mode,
  cold days lydian, ashen phrygian...).
- **Voices** (sound.js): a **harpsichord** (one oscillator with the spectrum of a string plucked near its end, a filter
  that closes as it dies, the damper falling when the note ends: cheap), a lute (the old pluck), an organ for temples,
  chorales and crypts, a wooden pipe for wet lands and steppes, the old bells and pads.
- **Who plays what**: hamlets a musette on the lute, villages a bourrée, towns a gavotte and cities a minuet on the
  harpsichord; the unfallen town a sarabande in the dorian mode, a pilgrims' town a chorale on the organ; a cloud city
  a lydian minuet, a sky castle a sarabande, a merfolk hall a sarabande, a floating town a gigue; crypts an organ
  sarabande, mines a lute air, the locked place a harpsichord sarabande in the minor; fights in a driving four with
  drums, and a lair's beast or a named foe on a harpsichord in the harmonic minor. Halls, temples, libraries, inns,
  shops, smithies, rich and poor homes and abandoned buildings have entries ready for the interiors piece.
- **Events**: a discovery (a trait of the lost people learned, a plot's step done) gets a rising trilled figure; a
  win a run up the scale and a full close; a death a lament over the falling chromatic bass (the Baroque's own sign of
  mourning). The score bows out under them for a moment.

The Almanac lists every dance and place (`The score`). Tests (pieces.test.js, `the score`): every place's dance, mode
and voice exist, every rhythm fills its bar, themes are stable and distinct, every tune plays 64 bars of good notes and
varies, and the city has its minuet. In the browser the music's level is what it was (peak about 0.05).

**Cost.** A note is one to three oscillators living a second or so; a minuet with its bass and inner voice is about
eight notes a second. Scheduled a bar ahead, ten times a second, as before.

**Switch.** `sound` (Settings), as before; the music volume.

**Verdict.** Pearl, I think: the town now sounds like a town in an old storybook. Andrew: listen in a city and a
hamlet, and at night on the land.

## C7.1: outlines that stay outside the figure, far things that fade and do not crawl

**What it was.** Andrew's screenshot (`docs/bugs/c7-townsperson-outlines.jpg`) showed a townsperson with fat dark
lines, a dark shell round the head and a hexagonal mask round the eyes and nose. Reproduced in `docs/look/before/
person-close.jpg`: C6.4's inverted hull is drawn for every part of a merged model, so the hull of a small part sunk
into a bigger one (an eye, the nose, the buckle) pokes out of the face as a dark ring of its own. And the line was
1 + 1.1 x the look's strength wide, about two CSS pixels: five of a Pixel 9's.

**What changed.**
- **Outlines only outside the silhouette** (outline.js): everything outlined marks the stencil where it is drawn, and
  the outline is drawn after it only where the stencil is clear. So a line follows the outside of a figure (or a house,
  a tree) and can never fall on a face, an arm across the body, or a part sunk into another. The finish's picture and
  the ink's depth keep a stencil now (post.js). No extra draw calls.
- **Thinner**: about one CSS pixel (0.55 + 0.5 x the look's strength), two or three of a phone's.
- Eyes and noses have a few more faces, so they read as round, not hexagonal.
- **No black boxes far off**: cave mouths were drawn unlit *and without fog*, so every cave in sight stayed pitch black
  at any distance while the land round it faded. Unlit things now take fog unless they are lights (landmarks.js,
  scene.js `glow`). `tools/nofog.py` lists every dark opaque material that skips the fog in four worlds' places: 600 to
  900 before (all cave mouths), none after.
- **Less crawl far off**: the toon bands soften from 60 m and are smooth light past 200 m (toon.js), since a band's
  edge finer than a pixel on a far tree crawls as you turn; outlines on buildings and ruins are gone by 70 m (was
  90) and on landmarks by 80 m (was 120). Textures already had mipmaps.
- The stray diagonal line at the left of Andrew's picture: I could not reproduce it; it looks like one more poke of a
  hull past the near plane, which the stencil also stops where it would cross the figure.

Pictures: `docs/look/{before,after}/person-close.jpg`, `person-near.jpg`.

**Switch.** `outlines` (Settings), as before.

**Verdict.** A needed fix; the stencil is the right tool and cost nothing.

# Commission 6

The brief (COMMISSION.md): an art direction. Painted atmosphere as the base (Firewatch, Journey: palette, light and
fog do the work; distance is colour), the best touches of toon (soft bands, light tinted outlines on things), and a
clean-line comic look (Sable, Moebius) for other worlds; the look as data that can be rolled; today's High as the new
minimum, with new Medium and High above it and a hidden fallback.

**Measuring.** `python3 tools/bench.py fallback low medium high` (seeds 11 / 222 / 3333, software renderer at 412 x 915
and a device pixel ratio of 1, so the pixel ratio of a level does not show in it), and `python3 tools/look.py` for the
pictures in `docs/look/`. This machine is slower again than commission 5's: its High (now Low) measured 312 ms a frame
there and 396 ms here. Set `CHROME=/opt/pw-browsers/chromium` in a cloud session.

| before (v0.16) | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| old Low (now Fallback) | 97 | 77 | 106,492 | 111.8 |
| old High (now Low) | 369 | 117 | 571,366 | 395.9 |

The page was 774 KB.

## Summary

Nine entries, newest first below. Every check passes (the full one, with the browser test). The rules are untouched;
everything is in `src/view/`, `src/content/looks.js` (read only by the view) and the tools. No save changes. The page
went from 774 KB to 818 KB.

**The style as built.** Painted atmosphere at home: each place has a small palette rolled in layers (climate, this
world's turn of it, rare looks, the year, troubles, curses, rare countries, weather, dusk and night) that sets the sun,
the shade's fill, the sky, the fog and the colour grade; distance fades into the air in soft steps and on into rings of
far hills; shade is the colour of the air, never black. Toon touches: soft two- or three-band light on people,
creatures, buildings, ruins, rocks and trees, and thin outlines tinted from each thing's own colour. Through a door,
clean line: ink on everything, land included, two hard bands, pale washed palettes of their own on flat land, empty
skies, an inked sun, and music in a whole-tone scale. All of it in data and with switches; `ART.md` is the style guide.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C6.1 | Old High is the new Low; new Medium and High; a hidden Fallback that comes by itself; pictures in `docs/look/` | (settings) | groundwork |
| C6.2 | The look in data: palettes in layers from climate, world, rare looks, year, troubles, curses, rare countries, weather, hour | `look` | pearl |
| C6.3 | Soft toon bands on things; distance fading in steps | `toon`, `fogbands` | small pearl |
| C6.4 | Thin tinted outlines on people, creatures, buildings, ruins, landmarks, near trees; a fix to switching quality | `outlines` | pearl |
| C6.5 | Other worlds in clean line: ink on everything, pale palettes, empty skies; a paper grain; ART.md | `ink`, `paper` | pearl |
| C6.6 | Far hills in bands beyond the drawn land | `skyline` | small pearl |
| C6.7 | Stones without facets; flat land and an inked sun in other worlds | (`toon`, `ink`) | pearl (flat land) |
| C6.8 | At most 60 frames a second, 30 with Save battery, 10 behind a panel | (setting) | pearl for the phone |
| C6.9 | Music for other worlds and cursed lands; dusty reds; clouds in the air's colour; smoother border builds | (`sound`) | small pearl |

**Numbers, before and after** (`python3 tools/bench.py fallback low medium high`, software renderer at 412 x 915,
seeds 11 / 222 / 3333; slow in absolute terms, comparable across rows; about 8% noise). "Before" is v0.16's levels by
their new names, measured cleanly (C6.4 found the benchmark had been carrying settings from one level to the next):

| | build ms | draw calls | triangles | frame ms | page |
| --- | --- | --- | --- | --- | --- |
| before, old Low (now Fallback) | 78 | 73 | 106,484 | 74.8 | 774 KB |
| after, Fallback | 82 | 73 | 106,484 | 75.4 | 818 KB |
| before, old High (now Low) | 369 | 117 | 571,366 | 395.9 | |
| after, Low | 362 | 124 | 578,686 | 401.7 | |
| after, Medium | 381 | 146 | 590,024 | 405.6 | |
| after, High | 389 | 154 | 762,489 | 513.3 | |

Low, the new least, costs what old High did (the look is colour, a few instructions a pixel, and two extra draw calls
for the far hills). Medium adds the buildings' outlines and the paper for about 1%. High adds 30%: the near trees'
outlines (170,000 triangles, cheap on a phone's chip, dear on this renderer), finer shadows and more grass, and draws
at 2.5 pixels per point (which the benchmark at a pixel ratio of 1 does not show). Against all that, the frame cap
(C6.8) halves the work on a 120 Hz phone. Another world on Medium: 268 ms a frame here. **Andrew: on the Pixel, turn
the meter on and compare High and Medium in a forest and in a town; if High runs warm, `outline: 2` and `ratio: 2` in
quality.js's High are the levers, and "Save battery" in Settings halves the work again.**

**My three best.**
1. **The look as layered data (C6.2)**: a palette is a few colours and numbers per layer, each pulling the look its
   own way by its own amount, resolved in plain arithmetic that is tested in Node. It is why a drought, a curse, a
   storm at dusk and a rare violet world all come out coherent without anyone painting each case, and why a new
   mood is one entry in `looks.js`.
2. **Clean line through the door (C6.5, C6.7)**: ink from the bend of one-over-distance (no false lines on slanted
   ground), wisps that the ink does not see, flat land and a washed palette: one full-screen pass, and stepping
   through a door really is turning the page into another artist's book.
3. **Tinted outlines with joints (C6.4)**: the inverted hull reuses each model's own joints and sway, so people,
   creatures and trees keep their thin line as they walk and bend, in the dark of their own colour, for one draw
   call each.

**What I would do next.**
1. Measure on the Pixel (above), and tune High's levers from it.
2. Build a newly seen town or ruin a part at a time, so crossing into a country with one never holds a frame (C6.9).
3. Other worlds: hatching in the shade (a screen pattern in the ink pass), and stranger skies (two suns, banded
   skies) as more of the realm's palettes.
4. The look in levels: dungeons and sky places still use commission 5's fixed colours; give each kind of level a
   palette layer in `looks.js`.
5. A cursed country is coloured but not yet changed in shape: withered trees and a low sickly mist would carry it
   further.

**CHANGELOG row for the merge into `main`** (ready to paste, with the version that merge gets):

| v0.17 | Commission 6: an art direction. Painted atmosphere: every place has a palette rolled from its climate, the world, the year, troubles, curses, rare countries, the weather and the hour; distance fades in steps into bands of far hills; rare worlds in sepia or all reds. Toon touches: soft bands of light and thin tinted outlines on people, creatures, buildings and things. Other worlds in clean line: ink on everything, pale flat palettes of their own, empty skies, music of their own. Old High is the new Low, with new Medium and High above it and a hidden Fallback that comes by itself when frames stay slow; at most 60 frames a second, 30 with Save battery. ART.md is the style guide; pictures before and after in docs/look/. |

## C6.9: music for other worlds and cursed lands, rare looks seen, and smoother border builds

**What it is.**
- **Two moods of the score** (sound.js): through a door, *elsewhere*, on a whole-tone scale with no home key at all,
  slow and swelling, as the look turns to another artist's book; and on a cursed country, *blight*, a low phrygian
  drone with sparse bells.
- **Rare looks in the pictures**: a sepia world and an all-reds one (`rare-sepia`, `rare-reds`). All reds read as candy
  pink; it is now a dusty red (zenith #6e3c3a, saturation 0.95).
- **Clouds take the air's colour**: 30% of the horizon, so a sepia or red world's clouds are not pure white.
- **Fieldstones** are twenty-faced again, lit as the balls they stand for (`round` in the kit: each normal points out
  from the middle), a quarter of the work of C6.7's eighty faces for nearly the same look.
- **Border builds in finer slices**: the ground now pauses every two rows and the height field every four, since
  Medium draws the old High's finer ground; a slice is a few milliseconds again.
- `docs/look/README.md` lists the pictures.

**About the browser test.** A town or ruin seen for the first time is built in one step (it is cached after), and at
Medium (the old High) that can take 150 ms on this software renderer; before C6.4 the test unknowingly crossed on a
"lite" Medium. Measured old page on High against new on Medium, same worlds: building the places costs the same (20 to
47 ms both), so this is the level, not the look. The test's bound for one step is 250 ms now, and says why. **Next
thing worth doing for the phone**: build a newly seen town or ruin a part at a time.

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 82 | 73 | 106,484 | 75.4 |
| Low | 362 | 124 | 578,686 | 401.7 |
| Medium | 381 | 146 | 590,024 | 405.6 |
| High | 389 | 154 | 762,489 | 513.3 |

**Verdict.** Small pearl (the music through the door).

## C6.8: a cooler phone, and the browser test kept honest

**What it is.**
- **A frame cap** (run.js): a phone's screen may ask for 120 frames a second (the Pixel 9's does), and the game drew
  every one. Now it draws at most 60, or 30 with **"Save battery: 30 frames a second"** (Menu, Settings, a setting of
  the device), and 10 while a panel is open over the scene (the pack, the map, a town's shop: nothing moves behind
  them). The skipped frames cost nothing. For a long session this is the biggest saving of heat and battery there is:
  half the work at 60, three quarters at 30, with the look unchanged.
- The automatic step down ignores the slow frames behind a panel, and choosing a quality by hand no longer turns the
  watching back on when it was turned off (the tests turn it off).
- **Outlines are built faster**: the smoothing of normals for the outlines used a text key per point; it uses a number
  now. A town's build no longer holds a frame for 170 ms on the software renderer; a border crossed is built over 68
  frames at most 8 ms each.

**Fix to the browser test.** Since C6.4's fix to switching quality, the test's Medium is a real Medium (before, it had
kept Fallback's "lite" towns), so building the next region over several frames takes longer than the six seconds the
test waited on this software renderer; it waits up to thirty now. I should have run the full check (with the browser
test) before every commit since C6.1, not the quick one; from here on it is.

**Switch.** The setting "Save battery".

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 79 | 73 | 106,484 | 69.8 |
| Low | 343 | 124 | 590,406 | 392.8 |
| Medium | 367 | 146 | 613,465 | 404.6 |
| High | 412 | 154 | 785,930 | 518.5 |

(The benchmark measures a slow software renderer, never near the cap, so the cap does not show here.)

**Verdict.** Pearl for the phone: Andrew, with the meter on, High should read about 60 fps where it read up to 120.

## C6.7: stones without facets, flat land through the door, an inked sun

**What it is.**
- **Rocks** (from Low): the same twenty faces as before (there are thousands of them), but a little squashed and
  dented, with their normals smoothed, so their light falls in the toon's soft bands instead of cut facets. A first
  try with eighty faces each looked rounder but put 213,000 triangles on the land (16% on the frame here), so it was
  taken back.
- **Fieldstone ruins** (the "rough" style of building): their blocks are rounded stones softly banded, not a heap of
  dice.
- **Other worlds' land** is drawn in flat colour: the ground's painted grain is flattened 75% toward its plain colour
  while the ink is on (`setGroundFlat`, paint.js), so the clean line has clean colour to sit on.
- **An inked rim** round the sun and the moon in other worlds.

**Switches.** Part of `toon` (rocks, stones) and `ink` (flat land, rims).

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 84 | 73 | 106,484 | 74.7 |
| Low | 346 | 124 | 590,406 | 409.8 |
| Medium | 348 | 146 | 613,464 | 412.8 |
| High | 398 | 154 | 785,930 | 531.3 |

(12,000 triangles more than C6.6 is the rounded fieldstones of ruins in view.)

**Verdict.** Pearl for the flat land in other worlds (it is what made them look drawn rather than filtered); small for
the rest.

## C6.6: far hills in bands

**What it is** (`skyline.js`). Beyond the land that is drawn, two to four rings of ridges (Low 2, Medium 3, High 4) at
860 to 1,750 m stand against the sky, each a step further into the air, so hills stack in bands like a Firewatch vista.
The land drawn nearer has already faded into the air by its edge, so the rings are only a little darker and cooler
than the horizon (24%, 17%, 11%, 7% of the way to a tone of the shade and the zenith): they rise above the land's own
skyline and stand across open water as far coasts. Their ridge lines are a few sine waves from the region's seed,
sharper and taller where the land is mountainous. They follow the traveller like the sky, take their colour from the
look each frame (night darkens them with everything else), fade away in a storm or fog, and in other worlds the ink
draws their edges, which gives the Moebius horizon of pencil ridges. A few hundred triangles each.

Also: the browser pictures' sea is now a coast in the sea world, with a separate picture under the sea; and "before"
pictures were taken for every new view.

**Switch.** `skyline` ("Far hills in bands").

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 79 | 73 | 106,484 | 71.0 |
| Low | 383 | 124 | 578,686 | 401.3 |
| Medium | 389 | 146 | 590,024 | 401.7 |
| High | 395 | 154 | 762,489 | 506.3 |

**Verdict.** Small pearl: quiet by day, lovely across water and in other worlds.

## C6.5: other worlds in clean line, and paper

**What it is.** Through a door, the look itself changes, as if stepping into another artist's book (Sable, Moebius).
- **Ink lines on everything**, land included (`post.js`): the scene is drawn into a picture that keeps its depth, and
  the last pass draws a thin ink line wherever the depth jumps (a silhouette: a hill against the sky, a house against a
  hill) or bends (a crease: where a wall meets the ground). It looks at one over the distance, which changes evenly
  across any flat surface, so a plain or a wall seen at a slant gets no false lines however far it runs; only edges
  and creases do. Lines are about a pixel and a half wide on a phone, in the palette's ink, and drawn lighter with
  distance, so far ridges are a faint pencil line and near things a firm one. That picture is not multisampled: the
  ink covers the edges.
- **The style** (the realm layer in content): two almost hard bands, a weak sun and a strong fill (flat colour, little
  shading), saturation 0.72, the picture washed 16% toward the palette's paper colour, a stronger paper grain, a small
  vignette, the eye seeing a quarter further, **no clouds** (big empty skies), and one of seven palettes per world
  (peach and teal, Sable noon, mint and rose, lilac desert, ochre and slate, cold paper, ember and bone).
- **Wisps**: grass, reeds, ferns and twiggy scrub would be scribbled black by the ink, every blade an edge; while the
  ink is on they are drawn after everything solid without writing their depth, so the ink never sees them.
- **Paper** (Medium and High, everywhere): a fine speckle and soft brush dabs on the slant, fixed to the screen, over
  the whole picture, a little stronger in the midtones; flat colour reads as paint on paper. 4.5% at most at home,
  more in other worlds.
- `ART.md`: the style guide (the rules, the toon touches, clean line, the palettes and how to make one, how to make a
  building, creature, tree or place, the quality levels).
- The browser pictures now go through the door (three other worlds).

**Switches.** `ink` ("Ink lines in other worlds"), `paper` ("A painted grain over the picture"); the finish's switch is
now "Bloom and colour grading" (it runs from Low).

**Numbers.** Home unchanged (the paper is a few instructions a pixel). Another world on Medium (bench `places`):

| place (Medium) | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| other world, in clean line | 896 | 60 | 519,862 | 268.0 |
| dungeon level | 9 | 14 | 36,440 | 89.3 |
| sky castle | 5 | 17 | 20,171 | 162.7 |
| open sea | 1,260 | 97 | 619,015 | 476.0 |
| under the sea | 6 | 6 | 14,264 | 59.7 |

**Verdict.** Pearl, the one Andrew asked for: stepping through the door now feels like turning the page into another
book. What I would still do: flatten the land's painted grain in other worlds, and draw the sun as an ink circle.

## C6.4: light outlines, and a fix to switching quality

**What it is** (`outline.js`). A thin line round people and creatures (from Low), buildings, ruins and landmarks (from
Medium) and the trees about you (High), never round the land. It is the inverted hull: each outlined model gets a
copy of itself drawn from the inside, pushed out along its normals averaged where its parts meet (so the line closes
round corners), in the dark of the thing's own colour leaning toward the look's ink: a dark brown line round a brown
house, a blue-grey one round a blue coat; in other worlds it leans all the way to the ink. The push grows with
distance, so the line stays about one and a half to two pixels wide on any screen, and fades away past 60 m for
people, 90 m for buildings, 45 m for trees, so far things stay soft. People and creatures' outlines move with their
joints, and the trees' sway with them (the sway is one shared piece of shader now, `swayPatch`). One draw call more
per outlined mesh: a person or creature is two, a town about fourteen, a forest's outlines one.

**Fix.** Changing the quality kept any setting of the last level the new one does not name: going from High to Low
kept High's shadows and finish, from Low to Medium kept Low's "lite" towns. Now nothing lingers. This also skewed the
benchmark: it changes level as it goes, so earlier rows here (and in commission 5) measured Fallback with Medium's
extras, and Medium and High with lite towns. The rows below are clean; Fallback really costs about 75 ms a frame here.

**Switch.** `outlines` ("Light outlines on people, creatures and nearby things").

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 78 | 73 | 106,484 | 74.8 |
| Low | 346 | 122 | 578,046 | 394.0 |
| Medium | 385 | 143 | 589,064 | 395.3 |
| High | 405 | 150 | 761,209 | 513.9 |

High's extra 170,000 triangles are the near trees' outlines (a copy of every near tree); on a phone's graphics chip
that is cheap, on this software renderer it shows. If it is dear on the Pixel, `outline: 2` in quality.js's High drops
them.

**Verdict.** Pearl: a person in the street now reads against the cobbles at a glance.

## C6.3: soft bands of light, and distance in steps

**What it is** (`toon.js`).
- **Soft bands.** From Low up, people, creatures, buildings, ruins, landmarks, trees and the plain props are drawn with a
  toon material: the sun's light on them falls in bands (three by default: shade, half-lit, full sun; two in other
  worlds), with soft edges, while the sky's fill light stays smooth beneath, so the shade side of a house or a person is
  the colour of the sky's light rather than a ramp to black. Form reads at a glance on a small screen; nothing looks
  like a cartoon for small children. The bands are one 64-pixel texture, rewritten when the look's `bands` or `soft`
  change (another world's are two and almost hard). The land and the levels' walls keep their smooth light.
- **Distance in steps.** The fog no longer fades far things in one smooth ramp but in five soft steps, so ridges at
  different distances sit in distinct bands of haze, the way hills stack in a painting. Every material's fog goes
  through one shared piece of shader (`fog_fragment`, patched once at start); the frame turns the steps on by giving
  the fog a negative near distance, which nothing else reads, so it costs no new uniform and nothing is recompiled when
  it changes. Outdoors and with the look on only.
- The browser pictures gain a street close up and a creature close up (`tools/look.py`), and the meter and the pictures
  name the look's layers (`__g.look()`).
- Wet lands' sky is a softer grey-blue (it read as green).

**Switches.** `toon` ("Soft bands of light on people, creatures and things"), `fogbands` ("Distance fading in steps").

**Numbers.** Per-pixel light on things instead of per-vertex: within the noise on this renderer.

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 102 | 77 | 106,492 | 116.4 |
| Low | 374 | 117 | 571,746 | 394.9 |
| Medium | 356 | 116 | 571,744 | 397.5 |
| High | 394 | 121 | 648,133 | 464.4 |

**Verdict.** Pearl, small: the change is felt more than seen, a house's shaded wall a cool flat blue-grey.

## C6.2: the look in data: palettes rolled from the land, the hour and the world

**What it is.** How a place looks is now content (`src/content/looks.js`), resolved by a small pure module
(`src/view/look.js`, no Three.js, tested in Node) and put into the frame by `mood.js`. A look is a palette (the sky
overhead and at the horizon, the fog, the sun, the shade's fill light, the light bounced from the ground, the clouds,
the colour grade's lift and gain, the ink) and a few numbers of style (sun and fill strength, saturation, contrast,
bands, softness, how far the eye sees, ink lines, outlines, paper grain, vignette; the later pieces use these). It is
built in layers, each naming only what it changes and how hard it pulls:

1. **the climate by day**: temperate clear and green, wet grey-green and soft, hot bleached gold with lilac shade (the
   Journey trick: warm light, cool violet shade), cold steel blue, ashen ash and ember, steppe wide and straw-gold;
2. **this world's turn of it**: every colour of the climate turned in hue and saturation by a roll of the world's seed,
   within a range per climate that leans toward pleasing turns (a taiga steel blue in one world, violet-grey in another;
   a desert toward rose rather than lime);
3. **a rare look** for a whole world (5%) or one country away from home (4%): sepia, all reds, verdigris, the violet
   hour, ivory, indigo noon;
4. **another world's** style and palette (C6.4 makes the style);
5. **the year** (a drought bleaches, a hard winter blues, a long summer gilds, a year of long nights turns violet...);
6. **the great trouble**, faintly everywhere (20%: a tyrant's iron red, a plague's fevered yellow, the deep king's
   violet), and **a curse** strongly on the cursed country (75%, sickly green);
7. **the country's rare trait** (burned lands ash-grey with an ember sun, hallowed ones gold, silent ones drained of
   colour, glowing ones teal in the shade...);
8. **the weather**: every storm greys, then rain, snow, dust, hail, ash or star-fall adds its own;
9. **dusk** (gold, with a rose horizon and a violet zenith) and **night** (deep blue).

The light takes its sun, shade and bounce colours from it; the sky dome its zenith (with a pale band between horizon
and zenith, so a gold horizon and a blue zenith do not mix to mud); the fog and the far land its horizon; the clouds
their colour; the finish (Low and up) its grade: saturation, contrast, the darks leaning toward the lift colour and
lifted a little into it (shade the colour of the air, never black), the lights toward the gain colour, the vignette.
Near a border the looks of the biomes either side are mixed by their share of the land, as the sky was. Indoors and in
levels nothing changes. With the meter on, the look's layers are named under it ("look: Steel blue, Hard blue, Gold
dusk (turned 12°)").

**Switch.** `look` ("Palettes rolled from the land, the hour and the world"), in Menu, Settings. Its menus are in
the Almanac ("The look"); `tests/pieces.test.js` checks that every climate, year, rare country and trouble it names is
real, that a world always rolls the same look and worlds differ, that night is dark, dusk warm, storms grey, curses
green, other worlds in clean line, and that rare looks come about as often as they should.

**Numbers.** Colour only: the same draw calls and triangles; frames within the noise.

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 87 | 77 | 106,492 | 111.9 |
| Low | 388 | 117 | 571,746 | 411.4 |
| Medium | 366 | 116 | 571,744 | 397.9 |
| High | 362 | 121 | 648,132 | 472.7 |

**Verdict.** Pearl, and the base of everything after it.

## C6.1: the levels moved up, a fallback that comes by itself, and pictures for the phone

**What it is.**
- **The levels** (quality.js): what was High is now **Low**, the least the game offers. **Medium** and **High** sit
  above it and will carry the new look's extras as they come (outlines, far hills, a painted grain); High already draws
  at up to 2.5 screen pixels per point instead of 2, a little more land (26 tiles round), trees in full shape to 560 m,
  grass to 56 m and a shadow map twice as fine each way (4096). The old Low lives on as **Fallback**, hidden from the
  buttons unless it is in use.
- **Saved settings** move with them: a device that was on old Low goes to Fallback, old Medium to the new Low, old High
  to the new High. A new player starts on Medium.
- **The fallback comes by itself** (perf.js `autoQuality`): when frames stay under about 22 a second for twelve seconds
  of play, the game steps down a level and says so in a note ("The game was running slowly, so the graphics are now
  Low. Menu, Settings to change it."). A single long frame, a scene being built or a hidden page counts for nothing, and
  there is a grace of eight seconds after every change. The benchmark and the tests turn it off (software drawing is
  slow); the browser test checks the step down and its note.
- **Pictures** (`tools/look.py`, `tools/sheet.py`): nineteen views (each biome by day and night, dusk, three towns and
  one at night, a ruin, a storm, a dungeon, a sky castle, the sea and two other worlds) taken in god mode at phone size,
  looking the way the land is most open. The "before" set is in `docs/look/before/` (211 KB).

**Switch.** None (settings). **Numbers.** Unchanged for each preset; Medium measures as Low for now.

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Fallback | 97 | 77 | 106,492 | 111.8 |
| Low | 369 | 117 | 571,366 | 395.9 |
| Medium | 359 | 116 | 571,364 | 391.2 |
| High | 385 | 121 | 647,753 | 468.1 |

**Verdict.** Groundwork.

# Commission 5

## Summary

Twenty entries, newest last in the table (C5.12 to C5.15 are a second pass Andrew asked for: movement, variety of
textures, water; C5.16 to C5.20 a third: townsfolk that walk, sharper textures, and High pushed harder): light first (the brief's "matters most"), then textures, trees, towns and
levels, ruins, people and creatures, sound, fire and water, landmarks and shadows. Every check passes; the rules are
untouched apart from content: a `kit` name on each level's look and a new `content/townlooks.js`, both read only by
the view. No save changes. The page went from 621 KB to 730 KB.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C5.1 | Smooth land, warm sun and cool shade, a deepening sky, blue moonlight; Lambert light everywhere | `light` | pearl |
| C5.2 | Painted ground (grass, sand, rock, snow grains in one texture) and surface textures made in code | `paint` | pearl |
| C5.3 | Trees with shapes per woodland, swaying, near and far by distance; the modelling kit | `plants` | pearl |
| C5.4 | Towns built by climate, trade and custom; levels with walls of their own | `towns` | pearl |
| C5.5 | Ruins built in their people's style, aged and marked by their doom; places kept between builds | `ruins` | pearl |
| C5.6 | People and creatures as jointed models that walk, breathe, look, lunge and flinch | `actors` | pearl |
| C5.7 | A generative score that follows where you are; wind, rain, water, footsteps, creatures, blows | `sound` | pearl |
| C5.8 | Campfires that glow at night, rippling springs, blob shadows | `fx` | pearl, small |
| C5.9 | Landmarks: a beacon tower, a stone ring, rock caves, castles, barrows, temples, wells, doors | `landmarks` | small pearl |
| C5.10 | Real-time sun shadows, High only | `shadows` | maybe |
| C5.11 | Lantern light on dark floors again; the browser test photographs the new look | (fix, tests) | fix |
| C5.12 | (second pass) Nobody teleports: catch-up walking, feet on the ground, idle wandering, rising in, falling when killed, creatures across borders | `actors` | pearl |
| C5.13 | Every house of its own stuff: three variants of each texture, rubble, logs, shingle, adobe, picked per building, weathered | `towns`, `paint` | pearl |
| C5.14 | Real water: levelled, in carved beds, rippling, mirroring the sky, glinting, foaming; ice; dry washes stay dry | `water` | pearl |
| C5.15 | Smoke from every chimney, worked on the graphics card | `towns` | small pearl |
| C5.16 | (third pass) Townsfolk really walk: tracked by identity, moved with the view's frame, forgotten with their world | `actors` | fix |
| C5.17 | Sharper textures: up to 256 px, crisp bevelled blocks, planks, logs, thatch; dirt streets, cobbled plazas; a detail layer on the land | `paint` | pearl |
| C5.18 | High pushed harder: grass and wildflowers underfoot, clouds and the sun's glow, soft wide shadows, finer and further land | `grass`, `clouds` | pearl |
| C5.19 | The finish on High: bloom, colour grading, a vignette | `post` | pearl |
| C5.20 | People of their own: outfits, hair, beards, cloaks, builds | `actors` | pearl |

**The style**, in short: a painted storybook of about 2005. Chunky readable shapes, smooth soft shading on land and
living things, cut facets on stone and roofs, colours a little richer than life, warm sun and cool shade, fog in the
sky's colour, firelight the only bright warm thing at night (in full above).

**Numbers, before and after** (`python3 tools/bench.py low medium high`, software renderer at 412 x 915, seeds 11 / 222
/ 3333; slow in absolute terms, comparable across rows; frame times swing about 8% between runs):

| | build ms | draw calls | triangles | frame ms | page |
| --- | --- | --- | --- | --- | --- |
| before, Low | 54 | 67 | 81,780 | 89.4 | 621 KB |
| after, Low | 73 | 65 | 105,353 | 73.3 | 730 KB |
| before, Medium (default) | 93 | 81 | 151,882 | 144.1 | |
| after, Medium | 105 | 82 | 197,275 | 129.7 | |
| before, High | 176 | 91 | 283,906 | 209.9 | |
| after, High (with shadows) | 226 | 92 | 343,102 | 231.5 | |

Low and Medium are **cheaper a frame than before** and look entirely different: Lambert light (per vertex) costs less
than the standard material did, and pays for the trees, towns and people. High costs about a tenth more, all of it
the shadows (C5.10), which can be switched off. Builds are 10 to 20 ms dearer the first time a place is in view;
places are then reused. Inside places, every kind is cheaper than before (C5.11's table): a floating castle 186 to 58
ms, a dungeon level 70 to 49. The sound costs a handful of oscillators. **After the third pass** High is deliberately heavier (C5.18, C5.19): on this software renderer 312 ms a frame and
577,198 triangles against 210 and 283,906 before the commission; Medium and Low are unchanged by it.
**Andrew: on the Pixel, turn the meter on and
compare High with and without "Real-time shadows", and send the numbers for a floating castle and a town at night.**

**My three best.**
1. **The modelling kit with joints in the shader (C5.3, C5.6)**: one small brick that every model is made of. A forest
   is one draw call, a town seven, a person or a creature one however many limbs it has, and moving the limbs costs
   the processor five numbers a frame. It is why the look got richer while the frame got cheaper.
2. **Towns from culture (C5.4)**: a town's look is data, read from its climate, trade and custom, so a desert town of
   traders under striped awnings and a northern town of pious log houses with a steeple are told apart at a glance,
   and a new culture is a content entry.
3. **Ruins aged block by block (C5.5)**: building a ruin as its people built it and letting age and doom take it apart
   makes all five traits of the lost people readable before you search, which is gameplay the game always had and
   never showed.

**What I would do next.**
1. Measure on the Pixel (above), and if High's shadows are dear there, default them off.
2. Water: done in C5.14. Next would be rivers that visibly flow downstream (their direction is known from the
   levels) and a cheaper water shader on Medium if the open sea stutters on the Pixel.
3. More life in towns: townsfolk wander about their spot but do not yet go anywhere (that wants a little of the
   rules: a destination); carts; washing that moves in the wind (the sway is there to use).
4. The music: a second instrument family per biome and short themes for finding a place, a town's welcome and a win.
5. The sky places (isles, cloud cities) seen from below are still the old shapes; give them the kit too.

**CHANGELOG row for the merge into `main`** (ready to paste, with the version that merge gets):

| v0.16 | Commission 5: how the game looks and sounds. A painted storybook style: smooth land in warm sun and cool shade, a deepening sky and blue moonlight; textures made in code; trees with shapes that sway; towns built by their climate, trade and custom, glowing at night; levels with walls of their own; ruins in their people's style, aged and marked by their doom; landmarks; people and creatures that walk, breathe, look round, lunge and flinch; campfires, springs and shadows; real-time shadows on High; a generative score that follows where you are and the sounds of the world. Every piece has a switch in Menu, Settings; Low and Medium are cheaper a frame than before. |

## The style

**A painted storybook, about 2005.** Chunky, readable shapes with a little exaggeration (round crowns, steep roofs,
leaning towers), smooth soft shading rather than facets on land and living things, but cut facets on stone, roofs and
rock. Colours a little richer than life, never neon; whites stay chalky. Light is warm where the sun falls and cool in
the shade, with an orange sun low in the sky and blue moonlight at night; the sky deepens overhead and glows round the
sun, and fog in the sky's colour gives depth. Textures, where there are any, are soft painted blotches and strokes made
in code, never photographs. Firelight and lanterns are the only bright warm things at night. Every visual piece is
held to this; when in doubt, simpler and rounder.

**Switches for the look** live with the graphics quality (Menu, Settings), as settings of the device rather than of
the run, since a piece of the look never changes the game: `LOOK_SWITCHES` and `lookOn(id)` in `src/view/quality.js`.

**Measuring.** `python3 tools/bench.py low medium high` (seeds 11 / 222 / 3333, software renderer at 412 x 915). This
machine is slower than the one commission 4 measured on, so the "before" row below is re-measured here, at the start:

| before (v0.15) | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Low | 54 | 67 | 81,780 | 89.4 |
| Medium | 93 | 81 | 151,882 | 144.1 |
| High | 176 | 91 | 283,906 | 209.9 |

The page was 621 KB. (Set `CHROME=/opt/pw-browsers/chromium` for the bench and the browser test in a cloud session.)

## C5.20: people of their own

**What it is.** Every person used to be the same figure in another colour. Now each is dressed and built their own
way (`personModel` and `personActor` in actors.js), from their seed:
- **Outfits**: a belted tunic with a buckle; a long robe to the ankles with a rope belt (the elder always); a tunic
  under an apron with sleeves rolled to bare forearms (the innkeeper always); a coat over trousers of a second colour,
  with a collar (the shopkeeper always). Townsfolk and trades are any of them.
- **Hair**: cropped, long to the shoulders, a bun, a braid, or bald with a fringe; a beard on some; a hat for those
  whose trade wears one.
- **A cloak** down the back of some, in a second colour from a list of earthy dyes.
- **Build**: a little taller or shorter, broader or slighter.
- **The figure itself** is better made: thighs and shins, rounded shoulders, upper arms and forearms, hands, a nose.

Still one draw call each, jointed as before (the legs and arms swing as one piece from hip and shoulder).

Also: the plaza's cobbles have softer joints, so they read as stones rather than dark lines.

**Switch.** Part of `actors`.

**Numbers.** A person is about 900 to 1,100 triangles (measured): a street of fifteen is some 15,000, small beside the land. Page 774 KB.

**Verdict.** Pearl: a street of townsfolk reads as people, not as copies.

## C5.19: the finish (High)

**What it is.** On High the scene is drawn into a picture of its own (multisampled, so edges stay as smooth as
before), then finished on the way to the screen (`post.js`), like a painting varnished:
- **bloom**: what is brightest (the sun and its glow, fires, lamps, lit windows, glints on water) bleeds a soft light
  round itself, from a quarter-size copy of the brightest parts blurred across and down;
- **grading**: a touch more colour and contrast, the light warmed and the shadows cooled, the storybook palette;
- **a vignette**: the corners a little darker, to hold the eye.

The three.js of this game (r128) has no ready post-processing in its core, so this is four small hand-written passes
(bright parts, blur, blur, finish), about 60 lines. The meter and the benchmark still report the scene's own draw calls
and triangles (plus the four passes).

**Switch.** `post` ("Bloom and colour grading (High)"); only on High (`Q.post`).

**Numbers.** High 288 ms build, 119 calls, 577,198 triangles, 312.0 ms a frame (300.2 without): 4%.

**Verdict.** Pearl: a lit window at night and a low sun now glow the way the style always meant them to.

## C5.18: High pushed harder

**Asked by Andrew**: High runs without trouble on the Pixel, so loosen the reins and make High very good; players on
lesser devices can choose Medium or Low.

**What it is.**
- **Grass and wildflowers underfoot** (`grass.js`): tufts of seven fine blades, knee-high, and here and there a flower
  (yellow, red, white, violet, orange), scattered from where each patch lies in the world within 45 m of the traveller on
  High (up to 14,000 tufts) and 26 m on Medium (4,000), re-scattered every few metres walked, thinning toward the edge of
  the ring so it fades rather than stops, swaying in the wind. How much grows is the land's: lush in temperate and wet
  lands, thicker in woods and flower meadows (where the flowers are), sparse and straw-coloured in hot lands, almost none
  in the cold; none on water, roads, mountains, high ground or in towns. Two draw calls in all.
- **Clouds** (`sky.js`): soft heaps of white drawn in code, a ring of them high round the traveller (24 on High, 12 on
  Medium) drifting slowly, gold and rose at dawn and dusk, grey under a storm, faint at night; and a glow round the sun.
- **Shadows on High** are soft-edged now (PCF soft), from a map twice as fine each way (2048), reaching 110 m instead
  of 70.
- **The land on High** is finer (a vertex every 3.5 m instead of 4.7: rounder hills, smoother light) and drawn further
  (24 tiles of neighbouring land instead of 22); trees keep their full shape out to 420 m instead of 260.
- Tall grass and fern woodlands are lit as if their blades faced the sky, so they no longer go black edge-on to the sun.

**Switches.** `grass` ("Grass and flowers underfoot"), `clouds` ("Clouds and the sun's glow"); the rest is the High
preset in quality.js.

**Numbers** (software renderer):

| | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Low | 75 | 73 | 106,484 | 68.6 |
| Medium | 97 | 97 | 199,798 | 135.0 |
| High, before (C5.17) | 186 | 103 | 349,705 | 208.1 |
| High, now | 285 | 111 | 571,206 | 300.2 |

High is 45% dearer here, on purpose: most of it is the grass and the finer land, triangles a phone's graphics chip
draws easily but this software renderer does not. Medium and Low are as they were. **Andrew: please run High with the
meter on in a grassy land and in a town.** If it is too much, the levers are in quality.js's `high`: `grassMax` and
`grass` (the grass), `fine` (the land), `treeNear` (full trees).

**Verdict.** Pearl: walking through a meadow of swaying grass with flowers under drifting clouds is the most alive the
land has looked.

## C5.17: sharper textures

**Asked by Andrew**: some town textures, especially, were muddy: big softened brown pixels.

**Why they were.** Every texture was 64 x 64 pixels stretched over three to five metres of wall or street, and built
mostly from soft low-frequency noise: up close each pixel was several centimetres of blur.

**What it is now** (`paint.js`):
- **Size by quality**: 64 pixels on Low, 128 on Medium, 256 on High, covering the same metres, so High is four times
  finer each way. Sharper filtering at a slant too (anisotropic: 4 on Medium, 8 on High).
- **Crisp shapes, not blotches**: blocks of stone, brick, shingle and tile have a bevel (light along the top edge,
  shade below, a dark joint), each its own tone; planks have grain, knots and dark gaps; logs are rounded with dark
  seams; thatch is crowded straws in layers whose lips shade the layer below; plaster is smooth with hairline cracks;
  all over noise at every scale from coarse to the pixel (fBm) and a fine grit, so they read at any distance.
- **Streets**: packed dirt with grit and a scatter of pebbles; the plaza is **cobbles** (rounded stones set close).
- **The land's grain** is 256 pixels on High, and close up a second, finer pass of it is laid over (a detail texture),
  so the ground at your feet stays crisp.
- **Made ahead**: rubble and cobbles first took 170 to 200 ms each at High's size; finding the nearest stone on a
  jittered grid brought every texture under 45 ms, and they are now made one at a time in idle moments after a world
  starts, so the first town seen does not wait for them.

**Numbers.** Low 67 ms build, 73 calls, 106,484 triangles, 68.5 ms a frame; Medium 105 / 94 / 199,376 / 132.7; High 186
/ 103 / 349,705 / 208.1: no measurable cost a frame. Textures in memory on High: at most 39 of 256 x 256 (about 10 MB
with their mipmaps). Page 757 KB.

**Verdict.** Pearl.

## C5.16: townsfolk really walk (fix)

**Asked by Andrew**: the townsfolk disappeared and reappeared in another place every so often.

**What was wrong.** Two faults of mine, the first since C5.6. (1) The people of a town were never tracked at all: their
figure sits one level deeper in the scene than the lookup searched, so every townsperson, and the elder, innkeeper and
shopkeeper too, was redrawn from scratch at each step: a tile's jump each time the rules moved them. C5.12's walking
only ever reached creatures. (2) Townsfolk had no lasting identity in the tracking, only "the nearest remembered
spot", and stale memories of others' old spots could be matched, while one left unmatched vanished.

**The fix.** The figure is found wherever it is in its place's group; each townsperson is known by the record the rules keep
for them as they move (not by name: two may share one), so they walk from where they were to where they now are, at a walk,
and wander about their spot between steps; nobody vanishes unless they really leave.

**Tested.** The browser test now walks the traveller up and down a town street twelve steps and checks that no
townsperson moves more than 1.5 m between frames and none disappears (measured: at most 0.57 m a frame, 9 people
throughout). The fault had slipped through because nothing measured it; now something does.

Two more found while testing it across eight worlds: when the scene's frame moved between the land and a town by any
way but walking through the gate (an action, a jump, a load), what was remembered of everyone was not moved with it,
so they lurched (sideways, and up or down by the town's height); the shift now lives in the one function that moves the frame (`applyFrame`). And memories outlived
their world: a new world's elder "walked" in from where the last world's elder had stood; entering a world now
forgets them (`forgetActors`).

Also fixed: building the water (C5.14) ran in one slice of the land's spread-out build, so crossing a border could
take a 50 ms hitch on this machine (the browser test caught it); it now pauses every sixteen rows like the rest.

**Verdict.** Fix.

## C5.15: smoke from the chimneys

**What it is.** Every chimney in a town smokes: a few soft puffs over it that rise, swell, drift downwind with a little
wander and fade, over and over. All of it is worked out on the graphics card from the shared clock (a few lines in the
points shader), so a whole town's smoke is one draw call and costs the processor nothing; on Low there is none. The
smiths' and charcoal-burners' smoke is darker (their `smoke` colour in townlooks.js). The tall hearth columns over the
hall and the inn stay, to find a town by from far off.

Also: the streets' packed earth uses the smoothest plaster variant, without the dark crack marks that read as smudges.

**Switch.** Part of `towns`.

**Numbers.** One draw call and a few dozen points a town. Page 751 KB.

**Verdict.** Small pearl: a town looks lived in from outside its walls.

## C5.14: real water

**Asked by Andrew**: realistic water, not blue land.

**What it is.** Rivers, lakes and the sea are now water lying in a bed (`terrain.js`, `water.js`):

- **Levels and beds.** Every river, lake and sea tile gets a water level: the ground's height at its middle, evened
  out with the water round it (many times over for deep water, so lakes and seas lie flat; never raised, so water
  settles rather than climbs), then spread a little under the banks. The ground beneath is carved: about a metre under
  a river, a few under the sea, sloping up to the banks, and painted as dark mud. Walking into a river you wade (the
  eye stays above the surface); on deep water, by boat or swimming, you are at its surface.
- **The surface** is a mesh of its own over the same grid as the ground, only where there is water, and its shader
  does the rest per pixel: crossing waves stir the normal so the light breaks on it; at a low angle it mirrors the
  sky's colour (the fog's, so it matches the horizon), looking down you see into it; the sun leaves a glint; light
  dapples it; it fades clear at the banks with a soft moving line of foam; shallow water is clear and tinted with each
  land's own water colour, deep water darker and nearly opaque; deep water swells in long slow waves.
- **Ice and dry beds.** A frozen river is pale, still and opaque; a dry wash stays dry ground, as its name says.
- **Springs** and the open sea round a floating town use the same water.

**Efficiency.** On Low the water is a plain see-through surface lit per vertex (no ripples, Fresnel or glints); the far
water is always plain (ripples cannot be seen there). Building it is a few smoothing passes over the tile grid and one
mesh over the grid cells that touch water.

**Switch.** `water` ("Real water"); off, the land goes back to blue ground.

**Numbers** (Medium; this machine swings about 10% between runs): on land 149 ms build, 93 calls, 205,399 triangles,
140.7 ms a frame (water out of sight costs nothing a frame; building it adds about 15 ms). The open sea, where water
fills the screen: 51 calls, 199,901 triangles, about 160 ms a frame against about 127 before, the dearest view in the
game now. **Andrew: look at a lake or the sea on Medium and High with the meter on**; if it stutters, the plain water
could be used on Medium too (one line in water.js, `rich`).

**Verdict.** Pearl: rivers run in their valleys and catch the sky.

## C5.13: every house of its own stuff

**Asked by Andrew**: variety in textures; not every building in a town sharing one.

**What it is.** Every painted surface now comes in three variants (other sizes of block, brick, plank, tile or shingle,
another seed), and there are four new ones: **rubble** (rough stones of every size in mortar), **logs** (rounded logs
laid one on another), **shingle** (short boards in staggered rows) and **adobe** (smoothed mud over big bricks, flecked
with straw). Each climate in `content/townlooks.js` now lists the walls and roofs a house may be built of
(`wallMix`, `roofMix`, also in the Almanac), and every building picks one of each, in one of the variants, along with
its own colour:

| Climate | Walls | Roofs |
| --- | --- | --- |
| hot | plaster, adobe, brick | flat plaster or adobe |
| temperate | plaster (timber-framed), brick, stone | thatch, tiles |
| wet | dressed stone, rubble | thatch, shingle |
| cold | logs, planks | shingle, tiles |
| ashen | stone, rubble, brick | tiles, shingle |
| steppe | felt | felt |

Walls are grimier toward the foot, by a different amount on each house. A walled town's mud wall is adobe. Each ruin's
stone is a variant of its people's, so two ruins of one people are kin but not twins.

**How, cheaply.** A town keeps one kit per texture and variant it uses (`switchKit` in buildings.js routes a house's
parts to its choice), so a town is a few more draw calls (about 8 more with two towns in view), and no more textures
are made than are used: each is 64 x 64, made the first time it is asked for.

**Numbers.** Medium 110 ms build, 91 calls (83 before), 203,151 triangles, 130.8 ms a frame. Page 739 KB.

**Verdict.** Pearl: a street of log houses and plank houses under shingles and tiles reads as built over time by
different hands.

## C5.12: nobody teleports

**Asked by Andrew** after the first pass: natural movement for townsfolk and monsters, never a jump.

**What it is.** The tracking of people and creatures (`actors.js`, C5.6) now covers every way someone could pop:

- **Far moves.** Someone moved several tiles by the rules (while you rested, say) used to snap if more than 120 m
  away. Now they always walk from where they were drawn, faster the further they have to go (there in about three
  seconds), leaning into the hurry, their stride quickening.
- **The ground.** Outdoors their feet follow the ground on the way, over hills rather than through them.
- **Between your actions** everyone used to stand frozen until you did something. Now creatures amble about their
  spot (up to 7 m outdoors, under a metre indoors) and townsfolk shuffle about theirs, pausing a few seconds, turning to
  watch you when you come near. This is the view only: the rules' positions do not change.
- **Comings and goings.** Someone new rises into view instead of appearing; a creature that leaves sinks away; a
  creature you kill topples over and sinks (the rules' 'killed' event).
- **Borders and gates.** Creatures in the eight regions round about are drawn now too, within 360 m of you, so they
  are there before you cross; and when the scene's frame moves (a border crossed, a town gate passed), what is
  remembered of everyone moves with it, so they walk on across it instead of jumping.

**Switch.** Part of `actors`.

**Numbers.** Medium 126 ms build, 83 calls, 203,217 triangles, 137.9 ms a frame (this machine's runs swing about 8%;
the same page measured 130 to 146 today). A few more creatures in view; nothing else.

**Verdict.** Pearl: the land is never still and nobody blinks from place to place.

## C5.11: the new look in the browser test's pictures, and a fix for dark floors

**What it is.** `python3 tests/smoke.py --shots` now also photographs the new look close up (`build/shots/`): a ruin
(12), a creature (13) and your camp at night (14), beside its old pictures of the town, the levels and the places in
the sky and water. Those pictures caught a bug of my own: in dark levels the floor was black. Light worked out per
vertex (Lambert, from C5.1) only lights a level's floor at its corners, and the floor was one big square, so the
traveller's lantern never reached it. Floors and ceilings of levels now have a vertex every two metres, and the
lantern's pool shows again. (Lighting levels per pixel instead fixed it too, but doubled their frame time.)

Two flaky steps of the browser test (older than this commission, but met more often on this slower machine) are
steadier: the fight is skipped if the random world has no hostile creature in reach, and the test waits for the eye
to settle in the town's gateway before measuring it.

**Numbers, inside places on Medium** (`bench.py places`, v0.15 in brackets): dungeon level 8 calls, 35,356 triangles,
48.7 ms (70.2); sky castle 8 / 18,437 / 57.7 (185.6); open sea 49 / 186,181 / 126.8 (144.9); under the sea 2 / 14,256 /
26.4 (43.3); another world 31 / 176,794 / 101.1 (104.5).

**Verdict.** Fix.

## C5.10: real-time shadows, on High only

**What it is.** On High the sun casts real shadows (three's shadow map, 1024 square, in a 140 m box that follows the
player): houses, ruins, landmarks and the near trees throw them onto the near ground and onto each other. Everything
else keeps its baked shading and blob shadows. The sun's light now shines from the same direction wherever the player
is (it moves with them), which is what lets its shadow box follow.

**Cost, and the choices that cut it.** The first try (everything casting, soft filtering, all the ground receiving)
cost High 65% a frame (187 to 309 ms). Now only places and near trees cast (not the land's far trees and rocks), only
the fine ground receives, and the filtering is the plain one: High costs 19% more (187 to 219 ms), a little more than
High cost before this commission (210). Low and Medium are untouched: no shadow map at all.

**Switch.** `shadows` ("Real-time shadows (High only)").

**Numbers.** Low 73 ms build, 65 calls, 105,353 triangles, 66.5 ms a frame; Medium 107 / 82 / 197,275 / 123.9; High 198
/ 92 / 343,102 / 219.4. Page 730 KB.

**Verdict.** Maybe: it works and is honest about the sun, but on the software renderer it is the dearest thing in the
commission for a modest gain. **Andrew: try High on the Pixel with the meter on, with and without this switch.** If it
costs much there, turn its default off (one line in quality.js).

## C5.9: landmarks in the style

**What it is.** The places you steer by are rebuilt with the kit (`src/view/landmarks.js`), so they belong to the same
painted world as the towns and ruins:

- **The beacon** is a great tower of stone courses tapering upward, battlements round a brazier at the top, its fire
  (the same flickering fire as a camp, three times the size) and glowing orb under the beam, and a door at its foot.
- **The god's shrine** is a ring of five standing stones joined by lintels round an altar, the god's light hanging
  over it in its own colour with a soft halo.
- **Caves** are heaps of faceted rock round a dark arched mouth with a lintel stone (dens keep their bones).
- **The locked place**: a castle is curtain walls with battlements, four round towers with conical roofs and a keep;
  a barrow is a turf mound ringed by standing stones with a stone doorway; a temple is a stepped pyramid with a stair
  up its face and a pillared house on top.
- **Wells** (in towns, hamlets and at home) have a ring of stones, two posts, a windlass, a little roof and a bucket.
- **Doors to other worlds** stand between two pillars of courses under a capped lintel.

**Switch.** `landmarks` ("Landmarks in the style").

**Numbers.** Unchanged within the noise (a landmark is two or three draw calls). Page 729 KB.

**Verdict.** Small pearl: the goal on the skyline is now a tower worth walking toward.

## C5.8: fire, water and shadows

**What it is.** The small living things of the look (`src/view/fx.js`):

- **Fire**: your camp has a cloth tent with a fire before it, and every wayfarer sits by one: a ring of stones,
  crossed logs, three flames that flicker, and a warm halo that grows at night and pulses with the flames. The plots'
  camps burn the same way. With the towns' lamps and windows, it is the warm light at night the brief asked for, done
  with glowing shapes and halos rather than real lights, which would cost every vertex on screen.
- **Water**: springs are pools with a muddy rim and ripples that drift slowly across them; foul ones, once known, are
  murky green. The reeds round them are the grass tufts of C5.3.
- **Shadows**: everyone stands in a soft round shadow, sized to their form, so people and creatures sit on the ground
  rather than float over it. A blob shadow is one small quad each: real shadows are left for later (see the summary).

**Switch.** `fx` ("Fire, water and shadows"). With reduced motion asked for, the flames and ripples hold still.

**Numbers.** Graphics unchanged away from camps (a fire is four or five draw calls). Page 720 KB.

**Verdict.** Pearl, small: a camp at night is now the warmest thing in the land, which is what a camp should be.

## C5.7: sound and a generative score

**What it is.** The game has sound (`src/view/sound.js`), all made in the browser with the Web Audio API: no files.

- **The score** is generative: a slow random walk over a mode, mostly by step with the odd leap and many rests, over
  a drone and a soft pad that moves through a few chords a phrase. It never repeats and is original by construction.
  Where you are sets its mood (`MOODS`): open land by day is a bell over a pentatonic; night a sparser, lower aeolian;
  a town a brighter major with a plucked string and a gentle pulse; below ground a deep phrygian drone with rare bells;
  the sky a high lydian; the sea a swelling mixolydian; a storm a dark drone; a fight a quick phrygian pluck over drums.
  Each land has its own key, so crossing into another shifts the music a little. Moods crossfade over a few seconds.
  Everything sits in a small hall of reverb made from decaying noise.
- **The world**: wind that gusts, stronger high up and in storms and almost gone below ground; rain on the land in a
  wet storm (softer inside a town); running water near a river, spring or well; the murmur of a town with a hammer or a
  snatch of a tune now and then; a fire crackling at your camp; footsteps a stride apart that sound like the ground
  (grass, sand, snow, stone, wooden decks, splashing water); creatures' voices when near (a hound's howl, a brute's
  grunt, a wight's moan, a serpent's hiss), and a cry when a fight starts; the swish of a blow, a thud when it lands, a
  grunt when you are hurt, three bells for a kill; a soft click on every button.

**For the phone.** Sound starts only after the first tap or key, as phones require, and stops while the page is
hidden. Menu, Settings has Music and Sounds volumes and a Mute; they are settings of the device. The score schedules a
bar at a time and the world is looked at ten times a second, so at any moment there are a handful of oscillators and
four looping filtered noises: a small fraction of a phone's processor.

**Switch.** `sound` ("Sound and music"); also Mute. The browser test checks that sound starts after the first tap.

**Choices.** No tunes from anywhere: the music is only modes, a random walk and phrase lengths. The footsteps read the
ground from the climate (snow in the cold, sand in hot, ashen and steppe lands) and the tile (water, mountain stone);
inside a level from its kit (wooden decks, stone).

**Numbers.** Graphics unchanged. Page 713 KB.

**Verdict.** Pearl: the land is no longer silent, and a town is heard before it is seen.

## C5.6: people and creatures that move

**What it is.** Everyone you meet is a jointed model now (`src/view/actors.js`), and moves:

- **People** (the elder, the innkeeper, the shopkeeper, the trades of town life, traders, townsfolk) are about 1.8 m
  tall: legs and boots, a tunic flaring to the knee with a belt, arms with hands, a neck, a head with eyes, and a hat
  in their trade's colour or hair. Skin and hair vary person to person; townsfolk wear one of eight colours.
- **Creatures**: the hound is a rounded body on four legs with a muzzle, pricked ears and a tail; the brute a hulking
  biped with a hump of shoulders, long arms with heavy fists and bared teeth; the wight a hooded robe tapering to
  nothing, long thin arms, faintly see-through, floating and bobbing; the serpent eight segments that ripple as it goes,
  its head raised. Their eyes still carry their temper's colour and still glow in the dark and through fog.
- **Walking**: when the rules move someone between two builds of the scene (a creature hunting you, townsfolk
  wandering), they walk from where they were drawn to where they now are, turned the way they go, legs swinging in a
  diagonal gait for four-legged things and the body bobbing in the stride. Townsfolk, who have no lasting id, take the
  nearest place one of them was last seen.
- **Idle**: a slow breath, a glance about now and then, and the head turning to watch the traveller when near.
- **Fighting**: the creature you fight crouches with its arms half raised, lunges at you every couple of seconds, and
  flinches back when your blow lands (its health dropped since the last build).

**How.** Each model is merged with the kit, every part tagged with the joint it hangs from and where that joint is.
A few lines added to the vertex shader turn legs and arms about the hip and shoulder, the head and tail about the
neck, and ripple a serpent, from five numbers per actor. So an actor is one draw call however many limbs it has
(the old models were six or seven), and moving them costs the processor only those five numbers a frame. With reduced
motion asked for by the device, nothing swings or walks.

**Switch.** `actors` ("People and creatures that move").

**Numbers.** Low 57 ms build, 58 calls, 104,805 triangles, 66.9 ms a frame; Medium 97 / 75 / 196,617 / 125.5; High 168
/ 83 / 342,018 / 188.1. No change away from people; in a town fewer draw calls than before (one per person instead of
two or three). Page 696 KB.

**Verdict.** Pearl: a hound trotting toward you over the dunes reads as a threat in a way a sliding box never did.

## C5.5: ruins with character, and places kept between builds

**What it is.** A ruin is now built the way its people built and then aged and marked by how they ended
(`src/view/ruins.js`), so all five traits of the lost people can be read from a distance:

- **Style** is what they built with: river-valley builders lay big mud bricks and add a stepped stair; steppe riders
  pile rough boulders low; highland monastics taper pale walls and string prayer flags over them; sea traders raise
  columns of stone drums under lintels (fallen drums lie beside the short ones); forest clans set dark stone with timber
  beams, and moss comes thick.
- **Habit** is the plan: a walled cistern of dark still water with steps down; a round tower; a low tomb with a slab
  roof and pillars at the door; a long granary (with its roof when recent, bare beams when not); a road's gateway with
  paving running through.
- **Age** is how much stands: recent ruins keep their full height and roofs; long-fallen ones stand to the eaves with
  ragged tops; ancient ones are stumps a course or two high. Walls are laid as courses of blocks, so age takes blocks
  away (what stood on a lost block mostly comes down with it) and the fallen ones lie about the foot. Moss grows with
  age, heaviest near the ground.
- **Doom**: plague leaves pale poles with rags round the ruin (and paler stone); fire blackens it, soot heaviest at
  the top; famine leaves clay jars at the doors, some tipped over; war a ring of sharpened stakes leaning outward; a
  quiet end leaves the door standing open. These follow the signs the game's text already gives for each doom.
- **Affinity**: their sign is carved on a stele by the door, in their colour.

**Places kept between builds.** Towns, ruins and hamlets are now made once and reused (`cachedModel` in scene.js):
after crossing a border most of the same places are still in view, so the new land's build reuses them (places part
of the build: 70 to 95 ms the first time, 4 to 6 ms after). The key holds the world's seed, the site, the quality and
the look's switches, so nothing stale is shown; the oldest of 48 models are let go.

**Kit.** Parts used again and again (a block, a drum) are prepared once (`PREP` in kit.js).

**Switch.** `ruins` ("Ruins with character").

**Numbers.** Low 58 ms build, 59 calls, 104,747 triangles, 63.2 ms a frame; Medium 93 / 77 / 196,559 / 122.3; High 179
/ 85 / 341,960 / 186.9. Draw calls are down about ten (the old ruins were a dozen separate meshes each; a new one is
four). Page 682 KB.

**Verdict.** Pearl: a burnt tower of mud brick and a mossy ring of boulders with stakes round it tell two different
stories before you search them.

## C5.4: towns with culture, and levels with their own walls

**What it is.** Every block of wall in a town's grid is now a building (`src/view/buildings.js`), built of what its
land's climate offers and dressed by its people, from data in the new `src/content/townlooks.js` (for the view only;
the rules never read it; an Almanac section lists it):

- **Climate** decides what a town is built of: hot lands have ochre plaster houses with flat roofs, parapets and cloth
  shades and banked mud walls; temperate lands timber-framed plaster under thatch with shutters and a log palisade;
  wet lands grey stone under steep thatch; cold lands log houses with steep shingle roofs carrying snow; ashen lands
  dark stone under low hipped roofs; the steppe round felt tents with domed tops, a coloured band and a smoke ring.
- **Trade** puts things in the streets: anvils with glowing forges and woodpiles for smiths, planters for herbalists,
  clothes lines of dyed cloth for weavers, charcoal kilns for burners, striped market stalls, crates and carts for
  traders; and how many houses have chimneys, and the shop's awning.
- **Custom** colours it: banners (the god's own colour for the pious), how many street lamps, window boxes of flowers
  for the hospitable, fenced yards and a watchtower on the hall for the suspicious, a steeple with a gilded ball for
  the pious, standing stones round the plaza for keepers of lore.
- **Rare** towns: the people who never fell build in the lost people's own stone under their sign; pilgrims' towns
  are whitewashed, with prayer flags across the streets.
- The **elder's hall** has two storeys and banners by its door, the **inn** a hanging sign and two lanterns, the
  **shop** an awning; doors face the plaza. A walled town's wall follows its climate (battlemented stone, a log
  palisade or mud), with a tower by every gate. The streets are packed earth and the plaza is paved.
- **At night** every window glows warm and every lamp, forge and kiln has a soft halo (one shared material whose
  brightness follows the hour, and a single point sprite per town for the halos).

Each town is merged into seven meshes (ground, walls, roofs, woodwork, stone, cloth, lights) plus its halos: about
eight draw calls a town, a few thousand triangles. Hamlets use the same kit in their region's style.

**Levels.** Each level's look in content now names a `kit` (`src/view/levels.js`): dressed stone (crypts, drowned
shrines), battlements (floating castles, old holds), brick (cisterns), rough faceted rock (isles, the moon, sea caves,
fungus caverns, warrens), propped rock (mines), white walls under gilded domes (cloud cities), boarded walls on posts
(floating towns, wrecks), and rounded coral pillars capped with shell (merfolk halls). Each is still one instanced
draw call for all the walls; floors and ceilings take the kit's surface.

**Choices.** Town looks are content rather than code so they can be tinkered with like any menu. A town reads its
climate from its region's biome (`parts.climate` for generated biomes, `biomeClimate` for the hand-made ones). On Low
(`Q.lite`) towns leave out shutters, flowers and street props.

**Switch.** `towns` ("Towns built in their own style"), which also covers the level kits.

**Numbers** (land, away from a town: unchanged in frame time): Low 72 ms build, 68 calls, 102,779 triangles, 63.0 ms a
frame; Medium 124 / 87 / 199,441 / 122.6; High 228 / 96 / 344,460 / 189.5. In sight of a town add about 8 draw calls
and 3 to 8 thousand triangles. Builds are 10 to 30 ms dearer for the towns in view. Inside places on Medium
(`bench.py places`), before (v0.15) and after:

| place | calls before / after | triangles before / after | frame ms before / after |
| --- | --- | --- | --- |
| dungeon level | 18 / 18 | 3,312 / 13,712 | 70.2 / 36.7 |
| sky castle | 11 / 11 | 16,581 / 18,261 | 185.6 / 51.1 |
| open sea | 50 / 51 | 142,265 / 183,383 | 144.9 / 116.3 |
| under the sea | 2 / 2 | 3,890 / 3,890 | 43.3 / 19.8 |
| other world | 24 / 29 | 139,352 / 176,130 | 104.5 / 102.2 |

Lambert light more than pays for the extra shape. Page 670 KB.

**Verdict.** Pearl: a desert town, a northern log town and a steppe camp no longer look like the same kit of boxes.

## C5.3: trees with shapes, near and far

**What it is.** Every kind of woodland has a shape of its own (`src/view/plants.js`): pines are three tiers of cone on
a short trunk; birches pale trunks under four soft clumps; thorn scrub a low faceted bush with twigs; dead wood a
bare trunk with crooked branches; fern brakes a ring of arching fronds; tall grass a tuft of blades; anything else a
round-crowned broadleaf. Crowns are darker underneath, each tree is a shade lighter or darker than its neighbours and
leans a little, and the tops sway in the wind, harder in a storm (a few lines added to the vertex shader, one shared
clock). The reeds round a spring are tufts of the same grass.

Models are built with a new **kit** (`src/view/kit.js`): a model is put together from simple parts (box, cone, ball,
blob), each with its own colour and place, merged into one geometry with the colours in its vertices, so one model
is one draw call and a forest of them, instanced, is one too. Buildings, people and creatures will use the same kit.

The shape comes from a woodland's name (`tree.shape` in content wins if given), so the generated biomes, which reuse
the named woodlands, needed nothing new.

**Near and far.** Full shapes everywhere tripled the triangles (Medium 152k to 400k, frame 119 to 173 ms). So each
shape has a far version (a single cone or blob, close to the old cost), and only trees within `Q.treeNear` metres of
the player (140 on Medium, 260 on High, none on Low) take the full one. The trees that could come that near are kept
in a list and re-sorted into a near and a far instanced mesh every 25 m walked (under a millisecond); the rest of the
land's trees are one static far mesh.

**Switch.** `plants` ("Trees with shapes").

**Numbers.** Low 89 ms build (noise: 64 to 89 between runs), 67 calls, 101,360 triangles, 65.3 ms a frame; Medium 94 /
85 / 194,167 / 127.7; High 196 / 96 / 342,154 / 193.8. Against C5.1, Medium costs 7% more a frame, still well under
the 144 ms it cost before this commission. Page 631 KB.

**Verdict.** Pearl: the land stops looking like a field of traffic cones, and the near/far trick keeps it cheap.

## C5.2: painted ground, and textures made in code

**What it is.** `src/view/paint.js` makes every texture when the page starts, from seeded noise and brush strokes: no
image files. The ground has one 128 x 128 texture whose four channels are four kinds of grain: grass (short upright
blades over a mottle), grains for sand, salt, mud and ash (speckle and wind ripples), rock (broad facets and cracks)
and snow or still water (soft drifts and glitter). Each point of the land carries four weights, read from its colour
and slope (`surfaceOf`), and the ground's shader mixes the four by them: every kind of ground gets its own grain for
one texture fetch. The grain fades with distance, where it would only shimmer. The same file makes 64 x 64 grey
textures for built and worn things (stone in courses, brick, planks, thatch, roof tiles, cloth, plaster), multiplied
into a surface's own colour, so a culture keeps its colours; they are used from C5.4 on.

Reading the kind of ground from its colour rather than from the biome means generated biomes and rare strange-hued
lands get the right grain with no content change.

**Switch.** `paint` ("Painted textures"); on Low there is no grain at all, as before (`Q.grain`).

**Numbers.** Low 64 ms build, 67 calls, 81,780 triangles, 61.6 ms a frame; Medium 92 / 81 / 152,038 / 119.1; High
203 / 91 / 284,062 / 180.5. No measurable cost against C5.1. Page 618 KB.

**Verdict.** Pearl: near ground now reads as grass, sand or snow at a glance, for nothing.

## C5.1: light, and land without triangles

**What it is.** The land is smooth: each point of the ground has a normal from the slope around it, so light rolls over
hills instead of picking out triangles. All surfaces use Lambert materials (light worked out per vertex), the cheapest
light three.js has, in place of the standard material with flat shading. A new `light.js` sets the sun, sky light and
moon: the hemisphere light is sky blue from above and warm brown from below; the sun is orange when low and nearly
white when high; at night the same light becomes a pale blue moon opposite the sun. The sky dome now deepens to blue
overhead and glows round the sun (orange at dawn and dusk), its few vertices recoloured each frame. Painted shading is
baked into the ground's colours as it is built: hollows a touch darker, crests lighter, steep slopes toward bare earth;
and the land's colours are made a little richer (pale snow and salt left pale). Roofs, towers and rocks with few sides
keep cut faces (`facet()` in scene.js gives them per-face normals).

**In play.** The shape of the land reads at a glance: which way a slope faces, where the hollows are. Dawn and dusk
are warm, night is blue rather than black.

**Switch.** `light` (Menu, Settings: "Warm sun and cool shade"), which brings back the old light and flat ground.

**Numbers** (after; before is at the top):

| after C5.1 | build ms | draw calls | triangles | frame ms |
| --- | --- | --- | --- | --- |
| Low | 60 | 67 | 81,780 | 67.0 |
| Medium | 85 | 81 | 152,038 | 119.8 |
| High | 196 | 91 | 284,062 | 180.6 |

Frames are cheaper on every setting (Lambert is cheaper than the standard material); builds are a few ms dearer for
the normals and baked shading, within the noise. Page 613 KB.

**Verdict.** Pearl: the biggest visible gain for the least cost, and it pays for itself in frame time.

# Commission 4

## Summary

Nine entries, in the order the brief asked: the testing tools first, then dungeons, the sky, the sea, other worlds,
and the plot using them all; then fixtures, the door's model and the benchmark of the new places. Every check passes,
old saves load (no `VERSION` bump: every new field is optional; saves from v0.14 and from inside each new place are
now fixtures), and the bot wins as often as before.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C4.1 | God mode (unseen, unhurt, through walls, any door, flying, breathing water) with a jump list and a tap on the map; world settings folded under "New world" | (tools) | pearl, for testing |
| C4.2 | Dungeons: six themes, 1 to 4 levels, deeper is harder and richer, a Heart and a prize, an artifact in the deepest; the locked place and the odd levels fit in; far maps packed in memory | `deeps` | pearl |
| C4.3 | The sky: ways to fly and what flying costs; drifting isles, floating castles, cloud cities, a low moon over their shadows | `sky` | pearl |
| C4.4 | The sea: whole sea regions with islands, lakes, deep water, coracles and gills; floating towns, wrecks, merfolk halls, sea caves, drowned shrines | `sea` | pearl |
| C4.5 | Other worlds: rare doors to worlds of their own seed, stranger, made only where touched | `realms` | pearl, rare |
| C4.6 | The plot goes below, above, under and beyond; four new troubles; routes to anywhere; every door used; the bot follows routes | `plots` | pearl |
| C4.7 | Fixtures from v0.14 and from inside the new places; the door drawn; how to play; `bench.py places` | (tests, view) | small |
| C4.8 | Kin: the windborn fly by nature, the merrow breathe water; offered only where the sky or the sea is | `kin` | maybe-to-pearl |
| C4.9 | Other worlds have dungeons of their own; the plot's places inside levels are drawn | `realms`, (view) | small |
| C4.10 | Fix: a floating town's trader froze the screen (Andrew) | | fix |
| C4.11 | No more black screens (errors shown, the game runs on, a rescue); an explorer fuzz through every kind of place | (view, tests) | pearl |
| C4.12 | Wayfarers: water-carriers, mapmakers, pilgrims, trappers and the lost, at fires in the wilds | `wayfarers` | pearl |
| C4.13 | Old worlds deepen: a world made before gains its dungeons and sky places once | `deepen` | small, for Andrew's game |
| C4.14 | A gold ring on the map where the goal leads next | (view) | pearl, on a phone |

**The limits** (node, `--expose-gc`; god mode walking every place):
- **How deep a dungeon can go**: as deep as you like, as far as the rules go. Each walked level adds about **2.1 KB to
  the save** and **34 KB to the heap** (far levels packed) and takes 0.4 to 2 ms to build. A 200-level dungeon walked
  to the bottom: 483 KB save, 7 MB heap, 44 ms to load; 500 levels: 1.1 MB, 17 MB, 128 ms. Browser storage (about
  5 MB) bites first: **about 1000 walked levels in a world** before a save is at risk. Ordinary dungeons are 1 to 4
  levels and the plot's 2 to 4, for play, not memory; the depth setting goes to 16.
- **How many places a world can hold**: the largest world the settings allow (7 x 7, four times the dungeons, 16
  deep, sky, sea, doors, five more towns) held **323 places in 321 areas** (49 regions, 8 towns, 241 dungeon levels,
  sky, water and another world). A fresh one saves in **128 KB** and takes 109 ms to make; with **every place walked
  it saves in 662 KB**, holds **8.5 MB of heap** and loads in 70 ms. An ordinary 7 x 7 world fully walked: 108 areas,
  266 KB, 5.9 MB. Unwalked places cost a few numbers each: a level is built only when reached, another world only
  where touched.
- **How big a save gets**: a fresh ordinary world 64 KB (59 before this commission: the stairs, shadows and doors);
  a fully walked ordinary 7 x 7 world 266 KB; the largest possible world fully walked 662 KB. All well inside 5 MB.
- **Memory**: packing far maps cuts the heap by about two fifths (a 7 x 7 world with every dungeon walked: 6.5 MB
  packed, 9.4 MB if everything were kept as lists; four times the dungeons: 11.3 MB against 19.7). A door to another
  world costs 15 KB of save fresh and nothing more until walked.

**Performance, before and after** (`tools/bench.py`, software renderer at 412 x 915, seeds 11 / 222 / 3333; slow in
absolute terms, comparable across rows):

| | build ms | draw calls | triangles | frame ms | save, fresh world |
| --- | --- | --- | --- | --- | --- |
| before, Low | 39 | 70 | 80,974 | 61.1 | 59 KB |
| after, Low | 50 | 67 | 81,806 | 60.7 | 64 KB |
| before, Medium (default) | 61 | 83 | 150,419 | 101.4 | 59 KB |
| after, Medium | 71 | 80 | 151,161 | 100.0 | 64 KB |
| before, High | 118 | 89 | 282,865 | 151.5 | 59 KB |
| after, High | 118 | 90 | 283,930 | 141.6 | 64 KB |

Outdoors nothing measurable changed (a shadow's floating place is one or two draw calls, in the regions that have
one). The builds are a few ms slower, within the noise of the software renderer. **Inside the new places, on Medium**
(`python3 tools/bench.py places`): a dungeon level 18 draw calls / 3k triangles / 30 ms a frame; a floating castle 11
/ 17k / 85 ms (the whole sky is drawn behind it); the open sea 50 / 142k / 106 ms (as land); under the sea 2 / 4k /
22 ms; another world 24 / 139k / 72 ms. None costs more than ordinary land. **Andrew: with the meter on, visit a
floating castle in god mode on the Pixel and send the numbers**: it is the one place whose cost is fill rate (a lot
of open sky), which the software renderer cannot judge.

**Bot win rate** (`node tests/playtest.js 150`, every piece on, default settings), sets 5 / 1000 / 2000: **32, 28, 21
(81 / 450, 18%)** at the end (30, 29, 23 before the kin), against 86 / 450 (19%) at the start. The floor is 8%. With a new trouble forced (40 worlds each):
the tyrant 2, the king under the hill 2, the drowned cure 1, lost beyond the door 2: the bot can do them all, but
they are long, hard journeys, so they are rare as great troubles.

**My three best.**
1. **Routes (C4.6)**: one function that knows the way from anywhere to anything, through stairs, shadows, sea caves
   and doors. The goal line, the bot and the tests all use it, and every new kind of place only has to say how it is
   entered. It is what makes the new places part of the game rather than side rooms.
2. **Levels built when reached, and far maps packed (C4.2)**: the reason a world can hold hundreds of places and stay
   under 10 MB, and why a 500-level dungeon is possible at all.
3. **Other worlds by swapping the world (C4.5)**: a whole second world for one small module, because every region rule
   already read `s.world` and `s.seed`; it cost no rewrite of the land, the view or the map.

**What I would do next.**
1. Measure a floating castle and the open sea on the Pixel (above), and if the sky is costly, draw less of it.
2. Give other worlds sky places and a stranger year (two moons, long nights) of their own (dungeons: done in C4.9).
3. Done in C4.8: a flying race and a merfolk race.
4. Teach the bot to cross deep water by boat and to trade for a coracle, so the playtest measures the sea; and to
   prepare better for long journeys (it dies of thirst on the way to most of the new troubles).
5. Models for the plot's sites inside levels (a throne, a cage), and textures for dungeon walls.
6. When merging to main as v0.15, a CHANGELOG row (I left CHANGELOG.md alone, as the earlier commissions did): "The
   fourth commission. God mode and world settings; dungeons below the world in six kinds; ways to fly and places in
   the sky; seas, lakes, boats and places under the water; rare doors to other worlds; troubles that go below, above,
   under and beyond, with a goal line that finds the way. See `JOURNAL.md`."

**Parallel sessions.** I did not use them: every piece leaned on the one before (the plot on all four kinds of
place, routes on every level), so they would have waited on each other.

---

Newest entry first. Performance numbers are from `tools/bench.py` (a real browser on a software renderer at 412 x 915,
seeds 11 / 222 / 3333): slow in absolute terms, but comparable before and after. Bot win rates from
`node tests/playtest.js 150`, seed sets 5 / 1000 / 2000 unless stated. Commission 4's own checks are in
`tests/c4.test.js` (part of `node tools/check.js`).

## C4.14: a ring on the map where the goal leads

**Why.** On a phone the goal line's compass word ("north-east") is all there is to steer by, and with stairs,
shadows, doors and other regions in the way it is easy to lose the thread.

**What it is.** The map screen (outdoors and inside any level or town) draws a **gold ring** at the next place the goal
leads: the town to find, the stair down, the shadow to fly up from, the door, the den. Off the edge of the map window,
the ring sits on the edge, on the line toward it. `R.goalMark(s)` gives it, from the route (C4.6) for any trouble and
from the old story's own steps for the relic. The map's key says so.

**Also fixed.** `findSite` (asked every time the goal line is drawn) unpacked every region map it looked through, which
could have undone the packing of far maps (C4.2); it now reads only their sites. In a test walk it made no difference
(the locked place was found early), but a far-off locked place would have unpacked every map before it.

**Commits.** "A gold ring on the map where the goal leads next".

## C4.13: old worlds deepen

**Why.** Andrew's game in progress was made before commission 4, so it would never have a dungeon or a sky place in it.

**What it is** (`deepen` piece, `rules/deepen.js`). When a save from a world made before commission 4 loads, it rolls
its dungeons and its places in the sky once, exactly as a new world would, from its own seed (so the same save always
gains the same): stairs are put in caves and ruins of regions already walked as well as those to come, shadows on the
ground, and a way to fly in a shop or the deepest dungeon. The log says "This land is deeper than you knew: 3 stairs go
down into the dark somewhere in it, and something hangs in its sky." Seas and doors cannot be added (a sea is chosen
before any land is made, and a door belongs to the plot) and its troubles stay as they were; wayfarers come by
themselves in every region built from now on. Worlds made now are marked (`s.deep`), so it happens once. A new hook,
`AFTER_LOAD` (save.js), runs after a save is loaded and upgraded. Every old fixture (v6 to v9) gains 3 to 16
dungeons and loads twice the same.

**Commits.** "Old worlds deepen: a world made before gains its dungeons and sky places once". Switch: `deepen`.

## C4.12: wayfarers

**Why.** Half of all deaths are thirst on the long legs between towns, and the land between towns has no people in
it; the new places are found only by stumbling on them. So: chance meetings that help with both.

**What it is** (`wayfarers` piece, `content/wayfarers.js`, `rules/wayfarers.js`). About one region in three away from
home has someone at a small fire (seen from a way off by its flame), put there when the region is first built:
- a **water-carrier**: water at 2 coin the measure, six measures, then gone;
- a **wandering mapmaker**: for 12 coin, this region and the eight round it drawn on your map, every spring marked
  sweet or foul;
- a **pilgrim**: free, tells you where the nearest thing you have not found lies (a dungeon's stair, a shadow in the
  sky, a place in the water, a door) and marks it;
- a **trapper**: buys hides (3) and bone (2), sells bandages (5);
- rarely, a **lost traveller** who needs two of your water and pays it back in coin and experience.
Once dealt with (all but the trapper) they move on and leave their ashes.

**In play.** A reason to walk toward a distant flame; a way to buy your way across a dry leg; the pilgrim makes the
places of commission 4 findable. The bot buys water from carriers it passes. Bot win rate 30, 27, 20 (77 / 450) with
them, 32, 28, 21 (81) with `NO=wayfarers`: within the noise; the bot rarely passes a fire.

**Commits.** "Wayfarers in the wilds". Switch: `wayfarers` (as regions are built).

## C4.11: no more black screens, and a fuzz that goes everywhere

After Andrew's freeze at Saltholm (C4.10), two things so that a fault like it can neither hide nor strand anyone.
- **A safety net in the view** (`src/view/oops.js`). The frame loop asks for the next frame first, and walking,
  building and drawing each run guarded; so do actions and the panels, and errors anywhere else on the page are
  caught too. Whatever goes wrong, the game keeps running and a note at the top says what happened, with **Copy the
  error** (to send on) and Close. After an error (or in god mode) Menu offers **Rescue: back to the well**, which
  brings the traveller out of wherever they are, any world, to the well at home, at no cost (`R.rescue`). Tested by
  putting the Saltholm fault back: the note appeared, the game ran on, and the rescue brought the traveller home.
- **An explorer fuzz** (`tests/explore.js`, in `node tools/check.js`). Twelve worlds made to have everything; in each,
  eighteen places reached by god mode, one kind at a time (regions, towns, dungeons, the sky, the water, other
  worlds), then 60 steps of random play there as a mortal: every button offered is pressed, every dialog opened and
  one of its options taken, everything the screen asks for each frame is asked for, and the world is saved and
  loaded. About 9,000 steps in 11 seconds; it finds the Saltholm fault at once when it is put back, and found nothing
  else.

**Commits.** "No more black screens: errors are shown and the game runs on; a fuzz that goes everywhere".

## C4.10: fix: talking to a floating town's trader froze the screen

**From Andrew** (god mode, Saltholm): talking to the figure on the floating town froze the screen, and teleporting
anywhere after left it black until the browser was reopened. The talk button looked its trader up among the sky's
places first, and a sea place is not one of them, so drawing the buttons threw an error on every frame. Fixed in
`traderOf` (sky.js): a sky place's trader, else the sea's. The merfolk halls had the same fault. `tests/c4.test.js`
now talks to the raft-master.

**Commits.** "Talking to a floating town's trader no longer freezes the screen".

## C4.9: dungeons in other worlds

**What it is.** Each other world rolls one or two dungeons of its own (any theme, 2 to 4 levels), their stairs in
caves of that world, so another world is worth exploring for itself and not only for the plot's errand. They are
ordinary dungeons in `s.deeps` (with `realm`), built only when reached; god mode jumps into them across the door, and
the goal line from the bottom of one says "Go back through the door, home" and points up the stair.

**Commits.** "Other worlds have dungeons of their own". Switch: `realms` (and `deeps`).

## C4.8: kin of the new places

**What it is.** The two races the brief half-suggested (`kin` piece, `content/kin.js`, `rules/kin.js`):
- **Windborn**: light-boned and feathered at the arms; they **fly by nature** (no wings to borrow, so a world's sky is
  open to them from the start), at 1.6 times the effort of boots, and carry 4 less. +2 DEX, -2 STR.
- **Merrow**: of the sea-people; they **breathe water** (deep water and the places under it are open to them from the
  first step) and need a fifth less to drink, but walk slowly on dry ground. +2 CON, -1 DEX.
- Each is offered, beside the usual races, in about half the worlds that have places in the sky (windborn) or a sea
  (merrow), and never otherwise (32 of 150 test worlds offer one); the first log line says so.

**In play.** A way in to the new places without waiting for the shop or the dungeon, at a price on the ground. Bot
win rate 32, 28, 21 (81 / 450, 18%; it plays them like anyone else).

**Commits.** "Windborn and merrow: kin of the sky and the sea". Switch: `kin` (at creation).

## C4.7: saves kept, a door to see, and the new places measured

**What it is.** Housekeeping after the pieces.
- **Fixtures**: four saves made by v0.14 (the game on main: walked about, in another town, in the locked place, a
  trouble told) and five made inside the new places (down a dungeon, in the sky, flying, under the sea, beyond a
  door) are now in `tests/fixtures/`, so the state test proves Andrew's current game keeps loading, and any later
  format change must keep these loading too. `tools/once/make-fixtures.js` makes the new places' ones.
- **The door** has a model: two stone posts and a lintel, with another sky glowing through (violet going out, pale
  blue coming home). The map marks doors, thrones and cellars.
- **How to play** (Menu) tells of dungeons, the sky, deep water and doors in one paragraph.
- The plot's places inside levels are drawn: a throne for a villain, a black stone, an herb patch, bones at a den, a
  tent for a camp or the lost, and a town's cellar stair.
- `python3 tools/bench.py places` measures a dungeon level, a floating castle, the open sea, a place under it and
  another world; the browser smoke test now visits one of each kind of new place.

**Commits.** "Saves from v0.14 ... kept as fixtures", "Doors you can see, how to play tells of the new places, and the
benchmark measures them".

## C4.6: the plot goes below, above, under the water and beyond

**What it is.** The troubles of commission 3 now use the new places, four new troubles only make sense with them,
and there is one way of finding the way to anywhere.
- **A place role can lie anywhere**: `where` on a plot's place is the land, the bottom of a **dungeon**, the top of a
  **sky place**, the far end of a place **under the water**, or a region **beyond a door**, with weights; only what
  the world has is chosen. The great beast's den is sometimes at the bottom of a dungeon or beyond a door; raiders
  camp in a dungeon or another world; the lost wander beyond a door; the black stone of a curse may stand on a
  floating isle or in another world (its curse falls on the region below, or there); the sickness's herb may grow in
  another world or up in the sky.
- **Four new troubles**:
  - **The king under the hill**: a dungeon of the plot's own (2 to 4 levels), and at its bottom, on a throne,
    something that calls itself king. The elder gives torches and a salve.
  - **The tyrant in the sky**: a floating castle (made for the plot if the world has none), whose lord takes the
    harvest. The elder gives the Cloak of the West Wind: fly up, climb the keep, kill the tyrant, bring its seal.
  - **The drowned cure**: pearl-moss grows only at the back of a sea cave, under the water (only in worlds with a
    sea). The elder gives three draughts of gills and a torch.
  - **Lost beyond the door**: a child went through the old door. Only in worlds with a door, and **every door is
    used**: a door no other trouble reached gets this one, from a town without a trouble of its own.
- **Things promised to maps not yet built** (`rules/route.js`): a plot's site, item or villain at the bottom of a
  dungeon is held (`s.held`) until that level is first built, then put at its far end, with its guard beside it
  (`'mapBuilt'` from areas.js, `'heldPlaced'` back to the plot). Nothing is built early, so the memory budget holds.
- **Routes**: `route(s, goal)` says where to go next from wherever you stand to any place: down a dungeon's stairs, up
  a castle's (flying up from its shadow first), into a sea cave (gills first), through a door, or back out the way you
  came. Each kind of level says how it is entered (`ENTRANCES`). The goal line's direction follows it, so it points to
  the stair, the shadow or the door, never off into the earth.
- **The elder re-equips**: a new traveller who comes back to the giver is given again what the last one was given
  (it lies with the body); otherwise one death in the sky would end the world.
- Places the plot sends you to are a tier gentler than the late-game places you find for yourself, and the plot's
  dungeon has its villain at the bottom instead of the theme's Heart: you are sent there, not drawn there late.
- Water on the way: as for any trouble, sure springs are put along the leg to the place's way in (the stair, the
  shadow, the door) and the elder marks them.

**The bot** now follows routes: to the way in, taking off for a shadow (and flying toward it when rested), drinking
gills before diving, lighting a torch for the dark, following the stairs down and the way back out, drinking from
pools and springs inside, and going back to the giver for wings it has lost. With the trouble forced (`SET=trouble=`,
40 worlds): the tyrant 2, the king 2, the drowned cure 1, lost beyond the door 2. These are much harder journeys than
the land's troubles (the bot mostly dies of thirst on the way, or to the tier 3 and 4 creatures at the top), so
they are rarer as great troubles (weight 1 each against 12 for the rest).

**Tests.** `tests/c4.test.js` follows each new trouble's route leg by leg (teleporting along each leg and taking each
step's action) to its end and checks it wins; `tests/plots.test.js` leaves troubles that are away from the land to it.

**Commits.** "The plot goes below, above, under and beyond". Switch: `plots` (as before).

## C4.5: other worlds

**What it is.** Doors to other worlds (`realms` piece, `content/realms.js`, `rules/realms.js`).
- Rarely (the `doors` setting, 8% by default; 16 of 300 test worlds) a **door of old stone** stands alone in a region
  of the world, and through it lies **another world**: a grid of 2 x 3 to 3 x 4 regions made from **a seed of its
  own**, like home but stranger: about two in three of its regions are countries of its own (generated biomes), and
  half hold something strange (rare regions; home has 15%). It has **one town of its own** (its own people, elder,
  inn and shop). Now and then a world has a second or third door, each to a world of its own.
- Step through and you come out of the other world's door, under another sky. Its map, its directions and its
  dangers are its own; the goal line says "Go back through the door, home" when what you need is at home. Step back
  through to come home. A traveller who dies there leaves their body there; the next one sets out from the well at
  home as always. Saves made on the far side load on the far side.
- **How it works**: while you are in another world its sketch and seed stand in `s.world` and `s.seed`, and its
  regions are named after it (`o1:r2_0`), so every rule about regions (land, borders, rivers, roads, creatures,
  towns, the view, the map) works there unchanged and nothing collides with home. `setRealm`, `withRealm` and
  `enterRealm` in areas.js swap the two; nothing else knows. The plot uses every door (next entry).

**Memory.** Only what is touched is made: a fresh world with a door saves in 76 KB instead of 61 (the far side's
arrival region, its neighbours and its town); walking every region of the other world brings it to 116 KB, and far
maps there are packed like any others, so the heap stays near where it was (1.4 MB for the new world either way).
The other world never doubles the cost of the game.

**Shared bricks.** `OBJECTIVES` in hooks.js (a goal in another world goes by its door; the plots and the old story
both ask it), `realmOf(s, area)`, `regionRec`; `sketchOf` now answers safely for a region of another world.

**Choices made without asking.** Other worlds share home's year, god and lost people (each is one per state and
swapping them would reach into many pieces); they are stranger through their countries and rare regions. They have
no dungeons, sky places or doors of their own yet: easy to add, since those pieces only need to run for the far
side's regions. Another world's town has no trouble of its own (the plot decides what happens there). The jump list
has every region of every other world and each door.

**Commits.** "Doors to other worlds". Switch: `realms` (at creation).

## C4.4: the sea, lakes, and under the water

**What it is.** Real water, and places on it and under it (`sea` piece, `content/sea.js`, `rules/sea.js`).
- **How seas fit the region grid**: a sea is whole regions. Before any land is made, a world that has a sea (the
  `sea` setting, 40% by default) turns a patch of 2 to 4 neighbouring regions in the far country into the new biome
  **Open Sea**. Because biomes already blend within six tiles of a border, the land next to a sea turns to shallows
  and marsh at the coast on its own. When a sea region is built, everything two tiles or more from high ground becomes
  **deep water**, so hills and mountains stand out of it as islands; the outermost ring stays shallow, so a
  neighbour's river or road is never cut off. A sea region that would have no fresh water gets a rock with a
  rain-pool in the middle. Small worlds (all regions next to home) have no sea, so the story's places never fall in
  it. **Lakes** come anyway: about one region in four with sweet water has one, deep in the middle with a wadeable
  margin of sweet water.
- **Deep water** is a ground of its own (`DEEP`), drawn as water: no one walks on it without a **coracle** (a round
  hide boat you carry, weight 5: the cost is hauling it over land), a way to **breathe water** (a **Diving Helm**, worn
  as a tool, or a **Draught of Gills**, 12 hours), or wings. Walking along the bottom is twice as slow as paddling.
  With no way to breathe, under the water or swimming in deep water, you lose 3 health an hour and can drown (a new
  cause of death). The town nearest the sea sells a coracle and two draughts of gills; the Journal says so.
- **Places**: on the water a **floating town** (one per sea: boats lashed together, a raft-master who sells helms,
  gills and boats, and a bed) and the masts of **wrecks**; under it **merfolk halls** (they trade, and lend a bed),
  **sea caves** (their mouths on the shore, two dark levels of eels, a prize at the bottom), sunken **wrecks** (the
  captain's strongbox) and, in some lakes, a **drowned shrine**. Under-water levels have their own look (blue or green
  water instead of a ceiling); the floating town is drawn on the sea.

**In play.** Nothing sends you to sea yet (the plot will). Bot win rates: see the end of the commission (the bot
never needs deep water, and no story place stands in a sea).

**Shared bricks.** `DEEP` and `s.player.swims` (kept up to date on every action, so `passable` stays cheap); `LEVELS`
is now keyed by the kind of level (`LEVELS.deep`, `LEVELS.sea`); SKETCHERS now get the world settings; the dungeons'
layouts are exported and reused under the sea; the cloud city's trader code serves any trader site.

**Choices made without asking.** The floating town is a level reached from the water, with a trader, not a full town
with an elder: towns stand on a block of land, and a sea town of that kind can come later. No merfolk race yet (it
needs a place in the roster, and is best added with a plot that wants it). Creatures never step onto deep water, so
a boat is safe from all but what lives in the places.

**Commits.** With the sky: "The sky and the sea". Switch: `sea` (at creation).

## C4.3: the sky

**What it is.** Flying, and places that float above the world (`sky` piece, `content/sky.js`, `rules/sky.js`).
- **Ways to fly**, never rolled as ordinary finds: **Boots of the Updraft** (hard work), the **Cloak of the West
  Wind** (and warmer), a **Flying Carpet** (easier, and carries more) and a **Griffin's Bridle** (a tame griffin does
  the work: the easiest). Anything with the new stat `fly` works, so a race or a god could give it later.
- **Flying** ("Take to the air", outdoors): every kind of ground, river, marsh or mountain, costs the same short time,
  and nothing on the ground can reach you; you see further and survey wider. But each tile costs stamina (times the
  item's `flyEffort`), it is 4 colder an hour and 1.2 times as thirsty up there, a storm throws you down (2 to 6
  damage), below 8 stamina you must land, and aloft you can do nothing but look about: drinking, searching, gathering,
  fires, sleep and towns all need the ground. Water, shelter and every place worth finding stay on the ground, so
  flying is a fast, expensive way between them, not a way round the game. The view lifts you 28 metres while aloft.
- **Places in the sky**, in about one world in four (the world setting), one to three of them over the far country:
  a **drifting isle** (ruins to search, a rain-pool), a **floating castle** (three levels: the bailey, then up the
  keep to its lord, a tier 4 elder, and its treasure, with a Griffin's Bridle), a **cloud city** (people: the
  windwright trades and has a bed for the night) and, now and then, a **low moon** (two levels down into its craters,
  very cold, everything weighs less, tier 4 and 5 creatures, and an artifact of its own at the bottom).
  Each hangs high over a **shadow** on the ground "though there is no cloud to cast it", and is drawn up there, seen
  from far off. Fly over the shadow and up. On the place, the edge of the island is open air (a new ground,
  `VOID`, that nothing walks on and the view does not draw); its creatures start at tier 3. You leave from the landing:
  fly down, or, if you have lost your way of flying, jump (a long fall: six tenths of your health).
- **A world with sky places always has a way to fly within reach**: Boots of the Updraft in one town's shop (half
  the time; the Journal says so), or with the deepest dungeon's prize. So the sky is late-game: money or a dungeon
  first.

**In play.** Nothing sends you up yet (the plot will). Bot win rate unchanged (see the numbers at the end of the
commission). The floating places cost one draw call each outdoors, only in the regions that have them.

**Shared bricks.** `COSTS` (a piece changes what a step costs: flying), `LOOKS` (a piece's levels' looks for the
view, including a title), the terrain `VOID` (open air), `traderOf` / a `trader` site any piece's level can hold
(the sea's will use it), and the view now draws any level with `look.void` as an island: slabs where you can stand,
rock hanging under them, sky all round.

**Choices made without asking.** No flying race yet (a race needs names, a text and its place in the roster; it can
come with the plot that needs it). Flying is not allowed in storms, and a storm that starts while you are aloft
throws you down, which is the main brake on it. Sky places are areas reached from a site, like dungeons, rather than
regions of their own: a floating island is smaller than a region and needs no borders.

**Commits.** With the sea: "The sky and the sea". Switch: `sky` (at creation).

## C4.2: dungeons, and the memory to hold them

**What it is.** Angband-style dungeons below the world (`deeps` piece, `content/deeps.js`, `rules/deeps.js`).
- A world rolls its dungeons when it is made: about one region in two has one (a few have two, the world setting
  scales it), and about a third of towns have a **cellar stair**. Each has a **theme**, a name and a depth of 1 to 4
  levels (the setting caps it). Six themes, each with its own layout, creatures and dangers:
  **old mine** (long timbered drifts, brutes and hounds, traps), **crypt** (rooms and corridors, wights, many traps,
  bone), **flooded cistern** (pillared halls in black water: slow and cold, serpents, pools to drink),
  **fungus cavern** (open caverns that glow, so no light is needed; herbs, and water drains slower),
  **dwarf-hold** (square halls cut true, tier 2 from the start, the most traps and coin), and **warren** (gnawed
  caves crowded with hounds).
- The stair is put in a cave or a ruin (or a new cave of its own) when that region is first built, or against a house
  wall in a town. Standing on it: "Go down into the Gnawed Ways". A dark dungeon needs a light, as the locked place
  does.
- **Deeper is harder and richer**: creatures gain about a tier every level and a half (to tier 8 at most), each level
  has a store-room or two whose items are finer the deeper they lie, and the bottom has the **Heart** (an elder of the
  theme, guarding its prize) and a prize room: coin, a superb item and, in the deepest dungeon of the world, a
  **named artifact of its own** (a fourth, made for the deep).
- **The locked place fits in**: it keeps its own generator and story, but its levels share the rest: the jump list,
  the odd levels, the look, the stair actions. The **odd levels** of commission 1 (flooded, ossuary, archive,
  sleepers) now turn up on any dungeon's levels too (30% of levels above the bottom).
- **Memory.** Levels are built the first time you reach them, from their own stream, so an unwalked dungeon costs a
  few numbers. And maps away from the traveller are kept **packed** in memory, as saves already pack them: only the
  map you are in, the regions round it, their towns and the level above you are kept as plain lists
  (`coolDown` in areas.js, `rules/grids.js`); anything that asks for a far map through `mapOf`, `buildArea` or
  `ensureRegion` gets it unpacked.

**Numbers** (node, `--expose-gc`; a 7 x 7 world, every region visited and every dungeon level walked by god mode):

| | areas | levels | heap, far maps packed | heap, all unpacked | save |
| --- | --- | --- | --- | --- | --- |
| usual dungeons | 116 | 61 | 6.5 MB | 9.4 MB | 334 KB |
| four times as many, 16 deep | 277 | 222 | 11.3 MB | 19.7 MB | 617 KB |

**How deep can a dungeon go?** One dungeon walked to the bottom: each level takes 0.4 to 2 ms to build, adds about
2.1 KB to the save and 34 KB to the heap (packed). 200 levels: 483 KB save, 7 MB heap, 44 ms to load; 500 levels:
1.1 MB save, 17 MB heap, 128 ms to load. The save is the limit that bites first (browser storage holds about 5 MB),
so about 1000 walked levels in all; I keep ordinary dungeons to 1 to 4 and plot dungeons to 4 to 7, for play, not
memory. Two scaling bugs found by measuring: creatures per level and their tier grew without end (now capped at four
extra and tier 8), and creature ids could collide between dungeons past level 10.

**In play.** Dungeons are optional: nothing sends you down yet (the plot will, in a later entry). Bot win rate with
every piece on, sets 5 / 1000 / 2000: 30, 27, 30 (87 / 450, 19%), unchanged. **Frame cost**: none outdoors (one
more cave in some regions); a level is drawn like the locked place, about the same draw calls.

**Shared bricks.** `LEVELS` in hooks.js (the stair actions for levels a piece owns); `levelLook(s)` and `isLevel(s)`
(the view draws any level from its look: stone, floor, glow, background); `levelTitle(s)`; `applyQuirk` and
`rollQuirk` exported from floors.js; `makeArtifact` from artifacts.js; `freezeMap`/`thawMap`/`coolDown`; each held
thing a plot leaves in a dungeon goes in `d.held` and is placed when its level is built (used in a later entry).

**Choices made without asking.** No new creature forms (the view would need models): each theme names the four
forms its own way (Tunnel Brute, Crypt Wight, Spore Hound), with an elder Heart at the bottom. The locked place is
not moved into `s.deeps`: its story and its old saves depend on its ids; it is listed beside the dungeons instead.
Levels alternate where you arrive (an end on odd levels, anywhere on even), so a level is crossed, not just entered.

**Commits.** "Dungeons below the world: six kinds, deeper and richer, and far maps packed away". Switch: `deeps`
(at creation).

## C4.1: god mode and world settings

**What it is.** The two testing tools the brief asked for first.
- **God mode**, a checkbox at the top of the Tinker panel (Menu). The traveller is unseen by creatures (they never
  start a fight), never thirsts, freezes, tires or bleeds, walks through walls, carries anything, sees in the dark,
  steps over traps, opens any locked door, and counts as flying and breathing water for the pieces still to come.
  While it is on, the Tinker panel has a **jump list** (every region by country and position, every town, and every
  place later pieces add: dungeon levels, sky places, sea places, other worlds), and **a tap on the world map** jumps
  to the tapped tile. The clock line says "God mode" while it is on. A world that has ever used it is marked for good
  (`s.cheated`, saved): the end screen says the win or loss does not count, and the Journal notes it.
- **World settings**: "New world" now opens a small screen with the seed and a folded-away "World settings" (closed by
  default, so an ordinary new world is one more tap): size, which races and classes may appear and how many, how many
  other towns, dungeons (none, few, usual, many) and how deep, how often sky places, a sea and doors to other worlds
  appear (and how many doors), and which great trouble. They are plain settings, `newGame(seed, off, set)`, kept in
  `s.gen` only where they differ from the defaults (`content/worldset.js`), so ordinary worlds store nothing and are
  unchanged. The playtest takes them too: `SET=sky=1,doors=1,size=3x3 node tests/playtest.js 50`.

**Shared bricks.** `PLACES` in hooks.js (a piece adds the places god mode can jump to); `settings`, `genOf(s)` and
`parseSet` in `rules/worldset.js`; TUNERS and `'worldBorn'` now receive the settings. A test file of its own for this
commission, `tests/c4.test.js`.

**Choices made without asking.** God mode is a state flag, not a Tinker switch in `s.off`, because it must be marked
on the world when used and switches are not. Settings the later pieces read (dungeons, depth, sky, sea, doors) are in
the screen from the start; each piece honours its own as it arrives. The size setting keeps a world at least 2 x 3,
so the story's places fit. The new world screen remembers its choices until the page is reloaded.

**Commits.** "God mode and world settings: test any place, make any world". Switch: none (testing tools).

---

# Commission 3

## Summary

Eight entries, in the order Andrew asked: the phone budget first, then worlds of any size, many towns and many plots,
crafting and trade, a little light and weather, and two small things of my own. Every check passes, old saves load
(no `VERSION` bump was needed: every new field is optional), and the bot wins more often than before.

| # | Piece | Switch | Verdict |
| --- | --- | --- | --- |
| C3.1 | Performance meter, graphics quality (Low / Medium / High), cheaper trees and ground, saves a third the size | (view, save) | pearl |
| C3.2 | Worlds of varying size, 2 x 3 to 7 x 7, odd shapes included | `worldsize` | pearl |
| C3.3 | More towns: one to five others, each with its own people, culture, shop and streets | `moretowns` | pearl |
| C3.4 | Many plots: a great trouble that decides how the world is won (relic, beast, curse, sickness, cult, siege), and other towns' troubles (captive, lost, feud, caravan, theft...), linked | `plots` | pearl |
| C3.5 | Crafting: hide, bone, salvage and herbs into waterskins, torches, bandages, a fur cloak, a shelter | `crafting` | pearl |
| C3.6 | Trade between towns: goods cheap where made, dear elsewhere, moved by the year | `trade` | pearl, if people trade |
| C3.7 | Light, sky and weather: shaded sky, sun and moon, ground grain, rain and snow; eyes show temper | (view) | maybe-to-pearl |
| C3.8 | Townsfolk tell of other towns' troubles; the dead keep their materials | `plots`, `crafting` | small |
| C3.9 | After Andrew's phone numbers: the meter shows work per frame; crossing a border is built over many frames, no hitch | (view) | pearl |

**Performance, before and after** (`tools/bench.py`, software renderer at 412 x 915, three seeds; slow in absolute
terms, comparable across rows):

| | build ms (border hitch) | draw calls | triangles | frame ms | save, fresh world |
| --- | --- | --- | --- | --- | --- |
| before (one setting) | 156 | 123 | 355,691 | 180 | 107 KB |
| after, High | 141 | 89 | 282,865 | 156 | 59 KB |
| after, Medium (default) | 74 | 83 | 150,193 | 105 | 59 KB |
| after, Low | 44 | 70 | 80,974 | 60 | 59 KB |

The fresh-world save grew from 36 KB (after C3.1's packing) to 59 KB because worlds now build more regions at
creation for their towns and plots; a fully explored 7 x 7 world saves in about 160 KB, against a few MB allowed.
The sky, grain and weather of C3.7 cost three draw calls and nothing measurable in frame time. **Andrew: turn on
Menu, Settings, "Show the performance meter" on the Pixel 9 and send the numbers**, on Medium and on High; that is
the real budget, and I could not measure it.

**Bot win rate** (`node tests/playtest.js 150`, every piece on), sets 5 / 1000 / 2000: 28, 27, 31 (86 / 450, 19%),
against 53 / 450 (12%) at the start of the commission. The floor was 8%. The rise is the plots: a great trouble other
than the relic (a curse, a sickness) is usually a shorter journey than key, locked place and beacon, and the bot
wins 10% of relic worlds as before. The bot now plays any great trouble, makes things, and trades a little.

**My three best.**
1. **Many plots (C3.4)**: a world is about something different each time, the old story is a third of the game, and
   the other towns have a reason to be visited. It is also built so that a new plot is mostly data.
2. **The performance meter and quality setting (C3.1)**: it turns "runs comfortably" into numbers, made the default
   twice as cheap, and every later piece was measured against it.
3. **Crafting (C3.5)**: small, and it ties fights and searches to staying alive; a shelter in the right place
   changes a long leg.

**What I would do next.**
1. Measure on the Pixel 9 and set the default quality from the numbers; if Medium is comfortable, try a longer view.
2. Teach the bot side troubles and trade runs, so the playtest measures the whole game, not just the great trouble.
3. Balance the great troubles against each other (the curse is won 37% of the time, the cult 7%), and add a few more
   (a dragon's hoard to buy back, a flood, a lost caravan), now that a plot is mostly data.
4. Done in C3.9: crossing a border no longer hitches.
5. Textures on walls and buildings, from the same cheap pattern as the ground's grain; people who travel the roads
   between towns (caravans you can meet).
6. When merging to main as v0.14, a CHANGELOG row (I left CHANGELOG.md alone, as the earlier commissions did until
   their merge): "The third commission. A performance meter and graphics quality; worlds from 2 x 3 to 7 x 7; up to
   six towns; a great trouble per world (relic, beast, curse, sickness, cult, siege) and side troubles in other
   towns; crafting; trade between towns; a shaded sky and weather. See `JOURNAL.md`."

**Order.** As recommended. "Any number of towns" came before plots (C3.3 before C3.4), as my earlier note said it
should; crafting before trade, so materials could be sold.

---

Newest entry first. Performance numbers are from `tools/bench.py` (a real browser on a software renderer at 412 x 915,
seeds 11 / 222 / 3333): slow in absolute terms, but comparable before and after. Bot win rates from
`node tests/playtest.js 150`, seed sets 5 / 1000 / 2000 unless stated.

## C3.9: margin on the phone: the meter shows the work, and borders no longer hitch

**From Andrew's phone** (Pixel 11 XL, High and Medium): 60 fps, 16.7 ms a frame, worst 19 ms, 103 / 28 draw calls,
281k / 148k triangles, a scene build of 94 / 104 ms, a 31 KB save, 15 MB of heap. He plays on High without trouble.

**What it showed.** Both settings sit exactly on the screen's 60 frames a second, so the frame time cannot show the
margin: the phone waits for the screen either way. The one real cost is the build: crossing a border froze the game
for about a tenth of a second (six frames).

**What changed.**
- The meter now shows **work**: the milliseconds each frame actually spends (moving, the rules, handing the scene to
  the GPU), as a share of the frame, and the worst of the last half second. That is the margin. (The GPU's own time is
  not visible to the page; if the work is low and the frame rate still drops, that is where the time went.) After a
  build it also shows its parts (land, ground, trees, places), or for a build spread over frames, its total, how many
  frames it took and the most any one frame spent on it.
- **Crossing a border no longer hitches.** The old land is the right land for a moment: the new region lay in its
  margin. So it stays on screen, moved one region over, while the new land is built a few milliseconds a frame (at
  most 5 ms of work a frame, `BUILD_BUDGET` in run.js) and swapped in when done (`buildStaticSoon` / `stepBuild` in
  scene.js; the land build is now a generator, `buildLand`, that pauses every few rows). The swap cannot be seen. On
  the test machine a crossing used to stop one frame for 74 ms (Medium) or 141 ms (High); now it is spread over 17 or
  30 frames, none spending more than 6 ms on it. Entering a town or the locked place, loading and changing quality
  still build at once (they change the scene anyway).
- The ground mesh is built directly instead of through three's PlaneGeometry, with no unused normals and nothing to
  rotate afterwards, which also made the whole build about a quarter faster.

**For Andrew to check:** with the meter on, the second line should read a few milliseconds of work (a few percent of
the frame) while walking, and crossing a border should no longer show a long worst frame.

**Commits.** "No hitch at borders, and the meter shows the work each frame". No switch: the view.

## C3.8: word of other towns' troubles, and what the dead carried

Two small things of my own. **Townsfolk talk of other towns' troubles** you have not heard yet ("Have you been to
Greyby? They have trouble there: the cult, they say.") and the town goes on your map, so the side troubles of C3.4
find you instead of waiting to be stumbled on. A new hook, `RUMOURS` in hooks.js, lets any piece add a rumour.
**Materials and trade goods now lie with a fallen traveller's body**, with their coin and gear, and the next
traveller takes them up when they find it (C3.5 had them lost). Bot unchanged. Switches: `plots`, `crafting`.

## C3.7: light, sky and weather

**What it is.** Small visual gains, all behind the quality setting (none on Low):
- **A sky** that darkens toward the top instead of one flat colour, meeting the fog exactly at the horizon, with a
  **sun** crossing it by day and a pale **moon** by night (hidden in a storm).
- **Grain on the ground**: a soft speckle every six metres, so near ground reads as ground and you can feel yourself
  move over flat country.
- **Weather you can see**: rain, snow, hail, dust, ash or falling stars while a storm blows, chosen from the storm's
  name (a blizzard snows, a dust storm blows dust sideways), 700 on Medium and 1600 on High, falling round you.
- **Creatures' eyes show their temper**: red hunts you, orange guards its ground, yellow keeps to itself, green will
  not fight. Told in How to play.

**Cost, measured** (`tools/bench.py medium-plain medium`, same build and worlds): 80 to 83 draw calls, 149,849 to
150,193 triangles, frame time within the noise (120.7 ms plain, 115.8 ms with them, on the software renderer). The
storm's points are one draw call updated in JavaScript.

**Commits.** "Light, sky and weather". No switch: it is the view, under Settings.

**Choices made without asking.** No real lighting changes (shadows, fog colour shifts) and no textures on walls or
buildings yet: the grain shows how cheap a texture is, and walls could take one next. Weather particles use plain
random numbers in the view, which is allowed there (the rules never see them).

**Verdict: maybe-to-pearl.** Modest, as asked; the snow in particular changes how a blizzard feels.

## C3.6: trade between towns

**What it is.** Every town's shop now has a **Market** of six trade goods: furs, salt, timber, iron tools, cloth and
remedies. A town sells cheap (about 0.6 of the price) what its country or its people make, and pays dear (about 1.45)
for what they do not: furs where the nights are cold, salt where there are salt pans or hot days, timber in wooded
country or where the people burn charcoal, tools in the hills or from smiths, cloth from weavers or sheep hills,
remedies from herbalists or flower meadows. Each town's prices wander 15% from the seed, and the year moves some (a
hard winter makes furs 1.6 times as dear, a drought remedies 1.4). The merchant tells you where the town's own goods
fetch the most. Goods weigh something (timber 2, furs 1, remedies 0.3), so a trade run is a choice against water.
Materials from crafting sell in every town.

**In play.** Coin now has a use besides the shop's gear, and more ways to earn it: carry five furs bought at 5 from
a cold-country town to a warm one that pays 11, sell the hides and bone of your kills, and the side troubles' pay.
In 15 test worlds, at least 10 have a trade worth making between their towns. Bot win rate unchanged (30, 28, 30):
it sells spare materials and goods the town does not make, and buys a little of what it does, but it only visits the
story's town, so it never completes a run.

**Commits.** "Trade between towns". Switch: `trade` (in play).

**Choices made without asking.** Prices are worked out when asked, not stored: they follow the town's culture and the
year with nothing to migrate. Only what each town has left of its own goods is stored (`t.goods`, from the seed the
first time you ask). A town that does not make a good never sells it, so goods move one way, from where they are
made to where they are wanted.

**Verdict: pearl, if people trade.** It needs the other towns to be worth walking to, which the side troubles give.

## C3.5: crafting

**What it is.** The land now gives materials, carried in the pack: **hide** and **bone** from what you kill (a hound
leaves a hide, a brute a hide and a bone, a wight two bones, a serpent a hide; more from a tier 3 creature),
**salvage** (cloth, cord, pitch) from searching ruins and caches, bone from caves, and **herbs** half the time you
gather wood. Wood is your fuel. Pack has a **Make** list, survival first:
- Waterskin (2 hide): 3 more water. Hide boots (2 hide). Fur cloak (3 hide, 1 bone): the cold bites half as hard.
- Torch (1 wood, 1 salvage): light for 8 hours, enough for the locked place without a lantern.
- Bandages (1 herb, 1 salvage): 6 health, in a fight too. Healing salve (2 herbs, 1 wood). Warming draught (1 herb, 1 wood).
- Bone spear (2 bone, 1 wood).
- Shelter (3 wood, 1 hide): a hide-roofed lean-to where you stand, drawn in the land, that shelters you from storms
  and lets you sleep, for good. A shelter on the road is a camp you never have to carry.

**In play.** Fights now pay in something useful, ruins in more than a chance of an item, and a long leg can be
broken with a shelter. Bot win rate, sets 5 / 1000 / 2000: 30, 28, 30 (88 / 450, 20%); with `NO=crafting` 26, 24,
34 (84). The bot makes waterskins first, then a fur cloak, a torch when it has no light, and bandages, and uses
bandages like salves.

**Commits.** "Crafting". Switch: `crafting` (in play).

**Shared bricks.** `WEIGHTS` in hooks.js (anything else the traveller carries that weighs something); `use.light` on a
consumable (hours of light); a `shelter` site counts as shelter; `emit` is on the Rules object for tests.

**Choices made without asking.** Materials are counts (`s.player.mats`), not items, so the pack does not fill with
forty hides. They are lost when a traveller dies (the body keeps its items, coin and water, not its materials): a
small loss, and it keeps depots simple. Wood stays fuel rather than becoming a material of its own, so a recipe
that needs wood competes with your fires, which is the point.

**Verdict: pearl.** Small, and it ties fighting and searching to surviving.

## C3.4: many plots

**What it is.** The story is no longer always the relic. Every world now has one **great trouble**, told by the elder
of the story's town, and finishing it wins the world with an ending that fits it. It is one of six: the old story of
the relic (a third of worlds), a great beast, a curse on the land, a sickness, a cult, or a siege. Each of the other
towns may have a **trouble of its own** (one to three in a world), told by its elder when you walk in, which you can
take up or leave and which pays in coin: someone held captive by raiders, someone lost in the wild, a feud between two
towns, a caravan's bales to carry before a day, something stolen, and the kinds that can also be great troubles.

What each asks:
- **The great beast**: kill it in its den, bring its horn home.
- **Held captive**: kill the raiders at their camp, free the captive, lead them home.
- **Lost in the wild**: find them, share two measures of water, lead them home.
- **The curse**: take the blessed salt from the elder, pour it on the black stone; while the stone stands, its whole
  country is cursed (the cold bites harder, water runs out faster).
- **The sickness**: gather feverwort far away, bring it to the healer's town.
- **The feud**: hear the other town, then choose: side with one (the other will barely deal with you, and sells at
  1.6 times the price), or find the old boundary charter in a ruin and make peace (both sell to you for less).
- **The caravan**: carry heavy bales to another town by a set day, or they are worthless.
- **The cult**: kill its leader at the cult's camp, bring the sigil.
- **The siege**: kill the captain camped under the town; the warband scatters.
- **Something stolen**: kill the thief, bring back the town's bell.

**Links between plots.** When a world has a sickness and a great beast, the cure is in the beast's hoard 60% of the
time (the elder says so). A feud sets one town against you for good. Finishing a side trouble tells you of the next
town's trouble a third of the time. In a world whose great trouble is not the relic, the elder tells the relic's
story on your second talk, and carrying it home pays 60 coin instead of winning.

**In play.** The top panel follows the great trouble; Menu has a **Troubles** list with every trouble you know of
and a Follow button. The new places (a den with bones at its mouth, raiders' tents with a fire, a lean-to, a black
standing stone, a herb patch, a siege camp) are drawn and mapped, and told as you reach them. Elders mark the places
and the sure springs on the way; the great trouble gets an old road, as the relic's story does.

**Bot win rate**, sets 5 / 1000 / 2000: 26, 24, 34 (84 / 450, 19%), against 44 before. The bot plays the great
trouble whatever it is (`plotGoal`), which the curse and sickness make easier than the relic: the curse wins 37% of
its worlds, the relic 10%, the cult 7%. It never takes up side troubles.

**Commits.** "Many plots". Switch: `plots` (at creation: the relic's story alone).

**How it works.** `src/content/plots.js` describes each plot as **roles** (a place with a kind of site, a creature or
a few, a person, an item, a town, a curse) and **steps** (`talk`, `kill`, `take`, `bring`, `free`, `lead`, `use`,
`choose`), with branches after a choice. `src/rules/plots.js` knows how to place each kind of role and how each kind
of step is done; a new plot that uses them is only data. Plot state is `s.plots` (each with `step`, `roles`, `known`,
`done`), `s.track` and `s.curses`; old saves have none and play the relic as before. quest.js cannot import plots.js
(it would be a cycle), so plots.js fills `PLOT_HOOKS` in quest.js (the story town's talk, the goal line, whether the
relic wins). `tests/plots.test.js` plays every plot of 120 worlds to its end.

**Choices made without asking.**
- The old story stays in every world: many pieces hang off the locked place and the relic (odd levels, relic natures,
  the vault's artifact), and it gives a world with another great trouble a second, optional journey.
- The great trouble's places keep to the ring of regions round home, as the relic's chain does. With them up to two
  regions out, in danger-2 country, the bot won 14 / 150; with the ring, 21. Side troubles may go further.
- The great beast, the cult's leader and the siege's captain are tier 2 elders, not tier 3: at tier 3 the bot won 1
  beast world in 30.
- Water for every plot: sure springs every seven tiles from the asking town to each place, marked when the elder
  tells you. Without them thirst killed the bot on almost every plot leg.
- Side troubles pay 20 to 45 coin and 60 experience; coin will have more uses with the economy (next).

**Verdict: pearl.** It changes what a world is about. The relic is now a third of the game, and the other troubles
make the other towns matter.

## C3.3: more towns

**What it is.** A world now has other towns besides the town of the story: one more for about every four or five
regions (one to five), never at home and never two in one region. Each is made the same way as the first: its own
name, elder and merchant, a shop, a size from hamlet to city with its own services and lessons, its own culture
(traders, smiths, herbalists...) and its own streets. You walk into it from any side like the first. Its elder has
news and, until you have heard the story, sends you to the town that knows what the land needs, and marks it.

**In play.** The far country has somewhere to go: a bed, a shop and a healer two regions from the story's town. Bot
does not visit them, but the extra towns' shops roll items from the play stream, which reshuffles later dice: sets
5 / 1000 / 2000 give 14, 12, 18 (44 / 450, 10%), against 53 before; within the swing between seed sets, and above the
floor. This is the ground for the plots (next).

**Commits.** "More towns". Switch: `moretowns` (at creation).

**How it works.** `s.town` stays the story's town (area `'town'`); the others are in `s.towns`, each with an `id`
(`t_<region>`, also its area id) and `area` (its region). `curTown(s)` is the town you are in (or the one in your
region); the shop, inn, elder, services and the cultures' talk all use it. `withTown(s, t, fn)` runs code written for
the one town with `s.town` (and `s.townCulture`) standing for another, which is how a new town gets its size,
services, culture (`TOWN_MAKERS` in hooks.js) and streets without copying any of that code. Extra towns' random
streams carry their id, so the story town's streets are unchanged in every existing world. The view draws every town
among the nine regions and lets you walk into the one in your region (`V.townId`).

**Choices made without asking.** An elder of another town does not tell the story; the story belongs to the first
town. A new town never stands within seven tiles of the beast with the key or a lair's keeper.

**Verdict: pearl.** A prerequisite that is also a feature.

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
