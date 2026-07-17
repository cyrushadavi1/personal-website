import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage presents readable projects and clear next actions', async () => {
  const html = await read('dist/index.html');

  assert.match(html, /NBA Video Analysis/);
  assert.match(html, /Path of Exile League Tools/);
  assert.match(html, /ranking systems · computer vision · applied llms/i);
  assert.match(html, /href="#work"[^>]*>explore the work/i);
  assert.match(html, /href="mailto:cyrus@hadavi.net"[^>]*>get in touch/i);
  assert.match(html, /class="nowrap-link"[^>]*>the longer version →<\/a>/i);
});

test('case studies surface evidence and provide article navigation', async () => {
  const html = await read('dist/work/nba-video-analysis/index.html');

  assert.match(html, /class="results-panel"/);
  assert.match(html, /Detection AP50/);
  assert.match(html, /class="article-toc"/);
  assert.match(html, /class="project-pagination"/);
  assert.match(html, /class="pipeline"/);
  assert.doesNotMatch(html, /class="pipeline"[^>]*role="img"/);
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
});
