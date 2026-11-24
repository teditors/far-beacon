// The player-facing text of the game, as far as it can be gathered without a browser (commission 9's theme test):
// every string in content, the string literals of the rules and of the view's screens (ui.js, shell.html), and the
// log of a few played worlds. Each list is of plain strings; what is code, an id or a colour is left out.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Words that never make a sentence: ids, css, shader code, keys.
const codey = (t) =>
  /[;{}<>=\\]|=>|\bvec[234]\b|gl_|^#|^\.|px\b|%$|^\w+\(|\$\{|^[a-z]+[A-Z]\w*$|^[a-z0-9_.:#/+-]+$|^[A-Z_0-9]+$|^https?:/.test(t);
const wordy = (t) => /[A-Za-z]{3}/.test(t) && (/ [a-z]/.test(t) || /^[A-Z][a-z]+/.test(t)) && !codey(t);

function literals(src) {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src))) {
    let t = m[1] != null ? m[1] : m[2] != null ? m[2] : m[3];
    t = t.replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (m[3] != null) {
      if (/\n/.test(t)) continue; // shader code and long templates
      for (const piece of t.split(/\$\{[^}]*\}/)) if (wordy(piece.trim())) out.push(piece.trim());
      continue;
    }
    if (wordy(t.trim())) out.push(t.trim());
  }
  return out;
}
// Strings in content (C), with the keys that are never shown left out.
function contentStrings(C) {
  const out = [],
    seen = new Set();
  const skip = new Set([
    'id',
    'kind',
    'form',
    'stat',
    'key',
    'mode',
    'voice',
    'dance',
    'kit',
    'shape',
    'climate',
    'base',
    'ground',
  ]);
  const walk = (o, key) => {
    if (o == null) return;
    if (typeof o === 'string') {
      if (!skip.has(key) && wordy(o)) out.push(o);
      return;
    }
    if (typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const k in o) walk(o[k], Array.isArray(o) ? key : k);
  };
  for (const k in C) if (k !== 'themes' && k !== 'looks' && k !== 'music') walk(C[k], k);
  return out;
}
function viewStrings() {
  const out = literals(fs.readFileSync(path.join(ROOT, 'src/view/ui.js'), 'utf8'));
  const shell = fs
    .readFileSync(path.join(ROOT, 'src/shell.html'), 'utf8')
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '');
  for (const m of shell.matchAll(/>([^<>]+)</g)) if (wordy(m[1].trim())) out.push(m[1].trim());
  return out;
}
function rulesStrings() {
  const dir = path.join(ROOT, 'src/rules'),
    out = [];
  for (const f of fs.readdirSync(dir))
    if (f.endsWith('.js') && f !== 'theme.js') out.push(...literals(fs.readFileSync(path.join(dir, f), 'utf8')));
  return out;
}
module.exports = { contentStrings, viewStrings, rulesStrings, literals };
