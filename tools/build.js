// Build: bundles src/ into one self-contained dist/index.html, and the rules alone into build/rules.cjs for the tests.
// Usage: node tools/build.js
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function buildRules() {
  esbuild.buildSync({ entryPoints: [path.join(ROOT, 'src/rules/index.js')], bundle: true, format: 'cjs', platform: 'node', banner: { js: '"use strict";' }, outfile: path.join(ROOT, 'build/rules.cjs'), logLevel: 'error' });
  return path.join(ROOT, 'build/rules.cjs');
}
function buildPage() {
  const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, format: 'iife', target: 'es2020', banner: { js: '"use strict";' }, write: false, logLevel: 'error' });
  const js = out.outputFiles[0].text;
  if (js.includes('</script')) throw new Error('bundle contains a closing script tag');
  const shell = fs.readFileSync(path.join(ROOT, 'src/shell.html'), 'utf8');
  const html = shell.replace('/*BUNDLE*/', () => js);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);
  return { file: path.join(ROOT, 'dist/index.html'), bytes: html.length };
}
module.exports = { buildRules, buildPage };
if (require.main === module) {
  buildRules();
  const p = buildPage();
  console.log('built', path.relative(ROOT, p.file), Math.round(p.bytes / 1024) + ' KB');
}
