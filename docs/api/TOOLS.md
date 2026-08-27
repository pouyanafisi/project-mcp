# Tools Reference

> Complete reference for all project-mcp tools with parameters and examples.

## Table of Contents

- [Search Tools](#search-tools)
- [Project Management Tools](#project-management-tools)
- [Documentation Tools](#documentation-tools)
- [Task Management Tools](#task-management-tools)
- [Backlog Tools](#backlog-tools)
- [Decision & Status Tools](#decision--status-tools)
- [Thoughts Tools](#thoughts-tools)
- [Quality Tools](#quality-tools)

---

## Search Tools

### `search_project`

Intent-based search across all project sources.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `intent` | string | No | Force specific intent: `project`, `docs`, `project_docs`, `plan`, `decisions` |
| `maxResults` | number | No | Maximum results (default: 10, max: 50) |

**Example:**

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication flow",
    "intent": "project_docs",
    "maxResults": 5
  }
}
```

**Intent Mapping:**

| Intent | Searches |
|--------|----------|
| `project` | `.project/` + root + `docs/` |
| `docs` | `docs/` only |
| `project_docs` | `docs/` + DECISIONS.md |
| `plan` | `.project/` only |
| `decisions` | DECISIONS.md only |

---

### `search_docs`

Search only the `docs/` directory.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `category` | string | No | Filter by category: `architecture`, `api`, `guides`, `reference`, `releases` |
| `maxResults` | number | No | Maximum results (default: 10) |

**Example:**

```json
{
  "tool": "search_docs",
  "arguments": {
    "query": "rate limiting",
    "category": "api"
  }
}
```

---

### `get_doc`

Read full content of a specific file.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path (relative to project root) |

**Example:**

```json
{
  "tool": "get_doc",
  "arguments": {
    "path": "docs/api/TOOLS.md"
  }
}
```

---

### `list_docs`

List all available documentation files.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |

**Example:**

```json
{
  "tool": "list_docs",
  "arguments": {
    "category": "architecture"
  }
}
```

---

### `get_doc_structure`

Get the complete documentation directory structure.

**Parameters:** None

**Example:**

```json
{
  "tool": "get_doc_structure",
  "arguments": {}
}
```

---

## Project Management Tools

### `manage_project_file`

Smart tool that auto-detects which `.project/` file to update.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | `planning`, `task`, `status_change`, `decision`, `contract`, `auto` |
| `content` | string | Yes | Content to add |
| `fileType` | string | No | Force: `roadmap`, `todo`, `status`, `index`, `decisions` |

**Example:**

```json
{
  "tool": "manage_project_file",
  "arguments": {
    "action": "auto",
    "content": "Completed OAuth integration with Google and GitHub"
  }
}
```

---

### `check_project_state`

Check which project management files exist.

**Parameters:** None

**Returns:** Status of each file (index.md, ROADMAP.md, TODO.md, STATUS.md, DECISIONS.md)

---

### `create_or_update_roadmap`

Manage `.project/ROADMAP.md`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Roadmap content |
| `section` | string | No | Section to add to (e.g., "Q1 2025") |
| `replace` | boolean | No | Replace entire file (default: false) |

---

### `create_or_update_todo`

Manage `.project/TODO.md`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Todo content |
| `section` | string | No | `in_progress`, `next_up`, `blocked`, `completed` |
| `markComplete` | string | No | Task to mark as complete |
| `replace` | boolean | No | Replace entire file |

---

### `create_or_update_status`

Manage `.project/STATUS.md`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Status content |
| `updateType` | string | No | `phase`, `health`, `changes`, `metrics`, `risks`, `milestone`, `general` |
| `replace` | boolean | No | Replace entire file |

---

### `create_or_update_index`

Manage `.project/index.md` (contract file).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Contract content |
| `replace` | boolean | No | Replace entire file |

---

### `create_or_update_decisions`

Manage `.project/DECISIONS.md`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Decision content |
| `decisionTitle` | string | No | Title for the entry |
| `replace` | boolean | No | Replace entire file |

---

### `init_project`

Initialize `.project/` directory with all standard files.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_name` | string | No | Project name |
| `project_description` | string | No | Project description |

---

## Documentation Tools

### `create_doc`

Create new documentation in `docs/` directory.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path within docs/ (e.g., "guides/SETUP.md") |
| `title` | string | Yes | Document title |
| `content` | string | Yes | Markdown content |
| `category` | string | No | `architecture`, `api`, `guides`, `reference`, `operations`, `releases` |
| `description` | string | No | Brief description |

**Example:**

```json
{
  "tool": "create_doc",
  "arguments": {
    "path": "guides/AUTHENTICATION.md",
    "title": "Authentication Guide",
    "content": "## Overview\n\nThis guide covers...",
    "category": "guides"
  }
}
```

---

### `update_doc`

Update existing documentation in `docs/`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to document |
| `content` | string | Yes | New content |
| `mode` | string | No | `append`, `prepend`, `replace`, `section` (default: append) |
| `section` | string | No | Section heading when mode is "section" |

**Example:**

```json
{
  "tool": "update_doc",
  "arguments": {
    "path": "api/TOOLS.md",
    "content": "### new_tool\n\nDescription...",
    "mode": "section",
    "section": "## Search Tools"
  }
}
```

---

### `add_release_note`

Add versioned release notes.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `version` | string | Yes | Version number (e.g., "1.2.0") |
| `title` | string | No | Release title |
| `summary` | string | No | Release summary |
| `features` | array | No | New features list |
| `fixes` | array | No | Bug fixes list |
| `breaking_changes` | array | No | Breaking changes list |
| `deprecations` | array | No | Deprecations list |

**Example:**

```json
{
  "tool": "add_release_note",
  "arguments": {
    "version": "2.1.0",
    "title": "Documentation Update",
    "features": [
      "New docs.js tools for documentation management",
      "Best-in-class docs directory structure"
    ],
    "fixes": [
      "Fixed intent detection for project_docs queries"
    ]
  }
}
```

---

### `update_architecture_doc`

Create or update architecture documentation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic` | string | Yes | Topic name (becomes filename) |
| `title` | string | No | Document title |
| `content` | string | Yes | Architecture content |
| `diagrams` | array | No | Mermaid diagram strings |
| `replace` | boolean | No | Replace existing (default: false) |

---

### `list_doc_categories`

List documentation categories in `docs/`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |

---

## Task Management Tools

### `create_task`

Create new active task (YAML file in `todos/`).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `project` | string | No | Project code (e.g., "AUTH") |
| `priority` | string | No | `P0`, `P1`, `P2`, `P3` (default: P2) |
| `status` | string | No | `todo`, `in_progress`, `blocked`, `review`, `done` |
| `owner` | string | No | Task owner |
| `description` | string | No | Detailed description |
| `depends_on` | array | No | Task IDs this depends on |
| `tags` | array | No | Tags for categorization |
| `estimate` | string | No | Time estimate (e.g., "2h", "1d") |
| `due` | string | No | Due date (YYYY-MM-DD) |

**Example:**

```json
{
  "tool": "create_task",
  "arguments": {
    "title": "Implement OAuth",
    "project": "AUTH",
    "priority": "P0",
    "owner": "cursor",
    "depends_on": ["AUTH-002"],
    "estimate": "4h"
  }
}
```

---

### `get_task`

Read specific task by ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Task ID (e.g., "AUTH-001") |

---

### `update_task`

Update task fields.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Task ID |
| `title` | string | No | New title |
| `status` | string | No | New status |
| `priority` | string | No | New priority |
| `owner` | string | No | New owner |
| `description` | string | No | New description |
| `depends_on` | array | No | New dependencies |
| `tags` | array | No | New tags |
| `subtasks` | string | No | New subtasks content |

---

### `delete_task`

Permanently remove a task.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Task ID |
| `confirm` | boolean | Yes | Must be true |

---

### `list_tasks`

List tasks with filtering.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status |
| `priority` | string | No | Filter by priority |
| `owner` | string | No | Filter by owner |
| `project` | string | No | Filter by project |
| `tag` | string | No | Filter by tag |

---

### `search_tasks`

Search tasks by keyword.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `include_archived` | boolean | No | Include archived tasks |

---

### `get_next_task`

Get dependency-aware next task(s).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | No | Filter by owner |
| `project` | string | No | Filter by project |
| `limit` | number | No | Number of tasks (default: 1) |

**Returns:** Tasks with all dependencies complete, sorted by priority.

---

### `archive_task`

Move completed task to archive.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |

---

### `unarchive_task`

Restore task from archive.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task ID |

---

### `list_archived_tasks`

List archived tasks.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | No | Filter by project |
| `limit` | number | No | Maximum results |

---

### `sync_todo_index`

Regenerate TODO.md dashboard from active tasks.

**Parameters:** None

---

## Backlog Tools

### `add_to_backlog`

Add item to BACKLOG.md.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `project` | string | No | Project code |
| `priority` | string | No | Priority level |
| `phase` | string | No | Phase/milestone |
| `tags` | array | No | Tags |

---

### `get_backlog`

Read backlog with filtering.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `priority` | string | No | Filter by priority |
| `phase` | string | No | Filter by phase |
| `project` | string | No | Filter by project |

---

### `update_backlog_item`

Update backlog item.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Item ID |
| `title` | string | No | New title |
| `priority` | string | No | New priority |
| `phase` | string | No | New phase |
| `tags` | array | No | New tags |

---

### `remove_from_backlog`

Delete backlog item.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Item ID |

---

### `import_tasks`

Bulk import tasks from document.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | string | Yes | Source file path |
| `project` | string | No | Project code for imported tasks |
| `dry_run` | boolean | No | Preview without importing |

---

### `promote_task`

Move backlog item to active task.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Backlog item ID |
| `owner` | string | No | Assign owner |
| `estimate` | string | No | Time estimate |

---

## Decision & Status Tools

### `add_decision`

Record Architecture Decision Record.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Decision title |
| `decision` | string | Yes | The decision made |
| `context` | string | No | Problem context |
| `consequences` | string | No | Positive/negative consequences |
| `status` | string | No | `proposed`, `accepted`, `deprecated`, `superseded` |
| `tags` | array | No | Tags for categorization |

---

### `get_decision`

Read specific ADR.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ADR ID (e.g., "ADR-001", "1") |

---

### `list_decisions`

List all ADRs.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status |
| `tag` | string | No | Filter by tag |

---

### `update_project_status`

Quick timestamped status update.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | Yes | Status summary |
| `health` | string | No | `green`, `yellow`, `red` |
| `changes` | array | No | Recent changes |
| `blockers` | array | No | Current blockers |
| `next_milestone` | string | No | Next milestone |

---

### `add_roadmap_milestone`

Add milestone to roadmap.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Milestone title |
| `description` | string | No | Description |
| `target_date` | string | No | Target date |
| `deliverables` | array | No | Deliverables list |
| `status` | string | No | `planned`, `in_progress`, `completed`, `delayed` |

---

### `get_roadmap`

Read roadmap content.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | string | No | Specific section |

---

## Thoughts Tools

Tools for processing brain dumps and unstructured notes into tasks.

### `process_thoughts`

Reads brain dump markdown files from `.project/thoughts/todos/` and returns content with project context for analysis.

**Parameters:**

| Parameter | Type   | Required | Description                                             |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `file`    | string | No       | Specific thought file to process (e.g., "my-ideas.md")  |
| `project` | string | Yes      | Project prefix for task IDs (e.g., "AUTH", "API")       |

**Returns:** Raw thought content plus project context (existing tasks, roadmap, decisions) for LLM analysis.

**Example:**

```json
{
	"tool": "process_thoughts",
	"arguments": {
		"project": "APP",
		"file": "feature-ideas.md"
	}
}
```

---

### `archive_thought`

Archives a processed thought file by moving it to `.project/thoughts/todos/.archive/`.

**Parameters:**

| Parameter       | Type   | Required | Description                                            |
| --------------- | ------ | -------- | ------------------------------------------------------ |
| `file`          | string | Yes      | The thought file to archive (e.g., "my-ideas.md")      |
| `created_tasks` | array  | No       | Array of task IDs created from this thought            |
| `notes`         | string | No       | Notes about the processing                             |

**Example:**

```json
{
	"tool": "archive_thought",
	"arguments": {
		"file": "feature-ideas.md",
		"created_tasks": ["APP-001", "APP-002"],
		"notes": "Consolidated 5 items into 2 tasks"
	}
}
```

---

### `list_thoughts`

Lists all thought files in the `.project/thoughts/` directory structure.

**Parameters:**

| Parameter          | Type    | Required | Description                              |
| ------------------ | ------- | -------- | ---------------------------------------- |
| `category`         | string  | No       | Filter by category (currently: "todos")  |
| `include_archived` | boolean | No       | Include archived thoughts (default: false) |

---

### `list_archived_thoughts`

Lists all archived thought files with their processing history.

**Parameters:**

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `limit`   | number | No       | Max number to show (default: 20)         |

---

### `get_thought`

Reads a specific thought file and returns its raw content.

**Parameters:**

| Parameter      | Type    | Required | Description                                  |
| -------------- | ------- | -------- | -------------------------------------------- |
| `file`         | string  | Yes      | The thought file to read (e.g., "ideas.md")  |
| `category`     | string  | No       | The category/subdirectory (default: "todos") |
| `from_archive` | boolean | No       | Read from archive (default: false)           |

---

## Quality Tools

### `lint_project_docs`

Validate documentation against standards.

**Parameters:**

| Parameter | Type    | Required | Description                      |
| --------- | ------- | -------- | -------------------------------- |
| `fix`     | boolean | No       | Auto-fix issues where possible   |
| `verbose` | boolean | No       | Show detailed output             |

**Returns:** List of issues found with severity and recommendations.

---

## Related Documentation

- [Prompts Reference](./PROMPTS.md) — Prompt templates
- [Search API](./SEARCH.md) — Intent detection details
- [Architecture](../architecture/) — System design

---

*Last Updated: January 2026*

