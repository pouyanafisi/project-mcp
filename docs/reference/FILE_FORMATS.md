# File Formats Reference

> Specifications for all file formats used by project-mcp.

## Overview

project-mcp uses markdown files with optional YAML frontmatter. Different file types have different format requirements.

---

## Task Files (`todos/*.md`)

Active tasks use YAML frontmatter:

### Full Format

```yaml
---
id: AUTH-001
title: Implement OAuth authentication
project: AUTH
priority: P0
status: todo
owner: cursor
depends_on:
  - AUTH-002
  - API-001
blocked_by:
  - Waiting for OAuth credentials
tags:
  - security
  - feature
estimate: 4h
due: 2025-01-15
created: 2025-01-10
updated: 2025-01-12
---

# AUTH-001: Implement OAuth authentication

## Description

Detailed description of the task...

## Subtasks

- [ ] Configure OAuth provider
- [x] Set up environment variables
- [ ] Implement callback handler

## Notes

Any notes, meeting references, links...

## Progress Log

- 2025-01-12: Started implementation
- 2025-01-11: Gathered requirements
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `AUTH-001`) |
| `title` | string | Task title |
| `status` | string | Current status |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project` | string | - | Project code |
| `priority` | string | `P2` | Priority level |
| `owner` | string | - | Assigned owner |
| `depends_on` | array | `[]` | Task dependencies |
| `blocked_by` | array | `[]` | External blockers |
| `tags` | array | `[]` | Tags |
| `estimate` | string | - | Time estimate |
| `due` | string | - | Due date |
| `created` | string | auto | Creation date |
| `updated` | string | auto | Last update |

### Status Values

| Status | Description |
|--------|-------------|
| `todo` | Not started |
| `in_progress` | Being worked on |
| `blocked` | Waiting on something |
| `review` | Needs review |
| `done` | Completed |

### Priority Values

| Priority | Description |
|----------|-------------|
| `P0` | Critical / Blocker |
| `P1` | High priority |
| `P2` | Medium priority (default) |
| `P3` | Low priority |

---

## Backlog File (`BACKLOG.md`)

### Format

```markdown
# Project Backlog

## Phase: v2.0.0

| ID | Title | Priority | Tags | Added |
|----|-------|----------|------|-------|
| AUTH-001 | Implement OAuth | P0 | security | 2025-01-10 |
| API-001 | Add rate limiting | P1 | api | 2025-01-10 |

## Phase: v2.1.0

| ID | Title | Priority | Tags | Added |
|----|-------|----------|------|-------|
| UI-001 | Dashboard redesign | P2 | ui | 2025-01-10 |

## Unprioritized

| ID | Title | Priority | Tags | Added |
|----|-------|----------|------|-------|
| MISC-001 | Update docs | P3 | docs | 2025-01-10 |

---
*Last Updated: 2025-01-10*
```

### Table Columns

| Column | Required | Description |
|--------|----------|-------------|
| `ID` | Yes | Unique identifier |
| `Title` | Yes | Item title |
| `Priority` | Yes | Priority level |
| `Tags` | No | Comma-separated tags |
| `Added` | No | Date added |

---

## Status File (`STATUS.md`)

### Format

```markdown
# Project Status

**Last Updated:** 2025-01-15

## Current Phase

Phase 2: Core Features

## Health

🟢 **GREEN** - On track

## Recent Changes

### Status Update - 2025-01-15

**Status:** On track for v2.0 release
**Health:** 🟢 **GREEN**
**Recent Changes:**
- Completed OAuth integration
- Fixed API rate limiting
**Next Milestone:** User dashboard

### Status Update - 2025-01-10

**Status:** Starting Phase 2
...

## Risks & Blockers

- None currently

## Next Milestone

v2.0.0 Release - Q1 2025

---
*Last Updated: 2025-01-15*
```

---

## Roadmap File (`ROADMAP.md`)

### Format

```markdown
# Project Roadmap

## ⬜ v2.0.0 - Core Features

**Target:** Q1 2025
**Status:** in_progress

Major release with authentication and API improvements.

### Deliverables

- [ ] OAuth authentication
- [ ] API rate limiting
- [ ] Performance optimization

## ✅ v1.0.0 - Initial Release

**Target:** Q4 2024
**Status:** completed

Initial release with basic functionality.

### Deliverables

- [x] Core API
- [x] Basic UI
- [x] Documentation

---
*Last Updated: 2025-01-15*
```

### Status Emojis

| Status | Emoji |
|--------|-------|
| `planned` | ⬜ |
| `in_progress` | 🔵 |
| `completed` | ✅ |
| `delayed` | 🔴 |

---

## Decisions File (`DECISIONS.md`)

### Format

