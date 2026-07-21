---
title: 'benchmark the decision you actually need'
description: 'the stronger embedding lost to the weaker one, because I was benchmarking the wrong question'
date: 'July 2026'
published: '2026-07-21'
order: 1
from:
  label: 'NBA Video Analysis'
  url: '/work/nba-video-analysis/'
---

While building a computer vision pipeline for NBA broadcasts, I hit a
player identity bug that taught me more about evals than any work
project has. One Mavs bench player showed up in 14 of 20 clips. He
wasn't playing that much. OCR misreads of several players all
collapsed onto his jersey number, including Cooper Flagg, who looks
nothing like him.

The fix I wanted was an appearance check: an embedding that could look
at a track and say "whoever this is, it is not that guy." I had two
candidates. SigLIP, a big general purpose vision language embedding,
and OSNet, a small re-identification model built for matching people
across camera views.

On the standard benchmark framing, which one finds the right player,
SigLIP won. It has seen more of the world, it produces richer
embeddings, and its nearest neighbor retrieval was clearly better.

But that was not the decision my pipeline needed to make. I did not
need "who is this most similar to." I needed "is this definitely not
him." A veto, not a match. And on that decision, SigLIP was useless
and OSNet was excellent. My best guess at why: the general model sees
every tall athlete in a jersey as roughly similar, so nothing ever
gets vetoed, while the specialist's narrower embedding space is
exactly what makes a confident "no" possible.

The lesson generalizes past basketball. Most eval suites measure the
question that is easiest to pose, usually some form of retrieval or
accuracy, and then teams pick models as if that number transfers to
every downstream decision. It does not. A ranking model that is great
at ordering candidates can be terrible at knowing when the whole
candidate set is bad. A classifier with high accuracy can be
miscalibrated exactly in the region where you make your money. An
LLM judge that agrees with humans on average can fail precisely on
the adversarial cases you built it to catch.

The move that actually works is boring: write down the decision the
system makes, build the smallest eval that scores that decision, and
only then compare models. In my case that meant scoring both models
on hand confirmed "this track is not that player" cases instead of
retrieval accuracy, and it flipped the model choice outright.

Every benchmark is a proxy. The only question is whether you picked
the proxy on purpose.

This came out of building the
[NBA video analysis pipeline](/work/nba-video-analysis/), where the
appearance veto and a jersey reader swap together fixed five of six
hand confirmed identity errors.
