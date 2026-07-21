---
title: 'NBA Video Analysis'
tagline: 'Teaching a laptop to watch NBA broadcasts and abstain when it cannot tell who is who'
category: 'computer vision'
year: '2026'
timeframe: 'June 2026'
status: 'prototype complete'
role: 'solo builder'
order: 1
stack:
  - PyTorch
  - YOLO11
  - ByteTrack
  - WASB
  - SmolVLM2
  - OSNet
  - DuckDB
results:
  - label: 'Detection AP50'
    value: '0.97'
  - label: 'players identified'
    value: '21 / 24'
  - label: 'impossible steps'
    value: '47% → <1%'
  - label: 'runtime'
    value: 'offline laptop'
links:
  - label: github
    url: 'https://github.com/cyrushadavi1/nba_video_analysis_v2'
---

## extracting structured game state from broadcast video

A basketball broadcast is one moving camera, constant occlusion, and a
ball about twenty pixels wide. The goal: turn that video into
structured game state. Who is where in court coordinates, which team,
who has the ball, what just happened.

My career has mostly been NLP and two-tower ranking models, so I built
this to sharpen my computer vision skills. I started from Roboflow's
basketball tutorial and kept going every time something broke.
Everything runs offline on a laptop, from public checkpoints only.

The short version: every model in this pipeline lies with confidence.
The jersey reader called Jayson Tatum's #0 an #8 at 98% confidence,
every single time. The system only got good when each stage had to
show its evidence or abstain. The rest of this page is how I learned
that.

## pipeline evolution

Almost every box below replaced something fancier that lost a
head-to-head eval. That was the real lesson, and the slider starts at
the final stage so you can scrub backward and watch the pipeline
un-build itself.

