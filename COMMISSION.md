# The fifth commission: how the game looks and sounds

This branch, `commission/5`, is Andrew's fifth commission. The first four were merged into `main` as v0.12 to v0.15. Up
to now the rule has been "gameplay first, looks last". This commission is the first one about looks: a substantial pass
through every visual in the game, plus sound and music.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies. Read
`JOURNAL.md` first; carry it on under "Commission 5", newest first.

**Game rules are out of scope.** Change `src/rules/` only where the view truly needs something it cannot get (a field
for a building's style, say), and say so in the journal. Gameplay work and playtesting fixes may be happening on `main`
while you work; see Git below.

## The look Andrew wants

- **Roughly 2005-era game graphics and animation, stylized rather than realistic.** A cartoonish, painterly or
  storybook look ages better than near-realism and avoids the uncanny. Pick one coherent style and hold every part of
  the game to it. Describe the style in a few lines at the top of your journal so later work can follow it.
- **Better models for everything**: trees and plants, people, creatures, and above all architecture.
- **Smooth land.** The landscape should no longer show the triangles it is made of.
- **Serviceable textures** for each kind of surface: grass, sand, snow, rock, mud, water, stone, wood, thatch, cloth.
- **Ruins with character.** Each lost people (style, habit, age, doom) should leave ruins you could tell apart:
  their building style, what decay did to them, the sign of their doom.
- **Towns with culture.** A town's look should follow its culture, trade and custom: what it is built of, its roofs,
  its colours, its banners, what stands in its streets. A merfolk hall, a cloud city and a hamlet should not look like
  the same kit of boxes.
- **Natural movement.** People and creatures should walk, turn, idle and fight in a way that reads as alive:
  procedural animation (limbs swinging, a body that bobs and leans, a head that turns) is enough.
- **Lighting matters most.** A clear sun direction, soft sky light, shading that shows the shape of the land and of
  buildings, warm firelight and lanterns at night, fog that gives depth. Cheap tricks first (baked or vertex shading,
  hemisphere light, a single directional light); real-time shadows only if they are affordable, and only on High.

## Triage: cost against benefit

The game must still run comfortably in a browser on Andrew's phone (a Pixel 9). Use the performance meter and
`tools/bench.py`, and measure every change.

- **Do first** whatever gives a big visible gain for little cost: smooth shading of the ground, a consistent palette,
  better lighting and fog, simple generated textures, better silhouettes for trees and buildings, simple animation.
- **Do later, and only if the numbers allow**: shadows, many more triangles, post-processing, large textures.
- **Every heavy improvement sits behind the graphics quality setting.** Low should stay as cheap as it is now or
  cheaper. Medium, the default, should look clearly better than today at about today's cost.
- **Keep the game one file.** Generate textures and models in code (canvas, geometry built from parts, instancing)
  rather than shipping image or model files. If a small embedded asset is truly worth it, say why in the journal.
  Keep `dist/index.html` under about 2 MB.
- **Record before-and-after numbers** for each step in the journal: draw calls, triangles, frame time, build time and
  file size, on Low, Medium and High.

## Sound and music

Give the game sound, generated in the browser with the Web Audio API (no audio files unless one is truly worth it).

- **A soundtrack.** A simple, thematically fitting generative score: quiet and spacious, suited to a lonely survival
  journey. It should change with where you are and what is happening: the biome, day and night, a town, underground,
  the sky, the sea, a fight, a storm. Original music only: no tunes from existing games, films or songs.
- **Sounds of the world**: wind, rain, footsteps on different ground, water, fire, a town's bustle, creatures, combat,
  and the interface.
- Sound starts only after the player's first tap (phones require that), has volume settings for music and effects,
  can be muted, and costs little processor time. Put it behind a switch like any piece.

## Your own judgement

Andrew trusts your judgement. Decide the order and the details, and do anything else that makes the game nicer to look
at and listen to. Fix visual bugs you find on the way.

## Freedom and guardrails

- Larger restructures of `src/view/` are allowed.
- Pieces with switches where it makes sense (sound, animation, a new building kit), so each can be compared on and off.
- `node tools/check.js` passes before every commit. The browser smoke test must keep working; add screenshots of the
  new look to its run (`--shots`) so changes can be seen.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls and no outside services or downloaded assets.

## Git on this branch

- Commit to `commission/5` only. Never commit to or push `main`, and never push `version/*` branches.
- Gameplay fixes may land on `main` while you work. **Merge `main` into `commission/5` often** (at least at the start of
  each session and before each large piece), so the branch never drifts far and the final merge is easy.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/ so Andrew can see your latest work on his phone.
- For parallel sessions, give each its own branch off `commission/5` (`commission/5-<piece>`) and merge it back when
  its checks pass.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 5" part of `JOURNAL.md`: the style you chose, the pieces in order, the
numbers before and after, your three best, what you would do next, and a CHANGELOG row for the merge into `main`. If
you are picked up again, read the journal first and carry on where it ends.
