/* End-to-end walk of the TOEFL app in a phone-sized Chromium against dist/. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from 'playwright';

const ROOT = '/Users/cyrushadavi/Documents/Code/personal_website/dist';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/toefl/`;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const dock = () => page.locator('.dock .btn').first();
const settle = () => page.waitForTimeout(160);

/** Answer the visible question by clicking `n` options, then advance. */
async function answerAndAdvance(n = 1) {
  const opts = page.locator('.opts .opt');
  await opts.first().waitFor({ state: 'visible' });
  const count = await opts.count();
  for (let i = 0; i < n; i += 1) await opts.nth(i % count).click();
  await settle();
  const button = dock();
  await button.waitFor({ state: 'visible' });
  if (await button.isDisabled()) throw new Error('dock button still disabled after answering');
  await button.click();
  await settle();

  // Practice mode reveals the answer first, so a second tap advances.
  const stillShowing = await opts.first().isDisabled().catch(() => false);
  if (stillShowing) {
    const next = dock();
    await next.waitFor({ state: 'visible' });
    await next.click();
    await settle();
  }
}

/** How many options must be picked for the question on screen. */
async function needed() {
  const text = await page.locator('#screen').innerText();
  const m = /Choose (\d|two|three|TWO|THREE)/.exec(text);
  if (!m) return 1;
  return { two: 2, three: 3, TWO: 2, THREE: 3 }[m[1]] ?? Number(m[1]) ?? 1;
}

/* ── 1. boot ──────────────────────────────────────────────────── */

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero h1');
check('app boots on a phone viewport', await page.locator('.tiles .tile').count() === 4);

const noOverflow = await page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);
check('home does not scroll horizontally', noOverflow,
  `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)} vw=${await page.evaluate(() => window.innerWidth)}`);

const smallTargets = await page.evaluate(() =>
  [...document.querySelectorAll('button, a, input, [role=button]')]
    .filter((n) => n.offsetParent !== null)
    .map((n) => ({ t: n.textContent.trim().slice(0, 24), h: Math.round(n.getBoundingClientRect().height) }))
    .filter((n) => n.h > 0 && n.h < 44));
check('all tap targets are at least 44px tall', smallTargets.length === 0, JSON.stringify(smallTargets));

/* ── 2. diagnostic ────────────────────────────────────────────── */

await page.click('.next-card');
await page.waitForSelector('h1:has-text("Find your starting level")');
await dock().click();
await page.waitForSelector('.eyebrow:has-text("Section 1 of 3")');
check('diagnostic opens at section 1 of 3', true);

await dock().click(); // Begin reading
let asked = 0;
for (let i = 0; i < 40; i += 1) {
  if (await page.locator('.eyebrow:has-text("Section 2 of 3")').count()) break;
  await answerAndAdvance(await needed());
  asked += 1;
}
check('diagnostic reading section completes', asked === 8, `${asked} questions`);

await dock().click(); // Begin listening
await page.waitForSelector('.playbtn');
check('diagnostic listening shows an audio player', true);
await page.click('.dock .btn'); // Go to questions

asked = 0;
for (let i = 0; i < 40; i += 1) {
  if (await page.locator('.eyebrow:has-text("Section 3 of 3")').count()) break;
  await answerAndAdvance(await needed());
  asked += 1;
}
check('diagnostic listening section completes', asked === 5, `${asked} questions`);

await dock().click(); // Begin vocabulary
asked = 0;
for (let i = 0; i < 40; i += 1) {
  if (await page.locator('h1:has-text("Starting estimate")').count()) break;
  await answerAndAdvance(1);
  asked += 1;
}
check('diagnostic vocabulary section completes', asked === 12, `${asked} questions`);

await page.waitForSelector('h1:has-text("Starting estimate")');
const scores = await page.locator('.scoregrid .score .n').allInnerTexts();
check('diagnostic reports three scores', scores.length === 3, scores.join(' | '));
check('reading score is a band, not a placeholder', /\d+.\d+/.test(scores[0]), scores[0]);

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('toefl.v1')));
check('diagnostic is persisted', !!stored?.diagnostic,
  `attempts=${stored?.attempts?.length ?? 0}`);

/* ── 3. reload persistence ────────────────────────────────────── */