```markdown
# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for this project.

## ADR-002: Use JWT for Session Management

**Date:** 2025-01-15
**Status:** accepted
**Tags:** security, authentication

### Context

Need to implement stateless authentication for the API...

### Decision

We will use JWT tokens with 1-hour expiry...

### Consequences

Positive:
- Stateless, easy to scale
- No session storage needed

Negative:
- Can't revoke individual tokens
- Token size larger than session ID

## ADR-001: Use PostgreSQL for Database

**Date:** 2025-01-10
**Status:** accepted
**Tags:** database, infrastructure

### Context

...

### Decision

...

### Consequences

...

---
*Last Updated: 2025-01-15*
```

### ADR Status Values

| Status | Description |
|--------|-------------|
| `proposed` | Under consideration |
| `accepted` | Approved and active |
| `deprecated` | No longer recommended |
| `superseded` | Replaced by another |

---

## TODO Dashboard (`TODO.md`)

### Format

```markdown
# TODO

## In Progress

- 🔵 **AUTH-001** Implement OAuth (P0) @cursor

## Next Up

- ⚪ **API-001** Add rate limiting (P1)
- ⚪ **API-002** Update documentation (P2)

## Blocked

- 🔴 **UI-001** Dashboard redesign (P1) - Blocked by design approval

## Completed

- ✅ **AUTH-000** Set up auth framework (2025-01-10)

---
*Auto-generated by sync_todo_index*
*Last Updated: 2025-01-15*
```

---

## Index/Contract File (`index.md`)

### Format

```markdown
# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, the canonical sources of truth are:

1. **`.project/`** — Current state, plans, todos, decisions
2. **Root markdown files** — README.md, DEVELOPMENT.md, etc.
3. **`docs/`** — Long-form reference documentation

## Project Overview

Brief description of the project...

## Key Sources

| Query Type | Where to Look |
|------------|---------------|
| Current status | `.project/STATUS.md` |
| What to work on | `.project/TODO.md` |
| Future plans | `.project/ROADMAP.md` |
| API docs | `docs/api/` |
| Guides | `docs/guides/` |

## Principles

- **Natural language stays natural** - Users say "project" not ".project/"
- **Agents don't guess** - Explicit mappings defined here

---
*Last Updated: 2025-01-15*
```

---

## Documentation Files (`docs/**/*.md`)

### Standard Format

```markdown
# Document Title

> Brief description (optional)

## Introduction

What this document covers...

## Main Content

### Section 1

Content...

### Section 2

Content...

## Related Documentation

- [Related Doc](./path.md) - Description

---

*Last Updated: Month Year*
```

### With Frontmatter (Optional)

```yaml
---
title: Document Title
description: Brief description
category: guides
author: Author Name
created: 2025-01-10
updated: 2025-01-15
---

# Document Title

Content...
```

---

## Archive Files (`archive/*.md`)

Same format as task files, with additional archive metadata:

```yaml
---
id: AUTH-001
title: Implement OAuth authentication
status: done
archived: 2025-01-15
completed: 2025-01-14
# ... other task fields
---

# AUTH-001: Implement OAuth authentication

## Description
...

## Completion Notes

Task completed successfully. OAuth working for Google and GitHub.
```

---

## Release Notes (`docs/releases/RELEASE_NOTES_v*.md`)

### Format

```markdown
# Release Notes - v2.0.0 "Feature Release"

**Release Date:** 2025-01-15

## Summary

Brief summary of this release...

## ✨ New Features

- Feature 1 description
- Feature 2 description

## 🐛 Bug Fixes

- Fix 1 description
- Fix 2 description

## ⚠️ Breaking Changes

- Breaking change description

## 📦 Deprecations

- Deprecated feature description

## Upgrade Guide

Steps to upgrade from previous version...

---
*Generated: 2025-01-15*
```

---

## Common Conventions

### Timestamps

Use ISO 8601 format:
- Date: `2025-01-15`
- DateTime: `2025-01-15T10:30:00Z`

### File Naming

| Directory | Convention | Example |
|-----------|------------|---------|
| `todos/` | `{ID}.md` | `AUTH-001.md` |
| `archive/` | `{ID}.md` | `AUTH-001.md` |
| `docs/` | `UPPERCASE.md` or `lowercase.md` | `OVERVIEW.md` |
| `releases/` | `RELEASE_NOTES_v{version}.md` | `RELEASE_NOTES_v2.0.0.md` |

### Footer

Most files end with:

```markdown
---
*Last Updated: 2025-01-15*
```

---

## Related Documentation

- [Configuration](./CONFIGURATION.md) — Server configuration
- [Task Management](../guides/TASK_MANAGEMENT.md) — Task workflow
- [Project Setup](../guides/PROJECT_SETUP.md) — Directory structure

---

*Last Updated: January 2026*

