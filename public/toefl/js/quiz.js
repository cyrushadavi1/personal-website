/* Renders one question of any TOEFL multiple-choice type and reports the result.

   Two modes:
     practice  reveal the answer and explanation as soon as she checks
     test      collect the answer silently (used by the diagnostic) */

import { el, frag, esc, icon, ICONS, LETTERS, announce } from './ui.js';

export const TYPE_LABEL = {
  factual: ['Factual information', '事实信息'],
  'negative-factual': ['Negative factual', '排除题'],
  inference: ['Inference', '推断题'],
  'rhetorical-purpose': ['Rhetorical purpose', '修辞目的'],
  vocabulary: ['Vocabulary', '词汇题'],
  reference: ['Reference', '指代题'],
  'sentence-simplification': ['Sentence simplification', '句子简化'],
  'insert-text': ['Insert text', '插入句子'],
  summary: ['Prose summary', '总结题'],
  'gist-content': ['Main idea', '主旨题'],
  'gist-purpose': ['Purpose', '目的题'],
  detail: ['Detail', '细节题'],
  function: ['Function', '功能题'],
  attitude: ['Attitude', '态度题'],
  organization: ['Organization', '结构题'],
  'connecting-content': ['Connecting content', '内容联系'],
  'multi-detail': ['Detail, choose two', '细节题，选两个'],
};

export const isMulti = (q) => Array.isArray(q.answer);
export const pickCount = (q) => (isMulti(q) ? q.answer.length : 1);

/** Options as displayed. Summary questions carry six; the rest carry four. */
const optionsOf = (q) =>
  q.type === 'insert-text'
    ? q.insertAfter.map((s, i) => `Position ${i + 1}: after "${tail(s)}"`)
    : q.options;

const tail = (sentence, words = 7) => {
  const parts = String(sentence).trim().split(/\s+/);
  return (parts.length > words ? '... ' : '') + parts.slice(-words).join(' ');
};

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * @returns {{node: HTMLElement, check: Function, isReady: Function, selection: Function}}
 */
export function renderQuestion(q, { mode = 'practice', zh = true, onChange, onResolved } = {}) {
  const opts = optionsOf(q);
  const need = pickCount(q);
  const multi = need > 1;
  let selected = [];
  let resolved = false;

  const [labelEn, labelZh] = TYPE_LABEL[q.type] || ['Question', '题目'];

  const stem = el('div', { class: 'qstem' },
    el('span', { class: 'qtype', text: zh ? `${labelEn} · ${labelZh}` : labelEn }),
    el('span', { text: q.stem })
  );

  const extras = [];
  if (q.type === 'insert-text') {
    extras.push(el('div', { class: 'card', style: 'background:var(--surface-2);border-style:dashed' },
      el('div', { class: 'eyebrow', text: 'Sentence to insert' }),
      el('p', { class: 'passage', style: 'margin:6px 0 0', text: q.insertSentence })
    ));
  }
  if (q.type === 'summary' && q.summaryIntro) {
    extras.push(el('div', { class: 'card', style: 'background:var(--surface-2)' },
      el('p', { style: 'margin:0;font-weight:600', text: q.summaryIntro })
    ));
  }
  if (multi) {
    extras.push(el('p', { class: 'lede', style: 'font-size:.86rem;margin:0' },
      `Choose ${need}.`, zh ? el('span', { class: 'zh', text: `　选 ${need} 项。` }) : null));
  }

  const buttons = opts.map((text, i) =>
    el('button', {
      class: 'opt', type: 'button', 'aria-pressed': 'false',
      onClick: () => toggle(i),
    },
      el('span', { class: 'key', 'aria-hidden': 'true', text: LETTERS[i] }),
      el('span', { text })
    )
  );

  const list = el('div', {
    class: 'opts',
    role: multi ? 'group' : 'radiogroup',
    'aria-label': multi ? `Choose ${need}` : 'Answer choices',
  }, buttons);

  const verdictSlot = el('div');

  function toggle(i) {
    if (resolved) return;
    if (multi) {
      if (selected.includes(i)) selected = selected.filter((x) => x !== i);
      else if (selected.length < need) selected.push(i);
      else return; // full: make her deselect deliberately rather than silently swap
    } else {
      selected = [i];
    }
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(selected.includes(j))));
    onChange?.();
  }

  /** Grade, paint the options, and (in practice mode) show the explanation. */
  function check() {
    if (resolved || selected.length !== need) return null;
    resolved = true;

    const key = isMulti(q) ? q.answer : [q.answer];
    const correct = sameSet(selected, key);

    buttons.forEach((b, i) => {
      b.disabled = true;
      if (key.includes(i)) b.dataset.state = 'ok';
      else if (selected.includes(i)) b.dataset.state = 'bad';
    });

    if (mode === 'practice') {
      const heading = correct
        ? (multi && !correct ? '' : 'Correct')
        : selected.length && key.some((k) => selected.includes(k))
          ? 'Partly right'
          : 'Not quite';
      const answerLine = key.map((i) => LETTERS[i]).join(' and ');
      verdictSlot.append(
        el('div', { class: `verdict ${correct ? 'ok' : 'bad'}`, style: 'margin-top:14px' },
          el('div', { class: 'head' }, correct ? 'Correct' : heading,
            !correct ? ` · answer ${answerLine}` : null),
          el('p', { text: q.explanation_en }),
          zh && q.explanation_zh ? el('p', { class: 'zh', style: 'margin-bottom:0', text: q.explanation_zh }) : null
        )
      );
      announce(correct ? 'Correct' : `Incorrect. The answer is ${answerLine}.`);
    }

    onResolved?.(correct);
    return correct;
  }

  const node = el('div', { class: 'stack' }, stem, ...extras, list, verdictSlot);

  return {
    node,
    check,
    isReady: () => selected.length === need,
    isResolved: () => resolved,
    selection: () => selected.slice(),
    correctAnswer: () => (isMulti(q) ? q.answer : [q.answer]),
  };
}

