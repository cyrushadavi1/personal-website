import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) =>
  access(new URL(`../${path}`, import.meta.url)).then(
    () => true,
    () => false
  );

const readWorkScript = async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');
  const sources = [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+\.js)">/g)].map(
    (match) => match[1]
  );
  const chunks = await Promise.all(sources.map((src) => read(`dist${src}`)));
  const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(
    (match) => match[1]
  );
  const script = [...chunks, ...inline].join('\n');
  assert.ok(script.length > 0, 'work pages load a bundled or inlined page script');
  return script;
};

test('homepage presents readable projects and clear next actions', async () => {
  const html = await read('dist/index.html');

  assert.match(html, /Rakhsh/);
  assert.match(html, /NBA Video Analysis/);
  assert.match(html, /Path of Exile League Tools/);
  assert.ok(html.indexOf('NBA Video Analysis') < html.indexOf('Rakhsh'));
  assert.ok(html.indexOf('Rakhsh') < html.indexOf('Path of Exile League Tools'));
  assert.match(html, /ranking systems · agent systems · computer vision · evals/i);
  assert.match(html, /show your evidence\s*or abstain/i);
  assert.match(html, /href="#work"[^>]*>explore the work/i);
  assert.match(html, /href="mailto:cyrus@hadavi.net"[^>]*>get in touch/i);
  assert.match(html, /class="nowrap-link"[^>]*>the longer version →<\/a>/i);
  assert.match(html, /class="category">agent systems<\/span>/i);
  assert.match(html, /class="category">computer vision<\/span>/i);
  // Featured work keeps the full treatment; PoE is demoted to the "also" row.
  assert.equal((html.match(/class="view-project"/g) ?? []).length, 2);
  assert.match(html, /class="also-list"/);
  assert.ok(html.indexOf('class="also-list"') < html.indexOf('Path of Exile League Tools'));
  assert.match(
    html,
    /teaching a laptop to watch nba broadcasts and abstain when it cannot tell who is who/i
  );
  assert.match(
    html,
    /an assistant that lives on a mac mini, takes orders over imessage/i
  );
});

test('homepage surfaces the notes section', async () => {
  const html = await read('dist/index.html');

  assert.match(html, /class="notes-list"/);
  assert.match(html, /benchmark the decision you actually need/i);
  assert.match(html, /when the metric is anti-correlated with reality/i);
  assert.match(html, /errors should degrade to abstention, not misassignment/i);
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
  ]) {
    assert.match(poe, new RegExp(heading, 'i'));
  }

  assert.doesNotMatch(
    nba,
    /<h2[^>]*>[^<]*(night one|everything broke|pile up|stop trusting)/i
  );
  assert.doesNotMatch(poe, /<h2[^>]*>[^<]*(shipped today|what's next)/i);
});

test('rakhsh names its Shahnameh origin and frames agent safety structurally', async () => {
  const html = await read('dist/work/rakhsh/index.html');

  assert.match(html, /Rostam.s horse in the Shahnameh/i);
  assert.match(html, /you cannot prompt\s*your way to a security boundary/i);
});

