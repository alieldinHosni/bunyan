# BUNYAN — Session Plan

How the work is split across Claude Code sessions, in what order, and how they avoid
destroying each other's work.

---

## The answer up front

**Six sessions. Only one or two active at a time. Start with Session 1 and do not start
anything else until it finishes.**

The instinct to split by concern is right, but the thing that actually saves tokens is not
the session count — it's that each session reads **only its own spec file**, never the
others. Six sessions each loading all six specs is worse than one session. The split below
is designed so every session needs one spec and one log.

---

## The six sessions

| # | Session | Spec file | Owns these directories | Depends on |
| --- | --- | --- | --- | --- |
| 1 | **Stabilise** | `MASTER-BACKLOG.md` | existing `js/`, `css/`, `index.html` | — |
| 2 | **Architecture** | `SESSION-ARCHITECTURE.md` | `docs/adr/` only (no code) | 1 |
| 3 | **Backend** | `SESSION-BACKEND.md` | `server/`, `db/`, `api/` | 2 |
| 4 | **Knowledge** | `KNOWLEDGE-BASE-INGESTION.md` | `js/knowledge/`, `docs/`, `tools/` | — |
| 5 | **Agent** | `SESSION-AGENT.md` | `js/agent/` | 3, 4 |
| 6 | **Design** | `SESSION-DESIGN.md` | `css/`, `js/components/` | 1 |

### Order

```
1 Stabilise  ──┬──> 2 Architecture ──> 3 Backend ──┬──> 5 Agent
               │                                    │
               └──> 6 Design                        │
                                                    │
4 Knowledge  ───────────────────────────────────────┘   (runs from day one, in parallel)
```

**Session 4 is the only one safe to run in parallel from the start.** It writes exclusively
to new directories that no other session touches. Everything else waits its turn.

---

## Why Session 1 goes first and alone

The app rebuilds whole screens with `innerHTML` on small state changes. That single defect
has already produced five separate bug reports — search jumping, image flashing, star-tap
sheet bounce, sheet bouncing, profile repainting — and the Progress tab currently being
built is the sixth candidate.

**Every screen built before that is fixed inherits it.** A login screen, a comparison
dashboard, a coach view and an agent chat panel built on the current render model means
rediscovering the same bug four more times, in four more places, each one harder to isolate
than the last.

Session 1 is: finish the Progress tab, then the eleven remaining `MASTER-BACKLOG.md` items,
render granularity first. Nothing else starts until its log says done.

---

## Session 2 is not a coding session

The database changes what this app *is*. Before any schema is written, these get decided and
written down in `docs/adr/` as dated decision records:

- **Hosting and database** — what, where, what it costs at zero users and at fifty
- **Auth** — email/password, OAuth, magic links; what happens on password reset
- **Offline** — does the app still work with no signal, and what syncs when it returns.
  This is the big one. Offline-first and multi-user sync are the two hardest things to
  reconcile in this whole project, and the answer determines the data model.
- **Data protection** — what personal and health data is stored, where it physically lives,
  how a user deletes their account and everything in it, what a coach can see and how
  consent is captured
- **Cost ceiling** — the monthly figure above which the project stops, decided now while
  it's abstract rather than later while it's a bill
- **Migration** — every existing user has `localStorage` data. How it moves, and what
  happens to someone who never makes an account

Output: one ADR per decision. No code. **This session's output is what Session 3 implements**
— skip it and Session 3 will invent these answers silently.

---

## Session 4 can start tonight

`KNOWLEDGE-BASE-INGESTION.md` is already written and the books are already in `source/`.
It touches no existing code, so it cannot conflict with Session 1.

**It runs under the methodology-only rule.** Facts, systems, prescriptions and relationships
extracted and restructured; no verbatim prose, no book images. The multi-user architecture
makes that rule stricter, not looser — the app will now be distributing whatever it contains
to other people.

---

## Keeping sessions from colliding

### Directory ownership is the whole mechanism

The table above is not advice. A session edits files in **its own directories only.** If it
needs something changed outside them, it writes the request into its log and stops.

Two sessions editing the same file is the one failure mode that loses work irrecoverably,
and it happens silently.

### One active session by default

Run one. Two only when their directory sets are genuinely disjoint — Session 1 and Session 4
are the clean pair. Never two sessions that both touch `js/`.

### Git

While one session is active, this is enough: commit at the end of every unit of work.

The moment you run two sessions at once, each gets its own branch, named for the session
(`session/knowledge`, `session/stabilise`), merged when its spec is done. Without that,
parallel sessions overwrite each other's commits.

---

## Configuration — the actual setup

### 1. `CLAUDE.md` at the repo root

This is the single highest-leverage file in the whole setup. Claude Code loads it
automatically into **every** session, so the invariants stop needing to be re-pasted and
stop being forgotten halfway through.

A ready-to-use one is in `CLAUDE.md` alongside this file. Drop it at the repo root.

**Keep it short.** It is loaded into every session forever, so every line is a permanent tax
on all six. Invariants only — rules that are true regardless of what the session is doing.
Anything task-specific belongs in that session's spec file instead.

### 2. One `.claude/` folder, shared

```
.claude/
  PROGRESS.md                     — overall state, all sessions append
  SESSION-RULES.md                — the ownership table from this document
  MASTER-BACKLOG.md               — session 1
  SESSION-ARCHITECTURE.md         — session 2
  SESSION-BACKEND.md              — session 3
  KNOWLEDGE-BASE-INGESTION.md     — session 4
  INGESTION-LOG.md                — session 4's own log
  SESSION-AGENT.md                — session 5
  SESSION-DESIGN.md               — session 6
```

### 3. Every session opens the same way

```
Read .claude/SESSION-RULES.md and .claude/PROGRESS.md.

This is the <name> session. Your spec is .claude/<SPEC>.md — read it and
nothing else from .claude/.

You own: <directories>. Do not edit anything outside them. If you need a
change outside your directories, write it in PROGRESS.md and stop.

Work in units. After each unit: update PROGRESS.md, commit, continue.
```

That "read it and nothing else" line is what keeps the token cost flat as the spec folder
grows.

### 4. Every session closes the same way

Update `PROGRESS.md` and stop. A session that dies with three units done and nothing logged
has lost three units.

---

## What to do tonight

1. Drop `CLAUDE.md` at the repo root.
2. Put `SESSION-RULES.md` in `.claude/` — the ownership table above.
3. Tell the current session to finish Progress and then work `MASTER-BACKLOG.md`. That is
   Session 1 and it is the only code session running.
4. Open a second session for Knowledge, pointed at `KNOWLEDGE-BASE-INGESTION.md`. It is
   safe to run alongside.
5. Leave Sessions 2, 3, 5 and 6 closed. Session 2 is the next one to open, and only once
   Session 1's log says the backlog is clear.

Two sessions. Not six yet. Six sessions open with one person approving them is six stalled
sessions.
