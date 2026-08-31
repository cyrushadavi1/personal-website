/* Shell and router. Hash routing, because GitHub Pages serves static files and
   deep links must survive a hard refresh with no rewrite rules. */

import { el, icon, ICONS, toast, announce } from './ui.js';
import * as store from './store.js';

const app = document.getElementById('app');

const routes = [];
export const route = (pattern, load) => routes.push({ pattern, load });

/** Screens call this to paint. `chrome` controls the top bar and dock. */
export function mount({ title, back = null, body, dock = null, rail = null, actions = null }) {
  app.replaceChildren();

  if (title !== null) {
    const bar = el('header', { class: 'topbar' },
      el('div', { class: 'topbar-in' },
        back
          ? el('button', {
              class: 'iconbtn', type: 'button', 'aria-label': 'Back',
              onClick: () => (typeof back === 'function' ? back() : go(back)),
            }, icon(ICONS.back), el('span', { text: 'Back' }))
          : el('span', { style: 'width:8px' }),
        el('h2', { text: title }),
        el('span', { class: 'spacer' }),
        actions
      ),
      rail !== null ? el('div', { class: 'rail' }, el('i', { style: `width:${Math.round(rail * 100)}%` })) : null
    );
    app.append(bar);
  }

  const screen = el('main', { class: `screen${dock ? ' has-dock' : ''}`, id: 'screen' }, body);
  app.append(screen);
  if (dock) app.append(el('div', { class: 'dock' }, el('div', { class: 'dock-in' }, dock)));

  scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  return screen;
}

/** Update just the progress rail without rebuilding the screen. */
export function setRail(fraction) {
  const bar = document.querySelector('.rail > i');
  if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

export function go(path, { replace = false } = {}) {
  store.flush();
  const hash = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (location.hash === hash) return render();
  if (replace) location.replace(hash);
  else location.hash = hash;
}

export const back = () => (history.length > 1 ? history.back() : go('/'));

let current = null;

async function render() {
  const path = (location.hash.replace(/^#/, '') || '/').replace(/\/+$/, '') || '/';

  current?.dispose?.();
  current = null;

  for (const { pattern, load } of routes) {
    const match = pattern.exec(path);
    if (!match) continue;
    try {
      const screen = await load(...match.slice(1));
      current = screen || null;
    } catch (err) {
      console.error(err);
      mount({
        title: 'Something went wrong',
        back: '/',
        body: el('div', { class: 'stack' },
          el('div', { class: 'empty' },
            el('div', { class: 'ico', text: '⚠️' }),
            el('p', { text: 'That content could not load. If you are offline, open it once while connected and it will be saved for next time.' }),
            el('p', { class: 'zh', text: '内容加载失败。如果你现在离线，请联网打开一次，之后即可离线使用。' })
          ),
          el('button', { class: 'btn wide', type: 'button', onClick: () => location.reload() }, 'Reload')
        ),
      });
    }
    return;
  }
  go('/', { replace: true });
}

addEventListener('hashchange', render);

/* ── theme ────────────────────────────────────────────────────── */

export function applyTheme() {
  const { theme, zh } = store.settings();
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  document.body.classList.toggle('no-zh', !zh);
}

/* ── boot ─────────────────────────────────────────────────────── */

export async function boot() {
  applyTheme();
  await import('./screens.js');
  await render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

export { store, toast, announce };
