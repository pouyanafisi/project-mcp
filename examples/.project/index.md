---
title: Project Knowledge Index
created: '2026-01-01'
updated: '2026-01-02'
---

# Project Knowledge Index

## Contract for AI Agents

### Critical Distinction: Project Management vs Project Documentation

| Term | Means | Sources |
|------|-------|---------|
| **"project docs"** / **"project documentation"** | Application documentation (HOW the system works) | `docs/` + `DECISIONS.md` |
| **"project status"** / **"todos"** / **"roadmap"** | Project management (WHAT we're doing) | `.project/` management files |

**DECISIONS.md is special**: It's application documentation (explains WHY decisions were made) even though it lives in `.project/`.

## Source Mappings

### "project docs" / "project documents" / "project documentation"

APPLICATION documentation — how the system works, why it was built this way.

Searches:

- `docs/` directory
- `DECISIONS.md` (architecture decisions are documentation)

### "docs" / "documentation" / "reference"

Reference documentation only.

Searches:

- `docs/` directory

### "plan" / "todos" / "roadmap" / "status" / "backlog"

Project MANAGEMENT — tracking work, not documenting the system.

Searches:

- `.project/` (STATUS.md, TODO.md, ROADMAP.md, BACKLOG.md, todos/)

### "decisions" / "architecture decisions" / "ADR"

Architecture decision records.

Searches:

- `DECISIONS.md`

### "project" / "the project"

Everything (when intent is ambiguous).

Searches:

- `.project/` directory
- Root-level markdown files
- `docs/` directory

## Principles

- **"Project docs" ≠ "Project management"** — "Update project docs" means application documentation, not task tracking
- **DECISIONS.md is documentation** — It explains the system, not tracks work
- **Natural language stays natural** — Users say "project docs" not "docs/ + DECISIONS.md"
- **Repo stays conventional** — Standard directory names
- **Agents don't guess** — Explicit mappings defined here
- **Intent over structure** — Language maps to intent, not directory names

---

_Last Updated: 2026-01-02_
