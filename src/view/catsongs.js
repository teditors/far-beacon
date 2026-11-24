/* Andrew's cat songs (commission 9): an optional full soundtrack for Super Feline Mode, from audio files kept out of
   the one-file game. The songs live in `assets/cat-songs/` in the repository; `node tools/catsongs.js <dir>` copies
   them next to a built page with a list, `cat-songs/index.json` ([{ file, title }]), and the site's script does this
   for every published copy. Nothing is fetched until the player turns the soundtrack on (Menu, Settings, only in the
   mode); then the list is read, the songs play in a shuffled loop at the music volume, and the composed score falls
   silent under them (sound.js asks songsPlaying()). With no list, no songs or no network it says so and the score
   plays on as before. */
import { SET, saveSettings } from './quality.js';
import { TH } from './themeflag.js';

const S = { list: null, tried: false, audio: null, i: 0, order: [], note: '', loading: null };
const wanted = () => TH.id === 'feline' && !!SET.catSongs && !SET.mute;
const songsPlaying = () => !!(S.audio && !S.audio.paused && wanted());

async function fetchList() {
  try {
    // a page opened from the disk cannot fetch anything beside it
    if (location.protocol === 'file:') throw new Error('file');
    const r = await fetch('cat-songs/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    S.list = (Array.isArray(j) ? j : j.songs || []).filter((x) => x && x.file);
    S.note = S.list.length ? S.list.length + (S.list.length === 1 ? ' song' : ' songs') : 'No songs added yet';
  } catch (e) {
    S.list = [];
    S.note = 'No songs found next to this page';
  }
  S.order = S.list.map((_, i) => i).sort(() => Math.random() - 0.5);
}
// The list of songs, read once (an async function: always a promise, settled when the list is known).
async function loadList() {
  if (S.list) return;
  if (!S.loading) S.loading = fetchList().finally(() => (S.loading = null));
  return S.loading;
}
function playNext() {
  if (!S.list || !S.list.length || !wanted()) return;
  const song = S.list[S.order[S.i++ % S.order.length]];
  if (!S.audio) {
    S.audio = new Audio();
    S.audio.addEventListener('ended', playNext);
    S.audio.addEventListener('error', () => setTimeout(playNext, 500));
  }
  S.audio.src = 'cat-songs/' + encodeURI(song.file);
  S.audio.volume = Math.max(0, Math.min(1, SET.music === undefined ? 0.55 : SET.music));
  S.nowPlaying = song.title || song.file;
  S.audio.play().catch(() => {}); // a phone may refuse before a tap: the next update tries again
}
// Every so often from sound.js: start, follow the volume, or stop, as the settings and the theme say.
async function updateSongs() {
  if (!wanted()) {
    if (S.audio && !S.audio.paused) S.audio.pause();
    return;
  }
  if (!S.list) await loadList();
  if (!S.list.length) return;
  if (!S.audio || !S.audio.src) return playNext();
  S.audio.volume = Math.max(0, Math.min(1, SET.music === undefined ? 0.55 : SET.music));
  if (S.audio.paused && !S.audio.ended) S.audio.play().catch(() => {});
}
function setCatSongs(on) {
  SET.catSongs = !!on;
  saveSettings();
  updateSongs();
}
const songsNote = () =>
  S.loading ? 'Looking for songs...' : S.list ? S.note + (songsPlaying() && S.nowPlaying ? ': now ' + S.nowPlaying : '') : '';
export { updateSongs, songsPlaying, setCatSongs, songsNote, loadList };