<div class="pipeline-evolution" data-pipeline-evolution>
  <div class="pipeline-control">
    <label for="pipeline-stage">pipeline stage</label>
    <input id="pipeline-stage" data-pipeline-range type="range" min="0" max="4" step="1" value="4" aria-valuetext="Stage 5 of 5: full-game reliability" />
    <div class="pipeline-range-labels" aria-hidden="true">
      <span>detect</span><span>context</span><span>identify</span><span>harden</span><span>reliable</span>
    </div>
    <div class="pipeline-legend">
      <span><i class="pipeline-legend-swatch is-inherited" aria-hidden="true"></i>retained from earlier stages</span>
      <span><i class="pipeline-legend-swatch is-new" aria-hidden="true"></i>added at this stage</span>
    </div>
  </div>
  <section class="pipeline-stage-live" data-pipeline-live aria-labelledby="pipeline-stage-title">
    <header>
      <span data-pipeline-count>stage 5 / 5</span>
      <h3 id="pipeline-stage-title" data-pipeline-title>full-game reliability</h3>
    </header>
    <p data-pipeline-summary>Reject identity collisions, validate calibration geometrically, smooth trajectories, and index the output.</p>
    <!-- populated by the page script before this section becomes visible -->
    <div class="pipeline-blocks" data-pipeline-blocks></div>
    <div class="pipeline-reason">
      <strong data-pipeline-reason-label></strong>
      <p data-pipeline-reason></p>
    </div>
  </section>
  <script type="application/json" data-pipeline-stages>
    [
      {
        "title": "basic detection",
        "summary": "Detect people in each frame and draw player boxes.",
        "reason": "Detection alone cannot preserve identity across frames or produce structured game state.",
        "blocks": [
          { "label": "broadcast video", "added": true },
          { "label": "YOLO11 player detection", "added": true }
        ]
      },
      {
        "title": "tracking and court context",
        "summary": "Maintain track identities and map players, teams, and the ball into court coordinates.",
        "reason": "Unstable IDs and raw pixel positions are not useful enough for possession or movement analysis.",
        "blocks": [
          { "label": "broadcast video", "added": false },
          { "label": "YOLO11 player detection", "added": false },
          { "label": "ByteTrack + stitching", "added": true },
          { "label": "court keypoints + homography", "added": true },
          { "label": "WASB ball + jersey-color teams", "added": true }
        ]
      },
      {
        "title": "player identification",
        "summary": "Resolve track identities from jersey readings and roster evidence while allowing abstention.",
        "reason": "The jersey reader produced confident number errors, so identity needed multiple independent signals.",
        "blocks": [
          { "label": "broadcast video", "added": false },
          { "label": "YOLO11 player detection", "added": false },
          { "label": "ByteTrack + stitching", "added": false },
          { "label": "court keypoints + homography", "added": false },
          { "label": "WASB ball + jersey-color teams", "added": false },
          { "label": "jersey-number evidence", "added": true },
          { "label": "roster + height + abstention", "added": true }
        ]
      },
      {
        "title": "cross-broadcast hardening",
        "summary": "Make the same pipeline work across feeds with different resolutions, frame rates, and uniforms.",
        "reason": "A second broadcast exposed assumptions that had been invisible when testing on only one feed.",
        "blocks": [
          { "label": "broadcast video", "added": false },
          { "label": "YOLO11 player detection", "added": false },
          { "label": "ByteTrack + stitching", "added": false },
          { "label": "court keypoints + homography", "added": false },
          { "label": "WASB ball + jersey-color teams", "added": false },
          { "label": "jersey-number evidence", "added": false },
          { "label": "roster + height + abstention", "added": false },
          { "label": "resolution + camera-motion handling", "added": true },
          { "label": "contextual referee detection", "added": true }
        ]
      },
      {
        "title": "full-game reliability",
        "summary": "Reject identity collisions, validate calibration geometrically, smooth trajectories, and index the output.",
        "reason": "Full-game batches exposed repeated false identities, misleading calibration metrics, and physically impossible movement.",
        "blocks": [
          { "label": "broadcast video", "added": false },
          { "label": "YOLO11 player detection", "added": false },
          { "label": "ByteTrack + stitching", "added": false },
          { "label": "court keypoints + homography", "added": false },
          { "label": "WASB ball + jersey-color teams", "added": false },
          { "label": "jersey-number evidence", "added": false },
          { "label": "roster + height + abstention", "added": false },
          { "label": "resolution + camera-motion handling", "added": false },
          { "label": "contextual referee detection", "added": false },
          { "label": "SmolVLM2 jersey reading", "added": true },
          { "label": "OSNet appearance veto", "added": true },
          { "label": "geometric calibration checks", "added": true },
          { "label": "RTS trajectory smoothing", "added": true },
          { "label": "DuckDB index", "added": true }
        ]
      }
    ]
  </script>
  <ol class="pipeline-fallback">
    <li class="pipeline-stage-fallback">
      <h3>basic detection</h3>
      <p>Video → YOLO11 → player boxes.</p>
      <p><strong>why it changed:</strong> Detection alone cannot preserve identity across frames or produce structured game state.</p>
    </li>
    <li class="pipeline-stage-fallback">
      <h3>tracking and court context</h3>
      <p>Add ByteTrack, court mapping, ball tracking, and team classification.</p>
      <p><strong>why it changed:</strong> Unstable IDs and raw pixel positions are not useful enough for possession or movement analysis.</p>
    </li>
    <li class="pipeline-stage-fallback">
      <h3>player identification</h3>
      <p>Add jersey reading, roster and height fusion, and evidence-based abstention.</p>
      <p><strong>why it changed:</strong> The jersey reader produced confident number errors, so identity needed multiple independent signals.</p>
    </li>
    <li class="pipeline-stage-fallback">
      <h3>cross-broadcast hardening</h3>
      <p>Add resolution normalization, camera-motion propagation, and contextual referee detection.</p>
      <p><strong>why it changed:</strong> A second broadcast exposed assumptions that had been invisible when testing on only one feed.</p>
    </li>
    <li class="pipeline-stage-fallback">
      <h3>full-game reliability</h3>
      <p>Add stronger jersey reading, appearance vetoes, geometric checks, trajectory smoothing, and DuckDB indexing.</p>
      <p><strong>why it changed:</strong> Full-game batches exposed identity collisions, misleading calibration metrics, and physically impossible movement.</p>
    </li>
  </ol>
</div>

## baseline player detection

The tutorial's best models live behind a hosted API I didn't have a
key for, so I rebuilt everything from public checkpoints: YOLO11 for
people, a court keypoint model from Hugging Face, and a ball tracker
(WASB) trained on NBA footage. Best thing that happened to the
project: I had to understand and evaluate each piece instead of
calling an endpoint. Fine-tuning a small YOLO on SportsMOT took
detection to AP50 0.97.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play Early basketball analysis with boxes around players"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/01-jun8-tutorial-style-boxes.jpg" aria-label="Early basketball analysis with boxes around players" src="/media/nbacv/01-jun8-tutorial-style-boxes.mp4"></video>
  <figcaption>Night one: boxes around people. No teams, no names, no ball.</figcaption>
</figure>

## maintaining player identities across frames

ByteTrack keeps identities frame to frame, plus an offline stitching
pass that re-joins dropped tracks. The metrics looked fine (MOTA
88.4). The video told the truth: refs were getting jersey numbers and
players swapped identities whenever they crossed paths.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play debug overlay showing player track IDs and confidence"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/02-jun9-debug-overlay-stable-ids.jpg" aria-label="Debug overlay showing player track IDs and confidence" src="/media/nbacv/02-jun9-debug-overlay-stable-ids.mp4"></video>
  <figcaption>The debug overlay era: every track carries an ID and a confidence, and the header admits what the system can't see.</figcaption>
</figure>

## classifying teams using jersey colors

