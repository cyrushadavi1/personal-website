/* Vocabulary: an SM-2 review queue rendered as multiple choice.

   Two card shapes, because recognition and recall are different skills:
     new words   see the word in context, pick its meaning   (teaches)
     due words   see the meaning, pick the word              (tests recall) */

import { el, frag, shuffle, toast, announce, esc } from './ui.js';
import { mount, go } from './app.js';
import * as store from './store.js';
import * as data from './data.js';

const zhOn = () => store.settings().zh;
const QUEUE = 20;

/* ── hub ──────────────────────────────────────────────────────── */

export async function vocabHome() {
  const words = await data.vocab();
  const s = store.vocabStats(words);
  const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;

  const stat = (n, label, zh) =>
    el('div', { class: 'card score' },
      el('div', { class: 'n', text: String(n) }),
      el('div', { class: 'l', text: label }),
      zhOn() && zh ? el('div', { class: 'zh', style: 'font-size:.72rem', text: zh }) : null);

  const ready = s.due + s.fresh > 0;

  mount({
    title: 'Vocabulary',
    back: '/',
    body: el('div', { class: 'stack-lg' },
      el('div', {},
        el('h1', {}, 'Academic word list'),
        el('p', { class: 'lede', style: 'margin-top:4px' },
          `${s.mastered} of ${s.total} words learned`,
          zhOn() ? el('span', { class: 'zh', text: `　已掌握 ${s.mastered} / ${s.total} 词` }) : null),
        el('div', { class: 'meter', style: 'margin-top:10px' }, el('i', { style: `width:${pct}%` }))),

      el('div', { class: 'scoregrid' },
        stat(s.due, 'Due', '待复习'),
        stat(s.fresh, 'New', '未学'),
        stat(s.mastered, 'Learned', '已掌握')),

      ready
        ? el('p', { class: 'lede', style: 'font-size:.9rem' },
            s.due > 0
              ? `${Math.min(s.due, QUEUE)} word${s.due === 1 ? '' : 's'} are due for review today. Words you miss come back sooner.`
              : 'Nothing is due yet, so this session will introduce new words.',
            zhOn()
              ? el('span', { class: 'zh', text: s.due > 0 ? '　答错的词会更快再次出现。' : '　今天没有到期的词，本次将学习新词。' })
              : null)
        : el('div', { class: 'verdict ok' },
            el('div', { class: 'head', text: 'All caught up' }),
            el('p', { style: 'margin:0', text: 'Every word is scheduled for a future day. Come back tomorrow.' })),

      el('button', {
        class: 'btn ghost wide', type: 'button', onClick: () => go('/vocab/list'),
      }, 'Browse the whole list')
    ),
    dock: el('button', {
      class: 'btn wide', type: 'button', disabled: !ready,
      onClick: () => go('/vocab/review'),
    }, s.due > 0 ? `Review ${Math.min(s.due + s.fresh, QUEUE)} words` : 'Learn new words'),
  });
}

/* ── browse ───────────────────────────────────────────────────── */

export async function vocabList() {
  const words = await data.vocab();
  const search = el('input', {
    type: 'search', class: 'notepad', style: 'min-height:44px;resize:none',
    placeholder: 'Search a word or meaning', 'aria-label': 'Search',
    onInput: () => paint(),
  });
  const listNode = el('div', { class: 'rowlist' });

  const paint = () => {
    const q = search.value.trim().toLowerCase();
    const hits = words.filter(
      (w) => !q || w.word.includes(q) || w.def_en.toLowerCase().includes(q) || w.def_zh.includes(q)
    );
    listNode.replaceChildren(
      ...(hits.length
        ? hits.slice(0, 240).map((w) => {
            const card = store.vocabState(w.word);
            return el('details', { class: 'help' },
              el('summary', {},
                el('span', { style: 'flex:1' },
                  el('b', { text: w.word }),
                  el('span', { style: 'color:var(--faint);font-size:.82rem', text: ` ${w.pos}` })),
                store.isMastered(card) ? el('span', { class: 'chip done', text: 'learned' })
                  : card ? el('span', { class: 'chip', text: 'learning' }) : null),
              el('div', { class: 'stack' },
                el('p', { style: 'margin:0', text: w.def_en }),
                zhOn() ? el('p', { class: 'zh', style: 'margin:0', text: w.def_zh }) : null,
                el('p', { class: 'passage', style: 'margin:8px 0 0;font-size:1rem',
                  html: highlightWord(w.example, w.word) }),
                zhOn() ? el('p', { class: 'zh', style: 'margin:2px 0 0', text: w.example_zh }) : null));
          })
        : [el('div', { class: 'empty' }, el('div', { class: 'ico', text: '🔍' }), el('p', { text: 'No matches' }))])
    );
  };

  mount({
    title: `All words (${words.length})`,
    back: '/vocab',
    body: el('div', { class: 'stack' }, search, listNode),
  });
  paint();
}

