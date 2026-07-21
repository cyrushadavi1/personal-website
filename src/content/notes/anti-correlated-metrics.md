---
title: 'when the metric is anti-correlated with reality'
description: 'zero reprojection error, horizon through the middle of the court'
date: 'July 2026'
published: '2026-07-21'
order: 2
from:
  label: 'NBA Video Analysis'
  url: '/work/nba-video-analysis/'
---

The scariest failure mode in an ML system is not a bad metric. It is
a good metric attached to a wrong answer.

I hit a clean example while calibrating court positions from NBA
broadcast video. The pipeline fits a homography from detected court
keypoints, mapping pixels onto a top down court. Some camera angles
only show 4 to 6 keypoints. A homography fit on that few points is
exact: zero reprojection error, a perfect score, while putting the
horizon through the middle of the court.

The metric was not just uninformative. It was anti-correlated with
being right. The fewer keypoints the model saw, the easier the fit,
the better the score, the worse the answer. If I had built alerting
on reprojection error, the alarms would have gone quiet exactly when
the system was most wrong.

The same thing happened one layer up. My tracker scored MOTA 88.4,
a respectable multi object tracking number. The video told the truth:
referees were being assigned jersey numbers and players swapped
identities every time they crossed paths. The aggregate looked fine
because the failures were concentrated in exactly the moments that
matter, when players are close together, which is also when possession
changes and plays happen.

What replaced the broken metrics was not a better single number. It
was a set of checks that ask whether the answer is physically
possible: is the horizon where a horizon should be, is the court an
achievable size, are the keypoints spread out enough to constrain the
fit. One layer up, a sanity query over the trajectory index asked
whether any player was moving at 24 meters per second. Dumb checks,
individually trivial, and collectively they caught the failures the
clean metrics had blessed.

I think about this constantly with LLM evals now. Any scalar you
optimize will eventually decouple from the thing you care about, and
the decoupling is worst exactly where the system is weakest, because
that is where the metric's assumptions break. The defense is not a
smarter metric. It is looking at the raw outputs on the cases the
metric says are perfect, and keeping a layer of possibility checks
that no single score can talk its way past.

Aggregates reassure. Trajectories tell the truth.

The full story, including the fix, is in the
[NBA video analysis pipeline](/work/nba-video-analysis/) writeup.
