# Editorial Terminal UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the portfolio's readability, navigation, interaction polish, responsive density, and theme flexibility while preserving its terminal and Persian visual identity.

**Architecture:** Keep the static Astro content architecture and progressively enhance it with small local scripts. Use a two-column case-study grid on wide screens, a CSS-driven responsive system, semantic disclosure controls, and accessible buttons for theme and video playback.

**Tech Stack:** Astro 5, Markdown content, CSS custom properties, browser-native JavaScript, Node integration tests.

---

### Task 1: Define failing UI behavior tests

**Files:**
- Modify: `tests/site.test.mjs`

**Steps:**
1. Assert dual typography tokens and 16px body copy.
2. Assert theme-toggle markup and light-theme CSS.
3. Assert case-study grid, sticky TOC, reading progress, and back-to-top markup.
4. Assert project categories and persistent view indicators.
5. Assert desktop stack rows and mobile stack disclosures.
6. Assert six accessible video overlay buttons and supporting script.
7. Assert blockquote, motion, spacing, and Persian end-mark styles.
8. Run the tests and confirm they fail for the requested missing behavior.

### Task 2: Implement global typography, theme, and shell polish

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/global.css`

**Steps:**
1. Add system sans-serif prose typography while retaining mono interface typography.
2. Add a system-aware, persisted theme toggle with accessible state.
3. Add light-theme design tokens.
4. Add 150ms interaction transitions with reduced-motion overrides.
5. Make the case-study header sticky and add a reading-progress indicator.

### Task 3: Implement project-list affordance

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/content/work/poe-league-tools.md`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Steps:**
1. Add a project category field to the content schema and entries.
2. Add category and persistent “view project” labels to each project row.
3. Increase row hit areas and add restrained hover/focus movement.

### Task 4: Implement editorial case-study layout

**Files:**
- Modify: `src/pages/work/[slug].astro`
- Modify: `src/styles/global.css`

**Steps:**
1. Add a work-layout body variant and wide case-study grid.
2. Place the generated contents list in a sticky desktop rail.
3. Collapse the contents rail into a disclosure on smaller screens.
4. Add a back-to-top link and Persian-inspired article end mark.
5. Vary major-section spacing and elevate blockquotes.

### Task 5: Implement responsive stack disclosure

**Files:**
- Modify: `src/pages/work/[slug].astro`
- Modify: `src/styles/global.css`

**Steps:**
1. Separate core project metadata from technology metadata.
2. Show a compact “built with” row on desktop.
3. Show three technologies plus a “+N tools” disclosure on mobile.
4. Verify no duplicate content is exposed to assistive technology at one breakpoint.

### Task 6: Implement custom video play overlays

**Files:**
- Modify: `src/content/work/nba-video-analysis.md`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/global.css`

**Steps:**
1. Add one accessible overlay button per video figure.
2. Add a progressive-enhancement controller for play, pause, and ended state.
3. Hide overlay buttons when JavaScript is unavailable and preserve native controls.
4. Respect reduced-motion preferences.

### Task 7: Verify, review, and upload

**Files:**
- Verify all modified files and generated HTML.

**Steps:**
1. Run the full test suite and independent production build.
2. Inspect dark and light themes at desktop, tablet, and mobile widths.
3. Verify keyboard focus, disclosure behavior, progress, and video controls.
4. Review the complete diff and request pre-merge code review.
5. Commit, fast-forward `main`, re-run tests, push, and monitor Pages deployment.
