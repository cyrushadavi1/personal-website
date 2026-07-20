---
title: 'Rakhsh'
tagline: 'An always-on personal operator with durable memory and bounded authority'
category: 'agent systems'
year: '2026'
timeframe: 'July 2026 – now'
status: 'private alpha'
role: 'architect & builder'
order: 2
stack:
  - Python
  - asyncio
  - Codex App Server
  - SQLite WAL
  - FTS5
  - macOS
  - iMessage
  - launchd
results:
  - label: 'interface'
    value: 'iMessage'
  - label: 'verification'
    value: '696 tests'
  - label: 'recovery'
    value: 'durable queue'
  - label: 'authority'
    value: 'typed & scoped'
links: []
---

## building an always-on operator around iMessage

Most assistants wait inside an app for the next prompt. I wanted one I could
text, walk away from, and trust to keep working: an operator that remembers
ongoing projects, runs scheduled jobs, survives restarts, and can use the Mac
and external services without turning every request into an approval dialog.

Rakhsh is that system. A single iMessage thread is the front door to a Python
control plane running on a Mac Mini. Persistent Codex App Server sessions do the
reasoning. A durable task supervisor, memory system, capability layer, and
authority manager turn those sessions into an operator rather than a chatbot.

```text
iMessage / schedules / events
              ↓
      durable control plane
       ↙               ↘
Codex workers        typed capabilities
       ↘               ↙
        SQLite state + journal
```

## separating reasoning from authority

The central architecture decision was to separate the part that reasons from
the part that has authority. Codex workers get a managed task workspace and a
small, frozen tool manifest. They do not inherit access to Messages, Keychain,
Rakhsh state, unrelated files, or macOS privacy permissions.

The Host owns those boundaries. Anything durable, privileged, or external goes
through a typed capability with argument validation, health checks, profile
gating, provenance, and a recovery contract. Untrusted code takes a stricter
contained lane; if containment is unavailable, the task fails closed instead
of quietly gaining more privilege.

This makes the security model structural. It does not depend on asking a model
to recognize every dangerous shell command or obey a list of forbidden names.

## making work survive process failure

The task supervisor is a SQLite-backed state machine, not a collection of
in-memory futures. It records task status, dependencies, workspace, runtime
thread, attempt count, leases, heartbeats, checkpoints, artifacts, and results.
SQLite runs in WAL mode as the single source of truth.

Workers atomically claim ready tasks. Stale leases can be reclaimed, dependent
tasks can be promoted, and repeated failures trip a circuit breaker. Schedules,
monitors, webhooks, and interactive messages all enter the same queue, so
background work does not get a separate, weaker execution path.

After a restart, Rakhsh reconciles unfinished actions, resumes safe work, and
checks destinations before retrying uncertain external effects. A missing
response is never treated as proof that an email, calendar edit, or remote
operation failed.

## binding approvals to exact operations

Rakhsh is autonomous for routine, reversible work. Human approval is reserved
for a short set of identity-bearing, irreversible, financial, credential, and
security boundaries.

Those approvals bind to a canonical semantic operation: the capability, exact
normalized arguments, target, nonce, expiry, and a hash of the full envelope.
A short reply code approves only that operation. Change a recipient, amount, or
other material argument and the approval no longer matches.

Standing rules can authorize recurring work, but remain scoped by account,
target, time window, reversibility, and rolling budgets. Every non-read attempt
is journaled before execution and linked to its receipt, approval, and undo
information.

## designing memory that gets sharper over time

Rakhsh keeps raw history separate from curated memory. The raw archive is
searchable with SQLite FTS5 and optional vectors. Curated records store facts,
preferences, decisions, entities, relationships, and open loops with sources,
confidence, trust labels, and supersedence.

Nightly local models propose merges and pruning, challenge each proposal, and
apply only changes that survive that review. Decay reduces stale situational
context while retrieval reinforces useful memories. Records can be corrected,
forgotten, archived, or rolled back.

Provenance is monotone: a fact derived from untrusted content stays untrusted
through synthesis and consolidation. It can inform reasoning, but it cannot
expand authority or satisfy a standing rule.

## keeping the tool surface small

Tool schemas consume context on every turn, so each worker profile receives the
minimum useful manifest rather than every installed integration. Unhealthy or
unauthorized capabilities disappear from the manifest entirely.

New functionality follows a footprint ladder: first a reusable skill built from
existing tools, then an operation on an existing connector, then a gated Host
tool, and only finally a new core primitive. This keeps tool selection legible
as the system grows across browser work, GitHub, email, calendars, Notion,
Slack, media processing, and Mac automation.

## current alpha and the next security boundary

The private alpha now has the iMessage gateway, persistent runtime sessions,
durable supervision, semantic approvals, memory, automations, connectors,
self-created skills, receipts and undo, and macOS capability adapters. The
automated suite currently passes 696 tests; six live checks remain manual
because they exercise real iMessage, launchd, connector, media, or privacy
permissions.

The next boundary is deployment hardening: proving the worker sandbox under the
actual launchd identity and macOS privacy grants, then enabling capability
profiles one at a time as their isolation and live acceptance gates pass.