test('global shell supports editorial typography and theme switching', async () => {
  const html = await read('dist/index.html');
  const css = await read('src/styles/global.css');

  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /aria-label="Switch to light theme"/);
  assert.match(html, /localStorage\.getItem\(['"]theme['"]\)/);
  assert.match(html, /try\s*\{[^}]*localStorage\.getItem\(['"]theme['"]\)/s);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /meta name="theme-color" content="#101312" media="\(prefers-color-scheme: dark\)"/);
  assert.match(html, /meta name="theme-color" content="#f3efe6" media="\(prefers-color-scheme: light\)"/);
  assert.match(css, /--font-sans:/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /html\[data-theme='light'\]/);
  assert.match(css, /transition-duration: 150ms/);
  assert.match(css, /@view-transition/);
});

test('fonts are subset and preloaded', async () => {
  const html = await read('dist/index.html');

  assert.equal((html.match(/rel="preload"[^>]*as="font"/g) ?? []).length, 3);
  const css = await read('src/styles/global.css');
  assert.match(css, /--fs-2xs/);
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
    /class="chip link-chip" href="https:\/\/github\.com\/cyrushadavi1\/nba_video_analysis_v2"/
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
  const start = html.indexOf('<div class="pipeline-evolution"');
  const end = html.indexOf('baseline player detection', start);
  assert.ok(start > -1 && end > start);
  const component = html.slice(start, end);

  assert.match(component, /data-pipeline-evolution/);
  assert.match(
    component,
    /<input[^>]*type="range"[^>]*min="0"[^>]*max="4"[^>]*step="1"[^>]*value="4"/
  );
  assert.equal(
    (component.match(/class="pipeline-stage-fallback"/g) ?? []).length,
    5
  );
  for (const title of [
    'basic detection',
    'tracking and court context',
    'player identification',
    'cross-broadcast hardening',
    'full-game reliability',
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
  assert.equal(stages.length, 5);
  for (let index = 1; index < stages.length; index += 1) {
    const previousLabels = stages[index - 1].blocks.map((block) => block.label);
    const currentLabels = stages[index].blocks.map((block) => block.label);
    for (const label of previousLabels) assert.ok(currentLabels.includes(label));
  }
  assert.ok(stages[1].blocks.some((block) => /court keypoints/i.test(block.label)));
  assert.ok(stages[2].blocks.some((block) => block.label === 'jersey-number evidence'));
  assert.ok(!stages[4].blocks.some((block) => /soccer OCR/i.test(block.label)));
});

test('work page script progressively enhances the pipeline, videos, and toc', async () => {
  const script = await readWorkScript();

  assert.match(script, /data-pipeline-evolution/);
  assert.match(script, /aria-valuetext/);
  assert.match(script, /is-enhanced/);
  assert.match(script, /replaceChildren/);
  assert.match(script, /--pipeline-progress/);
  assert.match(script, /data-video-play/);
  assert.match(script, /\.play\(\)/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /is-active/);
  assert.match(script, /data-reading-progress/);
  assert.match(script, /--reading-progress/);
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
  assert.equal((html.match(/<button[^>]*data-video-play/g) ?? []).length, 6);
  assert.match(html, /Play Early basketball analysis with boxes around players/);
});

test('referenced media files exist on disk', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');
  const refs = [
    ...[...html.matchAll(/(?:src|poster)="(\/media\/[^"]+)"/g)].map((m) => m[1]),
  ];
  assert.ok(refs.length >= 12);
  for (const ref of refs) {
    assert.ok(await exists(`dist${ref}`), `missing media file: ${ref}`);
  }
});

test('internal links resolve to built pages', async () => {
  const pages = [
    'dist/index.html',
    'dist/about/index.html',
    'dist/notes/index.html',
    'dist/colophon/index.html',
    'dist/404.html',
    'dist/work/rakhsh/index.html',
    'dist/work/nba-video-analysis/index.html',
    'dist/work/poe-league-tools/index.html',
    'dist/notes/benchmark-the-decision/index.html',
    'dist/notes/anti-correlated-metrics/index.html',
    'dist/notes/abstain-dont-guess/index.html',
  ];
  for (const page of pages) {
    const html = await read(page);
    const hrefs = [...html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)]
      .map((match) => match[1])
      .filter((href) => !href.startsWith('/_astro/'));
    for (const href of hrefs) {
      const target = href.endsWith('/')
        ? `dist${href}index.html`
        : `dist${href}`;
      assert.ok(await exists(target), `${page} links to missing ${href}`);
    }
  }
});

test('internal page links use trailing slashes to avoid redirects', async () => {
  const html = await read('dist/index.html');
  const workLinks = [...html.matchAll(/href="(\/(?:work|notes)\/[^"#]+)"/g)].map(
    (match) => match[1]
  );
  assert.ok(workLinks.length >= 4);
  for (const href of workLinks) {
    assert.ok(href.endsWith('/'), `missing trailing slash: ${href}`);
  }
});

test('about page uses a semantic responsive career timeline', async () => {
  const html = await read('dist/about/index.html');

  assert.match(html, /class="career-timeline"/);
  assert.match(html, /<ol class="career-timeline">/);
  assert.doesNotMatch(html, /<pre><code>2026/);
  assert.match(html, /back to building/i);
  assert.match(html, /reward models are ranking models/i);
});

test('pages include canonical, social, and structured metadata', async () => {
  for (const page of [
    'dist/index.html',
    'dist/about/index.html',
    'dist/notes/index.html',
    'dist/colophon/index.html',
  ]) {
    const html = await read(page);
    assert.match(html, /<link rel="canonical" href="https:\/\/kuros\.io\//);
    assert.match(html, /<meta property="og:image" content="https:\/\/kuros\.io\/og-default\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<script type="application\/ld\+json">/);
  }

  for (const slug of ['rakhsh', 'nba-video-analysis', 'poe-league-tools']) {
    const html = await read(`dist/work/${slug}/index.html`);
    assert.match(
      html,
      new RegExp(
        `<meta property="og:image" content="https://kuros\\.io/og/${slug}\\.png">`
      )
    );
    assert.ok(await exists(`dist/og/${slug}.png`), `missing og card for ${slug}`);
  }

  const workHtml = await read('dist/work/nba-video-analysis/index.html');
  assert.match(workHtml, /"url":"https:\/\/kuros\.io\/work\/nba-video-analysis\/"/);
  assert.doesNotMatch(workHtml, /—/);
});

test('search-engine and agent discovery files are generated', async () => {
  const sitemap = await read('dist/sitemap.xml');
  const robots = await read('dist/robots.txt');
  const llms = await read('dist/llms.txt');

  assert.match(sitemap, /https:\/\/kuros\.io\/work\/nba-video-analysis\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/work\/poe-league-tools\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/work\/rakhsh\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/notes\/<\/loc>/);
  assert.match(sitemap, /https:\/\/kuros\.io\/colophon\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/kuros\.io\/sitemap\.xml/);
  assert.match(llms, /Cyrus Hadavi/);
  assert.match(llms, /nba-video-analysis/);
});

test('resume pdf ships and is easy to find', async () => {
  assert.ok(await exists('dist/resume.pdf'));
  const about = await read('dist/about/index.html');
  const home = await read('dist/index.html');
  assert.match(about, /href="\/resume\.pdf"/);
  assert.match(home, /class="nav-resume"[^>]*>resume</);
  assert.match(home, /class="button-link" href="\/resume\.pdf"/);
  const work = await read('dist/work/nba-video-analysis/index.html');
  assert.match(work, /class="nav-resume"/);
});

test('custom 404 page keeps the terminal voice', async () => {
  const html = await read('dist/404.html');

  assert.match(html, /no such file or directory/i);
  assert.match(html, /href="\/"/);
});

test('global styles provide focus, contrast, and responsive component rules', async () => {
  const css = await read('src/styles/global.css');

  assert.match(css, /:focus-visible/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /\.career-timeline/);
  assert.match(css, /\.results-panel/);
  assert.match(css, /\.pipeline/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /\.nowrap-link\s*\{[^}]*white-space: nowrap/s);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /\.work-layout \.site-header/);
  assert.match(css, /\.toc-rail\s*\{[^}]*position: sticky/s);
  assert.match(css, /\.article-toc a\.is-active/);
  assert.match(css, /\.prose blockquote\s*\{[^}]*background:/s);
  assert.match(css, /\.article-end-mark/);
  assert.match(css, /\.media-figure \.video-play/);
  assert.match(css, /@media \(max-width: 1000px\)/);
  assert.match(css, /\.work-list \.view-project\s*\{[^}]*opacity: 1/s);
  assert.match(css, /\.pipeline-evolution\s*\{/);
  assert.match(css, /\.pipeline-control input\[type='range'\]/);
  assert.match(css, /\.pipeline-stage-live\s*\{/);
  assert.match(css, /\.pipeline-block\.is-new/);
  assert.match(css, /\.pipeline-block\.is-inherited/);
  assert.match(
    css,
    /\.pipeline-block\.is-inherited\s*\{[^}]*color: var\(--muted\)/s
  );
  assert.match(css, /\.pipeline-range-labels\s*\{[^}]*color: var\(--muted\)/s);
  assert.match(
    css,
    /\.pipeline-evolution\.is-enhanced \.pipeline-fallback\s*\{[^}]*display: none/s
  );
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.pipeline-blocks/);
});

test('light theme tokens meet WCAG AA contrast', async () => {
  const css = await read('src/styles/global.css');
  const light = css.match(/html\[data-theme='light'\]\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  const token = (name) => light.match(new RegExp(`${name}: (#[0-9a-f]{6})`))?.[1];

  const luminance = (hex) => {
    const channels = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const bg = token('--bg');
  assert.ok(bg);
  for (const name of ['--text', '--muted', '--faint', '--accent', '--accent-dim', '--gold']) {
    const value = token(name);
    assert.ok(value, `missing light token ${name}`);
    assert.ok(
      contrast(value, bg) >= 4.5,
      `${name} ${value} fails AA on light bg (${contrast(value, bg).toFixed(2)}:1)`
    );
  }
});
