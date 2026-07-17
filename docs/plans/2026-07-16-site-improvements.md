# Portfolio Site Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the portfolio's clarity, evidence, accessibility, media performance, navigation, writing, and discoverability without adding a Path of Exile visual.

**Architecture:** Keep the existing static Astro content-collection architecture. Extend work metadata for summaries, derive table-of-contents and adjacent-project navigation at build time, use semantic HTML/CSS for responsive presentation, and generate lightweight local poster assets for existing NBA videos.

**Tech Stack:** Astro 5, TypeScript content schemas, Markdown content, CSS, Node's built-in test runner, ffmpeg-generated poster images.

---

### Task 1: Add an integration test harness

**Files:**
- Modify: `package.json`
- Create: `tests/site.test.mjs`

**Steps:**
1. Add build-output tests for titles, summaries, CTAs, semantic timeline, video attributes, project navigation, metadata, sitemap, and accessibility CSS.
2. Add an `npm test` script that builds and runs the Node test suite.
3. Run the tests and verify they fail because the requested behavior is absent.

### Task 2: Improve project data and navigation

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/content/work/poe-league-tools.md`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/work/[slug].astro`

**Steps:**
1. Add status, timeframe, role, and result-summary fields to project metadata.
2. Replace slug-like display titles with readable titles.
3. Surface result summaries near each case-study introduction.
4. Add a generated table of contents for long articles and previous/next project navigation.
5. Add homepage specialty framing and clear work/contact calls to action.

### Task 3: Improve content semantics and writing

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/content/work/poe-league-tools.md`

**Steps:**
1. Reshape the About introduction around technical focus and hands-on leadership.
2. Replace the horizontally scrolling career code block with a semantic timeline.
3. Standardize compound modifiers and clarify specialist terminology.
4. Separate shipped PoE capabilities from future ideas without adding a PoE visual.

### Task 4: Improve media presentation and performance

**Files:**
- Create: `public/media/nbacv/posters/*.jpg`
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/styles/global.css`

**Steps:**
1. Extract one compressed poster frame from each existing NBA video.
2. Group each video and caption in a semantic figure.
3. Add descriptive labels, posters, dimensions, and `preload="none"`.
4. Replace the wide ASCII pipeline with a responsive semantic pipeline layout.

### Task 5: Improve accessibility and responsive UI

**Files:**
- Modify: `src/styles/global.css`

**Steps:**
1. Raise faint-text contrast and add strong keyboard focus states.
2. Style calls to action, summary panels, table of contents, figures, adjacent navigation, and timeline.
3. Ensure the new components stack cleanly on small screens.
4. Reduce decorative texture for users requesting reduced motion or higher contrast.

### Task 6: Improve SEO and sharing metadata

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/work/[slug].astro`
- Create: `src/pages/sitemap.xml.ts`
- Create: `public/robots.txt`
- Create: `public/og-default.svg`

**Steps:**
1. Add canonical, Open Graph, Twitter card, and theme metadata.
2. Add Person and CreativeWork JSON-LD based on page context.
3. Generate a sitemap from static pages and the work collection.
4. Add robots directives and a branded default sharing image.

### Task 7: Verify and upload

**Files:**
- Verify all modified and generated files.

**Steps:**
1. Run `npm test` and confirm every assertion passes.
2. Run `npm run build` independently and confirm a clean production build.
3. Inspect desktop and mobile renders in the local browser.
4. Review the final diff for accidental or unrelated changes.
5. Commit the implementation, merge it to `main`, push `main`, and verify the remote deployment workflow starts.
