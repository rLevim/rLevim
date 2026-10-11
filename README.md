# Band Songbook

A small web app for keeping your band's songs, a link to the chords for each one, and the key you play it in.

## Using it

1. Paste a link to the chords (Ultimate Guitar, Tab4u or any other site).
   The song name and artist are filled in from the link; you can change them.
2. Tap the key you play it in, and choose major or minor.
3. Tap **Save song**.

Your songs list has search, a filter by key and sorting. Tap a song to open its chords.
If you save a link that's already in the list, that song is updated instead of added twice.

Under **More** you can also note the key on the chords page, a capo and free-text notes.
If you set the key on the chords page, the app tells you how many semitones to transpose
(for example "Up 2 semitones (+2)").

### Add a song straight from a link

Open the app with `?url=` and `key=` and it saves the song without any more taps:

```
https://<where-the-app-lives>/?url=https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-39144&key=F%23m
```

`song=` and `artist=` are optional. Without `key=` the link is filled in and the app asks you for the key.

On Android, once the app is installed to the home screen, it shows up in the **Share** menu:
share a chords page to it, pick the key, and save.

### Sharing with the band

Songs are saved in the browser on each device. To share or back up:

- **Copy list as text**: a plain list (song, key, link) to paste into the band chat.
- **Export file** / **Import file**: move the whole songbook to another phone. Importing merges by link.

## Running it

It's plain HTML, CSS and JavaScript, with no build step. Any static host works (GitHub Pages, Netlify and so on).
To run it on your computer:

```
npm start        # serves on http://localhost:8080
npm test         # runs the tests for key and link handling
```

## Files

- `index.html`, `styles.css`, `app.js`: the app
- `songs.js`: key handling, transposition and reading song names from links
- `manifest.webmanifest`, `sw.js`, `icon.svg`: install to home screen, offline use, share menu
- `test/`: tests

## Shared band list

`shared/songbook.html` is the shared version: one list for the whole band, published as a claude.ai page
with a shared database, so everyone sees the same songs and changes appear live.
Live page: https://claude.ai/artifact/CRzwYKe6a7xe71vx9sPx1U (bandmates need to be invited from its Share menu).
