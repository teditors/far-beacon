# The eighth commission: character

This branch, `commission/8`, is Andrew's eighth commission. The first seven were merged into `main` as v0.12 to v0.18
(commission 7 without its ink lines in other worlds, which Andrew removed). His verdict after playing v0.18: **the
graphics lack character.** This commission is about giving the world character: surfaces you can tell apart at a
glance, made things that look made, rooms that look lived in, and a High level that is pushed much further.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, including
"How features are built: pieces" and `ART.md`. Read `JOURNAL.md` first; carry it on under "Commission 8", newest first.

For each part below, Andrew asks you to think about similar improvements and go beyond his suggestions.

## 1. Surfaces with character

- **No visible tiling.** On open fields especially, the repeat of the ground textures is very obvious. Break it up:
  for example, sample at two or more scales, rotate or offset per patch, blend by large-scale noise, scatter
  variation (patches of darker grass, bare earth, flowers, stones), and vary colour across the land.
- **More distinct surfaces.** Grass, earth, sand, rock, snow, mud, gravel, stone paving, wood, thatch and water should
  be easy to tell apart at a glance. The look is cartoony, so exaggerate the differences, artfully: in colour, in the
  size and shape of the pattern, in edges. This should help the player read the world and also give it character.
- **Roads that look made.** A road should be clearly different from the land around it: relatively narrow, with a
  border or edge (kerb stones, a ditch, a verge of trodden grass, wheel ruts), and obviously built, not wild. Different
  kinds by culture and age: a paved road, a cobbled street, a dirt track, an old road of the lost people half-buried.
- **Made things generally.** Walls, fences, bridges, stairs, field boundaries, wells and other built things should read
  as made: straight edges, joints, regular patterns, a material you can name.

## 2. Interiors that make sense

Commission 7 was a good start; now think about **what each room is for** and furnish it by function.

- **A dwelling** has a bedroom, a kitchen and an eating area, and perhaps a workroom, a store or a hearth room, sized
  and furnished by the household's wealth, trade and culture. **Other buildings** have rooms whose purposes make sense
  for the kind of place: a shop has a counter, stock and a store-room; an inn has a common room, a kitchen and
  bedrooms; a smithy a forge; a temple an altar, a nave and a vestry; a hall a meeting room; a library its stacks.
- **Inhabited places** hold useful, well-kept things. **Abandoned places** (ruins, empty houses, dungeons, wrecks) hold
  mostly broken, dusty or rotten versions, with an occasional surviving or valuable piece. **Religious places** hold
  religious things, fitting this world's god. Placement should follow function too: beds against walls, a table with
  chairs round it, pots by the hearth, tools by the workbench, not things scattered at random.
- **An expanded list of things, with variants of each**: several kinds of bed, table, chair, chest, pot, lamp, book,
  tool and so on, differing by wealth, culture, condition and age, in the art style.

## 3. Push High much further

Andrew finds High still has a lot of headroom on his Pixel 9 and wants it pushed much more. Spend that headroom where it
shows most: richer ground and surface detail, more and better plants, finer models and more of them, better light and
shadow, water, weather, and the finish. Keep Low and Medium as they are or cheaper, and keep everything inside the
art direction. Record the numbers on each level as before.

## 4. Bugs

- **The traveller at the fire:** meeting a traveller at a campfire offers to listen to their story, but pressing
  "Yes" does nothing. Make it work (and check the other dialogue choices of that kind).
- **Small towns that are only a menu:** some small towns are just a few buildings you cannot enter, plus a menu. Make
  them real places like other towns: dwellings and buildings you walk into, furnished as in part 2, with the town's
  services where they belong.

## Guardrails

- Pieces with switches, as CLAUDE.md describes, so each change can be compared on and off.
- Save-format changes need a migration and fixtures, so Andrew's current game keeps loading.
- The bot's win rate stays at or above 8% over three seed sets of 150 worlds, every piece on.
- Update the pictures in `docs/look/` (before and after: an open field, a road, a town street, a dwelling's rooms, a
  ruin's rooms, a temple), so Andrew can see the changes on his phone.
- `node tools/check.js` passes before every commit.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls, outside services or downloaded assets.

## Git on this branch

- Commit to `commission/8` only. Never commit to or push `main`, and never push `version/*` branches.
- Merge `main` into `commission/8` at the start of each session and before each large piece.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/
- For parallel sessions, give each its own branch off `commission/8` (`commission/8-<piece>`) and merge it back.
- For a long run, start a new session part way rather than letting one grow very long: read `JOURNAL.md` and carry on.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 8" part of `JOURNAL.md`: the pieces in order, the numbers before and
after, your three best, what you would do next, and a CHANGELOG row for the merge into `main`.
