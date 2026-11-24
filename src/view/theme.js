/* The theme on screen (commission 9). One place turns every word the player reads into the theme's words: a watcher
   on the page that catches each piece of text as it is shown (the HUD, the log, every panel and button, the page's
   title, placeholders and labels) and puts the theme's words in its place, keeping the original beside it, so that
   turning the theme off puts every word back. The words come from the rules (`R.themed`, content/feline.js); the
   screens never need to know a theme exists.

   syncTheme() is called after every render: when the world's theme has changed (chosen in Settings or on the new
   world screen, rolled, or a run loaded) it turns or restores every word on the page, sets TH.id for the models and
   sounds, marks the page (body.theme-feline: paw prints and a pink trim, in shell.html) and asks for the scene to be
   rebuilt (onThemeChange). */
import { R, V } from './ctx.js';
import { TH } from './themeflag.js';

const ORIG = new WeakMap(); // text node -> { orig, shown }
const ATTRS = ['placeholder', 'title', 'aria-label'];
const AORIG = new WeakMap(); // element -> { attr: { orig, shown } }
let observer = null,
  baseTitle = null;
const listeners = [];
const onThemeChange = (fn) => listeners.push(fn);
const T = (text) => (TH.id ? R.themed(text, TH.id) : text);

const skip = (n) => {
  const p = n.nodeType === 3 ? n.parentNode : n;
  return !p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest('[data-notheme]'));
};
function turnText(n) {
  if (skip(n)) return;
  const v = n.nodeValue;
  let rec = ORIG.get(n);
  if (rec && v === rec.shown) return;
  if (!rec) ORIG.set(n, (rec = {}));
  rec.orig = v;
  rec.shown = T(v);
  if (rec.shown !== v) n.nodeValue = rec.shown;
}
function turnAttrs(e) {
  if (!e.getAttribute || skip(e)) return;
  for (const a of ATTRS) {
    if (!e.hasAttribute(a)) continue;
    const v = e.getAttribute(a);
    let recs = AORIG.get(e);
    if (!recs) AORIG.set(e, (recs = {}));
    const rec = recs[a] || (recs[a] = {});
    if (v === rec.shown) continue;
    rec.orig = v;
    rec.shown = T(v);
    if (rec.shown !== v) e.setAttribute(a, rec.shown);
  }
}
function turnTree(root) {
  if (root.nodeType === 3) return turnText(root);
  if (root.nodeType !== 1 || skip(root)) return;
  turnAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? turnText(n) : turnAttrs(n);
}
function watch() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((list) => {
    if (!TH.id) return;
    for (const m of list) {
      if (m.type === 'characterData') turnText(m.target);
      else if (m.type === 'attributes') turnAttrs(m.target);
      else for (const n of m.addedNodes) turnTree(n);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}
// Every word on the page, turned (or put back when there is no theme).
function turnAll() {
  if (baseTitle === null) baseTitle = document.title;
  document.title = T(baseTitle);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) {
      const rec = ORIG.get(n);
      if (rec && n.nodeValue === rec.shown) {
        rec.shown = T(rec.orig);
        n.nodeValue = rec.shown;
      } else turnText(n);
    } else {
      const recs = AORIG.get(n);
      if (recs)
        for (const a in recs) {
          const r = recs[a];
          if (n.getAttribute(a) === r.shown) n.setAttribute(a, (r.shown = T(r.orig)));
        }
      turnAttrs(n);
    }
  }
}
// After every render: has the world's theme changed? (chosen, refused, rolled, or another run loaded)
function syncTheme() {
  const id = V.S ? R.themeOf(V.S) : null;
  if (id === TH.id) return false;
  const was = TH.id;
  TH.id = id;
  watch();
  document.body.classList.toggle('theme-feline', id === 'feline');
  turnAll();
  for (const fn of listeners) fn(id, was);
  return true;
}
// The original words of a text on screen (for the tests: what the base game would have shown).
const originalOf = (node) => (ORIG.get(node) || {}).orig;
export { T, syncTheme, onThemeChange, originalOf };
