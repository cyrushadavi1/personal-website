import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readJSON = async (path) => JSON.parse(await read(path));
const size = (path) => stat(new URL(`../${path}`, import.meta.url)).then((s) => s.size);

const manifest = await readJSON('dist/toefl/data/manifest.json');

test('the app ships as static files under /toefl/', async () => {
  const html = await read('dist/toefl/index.html');

  assert.match(html, /<title>TOEFL Practice<\/title>/);
  // The app is for one person; it must not be indexed.
  assert.match(html, /name="robots" content="noindex/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /width=device-width/);
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /import \{ boot \} from '\.\/js\/app\.js'/);
  // No JavaScript still has to say something useful, in both languages.
  assert.match(html, /<noscript>/);
  assert.match(html, /需要 JavaScript/);
});

test('the content bank is complete and internally consistent', async () => {
  assert.equal(manifest.reading.length, 12);
  assert.equal(manifest.listening.length, 12);
  assert.equal(manifest.vocab, 200);

  assert.equal(manifest.reading.reduce((n, r) => n + r.questions, 0), 120);
  assert.ok(manifest.listening.reduce((n, l) => n + l.questions, 0) >= 60);

  // Topic variety is what keeps practice representative of the real test.
  const topics = new Set(manifest.reading.map((r) => r.topic));
  for (const required of ['history', 'life-science', 'social-science']) {
    assert.ok(topics.has(required), `reading is missing the ${required} topic`);
  }
  // Every difficulty band exists, so the diagnostic has something to place her against.
  for (const d of [1, 2, 3]) {
    assert.ok(manifest.reading.some((r) => r.difficulty === d), `no reading at difficulty ${d}`);
    assert.ok(manifest.listening.some((l) => l.difficulty === d), `no listening at difficulty ${d}`);
  }
  const kinds = manifest.listening.map((l) => l.kind);
  assert.ok(kinds.filter((k) => k === 'lecture').length >= 4);
  assert.ok(kinds.filter((k) => k === 'conversation').length >= 4);
});

test('every reading passage keeps its machine-critical invariants', async () => {
  for (const meta of manifest.reading) {
    const p = await readJSON(`dist/toefl/data/reading/${meta.id}.json`);
    const where = meta.id;

    assert.equal(p.questions.length, meta.questions, `${where}: question count drifted`);
    assert.ok(p.paragraphs.length >= 5, `${where}: too few paragraphs`);

    for (const q of p.questions) {
      const para = q.paragraph ? p.paragraphs[q.paragraph - 1] : null;

      // The UI highlights by substring search; a mismatch silently shows nothing.
      if (q.highlight) {
        assert.ok(para?.includes(q.highlight), `${where}#${q.id}: highlight is not verbatim`);
      }
      if (q.type === 'insert-text') {
        assert.equal(q.insertAfter.length, 4, `${where}#${q.id}: needs 4 insert points`);
        let cursor = 0;
        for (const sentence of q.insertAfter) {
          const at = para.indexOf(sentence, cursor);
          assert.ok(at >= 0, `${where}#${q.id}: insert point is not verbatim or is out of order`);
          cursor = at + sentence.length;
        }
      }
      // Both languages, always: the Chinese gloss is the point of the app.
      assert.ok(q.explanation_en?.length > 20, `${where}#${q.id}: thin English explanation`);
      assert.match(q.explanation_zh ?? '', /[一-鿿]/, `${where}#${q.id}: no Chinese explanation`);
    }

    const summary = p.questions.filter((q) => q.type === 'summary');
    assert.equal(summary.length, 1, `${where}: expected exactly one prose-summary question`);
    assert.equal(summary[0].options.length, 6);
    assert.equal(summary[0].answer.length, 3);
  }
});

test('every listening item has playable audio and valid replay points', async () => {
  for (const meta of manifest.listening) {
    const item = await readJSON(`dist/toefl/data/listening/${meta.id}.json`);
    const times = await readJSON(`dist/toefl/audio/${meta.id}.times.json`);
    const bytes = await size(`dist/toefl/audio/${meta.id}.mp3`);

    assert.ok(bytes > 200_000, `${meta.id}: audio looks truncated (${bytes} bytes)`);
    assert.ok(times.duration > 60, `${meta.id}: audio is shorter than a minute`);
    assert.equal(times.lines.length, item.script.length, `${meta.id}: timing lines do not match the script`);

    for (const q of item.questions) {
      if (q.replayLine === undefined) continue;
      const line = times.lines.find((l) => l.line === q.replayLine);
      assert.ok(line, `${meta.id}#${q.id}: replay line has no timing`);
      assert.ok(line.end > line.start, `${meta.id}#${q.id}: empty replay window`);
      assert.ok(line.end <= times.duration + 1, `${meta.id}#${q.id}: replay runs past the clip`);
    }
    assert.match(item.setting_en, /\S/);
    // Speakers must be distinguishable by ear.
    const voices = item.speakers.map((s) => s.voice);
    assert.equal(new Set(voices).size, voices.length, `${meta.id}: two speakers share a voice`);
  }
});

test('vocabulary is usable as multiple choice with Chinese glosses', async () => {
  const { words } = await readJSON('dist/toefl/data/vocab.json');

  assert.equal(words.length, 200);
  assert.equal(new Set(words.map((w) => w.word)).size, 200, 'duplicate words');

  for (const w of words) {
    assert.match(w.def_zh, /[一-鿿]/, `${w.word}: no Chinese gloss`);
    assert.match(w.example_zh, /[一-鿿]/, `${w.word}: no Chinese example`);
    assert.equal(w.distractors.length, 3, `${w.word}: needs exactly 3 distractors`);
    assert.ok(!w.distractors.includes(w.word), `${w.word}: is its own distractor`);
    assert.ok([1, 2, 3].includes(w.band), `${w.word}: bad band`);
  }
  // All three bands populated, so the diagnostic can sample across difficulty.
  for (const band of [1, 2, 3]) {
    assert.ok(words.filter((w) => w.band === band).length >= 30, `band ${band} is too thin`);
  }
});

test('the app works offline and stores progress only on the device', async () => {
  const sw = await read('dist/toefl/sw.js');
  const store = await read('dist/toefl/js/store.js');

  // Every module the shell imports must be precached, or a cold offline start fails.
  const modules = await readdir(new URL('../dist/toefl/js/', import.meta.url));
  for (const file of modules.filter((f) => f.endsWith('.js'))) {
    assert.ok(sw.includes(`js/${file}`), `service worker does not precache js/${file}`);
  }
  assert.match(sw, /data\/manifest\.json/);
  assert.match(sw, /data\/vocab\.json/);
  // Audio is deliberately cached on demand rather than forced onto a data plan.
  assert.match(sw, /\.mp3/);
  assert.match(sw, /cache-audio/);

  // No progress may leave the phone: there is no backend and no analytics.
  assert.match(store, /localStorage/);
  assert.doesNotMatch(store, /fetch\(|XMLHttpRequest|sendBeacon/);

  const webmanifest = await readJSON('dist/toefl/manifest.webmanifest');
  assert.equal(webmanifest.display, 'standalone');
  assert.ok(webmanifest.icons.some((i) => i.purpose === 'maskable'));
  for (const i of webmanifest.icons) await size(`dist/toefl/${i.src}`);
});

test('the practice app is kept out of search and off the sitemap', async () => {
  const robots = await read('dist/robots.txt');
  assert.match(robots, /Disallow: \/toefl\//);

  const sitemap = await read('dist/sitemap.xml');
  assert.doesNotMatch(sitemap, /\/toefl/);
});
