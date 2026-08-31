/* Validates the TOEFL content bank and emits the manifest the app loads.
   Runs before `astro build`, so a malformed passage fails the build, not the
   student's phone. */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const base = new URL('../public/toefl/', import.meta.url).pathname;
const dataDir = join(base, 'data');
const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));
const listJSON = async (dir) =>
  existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.json')).sort() : [];

/** Does the example sentence actually use its headword? Tolerant of ordinary
    inflection (vary/varies, cite/citing, abundant/abundance). */
function usesWord(sentence, word) {
  if (!sentence) return false;
  const text = sentence.toLowerCase();
  const w = word.toLowerCase();
  // Trim a final y or e so varies/citing still match their headword stem.
  const stem = w.replace(/(?:y|e)$/, '');
  const root = stem.slice(0, Math.max(4, stem.length - 2));
  return text.includes(root);
}

const SINGLE_OPTS = 4;
const words = (s) => s.trim().split(/\s+/).length;

function checkQuestion(where, q, { paragraphs = null } = {}) {
  if (!q.id) fail(where, 'missing id');
  if (!q.stem) fail(where, 'missing stem');
  if (!q.explanation_en) fail(where, 'missing explanation_en');
  if (!q.explanation_zh) fail(where, 'missing explanation_zh');
  if (q.explanation_zh && !/[一-鿿]/.test(q.explanation_zh)) {
    fail(where, 'explanation_zh contains no Chinese');
  }

  const multi = Array.isArray(q.answer);
  const n = q.type === 'insert-text' ? 4 : q.options?.length ?? 0;

  if (q.type === 'insert-text') {
    if (!q.insertSentence) fail(where, 'insert-text needs insertSentence');
    if (!Array.isArray(q.insertAfter) || q.insertAfter.length !== 4) {
      fail(where, 'insert-text needs exactly 4 insertAfter sentences');
    }
  } else if (q.type === 'summary') {
    if (n !== 6) fail(where, `summary needs 6 options, has ${n}`);
    if (!multi || q.answer.length !== 3) fail(where, 'summary needs 3 answers');
    if (!q.summaryIntro) fail(where, 'summary needs summaryIntro');
  } else if (q.type === 'multi-detail') {
    if (n !== SINGLE_OPTS) fail(where, `multi-detail needs 4 options, has ${n}`);
    if (!multi || q.answer.length !== 2) fail(where, 'multi-detail needs 2 answers');
  } else if (n !== SINGLE_OPTS) {
    fail(where, `expected 4 options, has ${n}`);
  }

  const key = multi ? q.answer : [q.answer];
  for (const k of key) {
    if (!Number.isInteger(k) || k < 0 || k >= n) fail(where, `answer index ${k} out of range (0..${n - 1})`);
  }
  if (multi && new Set(key).size !== key.length) fail(where, 'duplicate answer indices');
  if (q.options && new Set(q.options).size !== q.options.length) fail(where, 'duplicate option text');

  // Verbatim substrings are the one thing the UI cannot recover from.
  if (paragraphs) {
    const para = q.paragraph ? paragraphs[q.paragraph - 1] : null;
    if (q.paragraph && !para) fail(where, `paragraph ${q.paragraph} does not exist`);
    if (q.highlight) {
      if (!para) fail(where, 'highlight without a paragraph');
      else if (!para.includes(q.highlight)) fail(where, `highlight is not a verbatim substring of paragraph ${q.paragraph}`);
    }
    if (q.type === 'insert-text' && para && Array.isArray(q.insertAfter)) {
      let cursor = 0;
      q.insertAfter.forEach((s, i) => {
        const at = para.indexOf(s, cursor);
        if (at < 0) fail(where, `insertAfter[${i}] is not a verbatim substring of paragraph ${q.paragraph} (in order)`);
        else cursor = at + s.length;
      });
    }
  }
}

/* ── reading ──────────────────────────────────────────────────── */

const reading = [];
for (const file of await listJSON(join(dataDir, 'reading'))) {
  const p = await readJSON(join(dataDir, 'reading', file));
  const where = `reading/${file}`;
  if (!p.id) fail(where, 'missing id');
  if (file !== `${p.id}.json`) fail(where, `filename should be ${p.id}.json`);
  if (!Array.isArray(p.paragraphs) || p.paragraphs.length < 4) fail(where, 'needs at least 4 paragraphs');
  if (![1, 2, 3].includes(p.difficulty)) fail(where, `bad difficulty ${p.difficulty}`);
  if (!Array.isArray(p.questions) || p.questions.length < 6) fail(where, 'needs at least 6 questions');

  const wc = p.paragraphs.reduce((n, t) => n + words(t), 0);
  if (wc < 500 || wc > 950) fail(where, `word count ${wc} outside 500-950`);

  const ids = new Set();
  for (const q of p.questions ?? []) {
    if (ids.has(q.id)) fail(where, `duplicate question id ${q.id}`);
    ids.add(q.id);
    checkQuestion(`${where}#${q.id}`, q, { paragraphs: p.paragraphs });
  }

  reading.push({
    id: p.id, title: p.title, topic: p.topic, difficulty: p.difficulty,
    questions: p.questions.length, words: wc,
  });
}

