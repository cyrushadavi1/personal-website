/* The placement diagnostic.

   Unlike practice, this runs in test mode: no feedback until the end, so the
   estimate is not contaminated by learning mid-test. About 25 minutes. */

import { el, icon, ICONS, shuffle, fmtTime, announce } from './ui.js';
import { renderQuestion, renderPassage, linkSquares, TYPE_LABEL } from './quiz.js';
import { mount, go } from './app.js';
import * as store from './store.js';
import * as data from './data.js';

const zhOn = () => store.settings().zh;
const READING_Q = 8;
const VOCAB_Q = 12;

/* ── intro ────────────────────────────────────────────────────── */

export async function diagnosticIntro() {
  const previous = store.diagnostic();

  const line = (n, en, zh) =>
    el('div', { style: 'display:flex;gap:12px;align-items:flex-start' },
      el('span', {
        style: 'flex:none;width:26px;height:26px;border-radius:99px;background:var(--accent-wash);' +
               'color:var(--accent);font-weight:700;font-size:.8rem;display:grid;place-items:center',
        text: String(n),
      }),
      el('div', {}, el('div', { text: en }), zhOn() ? el('div', { class: 'zh', text: zh }) : null));

  mount({
    title: 'Diagnostic',
    back: '/',
    body: el('div', { class: 'stack-lg' },
      el('div', {},
        el('h1', {}, 'Find your starting level'),
        el('p', { class: 'lede', style: 'margin-top:6px' },
          'One short test that estimates a reading and listening score, so practice can start at the right difficulty.',
          zhOn() ? el('span', { class: 'zh', text: '　一次简短测试，估算你的阅读和听力水平，以便从合适的难度开始练习。' }) : null)),

      el('div', { class: 'card stack' },
        line(1, 'One reading passage, 8 questions', '一篇阅读，8 道题'),
        line(2, 'One conversation, 5 questions', '一段对话，5 道题'),
        line(3, `${VOCAB_Q} vocabulary words`, `${VOCAB_Q} 个词汇题`)),

      el('div', { class: 'verdict', style: 'background:var(--surface-2)' },
        el('div', { class: 'head', text: 'About 25 minutes' }),
        el('p', { style: 'margin:0' },
          'Answers are not shown until the end, so the estimate stays honest. You can review every question afterwards.'),
        zhOn() ? el('p', { class: 'zh', style: 'margin:4px 0 0', text: '答案在全部完成后才显示，以保证估分准确。结束后可以逐题复习。' }) : null),

      previous
        ? el('p', { class: 'lede', style: 'font-size:.86rem' },
            `You last took this on ${new Date(previous.ts).toLocaleDateString()}. Taking it again replaces that estimate.`,
            zhOn() ? el('span', { class: 'zh', text: '　重新测试会替换上次的估分。' }) : null)
        : null
    ),
    dock: el('button', { class: 'btn wide', type: 'button', onClick: () => go('/diagnostic/run') },
      previous ? 'Take it again' : 'Start the diagnostic'),
  });
}

/* ── run ──────────────────────────────────────────────────────── */