The tutorial clusters SigLIP embeddings to split the teams. That fell
apart on the wide camera. What worked was embarrassingly simple: HSV
color statistics, plus zero-shot prompts for finding the refs. The
fancy embedding model lost to a histogram, and the team color signal
turned out strong enough to repair the identity swaps too.

A homography then maps pixels onto a top-down court, so the output
becomes "he's at the left elbow," not "he's at pixel 840, 410." It
also lets you estimate player height from a bounding box, which pays
off later.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play team classification and court minimap video"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/03-jun10-teams-refs-court.jpg" aria-label="Team classification, jersey numbers, possession, and top-down court minimap" src="/media/nbacv/03-jun10-teams-refs-court.mp4"></video>
  <figcaption>Team-colored ellipses, jersey numbers, possession banner, and a live top-down minimap.</figcaption>
</figure>

## identifying players from jersey numbers and roster data

The best public jersey reader is fine-tuned on soccer, where numbers
run 1 to 99. It had never seen a lone 0, so it read Jayson Tatum's #0
as #8 at 98% confidence. Every time.

So instead of trusting OCR, I gave the system the game roster and made
identity a fusion problem: number votes, plus estimated height, plus
appearance, scored against who was actually on the floor. A misread #8
who measures 6'8" on a team whose only #8 is 7'2" is not that guy, and
the system can say so.

> The design rule that resolved every hard tradeoff: errors must
> degrade to abstention, not misassignment. A null with a reason is
> something you can build on. A confident wrong answer poisons
> everything downstream.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play roster fusion resolving a jersey-number misread"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/04-jun10-player-names.jpg" aria-label="Roster fusion resolving a jersey-number misread to Jayson Tatum" src="/media/nbacv/04-jun10-player-names.mp4"></video>
  <figcaption>The Tatum clip. After roster fusion, the misread #0 resolves to Tatum, and tracks without enough evidence stay unlabeled.</figcaption>
</figure>

## generalizing across broadcast feeds

All of this worked on a Celtics broadcast. On a Mavs feed, three
things failed at once: the court model saw nothing at the old
resolution, keypoint smoothing fell apart on 60fps camera pans, and my
"referee wears black" prompt flagged Orlando's black jerseys as refs.
Not model problems. Assumptions I didn't know I'd baked in until a
second camera exposed them.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play corrected pipeline on a second broadcast feed"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/05-jun10-second-feed.jpg" aria-label="The corrected pipeline running on a second broadcast feed" src="/media/nbacv/05-jun10-second-feed.mp4"></video>
  <figcaption>The same pipeline on the second feed after the fixes, part of a 20-clip batch over the full game.</figcaption>
</figure>

## preventing player identity collisions

On the full game, one Mavs bench player showed up in 14 of 20 clips.
OCR misreads of several players all collapsed onto his number,
including Cooper Flagg, who looks nothing like him. The fix was an
appearance veto: a re-identification embedding (OSNet) that can say
"whoever this is, it is not that guy." Funny detail: the stronger
SigLIP embedding was better at finding the right player and useless at
rejecting the wrong one. Benchmark the decision you actually need.

I also benchmarked the OCR properly, and a small vision language model
(SmolVLM2) beat the soccer specialist outright, so it became the
primary reader. Rerunning the batch: named tracks went from 138 to
194, 21 of 24 players identified, five of six hand-confirmed errors
fixed, and the sixth abstains honestly. Max Christie wears #00, which
the old stack literally could not represent. He went from zero
identifications to six clips.

<figure class="media-figure">
  <button class="video-play" type="button" data-video-play aria-label="Play improved player identification video"><span aria-hidden="true">▶</span></button>
  <video controls muted loop playsinline preload="none" width="1280" height="720" poster="/media/nbacv/posters/06-jun10-roster-names-after-vlm-swap.jpg" aria-label="Improved player identification after swapping the jersey reader" src="/media/nbacv/06-jun10-roster-names-after-vlm-swap.mp4"></video>
  <figcaption>After the reader swap: Flagg gets his name back, Christie's #00 finally reads, and low-evidence tracks keep a plain number instead of guessing.</figcaption>
</figure>

## validating court calibration with geometric checks

Some camera angles show only 4 to 6 court keypoints. A homography fit
on those is exact, zero reprojection error, while putting the horizon
through the middle of the court. The metric was anti-correlated with
being right. I replaced it with geometric sanity checks (horizon
placement, sane scale, keypoint spread) and propagated calibration
through camera motion when keypoints go missing.

## indexing and validating player trajectories

With everything in JSON I built a DuckDB index, and the first sanity
query found players teleporting at 24 m/s. Aggregates looked fine;
trajectories did not. A Kalman filter with RTS smoothing and teleport
gating cut physically impossible steps from 47% to under 1%, without
touching the raw data. Next: play embeddings, possession archetypes,
shot quality.

The models were never the hard part. Every component lies to you in
its own way, and the system only got good when each stage had to show
its evidence or abstain. The head-to-head evals were how each stage
got caught lying.