/** Bold the target word (and simple inflections) inside its example sentence. */
function highlightWord(sentence, word) {
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word;
  const re = new RegExp(`\\b(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)\\b`, 'i');
  const m = re.exec(sentence);
  if (!m) return esc(sentence);
  return (
    esc(sentence.slice(0, m.index)) +
    `<em>${esc(m[0])}</em>` +
    esc(sentence.slice(m.index + m[0].length))
  );
}

/* ── review session ───────────────────────────────────────────── */

export async function vocabReview() {
  const words = await data.vocab();
  const queue = store.vocabQueue(words, QUEUE);

  if (queue.length === 0) return go('/vocab', { replace: true });

  const byWord = new Map(words.map((w) => [w.word, w]));
  let i = 0;
  const log = [];

  const step = () => {
    const w = queue[i];
    const isNew = !store.vocabState(w.word);
    const shownAt = performance.now();
    let answered = false;

    // New words are taught in context; review cards ask for recall.
    const options = isNew
      ? shuffle([
          { text: w.def_en, ok: true },
          ...sampleOthers(words, w, 3).map((o) => ({ text: o.def_en, ok: false })),
        ])
      : shuffle([
          { text: w.word, ok: true },
          ...w.distractors.map((d) => ({ text: d, ok: false })),
        ]);

    const prompt = isNew
      ? el('div', { class: 'stack' },
          el('div', { class: 'eyebrow', text: 'New word · 新词' }),
          el('div', { style: 'font-size:1.7rem;font-weight:650;letter-spacing:-.02em', text: w.word }),
          el('p', { class: 'passage', style: 'margin:8px 0 0;color:var(--muted)',
            html: highlightWord(w.example, w.word) }),
          el('p', { style: 'font-weight:600;margin:14px 0 0' }, 'What does it mean here?',
            zhOn() ? el('span', { class: 'zh', text: '　它在这里是什么意思？' }) : null))
      : el('div', { class: 'stack' },
          el('div', { class: 'eyebrow', text: 'Recall · 回忆' }),
          el('div', { style: 'font-size:1.15rem;font-weight:600', text: w.def_en }),
          zhOn() ? el('div', { class: 'zh', style: 'font-size:1.05rem', text: w.def_zh }) : null,
          el('p', { style: 'font-weight:600;margin:14px 0 0' }, 'Which word is this?',
            zhOn() ? el('span', { class: 'zh', text: '　这是哪个词？' }) : null));

    const buttons = options.map((o) =>
      el('button', { class: 'opt', type: 'button', onClick: () => answer(o) },
        el('span', { text: o.text })));

    const revealSlot = el('div');
    const dock = el('div', { style: 'width:100%' },
      el('p', { class: 'lede', style: 'text-align:center;margin:0;font-size:.84rem' },
        `${i + 1} of ${queue.length}`));

    function answer(choice) {
      if (answered) return;
      answered = true;
      const seconds = (performance.now() - shownAt) / 1000;
      const grade = !choice.ok ? 0 : seconds < 7 ? 2 : 1;
      store.reviewWord(w.word, grade);
      store.recordAttempt({ sec: 'v', item: 'vocab', q: w.word, type: 'vocabulary', diff: w.band, ok: choice.ok });
      log.push({ word: w.word, ok: choice.ok });

      buttons.forEach((b, j) => {
        b.disabled = true;
        if (options[j].ok) b.dataset.state = 'ok';
        else if (options[j] === choice) b.dataset.state = 'bad';
      });

      revealSlot.append(el('div', { class: 'card vcard', style: 'margin-top:16px;text-align:left' },
        el('div', { style: 'display:flex;align-items:baseline;gap:8px' },
          el('span', { style: 'font-size:1.3rem;font-weight:650', text: w.word }),
          el('span', { class: 'pos', text: w.pos })),
        el('p', { style: 'margin:8px 0 0', text: w.def_en }),
        zhOn() ? el('p', { class: 'zh', style: 'margin:2px 0 0', text: w.def_zh }) : null,
        el('p', { class: 'passage', style: 'margin:12px 0 0;font-size:1rem;color:var(--muted)',
          html: highlightWord(w.example, w.word) }),
        zhOn() ? el('p', { class: 'zh', style: 'margin:2px 0 0', text: w.example_zh }) : null));

      const next = el('button', { class: 'btn wide', type: 'button', onClick: advance },
        i + 1 < queue.length ? 'Next word' : 'Finish');
      dock.replaceChildren(next);
      next.focus({ preventScroll: true });
      announce(choice.ok ? 'Correct' : `Incorrect. The word is ${w.word}.`);
    }

    function advance() {
      i += 1;
      if (i >= queue.length) return summary();
      step();
    }

    mount({
      title: 'Vocabulary',
      back: '/vocab',
      rail: i / queue.length,
      body: el('div', { class: 'stack-lg' }, prompt, el('div', { class: 'opts' }, buttons), revealSlot),
      dock,
    });
  };

  function summary() {
    const ok = log.filter((r) => r.ok).length;
    const missed = log.filter((r) => !r.ok).map((r) => byWord.get(r.word)).filter(Boolean);
    mount({
      title: 'Vocabulary',
      back: '/vocab',
      rail: 1,
      body: el('div', { class: 'stack-lg' },
        el('div', { class: 'card', style: 'text-align:center;padding:26px 16px' },
          el('div', { class: 'eyebrow', text: 'Session' }),
          el('div', { style: 'font-size:2.9rem;font-weight:700;line-height:1.1' },
            String(ok), el('span', { style: 'color:var(--faint)', text: ` / ${log.length}` })),
          el('p', { class: 'lede', style: 'margin:2px 0 0' },
            'Missed words return in a few minutes.',
            zhOn() ? el('span', { class: 'zh', text: '　答错的词稍后会再次出现。' }) : null)),
        missed.length
          ? el('div', { class: 'stack' },
              el('h3', {}, 'Worth another look'),
              ...missed.map((w) => el('div', { class: 'card' },
                el('div', { style: 'display:flex;align-items:baseline;gap:8px' },
                  el('b', { text: w.word }), el('span', { class: 'pos', style: 'color:var(--faint);font-size:.85rem', text: w.pos })),
                el('p', { style: 'margin:6px 0 0', text: w.def_en }),
                zhOn() ? el('p', { class: 'zh', style: 'margin:0', text: w.def_zh }) : null)))
          : null),
      dock: el('button', { class: 'btn wide', type: 'button', onClick: () => go('/vocab') }, 'Done'),
    });
    announce(`Session finished. ${ok} of ${log.length} correct.`);
  }

  step();
}

/** Distractor definitions: same part of speech where possible, never the word itself. */
function sampleOthers(words, target, n) {
  const pool = words.filter((w) => w.word !== target.word && w.pos === target.pos);
  const source = pool.length >= n ? pool : words.filter((w) => w.word !== target.word);
  return shuffle(source).slice(0, n);
}
