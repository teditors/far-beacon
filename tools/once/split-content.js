// One-off: split CONTENT into themed data files. Each file exports a plain object; index.js merges them.
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'legacy/content.js'), 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2022 });
const obj = ast.body[0].declarations[0].init;
const groups = {
  'tuning.js': ['tun', 'offer', 'slots', 'value'],
  'characters.js': ['abilities', 'races', 'classes'],
  'biomes.js': ['biomes'],
  'gods.js': ['gods'],
  'peoples.js': ['civ'],
  'creatures.js': ['creature'],
  'items.js': ['bases', 'flasks', 'affixes'],
  'quest.js': ['town', 'quest'],
};
const where = {};
for (const f in groups) for (const k of groups[f]) where[k] = f;
const parts = {};
let prevEnd = obj.start + 1;
for (const p of obj.properties) {
  const text = src.slice(prevEnd, p.end).replace(/^,?\s*\n/, '');
  prevEnd = p.end + 1;
  const f = where[p.key.name];
  if (!f) throw new Error('unassigned key ' + p.key.name);
  (parts[f] = parts[f] || []).push(text.replace(/^\s*,/, ''));
}
const titles = {
  'tuning.js': 'Tuning numbers, equipment slots and item values.',
  'characters.js': 'Ability scores, races and classes.',
  'biomes.js': 'Biomes: climate, ground types, colours and creature names.',
  'gods.js': 'Gods and their pacts.',
  'peoples.js': 'Lost peoples: the five trait menus.',
  'creatures.js': 'Creatures: forms, temperaments and the rare slot.',
  'items.js': 'Item bases, mystery flasks and affixes.',
  'quest.js': 'Towns and the parts the quest is rolled from.',
};
for (const f in parts) {
  const body = parts[f].map((t) => t.replace(/\s+$/, '')).join(',\n');
  fs.writeFileSync(path.join(ROOT, 'src/content', f), `/* ${titles[f]} */\nexport default {\n${body},\n};\n`);
}
const names = Object.keys(groups).map((f) => f.replace('.js', ''));
fs.writeFileSync(path.join(ROOT, 'src/content/index.js'),
  `/* CONTENT: every biome, people, god, creature, item and quest part is data. Adding an entry needs no code change.\n   Each file below holds one theme; this file merges them into the single CONTENT object the rules read. */\n` +
  names.map((n) => `import ${n} from './${n}.js';`).join('\n') +
  `\n\nexport const CONTENT = Object.assign({}, ${names.join(', ')});\n`);
