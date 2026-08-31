/* The reading and listening practice runners, plus the shared results screen. */

import { el, frag, icon, ICONS, fmtTime, toast, announce } from './ui.js';
import { renderQuestion, renderPassage, linkSquares, TYPE_LABEL } from './quiz.js';
import { mount, setRail, go } from './app.js';
import * as store from './store.js';
import * as data from './data.js';

const zhOn = () => store.settings().zh;

/* ── results ──────────────────────────────────────────────────── */

function results({ title, itemId, sec, log, retryPath, backPath }) {
  const total = log.length;
  const correct = log.filter((r) => r.ok).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  store.recordItem(itemId, correct, total);

  const missed = log.filter((r) => !r.ok);
  const est = store.estimate(sec);

  const body = el('div', { class: 'stack-lg' },
    el('div', { class: 'card', style: 'text-align:center;padding:26px 16px' },
      el('div', { class: 'eyebrow', text: 'Score' }),
      el('div', { style: 'font-size:2.9rem;font-weight:700;letter-spacing:-.03em;line-height:1.1' },
        `${correct}`, el('span', { style: 'color:var(--faint)', text: ` / ${total}` })),
      el('p', { class: 'lede', style: 'margin:2px 0 0', text: `${pct}% correct` }),
      est
        ? el('p', { class: 'lede', style: 'margin-top:10px;font-size:.88rem' },
            `Estimated ${sec === 'r' ? 'reading' : 'listening'} score: `,
            el('b', { text: `${est.low}–${est.high}` }), ' / 30',
            zhOn() ? el('span', { class: 'zh', text: `　预估分数 ${est.low}–${est.high} 分` }) : null)
        : null
    ),

    missed.length
      ? el('div', { class: 'stack' },
          el('h3', {}, `Review ${missed.length} missed`,
            zhOn() ? el('span', { class: 'zh', text: `　复习错题` }) : null),
          ...missed.map((r) =>
            el('details', { class: 'help' },
              el('summary', {},
                el('span', { style: 'flex:1' }, `${r.n}. ${(TYPE_LABEL[r.type] || ['Question'])[0]}`),
                el('span', { class: 'chip d3', text: 'missed' })),
              el('div', { class: 'stack' },
                el('p', { style: 'font-weight:600;color:var(--ink)', text: r.stem }),
                el('p', { text: r.explanation_en }),
                zhOn() && r.explanation_zh ? el('p', { class: 'zh', text: r.explanation_zh }) : null)))
        )
      : el('div', { class: 'verdict ok' },
          el('div', { class: 'head', text: 'Every question correct' }),
          el('p', { style: 'margin:0', text: 'Try a harder passage to keep the estimate moving.' }),
          zhOn() ? el('p', { class: 'zh', style: 'margin:4px 0 0', text: '全部答对。可以试试更难的材料。' }) : null),

    el('div', { class: 'stack' },
      el('button', { class: 'btn wide', type: 'button', onClick: () => go(backPath) }, 'Back to library'),
      el('button', { class: 'btn ghost wide', type: 'button', onClick: () => go(retryPath) }, 'Try this one again'))
  );

  mount({ title, back: backPath, body, rail: 1 });
  announce(`Finished. ${correct} of ${total} correct.`);
}

/* ── shared question stepper ──────────────────────────────────── */

/**
 * Steps through a question list with per-question feedback.
 * `renderContext` draws whatever sits above the question (a passage, a replay
 * button) and is re-run for every question so highlights can follow along.
 */
