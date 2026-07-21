import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage presents readable projects and clear next actions', async () => {
  const html = await read('dist/index.html');

  assert.match(html, /Rakhsh/);
  assert.match(html, /NBA Video Analysis/);
  assert.match(html, /Path of Exile League Tools/);
  assert.ok(html.indexOf('NBA Video Analysis') < html.indexOf('Rakhsh'));
  assert.ok(html.indexOf('Rakhsh') < html.indexOf('Path of Exile League Tools'));
  assert.match(html, /ranking systems · computer vision · applied llms/i);
  assert.match(html, /href="#work"[^>]*>explore the work/i);
  assert.match(html, /href="mailto:cyrus@hadavi.net"[^>]*>get in touch/i);
  assert.match(html, /class="nowrap-link"[^>]*>the longer version →<\/a>/i);
  assert.match(html, /class="category">agent systems<\/span>/i);
  assert.match(html, /class="category">computer vision<\/span>/i);
  assert.match(html, /class="category">desktop tool<\/span>/i);
  assert.equal((html.match(/class="view-project"/g) ?? []).length, 3);
  assert.match(html, /view project →/i);
  assert.match(
    html,
    /an offline pipeline for extracting structured data from basketball video/i
  );
  assert.match(
    html,
    /a log-driven desktop assistant for path of exile league starts/i
  );
  assert.match(
    html,
    /an always-on personal operator with durable memory and bounded authority/i
  );
});

test('pages and structured data use the Kuros Persian spelling', async () => {
  const homepage = await read('dist/index.html');
  const about = await read('dist/about/index.html');

  assert.match(homepage, /کوروس/);
  assert.match(about, /کوروس/);
  assert.doesNotMatch(homepage, /کوروش/);
  assert.doesNotMatch(about, /کوروش/);
});

