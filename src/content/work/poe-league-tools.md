---
title: 'Path of Exile League Tools'
tagline: 'A log-driven desktop assistant for Path of Exile league starts'
category: 'desktop tool'
year: '2026'
timeframe: '2026 – now'
status: 'active'
role: 'solo builder'
order: 2
stack:
  - Python
  - PyQt6
  - Path of Building
  - log parsing
results:
  - label: 'game access'
    value: 'log-only'
  - label: 'route coverage'
    value: 'full campaign'
  - label: 'build import'
    value: 'PoB → leveling sheet'
links:
  - label: github
    url: 'https://github.com/cyrushadavi1/poe-league-tools'
---

## reducing manual work during league starts

A Path of Exile league start is a race. The first hours set up your
whole economy, and every minute alt tabbed to a wiki is a minute lost.
Most gaming helpers solve this by reading game memory or injecting
into the process, which is exactly how accounts get banned.

## designing within Path of Exile's automation rules

The whole system reads exactly one thing: `Client.txt`, the plain text
log the game writes and the developer explicitly allows reading. No
memory access, no injection, no simulated input. Everything the tool
knows, it infers from log lines.

## system architecture and data flow

A PyQt6 guide card floats over the game, watches the log, and auto
advances through a full campaign route as you zone: every quest, skill
point, trial, and logout warp trick, authored at full guided density
in a JSON route format. Global hotkeys cover the weird cases: step
back, skip ahead, hide, or toggle click through so the card never eats
a click meant for the game.

## decoding Path of Building data

Path of Building codes, the community standard for sharing builds, are
base64 wrapped zlib compressed XML. A decoder turns any code into an
act by act leveling sheet: gem links to buy, passive tree checkpoints,
printable markdown. The same plan feeds gem reminders into the
overlay, so the card knows which skills your build wants at each step.

## current capabilities

The overlay, full campaign route, Path of Building decoder, leveling
sheet, and build-aware gem reminders all work locally without reading
game memory or automating input.

## planned improvements

The next experiments are an AI build advisor that compares patch notes
against a build, and a meta-ranker over live ladder data from poe.ninja.

<!-- TODO: screenshot or short screen recording of the overlay in-game:
<img src="/media/poe-overlay.png" alt="overlay guide card over the game" />
-->
