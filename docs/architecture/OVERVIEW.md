# Architecture Overview

> High-level system design and philosophy of project-mcp.

## Introduction

project-mcp is an MCP (Model Context Protocol) server that provides AI agents with intelligent access to project documentation. Unlike simple file servers, it understands **intent** — when a user says "project", it knows to search operational files, root documentation, and reference docs in the right order.

## Design Philosophy

### 1. Intent-Based Access

Users think in terms of what they want ("show me the project status") not where it is ("read .project/STATUS.md"). The system bridges this gap:

```
User Intent          →  System Action
─────────────────────────────────────────
"project status"     →  Search .project/STATUS.md
"documentation"      →  Search docs/
"architecture"       →  Search docs/architecture/
"todos"              →  Search .project/todos/
```

### 2. Two Documentation Worlds

| Aspect | `.project/` (Operational) | `docs/` (Reference) |
|--------|---------------------------|---------------------|
| **Purpose** | Track work progress | Explain the system |
| **Audience** | Active developers | All users |
| **Lifespan** | Current sprint/phase | Long-term |
| **Updates** | Frequent (daily) | Occasional |
| **Examples** | STATUS.md, todos/ | API docs, guides |

### 3. Backlog-First Workflow

Rather than cluttering the active work queue with hundreds of tasks:

```
ROADMAP.md ──→ BACKLOG.md ──→ todos/*.md ──→ archive/
  (plan)        (queue)        (active)       (done)
 hundreds      hundreds       10-30 files     history
```

## System Components

### Core Server (`src/server.js`)

The MCP server implementation that handles:
- Tool registration and execution
- Prompt handling
- Resource serving
- Request/response lifecycle

### Tool Modules (`src/tools/`)

Modular tool implementations:

| Module | Responsibility |
|--------|---------------|
| `search.js` | Intent detection and search |
| `project-files.js` | `.project/` management |
| `docs.js` | `docs/` management |
| `tasks.js` | Task lifecycle |
| `backlog.js` | Backlog management |
| `thoughts.js` | Thought capture |
| `lint.js` | Documentation validation |

### Library Modules (`src/lib/`)

Shared utilities:

| Module | Responsibility |
|--------|---------------|
| `constants.js` | Paths, mappings, configuration |
| `files.js` | File system operations |
| `search.js` | Search indexing (Fuse.js) |
| `dates.js` | Date formatting |
| `tasks.js` | Task parsing and formatting |

## Data Flow

### Query Flow

```
1. User Query: "What's the project status?"
           │
           ▼
2. Intent Detection: Keywords "status" → intent "plan"
           │
           ▼
3. Source Mapping: "plan" → [".project/"]
           │
           ▼
4. Search Execution: Fuse.js fuzzy search in .project/
           │
           ▼
5. Result Formatting: Markdown with snippets, paths
           │
           ▼
6. Response: STATUS.md, TODO.md relevant sections
```

### Task Flow

```
1. Planning
   └─ ROADMAP.md defines milestones

2. Import
   └─ import_tasks extracts tasks → BACKLOG.md

3. Promotion
   └─ promote_task moves item → todos/TASK-001.md

4. Execution
   └─ update_task tracks progress

5. Completion
   └─ archive_task moves → archive/TASK-001.md
```

## Extension Points

### Adding New Tools

1. Create module in `src/tools/`
2. Export `definitions` (tool schemas) and `handlers` (implementations)
3. Import and add to `src/tools/index.js`

### Adding New Intent Types

1. Add to `INTENT_SOURCES` in `src/lib/constants.js`
2. Update `detectIntent()` in `src/lib/search.js`

### Custom Documentation Paths

Set environment variables:
- `DOCS_DIR` — Custom docs directory
- `cwd` in MCP config — Custom project root

## Related Documentation

- [Components](./COMPONENTS.md) — Detailed component breakdown
- [Data Flow](./DATA_FLOW.md) — Detailed flow diagrams
- [API Reference](../api/) — Tool specifications

---

*Last Updated: January 2026*

