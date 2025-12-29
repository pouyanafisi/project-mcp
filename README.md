# project-mcp

> **Intent-based MCP server for project documentation** — Maps natural language to the right sources automatically

[![npm version](https://img.shields.io/npm/v/project-mcp.svg)](https://www.npmjs.com/package/project-mcp)
[![Node.js](https://img.shields.io/node/v/project-mcp.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

When users say "project", "docs", or "todos", `project-mcp` automatically searches the right directories—no configuration needed. It understands intent, not just directory names.

---

## Table of Contents

- [project-mcp](#project-mcp)
	- [Table of Contents](#table-of-contents)
	- [⚡ Quick Start](#-quick-start)
		- [Install](#install)
		- [Configure](#configure)
	- [🎯 Why project-mcp?](#-why-project-mcp)
	- [🛠️ Available Tools](#️-available-tools)
		- [Search Tools](#search-tools)
		- [Project Management Tools](#project-management-tools)
		- [Task Management Tools](#task-management-tools)
		- [Quality Tools](#quality-tools)
	- [📋 Task Management System](#-task-management-system)
		- [Task File Format](#task-file-format)
		- [Task Workflow](#task-workflow)
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
	- [⚙️ Configuration](#️-configuration)
		- [Custom Documentation Directory](#custom-documentation-directory)
		- [Custom Working Directory](#custom-working-directory)
	- [🧪 Development](#-development)
	- [📚 Documentation](#-documentation)
	- [🤝 Contributing](#-contributing)
	- [📄 License](#-license)

---

## ⚡ Quick Start

### Install

```bash
npm install project-mcp
```

### Configure

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

## 🎯 Why project-mcp?

**The Problem:** AI agents need to search project documentation, but:

- Users say "project" not ".project/"
- Different queries need different sources
- Manual source mapping is error-prone
- No standard way to organize project knowledge

**The Solution:** Intent-based search that maps language to sources automatically:

| User Says                               | Searches                           |
| --------------------------------------- | ---------------------------------- |
| "project" / "the project"               | `.project/` + root files + `docs/` |
| "docs" / "documentation"                | Only `docs/`                       |
| "plan" / "todos" / "roadmap" / "status" | Only `.project/`                   |

---

## 🛠️ Available Tools

### Search Tools

| Tool                | Description                            | Use When                                       |
| ------------------- | -------------------------------------- | ---------------------------------------------- |
| `search_project`    | Intent-based search across all sources | User says "project" or asks about status/plans |
| `search_docs`       | Search reference documentation only    | User specifically asks for "docs"              |
| `get_doc`           | Get full file content                  | You know the exact file path                   |
| `list_docs`         | List all documentation files           | Browsing available docs                        |
| `get_doc_structure` | Get directory structure                | Understanding organization                     |

### Project Management Tools

| Tool                       | Description                                    | Use When                          |
| -------------------------- | ---------------------------------------------- | --------------------------------- |
| `manage_project_file`      | Smart create/update based on content analysis  | Auto-detect which file to update  |
| `create_or_update_roadmap` | Create or update ROADMAP.md                    | Planning milestones and phases    |
| `create_or_update_todo`    | Create or update TODO.md                       | Managing project-wide todos       |
| `create_or_update_status`  | Create or update STATUS.md                     | Tracking project health           |
| `create_or_update_index`   | Create or update index.md (contract file)      | Defining source mappings          |
| `create_or_update_decisions` | Create or update DECISIONS.md                | Recording architecture decisions  |
| `check_project_state`      | Check which project files exist                | Before making changes             |

### Task Management Tools

| Tool              | Description                                         | Use When                          |
| ----------------- | --------------------------------------------------- | --------------------------------- |
| `create_task`     | Create task with YAML frontmatter and Jira-like ID  | Starting new work                 |
| `update_task`     | Update any task field, transition status            | Modifying existing tasks          |
| `get_next_task`   | Get dependency-aware next task(s) to work on        | Determining what to do next       |
| `list_tasks`      | List/filter tasks with summary dashboard            | Reviewing all tasks               |
| `sync_todo_index` | Generate TODO.md dashboard from all tasks           | Updating the overview             |

### Quality Tools

| Tool               | Description                                      | Use When                          |
| ------------------ | ------------------------------------------------ | --------------------------------- |
| `lint_project_docs` | Validate documentation against standards        | Before commits, ensuring quality  |

---

## 📋 Task Management System

Tasks are stored with YAML frontmatter for structured metadata. Uses Jira-like IDs for stable references.

### Task File Format

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

### Task Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Agent calls get_next_task                                  │
│  → Returns AUTH-001 (dependencies met, highest priority)    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent calls update_task(id: "AUTH-001", status: "in_progress") │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent does the work                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent calls update_task(id: "AUTH-001", status: "done")    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent calls get_next_task                                  │
│  → Now AUTH-004 is available (was depending on AUTH-001)    │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Stable IDs**: `{PROJECT}-{NNN}` format (e.g., `AUTH-001`, `API-042`)
- **Dependencies**: `depends_on` array - task won't appear in `get_next_task` until deps are done
- **Priority Sorting**: P0 (critical) → P3 (low) in all views
- **Status Workflow**: `todo` → `in_progress` → `blocked` | `review` → `done`
- **Subtask Checklists**: Track granular progress within tasks
- **Estimates & Due Dates**: For planning

---

## 🏗️ Project Structure Guide

### Recommended Directory Structure

```
my-project/
├── .project/                    # Operational truth (current state)
│   ├── index.md                 # Contract file (defines source mappings)
│   ├── TODO.md                  # Task dashboard (auto-generated)
│   ├── ROADMAP.md               # Project roadmap and milestones
│   ├── STATUS.md                # Current project status
│   ├── DECISIONS.md             # Architecture and design decisions
│   └── todos/                   # Individual task files
│       ├── AUTH-001.md
│       ├── AUTH-002.md
│       └── API-001.md
│
├── docs/                        # Reference truth (long-form docs)
│   ├── README.md
│   ├── architecture/
│   ├── api/
│   └── guides/
│
├── README.md                    # Project overview
└── CONTRIBUTING.md              # Contribution guidelines
```

### What Goes Where?

#### `.project/` — Operational Truth

**Purpose:** Current state, plans, decisions, and active work.

| File          | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `index.md`    | Contract file (defines how agents interpret sources) |
| `TODO.md`     | Task dashboard (auto-generated by `sync_todo_index`) |
| `ROADMAP.md`  | Future plans, milestones, upcoming features    |
| `STATUS.md`   | Current project status, recent changes, health |
| `DECISIONS.md`| Architecture decisions, trade-offs, rationale  |
| `todos/`      | Individual task files with YAML frontmatter    |

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
node index.js
```

---

## 📚 Documentation

- **[Examples](EXAMPLES.md)** — Usage examples and patterns
- **[Contributing](CONTRIBUTING.md)** — How to contribute
- **[Security](SECURITY.md)** — Security policy
- **[Changelog](CHANGELOG.md)** — Version history
- **[Release Notes v1.1.0](RELEASE_NOTES_v1.1.0.md)** — Latest release

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

[Get Started](#-quick-start) • [Documentation](#-documentation) • [Examples](EXAMPLES.md) • [Report Issue](https://github.com/pouyanafisi/project-mcp/issues)
