# Release v1.1.0 - Task Management & Documentation Linting

**Release Date:** December 29, 2024

> **Note:** See [RELEASE_NOTES_v1.2.0.md](RELEASE_NOTES_v1.2.0.md) for the latest release.

## Overview

This release introduces a comprehensive task management system with YAML frontmatter, dependency tracking, and Jira-like IDs. It also adds documentation linting to ensure project files conform to standards.

## New Features

### Task Management System

A new structured approach to managing tasks within projects:

- **YAML Frontmatter**: Tasks stored with rich metadata (priority, status, owner, dependencies, estimates, due dates, tags)
- **Stable IDs**: Jira-like format `{PROJECT}-{NNN}` (e.g., `AUTH-001`, `API-042`)
- **Dependencies**: `depends_on` array prevents tasks from appearing in `get_next_task` until dependencies are complete
- **Status Workflow**: `todo` → `in_progress` → `blocked` | `review` → `done`
- **Subtask Checklists**: Track granular progress within tasks

### New Tools

#### `create_task`

Creates a new task with YAML frontmatter metadata.

```json
{
  "tool": "create_task",
  "arguments": {
    "title": "Implement OAuth",
    "project": "AUTH",
    "priority": "P0",
    "owner": "cursor",
    "depends_on": ["AUTH-002"],
    "estimate": "2d"
  }
}
```

#### `update_task`

Updates any field on an existing task, including status transitions.

```json
{
  "tool": "update_task",
  "arguments": {
    "id": "AUTH-001",
    "status": "done"
  }
}
```

#### `get_next_task`

Returns dependency-aware next task(s) to work on. Sorted by priority (P0→P3), filters out blocked tasks and those with incomplete dependencies.

```json
{
  "tool": "get_next_task",
  "arguments": {
    "owner": "cursor",
    "limit": 5
  }
}
```

#### `list_tasks`

Lists all tasks with optional filtering by project, owner, status, priority, or tag.

#### `lint_project_docs`

Validates project documentation against standards:

- **Required files check**: Ensures `index.md`, `TODO.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md` exist
- **Task validation**: Required fields, valid status/priority values, valid dependencies
- **Broken dependency detection**: Flags references to non-existent tasks
- **Circular dependency detection**: Prevents tasks depending on themselves
- **Auto-fix mode**: Automatically corrects fixable issues (timestamps, priority normalization)
- **Strict mode**: Enforces additional requirements (estimates, descriptions)

```json
{
  "tool": "lint_project_docs",
  "arguments": {
    "fix": true,
    "strict": false,
    "scope": "all"
  }
}
```

### Updated `sync_todo_index`

Now generates a dashboard view with:

- Status and priority counts
- Next actionable tasks (dependency-ready)
- In-progress and blocked task lists
- Project summary with completion percentages

## Task File Format

Tasks are stored in `.project/todos/` with YAML frontmatter:

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
blocked_by: []
tags:
  - security
  - feature
estimate: 2d
due: 2025-01-15
created: 2025-12-29
updated: 2025-12-29
---

# AUTH-001: Implement OAuth authentication

## Description

Detailed description here...

## Subtasks

- [ ] Set up OAuth provider
- [x] Configure environment variables

## Notes
```

## Improvements

### README Updates

- Added table of contents for easier navigation
- Documented all new tools with examples
- Added task management workflow diagram
- Updated project structure guide to include `todos/` directory

## Breaking Changes

None. This release is fully backward compatible with v1.0.0.

## Migration Guide

No migration required. Existing projects will continue to work. To use the new task management features:

1. Create tasks using `create_task`
2. Use `get_next_task` to determine what to work on
3. Update task status with `update_task`
4. Run `sync_todo_index` to update the TODO.md dashboard
5. Run `lint_project_docs` before commits to ensure quality

## Technical Details

- **Node.js:** >=18.0.0
- **Dependencies:** No new dependencies added

## Full Changelog

### Added

- `create_task` tool for creating tasks with YAML frontmatter
- `update_task` tool for modifying existing tasks
- `get_next_task` tool for dependency-aware task selection
- `list_tasks` tool for filtering and listing tasks
- `lint_project_docs` tool for documentation validation
- Task ID generation (`{PROJECT}-{NNN}` format)
- Dependency resolution for task ordering
- Auto-fix capabilities in linting
- Strict mode for enhanced validation
- README table of contents
- Task management documentation

### Changed

- `sync_todo_index` now generates a dashboard view with stats
- Improved documentation organization

### Removed

- `create_or_update_owner_todo` (replaced by `create_task`)

---

**Full Documentation:** [README.md](README.md)