export async function diagnosticRun() {
  const m = await data.manifest();

  // Prefer standard difficulty, and material she has not already drilled.
  const pickReading = m.reading.filter((r) => r.difficulty === 2);
  const pickListening = m.listening.filter((l) => l.kind === 'conversation' && l.difficulty <= 2);
  const unseen = (list) => {
    const fresh = list.filter((x) => !store.itemState(x.id));
    return (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh.length : list.length))];
  };

  const rMeta = unseen(pickReading.length ? pickReading : m.reading);
  const lMeta = unseen(pickListening.length ? pickListening : m.listening);

  const [passage, listening, allWords, times] = await Promise.all([
    data.passage(rMeta.id),
    data.listeningItem(lMeta.id),
    data.vocab(),
    data.timings(lMeta.id).catch(() => null),
  ]);

  // Reading: keep the passage-order spread, drop the prose-summary question,
  // which is long and dominates a short diagnostic.
  const rQuestions = passage.questions.filter((q) => q.type !== 'summary').slice(0, READING_Q);
  const lQuestions = listening.questions;

  // Vocabulary: an even spread across the three bands so the estimate is not
  // decided by whichever band happened to be sampled.
  const vWords = [1, 2, 3].flatMap((band) =>
    shuffle(allWords.filter((w) => w.band === band)).slice(0, VOCAB_Q / 3));

  const answers = { r: [], l: [], v: [] };
  const audio = new Audio(data.audioURL(lMeta.id));
  audio.preload = 'auto';
  const dispose = () => { audio.pause(); audio.src = ''; };

  sectionIntro({
    n: 1, of: 3, label: 'Reading', zh: '阅读',
    detail: `One passage, ${rQuestions.length} questions.`,
    detailZh: `一篇文章，${rQuestions.length} 道题。`,
    start: readingSection,
  });

  /* ---- section chrome ---- */

  function sectionIntro({ n, of, label, zh, detail, detailZh, start }) {
    mount({
      title: 'Diagnostic',
      rail: (n - 1) / of,
      body: el('div', { class: 'stack-lg', style: 'text-align:center;padding-top:34px' },
        el('div', { class: 'eyebrow', text: `Section ${n} of ${of}` }),
        el('h1', {}, label, zhOn() ? el('span', { class: 'zh', style: 'display:block;font-size:1rem', text: zh }) : null),
        el('p', { class: 'lede' }, detail,
          zhOn() ? el('span', { class: 'zh', style: 'display:block', text: detailZh }) : null)),
      dock: el('button', { class: 'btn wide', type: 'button', onClick: start }, 'Begin'),
    });
  }

  /* ---- reading ---- */

  function readingSection() {
    let i = 0;
    const step = () => {
      const q = rQuestions[i];
      const quiz = renderQuestion(q, {
        mode: 'test', zh: zhOn(),
        onChange: () => { nextBtn.disabled = !quiz.isReady(); paint?.(); },
      });

      const pane = el('div', { class: 'readpane' }, renderPassage(passage, q));
      const paint = q.type === 'insert-text' ? linkSquares(pane, quiz) : null;
      pane.addEventListener('pick', (e) => quiz.node.querySelectorAll('.opt')[e.detail]?.click());

      const context = el('div', { class: 'split-read' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px', text: passage.title }),
        pane,
        el('button', {
          class: 'btn quiet sm readtoggle', type: 'button',
          onClick: (e) => {
            pane.classList.toggle('full');
            e.target.textContent = pane.classList.contains('full') ? 'Collapse passage' : 'Expand passage';
          },
        }, 'Expand passage'));

      const nextBtn = el('button', { class: 'btn wide', type: 'button', disabled: true,
        onClick: () => {
          answers.r.push({ q, picked: quiz.selection() });
          i += 1;
          if (i >= rQuestions.length) {
            sectionIntro({
              n: 2, of: 3, label: 'Listening', zh: '听力',
              detail: `One conversation, ${lQuestions.length} questions. Listen once, then answer.`,
              detailZh: `一段对话，${lQuestions.length} 道题。先听一遍，然后答题。`,
              start: listeningSection,
            });
          } else step();
        },
      }, i + 1 < rQuestions.length ? 'Next' : 'Finish reading');

      mount({
        title: `Reading · ${i + 1}/${rQuestions.length}`,
        rail: (i / rQuestions.length) / 3,
        body: el('div', { class: 'stack-lg' }, context, quiz.node),
        dock: nextBtn,
      });
      paint?.();
    };
    step();
  }

  /* ---- listening ---- */

  function listeningSection() {
    const playBtn = el('button', {
      class: 'playbtn', type: 'button', 'aria-label': 'Play',
      onClick: () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()),
    }, icon(ICONS.play, 30));
    const sync = () => playBtn.replaceChildren(icon(audio.paused ? ICONS.play : ICONS.pause, 30));
    audio.addEventListener('play', sync);
    audio.addEventListener('pause', sync);

    const elapsed = el('p', { class: 'lede mono', style: 'margin:14px 0 0', text: '0:00' });
    audio.addEventListener('timeupdate', () => {
      elapsed.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration || times?.duration || 0)}`;
    });
    audio.addEventListener('ended', () => { goBtn.disabled = false; });

    const goBtn = el('button', { class: 'btn wide', type: 'button',
      onClick: () => { audio.pause(); questions(); } }, 'Go to questions');

    mount({
      title: 'Listening',
      rail: 1 / 3,
      body: el('div', { class: 'stack-lg' },
        el('div', { class: 'player' },
          el('div', { class: 'art', 'aria-hidden': 'true', text: '💬' }),
          el('p', { style: 'font-weight:600', text: listening.setting_en }),
          zhOn() && listening.setting_zh ? el('p', { class: 'zh', text: listening.setting_zh }) : null,
          playBtn, elapsed),
        el('p', { class: 'lede', style: 'font-size:.88rem;text-align:center' },
          'You may take notes on paper. Questions appear after you listen.',
          zhOn() ? el('span', { class: 'zh', style: 'display:block', text: '可以在纸上做笔记。听完后显示题目。' }) : null)),
      dock: goBtn,
    });

    function questions() {
      let i = 0;
      const step = () => {
        const q = lQuestions[i];
        const quiz = renderQuestion(q, { mode: 'test', zh: zhOn(), onChange: () => { nextBtn.disabled = !quiz.isReady(); } });

        let replay = null;
        if (q.replayLine !== undefined && times?.lines) {
          const line = times.lines.find((l) => l.line === q.replayLine);
          if (line) {
            replay = el('div', { class: 'card', style: 'display:flex;gap:12px;align-items:center' },
              el('button', { class: 'btn quiet sm', type: 'button', style: 'flex:none',
                onClick: () => {
                  audio.currentTime = line.start;
                  audio.play().catch(() => {});
                  const stop = () => {
                    if (audio.currentTime >= line.end) { audio.pause(); audio.removeEventListener('timeupdate', stop); }
                  };
                  audio.addEventListener('timeupdate', stop);
                } }, icon(ICONS.replay, 16), 'Replay'),
              el('div', { style: 'font-size:.86rem;color:var(--muted)', text: 'Listen again to part of the conversation.' }));
          }
        }

        const nextBtn = el('button', { class: 'btn wide', type: 'button', disabled: true,
          onClick: () => {
            answers.l.push({ q, picked: quiz.selection() });
            i += 1;
            if (i >= lQuestions.length) {
              sectionIntro({
                n: 3, of: 3, label: 'Vocabulary', zh: '词汇',
                detail: `${vWords.length} words. Pick the closest meaning.`,
                detailZh: `${vWords.length} 个词。选出最接近的意思。`,
                start: vocabSection,
              });
            } else step();
          },
        }, i + 1 < lQuestions.length ? 'Next' : 'Finish listening');

        mount({
          title: `Listening · ${i + 1}/${lQuestions.length}`,
          rail: (1 + i / lQuestions.length) / 3,
          body: el('div', { class: 'stack-lg' }, replay, quiz.node),
          dock: nextBtn,
        });
      };
      step();
    }
  }

  /* ---- vocabulary ---- */

  function vocabSection() {
    let i = 0;
    const step = () => {
      const w = vWords[i];
      const options = shuffle([
        { text: w.def_en, ok: true },
        ...shuffle(allWords.filter((o) => o.word !== w.word && o.pos === w.pos)).slice(0, 3)
          .map((o) => ({ text: o.def_en, ok: false })),
      ]);

      const buttons = options.map((o) =>
        el('button', { class: 'opt', type: 'button', 'aria-pressed': 'false',
          onClick: () => {
            buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
            const btn = buttons[options.indexOf(o)];
            btn.setAttribute('aria-pressed', 'true');
            picked = o;
            nextBtn.disabled = false;
          } }, el('span', { text: o.text })));

      let picked = null;
      const nextBtn = el('button', { class: 'btn wide', type: 'button', disabled: true,
        onClick: () => {
          answers.v.push({ word: w, ok: !!picked?.ok });
          i += 1;
          if (i >= vWords.length) finish();
          else step();
        },
      }, i + 1 < vWords.length ? 'Next' : 'See my results');

      mount({
        title: `Vocabulary · ${i + 1}/${vWords.length}`,
        rail: (2 + i / vWords.length) / 3,
        body: el('div', { class: 'stack-lg' },
          el('div', {},
            el('div', { class: 'eyebrow', text: 'Closest in meaning' }),
            el('div', { style: 'font-size:1.8rem;font-weight:650;letter-spacing:-.02em;margin-top:4px', text: w.word }),
            el('span', { style: 'color:var(--faint);font-style:italic;font-size:.9rem', text: w.pos })),
          el('div', { class: 'opts' }, buttons)),
        dock: nextBtn,
      });
    };
    step();
  }

  /* ---- scoring ---- */

  function finish() {
    dispose();

    const grade = (rows, diff) => rows.map(({ q, picked }) => {
      const key = Array.isArray(q.answer) ? q.answer : [q.answer];
      const ok = key.length === picked.length && picked.every((p) => key.includes(p));
      return { q, picked, ok, diff };
    });

    const rGraded = grade(answers.r, passage.difficulty);
    const lGraded = grade(answers.l, listening.difficulty);

    for (const g of rGraded) {
      store.recordAttempt({ sec: 'r', item: passage.id, q: g.q.id, type: g.q.type, diff: g.diff, ok: g.ok });
    }
    for (const g of lGraded) {
      store.recordAttempt({ sec: 'l', item: listening.id, q: g.q.id, type: g.q.type, diff: g.diff, ok: g.ok });
    }
    for (const v of answers.v) {
      store.recordAttempt({ sec: 'v', item: 'diagnostic', q: v.word.word, type: 'vocabulary', diff: v.word.band, ok: v.ok });
      // A diagnostic hit seeds the schedule so known words are not re-taught.
      store.reviewWord(v.word.word, v.ok ? 1 : 0);
    }

    const rBand = store.band(store.theta(rGraded.map((g) => ({ ok: g.ok ? 1 : 0, diff: g.diff }))), rGraded.length);
    const lBand = store.band(store.theta(lGraded.map((g) => ({ ok: g.ok ? 1 : 0, diff: g.diff }))), lGraded.length);
    const vPct = answers.v.filter((v) => v.ok).length / (answers.v.length || 1);

    const result = {
      reading: rBand, listening: lBand,
      vocab: { pct: Math.round(vPct * 100), known: Math.round(vPct * 200) },
      readingItem: passage.id, listeningItem: listening.id,
    };
    store.saveDiagnostic(result);
    store.flush();

    diagnosticResult(result, [...rGraded, ...lGraded]);
  }
}

/* ── result ───────────────────────────────────────────────────── */

export function diagnosticResult(result = store.diagnostic(), review = []) {
  if (!result) return go('/diagnostic', { replace: true });

  const scoreCard = (label, zh, band) =>
    el('div', { class: 'card score' },
      el('div', { class: 'n' }, band ? `${band.low}–${band.high}` : '--'),
      el('div', { class: 'l', text: label }),
      zhOn() ? el('div', { class: 'zh', style: 'font-size:.72rem', text: zh }) : null);

  const total = (result.reading?.score ?? 0) + (result.listening?.score ?? 0);

  mount({
    title: 'Your level',
    back: '/',
    body: el('div', { class: 'stack-lg' },
      el('div', {},
        el('h1', {}, 'Starting estimate'),
        el('p', { class: 'lede', style: 'margin-top:6px' },
          'A rough placement from a short sample, not a predicted test score. It sharpens as you practice.',
          zhOn() ? el('span', { class: 'zh', text: '　这是根据少量题目做出的初步定位，不是预测分数。随着练习会越来越准。' }) : null)),

      el('div', { class: 'scoregrid' },
        scoreCard('Reading', '阅读', result.reading),
        scoreCard('Listening', '听力', result.listening),
        el('div', { class: 'card score' },
          el('div', { class: 'n' }, `${result.vocab.pct}`, el('small', { text: '%' })),
          el('div', { class: 'l', text: 'Vocabulary' }),
          zhOn() ? el('div', { class: 'zh', style: 'font-size:.72rem', text: '词汇' }) : null)),

      el('div', { class: 'card' },
        el('div', { class: 'eyebrow', text: 'What this suggests' }),
        el('p', { style: 'margin:8px 0 0', text: adviceFor(result) }),
        zhOn() ? el('p', { class: 'zh', style: 'margin:6px 0 0', text: adviceForZh(result) }) : null),

      review.length
        ? el('details', { class: 'help' },
            el('summary', {}, `Review all ${review.length} questions`),
            el('div', { class: 'stack' },
              ...review.map((g, n) =>
                el('div', { style: 'padding:10px 0;border-top:1px solid var(--line)' },
                  el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' },
                    el('span', { class: `chip ${g.ok ? 'done' : 'd3'}`, text: g.ok ? 'correct' : 'missed' }),
                    el('span', { style: 'font-size:.78rem;color:var(--faint)', text: (TYPE_LABEL[g.q.type] || [''])[0] })),
                  el('p', { style: 'font-weight:600;margin:0 0 4px', text: `${n + 1}. ${g.q.stem}` }),
                  el('p', { style: 'margin:0', text: g.q.explanation_en }),
                  zhOn() ? el('p', { class: 'zh', style: 'margin:2px 0 0', text: g.q.explanation_zh }) : null))))
        : null
    ),
    dock: el('button', { class: 'btn wide', type: 'button', onClick: () => go('/') }, 'Start practicing'),
  });
  announce('Diagnostic complete.');
}

function weakest(result) {
  const r = result.reading?.score ?? 15;
  const l = result.listening?.score ?? 15;
  if (Math.abs(r - l) <= 2) return 'both';
  return r < l ? 'reading' : 'listening';
}

function adviceFor(result) {
  const w = weakest(result);
  const vocabLow = result.vocab.pct < 60;
  const parts = [];
  if (w === 'reading') parts.push('Reading is the weaker of the two, so put most sessions there for now.');
  else if (w === 'listening') parts.push('Listening is the weaker of the two, so put most sessions there for now.');
  else parts.push('Reading and listening are close, so alternate between them.');
  parts.push(vocabLow
    ? 'Vocabulary is the fastest thing to move: ten minutes of review a day will lift both sections.'
    : 'Your vocabulary base is solid, so keep review short and spend the time on full passages.');
  return parts.join(' ');
}

function adviceForZh(result) {
  const w = weakest(result);
  const vocabLow = result.vocab.pct < 60;
  const first = w === 'reading' ? '阅读相对较弱，近期练习以阅读为主。'
    : w === 'listening' ? '听力相对较弱，近期练习以听力为主。'
      : '阅读和听力水平接近，可以交替练习。';
  return first + (vocabLow
    ? '词汇提升最快，每天十分钟复习就能同时带动两个部分。'
    : '词汇基础不错，复习保持简短即可，把时间放在完整篇章上。');
}