/* ── listening ────────────────────────────────────────────────── */

const listening = [];
for (const file of await listJSON(join(dataDir, 'listening'))) {
  const item = await readJSON(join(dataDir, 'listening', file));
  const where = `listening/${file}`;
  if (!item.id) fail(where, 'missing id');
  if (file !== `${item.id}.json`) fail(where, `filename should be ${item.id}.json`);
  if (!['lecture', 'conversation'].includes(item.kind)) fail(where, `bad kind ${item.kind}`);
  if (![1, 2, 3].includes(item.difficulty)) fail(where, `bad difficulty ${item.difficulty}`);
  if (!item.setting_en) fail(where, 'missing setting_en');

  const ids = new Set(item.speakers?.map((s) => s.id));
  const voices = new Set(item.speakers?.map((s) => s.voice));
  if (voices.size !== (item.speakers?.length ?? 0)) fail(where, 'speakers share a voice');
  for (const s of item.speakers ?? []) {
    if (!['female-a', 'female-b', 'male-a', 'male-b'].includes(s.voice)) {
      fail(where, `unknown voice ${s.voice}`);
    }
  }
  for (const [i, line] of (item.script ?? []).entries()) {
    if (!ids.has(line.speaker)) fail(where, `script[${i}] unknown speaker ${line.speaker}`);
    if (!line.text?.trim()) fail(where, `script[${i}] empty`);
    if (/\d/.test(line.text)) fail(where, `script[${i}] contains digits, which TTS reads badly`);
  }

  for (const q of item.questions ?? []) {
    checkQuestion(`${where}#${q.id}`, q);
    if (q.type === 'function' && !Number.isInteger(q.replayLine)) {
      fail(`${where}#${q.id}`, 'function question needs replayLine');
    }
    if (q.replayLine !== undefined && !(q.replayLine >= 0 && q.replayLine < item.script.length)) {
      fail(`${where}#${q.id}`, `replayLine ${q.replayLine} out of range`);
    }
  }

  const audio = join(base, 'audio', `${item.id}.mp3`);
  const times = join(base, 'audio', `${item.id}.times.json`);
  const hasAudio = existsSync(audio);
  if (!hasAudio) fail(where, `missing audio/${item.id}.mp3 (run scripts/gen_audio.py)`);
  if (!existsSync(times)) fail(where, `missing audio/${item.id}.times.json`);

  listening.push({
    id: item.id, kind: item.kind, topic: item.topic, difficulty: item.difficulty,
    questions: item.questions.length,
    words: (item.script ?? []).reduce((n, l) => n + words(l.text), 0),
  });
}

/* ── vocabulary ───────────────────────────────────────────────── */

let vocabCount = 0;
const vocabPath = join(dataDir, 'vocab.json');
if (existsSync(vocabPath)) {
  const { words: list } = await readJSON(vocabPath);
  vocabCount = list?.length ?? 0;
  const seen = new Set();
  for (const w of list ?? []) {
    const where = `vocab.json#${w.word}`;
    if (seen.has(w.word)) fail(where, 'duplicate word');
    seen.add(w.word);
    for (const k of ['pos', 'def_en', 'def_zh', 'example', 'example_zh', 'band']) {
      if (!w[k]) fail(where, `missing ${k}`);
    }
    if (!/[一-鿿]/.test(w.def_zh ?? '')) fail(where, 'def_zh has no Chinese');
    if (!Array.isArray(w.distractors) || w.distractors.length !== 3) fail(where, 'needs 3 distractors');
    if (w.distractors?.includes(w.word)) fail(where, 'distractor equals the word');
    if (!usesWord(w.example, w.word)) fail(where, 'example does not appear to use the word');
  }
} else {
  fail('vocab.json', 'missing');
}

/* ── report ───────────────────────────────────────────────────── */

if (reading.length === 0) fail('reading', 'no passages found');
if (listening.length === 0) fail('listening', 'no items found');

if (problems.length) {
  console.error(`\nTOEFL content check failed (${problems.length} problem${problems.length > 1 ? 's' : ''}):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

const manifest = {
  built: new Date().toISOString(),
  reading: reading.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id)),
  listening: listening.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id)),
  vocab: vocabCount,
};

await writeFile(join(dataDir, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);

console.log(
  `TOEFL content OK: ${reading.length} passages (${reading.reduce((n, r) => n + r.questions, 0)} questions), ` +
  `${listening.length} listening items (${listening.reduce((n, l) => n + l.questions, 0)} questions), ` +
  `${vocabCount} vocabulary words.`
);
