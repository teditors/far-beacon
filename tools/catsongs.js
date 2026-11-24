// Andrew's cat songs (commission 9): copies the audio files in assets/cat-songs/ next to a built page, in
// <out>/cat-songs/, with the list the game reads (index.json: [{ file, title }]). The one-file game never holds them;
// the page fetches them only when the player turns the full soundtrack on in Super Feline Mode.
// Usage: node tools/catsongs.js <out dir>      (tools/site.sh runs it for every published copy; try it with `dist`)
// Titles come from the file names ("purr-of-the-sunbeam.mp3" is "Purr of the sunbeam"), unless assets/cat-songs/
// songs.json lists them: [{ "file": "a.mp3", "title": "A song" }, ...], which also sets their order.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/cat-songs');
const AUDIO = /\.(mp3|ogg|oga|opus|m4a|aac|wav|flac|webm)$/i;
function songs() {
  if (!fs.existsSync(SRC)) return [];
  const files = fs
    .readdirSync(SRC)
    .filter((f) => AUDIO.test(f))
    .sort();
  let list = files.map((f) => ({
    file: f,
    title: f
      .replace(AUDIO, '')
      .replace(/[-_]+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase()),
  }));
  const meta = path.join(SRC, 'songs.json');
  if (fs.existsSync(meta)) {
    const named = JSON.parse(fs.readFileSync(meta, 'utf8')).filter((x) => x && files.includes(x.file));
    list = named.concat(list.filter((x) => !named.some((n) => n.file === x.file)));
  }
  return list;
}
function publish(out) {
  const list = songs(),
    dir = path.join(out, 'cat-songs');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of list) fs.copyFileSync(path.join(SRC, s.file), path.join(dir, s.file));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(list, null, 1) + '\n');
  return list;
}
if (require.main === module) {
  const out = process.argv[2];
  if (!out) {
    console.log('usage: node tools/catsongs.js <out dir>');
    process.exit(1);
  }
  const list = publish(out);
  console.log('cat songs: ' + list.length + ' copied to ' + path.join(out, 'cat-songs'));
}
module.exports = { songs, publish };
