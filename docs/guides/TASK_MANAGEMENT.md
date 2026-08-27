# Task Management Guide

> Complete guide to managing tasks with project-mcp.

## Overview

Tasks flow through four stages:

```
ROADMAP.md ──→ BACKLOG.md ──→ todos/*.md ──→ archive/
  (plan)        (queue)        (active)       (done)
```

| Stage | Files | Scale | Purpose |
|-------|-------|-------|---------|
| Planning | ROADMAP.md | Phases | High-level goals |
| Backlog | BACKLOG.md | Hundreds | Prioritized queue |
| Active | todos/*.md | 10-30 | Current work |
| Archive | archive/*.md | Unlimited | History |

---

## The Backlog-First Workflow

### Why Backlog-First?

- **Scale:** BACKLOG.md can hold hundreds of items
- **Focus:** Only 10-30 active task files at a time
- **Planning:** Easy to reprioritize without touching files
- **History:** Archive preserves completed work

### Workflow Steps

1. **Plan** → Add milestones to ROADMAP.md
2. **Extract** → Import tasks to BACKLOG.md
3. **Prioritize** → Order backlog by priority
4. **Promote** → Move ready items to active
5. **Work** → Update task status as you go
6. **Archive** → Move completed to archive

---

## Planning Phase

### Add to Roadmap

```json
{
  "tool": "add_roadmap_milestone",
  "arguments": {
    "title": "v2.0.0 Release",
    "description": "Major release with new features",
    "target_date": "Q2 2025",
    "deliverables": [
      "OAuth authentication",
      "API rate limiting",
      "Dashboard redesign"
    ]
  }
}
```

### Import to Backlog

Extract tasks from your roadmap:

```json
{
  "tool": "import_tasks",
  "arguments": {
    "source": ".project/ROADMAP.md",
    "project": "APP",
    "dry_run": true
  }
}
```

Use `dry_run: true` first to preview, then run again with `false`.

---

## Backlog Management

### Add Single Item

```json
{
  "tool": "add_to_backlog",
  "arguments": {
    "title": "Fix login timeout issue",
    "project": "AUTH",
    "priority": "P1",
    "phase": "v2.0.0",
    "tags": ["bug", "security"]
  }
}
```

### View Backlog

```json
{
  "tool": "get_backlog",
  "arguments": {
    "priority": "P0",
    "phase": "v2.0.0"
  }
}
```

### Update Priority

```json
{
  "tool": "update_backlog_item",
  "arguments": {
    "id": "AUTH-005",
    "priority": "P0"
  }
}
```

### Remove Item

```json
{
  "tool": "remove_from_backlog",
  "arguments": {
    "id": "AUTH-005"
  }
}
```

---

## Active Task Management

### Promote from Backlog

Move a backlog item to active work:

```json
{
  "tool": "promote_task",
  "arguments": {
    "task_id": "AUTH-001",
    "owner": "cursor",
    "estimate": "4h"
  }
}
```

This creates `todos/AUTH-001.md` with full YAML frontmatter.

### Create Directly

For urgent items, bypass backlog:

```json
{
  "tool": "create_task",
  "arguments": {
    "title": "Fix critical security bug",
    "project": "SEC",
    "priority": "P0",
    "owner": "cursor",
    "description": "XSS vulnerability in user input"
  }
}
```

### Task File Format

Active tasks use YAML frontmatter:

```yaml
---
id: AUTH-001
title: Implement OAuth authentication
project: AUTH
priority: P0
status: in_progress
owner: cursor
depends_on:
  - AUTH-002
blocked_by: []
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

Add OAuth 2.0 support for Google and GitHub...

## Subtasks

- [x] Configure OAuth providers
- [ ] Implement callback handler
- [ ] Add session management

## Notes

Meeting notes, links, etc.
```

---

## Working on Tasks

### Get Next Task

Find what to work on (respects dependencies):

```json
{
  "tool": "get_next_task",
  "arguments": {
    "owner": "cursor",
    "limit": 3
  }
}
```

Returns tasks where all dependencies are complete, sorted by priority.

### Start Working

```json
{
  "tool": "update_task",
  "arguments": {
    "id": "AUTH-001",
    "status": "in_progress"
  }
}
```

### Update Progress

```json
{
  "tool": "update_task",
  "arguments": {
    "id": "AUTH-001",
    "subtasks": "- [x] Configure OAuth providers\n- [x] Implement callback handler\n- [ ] Add session management"
  }
}
```

### Mark Complete

```json
{
  "tool": "update_task",
  "arguments": {
    "id": "AUTH-001",
    "status": "done"
  }
}
```

---

## Task Status Workflow

```
┌─────────┐
│  todo   │ ─────────────────────────┐
└────┬────┘                          │
     │                               │
     ▼                               │
┌─────────────┐                      │
│ in_progress │                      │
└──────┬──────┘                      │
       │                             │
       ├──────────┐                  │
       │          │                  │
       ▼          ▼                  ▼
┌─────────┐  ┌─────────┐       ┌─────────┐
│ blocked │  │ review  │ ────▶ │  done   │
└─────────┘  └─────────┘       └─────────┘
```

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `in_progress` | Being worked on |
| `blocked` | Waiting on something |
| `review` | Needs review |
| `done` | Completed |

---

## Dependencies

### Define Dependencies

```json
{
  "tool": "create_task",
  "arguments": {
    "title": "Build user dashboard",
    "project": "UI",
    "depends_on": ["API-001", "AUTH-001"]
  }
}
```

### How Dependencies Work

- `get_next_task` only returns tasks with all deps complete
- Dependent tasks show as "blocked by X"
- Completing a task unblocks dependents

---

## Archiving

### Archive Completed Task

```json
{
  "tool": "archive_task",
  "arguments": {
    "task_id": "AUTH-001"
  }
}
```

Moves to `archive/AUTH-001.md` with completion metadata.

### View Archive

```json
{
  "tool": "list_archived_tasks",
  "arguments": {
    "project": "AUTH",
    "limit": 20
  }
}
```

### Restore from Archive

```json
{
  "tool": "unarchive_task",
  "arguments": {
    "task_id": "AUTH-001"
  }
}
```

---

## Dashboard Sync

Keep TODO.md in sync:

```json
{
  "tool": "sync_todo_index",
  "arguments": {}
}
```

Regenerates `.project/TODO.md` from active tasks.

---

## Search & Filter

### Search by Keyword

```json
{
  "tool": "search_tasks",
  "arguments": {
    "query": "OAuth",
    "include_archived": false
  }
}
```

### Filter Tasks

```json
{
  "tool": "list_tasks",
  "arguments": {
    "status": "in_progress",
    "priority": "P0",
    "owner": "cursor"
  }
}
```

---

## Best Practices

### Task Size

- Keep tasks completable in 1-4 hours
- Use subtasks for larger work
- Split if estimate exceeds 1 day

### Naming

- Use clear, action-oriented titles
- Include context: "Implement OAuth for login" not "OAuth"
- Project prefix helps organization: AUTH-001, API-001

### Dependencies

- Minimize dependency chains
- Complete blockers first
- Use `blocked_by` for external blocks

### Active Queue

- Keep 10-30 active tasks maximum
- Archive completed promptly
- Promote from backlog as needed

---

## Example Workflow

```
Day 1: Planning
  ├─ add_roadmap_milestone (Q1 goals)
  └─ import_tasks (roadmap → backlog)

Day 2: Sprint Start
  ├─ get_backlog (review)
  ├─ promote_task (AUTH-001)
  ├─ promote_task (API-001)
  └─ sync_todo_index

Daily: Execution
  ├─ get_next_task
  ├─ update_task (status: in_progress)
  ├─ [do the work]
  ├─ update_task (status: done)
  └─ archive_task

Weekly: Review
  ├─ list_tasks (status check)
  ├─ list_archived_tasks (completed)
  └─ update_project_status
```

---

## Related Documentation

- [Project Setup](./PROJECT_SETUP.md) — Directory structure
- [Best Practices](./BEST_PRACTICES.md) — Tips and patterns
- [API Reference](../api/TOOLS.md) — Tool specifications

---

*Last Updated: January 2026*

