# Search Guide

> Effective searching techniques with project-mcp.

## Overview

project-mcp provides intent-aware search that automatically routes queries to the right sources. You don't need to remember directory structures — just describe what you're looking for.

---

## Quick Reference

| I'm looking for...            | Example Query                       | Tool             |
| ----------------------------- | ----------------------------------- | ---------------- |
| Project status & progress     | "What's the current status?"        | `search_project` |
| API or technical docs         | "How does authentication work?"     | `search_docs`    |
| Architecture decisions        | "Why did we choose PostgreSQL?"     | `search_project` |
| Task information              | "What tasks are in progress?"       | `list_tasks`     |
| Specific file                 | "Get README.md"                     | `get_doc`        |

---

## Search Tools

### `search_project` — Main Search

The primary search tool. Automatically detects intent from your query.

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "authentication flow"
	}
}
```

**How intent detection works:**

| Your query mentions...        | Searches                     |
| ----------------------------- | ---------------------------- |
| "project docs", "documentation" | `docs/` + DECISIONS.md     |
| "status", "todo", "roadmap"   | `.project/` only             |
| "docs", "reference", "guide"  | `docs/` only                 |
| "decision", "adr"             | DECISIONS.md only            |
| (anything else)               | All sources                  |

### `search_docs` — Documentation Only

Search specifically in the `docs/` directory.

```json
{
	"tool": "search_docs",
	"arguments": {
		"query": "rate limiting",
		"category": "api"
	}
}
```

**Categories:** `architecture`, `api`, `guides`, `reference`, `releases`

### `get_doc` — Read Full File

Get the complete contents of a specific file.

```json
{
	"tool": "get_doc",
	"arguments": {
		"path": "docs/api/TOOLS.md"
	}
}
```

### `list_docs` — Browse Files

List available documentation files.

```json
{
	"tool": "list_docs",
	"arguments": {
		"category": "guides"
	}
}
```

---

## Forcing Specific Intent

Override auto-detection when needed:

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "status report",
		"intent": "docs"
	}
}
```

**Available intents:**

| Intent         | Searches                           |
| -------------- | ---------------------------------- |
| `project`      | `.project/` + root + `docs/`       |
| `docs`         | `docs/` only                       |
| `project_docs` | `docs/` + DECISIONS.md             |
| `plan`         | `.project/` only                   |
| `decisions`    | DECISIONS.md only                  |

---

## Common Patterns

### Find Project Status

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "current status"
	}
}
```

→ Auto-detects "status" → searches `.project/`

### Find API Documentation

```json
{
	"tool": "search_docs",
	"arguments": {
		"query": "authentication API",
		"category": "api"
	}
}
```

→ Searches only `docs/api/`

### Find Architecture Decisions

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "database choice",
		"intent": "decisions"
	}
}
```

→ Searches only DECISIONS.md

### Find Everything About a Topic

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "authentication"
	}
}
```

→ Searches all sources for comprehensive results

---

## Tips

1. **Be natural** — Write queries like you'd ask a colleague
2. **Be specific** — "OAuth login flow" beats "auth"
3. **Use categories** — When searching docs, specify the category
4. **Override when needed** — Use explicit `intent` if auto-detection picks wrong

---

## Related Documentation

- [Search API](../api/SEARCH.md) — Technical details
- [Intent Mapping](../reference/INTENT_MAPPING.md) — Full mapping reference
- [Tools Reference](../api/TOOLS.md) — All tools

---

_Last Updated: January 2026_

