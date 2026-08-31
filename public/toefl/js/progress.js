/* Progress over time. The point is not a dashboard, it is one honest answer to
   "am I getting better, and what should I work on tomorrow?" */

import { el, sparkline, toast } from './ui.js';
import { TYPE_LABEL } from './quiz.js';
import { mount, go } from './app.js';
import * as store from './store.js';
import * as data from './data.js';

const zhOn = () => store.settings().zh;

export async function progressScreen() {
  const words = await data.vocab();
  const vs = store.vocabStats(words);
  const r = store.estimate('r');
  const l = store.estimate('l');
  const days = store.streak();
  const all = store.get().attempts;

  if (all.length < 5) {
    return mount({
      title: 'Progress',
      back: '/',
      body: el('div', { class: 'stack-lg' },
        el('div', { class: 'empty' },
          el('div', { class: 'ico', text: '📈' }),
          el('p', { text: 'Answer a few more questions and your progress will show up here.' }),
          zhOn() ? el('p', { class: 'zh', text: '再做几道题，这里就会显示你的进度。' }) : null),
        el('button', { class: 'btn wide', type: 'button', onClick: () => go('/') }, 'Go practice')),
    });
  }

  const scoreCard = (label, zh, band) =>
    el('div', { class: 'card score' },
      el('div', { class: 'n' }, band ? `${band.low}–${band.high}` : '--'),
      el('div', { class: 'l', text: label }),
      zhOn() ? el('div', { class: 'zh', style: 'font-size:.72rem', text: zh }) : null);

  const section = (title, zh, sec) => {
    const points = store.trend(sec);
    const types = store.byType(sec);
    if (points.length === 0 && types.length === 0) return null;

    const delta = points.length >= 2 ? points.at(-1).score - points[0].score : null;

    return el('div', { class: 'card stack' },
      el('div', { style: 'display:flex;align-items:baseline;gap:8px' },
        el('h3', {}, title, zhOn() ? el('span', { class: 'zh', text: `　${zh}` }) : null),
        el('span', { class: 'spacer', style: 'flex:1' }),
        delta !== null
          ? el('span', { class: `chip ${delta > 0 ? 'done' : delta < 0 ? 'd3' : ''}`,
              text: delta > 0 ? `+${delta} this month` : delta < 0 ? `${delta} this month` : 'steady' })
          : null),

      points.length >= 2
        ? sparkline(points.map((p) => p.score))
        : el('p', { class: 'lede', style: 'font-size:.86rem;margin:0' },
            'Practice on another day to start the trend line.'),

      types.length
        ? el('div', { class: 'stack' },
            el('div', { class: 'eyebrow', text: 'Accuracy by question type' }),
            el('div', { class: 'bars' },
              ...types.slice(0, 6).map((t) => {
                const pct = Math.round(t.pct * 100);
                const [en, zhLabel] = TYPE_LABEL[t.type] || [t.type, ''];
                return el('div', { class: `bar-row ${pct < 55 ? 'weak' : pct >= 80 ? 'strong' : ''}` },
                  el('span', { class: 'lbl' }, en,
                    zhOn() && zhLabel ? el('span', { class: 'zh', text: `　${zhLabel}` }) : null),
                  el('span', { class: 'val', text: `${pct}% · ${t.n}` }),
                  el('div', { class: 'track' }, el('i', { style: `width:${pct}%` })));
              })))
        : null
    );
  };

  const weak = [...store.byType('r'), ...store.byType('l')].sort((a, b) => a.pct - b.pct)[0];

  mount({
    title: 'Progress',
    back: '/',
    body: el('div', { class: 'stack-lg' },
      el('div', { class: 'scoregrid' },
        scoreCard('Reading', '阅读', r),
        scoreCard('Listening', '听力', l),
        el('div', { class: 'card score' },
          el('div', { class: 'n', text: String(vs.mastered) }),
          el('div', { class: 'l', text: 'Words' }),
          zhOn() ? el('div', { class: 'zh', style: 'font-size:.72rem', text: '已掌握' }) : null)),

      el('p', { class: 'lede', style: 'font-size:.84rem;margin:0;text-align:center' },
        `${all.length} questions answered · ${days} day streak`,
        zhOn() ? el('span', { class: 'zh', text: `　共答 ${all.length} 题 · 连续 ${days} 天` }) : null),

      weak
        ? el('div', { class: 'card next-card' },
            el('div', { class: 'eyebrow', text: 'Work on this next' }),
            el('p', { style: 'margin:8px 0 0' },
              `${(TYPE_LABEL[weak.type] || [weak.type])[0]} questions are your weakest at ${Math.round(weak.pct * 100)}%.`),
            zhOn()
              ? el('p', { class: 'zh', style: 'margin:4px 0 0',
                  text: `${(TYPE_LABEL[weak.type] || ['', ''])[1] || ''}是目前最薄弱的，正确率 ${Math.round(weak.pct * 100)}%。` })
              : null)
        : null,

      section('Reading', '阅读', 'r'),
      section('Listening', '听力', 'l'),

      el('div', { class: 'card stack' },
        el('h3', {}, 'Vocabulary', zhOn() ? el('span', { class: 'zh', text: '　词汇' }) : null),
        el('div', { class: 'meter' },
          el('i', { style: `width:${Math.round((vs.mastered / vs.total) * 100)}%` })),
        el('p', { class: 'lede', style: 'font-size:.86rem;margin:0' },
          `${vs.mastered} learned · ${vs.seen - vs.mastered} in progress · ${vs.fresh} not started`)),

      el('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('/settings') },
        'Back up or reset progress')
    ),
  });
}

