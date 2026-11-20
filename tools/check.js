// Runs every test. Use before publishing: node tools/check.js   (add --quick to skip the slow playtest and browser test)
const { execFileSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const quick = process.argv.includes('--quick');
const steps = [
  ['build', 'node', ['tools/build.js']],
  ['content', 'node', ['tests/content.test.js']],
  ['state', 'node', ['tests/state.test.js']],
  ['fuzz', 'node', ['tests/fuzz.js']],
  ['quest', 'node', ['tests/quest.js']],
  ['pieces', 'node', ['tests/pieces.test.js']],
  ['plots', 'node', ['tests/plots.test.js']],
  ['c4', 'node', ['tests/c4.test.js']],
  ['explore', 'node', ['tests/explore.js']],
  ['almanac', 'node', ['tools/almanac.js', '--check']],
];
if (!quick) steps.push(['playtest', 'node', ['tests/playtest.js', '40']], ['browser', 'python3', ['tests/smoke.py']]);
let failed = 0;
for (const [name, cmd, args] of steps) {
  const t0 = Date.now();
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 });
    const lines = out.trim().split('\n');
    console.log('PASS ' + name.padEnd(9) + ((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's  ' + (name === 'playtest' ? lines.slice(0, 2).join(' | ') : lines.slice(-2).join(' | ')));
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + '\n' + ((e.stdout || '') + (e.stderr || '')).split('\n').slice(-15).join('\n'));
  }
}
console.log(failed ? failed + ' step(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);
