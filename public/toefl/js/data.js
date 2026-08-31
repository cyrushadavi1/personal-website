/* Content loading. Everything is a static JSON file on the CDN; the service
   worker caches it, so a second visit costs no network at all. */

const cache = new Map();

async function json(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = fetch(path, { credentials: 'omit' }).then((r) => {
    if (!r.ok) throw new Error(`${path} failed (${r.status})`);
    return r.json();
  });
  cache.set(path, promise);
  promise.catch(() => cache.delete(path));
  return promise;
}

export const manifest = () => json('data/manifest.json');
export const passage = (id) => json(`data/reading/${id}.json`);
export const listeningItem = (id) => json(`data/listening/${id}.json`);
export const timings = (id) => json(`audio/${id}.times.json`);
export const audioURL = (id) => `audio/${id}.mp3`;

let vocabPromise;
export function vocab() {
  vocabPromise ||= json('data/vocab.json').then((v) => v.words);
  return vocabPromise;
}

export const TOPIC_LABEL = {
  history: ['History', '历史'],
  'life-science': ['Life science', '生命科学'],
  'social-science': ['Social science', '社会科学'],
  'physical-science': ['Physical science', '自然科学'],
  arts: ['Arts', '艺术'],
  campus: ['Campus life', '校园生活'],
};

export const DIFF_LABEL = { 1: ['Easier', '较易'], 2: ['Standard', '标准'], 3: ['Harder', '较难'] };
