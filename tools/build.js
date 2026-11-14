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
// The version shown in Menu: the latest tag, plus how many changes since it (e.g. "v0.7" or "v0.7 +2").
function versionLabel() {
  try {
    const d = require('child_process').execSync('git describe --tags --long --dirty', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = d.match(/^(.*)-(\d+)-g[0-9a-f]+(-dirty)?$/);
    if (!m) return d;
    return m[1] + (m[2] !== '0' ? ' +' + m[2] : '') + (m[3] ? ' (unsaved changes)' : '');
  } catch (e) {
    return 'unversioned';
  }
}
function buildPage() {
  const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, format: 'iife', target: 'es2020', banner: { js: '"use strict";' }, write: false, logLevel: 'error' });
  const js = out.outputFiles[0].text;
  if (js.includes('</script')) throw new Error('bundle contains a closing script tag');
  const shell = fs.readFileSync(path.join(ROOT, 'src/shell.html'), 'utf8');
  const html = shell.replace('/*BUNDLE*/', () => js).replace('__VERSION__', versionLabel());
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
