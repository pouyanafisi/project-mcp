# Prompts Reference

> Interactive prompt templates for common workflows in project-mcp.

## Overview

Prompts provide guided interactions for common tasks. They combine context-gathering with tool suggestions to create complete workflows.

## Available Prompts

| Prompt                                        | Description                          |
| --------------------------------------------- | ------------------------------------ |
| [`project_overview`](#project_overview)       | Get complete project overview        |
| [`get_next_task`](#get_next_task)             | Find next task to work on            |
| [`init_project`](#init_project)               | Initialize project structure         |
| [`import_tasks`](#import_tasks)               | Import tasks from roadmap to backlog |
| [`promote_task`](#promote_task)               | Move task from backlog to active     |
| [`lint_project`](#lint_project)               | Validate project documentation       |
| [`list_tasks`](#list_tasks)                   | Show all tasks with status           |
| [`update_task`](#update_task)                 | Update task status                   |
| [`add_to_backlog`](#add_to_backlog)           | Add item to backlog                  |
| [`get_backlog`](#get_backlog)                 | View current backlog                 |
| [`add_decision`](#add_decision)               | Record architecture decision         |
| [`update_status`](#update_status)             | Update project status                |
| [`update_project_docs`](#update_project_docs) | Update application documentation     |

---

## Prompt Details

### `project_overview`

Get an overview of the project, its status, and what work is in progress.

**When to use:** User asks "tell me about this project", "what is this project", "project status", or "what's going on".

**Arguments:** None

**Example:**

```json
{
	"prompt": "project_overview",
	"arguments": {}
}
```

**Uses Tools:**

- `check_project_state`
- `search_project`
- `list_tasks`
- `get_backlog`

---

### `get_next_task`

Find the next task to work on based on priorities and dependencies.

**When to use:** User asks "what should I do", "what's next", "what to work on", or "next task".

**Arguments:**

| Argument | Type   | Required | Description              |
| -------- | ------ | -------- | ------------------------ |
| `owner`  | string | No       | Filter by owner/assignee |

**Example:**

```json
{
	"prompt": "get_next_task",
	"arguments": {
		"owner": "cursor"
	}
}
```

**Uses Tools:**

- `get_next_task`

---

### `init_project`

Initialize a new project with standard documentation structure.

**When to use:** User says "start a project", "new project", "initialize project", or "set up project docs".

**Arguments:**

| Argument       | Type   | Required | Description               |
| -------------- | ------ | -------- | ------------------------- |
| `project_name` | string | Yes      | Name of the project       |
| `description`  | string | No       | Brief project description |

**Example:**

```json
{
	"prompt": "init_project",
	"arguments": {
		"project_name": "My App",
		"description": "A web application for task management"
	}
}
```

**Uses Tools:**

- `init_project`

---

### `import_tasks`

Import tasks from a roadmap or plan document into BACKLOG.md.

**When to use:** User says "import tasks", "add tasks from roadmap", "populate backlog", or "convert plan to tasks".

**Arguments:**

| Argument         | Type   | Required | Description                                   |
| ---------------- | ------ | -------- | --------------------------------------------- |
| `source_file`    | string | Yes      | Path to the source file (e.g., ROADMAP.md)    |
| `project_prefix` | string | Yes      | Project prefix for task IDs (e.g., AUTH, API) |

**Example:**

```json
{
	"prompt": "import_tasks",
	"arguments": {
		"source_file": ".project/ROADMAP.md",
		"project_prefix": "APP"
	}
}
```

**Uses Tools:**

- `import_tasks`

---

### `promote_task`

Promote a task from backlog to active work.

**When to use:** User says "start task", "work on X", "begin task", or "activate task".

**Arguments:**

| Argument  | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `task_id` | string | Yes      | The task ID to start (e.g., AUTH-001) |

**Example:**

```json
{
	"prompt": "promote_task",
	"arguments": {
		"task_id": "AUTH-001"
	}
}
```

**Uses Tools:**

- `promote_task`
- `update_task`

---

### `lint_project`

Validate project documentation and check for issues.

**When to use:** User says "lint project", "check project files", "validate docs", or "project health check".

**Arguments:**

| Argument     | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| `fix_issues` | string | No       | Whether to auto-fix issues (true/false) |

**Example:**

```json
{
	"prompt": "lint_project",
	"arguments": {
		"fix_issues": "false"
	}
}
```

**Uses Tools:**

- `lint_project_docs`

---

### `list_tasks`

Show all tasks with their status.

**When to use:** User asks "show tasks", "list todos", "what tasks exist", or "task list".

**Arguments:**

| Argument        | Type   | Required | Description                                         |
| --------------- | ------ | -------- | --------------------------------------------------- |
| `status_filter` | string | No       | Filter by status (todo, in_progress, blocked, done) |

**Example:**

```json
{
	"prompt": "list_tasks",
	"arguments": {
		"status_filter": "in_progress"
	}
}
```

**Uses Tools:**

- `list_tasks`

---

### `update_task`

Update the status of a task.

**When to use:** User says "mark task done", "complete task", "task is blocked", or "start task".

**Arguments:**

| Argument     | Type   | Required | Description                                           |
| ------------ | ------ | -------- | ----------------------------------------------------- |
| `task_id`    | string | Yes      | The task ID to update                                 |
| `new_status` | string | Yes      | New status (todo, in_progress, blocked, review, done) |

**Example:**

```json
{
	"prompt": "update_task",
	"arguments": {
		"task_id": "AUTH-001",
		"new_status": "done"
	}
}
```

**Uses Tools:**

- `update_task`

---

### `add_to_backlog`

Add a single item to the backlog.

**When to use:** User says "add to backlog", "queue this task", "backlog item", or "add future task".

**Arguments:**

| Argument   | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `title`    | string | Yes      | Title/description of the backlog item |
| `project`  | string | Yes      | Project prefix (e.g., AUTH, API)      |
| `priority` | string | No       | Priority level (P0, P1, P2, P3)       |

**Example:**

```json
{
	"prompt": "add_to_backlog",
	"arguments": {
		"title": "Implement OAuth login",
		"project": "AUTH",
		"priority": "P1"
	}
}
```

**Uses Tools:**

- `add_to_backlog`

---

### `get_backlog`

View the current backlog.

**When to use:** User asks "show backlog", "what's in the queue", "backlog items", or "pending tasks".

**Arguments:**

| Argument   | Type   | Required | Description                         |
| ---------- | ------ | -------- | ----------------------------------- |
| `priority` | string | No       | Filter by priority (P0, P1, P2, P3) |

**Example:**

```json
{
	"prompt": "get_backlog",
	"arguments": {
		"priority": "P0"
	}
}
```

**Uses Tools:**

- `get_backlog`

---

### `add_decision`

Record an architecture decision.

**When to use:** User says "record decision", "document decision", "ADR", or "architecture decision".

**Arguments:**

| Argument   | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `title`    | string | Yes      | Title of the decision      |
| `decision` | string | Yes      | The decision that was made |

**Example:**

```json
{
	"prompt": "add_decision",
	"arguments": {
		"title": "Use PostgreSQL for primary database",
		"decision": "We will use PostgreSQL for all user data storage"
	}
}
```

**Uses Tools:**

- `add_decision`

---

### `update_status`

Update project status.

**When to use:** User says "update status", "project status", "status update", or "how's the project".

**Arguments:**

| Argument | Type   | Required | Description                         |
| -------- | ------ | -------- | ----------------------------------- |
| `status` | string | Yes      | Current status summary              |
| `health` | string | No       | Project health (green, yellow, red) |

**Example:**

```json
{
	"prompt": "update_status",
	"arguments": {
		"status": "Completed OAuth integration",
		"health": "green"
	}
}
```

**Uses Tools:**

- `update_project_status`

---

### `update_project_docs`

Update project documentation - the APPLICATION documentation that explains how the system works.

**When to use:** User says "update project docs", "update project documents", "update project documentation", "update application docs", or "document this".

**Note:** This is DIFFERENT from project management (status, todos, roadmap) - this updates the `docs/` folder and DECISIONS.md which contain reference documentation about the application itself.

**Arguments:**

| Argument   | Type   | Required | Description                                                                |
| ---------- | ------ | -------- | -------------------------------------------------------------------------- |
| `content`  | string | Yes      | What to document or update                                                 |
| `doc_type` | string | No       | Hint: "decision", "release", "guide", "api", or "auto" to let model decide |

**Example:**

```json
{
	"prompt": "update_project_docs",
	"arguments": {
		"content": "Document the new OAuth authentication flow",
		"doc_type": "guide"
	}
}
```

**Uses Tools:**

- `search_project`
- `get_doc`
- `add_decision`
- `list_docs`

---

## Prompt-Tool Mapping

Each prompt uses specific tools:

| Prompt                | Tools Used                                                           |
| --------------------- | -------------------------------------------------------------------- |
| `project_overview`    | `check_project_state`, `search_project`, `list_tasks`, `get_backlog` |
| `get_next_task`       | `get_next_task`                                                      |
| `init_project`        | `init_project`                                                       |
| `import_tasks`        | `import_tasks`                                                       |
| `promote_task`        | `promote_task`, `update_task`                                        |
| `lint_project`        | `lint_project_docs`                                                  |
| `list_tasks`          | `list_tasks`                                                         |
| `update_task`         | `update_task`                                                        |
| `add_to_backlog`      | `add_to_backlog`                                                     |
| `get_backlog`         | `get_backlog`                                                        |
| `add_decision`        | `add_decision`                                                       |
| `update_status`       | `update_project_status`                                              |
| `update_project_docs` | `search_project`, `get_doc`, `add_decision`, `list_docs`             |

---

## Related Documentation

- [Tools Reference](./TOOLS.md) — Complete tool specifications
- [Guides](../guides/) — Step-by-step tutorials

---

_Last Updated: January 2026_
