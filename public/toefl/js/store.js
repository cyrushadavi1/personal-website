/* Persistence, ability estimation, and scheduling.
   Everything lives in localStorage. There is no server and never will be. */

const KEY = 'toefl.v1';
const MAX_ATTEMPTS = 4000;

const blank = () => ({
  v: 1,
  created: Date.now(),
  settings: { zh: true, theme: 'auto', speed: 1 },
  diagnostic: null,
  attempts: [],
  items: {},
  vocab: {},
  days: {},
  notes: {},
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return blank();
    return { ...blank(), ...parsed, settings: { ...blank().settings, ...parsed.settings } };
  } catch {
    // Private mode, cleared storage, corrupt blob: start clean rather than crash.
    return blank();
  }
}

let pending = null;
function save() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded: shed the oldest history and try once more.
      state.attempts = state.attempts.slice(-1000);
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
  }, 120);
}

/** Force a synchronous write. Used before navigation and on pagehide. */
export function flush() {
  if (pending) { clearTimeout(pending); pending = null; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export const get = () => state;
export const settings = () => state.settings;

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

const dayKey = (ts = Date.now()) => new Date(ts).toLocaleDateString('en-CA');

/* ── attempts ─────────────────────────────────────────────────── */

/** Record one answered question. `sec` is 'r' | 'l' | 'v'. */
export function recordAttempt({ sec, item, q, type, diff = 2, ok }) {
  state.attempts.push({ ts: Date.now(), sec, item, q, type, diff, ok: ok ? 1 : 0 });
  if (state.attempts.length > MAX_ATTEMPTS) {
    state.attempts = state.attempts.slice(-MAX_ATTEMPTS);
  }
  const d = (state.days[dayKey()] ||= { r: [0, 0], l: [0, 0], v: [0, 0] });
  d[sec][0] += 1;
  d[sec][1] += ok ? 1 : 0;
  save();
}

/** Record a finished drill so the library can show what has been done. */
export function recordItem(itemId, correct, total) {
  const prev = state.items[itemId] || { attempts: 0, best: 0 };
  const pct = total ? correct / total : 0;
  state.items[itemId] = {
    attempts: prev.attempts + 1,
    best: Math.max(prev.best, pct),
    last: pct,
    lastTs: Date.now(),
  };
  save();
}

export const itemState = (id) => state.items[id] || null;

export function saveNote(itemId, text) {
  if (text && text.trim()) state.notes[itemId] = text;
  else delete state.notes[itemId];
  save();
}
export const getNote = (itemId) => state.notes[itemId] || '';

/* ── ability estimate ─────────────────────────────────────────── */

/* A one-parameter (Rasch) estimate. Item difficulty 1/2/3 maps to logits
   -0.9 / 0 / +0.9; theta is found by Newton iteration on the log-likelihood.
   Deliberately simple: the point is a stable, difficulty-aware signal, not
   a claim to psychometric precision. Scores are always shown as a range. */

const B = { 1: -0.9, 2: 0, 3: 0.9 };

export function theta(attempts) {
  if (attempts.length < 4) return null;
  let t = 0;
  for (let step = 0; step < 40; step += 1) {
    let num = 0;
    let den = 0;
    for (const a of attempts) {
      const p = 1 / (1 + Math.exp(-(t - (B[a.diff] ?? 0))));
      num += a.ok - p;
      den += p * (1 - p);
    }
    if (den < 1e-6) break;
    const delta = num / den;
    t += Math.max(-1, Math.min(1, delta));
    if (Math.abs(delta) < 1e-4) break;
  }
  // A perfect or empty score runs away to infinity; hold it inside a sane band.
  return Math.max(-3, Math.min(3, t));
}

/** Map ability to a TOEFL section band (0-30) with an honest +/- window. */
export function band(t, n) {
  if (t === null) return null;
  const score = Math.round(18 + 4.4 * t);
  const clamped = Math.max(0, Math.min(30, score));
  const spread = n >= 20 ? 2 : n >= 10 ? 3 : 4;
  return {
    score: clamped,
    low: Math.max(0, clamped - spread),
    high: Math.min(30, clamped + spread),
    n,
  };
}

/** Current estimate for a section from the most recent 60 attempts. */
export function estimate(sec) {
  const recent = state.attempts.filter((a) => a.sec === sec).slice(-60);
  return band(theta(recent), recent.length);
}

/** Accuracy per question type, worst first. Drives the "what to work on" list. */
export function byType(sec, minimum = 3) {
  const acc = {};
  for (const a of state.attempts) {
    if (a.sec !== sec || !a.type) continue;
    const row = (acc[a.type] ||= { n: 0, ok: 0 });
    row.n += 1;
    row.ok += a.ok;
  }
  return Object.entries(acc)
    .filter(([, r]) => r.n >= minimum)
    .map(([type, r]) => ({ type, n: r.n, pct: r.ok / r.n }))
    .sort((a, b) => a.pct - b.pct);
}

/** Daily score trend, oldest first, for the progress sparkline. */
export function trend(sec, days = 30) {
  const cutoff = Date.now() - days * 86400000;
  const buckets = new Map();
  for (const a of state.attempts) {
    if (a.sec !== sec || a.ts < cutoff) continue;
    const k = dayKey(a.ts);
    (buckets.get(k) || buckets.set(k, []).get(k)).push(a);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, ...(band(theta(list), list.length) || { score: null }) }))
    .filter((d) => d.score !== null);
}

