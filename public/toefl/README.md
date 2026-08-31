# TOEFL practice app

A self-contained, offline-first practice app served as static files from
`kuros.io/toefl/`. Multiple choice only: reading, listening, and vocabulary.
No writing or speaking sections, no AI grading.

## Zero runtime cost

Nothing here runs on a server. It is HTML, CSS, ES modules, JSON, and MP3 files
on GitHub Pages.

- **Audio** is rendered ahead of time with Kokoro-82M (Apache 2.0) on a laptop
  and committed. No TTS service is called at runtime.
- **Progress** lives in `localStorage` on the device. There is no database, no
  account, and no analytics. `js/store.js` never makes a network call, and a
  test enforces that.
- **Offline** is handled by `sw.js`, which precaches the shell and the whole
  JSON bank on first visit. Audio is cached the first time a clip plays, or in
  bulk from Settings, so a slow or blocked connection later does not matter.

## Layout

```
index.html            app shell
app.css               design tokens and every component
sw.js                 offline caching
js/store.js           localStorage, Rasch ability estimate, SM-2 scheduling
js/quiz.js            renders every TOEFL question type
js/drill.js           reading and listening runners
js/diagnostic.js      placement test (test mode: no feedback until the end)
js/vocab.js           spaced repetition review
js/progress.js        trends, accuracy by question type, settings
data/SCHEMA.md        the content contract
data/reading/*.json   one file per passage
data/listening/*.json one file per lecture or conversation
data/vocab.json       the academic word list
data/manifest.json    generated; do not edit by hand
audio/*.mp3           generated; do not edit by hand
```

## Adding content

1. Write a new JSON file following `data/SCHEMA.md`.
2. For listening, render its audio:
   ```
   npm run toefl:audio          # skips clips that already exist
   npm run toefl:audio -- --force l-lec-something   # re-render one
   ```
3. `npm run build` regenerates `data/manifest.json` and **fails the build** if
   anything is malformed: a `highlight` that is not a verbatim substring, an
   answer index out of range, a missing Chinese explanation, a listening item
   with no audio. Content errors surface here rather than on her phone.
4. `npm test` runs the same invariants against the built output.

## First-time audio setup

Only needed on a machine that has never rendered audio.

```
brew install espeak-ng ffmpeg
uv venv --python 3.12 .venv-tts
uv pip install --python .venv-tts/bin/python kokoro soundfile numpy "misaki[en]"
npm run toefl:audio
```

Voices are mapped in `scripts/gen_audio.py`: `female-a` `female-b` `male-a`
`male-b` plus a separate narrator for the "Listen to part of a lecture" framing.

## Testing

```
npm test           # build + static invariants, runs in CI
npm run test:e2e   # full walkthrough in a phone-sized Chromium (local only)
```

The end-to-end run drives the whole diagnostic, one drill of each type, a
vocabulary queue, a reload to prove progress persists, and an offline load.
