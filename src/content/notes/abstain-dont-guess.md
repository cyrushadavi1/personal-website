---
title: 'errors should degrade to abstention, not misassignment'
description: 'a null with a reason is something you can build on; a confident wrong answer poisons everything downstream'
date: 'July 2026'
published: '2026-07-21'
order: 3
from:
  label: 'NBA Video Analysis'
  url: '/work/nba-video-analysis/'
---

The best public jersey number reader I could find was fine tuned on
soccer, where numbers run 1 to 99. It had never seen a lone 0, so it
read Jayson Tatum's #0 as #8 at 98% confidence. Every time. Not
uncertain, not flaky. Confidently, consistently wrong.

That one failure ended up dictating the design rule for the whole
pipeline: errors must degrade to abstention, not misassignment. A
null with a reason is something you can build on. A confident wrong
answer poisons everything downstream.

The difference is not cosmetic. When the jersey reader outputs
"unknown," downstream stages can wait for more evidence, ask a
different signal, or just leave the track unlabeled. When it outputs
"#8, 98%," downstream stages build on a lie. The wrong name flows
into possession stats, into trajectories, into every aggregate, and
by the time a human notices, the error has been laundered into a
hundred derived numbers that all agree with each other.

Making abstention work took more than a confidence threshold. The
reader was at 98% on its wrong answers, so thresholds were useless.
What worked was making identity a fusion problem with the roster as
ground truth: jersey number votes, estimated height from the court
homography, and appearance embeddings, scored against who was
actually on the floor. A misread #8 who measures 6'8" on a team
whose only #8 is 7'2" is not that guy, and the system can say so,
and say why. Tracks without enough evidence stay unlabeled, with a
plain number instead of a guessed name.

The end state: 21 of 24 players identified across a full game batch,
five of six hand confirmed errors fixed, and the sixth abstaining
honestly. I will take an honest abstention over a confident error in
every system I build.

I keep meeting this same choice in LLM systems. A model that says "I
don't know" is annoying in a demo and priceless in production. An
agent that stops and asks before an irreversible action feels slower
than one that barrels ahead, until the day it doesn't. Calibration
is not a nice to have property of a model. It is the property that
decides whether you can compose systems out of it at all.

The pipeline this rule comes from is the
[NBA video analysis project](/work/nba-video-analysis/); the same
principle drives how [Rakhsh](/work/rakhsh/) treats approvals and
uncertain external effects.
