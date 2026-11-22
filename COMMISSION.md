# The seventh commission: rooms full of things

This branch, `commission/7`, is Andrew's seventh commission. The first six were merged into `main` as v0.12 to v0.17;
commission 6 gave the game its art direction (`ART.md`). This one has three parts: some visual fixes Andrew found while
playing on his phone, more music, and the main work: **building interiors full of ordinary things**.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, including
"How features are built: pieces" and `ART.md`. Read `JOURNAL.md` first; carry it on under "Commission 7", newest first.

## 1. Visual fixes (do these first)

Andrew plays on a Pixel 9 in Chrome. See `docs/bugs/c7-townsperson-outlines.jpg`.

- **Townspeople's outlines (the important one).** Up close, a townsperson has fat dark outlines around the body, the
  hood or hair reads as a dark shell around the head, and the face shows a dark hexagonal mask around the eyes and the
  nose. It looks like the outline pass from commission 6 (C6.4) is being drawn around every small part, including the
  face's own parts, and is far too thick at close range. Outlines should be thin at every distance, follow only the
  outside of the figure (or its main parts), never draw on the face, and never read as a mask or a shell. There is
  also a stray thin diagonal line at the left edge of the screenshot. Check creatures and other people the same way.
- **Shimmering at a distance.** Distant objects, usually trees, shimmer and crawl as the camera moves. Probably thin
  geometry, outlines or texture detail that is smaller than a pixel far away. Fade outlines and fine detail out with
  distance, and use mipmaps and simpler far versions where needed.
- **Black boxes in the distance.** Far-off points of interest (sites, buildings, landmarks) appear as clear black boxes
  instead of fading into the air like the land around them. Something about them is skipping the fog or the look's
  distance fade (a material without fog, an outline, a far stand-in). Everything should fade with distance the same way.

Add screenshots of the fixes to `docs/look/`, before and after, including a townsperson up close.

## 2. More music

- Add a **harpsichord** voice and **Baroque-style** pieces (ornamented melodies, a walking bass, simple counterpoint,
  dances like a minuet, sarabande or gigue). It suits the game's old-world, storybook feel. Towns, halls, temples,
  libraries and the homes of the wealthy are natural places for it.
- **Different tunes for different places and events**: each kind of town, each biome by day and night, dungeons,
  the sky, the sea, other worlds, combat, storms, discoveries, a win and a death. Tunes should be recognisable, so
  places get a musical identity, while still varying so they do not wear thin.
- Original music only, generated in the browser as now. Keep it cheap on the processor.

## 3. The main work: interiors full of things

### Buildings you can go into

Houses, shops, the inn, the elder's hall, temples, smithies, stables, and the buildings of other kinds of town (merfolk
halls, cloud cities, floating towns, the unfallen town) should have **interiors you can walk into**, with rooms that
suit what the building is and who lives there. Entering and leaving should be as seamless as the town itself (no menu,
no jump), following the same principle: the rules keep the interior as its own small map, and the view stitches it.

### Things in them

Create a good number of **mundane objects**, in the art style, and distribute them sensibly:

- Furnishings: beds, tables, chairs, benches, chests, shelves, hearths, barrels, crates, rugs, curtains.
- Tools and household things: pots, pans, kettles, cups, plates, jugs, candles, lamps, brooms, buckets, spinning
  wheels, looms, anvils, hammers, tongs, saws, scythes, nets.
- Decorations and personal things: books, scrolls, maps, paintings, tapestries, vases, dolls, toys, musical
  instruments, statuettes, holy symbols, keepsakes.
- Things of each trade and culture: a smith's tools in the smithy, herbs drying at the healer's, nets and floats in a
  fishing town, the lost people's own wares in the unfallen town.

What a room holds should follow from the building, the trade, the town's culture and climate, its wealth, and the
world's year. A poor hamlet's house and a city merchant's house should not look the same.

**Other indoor spaces get things too**: ruins, caves, dungeon levels (by theme: a crypt has urns and bones, a mine has
carts and picks), the locked place, wrecks, sea caves, sky castles, and other worlds' places. Abandoned places hold
broken, dusty, older versions.

### Picking things up

- The player can **pick up** these objects, mostly for immersion. They have weight, so the carry limit applies, and
  little practical value: some can be sold for a coin or two, a few may be useful (a candle burns, a jug holds a little
  water), most are just things.
- **In someone's house or shop, taking is theft.** For now keep it simple: a message window saying you were seen and
  made to put it back. Make this its own piece, with a switch, so a real crime system can replace it later.
- **In abandoned buildings, ruins, dungeons and the wild, things can be taken freely.** Some are **secretly valuable**:
  they look ordinary until appraised in a town (a dull ring that is old gold, a cracked bowl of rare make, a book
  someone would pay well for). Tie this into the existing item and appraisal rules, and into the lost people's style
  where it fits (their wares, their marks).
- A dropped object stays where it was dropped, as items already do.

### Memory and saves

There could be thousands of objects in a world. Do not store them all: generate a room's objects from the seed when it
is built, and store only what the player has taken, moved or dropped. Measure the save size and memory before and
after, as earlier commissions did, and keep the game comfortable on a phone.

### Models

Make the objects in code, in the art style: simple strong shapes, soft bands, thin outlines only where `ART.md` says.
Many small objects in a room can be costly, so instance them, merge them, and drop detail at a distance. Record the
draw calls and triangles of a full room on each quality level.

## Your own judgement

Andrew trusts your judgement. Decide the order and the details, and fix anything you find broken on the way.

## Guardrails

- Pieces with switches, as CLAUDE.md describes. Interiors, objects, theft and secret value are natural separate pieces.
- Save-format changes need a migration and fixtures, so Andrew's current game keeps loading.
- The bot's win rate stays at or above 8% over three seed sets of 150 worlds, every piece on.
- `node tools/check.js` passes before every commit; the browser test walks into a house and picks something up.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls, outside services or downloaded assets.

## Git on this branch

- Commit to `commission/7` only. Never commit to or push `main`, and never push `version/*` branches.
- Merge `main` into `commission/7` at the start of each session and before each large piece.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/
- For parallel sessions, give each its own branch off `commission/7` (`commission/7-<piece>`) and merge it back.
- For a long run, start a new session part way rather than letting one grow very long: read `JOURNAL.md` and carry on.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 7" part of `JOURNAL.md`: the pieces in order, the numbers before and
after, your three best, what you would do next, and a CHANGELOG row for the merge into `main`.
