/* Themes (commission 9): a world can be shown dressed as something else, its rules untouched. A theme is content
   (content/feline.js: `C.themes`), a dictionary of renamings and a few lists; this module turns any player-facing text
   into the theme's words, and says which theme a world wears. The view applies `themed()` to every word it shows (one
   place: view/theme.js), so the rules and content never need to know a theme exists.

   - themeOf(s): the id of the theme this world wears, or null. `s.theme` holds the player's choice ('none' to refuse
     one); with no choice, a theme with a `rare` chance rolls it from the seed (its own stream, so nothing else in the
     world changes), unless the world's `<id>roll` switch is off.
   - themed(text, id): the text in the theme's words. Pure and cached; the same text always gives the same words.

   How a text is turned, in order: a whole-text match (`exact`), then phrases (`phrases`, longest first), then each word
   (`words`, with plurals and possessives found by themselves), then proper names (a word built from the syllables and
   name lists in content, or an unknown capitalised word), which get a name in the theme's style (`nameStyles`). An "a"
   or "an" before a changed word is mended. A text with no word changed gets one of the theme's `flourishes`, so no
   line the player reads is left as it was. */
import { C, stream } from './core.js';
import { NOTES, SWITCHES } from './hooks.js';

const byTheme = (id) => (C.themes || []).find((t) => t.id === id) || null;

// The theme rolled from the seed (no choice made): the first rare theme whose roll comes up.
function rolledTheme(s) {
  for (const t of C.themes || []) {
    if (!t.rare || (s.off && s.off[t.id + 'roll'])) continue;
    if (stream(s.seed, 'theme:' + t.id)() < t.rare) return t.id;
  }
  return null;
}
function themeOf(s) {
  if (!s) return null;
  if (s.theme === 'none') return null;
  if (s.theme && byTheme(s.theme)) return s.theme;
  return rolledTheme(s);
}
// Was this world's theme rolled rather than chosen? (for the announcement)
const themeRolled = (s) => !!s && !s.theme && !!rolledTheme(s);
// Choose a theme for this world (id), or none (null). Only words change; nothing in the rules reads it.
function setTheme(s, id) {
  s.theme = id && byTheme(id) ? id : 'none';
  return themeOf(s);
}