const attemptsBefore = stored.attempts.length;
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero h1');
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('toefl.v1')));
check('progress survives a full page reload',
  after.attempts.length === attemptsBefore && !!after.diagnostic,
  `${after.attempts.length} attempts, diagnostic ${after.diagnostic ? 'kept' : 'lost'}`);

const homeText = await page.locator('#screen').innerText();
check('home reflects saved progress after reload', /day|question|Recommended|Due today/i.test(homeText));

/* ── 4. reading drill ─────────────────────────────────────────── */

await page.goto(`${base}#/reading`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rowlist .row');
const passageCount = await page.locator('.rowlist .row').count();
check('reading library lists every passage', passageCount === 12, `${passageCount}`);

await page.locator('.rowlist .row').first().click();
await page.waitForSelector('.passage p');
check('reading drill renders the passage above the question',
  (await page.locator('.readpane .passage p').count()) >= 4);

let insertSeen = false;
let summarySeen = false;
asked = 0;
for (let i = 0; i < 30; i += 1) {
  if (await page.locator('.eyebrow:has-text("Score")').count()) break;
  const screen = await page.locator('#screen').innerText();
  if (/INSERT TEXT/i.test(screen)) insertSeen = true;
  if (/PROSE SUMMARY/i.test(screen)) summarySeen = true;
  await answerAndAdvance(await needed());
  asked += 1;
}
check('reading drill runs to the results screen', asked === 10, `${asked} questions`);
check('reading drill includes an insert-text question', insertSeen);
check('reading drill includes a prose-summary question', summarySeen);
check('results screen shows a score', (await page.locator('.eyebrow:has-text("Score")').count()) === 1);

/* ── 5. listening drill ───────────────────────────────────────── */

await page.goto(`${base}#/listening`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rowlist .row');
await page.locator('.rowlist .row').first().click();
await page.waitForSelector('.playbtn');

const audioOk = await page.evaluate(async () => {
  const src = document.querySelector('audio')?.src
    || new URL('audio/' + (location.hash.split('/').pop()) + '.mp3', location.href).href;
  const r = await fetch(src, { method: 'GET' });
  return { ok: r.ok, type: r.headers.get('content-type'), size: (await r.blob()).size };
});
check('listening audio file is served', audioOk.ok && audioOk.size > 100000,
  `${audioOk.type} ${Math.round(audioOk.size / 1024)}KB`);
check('listening screen offers a notepad', (await page.locator('.notepad').count()) === 1);

await page.click('.dock .btn'); // Go to questions
asked = 0;
for (let i = 0; i < 30; i += 1) {
  if (await page.locator('.eyebrow:has-text("Score")').count()) break;
  await answerAndAdvance(await needed());
  asked += 1;
}
check('listening drill runs to the results screen', asked >= 5, `${asked} questions`);

/* ── 6. vocabulary ────────────────────────────────────────────── */

await page.goto(`${base}#/vocab`, { waitUntil: 'networkidle' });
await page.waitForSelector('.scoregrid');
await dock().click();
await page.waitForSelector('.opts .opt');
asked = 0;
for (let i = 0; i < 30; i += 1) {
  if (await page.locator('.eyebrow:has-text("Session")').count()) break;
  await answerAndAdvance(1);
  asked += 1;
}
check('vocabulary review runs a full queue', asked === 20, `${asked} cards`);

/* ── 7. progress ──────────────────────────────────────────────── */

await page.goto(`${base}#/progress`, { waitUntil: 'networkidle' });
await page.waitForSelector('.scoregrid');
const progressText = await page.locator('#screen').innerText();
check('progress shows section estimates', /Reading[\s\S]*Listening[\s\S]*Words/i.test(progressText));
check('progress shows accuracy by question type', /Accuracy by question type/i.test(progressText));
check('progress names a weakest area', /Work on this next/i.test(progressText));

const overflowAnywhere = await page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);
check('progress does not scroll horizontally', overflowAnywhere);

/* ── 8. offline ───────────────────────────────────────────────── */

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(() => true).catch(() => false));
check('service worker registers', swReady);

await context.setOffline(true);
await page.goto(`${base}#/reading`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.rowlist .row', { timeout: 8000 }).catch(() => {});
const offlineRows = await page.locator('.rowlist .row').count();
check('reading library works with the network off', offlineRows === 12, `${offlineRows} rows`);
await context.setOffline(false);

/* ── report ───────────────────────────────────────────────────── */

check('no uncaught JavaScript errors', errors.length === 0, errors.slice(0, 4).join(' // '));

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