/* ── offline audio ────────────────────────────────────────────── */

/** Pull every listening clip into the service worker cache in one go, so a
    weak or blocked connection later does not matter. */
function offlineSection() {
  const status = el('p', { class: 'lede', style: 'font-size:.88rem;margin:0' },
    'Listening audio is saved as you play it. Download it all now to practice with no connection at all.');
  const bar = el('div', { class: 'meter', hidden: true }, el('i', { style: 'width:0%' }));
  const button = el('button', { class: 'btn quiet wide', type: 'button', onClick: run }, 'Download all audio');

  async function run() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) {
      toast('Reload once, then try again');
      return;
    }
    const m = await data.manifest();
    const urls = m.listening.map((l) => new URL(`audio/${l.id}.mp3`, location.href).href);

    button.disabled = true;
    button.textContent = 'Downloading...';
    bar.hidden = false;

    const onMessage = (e) => {
      if (e.data?.type !== 'cache-audio-progress') return;
      const { done, total } = e.data;
      bar.firstChild.style.width = `${Math.round((done / total) * 100)}%`;
      button.textContent = `Downloading... ${done}/${total}`;
      if (done >= total) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        button.textContent = 'All audio saved';
        status.textContent = 'Every listening clip is saved on this phone. The app now works fully offline.';
        toast('Audio saved for offline use');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'cache-audio', urls });
  }

  return el('div', { class: 'stack' },
    el('h3', {}, 'Offline', zhOn() ? el('span', { class: 'zh', text: '　离线' }) : null),
    status,
    zhOn() ? el('p', { class: 'zh', style: 'font-size:.88rem;margin:0',
      text: '听力音频会在播放后自动保存。也可以现在全部下载，之后完全离线使用。' }) : null,
    bar,
    button);
}

/* ── settings ─────────────────────────────────────────────────── */

export function settingsScreen() {
  const s = store.settings();

  const toggleRow = (label, zh, checked, onchange) =>
    el('label', { class: 'row', style: 'cursor:pointer' },
      el('span', { class: 'grow' },
        el('span', { class: 't', text: label }),
        zhOn() && zh ? el('span', { class: 'zh', style: 'display:block;font-size:.82rem', text: zh }) : null),
      el('input', { type: 'checkbox', checked, style: 'width:22px;height:22px;accent-color:var(--accent)',
        onChange: (e) => onchange(e.target.checked) }));

  const themeRow = el('div', { class: 'row' },
    el('span', { class: 'grow' }, el('span', { class: 't', text: 'Appearance' })),
    el('div', { class: 'speeds', role: 'group', 'aria-label': 'Appearance' },
      ['auto', 'light', 'dark'].map((t) =>
        el('button', { type: 'button', 'aria-pressed': String(s.theme === t),
          onClick: (e) => {
            store.setSetting('theme', t);
            [...e.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.target)));
            import('./app.js').then((m) => m.applyTheme());
          } }, t))));

  const download = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `toefl-progress-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const picker = el('input', { type: 'file', accept: 'application/json,.json', class: 'sr',
    onChange: async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        store.importJSON(await file.text());
        toast('Progress restored');
        setTimeout(() => location.reload(), 700);
      } catch {
        toast('That file is not a backup');
      }
    } });

  mount({
    title: 'Settings',
    back: '/',
    body: el('div', { class: 'stack-lg' },
      el('div', { class: 'rowlist' },
        toggleRow('Show Chinese', '显示中文', s.zh, (on) => {
          store.setSetting('zh', on);
          document.body.classList.toggle('no-zh', !on);
        }),
        themeRow),

      el('div', { class: 'stack' },
        el('h3', {}, 'Your progress'),
        el('p', { class: 'lede', style: 'font-size:.88rem;margin:0' },
          'Everything is stored on this phone only. Nothing is uploaded anywhere. Save a backup file if you clear your browser or change phones.'),
        zhOn() ? el('p', { class: 'zh', style: 'font-size:.88rem;margin:0',
          text: '所有数据只保存在这台手机上，不会上传。如果要清理浏览器或换手机，请先导出备份。' }) : null,
        el('button', { class: 'btn quiet wide', type: 'button', onClick: download }, 'Save a backup file'),
        el('button', { class: 'btn quiet wide', type: 'button', onClick: () => picker.click() }, 'Restore from a backup'),
        picker),

      offlineSection(),

      el('div', { class: 'stack' },
        el('button', { class: 'btn ghost wide', type: 'button',
          style: 'color:var(--bad);border-color:color-mix(in srgb, var(--bad) 40%, transparent)',
          onClick: () => {
            if (!confirm('Erase all progress on this phone? This cannot be undone.')) return;
            store.reset();
            toast('Progress erased');
            setTimeout(() => { location.hash = '#/'; location.reload(); }, 600);
          } }, 'Erase all progress')),

      el('p', { class: 'lede', style: 'font-size:.78rem;text-align:center;color:var(--faint)' },
        'Practice content is original and written for this app. It is not affiliated with or endorsed by ETS.')
    ),
  });
}
