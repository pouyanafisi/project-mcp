# Release v1.2.0 - Project Initialization & Task Import

**Release Date:** December 29, 2024

> **Note:** See [RELEASE_NOTES_v1.3.0.md](RELEASE_NOTES_v1.3.0.md) for the
> latest release.

## Overview

This release adds tools for bootstrapping new projects with standard file
structures and importing tasks from existing plan documents. These tools ensure
consistent project setup and enable bulk task creation from roadmaps.

## New Features

### `init_project` Tool

Initializes the `.project/` directory with all standard files following strict
templates:

```json
{
	"tool": "init_project",
	"arguments": {
		"project_name": "My App",
		"project_description": "A web application for task management"
	}
}
```

**Creates:**

- `index.md` — Contract file with source mappings
- `TODO.md` — Task dashboard (ready for `sync_todo_index`)
- `ROADMAP.md` — Project phases and milestones template
- `STATUS.md` — Project health tracking template
- `DECISIONS.md` — Architecture Decision Records (ADR) template
- `todos/` — Directory for individual task files

**Features:**

- All files follow consistent standards
- YAML frontmatter with proper metadata
- Placeholder content for easy customization
- Skip existing files by default (`overwrite: false`)

### `import_tasks` Tool

Parses a plan document (ROADMAP.md, requirements doc, or structured text) and
generates YAML task files:

```json
{
	"tool": "import_tasks",
	"arguments": {
		"source": ".project/ROADMAP.md",
		"project": "APP",
		"default_owner": "cursor",
		"default_priority": "P2",
		"dry_run": true
	}
}
```

**Features:**

- Parses markdown lists (`- [ ]` items and `- ` items)
- Extracts phase/section context from headers
- Infers priority from keywords (critical, high, medium, low)
- Assigns sequential Jira-like IDs (APP-001, APP-002, ...)
- Infers dependencies from document structure
- Extracts tags from `[brackets]` in titles
- Dry-run mode to preview before creating files

**Supported Source Formats:**

- Markdown files with task lists
- ROADMAP.md with phases and milestones
- Requirements documents with bullet points
- Raw markdown content (via `source_type: "content"`)

## File Templates

### index.md (Contract File)

```yaml
---
title: Project Name - Project Index
created: 2024-12-29
updated: 2024-12-29
---
```

Includes:

- AI agent contract with source mappings
- Intent-to-source routing documentation
- File structure reference
- Core principles

### ROADMAP.md

Template with:

- Phase structure (Foundation, Core Features, Polish)
- Milestone tracking table
- Future considerations section

### STATUS.md

Template with:

- Current phase indicator
- Health status (🟢 🟡 🔴)
- Progress table by area
- Recent changes log
- Blockers section

### DECISIONS.md

Architecture Decision Record format:

- ADR template with Context, Decision, Consequences
- Example decision pre-filled
- Consistent formatting

## Usage Workflow

### Starting a New Project

```
1. init_project(project_name: "My App")
   → Creates .project/ with all standard files

2. Edit .project/ROADMAP.md with your phases and tasks

3. import_tasks(source: ".project/ROADMAP.md", project: "APP", dry_run: true)
   → Preview tasks to be created

4. import_tasks(source: ".project/ROADMAP.md", project: "APP")
   → Create YAML task files

5. sync_todo_index()
   → Generate TODO.md dashboard

6. lint_project_docs()
   → Validate all files conform to standards
```

### Converting Existing Plans

```
1. import_tasks(source: "my-plan.md", project: "PROJ", dry_run: true)
   → See what tasks would be extracted

2. import_tasks(source: "my-plan.md", project: "PROJ")
   → Create task files

3. get_next_task()
   → Start working on dependency-ready tasks
```

## Breaking Changes

None. Fully backward compatible with v1.1.0.

## Full Changelog

### Added

- `init_project` tool for bootstrapping `.project/` directory
- `import_tasks` tool for parsing plans and generating YAML tasks
- Standard templates for all project files
- Dry-run mode for task import preview
- Priority inference from keywords
- Dependency inference from document structure
- Tag extraction from bracket notation

### Changed

- README updated with new tool documentation
- Added examples for `init_project` and `import_tasks`

---

**Full Documentation:** [README.md](README.md)
