# The fourth commission: a larger world, and the tools to test it

This branch, `commission/4`, is Andrew's fourth commission. The first three were merged into `main` as v0.12, v0.13 and
v0.14, and he has been very pleased with your judgement. This one is ambitious: late-game places that expand the world
in new directions (down, up, under the water, and out into other worlds), plus the testing tools to explore them.

**The goal for this commission is the structure, not the content.** Build the foundations for each kind of place, a
few working examples of each, and the hooks for plots to use them. Then find out where the technical limits are
(memory, save size, frame rate, load time) and write them down. Filling these places with lots of content can come
later.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, in
particular "How features are built: pieces". Read `JOURNAL.md` first; carry it on under "Commission 4", newest first.

## The constraint over everything: a phone browser

The game must still run comfortably in a browser on Andrew's phone (a Pixel 9). Use the performance meter and the
benchmark from commission 3, and record numbers before and after in the journal. Watch memory in particular: these
places multiply the number of maps a world holds. Only the maps near the player should be live; the rest should be
rebuilt from the seed, or stored as what changed, as saves already are.

## 1. Testing tools (do this first)

Andrew needs to reach late-game places without playing for hours, and you need them to test what you build.

- **God mode**, switched on from the Tinker panel: the traveller is invisible to creatures, does not starve, freeze or
  tire, and has every way of moving there is (walking through anything, flying, breathing water, taking any door or
  stair). A way to jump straight to any place (a region, a town, a dungeon level, a sky island, another world) from
  the map or a list. The game should mark a world that has used god mode, so a god-mode win is not mistaken for a
  real one.
- **World-generation controls**: a "new world" screen with options, collapsed by default so ordinary play is
  unchanged. At least: the seed; world size; which races and classes may appear (and how many); how many towns; how
  many dungeons and how deep; whether sky places, underwater places and doors to other worlds appear and how often;
  which great trouble the plot uses. These should be plain settings passed into `newGame`, so the tests and the bot can
  use them too.

## 2. Dungeons

Angband-style dungeons below the world, entered from caves, ruins, buildings in towns, the locked place, and so on.

- Usually 1 to 4 levels deep. Dungeons that matter to the plot can go deeper, as deep as memory allows (find out how
  deep that is).
- A few themes for variety (a mine, a crypt, a flooded cistern, a fungus cavern, a dwarf-hold, whatever you like),
  each with its own layout style, creatures and dangers.
- Deeper means harder and richer: the most powerful artifacts and enemies tend to be here.
- The existing vault levels and the commission 1 "odd levels" should fit into this rather than stay separate.

## 3. The sky

Rare items that let you fly (boots, a cloak, a carpet, a tame beast), and perhaps rare races who fly by nature.
Places in the sky: cloud cities, floating castles, ruins on drifting islands, a moon in low orbit, and so on.

- Mostly late-game, with stronger items and enemies.
- Present in about 1 world in 4 by default (a world-generation setting).
- Sometimes part of a plot, not always.
- Think about what flying does to the rest of the game (water, cold, travel time, falling) and keep it from making
  the ground pointless.

## 4. Under the water

Sea and lake depths with their own places: merfolk towns, sea caves, wrecks. On the surface: boats and floating towns.

- Ways in: items that let you breathe water (a magical diving helm, gills, a charm), boats, and perhaps rare merfolk
  traveller races.
- Sometimes part of a plot, not always.
- The world may need real seas and large lakes for this; decide how they fit the region grid.

## 5. Other worlds

Rarely, a door to another world: a different seed from the home world, generated and visited like the home world but
stranger. Very rarely two or three doors.

- Always part of the plot: something needed is in the other world (an item, a person, the villain), so the traveller
  must go there and return.
- Other worlds roll rare traits much more often, to make them feel strange.
- Memory matters most here: the other world must not double the cost of the game. Only what the traveller has
  touched needs keeping.

## 6. The plot uses them

Any of these places can hold something the plot needs: a key or other item, an important person, or the final villain.
Extend the great troubles and side troubles from commission 3 so that steps can lead down, up, under or out, and add a
few plots that only make sense with these places (a villain in a floating castle, a cure at the bottom of a sea cave,
a lost child in another world).

## Then, your own ideas

Anything that would make these places better, or the game around them. Fix what you find broken on the way.

## Freedom and guardrails

- **Larger restructures are allowed**, including the area and map code, the save format and the view. Save-format
  changes need a migration and fixtures, so Andrew's current game keeps loading.
- **Parallel sessions are allowed** (see Git below).
- **Difficulty floor:** the bot wins at least 8% of worlds over three seed sets of 150, every piece on, with default
  world settings. Teach the bot what it needs to use the new places when a plot sends it there.
- **Record the limits.** At the end, the journal should say plainly: how deep a dungeon can go, how many places a world
  can hold, how big a save gets, and what the frame rate costs are, with numbers.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls and no outside services.

## Git on this branch

- Commit to `commission/4` only. Never commit to or push `main`, and never push `version/*` branches.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/ so Andrew can play your latest work on his phone.
- For parallel sessions, give each its own branch off `commission/4` (`commission/4-<piece>`) and merge it back when
  its checks pass.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 4" part of `JOURNAL.md`: the pieces in order, the limits you found, the
performance numbers before and after, your three best, what you would do next, and a CHANGELOG row for when this is
merged into `main`. If you are picked up again, read the journal first and carry on where it ends.
