# Project Headings and Pipeline Slider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace playful project wording with descriptive technical headings and add an accessible five-stage NBA pipeline evolution slider without changing any videos.

**Architecture:** Keep project wording in the existing Markdown frontmatter and headings. Render the slider as semantic HTML embedded in the NBA Markdown, with all five fallback stages available without JavaScript; progressively enhance it through the shared inline script in `Base.astro`, using data attributes and JSON stage data to update one live panel. Style the component in the existing global stylesheet and reuse the site's tokens and responsive conventions.

**Tech Stack:** Astro 5, Markdown content collections, semantic HTML, native range input, vanilla JavaScript, CSS, Node test runner.

---

### Task 1: Descriptive project wording

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/content/work/poe-league-tools.md`

**Step 1: Write the failing test**

Add assertions for the new taglines and representative explanatory headings, plus negative assertions for removed playful headings.

**Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL because the old wording is still rendered.

**Step 3: Write the minimal implementation**

Update both taglines and all `##` headings using the approved descriptive technical-narrative style. Do not edit project names or body copy.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 9 tests pass.

### Task 2: Semantic pipeline evolution fallback

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `src/content/work/nba-video-analysis.md`

**Step 1: Write the failing test**

Assert that the NBA HTML contains:

- `.pipeline-evolution`
- one range input with `min="0"`, `max="4"`, and `step="1"`
- five `.pipeline-stage-fallback` entries
- all five approved stage titles
- five distinct `why it changed` explanations
- no media elements inside the evolution component

**Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL because no evolution component exists.

**Step 3: Write the minimal implementation**

Replace the static `.pipeline` block with semantic evolution markup. Include a labeled native range input, a progressively enhanced live panel, and an ordered fallback list containing the full content for all five stages.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

### Task 3: Slider behavior

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `src/layouts/Base.astro`

**Step 1: Write the failing test**

Assert that the built NBA page includes code that listens for range `input`, selects a stage by numeric index, updates `aria-valuetext`, and renders the selected pipeline blocks and reasoning.

**Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL because the range does not yet update the panel.

**Step 3: Write the minimal implementation**

In the existing inline enhancement script:

- find each `[data-pipeline-evolution]`
- parse stage data from its JSON script element
- update title, summary, reasoning, and block list from the range value
- mark inherited and newly added blocks with separate classes
- update `aria-valuetext`
- add an enhanced class only after successful initialization

Keep the fallback list visible if initialization fails.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

### Task 4: Responsive visual treatment

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `src/styles/global.css`

**Step 1: Write the failing test**

Assert stylesheet rules exist for `.pipeline-evolution`, the range control, live panel, inherited/new blocks, fallback behavior, and a mobile breakpoint.

**Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL because the component has no dedicated styling.

**Step 3: Write the minimal implementation**

Style a compact editorial control using existing color tokens. Use a horizontal connected block flow on desktop, wrapping blocks vertically on mobile. Hide the fallback only when enhancement succeeds. Honor reduced motion and keep focus indicators visible.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

### Task 5: Browser QA, review, and publication

**Files:**
- Verify all modified files

**Step 1: Run automated verification**

Run: `npm test && git diff --check`
Expected: all tests pass and the diff check is clean.

**Step 2: Run browser QA**

Verify dark and light themes at 1280px and 390px, range mouse/keyboard interaction, live-region updates, no horizontal overflow, no video changes, and no console errors.

**Step 3: Request independent code review**

Review accessibility, no-JS behavior, responsive layout, content accuracy, and interaction failure modes. Resolve every Critical or Important issue.

**Step 4: Integrate and publish**

Commit the reviewed scope, fast-forward `main`, rerun `npm test` from the merged checkout, and push the verified commit to `origin/main` as requested.
