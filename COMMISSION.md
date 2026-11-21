# The sixth commission: an art direction

This branch, `commission/6`, is Andrew's sixth commission. The first five were merged into `main` as v0.12 to v0.16.
Commission 5 gave the game its first real look (the "painted storybook" pass, with sound and a score). This commission is
a major graphical overhaul, and for the first time it comes with a chosen **art direction** rather than "make it better".

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies. Read
`JOURNAL.md` first (Commission 5 in particular); carry it on under "Commission 6", newest first.

**Game rules are out of scope**, as in commission 5: change `src/rules/` only where the view needs something it cannot
get, and say so in the journal.

## The direction Andrew chose

**Painted atmosphere as the base, with the best touches of toon shading. A clean-line comic look for other worlds.**

### The base: painted atmosphere

Think of *Firewatch* and *Journey*: simple, soft shapes in layers that fade into the air, and a mood carried almost
entirely by colour and light.

- **Palette, light and fog do the work.** Each scene has a small, deliberate palette, a sun colour, a shade colour, a
  sky gradient and a fog colour, and these together set the mood: a gold dusk, a blue night, a sickly green curse, a
  grey storm, a bleached drought.
- **Distance is colour.** Things fade toward the fog colour in clear steps, so hills stack in bands, like a painting.
- **Shapes over detail.** Strong, readable silhouettes (a tree, a tower, a person, a beast) matter more than triangles.
  Polygons should not be visible as polygons: smooth or soft-banded shading, rounded or deliberate shapes.
- **Textures painted or absent.** No stretched, blurry, photo-like textures. Prefer flat colour, soft gradients, and a
  few painterly marks (brush grain, strokes, simple patterns) where a surface needs them.

### The touches of toon

- **Soft two- or three-band shading** on characters, creatures, buildings and nearby objects, so form reads clearly on a
  small screen.
- **Light outlines** on characters, creatures and nearby objects of interest (not on the land), thin and tinted rather
  than black, so things stand out without looking like a cartoon for small children.
- Keep colour rich but not candy-bright. The game is a lonely survival journey; the look can be beautiful, eerie or
  bleak, but not childish.

### Other worlds: clean-line comic

When the traveller goes through a door to another world, the look itself changes, as if stepping into another artist's
book. Think of *Sable* and the French comic artist Moebius: pale flat colours, thin ink lines on everything including
the land, big empty skies, very little shading. Other worlds may also roll stranger palettes. Andrew likes this idea
especially.

### A look that can be rolled

This is a procedural game, so the look should be too. Put the look in data, the way everything else is:

- A **look** (palette, sun, shade, sky, fog, band count, outline strength and colour, line style, grain) as content in
  `src/content/`, chosen from the biome, the time of day, the weather, the world's year, a curse or great trouble, a rare
  region, and the realm.
- Worlds and places can roll their own variations within the style: one world's taiga is steel blue and another's is
  violet-grey. Rare looks are welcome (a world in sepia, a country that is all reds), as long as they stay readable.
- The look is a piece: it has a switch, its menus appear in the generated Almanac, and it is tested.
- Write `ART.md`: a short style guide (the rules above, the palettes, what outlines go on, how far fog reaches, how a new
  building or creature should be made), so later work follows the same style.

## Quality levels and the phone

Andrew says today's **High runs with no problem on his Pixel 9**, so today's High becomes the new **minimum** level.
Above it, build new Medium and High levels for the new look.

- Keep one hidden fallback below that (today's Low or similar) for weak devices, and switch to it automatically if the
  frame rate stays poor for a while, with a note to the player.
- Watch browser limits: texture size, memory, shader compile time, and above all heat and battery over a long session.
  Prefer techniques that are cheap per pixel: much of this style is colour and fog, which cost almost nothing.
- Measure every step with `tools/bench.py` and the meter, and record the numbers in the journal. Keep the game one file,
  with textures and models made in code, and `dist/index.html` under about 2.5 MB.

## So Andrew can see it

Andrew reviews on his phone. Besides the playable copy on the site, commit a small set of screenshots of the new look to
`docs/look/` (JPEG, a few hundred KB in all): each biome by day and night, a town of each kind, a ruin, a dungeon, the sky,
the sea and another world, before and after. Update them at the end. Add a `docs/look/README.md` listing them.

## Your own judgement

Andrew trusts your judgement. Decide the order and the details. Sound and music may be adjusted to suit the new look
where it helps. Fix visual bugs you find on the way.

## Guardrails

- Larger restructures of `src/view/` are allowed.
- `node tools/check.js` passes before every commit; the browser test keeps working and photographs the new look.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls, outside services or downloaded assets.

## Git on this branch

- Commit to `commission/6` only. Never commit to or push `main`, and never push `version/*` branches.
- Gameplay fixes may land on `main` while you work. Merge `main` into `commission/6` at the start of each session and
  before each large piece.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/
- For parallel sessions, give each its own branch off `commission/6` (`commission/6-<piece>`) and merge it back when its
  checks pass.
- For a long run, start a new session part way rather than letting one grow very long: read `JOURNAL.md` and carry on.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 6" part of `JOURNAL.md`: the style as built, the pieces in order, the
numbers before and after, your three best, what you would do next, and a CHANGELOG row for the merge into `main`.
