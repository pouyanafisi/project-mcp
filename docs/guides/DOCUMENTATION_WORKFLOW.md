# Documentation Workflow

> Managing project documentation with project-mcp.

## Overview

project-mcp manages two types of documentation:

| Type            | Location    | Purpose             | Tools                                         |
| --------------- | ----------- | ------------------- | --------------------------------------------- |
| **Operational** | `.project/` | Track work progress | `update_project_status`, `add_decision`, etc. |
| **Reference**   | `docs/`     | Explain the system  | `create_doc`, `update_doc`, etc.              |

---

## When to Use Which

### Use .project/ (Operational) When:

- Recording what work was done
- Tracking project health
- Making operational decisions
- Planning sprints/milestones
- Managing tasks

**Tools:** `update_project_status`, `add_decision`, `create_or_update_*`

### Use docs/ (Reference) When:

- Explaining how the system works
- Documenting APIs
- Writing user guides
- Recording architecture design
- Creating release notes

**Tools:** `create_doc`, `update_doc`, `add_release_note`, `update_architecture_doc`

---

## Creating Documentation

### Create New Document

```json
{
	"tool": "create_doc",
	"arguments": {
		"path": "guides/AUTHENTICATION.md",
		"title": "Authentication Guide",
		"content": "## Overview\n\nThis guide explains how authentication works...",
		"category": "guides",
		"description": "Complete guide to user authentication"
	}
}
```

### Document Structure

Every document should have:

```markdown
# Title

> Brief description

## Introduction

What this document covers...

## Main Content

The actual content...

## Related Documentation

- [Link](./path.md) - Description

---

_Last Updated: January 2026_
```

---

## Updating Documentation

### Append Content

Add to the end (most common):

```json
{
	"tool": "update_doc",
	"arguments": {
		"path": "api/ENDPOINTS.md",
		"content": "### GET /users/{id}\n\nReturns user details...",
		"mode": "append"
	}
}
```

### Update Specific Section

```json
{
	"tool": "update_doc",
	"arguments": {
		"path": "guides/SETUP.md",
		"content": "Updated installation instructions...",
		"mode": "section",
		"section": "## Installation"
	}
}
```

### Replace Entire Document

```json
{
	"tool": "update_doc",
	"arguments": {
		"path": "reference/CONFIG.md",
		"content": "# Configuration\n\nComplete new content...",
		"mode": "replace"
	}
}
```

---

## Architecture Documentation

### Create Architecture Doc

```json
{
	"tool": "update_architecture_doc",
	"arguments": {
		"topic": "data-flow",
		"title": "Data Flow Architecture",
		"content": "## Overview\n\nData flows through the system as follows...",
		"diagrams": ["graph TD\n  A[Client] --> B[API]\n  B --> C[Database]"]
	}
}
```

### Update Existing

```json
{
	"tool": "update_architecture_doc",
	"arguments": {
		"topic": "data-flow",
		"content": "## New Section\n\nAdditional details...",
		"replace": false
	}
}
```

---

## Release Notes

### Create Release Note

```json
{
	"tool": "add_release_note",
	"arguments": {
		"version": "2.1.0",
		"title": "Documentation Update",
		"summary": "This release improves documentation structure and adds new tools.",
		"features": [
			"New docs/ management tools",
			"Best-in-class documentation structure",
			"Improved tool descriptions for NLP"
		],
		"fixes": ["Fixed intent detection for project_docs queries", "Improved section update mode"],
		"breaking_changes": [],
		"deprecations": []
	}
}
```

---

## Project Status Updates

### Quick Status Update

```json
{
	"tool": "update_project_status",
	"arguments": {
		"status": "Completed documentation restructure",
		"health": "green",
		"changes": ["Added comprehensive docs/ structure", "Created architecture documentation", "Added API reference"],
		"next_milestone": "v2.1.0 Release"
	}
}
```

### Detailed Status

```json
{
	"tool": "create_or_update_status",
	"arguments": {
		"content": "## Detailed Status\n\nExtended status information...",
		"updateType": "general"
	}
}
```

---

## Recording Decisions

### Add Architecture Decision

```json
{
	"tool": "add_decision",
	"arguments": {
		"title": "Use PostgreSQL for primary database",
		"context": "Need to choose a database for user data storage",
		"decision": "We will use PostgreSQL for all user data",
		"consequences": "Positive: Strong ACID compliance, good performance\nNegative: More complex setup than SQLite",
		"status": "accepted",
		"tags": ["database", "infrastructure"]
	}
}
```

### When to Record Decisions

- Technology choices
- Architecture patterns
- API design decisions
- Security approaches
- Performance trade-offs

---

## Documentation Review Workflow

### 1. Check Current State

```json
{
	"tool": "check_project_state",
	"arguments": {}
}
```

### 2. List Documentation

```json
{
	"tool": "list_doc_categories",
	"arguments": {}
}
```

### 3. Validate Documentation

```json
{
	"tool": "lint_project_docs",
	"arguments": {
		"verbose": true
	}
}
```

### 4. Update as Needed

Use appropriate tools based on what needs updating.

---

## Best Practices

### README Files

Every directory should have a README.md:

- Explains the directory's purpose
- Lists contents with descriptions
- Links to related documentation

### Cross-References

Link between documents:

```markdown
See [Architecture Overview](../architecture/OVERVIEW.md) for details.
```

### Consistent Formatting

- Use consistent header levels
- Include last-updated timestamps
- Follow the established structure

### Keep Operational and Reference Separate

- `.project/STATUS.md` — "We finished X today"
- `docs/guides/FEATURE.md` — "Here's how to use X"

---

## Common Workflows

### After Completing a Feature

1. `update_project_status` — Record completion
2. `create_doc` or `update_doc` — Document the feature
3. `add_decision` — Record any decisions made

### Before a Release

1. `list_archived_tasks` — Review completed work
2. `add_release_note` — Create release notes
3. `update_doc` — Update relevant guides
4. `update_project_status` — Record release

### During Development

1. `add_decision` — When making choices
2. `update_project_status` — Regular updates
3. `update_architecture_doc` — As design evolves

---

## Related Documentation

- [Project Setup](./PROJECT_SETUP.md) — Directory structure
- [Task Management](./TASK_MANAGEMENT.md) — Task workflow
- [API Reference](../api/) — Tool specifications

---

_Last Updated: January 2026_
