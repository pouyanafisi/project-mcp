# Intent Mapping Reference

> How project-mcp detects intent and maps to sources.

## Overview

Intent mapping is the core of project-mcp's intelligent search. It automatically routes queries to the appropriate sources based on natural language understanding.

## Intent Types

### Complete Intent List

| Intent | Description | Sources |
|--------|-------------|---------|
| `project` | Everything about the project | `.project/` + root + `docs/` |
| `docs` | Reference documentation | `docs/` only |
| `project_docs` | Application documentation | `docs/` + DECISIONS.md |
| `documentation` | Same as `docs` | `docs/` only |
| `reference` | Same as `docs` | `docs/` only |
| `architecture` | Architecture documentation | `docs/` only |
| `plan` | Project planning/tracking | `.project/` only |
| `todos` | Task tracking | `.project/` only |
| `roadmap` | Future plans | `.project/` only |
| `status` | Project status | `.project/` only |
| `operational` | Work tracking | `.project/` only |
| `management` | Same as `operational` | `.project/` only |
| `decisions` | Architecture decisions | DECISIONS.md only |

---

## Source Directories

### Source Types

| Source | Directory | Description |
|--------|-----------|-------------|
| `project` | `.project/` | Project management files |
| `root` | Project root | Root-level markdown files |
| `docs` | `docs/` | Reference documentation |
| `decisions` | `.project/DECISIONS.md` | Architecture decisions |

### What's in Each Source

#### `project` (`.project/`)

- `index.md` — Contract file
- `TODO.md` — Task dashboard
- `ROADMAP.md` — Project roadmap
- `STATUS.md` — Project status
- `BACKLOG.md` — Work queue
- `todos/*.md` — Active tasks
- `archive/*.md` — Completed tasks

#### `root` (Project root)

- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- Other root-level `.md` files

#### `docs` (`docs/`)

- All files in `docs/` directory
- Organized by category (architecture, api, guides, etc.)

#### `decisions` (Special)

- Only `.project/DECISIONS.md`
- Tagged separately for precise targeting

---

## Intent Detection Logic

### Detection Order

The system checks patterns in this order:

```
1. "project docs" pattern → project_docs
2. Decision keywords → decisions
3. Operational keywords → plan
4. Documentation keywords → docs
5. Default → project (search all)
```

### Pattern Matching

#### "project_docs" Intent

Triggered by:
- "project docs"
- "project documentation"
- "project documents"
- "application documentation"

```javascript
/\b(project\s+doc(s|ument(s|ation)?)?|application\s+doc)\b/
```

#### "decisions" Intent

Triggered by:
- "decision" / "decisions"
- "ADR"
- "architecture decision"
- "technical decision"

```javascript
/\b(decision(s)?|adr|architecture\s+decision(s)?|technical\s+decision(s)?)\b/
```

#### "plan" Intent

Triggered by:
- "plan" / "plans"
- "todo" / "todos"
- "roadmap"
- "status"
- "operational"
- "current state"
- "backlog"

```javascript
/\b(plan|plans|todo|todos|roadmap|status|operational|current state|backlog)\b/
```

#### "docs" Intent

Triggered by:
- "docs"
- "documentation"
- "reference"
- "guide" / "guides"
- "API docs"

```javascript
/\b(docs|documentation|reference|guide|guides|api docs)\b/
```

---

## Intent to Source Mapping

### Configuration

Defined in `src/lib/constants.js`:

```javascript
export const INTENT_SOURCES = {
  // Search everything
  project: ['project', 'root', 'docs'],

  // Application documentation only
  docs: ['docs'],
  project_docs: ['docs', 'decisions'],
  documentation: ['docs'],
  reference: ['docs'],
  architecture: ['docs'],

  // Project management only
  plan: ['project'],
  todos: ['project'],
  roadmap: ['project'],
  status: ['project'],
  operational: ['project'],
  management: ['project'],

  // Decisions (operational, in .project/)
  decisions: ['decisions'],
};
```

### Mapping Examples

| Query | Detected Intent | Sources Searched |
|-------|-----------------|------------------|
| "How does authentication work?" | `project` | All |
| "Show me the API docs" | `docs` | `docs/` |
| "What's the project status?" | `plan` | `.project/` |
| "Find architecture decisions" | `decisions` | DECISIONS.md |
| "Project documentation" | `project_docs` | `docs/` + DECISIONS |

---

## Using Explicit Intent

### Override Auto-Detection

Force a specific intent:

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication",
    "intent": "docs"
  }
}
```

### When to Use Explicit Intent

- Query contains misleading keywords
- You know exactly where to search
- Testing or debugging

### Example: Override "status"

Query "authentication status" would detect `plan` due to "status":

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication status",
    "intent": "docs"  // Force docs/ search
  }
}
```

---

## File Loading

### How Files Are Indexed

```
loadAllFiles()
├── Scan .project/
│   ├── Regular files → source: "project"
│   └── DECISIONS.md → source: "decisions" (special)
├── Scan root *.md
│   └── All files → source: "root"
└── Scan docs/
    └── All files → source: "docs"
```

### File Metadata

Each file is indexed with:

```javascript
{
  path: "docs/api/TOOLS.md",
  fullPath: "/absolute/path/docs/api/TOOLS.md",
  source: "docs",
  title: "Tools Reference",
  description: "Complete tool documentation",
  content: "...",
  category: "api"
}
```

---

## Customizing Intent Mapping

### Adding New Intents

1. Add to `INTENT_SOURCES` in `src/lib/constants.js`:

```javascript
export const INTENT_SOURCES = {
  // ... existing mappings
  security: ['docs'],  // New intent
};
```

2. Add detection pattern in `src/lib/search.js`:

```javascript
// In detectIntent()
if (/\b(security|secure|vulnerability)\b/.test(queryLower)) {
  return 'security';
}
```

### Modifying Source Mappings

Change which sources an intent searches:

```javascript
// Make "docs" also search .project/DECISIONS.md
docs: ['docs', 'decisions'],
```

---

## Best Practices

### Let Auto-Detection Work

Most queries work well with automatic detection:

```json
// Good: Natural language
{ "query": "how to set up authentication" }

// Unnecessary: Explicit when auto works
{ "query": "authentication", "intent": "docs" }
```

### Be Explicit When Needed

Override when keywords mislead:

```json
// "status" would trigger "plan" intent
// But we want documentation about status feature
{
  "query": "user status feature",
  "intent": "docs"
}
```

### Use Specific Keywords

Help detection with clear language:

```json
// Clear operational query
{ "query": "current project status and blockers" }

// Clear documentation query
{ "query": "API documentation for users endpoint" }
```

---

## Debugging Intent

### Check Detected Intent

The search result includes intent info:

```
*Intent detected: "plan" - searched project sources*
```

### Test Detection

Use explicit intent to verify:

```json
// Test what "plan" searches
{
  "query": "test",
  "intent": "plan"
}
// Should only return .project/ files
```

---

## Related Documentation

- [Search API](../api/SEARCH.md) — Search tool details
- [Configuration](./CONFIGURATION.md) — Server configuration
- [Architecture](../architecture/DATA_FLOW.md) — Data flow

---

*Last Updated: January 2026*

