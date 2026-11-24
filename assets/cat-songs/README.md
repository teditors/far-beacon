# Andrew's cat songs

Put the audio files for Super Feline Mode's full soundtrack here (mp3, ogg, opus, m4a, wav, flac or webm). They are
never put into the one-file game: the site copies them next to each published page (`tools/catsongs.js`, run by
`tools/site.sh`), and the game fetches them only when a player turns on "Andrew's cat songs" in Menu, Settings, in
Super Feline Mode. With no files here the game plays its own composed score (meowed) as usual.

Titles are taken from the file names (`purr-of-the-sunbeam.mp3` is "Purr of the sunbeam"). To give them proper titles
or an order, add a `songs.json` here: `[{ "file": "purr-of-the-sunbeam.mp3", "title": "Purr of the Sunbeam" }]`.

To try them locally: `node tools/catsongs.js dist`, then serve the folder (for example `npx serve dist`) and open it;
a page opened straight from the disk cannot fetch them.