/* ---------- the translator ---------- */
const PREP = new Map(); // theme id -> prepared tables
const CACHE = new Map(); // theme id -> Map(text -> themed)
const lowerKeys = (o) => {
  const m = new Map();
  for (const k in o || {}) m.set(k.toLowerCase(), o[k]);
  return m;
};
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Every word content uses in its ordinary text (not names): an unknown capitalised word is then a proper name.
function contentVocab(skip) {
  const vocab = new Set(),
    seen = new Set();
  const walk = (o, key) => {
    if (o == null) return;
    if (typeof o === 'string') {
      if (skip.has(key)) return;
      for (const w of o.match(/[A-Za-z][a-z']*/g) || []) vocab.add(w.toLowerCase().replace(/'s$/, ''));
      return;
    }
    if (typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const k in o) walk(o[k], Array.isArray(o) ? key : k);
  };
  walk(C, '');
  return vocab;
}
// The syllables and names content builds names from (any list of words under one of the theme's `nameKeys`).
function nameParts(keys) {
  const parts = new Set(),
    seen = new Set();
  const walk = (o, key) => {
    if (o == null || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o) && keys.has(key)) {
      for (const v of o)
        if (typeof v === 'string' && /^[A-Za-z' -]+$/.test(v)) for (const w of v.split(/[ -]/)) w && parts.add(w.toLowerCase());
      return;
    }
    for (const k in o) walk(o[k], Array.isArray(o) ? key : k);
  };
  walk(C, '');
  return parts;
}
function prepare(id) {
  if (PREP.has(id)) return PREP.get(id);
  const t = byTheme(id);
  if (!t) return null;
  const keys = new Set(t.nameKeys || []);
  const phrases = Object.keys(t.phrases || {}).sort((a, b) => b.length - a.length);
  const p = {
    t,
    exact: lowerKeys(t.exact),
    words: lowerKeys(t.words),
    phrases: lowerKeys(t.phrases),
    phraseRe: phrases.length ? new RegExp('(^|[^A-Za-z])(' + phrases.map(esc).join('|') + ')(?![A-Za-z])', 'gi') : null,
    parts: nameParts(keys),
    vocab: contentVocab(keys),
    keep: new Set((t.keep || []).map((w) => w.toLowerCase())),
  };
  for (const w of p.words.keys()) p.vocab.add(w);
  PREP.set(id, p);
  return p;
}
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
// The replacement in the case of the word it replaces: "Hound" -> "Woofer", "HOUND" -> "WOOFER", "hound" -> as written.
function cased(src, rep) {
  if (src.length > 1 && src === src.toUpperCase() && /[A-Z]/.test(src)) return rep.toUpperCase();
  if (src[0] !== src[0].toLowerCase()) return rep[0].toUpperCase() + rep.slice(1);
  return rep;
}
// The plural of a replacement: its noun made plural ("castle of cushions" -> "castles of cushions", "leaky pipe" ->
// "leaky pipes", "box (IF I FITS)" -> "boxes (IF I FITS)").
function plural(w) {
  // the tail that is not the noun: " of ..." or " (...)"; the noun is the last word before it
  const cut = w.search(/ of | \(/),
    head = cut < 0 ? w : w.slice(0, cut),
    post = cut < 0 ? '' : w.slice(cut),
    n = head.match(/\S+$/)[0],
    pre = head.slice(0, head.length - n.length);
  const pl = /[^aeiou]y$/.test(n) ? n.slice(0, -1) + 'ies' : /(s|x|ch|sh)$/.test(n) ? n + 'es' : n + 's';
  return pre + pl + post;
}
// A word's replacement, its plural and possessive found by themselves; null if the theme does not change it.
function lookWord(p, w) {
  const lw = w.toLowerCase();
  if (p.keep.has(lw)) return null;
  if (p.words.has(lw)) return p.words.get(lw);
  if (/'s$/.test(lw) && p.words.has(lw.slice(0, -2))) return p.words.get(lw.slice(0, -2)) + "'s";
  if (/s'$/.test(lw) && p.words.has(lw.slice(0, -2))) return plural(p.words.get(lw.slice(0, -2))) + "'";
  if (/ies$/.test(lw) && p.words.has(lw.slice(0, -3) + 'y')) return plural(p.words.get(lw.slice(0, -3) + 'y'));
  if (/es$/.test(lw) && p.words.has(lw.slice(0, -2))) return plural(p.words.get(lw.slice(0, -2)));
  if (/s$/.test(lw) && p.words.has(lw.slice(0, -1))) return plural(p.words.get(lw.slice(0, -1)));
  return null;
}
// Can the word be made of the name syllables content builds names from (one to four of them)?
function fromParts(parts, w) {
  const n = w.length;
  const reach = new Array(n + 1).fill(9);
  reach[0] = 0;
  for (let i = 0; i < n; i++) {
    if (reach[i] >= 4) continue;
    for (let j = i + 1; j <= n; j++) if (parts.has(w.slice(i, j))) reach[j] = Math.min(reach[j], reach[i] + 1);
  }
  return reach[n] <= 4;
}
function isName(p, w, initial) {
  if (w.length < 2 || w[0] === w[0].toLowerCase() || w === w.toUpperCase()) return false;
  const lw = w.toLowerCase().replace(/'s$/, '');
  if (p.vocab.has(lw) || p.keep.has(lw)) return false;
  if (fromParts(p.parts, lw)) return true;
  return !initial; // an unknown capitalised word in the middle of a sentence: a name
}
function catName(p, w) {
  const poss = /'s$/.test(w) ? "'s" : '',
    base = poss ? w.slice(0, -2) : w,
    styles = p.t.nameStyles || ['{n}'],
    st = styles[hash(base) % styles.length];
  return st.replace('{n}', base).replace('{l}', base.toLowerCase()) + poss;
}
// The theme's words for a text; the text itself when there is no theme.
function themed(text, id) {
  if (!id || typeof text !== 'string' || !/[A-Za-z]/.test(text)) return text;
  const p = prepare(id);
  if (!p) return text;
  let cache = CACHE.get(id);
  if (!cache) CACHE.set(id, (cache = new Map()));
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const out = turn(p, text);
  if (cache.size > 6000) cache.clear();
  cache.set(text, out);
  return out;
}
function turn(p, text) {
  const lead = text.match(/^\s*/)[0],
    trail = text.match(/\s*$/)[0],
    core = text.trim();
  // 1. the whole text
  const ex = p.exact.get(core.toLowerCase());
  if (ex !== undefined) return lead + ex + trail;
  const bits = []; // replacements, held out of the text as \u0001n\u0002 so nothing is turned twice
  const hold = (rep) => '\u0001' + (bits.push(rep) - 1) + '\u0002';
  let s = core;
  // 2. phrases
  if (p.phraseRe) s = s.replace(p.phraseRe, (m, pre, ph) => pre + hold(cased(ph, p.phrases.get(ph.toLowerCase()))));
  // 3 and 4. words and names, a word at a time (held replacements are left alone)
  s = s.replace(/\u0001\d+\u0002|[A-Za-z][A-Za-z']*/g, (w, at) => {
    if (w[0] === '\u0001') return w;
    const clean = w.replace(/'+$/, (q) => (/s'$/.test(w) ? q : '')),
      tail = w.slice(clean.length);
    const rep = lookWord(p, clean);
    if (rep != null) return hold(cased(clean, rep)) + tail;
    const before = s.slice(0, at).replace(/\u0001\d+\u0002/g, 'x');
    const initial = !before.trim() || /[.!?:("']\s*$/.test(before);
    if (isName(p, clean, initial)) return hold(catName(p, clean)) + tail;
    return w;
  });
  // "a" or "an" before a changed word
  s = s.replace(/\b([Aa])n? (\u0001(\d+)\u0002)/g, (m, a, ph, n) => {
    const v = /^[aeiouAEIOU]/.test(bits[+n]) && !/^(uni|use|one|eu)/i.test(bits[+n]);
    return a + (v ? 'n ' : ' ') + ph;
  });
  const changed = bits.length > 0;
  s = s.replace(/\u0001(\d+)\u0002/g, (m, n) => bits[+n]);
  if (!changed) {
    const fl = p.t.flourishes || [];
    if (fl.length && /[A-Za-z]{4}/.test(s)) {
      const f = fl[hash(core) % fl.length];
      s = /[.!?]$/.test(s) || s.split(' ').length > 3 ? s + ' ' + f : f.replace(/[.!?]$/, '') + ' ' + s;
    }
  }
  return lead + s + trail;
}

SWITCHES.push(['felineroll', 'Rare feline worlds (1 in 50)']);
NOTES.push((s) => {
  const id = themeOf(s),
    t = id && byTheme(id);
  if (!t) return [];
  return [{ label: t.name, text: themeRolled(s) ? t.rolledNote : t.chosenNote }];
});

export { themeOf, themeRolled, setTheme, themed, byTheme as themeById };