/* ── passage rendering ────────────────────────────────────────── */

/** Wrap the first verbatim occurrence of `needle` in <mark>. */
function withHighlight(text, needle) {
  const at = needle ? text.indexOf(needle) : -1;
  if (at < 0) return esc(text);
  return (
    esc(text.slice(0, at)) +
    `<mark>${esc(needle)}</mark>` +
    esc(text.slice(at + needle.length))
  );
}

/** Insert numbered square markers after each candidate sentence. */
function withSquares(text, sentences) {
  let out = '';
  let cursor = 0;
  sentences.forEach((sentence, i) => {
    const at = text.indexOf(sentence, cursor);
    if (at < 0) return;
    const end = at + sentence.length;
    out += esc(text.slice(cursor, end));
    out += `<span class="sq" data-sq="${i}" role="img" aria-label="Position ${i + 1}">■${i + 1}</span>`;
    cursor = end;
  });
  return out + esc(text.slice(cursor));
}

/**
 * Render a reading passage. `focus` is the current question, used to decide
 * what to highlight and where to draw insertion squares.
 */
export function renderPassage(passage, focus = null, { glossary = true } = {}) {
  const wrap = el('div', { class: 'passage' });

  passage.paragraphs.forEach((text, i) => {
    const n = i + 1;
    let html = esc(text);

    if (focus && focus.paragraph === n) {
      if (focus.type === 'insert-text' && focus.insertAfter) {
        html = withSquares(text, focus.insertAfter);
      } else if (focus.highlight) {
        html = withHighlight(text, focus.highlight);
      }
    }

    if (glossary && passage.glossary?.length) {
      for (const g of passage.glossary) {
        html = html.replace(
          new RegExp(`\\b(${g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i'),
          `<span class="term" title="${esc(g.def_en)}${g.def_zh ? ` / ${esc(g.def_zh)}` : ''}">$1</span>`
        );
      }
    }

    wrap.append(el('p', { dataset: { p: String(n) }, html }));
  });

  return wrap;
}

/** Keep the insertion squares in sync with the selected option. */
export function linkSquares(passageNode, quiz) {
  const squares = [...passageNode.querySelectorAll('.sq')];
  if (squares.length === 0) return;
  const paint = () => {
    const sel = quiz.selection();
    squares.forEach((s) => s.classList.toggle('on', sel.includes(Number(s.dataset.sq))));
  };
  squares.forEach((s) => {
    s.tabIndex = 0;
    const activate = () => {
      if (quiz.isResolved()) return;
      passageNode.dispatchEvent(new CustomEvent('pick', { detail: Number(s.dataset.sq), bubbles: true }));
    };
    s.addEventListener('click', activate);
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
  return paint;
}
