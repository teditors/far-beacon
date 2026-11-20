/* The safety net: an error in the game must never leave a frozen or black screen. Anything that goes wrong in a frame,
   an action or a panel is caught here: the game keeps running, a note at the top of the screen says what happened
   (with a button to copy it, to send on), and Menu offers a rescue back to the well. The same error is shown once. */
const seen = new Set();
const errors = []; // the last few, for copying
let box = null;
function show(where, e) {
  const msg = (e && e.message) || String(e),
    key = where + ':' + msg;
  console.error('[' + where + ']', e);
  if (seen.has(key)) return;
  seen.add(key);
  errors.push({ where, msg, stack: ((e && e.stack) || '').split('\n').slice(0, 4).join(' | ') });
  if (errors.length > 8) errors.shift();
  if (typeof document === 'undefined') return;
  if (!box) {
    box = document.createElement('div');
    box.id = 'oops';
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;left:8px;right:8px;top:8px;z-index:50;background:#3a1414;color:#fbe9e7;border:1px solid #c0612f;' +
      'border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #0008';
    document.body.appendChild(box);
  }
  box.innerHTML = '';
  const p = document.createElement('p');
  p.style.margin = '0 0 8px';
  p.textContent =
    'Something went wrong (' +
    where +
    '): ' +
    msg +
    '. The game keeps going. If you are stuck, Menu has "Rescue: back to the well".';
  const row = document.createElement('div'),
    copy = document.createElement('button'),
    close = document.createElement('button');
  copy.textContent = 'Copy the error';
  close.textContent = 'Close';
  for (const b of [copy, close]) b.style.cssText = 'margin-right:8px;padding:6px 10px;border-radius:8px;border:0;font:inherit';
  copy.addEventListener('click', () => {
    const txt = errors.map((x) => x.where + ': ' + x.msg + ' / ' + x.stack).join('\n');
    try {
      navigator.clipboard.writeText(txt).then(
        () => (copy.textContent = 'Copied'),
        () => (p.textContent += ' ' + txt),
      );
    } catch (err) {
      p.textContent += ' ' + txt;
    }
  });
  close.addEventListener('click', () => (box.hidden = true));
  row.append(copy, close);
  box.append(p, row);
  box.hidden = false;
}
// Run fn, catching anything it throws; gives back what fn gave, or undefined.
function guard(where, fn) {
  try {
    return fn();
  } catch (e) {
    show(where, e);
    return undefined;
  }
}
export { guard, show as showError, errors };
