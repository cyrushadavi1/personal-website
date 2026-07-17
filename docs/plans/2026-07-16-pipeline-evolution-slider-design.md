# Pipeline Evolution Slider Design

## Goal

Show how the NBA analysis pipeline progressed from basic player detection to a
reliable full-game data system, including the engineering reason for every
major addition.

## Scope

- Replace the current static final-pipeline diagram with an interactive,
  code-rendered evolution view.
- Do not edit, replace, autoplay, or embed project videos in the slider.
- Keep the detailed case-study narrative and existing evidence videos intact.

## Stages

1. **Basic detection** — video, YOLO11, and player boxes. Detection alone does
   not preserve identity or create game state.
2. **Tracking and court context** — ByteTrack, court keypoints, homography,
   team classification, and ball tracking. Pixel positions and unstable IDs
   are not useful structured data.
3. **Player identification** — jersey reading, roster constraints, estimated
   height, and abstention. OCR produced confident number misreads.
4. **Cross-broadcast hardening** — resolution normalization, camera-motion
   handling, and improved referee detection. Single-feed assumptions failed on
   a second broadcast.
5. **Full-game reliability** — appearance vetoes, SmolVLM2, geometric checks,
   trajectory smoothing, and DuckDB indexing. Full-game processing exposed
   identity collisions, misleading calibration metrics, and impossible motion.

## Interaction

- Use a native range input with five discrete positions.
- Update the stage title, pipeline blocks, capability summary, and `why it
  changed` explanation as the slider moves.
- Clearly distinguish components added at the current stage from components
  inherited from earlier stages.
- Support keyboard arrow keys through native range behavior.
- Announce the selected stage through an accessible live region.
- With JavaScript unavailable, present all five stages as a readable ordered
  sequence.

## Responsive behavior

- Desktop: horizontal range control above the pipeline panel.
- Mobile: the same control with compact labels and a vertically wrapping
  pipeline diagram.
- The component must not create horizontal overflow from 390px upward.

## Validation

- Add structural tests for all five stages, the range control, and fallback.
- Verify keyboard operation and live-region updates in a browser.
- Check desktop and mobile layouts, reduced-motion behavior, and no-JS content.
- Run the full Astro build and test suite.
