# Release v1.3.0 - Backlog-First Architecture

**Release Date:** December 29, 2024

## Overview

This release introduces a **backlog-first workflow** that separates planning from execution. Instead of creating hundreds of YAML task files upfront, tasks now flow through a structured pipeline:

```
ROADMAP.md → BACKLOG.md → todos/*.md → archive/
  (plan)       (queue)     (active)    (done)
```

## Why This Change?

The previous approach could create hundreds of individual YAML files when importing a large plan. This is:
- Hard to manage at scale
- Slow for agents to process
- Not how real teams work (you don't create 380 Jira tickets day one)

The new approach:
- **BACKLOG.md** holds the prioritized queue (hundreds of items OK - it's just markdown)
- **todos/** has only 10-30 active YAML files (the current sprint/focus)
- **archive/** preserves completed work for history

## New Features

### `BACKLOG.md` File

A new standard file created by `init_project`:

```markdown
# Backlog

## Queue

### P0 - Critical
- [ ] **AUTH-001**: Implement user login [P1] [security]

### P1 - High Priority
- [ ] **AUTH-002**: Add OAuth support [P1] [security]

### P2 - Medium Priority
...
```

### `promote_task` Tool

Moves a task from BACKLOG.md to an active YAML file:

```json
{
  "tool": "promote_task",
  "arguments": {
    "task_id": "AUTH-001",
    "owner": "cursor",
    "estimate": "2h",
    "depends_on": ["AUTH-002"]
  }
}
```

**Result:** Creates `todos/AUTH-001.md` with full YAML frontmatter.

### `archive_task` Tool

Moves completed tasks out of the active queue:

```json
{
  "tool": "archive_task",
  "arguments": {
    "task_id": "AUTH-001"
  }
}
```

**Result:** Moves `todos/AUTH-001.md` to `archive/AUTH-001.md`.

### Updated `import_tasks` Tool

Now imports to BACKLOG.md instead of creating files:

```json
{
  "tool": "import_tasks",
  "arguments": {
    "source": ".project/ROADMAP.md",
    "project": "APP",
    "phase": "Phase 1"  // Optional: filter by phase
  }
}
```

## Workflow

### Setting Up a New Project

```
1. init_project(project_name: "My App")
   → Creates .project/ with BACKLOG.md, todos/, archive/

2. Edit ROADMAP.md with phases and tasks

3. import_tasks(source: "ROADMAP.md", project: "APP")
   → Populates BACKLOG.md (NOT individual files)

4. promote_task(task_id: "APP-001", owner: "cursor")
   → Creates todos/APP-001.md (ready for work)
```

### Working on Tasks

```
1. get_next_task()
   → Returns highest priority task with dependencies met

2. update_task(id: "APP-001", status: "in_progress")
   → Mark as started

3. [Do the work]

4. update_task(id: "APP-001", status: "done")
   → Mark as complete

5. archive_task(task_id: "APP-001")
   → Move to archive, keep todos/ small
```

## Directory Structure

```
.project/
├── index.md           # Contract
├── BACKLOG.md         # Prioritized queue (hundreds OK)
├── TODO.md            # Dashboard (auto-generated)
├── ROADMAP.md         # Planning
├── STATUS.md          # Health
├── DECISIONS.md       # ADRs
├── todos/             # Active work (10-30 files)
│   ├── APP-001.md
│   └── APP-002.md
└── archive/           # Completed (history)
    └── APP-000.md
```

## Breaking Changes

### `import_tasks` Behavior Changed

**Before (v1.2):** Created individual YAML files for each task
**After (v1.3):** Adds tasks to BACKLOG.md

**Migration:** If you have existing YAML files, they continue to work. Use `promote_task` for new tasks from backlog.

## Full Changelog

### Added
- `BACKLOG.md` standard file for work queue
- `promote_task` tool
- `archive_task` tool
- `archive/` directory
- Phase filtering in `import_tasks`

### Changed
- `import_tasks` targets BACKLOG.md (not individual files)
- `init_project` creates BACKLOG.md and archive/
- README updated with backlog-first workflow

---

**Full Documentation:** [README.md](README.md)

