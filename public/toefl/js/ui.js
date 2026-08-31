/* Small DOM helpers. No framework: the whole app is a few thousand lines and
   a virtual DOM would cost more bytes than it saves on a phone in China. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat(9)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const frag = (...kids) => {
  const f = document.createDocumentFragment();
  f.append(...kids.flat(9).filter(Boolean));
  return f;
};

/** Escape for the few places that build HTML strings (highlighted passages). */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const icon = (path, size = 19) =>
  el('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    width: size, height: size, 'aria-hidden': 'true', html: path,
  });

export const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  replay: '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  chev: '<path d="M9 18l6-6-6-6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
};

/** Bilingual line: English, with the Chinese under it when zh is on. */
export const bi = (en, zh, tag = 'p') =>
  frag(el(tag, { text: en }), zh ? el(tag, { class: 'zh', text: zh }) : null);

let toastTimer;
export function toast(message) {
  let node = document.querySelector('.toast');
  if (!node) {
    node = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(node);
  }
  node.textContent = message;
  requestAnimationFrame(() => node.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('on'), 2200);
}

/** Announce a screen change for screen readers without stealing visible focus. */
export function announce(message) {
  let live = document.getElementById('live');
  if (!live) {
    live = el('div', { id: 'live', class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = message; }, 60);
}

export const fmtTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const shuffle = (arr) => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** A tiny sparkline. Returns an inline SVG sized by CSS. */
export function sparkline(points, { min = 0, max = 30 } = {}) {
  if (points.length === 0) return el('div', { class: 'empty', text: 'No data yet' });
  const w = 300;
  const h = 56;
  const pad = 4;
  const span = Math.max(1, points.length - 1);
  const xy = points.map((p, i) => [
    pad + (i / span) * (w - pad * 2),
    h - pad - ((Math.max(min, Math.min(max, p)) - min) / (max - min)) * (h - pad * 2),
  ]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${xy.at(-1)[0].toFixed(1)} ${h} L${xy[0][0].toFixed(1)} ${h} Z`;
  return el('svg', {
    class: 'spark', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    html:
      `<path d="${area}" fill="var(--accent)" opacity="0.10"/>` +
      `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" ` +
      `stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
      xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join(''),
  });
}