function runQuestions({ title, backPath, retryPath, itemId, sec, difficulty, questions, renderContext }) {
  const log = [];
  let i = 0;

  const step = () => {
    const q = questions[i];
    const quiz = renderQuestion(q, {
      mode: 'practice',
      zh: zhOn(),
      onChange: () => { checkBtn.disabled = !quiz.isReady(); paintSquares?.(); },
      onResolved: (ok) => {
        store.recordAttempt({ sec, item: itemId, q: q.id, type: q.type, diff: difficulty, ok });
        log.push({ ...q, n: i + 1, ok });
      },
    });

    const context = renderContext?.(q, quiz) ?? null;
    const paintSquares = context?.paint ?? null;
    if (context?.node && q.type === 'insert-text') {
      // Tapping a square in the passage is the same act as picking that option.
      context.node.addEventListener('pick', (e) => {
        quiz.node.querySelectorAll('.opt')[e.detail]?.click();
      });
    }

    const checkBtn = el('button', { class: 'btn wide', type: 'button', disabled: true, onClick: onCheck }, 'Check');
    const nextBtn = el('button', { class: 'btn wide', type: 'button', onClick: onNext },
      i + 1 < questions.length ? 'Next question' : 'See results');
    const dock = el('div', { style: 'width:100%' }, checkBtn);

    function onCheck() {
      quiz.check();
      dock.replaceChildren(nextBtn);
      nextBtn.focus({ preventScroll: true });
      context?.onResolved?.();
    }
    function onNext() {
      i += 1;
      if (i >= questions.length) {
        results({ title, itemId, sec, log, retryPath, backPath });
        return;
      }
      step();
    }

    mount({
      title: `${title} · ${i + 1}/${questions.length}`,
      back: backPath,
      rail: i / questions.length,
      body: el('div', { class: 'stack-lg' }, context?.node ?? null, quiz.node),
      dock,
    });
    paintSquares?.();
    announce(`Question ${i + 1} of ${questions.length}`);
  };

  step();
}

/* ── reading ──────────────────────────────────────────────────── */

export async function readingDrill(id) {
  const p = await data.passage(id);
  let expanded = false;

  const context = (q, quiz) => {
    const node = el('div', { class: 'split-read' });
    const pane = el('div', { class: `readpane${expanded ? ' full' : ''}` }, renderPassage(p, q));
    const toggle = el('button', {
      class: 'btn quiet sm readtoggle', type: 'button',
      onClick: () => {
        expanded = !expanded;
        pane.classList.toggle('full', expanded);
        toggle.textContent = expanded ? 'Collapse passage' : 'Expand passage';
      },
    }, expanded ? 'Collapse passage' : 'Expand passage');

    node.append(
      el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, p.title),
      pane,
      toggle
    );

    // Scroll the paragraph the question is about into view.
    if (q.paragraph) {
      requestAnimationFrame(() => {
        const target = pane.querySelector(`p[data-p="${q.paragraph}"]`);
        if (target) pane.scrollTop = Math.max(0, target.offsetTop - pane.offsetTop - 12);
      });
    }

    const paint = q.type === 'insert-text' ? linkSquares(pane, quiz) : null;
    return { node, paint };
  };

  runQuestions({
    title: p.title,
    backPath: '/reading',
    retryPath: `/reading/${id}`,
    itemId: id,
    sec: 'r',
    difficulty: p.difficulty,
    questions: p.questions,
    renderContext: context,
  });
}

/* ── listening ────────────────────────────────────────────────── */