test('project headings describe the technical subject directly', async () => {
  const rakhsh = await read('dist/work/rakhsh/index.html');
  const nba = await read('dist/work/nba-video-analysis/index.html');
  const poe = await read('dist/work/poe-league-tools/index.html');

  for (const heading of [
    'building an always-on operator around imessage',
    'separating reasoning from authority',
    'making work survive process failure',
    'binding approvals to exact operations',
    'designing memory that gets sharper over time',
    'keeping the tool surface small',
    'current alpha and the next security boundary',
  ]) {
    assert.match(rakhsh, new RegExp(heading, 'i'));
  }

  for (const heading of [
    'extracting structured game state from broadcast video',
    'pipeline evolution',
    'baseline player detection',
    'maintaining player identities across frames',
    'classifying teams using jersey colors',
    'identifying players from jersey numbers and roster data',
    'generalizing across broadcast feeds',
    'preventing player identity collisions',
    'validating court calibration with geometric checks',
    'indexing and validating player trajectories',
  ]) {
    assert.match(nba, new RegExp(heading, 'i'));
  }

  for (const heading of [
    'reducing manual work during league starts',
    'designing within path of exile.s automation rules',
    'system architecture and data flow',
    'decoding path of building data',
    'current capabilities',
    'planned improvements',
  ]) {
    assert.match(poe, new RegExp(heading, 'i'));
  }

  assert.doesNotMatch(
    nba,
    /<h2[^>]*>[^<]*(night one|everything broke|pile up|stop trusting)/i
  );
  assert.doesNotMatch(poe, /<h2[^>]*>[^<]*(shipped today|what's next)/i);
});

test('global shell supports editorial typography and theme switching', async () => {
  const html = await read('dist/index.html');
  const css = await read('src/styles/global.css');

  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /aria-label="Switch to light theme"/);
  assert.match(html, /localStorage\.getItem\(['"]theme['"]\)/);
  assert.match(html, /try\s*\{[^}]*localStorage\.getItem\(['"]theme['"]\)/s);
  assert.match(css, /--font-sans:/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /html\[data-theme='light'\]/);
  assert.match(css, /transition-duration:\s*150ms/);
});

test('case studies surface evidence and provide article navigation', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');

  assert.match(html, /class="results-panel"/);
  assert.match(html, /Detection AP50/);
  assert.match(html, /class="article-toc"/);
  assert.match(html, /class="project-pagination"/);
  assert.match(html, /class="pipeline-evolution"/);
  assert.doesNotMatch(html, /class="pipeline-evolution"[^>]*role="img"/);
  assert.match(
    html,
    /href="https:\/\/github\.com\/cyrushadavi1\/nba_video_analysis_v2"[^>]*>\s*github ↗\s*<\/a>/
  );
  assert.match(html, /<body class="work-layout">/);
  assert.match(html, /class="case-study-layout"/);
  assert.match(html, /class="article-toc toc-rail"/);
  assert.match(html, /class="toc-disclosure"/);
  assert.match(html, /data-reading-progress/);
  assert.match(html, /class="back-to-top" href="#top"/);
  assert.match(html, /class="article-end-mark"/);
});

test('rakhsh case study presents verified system evidence without exposing its private repository', async () => {
  const html = await read('dist/work/rakhsh/index.html');

  assert.match(html, /class="results-panel"/);
  assert.match(html, /696 tests/i);
  assert.match(html, /SQLite WAL/);
  assert.match(html, /Codex App Server/);
  assert.match(html, /class="article-toc"/);
  assert.match(html, /class="project-pagination"/);
  assert.doesNotMatch(html, /github\.com\/cyrushadavi1\/rakhsh/i);
});

test('pipeline evolution exposes five complete stages without requiring media', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');
  const component = html.match(
    /<div class="pipeline-evolution"[\s\S]*?<\/div>\s*<p>Almost every box/
  )?.[0] ?? '';

  assert.match(component, /data-pipeline-evolution/);
  assert.match(
    component,
    /<input[^>]*type="range"[^>]*min="0"[^>]*max="4"[^>]*step="1"/
  );
  assert.equal(
    (component.match(/class="pipeline-stage-fallback"/g) ?? []).length,
    5
  );
  for (const title of [
    'Basic detection',
    'Tracking and court context',
    'Player identification',
    'Cross-broadcast hardening',
    'Full-game reliability',
  ]) {
    assert.match(component, new RegExp(title, 'i'));
  }
  assert.equal((component.match(/why it changed/gi) ?? []).length, 5);
  assert.match(component, /retained from earlier stages/i);
  assert.match(component, /added at this stage/i);
  assert.doesNotMatch(component, /<(video|img|picture)\b/i);

  const stageJson = component.match(
    /<script type="application\/json" data-pipeline-stages="">([\s\S]*?)<\/script>/
  )?.[1];
  assert.ok(stageJson);
  const stages = JSON.parse(stageJson);
  for (let index = 1; index < stages.length; index += 1) {
    const previousLabels = stages[index - 1].blocks.map((block) => block.label);
    const currentLabels = stages[index].blocks.map((block) => block.label);
    for (const label of previousLabels) assert.ok(currentLabels.includes(label));
  }
  assert.ok(stages[1].blocks.some((block) => /court keypoints/i.test(block.label)));
  assert.ok(stages[2].blocks.some((block) => block.label === 'jersey-number evidence'));
  assert.ok(!stages[4].blocks.some((block) => /soccer OCR/i.test(block.label)));
});

test('pipeline range progressively enhances and announces the selected stage', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');

  assert.match(html, /range\.addEventListener\(['"]input['"]/);
  assert.match(html, /Number\(range\.value\)/);
  assert.match(html, /setAttribute\(['"]aria-valuetext['"]/);
  assert.match(html, /blocks\.replaceChildren/);
  assert.match(html, /classList\.add\(['"]is-enhanced['"]\)/);
  assert.match(html, /announcement\.textContent/);
  assert.match(html, /item\.setAttribute\(['"]aria-label['"]/);
});

test('case studies separate core metadata from responsive technology disclosure', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');

  assert.match(html, /class="stack-row"/);
  assert.match(html, /class="stack-disclosure"/);
  assert.match(html, /\+4 tools/);
  assert.equal((html.match(/class="stack-chip"/g) ?? []).length, 14);
});

test('video evidence is accessible and defers media loading', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');
  const videos = html.match(/<video\b[^>]*>/g) ?? [];

  assert.equal(videos.length, 6);
  for (const video of videos) {
    assert.match(video, /aria-label="[^"]+"/);
    assert.match(video, /poster="\/media\/nbacv\/posters\/[^"]+\.jpg"/);
    assert.match(video, /preload="none"/);
    assert.match(video, /width="1280"/);
    assert.match(video, /height="720"/);
  }
  assert.equal((html.match(/<figure class="media-figure">/g) ?? []).length, 6);
  assert.equal((html.match(/<figcaption>/g) ?? []).length, 6);
  assert.equal((html.match(/class="video-play"/g) ?? []).length, 6);
  assert.equal((html.match(/data-video-play/g) ?? []).length, 6);
  assert.match(html, /Play Early basketball analysis with boxes around players/);
  assert.match(html, /video\.play\(\)/);
  assert.match(html, /button\.hidden\s*=\s*isPlaying/);
});

test('about page uses a semantic responsive career timeline', async () => {
  const html = await read('dist/about/index.html');

  assert.match(html, /class="career-timeline"/);
  assert.match(html, /<ol class="career-timeline">/);
  assert.doesNotMatch(html, /<pre><code>2026/);
});

test('pages include canonical, social, and structured metadata', async () => {
  for (const page of [
    'dist/index.html',
    'dist/about/index.html',
    'dist/work/rakhsh/index.html',
    'dist/work/nba-video-analysis/index.html',
    'dist/work/poe-league-tools/index.html',
  ]) {
    const html = await read(page);
    assert.match(html, /<link rel="canonical" href="https:\/\/kuros\.io\//);
    assert.match(html, /<meta property="og:image" content="https:\/\/kuros\.io\/og-default\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<script type="application\/ld\+json">/);
  }

  const workHtml = await read('dist/work/nba-video-analysis/index.html');
  assert.match(workHtml, /"url":"https:\/\/kuros\.io\/work\/nba-video-analysis\/"/);
});

test('search-engine discovery files are generated', async () => {
  const sitemap = await read('dist/sitemap.xml');
  const robots = await read('dist/robots.txt');

  assert.match(sitemap, /https:\/\/kuros\.io\/work\/nba-video-analysis\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/work\/poe-league-tools\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/work\/rakhsh\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/kuros\.io\/sitemap\.xml/);
});

test('global styles provide focus, contrast, and responsive component rules', async () => {
  const css = await read('src/styles/global.css');

  assert.match(css, /:focus-visible/);
  assert.match(css, /\.career-timeline/);
  assert.match(css, /\.results-panel/);
  assert.match(css, /\.pipeline/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /\.nowrap-link\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /\.work-layout \.site-header/);
  assert.match(css, /\.toc-rail\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.prose blockquote\s*\{[^}]*background:/s);
  assert.match(css, /\.article-end-mark/);
  assert.match(css, /\.media-figure \.video-play/);
  assert.match(css, /@media \(max-width: 1000px\)/);
  assert.match(css, /\.work-list \.view-project\s*\{[^}]*opacity:\s*1/s);
  assert.match(css, /\.pipeline-evolution\s*\{/);
  assert.match(css, /\.pipeline-control input\[type='range'\]/);
  assert.match(css, /\.pipeline-stage-live\s*\{/);
  assert.match(css, /\.pipeline-block\.is-new/);
  assert.match(css, /\.pipeline-block\.is-inherited/);
  assert.match(
    css,
    /\.pipeline-block\.is-inherited\s*\{[^}]*color:\s*var\(--muted\)/s
  );
  assert.match(css, /\.pipeline-range-labels\s*\{[^}]*color:\s*var\(--muted\)/s);
  assert.match(
    css,
    /\.pipeline-evolution\.is-enhanced \.pipeline-fallback\s*\{[^}]*display:\s*none/s
  );
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.pipeline-blocks/);
});
