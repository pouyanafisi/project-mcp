# project-mcp

> **Intent-based MCP server for project documentation** — Maps natural language
> to the right sources automatically

[![npm version](https://img.shields.io/npm/v/project-mcp.svg)](https://www.npmjs.com/package/project-mcp)
[![Node.js](https://img.shields.io/node/v/project-mcp.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

When users say "project", "docs", or "todos", `project-mcp` automatically
searches the right directories—no configuration needed. It understands intent,
not just directory names.

---

# ⚡ Quick Start

## Install

```bash
npm install project-mcp
```

## Configure

Add to `.mcp.json`:

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"]
		}
	}
}
```

**That's it.** The server automatically finds and indexes:

- `.project/` — Operational truth (plans, todos, status)
- Root markdown files — README.md, DEVELOPMENT.md, etc.
- `docs/` — Reference documentation

---

## Table of Contents

- [project-mcp](#project-mcp)
- [⚡ Quick Start](#-quick-start)
  - [Install](#install)
  - [Configure](#configure)
  - [Table of Contents](#table-of-contents)
  - [🎯 Why project-mcp?](#-why-project-mcp)
  - [🛠️ Available Tools (47)](#️-available-tools-47)
    - [Search Tools](#search-tools)
    - [Project Management Tools](#project-management-tools)
    - [Backlog Tools](#backlog-tools)
    - [Task Management Tools](#task-management-tools)
    - [Archive Tools](#archive-tools)
    - [Decision \& Status Tools](#decision--status-tools)
    - [Quality Tools](#quality-tools)
  - [📋 Task Management System](#-task-management-system)
    - [Workflow](#workflow)
    - [Task File Format (Active Tasks)](#task-file-format-active-tasks)
    - [Agent Execution Loop](#agent-execution-loop)
    - [Key Features](#key-features)
  - [🏗️ Project Structure Guide](#️-project-structure-guide)
    - [Recommended Directory Structure](#recommended-directory-structure)
    - [What Goes Where?](#what-goes-where)
      - [`.project/` — Operational Truth](#project--operational-truth)
      - [`docs/` — Reference Truth](#docs--reference-truth)
  - [🎨 Intent Mapping](#-intent-mapping)
    - [How It Works](#how-it-works)
  - [📝 Documentation Examples](#-documentation-examples)
    - [Example: `.project/index.md` (Contract File)](#example-projectindexmd-contract-file)
    - [Example: Task Creation](#example-task-creation)
    - [Example: Getting Next Task](#example-getting-next-task)
    - [Example: Initialize Project](#example-initialize-project)
    - [Example: Import Tasks to Backlog](#example-import-tasks-to-backlog)
    - [Example: Promote Task to Active Work](#example-promote-task-to-active-work)
    - [Example: Archive Completed Task](#example-archive-completed-task)
  - [⚙️ Configuration](#️-configuration)
    - [Custom Documentation Directory](#custom-documentation-directory)
    - [Custom Working Directory](#custom-working-directory)
  - [🧪 Development](#-development)
  - [📚 Documentation](#-documentation)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

---

## 🎯 Why project-mcp?

**The Problem:** AI agents need to search project documentation, but:

- Users say "project" not ".project/"
- Different queries need different sources
- Manual source mapping is error-prone
- No standard way to organize project knowledge

**The Solution:** Intent-based search that maps language to sources
automatically:

| User Says                               | Searches                           |
| --------------------------------------- | ---------------------------------- |
| "project" / "the project"               | `.project/` + root files + `docs/` |
| "docs" / "documentation"                | Only `docs/`                       |
| "plan" / "todos" / "roadmap" / "status" | Only `.project/`                   |

---

## 🛠️ Available Tools (47)

### Search Tools

| Tool                | Description                            | Use When                                       |
| ------------------- | -------------------------------------- | ---------------------------------------------- |
| `search_project`    | Intent-based search across all sources | User says "project" or asks about status/plans |
| `search_docs`       | Search reference documentation only    | User specifically asks for "docs"              |
| `get_doc`           | Get full file content                  | You know the exact file path                   |
| `list_docs`         | List all documentation files           | Browsing available docs                        |
| `get_doc_structure` | Get directory structure                | Understanding organization                     |

### Project Management Tools

| Tool                         | Description                                    | Use When                         |
| ---------------------------- | ---------------------------------------------- | -------------------------------- |
| `init_project`               | Initialize `.project/` with all standard files | Starting a new project           |
| `manage_project_file`        | Smart create/update based on content analysis  | Auto-detect which file to update |
| `create_or_update_roadmap`   | Create or update ROADMAP.md                    | Planning milestones and phases   |
| `create_or_update_todo`      | Create or update TODO.md                       | Managing project-wide todos      |
| `create_or_update_status`    | Create or update STATUS.md                     | Tracking project health          |
| `create_or_update_index`     | Create or update index.md (contract file)      | Defining source mappings         |
| `create_or_update_decisions` | Create or update DECISIONS.md                  | Recording architecture decisions |
| `check_project_state`        | Check which project files exist                | Before making changes            |

### Documentation Tools

| Tool                      | Description                           | Use When                          |
| ------------------------- | ------------------------------------- | --------------------------------- |
| `create_doc`              | Create new doc in `docs/`             | Adding application documentation  |
| `update_doc`              | Update existing doc in `docs/`        | Modifying reference docs          |
| `add_release_note`        | Add versioned release notes           | Documenting releases              |
| `update_architecture_doc` | Create/update architecture docs       | Documenting system design         |
| `list_doc_categories`     | List documentation categories         | Understanding docs structure      |

### Backlog Tools

| Tool                  | Description                                          | Use When                        |
| --------------------- | ---------------------------------------------------- | ------------------------------- |
| `add_to_backlog`      | Add single item to BACKLOG.md                        | Quick task creation             |
| `get_backlog`         | Read backlog with filtering/sorting                  | Viewing queued work             |
| `update_backlog_item` | Update priority, title, tags, phase                  | Adjusting backlog items         |
| `remove_from_backlog` | Delete item without promoting                        | Removing cancelled work         |
| `import_tasks`        | Parse plan/roadmap and bulk add to BACKLOG.md        | Populating from roadmap         |
| `promote_task`        | Move task from BACKLOG to active work (creates YAML) | Starting work on a backlog item |

### Task Management Tools

| Tool              | Description                                   | Use When                 |
| ----------------- | --------------------------------------------- | ------------------------ |
| `create_task`     | Create active task directly (bypass backlog)  | Urgent/immediate work    |
| `get_task`        | Read specific task by ID with full details    | Viewing task details     |
| `update_task`     | Update any task field, transition status      | Modifying existing tasks |
| `delete_task`     | Permanently remove a task (with confirmation) | Removing cancelled tasks |
| `search_tasks`    | Search tasks by keyword in title/content      | Finding specific tasks   |
| `get_next_task`   | Get dependency-aware next task(s) to work on  | Determining what to do   |
| `list_tasks`      | List/filter tasks with summary dashboard      | Reviewing all tasks      |
| `sync_todo_index` | Generate TODO.md dashboard from active tasks  | Updating the overview    |

### Archive Tools

| Tool                  | Description                          | Use When                    |
| --------------------- | ------------------------------------ | --------------------------- |
| `archive_task`        | Move completed task to archive/      | Cleaning up done work       |
| `list_archived_tasks` | List tasks in archive with filtering | Reviewing completed history |
| `unarchive_task`      | Restore task from archive to active  | Reopening completed work    |

### Decision & Status Tools

| Tool                    | Description                       | Use When                         |
| ----------------------- | --------------------------------- | -------------------------------- |
| `add_decision`          | Record ADR with structured format | Documenting architecture choices |
| `get_decision`          | Read specific decision by ADR ID  | Viewing decision details         |
| `list_decisions`        | List/filter architecture ADRs     | Reviewing past decisions         |
| `update_project_status` | Quick timestamped status update   | Reporting progress               |
| `add_roadmap_milestone` | Add milestone with deliverables   | Planning future work             |
| `get_roadmap`           | Read roadmap content              | Viewing planned work             |

### Thoughts Tools

| Tool                    | Description                              | Use When                         |
| ----------------------- | ---------------------------------------- | -------------------------------- |
| `process_thoughts`      | Process brain dump files into tasks      | Converting notes to actionable tasks |
| `archive_thought`       | Archive processed thought files          | Cleaning up processed notes      |
| `list_thoughts`         | List unprocessed thought files           | Reviewing pending brain dumps    |
| `list_archived_thoughts`| List processed thought history           | Reviewing what was processed     |
| `get_thought`           | Read specific thought file               | Viewing thought content          |

### Quality Tools

| Tool                | Description                              | Use When                         |
| ------------------- | ---------------------------------------- | -------------------------------- |
| `lint_project_docs` | Validate documentation against standards | Before commits, ensuring quality |

---

## 📋 Task Management System

Tasks flow from **planning → backlog → active → archive**. Only active tasks
(10-30 items) are YAML files.

### Workflow

```
ROADMAP.md ──→ import_tasks ──→ BACKLOG.md ──→ promote_task ──→ todos/*.md ──→ archive_task ──→ archive/
  (plan)        (extract)         (queue)        (activate)      (work)        (complete)       (history)
               hundreds ok      hundreds ok     10-30 files     YAML files
```

| Stage    | Files          | Purpose                                    |
| -------- | -------------- | ------------------------------------------ |
| Planning | `ROADMAP.md`   | Phases, milestones, high-level             |
| Backlog  | `BACKLOG.md`   | Prioritized queue, hundreds of items OK    |
| Active   | `todos/*.md`   | YAML files with full metadata, 10-30 items |
| Archive  | `archive/*.md` | Completed work history                     |

### Task File Format (Active Tasks)

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

Implement OAuth 2.0 authentication flow...

## Subtasks

- [ ] Set up OAuth provider
- [ ] Implement callback handler
- [x] Configure environment variables

## Notes
```

### Agent Execution Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. promote_task(task_id: "AUTH-001")                       │
│     → Creates todos/AUTH-001.md from BACKLOG.md             │
└─────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. get_next_task()                                         │
│     → Returns AUTH-001 (dependencies met, highest priority) │
└─────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. update_task(id: "AUTH-001", status: "in_progress")      │
│     → Agent works on the task                               │
└─────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. update_task(id: "AUTH-001", status: "done")             │
└─────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. archive_task(task_id: "AUTH-001")                       │
│     → Moves to archive/, keeps todos/ small                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Backlog-first**: Plan hundreds of items in `BACKLOG.md`, promote to active
  as needed
- **Small active queue**: Only 10-30 YAML task files at a time, not hundreds
- **Stable IDs**: `{PROJECT}-{NNN}` format (e.g., `AUTH-001`, `API-042`)
- **Dependencies**: `depends_on` array - task won't appear in `get_next_task`
  until deps are done
- **Priority Sorting**: P0 (critical) → P3 (low) in all views
- **Status Workflow**: `todo` → `in_progress` → `blocked` | `review` → `done`
- **Archive history**: Completed work preserved in `archive/` for reference

---

## 🏗️ Project Structure Guide

### Recommended Directory Structure

```
my-project/
├── .project/                    # Operational truth (current state)
│   ├── index.md                 # Contract file (defines source mappings)
│   ├── BACKLOG.md               # Prioritized work queue (hundreds of items OK)
│   ├── TODO.md                  # Task dashboard (auto-generated)
│   ├── ROADMAP.md               # Project roadmap and milestones
│   ├── STATUS.md                # Current project status
│   ├── DECISIONS.md             # Architecture and design decisions
│   ├── todos/                   # Active tasks (10-30 YAML files)
│   │   ├── AUTH-001.md
│   │   └── AUTH-002.md
│   └── archive/                 # Completed tasks (history)
│       └── AUTH-000.md
│
├── docs/                        # Reference truth (long-form docs)
│   ├── README.md
│   ├── architecture/
│   └── guides/
│
├── README.md                    # Project overview
└── CONTRIBUTING.md              # Contribution guidelines
```

### What Goes Where?

#### `.project/` — Operational Truth

**Purpose:** Current state, plans, decisions, and active work.

| File           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `index.md`     | Contract file (defines how agents interpret sources) |
| `BACKLOG.md`   | Prioritized work queue (future tasks, hundreds OK)   |
| `TODO.md`      | Task dashboard (auto-generated by `sync_todo_index`) |
| `ROADMAP.md`   | Future plans, milestones, upcoming features          |
| `STATUS.md`    | Current project status, recent changes, health       |
| `DECISIONS.md` | Architecture decisions, trade-offs, rationale        |
| `todos/`       | Active task files (10-30 items, YAML frontmatter)    |
| `archive/`     | Completed tasks (history, reference)                 |

#### `docs/` — Reference Truth

**Purpose:** Long-form documentation, guides, and reference materials.

- Architecture documentation
- API references
- How-to guides
- Technical specifications

---

## 🎨 Intent Mapping

The server uses intent detection to route queries to the right sources:

```
User Query
    │
    ├─ "project" / "the project"
    │  └─→ Searches: .project/ + root files + docs/
    │
    ├─ "docs" / "documentation"
    │  └─→ Searches: docs/ only
    │
    ├─ "plan" / "todos" / "roadmap" / "status"
    │  └─→ Searches: .project/ only
    │
    └─ Default
       └─→ Searches: All sources
```

### How It Works

1. User query: "What's the project status?"
2. Intent detection: Keywords "status" → intent `plan`
3. Source mapping: `plan` → searches only `.project/`
4. Results: Returns `.project/STATUS.md`, `.project/TODO.md`, etc.

---

## 📝 Documentation Examples

### Example: `.project/index.md` (Contract File)

```markdown
# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, the canonical sources of truth are:

1. **`.project/`** — Current state, plans, todos, decisions
2. **Root markdown files** — README.md, DEVELOPMENT.md, etc.
3. **`docs/`** — Long-form reference documentation

## Principles

- **Natural language stays natural** - Users say "project" not ".project/"
- **Agents don't guess** - Explicit mappings defined here
- **Intent over structure** - Language maps to intent, not directory names
```

### Example: Task Creation

```json
{
	"tool": "create_task",
	"arguments": {
		"title": "Implement OAuth authentication",
		"project": "AUTH",
		"priority": "P0",
		"owner": "cursor",
		"description": "Add OAuth 2.0 support for Google and GitHub",
		"depends_on": ["AUTH-002"],
		"estimate": "2d",
		"tags": ["security", "feature"]
	}
}
```

### Example: Getting Next Task

```json
{
	"tool": "get_next_task",
	"arguments": {
		"owner": "cursor",
		"limit": 3
	}
}
```

Returns tasks sorted by priority where all dependencies are complete.

### Example: Initialize Project

```json
{
	"tool": "init_project",
	"arguments": {
		"project_name": "My App",
		"project_description": "A web application for task management"
	}
}
```

Creates `.project/` with all standard files: `index.md`, `TODO.md`,
`ROADMAP.md`, `STATUS.md`, `DECISIONS.md`, and `todos/` directory.

### Example: Import Tasks to Backlog

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

Parses the roadmap and adds tasks to `BACKLOG.md`. Use `dry_run: true` to
preview first.

### Example: Promote Task to Active Work

```json
{
	"tool": "promote_task",
	"arguments": {
		"task_id": "APP-001",
		"owner": "cursor",
		"estimate": "2h"
	}
}
```

Moves task from `BACKLOG.md` to `todos/APP-001.md` with full YAML frontmatter.

### Example: Archive Completed Task

```json
{
	"tool": "archive_task",
	"arguments": {
		"task_id": "APP-001"
	}
}
```

Moves completed task from `todos/` to `archive/` to keep active queue small.

---

## ⚙️ Configuration

### Custom Documentation Directory

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"env": {
				"DOCS_DIR": "/path/to/documentation"
			}
		}
	}
}
```

### Custom Working Directory

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"cwd": "/path/to/project/root"
		}
	}
}
```

---

## 🧪 Development

```bash
# Clone repository
git clone https://github.com/pouyanafisi/project-mcp.git
cd project-mcp

# Install dependencies
npm install

# Run tests
npm test

# Test the server
node src/index.js
```

---

## 📚 Documentation

- **[Examples](EXAMPLES.md)** — Usage examples and patterns
- **[Contributing](CONTRIBUTING.md)** — How to contribute
- **[Security](SECURITY.md)** — Security policy
- **[Changelog](CHANGELOG.md)** — Version history
- **[Release Notes v2.0.0](docs/releases/RELEASE_NOTES_v2.0.0.md)** — Latest
  release

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

[Get Started](#-quick-start) • [Documentation](#-documentation) •
[Examples](EXAMPLES.md) •
[Report Issue](https://github.com/pouyanafisi/project-mcp/issues)
