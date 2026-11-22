# Far Beacon: the art direction

The style guide for everything drawn (commission 6). Read it before adding a building, a creature, a place or a
palette. The numbers live in `src/content/looks.js`; how they are drawn is in `src/view/` (see ARCHITECTURE.md, "The
look"). Pictures of each part of the world, before and after, are in `docs/look/`.

## In one line

**Painted atmosphere, with the best touches of toon; a clean-line comic for other worlds.** Think of *Firewatch* and
*Journey* at home: simple soft shapes in layers that fade into the air, the mood carried by colour and light. Through
a door, *Sable* and Moebius: pale flat colour, thin ink on everything, big empty skies.

## The rules

1. **Palette, light and fog do the work.** Every scene has a small palette: a sun, a shade, a sky (zenith and horizon),
   a fog, a grade. Mood comes from these, not from detail. A gold dusk, a blue night, a sickly green curse, a grey
   storm, a bleached drought.
2. **Distance is colour.** Things fade toward the fog colour (the horizon's) in soft steps (five, `toon.js`), so ridges
   stack in bands; beyond the drawn land, rings of far hills (`skyline.js`) carry the bands on to the horizon, each
   paler than the last. Nothing far is sharp; nothing near is hazy. The eye sees about 620 m by day on Medium (the drawn
   land's edge), less in wet and ashen lands and storms (`reach`), more in steppes, hot lands and other worlds.
3. **Warm light, cool shade.** The sun is warm (cream at noon, orange low); the shade is filled by the sky's light,
   cool and coloured (blue, lilac, grey-green), never black. The grade lifts the darkest darks into the look's `lift`
   colour: shade is the colour of the air.
4. **Shapes over detail.** A tree, a tower, a person, a beast must read by silhouette at 50 m on a phone. Round or
   deliberate shapes; few parts; no visible polygons on living things (smooth normals), cut facets only where they are
   the material (stone, roof tiles, rock).
5. **Textures painted or absent.** Flat colour, soft gradients, a few painterly marks made in code (`paint.js`): brick
   and plank joints, grain, blotches. Never a photograph, never a blurry stretched texture.
6. **Colour rich but not candy.** Saturation a little above life (the grade's `sat` about 1.05), never neon. It is a
   lonely survival journey: beautiful, eerie or bleak, not childish. Whites stay chalky; blacks stay coloured.
7. **Firelight is the only bright warm thing at night.** Night is deep blue (the `night` layer); lamps, windows and
   fires glow, and bloom (High and Medium) lets them bleed.

## Toon touches

- **Soft bands** on people, creatures, buildings, ruins, landmarks, trees and props (Low and up): the sun's light falls
  in three bands (shade, half, full) with soft edges; the sky's fill stays smooth under them. Other worlds: two bands,
  almost hard. The land never bands.
- **Light outlines**, thin (about 1.5 to 2 pixels) and **tinted, not black**: the dark of the thing's own colour,
  leaning toward the look's `ink`. On people and creatures (Low), buildings, ruins and landmarks (Medium), near trees
  (High). Never on the land at home. They fade out past 45 to 120 m.

## Other worlds: clean line

- Ink lines on everything, land included, found where depth jumps or bends (`post.js`), fainter with distance.
- Two hard bands, a weak sun and a strong fill (`sunK` 0.65, `fillK` 1.45): little shading, flat colour.
- Pale: saturation 0.72, the picture washed 16% toward the palette's paper colour (`wash`), a stronger paper grain.
- Big empty skies: no clouds. A palette of their own, rolled per world (peach and teal, Sable noon, mint and rose,
  lilac desert, ochre and slate, cold paper, ember and bone).
- Grass, reeds, ferns and twiggy scrub are drawn without ink (they would scribble).

## Palettes

Layers, in order (each names only what it changes, and pulls by `k`):

| Layer | Examples |
| --- | --- |
| climate by day | temperate clear and green; wet grey-green and soft; hot bleached gold, lilac shade; cold steel blue; ashen ash and ember; steppe wide and straw-gold |
| the world's turn | every colour turned in hue and saturation by the world's seed within a range per climate (one world's taiga steel blue, another's violet-grey) |
| rare look | a whole world (5%) or a country (4%): sepia, all reds, verdigris, the violet hour, ivory, indigo noon |
| another world | clean-line style and its own palette |
| the year | drought bleached, hard winter blue, long summer golden, long nights violet... |
| the great trouble | faintly everywhere (20%): tyrant iron red, plague fevered yellow, deep king violet... |
| a curse | strongly on the cursed country (75%): sickly green |
| rare country | burned ash-grey with an ember sun, hallowed gold, silent drained, glowing teal shade... |
| weather | every storm grey, then rain, snow, dust, hail, ash or star-fall |
| hour | dusk gold with a rose horizon and violet zenith; night deep blue |

**Making a palette.** Pick the mood in two words. Choose the horizon first (it is also the fog: everything far turns
to it), then a zenith of the same family but deeper (avoid a blue zenith over a yellow horizon without a pale band:
the sky shader adds one), a sun warmer than the horizon, and a shade cooler than it (a complementary nudge: gold light,
lilac shade). The lift is a very dark version of the shade; the gain a very light version of the sun. Check it with
the meter on (it names the layers) and `python3 tools/look.py`. Keep it readable: a person must stand out against the
land in it.

## Making new things

- **A building or a prop**: build it with the kit (`kit.js`), a few parts, colours in the vertices, a painted surface
  from `paint.js` if it needs one. Use `kitMat` (it bands) and add it through the town's or ruin's `add(kit, mat,
  true)` so it is outlined. Roofs and stone may be cut-faceted; walls smooth.
- **A creature**: a `creatureModel` in `actors.js` with joints; a strong silhouette (horns, a tail, a hump) matters
  more than detail; two or three colours; eyes that glow (bone 8). It is banded and outlined automatically.
- **A tree shape**: a function in `SHAPES` in `plants.js`. A crown in two or three clumps reads better than many
  leaves. If it is thin and twiggy, add its shape to the wisps (no ink in other worlds).
- **A place in the sky or under the sea**: the same kit; keep it in the look's palette (do not hard-code bright
  colours; let the light colour it).
- **A palette**: an entry in `content/looks.js` (see above). It appears in the Almanac.

## Quality levels

| Level | What it draws |
| --- | --- |
| Fallback (hidden) | the old Low: plain light, no sky, no finish, fog in steps; chosen by itself when frames stay slow |
| Low (the old High) | the look's palettes, bands, outlines on people and creatures, the finish and grade, ink in other worlds, shadows, two rings of far hills |
| Medium | Low, and outlines on buildings, ruins and landmarks, the paper grain, three rings of far hills |
| High | Medium, a finer picture (2.5 pixels per point), more land, grass and shadow detail, outlines on near trees, four rings of far hills |

Prefer techniques that cost little per pixel: colour, fog and light are free; a full-screen pass is one texture read
per pixel per tap. Measure with `python3 tools/bench.py fallback low medium high`.
