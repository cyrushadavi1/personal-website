/* Route table plus the home and library screens. */

import { el, icon, ICONS } from './ui.js';
import { mount, route, go } from './app.js';
import * as store from './store.js';
import * as data from './data.js';
import { readingDrill, listeningDrill } from './drill.js';
import { vocabHome, vocabList, vocabReview } from './vocab.js';
import { diagnosticIntro, diagnosticRun, diagnosticResult } from './diagnostic.js';
import { progressScreen, settingsScreen } from './progress.js';

const zhOn = () => store.settings().zh;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return ['Still up', '还没睡'];
  if (h < 12) return ['Good morning', '早上好'];
  if (h < 18) return ['Good afternoon', '下午好'];
  return ['Good evening', '晚上好'];
};

/* ── home ─────────────────────────────────────────────────────── */

async function home() {
  const [m, words] = await Promise.all([data.manifest(), data.vocab()]);
  const vs = store.vocabStats(words);
  const diag = store.diagnostic();
  const days = store.streak();
  const today = store.todayCount();
  const [hi, hiZh] = greeting();

  const doneCount = (list) => list.filter((x) => store.itemState(x.id)).length;
  const rDone = doneCount(m.reading);
  const lDone = doneCount(m.listening);

  const tile = (emoji, label, zh, sub, path, fraction) =>
    el('button', { class: 'tile', type: 'button', onClick: () => go(path) },
      el('span', { class: 'ico', 'aria-hidden': 'true', text: emoji }),
      el('b', {}, label),
      zhOn() ? el('small', { class: 'zh', style: 'margin-top:-2px', text: zh }) : null,
      el('small', { text: sub }),
      el('div', { class: 'meter' }, el('i', { style: `width:${Math.round(fraction * 100)}%` })));

  // The one thing worth doing next, decided for her rather than left as a menu.
  const next = suggest({ diag, vs, m, rDone, lDone });

  mount({
    title: null,
    body: el('div', { class: 'stack-lg' },
      el('div', { class: 'hero' },
        el('h1', {}, hi, zhOn() ? el('span', { class: 'zh', style: 'font-weight:400', text: `　${hiZh}` }) : null),
        el('p', { class: 'sub' },
          days > 1 ? `${days} days in a row.` : 'TOEFL practice, a little every day.',
          today > 0 ? ` ${today} question${today === 1 ? '' : 's'} today.` : '',
          zhOn() ? el('span', { class: 'zh', style: 'display:block' },
            days > 1 ? `已连续练习 ${days} 天。` : '每天练一点。') : null)),

      el('button', { class: 'card next-card', type: 'button',
        style: 'width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer',
        onClick: () => go(next.path) },
        el('div', { class: 'eyebrow', text: next.eyebrow }),
        el('div', { style: 'font-weight:650;font-size:1.1rem;margin-top:4px' }, next.title),
        zhOn() ? el('div', { class: 'zh', text: next.titleZh }) : null,
        el('div', { style: 'display:flex;align-items:center;gap:6px;margin-top:10px;color:var(--accent);font-weight:600;font-size:.9rem' },
          next.cta, icon(ICONS.chev, 16))),

      el('div', { class: 'tiles' },
        tile('📖', 'Reading', '阅读', `${rDone}/${m.reading.length} passages`, '/reading', rDone / m.reading.length),
        tile('🎧', 'Listening', '听力', `${lDone}/${m.listening.length} items`, '/listening', lDone / m.listening.length),
        tile('🔤', 'Vocabulary', '词汇', `${vs.mastered}/${vs.total} learned`, '/vocab', vs.mastered / vs.total),
        tile('📈', 'Progress', '进度', diag ? 'Scores and trends' : 'Take the diagnostic', diag ? '/progress' : '/diagnostic', 0)),

      el('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('/settings') }, 'Settings'),

      el('p', { class: 'lede', style: 'font-size:.76rem;text-align:center;color:var(--faint)' },
        'Reading and listening only. No writing or speaking sections.',
        zhOn() ? el('span', { class: 'zh', style: 'display:block' }, '仅含阅读与听力，不含写作和口语。') : null)
    ),
  });
}

/** Pick the single most useful next action. */
function suggest({ diag, vs, m, rDone, lDone }) {
  if (!diag) {
    return {
      eyebrow: 'Start here', path: '/diagnostic',
      title: 'Take the diagnostic',
      titleZh: '先做一次水平测试',
      cta: 'About 25 minutes',
    };
  }
  if (vs.due >= 10) {
    return {
      eyebrow: 'Due today', path: '/vocab/review',
      title: `${vs.due} words are ready for review`,
      titleZh: `有 ${vs.due} 个词需要复习`,
      cta: 'Review now',
    };
  }
  const weaker = (diag.reading?.score ?? 15) <= (diag.listening?.score ?? 15) ? 'reading' : 'listening';
  const list = weaker === 'reading' ? m.reading : m.listening;
  const fresh = list.find((x) => !store.itemState(x.id));
  if (fresh) {
    return {
      eyebrow: 'Recommended', path: `/${weaker}/${fresh.id}`,
      title: weaker === 'reading' ? 'A new reading passage' : 'A new listening item',
      titleZh: weaker === 'reading' ? '一篇新的阅读' : '一段新的听力',
      cta: 'Start the drill',
    };
  }
  if (vs.due > 0 || vs.fresh > 0) {
    return { eyebrow: 'Due today', path: '/vocab/review', title: 'Vocabulary review', titleZh: '词汇复习', cta: 'Review now' };
  }
  return { eyebrow: 'Keep sharp', path: '/progress', title: 'You have done everything once', titleZh: '所有材料都已练过一遍', cta: 'See your progress' };
}

/* ── libraries ────────────────────────────────────────────────── */

function libraryScreen({ title, zh, kind }) {
  return async () => {
    const m = await data.manifest();
    const items = m[kind];

    const rows = items.map((it) => {
      const st = store.itemState(it.id);
      const [topicEn, topicZh] = data.TOPIC_LABEL[it.topic] || [it.topic, ''];
      const [diffEn, diffZh] = data.DIFF_LABEL[it.difficulty];
      const label = kind === 'reading'
        ? it.title
        : `${it.kind === 'lecture' ? 'Lecture' : 'Conversation'}: ${topicEn}`;

      return el('button', { class: 'row', type: 'button', onClick: () => go(`/${kind}/${it.id}`) },
        el('span', { class: 'grow' },
          el('span', { class: 't', text: label }),
          el('span', { class: 's' },
            `${topicEn} · ${diffEn} · ${it.questions} questions`,
            zhOn() ? el('span', { class: 'zh', style: 'display:block' }, `${topicZh} · ${diffZh}`) : null)),
        st
          ? el('span', { class: 'chip done' }, `${Math.round(st.last * 100)}%`)
          : el('span', { class: `chip d${it.difficulty}`, text: diffEn }),
        icon(ICONS.chev, 18));
    });

    mount({
      title,
      back: '/',
      body: el('div', { class: 'stack-lg' },
        el('div', {},
          el('h1', {}, title, zhOn() ? el('span', { class: 'zh', style: 'font-weight:400', text: `　${zh}` }) : null),
          el('p', { class: 'lede', style: 'margin-top:4px' },
            kind === 'reading'
              ? 'Each passage is about 700 words with ten questions, like the real test.'
              : 'Lectures and campus conversations with the question types the real test uses.',
            zhOn() ? el('span', { class: 'zh', style: 'display:block' },
              kind === 'reading' ? '每篇约 700 词，十道题，与真实考试一致。' : '讲座和校园对话，题型与真实考试一致。') : null)),
        el('div', { class: 'rowlist' }, rows)),
    });
  };
}

/* ── routes ───────────────────────────────────────────────────── */

route(/^\/$/, home);
route(/^\/reading$/, libraryScreen({ title: 'Reading', zh: '阅读', kind: 'reading' }));
route(/^\/reading\/([\w-]+)$/, readingDrill);
route(/^\/listening$/, libraryScreen({ title: 'Listening', zh: '听力', kind: 'listening' }));
route(/^\/listening\/([\w-]+)$/, listeningDrill);
route(/^\/vocab$/, vocabHome);
route(/^\/vocab\/list$/, vocabList);
route(/^\/vocab\/review$/, vocabReview);
route(/^\/diagnostic$/, diagnosticIntro);
route(/^\/diagnostic\/run$/, diagnosticRun);
route(/^\/diagnostic\/result$/, () => diagnosticResult());
route(/^\/progress$/, progressScreen);
route(/^\/settings$/, settingsScreen);