export function streak() {
  let n = 0;
  for (let i = 0; i < 400; i += 1) {
    const key = dayKey(Date.now() - i * 86400000);
    const d = state.days[key];
    const active = d && d.r[0] + d.l[0] + d.v[0] > 0;
    if (active) n += 1;
    else if (i > 0) break;
  }
  return n;
}

export const todayCount = () => {
  const d = state.days[dayKey()];
  return d ? d.r[0] + d.l[0] + d.v[0] : 0;
};

/* ── diagnostic ───────────────────────────────────────────────── */

export function saveDiagnostic(result) {
  state.diagnostic = { ...result, ts: Date.now() };
  save();
}
export const diagnostic = () => state.diagnostic;

/* ── vocabulary scheduling (SM-2, lightly simplified) ─────────── */

const DAY = 86400000;

export function vocabState(word) {
  return state.vocab[word] || null;
}

/** grade: 0 wrong, 1 correct but slow/unsure, 2 correct and quick. */
export function reviewWord(word, grade) {
  const now = Date.now();
  const card = state.vocab[word] || { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };

  if (grade === 0) {
    card.lapses += 1;
    card.reps = 0;
    card.interval = 0;
    card.ease = Math.max(1.3, card.ease - 0.2);
    card.due = now + 8 * 60000; // back within the same session
  } else {
    card.reps += 1;
    if (card.reps === 1) card.interval = 1;
    else if (card.reps === 2) card.interval = 3;
    else card.interval = Math.round(card.interval * card.ease);
    if (grade === 1) {
      card.ease = Math.max(1.3, card.ease - 0.15);
      card.interval = Math.max(1, Math.round(card.interval * 0.7));
    } else {
      card.ease = Math.min(2.8, card.ease + 0.05);
    }
    card.due = now + card.interval * DAY;
  }
  card.lastTs = now;
  state.vocab[word] = card;
  save();
  return card;
}

/** A word counts as learned once it has survived to a week-plus interval. */
export const isMastered = (card) => !!card && card.interval >= 7 && card.reps >= 3;

export function vocabStats(allWords) {
  let seen = 0;
  let mastered = 0;
  let due = 0;
  const now = Date.now();
  for (const w of allWords) {
    const card = state.vocab[w.word];
    if (!card) continue;
    seen += 1;
    if (isMastered(card)) mastered += 1;
    if (card.due <= now) due += 1;
  }
  return { total: allWords.length, seen, mastered, due, fresh: allWords.length - seen };
}

/** Build a review queue: everything due, then new words, capped at `size`. */
export function vocabQueue(allWords, size = 20) {
  const now = Date.now();
  const due = [];
  const fresh = [];
  for (const w of allWords) {
    const card = state.vocab[w.word];
    if (!card) fresh.push(w);
    else if (card.due <= now) due.push({ w, due: card.due });
  }
  due.sort((a, b) => a.due - b.due);
  const queue = due.slice(0, size).map((d) => d.w);
  // Introduce new words in band order so the core list lands first.
  fresh.sort((a, b) => a.band - b.band);
  for (const w of fresh) {
    if (queue.length >= size) break;
    queue.push(w);
  }
  return queue;
}

/* ── backup ───────────────────────────────────────────────────── */

export function exportJSON() {
  flush();
  return JSON.stringify(state, null, 1);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.attempts)) {
    throw new Error('not a backup file');
  }
  state = { ...blank(), ...parsed, settings: { ...blank().settings, ...parsed.settings } };
  flush();
  return state;
}

export function reset() {
  state = blank();
  flush();
}

addEventListener('pagehide', flush);
addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
