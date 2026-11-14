// Runs the one-off split. See split.js.
const S = require('./split');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ---------- rules ----------
const R = S.lines('legacy/rules.js');
const rm = (file, ranges, comment, prelude) => ({ file: 'src/rules/' + file, ranges, comment, prelude });
const rulesModules = [
  rm('core.js', [[8, 50]], '/* Core: constants, lookups, seeded randomness, events and the clock. Everything else builds on this. */',
    "const C = CONTENT,\n  W = 36,\n  H = 36,\n  VERSION = 6,\n  START = 6 * 60;"),
  rm('civ.js', [[51, 115]], '/* The lost people of a world: five rolled traits, revealed one at a time. */'),
  rm('map.js', [[116, 137], [1612, 1666]], '/* Questions about the map: where you are, what stands here, directions, and what you can see. */'),
  rm('character.js', [[138, 265]], '/* Characters: rolling, race and class, setting out, and the next traveller after a death. */'),
  rm('equipment.js', [[266, 303]], '/* Equipment slots. Gear works only while worn. */'),
  rm('progress.js', [[304, 350]], '/* Levels, hit points, mana and experience. */'),
  rm('combat.js', [[351, 679]], '/* Creatures and turn-based combat. */'),
  rm('quest.js', [[680, 1055]], '/* The rolled quest, the town and the locked place. */'),
  rm('items.js', [[1056, 1117], [1305, 1306], [2363, 2426]], '/* Items: generation, names, weight and descriptions. */'),
  rm('stats.js', [[1118, 1207]], '/* The modifier stack (Lego rule 3). Every number passes through stat(). */'),
  rm('systems.js', [[1208, 1304], [1307, 1316]], '/* Systems that run as time passes (Lego rule 4: each can be switched off). */'),
  rm('worldgen.js', [[1317, 1611]], '/* World generation. */'),
  rm('actions.js', [[1667, 2362]], '/* Everything the player can do outside a fight. */'),
  rm('index.js', [[2427, 2570]], '/* The public face of the rules. The view and the tests use only this object. */'),
];
let probs = S.emit(R, rulesModules, { owners: { CONTENT: 'src/content/index.js' }, locals: ['INTRO_EXTRA'] });
// index: export the api object
let idx = fs.readFileSync(path.join(ROOT, 'src/rules/index.js'), 'utf8');
idx = idx.replace(/\nexport \{ api \};\n$/, '\nexport const Rules = api;\nexport default api;\n');
fs.writeFileSync(path.join(ROOT, 'src/rules/index.js'), idx);
console.log('rules problems:', probs);

// ---------- view ----------
let G = fs.readFileSync(path.join(ROOT, 'legacy/game.js'), 'utf8');
G = S.rewriteShared(G, ['S', 'terrain', 'blockedUntil', 'locked']);
fs.writeFileSync(path.join(ROOT, 'legacy/game.rewritten.js'), G);
const GL = G.split('\n');
const vm = (file, ranges, comment, prelude) => ({ file: 'src/view/' + file, ranges, comment, prelude });
const viewModules = [
  vm('ctx.js', [[3, 6], [11, 43]], '/* Shared view context: constants, small helpers, and the state every view module reads (V). */',
    "const V = { S: null, terrain: null, blockedUntil: 0, locked: false };\nconst P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, walked: 0 };"),
  vm('terrain.js', [[49, 161]], '/* Turns the rules map into a continuous height field. */'),
  vm('scene.js', [[162, 615]], '/* The 3D scene: lights, models, and the static and moving parts of the world. */'),
  vm('run.js', [[616, 791]], '/* Run control: saving, starting, acting, and the per-frame loop. */'),
  vm('ui.js', [[792, GL.length - 2]], '/* HUD, panels and screens, input and start-up. */'),
];
// fix declarations of the shared names before splitting
probs = S.emit(GL, viewModules, { owners: { Rules: 'src/rules/index.js', V: 'src/view/ctx.js' } });
console.log('view problems:', probs);
