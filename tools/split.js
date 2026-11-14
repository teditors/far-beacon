// One-off migration tool: splits the legacy single-file sources into ES modules with explicit imports.
// Kept in the repo as a record of how the split was made. It is not part of the build.
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

const ROOT = path.join(__dirname, '..');
const GLOBALS = new Set(
  'window document localStorage Math JSON Object Array Number String Boolean Date Infinity NaN undefined console performance requestAnimationFrame setTimeout clearTimeout THREE globalThis isFinite parseInt parseFloat Error Set Map Float32Array Uint8Array arguments navigator matchMedia'.split(
    ' ',
  ),
);

function lines(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
}
const dedent = (ls) => ls.map((l) => (l.startsWith('  ') ? l.slice(2) : l));

// Replace references to shared mutable top-level variables with V.name, using the parser so names inside strings,
// property keys and member names are untouched.
function rewriteShared(text, names) {
  const ast = acorn.parse(text, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true });
  const hits = [];
  walk.simple(ast, {
    Identifier(n) {
      if (names.includes(n.name)) hits.push(n);
    },
  });
  hits.sort((a, b) => b.start - a.start);
  for (const n of hits) text = text.slice(0, n.start) + 'V.' + n.name + text.slice(n.end);
  return text;
}

function topNames(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  const out = [];
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') out.push(st.id.name);
    if (st.type === 'VariableDeclaration') for (const d of st.declarations) out.push(d.id.name);
  }
  return out;
}
function localNames(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  const out = new Set();
  walk.full(ast, (n, st, type) => {
    if (type === 'VariablePattern' && n.type === 'Identifier') out.add(n.name);
    if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') && n.id) out.add(n.id.name);
    if (n.type === 'CatchClause' && n.param && n.param.type === 'Identifier') out.add(n.param.name);
  });
  return out;
}
function usedNames(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  const out = new Set();
  walk.simple(ast, {
    Identifier(n) {
      out.add(n.name);
    },
  });
  return out;
}

// modules: [{ file, ranges: [[from, to], ...] (1-based, inclusive), head }]
function emit(srcLines, modules, extra) {
  const bodies = modules.map((m) => dedent(m.ranges.flatMap(([a, b]) => srcLines.slice(a - 1, b))).join('\n'));
  const declared = modules.map((m, i) => topNames((m.prelude || '') + '\n' + bodies[i]));
  const owner = {};
  modules.forEach((m, i) => declared[i].forEach((n) => (owner[n] = m.file)));
  Object.assign(owner, extra.owners || {});
  const problems = [];
  modules.forEach((m, i) => {
    const used = usedNames(bodies[i]);
    const imports = {};
    for (const n of used) {
      if (declared[i].includes(n)) continue;
      const o = owner[n];
      if (!o) continue;
      if (o === m.file) continue;
      (imports[o] = imports[o] || []).push(n);
    }
    const head = Object.keys(imports)
      .sort()
      .map((o) => {
        let rel = path.relative(path.dirname(m.file), o).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        return `import { ${imports[o].sort().join(', ')} } from '${rel}';`;
      })
      .join('\n');
    const exp = declared[i].length ? `\nexport { ${declared[i].join(', ')} };\n` : '\n';
    const text = (m.comment ? m.comment + '\n' : '') + head + (head ? '\n\n' : '') + (m.prelude ? m.prelude + '\n' : '') + bodies[i].trim() + '\n' + exp;
    fs.mkdirSync(path.dirname(path.join(ROOT, m.file)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, m.file), text);
    // anything used, not declared anywhere, and not a known global is probably a mistake
    const loc = localNames(bodies[i]);
    for (const n of used) if (!owner[n] && !GLOBALS.has(n) && !loc.has(n) && !(extra.locals || []).includes(n)) problems.push(m.file + ': ' + n);
  });
  return problems;
}

module.exports = { lines, rewriteShared, emit, topNames, usedNames };