export async function listeningDrill(id) {
  const [item, times] = await Promise.all([data.listeningItem(id), data.timings(id).catch(() => null)]);

  const audio = new Audio(data.audioURL(id));
  audio.preload = 'auto';
  audio.playbackRate = store.settings().speed || 1;

  let stopAt = null;
  const dispose = () => { audio.pause(); audio.src = ''; };

  audio.addEventListener('timeupdate', () => {
    if (stopAt !== null && audio.currentTime >= stopAt) {
      audio.pause();
      stopAt = null;
    }
  });

  /** Play the whole clip, or one script line for a replay question. */
  function play(from = null, to = null) {
    stopAt = to;
    if (from !== null) audio.currentTime = from;
    return audio.play().catch(() => {
      toast('Tap play once to allow audio');
    });
  }

  listenPhase();

  function listenPhase() {
    const kindEn = item.kind === 'lecture' ? 'Lecture' : 'Conversation';
    const playBtn = el('button', {
      class: 'playbtn', type: 'button', 'aria-label': 'Play',
      onClick: () => (audio.paused ? play() : audio.pause()),
    }, icon(ICONS.play, 30));

    const setIcon = () => {
      playBtn.replaceChildren(icon(audio.paused ? ICONS.play : ICONS.pause, 30));
      playBtn.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    };
    audio.addEventListener('play', setIcon);
    audio.addEventListener('pause', setIcon);

    const scrubber = el('input', {
      type: 'range', min: '0', max: '1000', value: '0',
      'aria-label': 'Seek',
      onInput: (e) => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; },
    });
    const nowLabel = el('span', { class: 't mono', text: '0:00' });
    const endLabel = el('span', { class: 't mono', style: 'text-align:right', text: '--:--' });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      scrubber.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      nowLabel.textContent = fmtTime(audio.currentTime);
    });
    const setDuration = () => { endLabel.textContent = fmtTime(audio.duration || times?.duration || 0); };
    audio.addEventListener('loadedmetadata', setDuration);
    setDuration();

    const speeds = el('div', { class: 'speeds', role: 'group', 'aria-label': 'Playback speed' },
      [0.85, 1, 1.15].map((rate) =>
        el('button', {
          type: 'button', 'aria-pressed': String((store.settings().speed || 1) === rate),
          onClick: (e) => {
            audio.playbackRate = rate;
            store.setSetting('speed', rate);
            [...e.target.parentNode.children].forEach((b) =>
              b.setAttribute('aria-pressed', String(b === e.target)));
          },
        }, `${rate}×`)));

    const notes = el('textarea', {
      class: 'notepad', placeholder: 'Notes (as on the real test, you may take notes while you listen)',
      'aria-label': 'Notes',
      onInput: (e) => store.saveNote(id, e.target.value),
    });
    notes.value = store.getNote(id);

    mount({
      title: kindEn,
      back: '/listening',
      rail: 0,
      body: el('div', { class: 'stack-lg' },
        el('div', { class: 'player' },
          el('div', { class: 'art', 'aria-hidden': 'true', text: item.kind === 'lecture' ? '🎓' : '💬' }),
          el('p', { style: 'font-weight:600;margin-bottom:2px', text: item.setting_en }),
          zhOn() && item.setting_zh ? el('p', { class: 'zh', text: item.setting_zh }) : null,
          playBtn,
          el('div', { class: 'scrub' }, nowLabel, scrubber, endLabel),
          speeds),
        el('div', { class: 'stack' },
          el('div', { class: 'eyebrow', text: 'Notes' }),
          notes),
        el('p', { class: 'lede', style: 'font-size:.86rem' },
          'The questions stay hidden until you finish listening, as on the real test.',
          zhOn() ? el('span', { class: 'zh', text: '　与真实考试一致，听完后才显示题目。' }) : null)
      ),
      dock: el('button', {
        class: 'btn wide', type: 'button',
        onClick: () => { audio.pause(); questionPhase(); },
      }, 'Go to questions'),
    });
  }

  function questionPhase() {
    const context = (q) => {
      if (q.replayLine === undefined || !times?.lines) return null;
      const line = times.lines.find((l) => l.line === q.replayLine);
      if (!line) return null;
      const node = el('div', { class: 'card', style: 'display:flex;align-items:center;gap:12px' },
        el('button', {
          class: 'btn quiet sm', type: 'button', style: 'flex:none',
          onClick: () => play(line.start, line.end),
        }, icon(ICONS.replay, 16), 'Replay'),
        el('div', { style: 'font-size:.86rem;color:var(--muted)' },
          'Listen again to part of the ', item.kind, '.',
          zhOn() ? el('span', { class: 'zh', text: '　再听一遍这一段。' }) : null)
      );
      return { node };
    };

    runQuestions({
      title: item.kind === 'lecture' ? 'Lecture' : 'Conversation',
      backPath: '/listening',
      retryPath: `/listening/${id}`,
      itemId: id,
      sec: 'l',
      difficulty: item.difficulty,
      questions: item.questions,
      renderContext: context,
    });
  }

  return { dispose };
}
