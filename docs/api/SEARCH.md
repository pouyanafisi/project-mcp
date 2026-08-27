# Search API

> Detailed documentation for search tools and intent detection.

## Overview

The search API provides intelligent, intent-aware access to project documentation. It automatically routes queries to the appropriate sources based on natural language understanding.

## Search Tools

### Primary Search: `search_project`

The main search tool that understands intent.

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication flow",
    "intent": "project_docs",
    "maxResults": 10
  }
}
```

### Documentation Search: `search_docs`

Search only the `docs/` directory.

```json
{
  "tool": "search_docs",
  "arguments": {
    "query": "API reference",
    "category": "api"
  }
}
```

---

## Intent Detection

### How It Works

The system analyzes queries to detect user intent:

```
User Query
    │
    ├─ Contains "project docs/documentation"?
    │  └─→ Intent: "project_docs" → docs/ + DECISIONS.md
    │
    ├─ Contains "decision/adr/architecture decision"?
    │  └─→ Intent: "decisions" → DECISIONS.md only
    │
    ├─ Contains "plan/todo/roadmap/status/backlog"?
    │  └─→ Intent: "plan" → .project/ only
    │
    ├─ Contains "docs/documentation/reference"?
    │  └─→ Intent: "docs" → docs/ only
    │
    └─ Default
       └─→ Intent: "project" → All sources
```

### Intent Types

| Intent | Description | Sources |
|--------|-------------|---------|
| `project` | Everything about the project | `.project/` + root + `docs/` |
| `docs` | Reference documentation | `docs/` only |
| `project_docs` | Application documentation | `docs/` + DECISIONS.md |
| `documentation` | Same as docs | `docs/` only |
| `reference` | Same as docs | `docs/` only |
| `architecture` | Architecture docs | `docs/` only |
| `plan` | Project planning | `.project/` only |
| `todos` | Task tracking | `.project/` only |
| `roadmap` | Future plans | `.project/` only |
| `status` | Project status | `.project/` only |
| `operational` | Work tracking | `.project/` only |
| `management` | Same as operational | `.project/` only |
| `decisions` | Architecture decisions | DECISIONS.md only |

### Keyword Patterns

Intent detection uses these regex patterns:

```javascript
// "project_docs" intent
/\b(project\s+doc(s|ument(s|ation)?)?)\b/

// "decisions" intent
/\b(decision(s)?|adr|architecture\s+decision(s)?)\b/

// "plan" intent
/\b(plan|plans|todo|todos|roadmap|status|operational|backlog)\b/

// "docs" intent
/\b(docs|documentation|reference|guide|guides|api docs)\b/
```

### Explicit Intent

You can bypass auto-detection with explicit intent:

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "status update",
    "intent": "docs"  // Force docs/ search despite "status" keyword
  }
}
```

---

## Source Mapping

### Source Directories

| Source | Directory | Content |
|--------|-----------|---------|
| `project` | `.project/` | Operational files (STATUS, TODO, etc.) |
| `root` | Project root | README.md, CONTRIBUTING.md, etc. |
| `docs` | `docs/` | Reference documentation |
| `decisions` | `.project/DECISIONS.md` | Architecture decisions |

### File Loading

Files are loaded and cached on first search:

```
loadAllFiles()
    │
    ├─ Scan .project/ → source: "project"
    │  └─ DECISIONS.md → source: "decisions" (special case)
    │
    ├─ Scan root *.md → source: "root"
    │
    └─ Scan docs/ → source: "docs"
```

### Source Filtering

Searches filter by intent-mapped sources:

```javascript
const sources = getSourcesForIntent(intent);
const filesToSearch = allFiles.filter(f => sources.includes(f.source));
```

---

## Search Implementation

### Fuzzy Search (Fuse.js)

Uses Fuse.js for fuzzy matching:

```javascript
const index = new Fuse(files, {
  keys: ['title', 'content', 'path', 'category', 'source'],
  threshold: 0.4,  // 40% match required
  includeScore: true,
  includeMatches: true,
});
```

### Search Keys

| Key | Weight | Description |
|-----|--------|-------------|
| `title` | High | Document title |
| `content` | Medium | Full content |
| `path` | Medium | File path |
| `category` | Low | Category name |
| `source` | Low | Source identifier |

### Snippet Extraction

Results include contextual snippets:

```javascript
extractSnippet(content, query, matches)
// Returns ~300 chars around the first match
```

---

## Result Format

### Search Response

```json
{
  "content": [{
    "type": "text",
    "text": "## Document Title\n**Path:** `docs/guide.md`\n**Source:** docs (reference)\n**Relevance:** 0.95\n\n**Snippet:**\n```\n...matching content...\n```"
  }]
}
```

### Result Fields

| Field | Description |
|-------|-------------|
| `path` | File path relative to project |
| `title` | Document title |
| `description` | Brief description (if available) |
| `source` | Source identifier |
| `category` | Document category |
| `relevanceScore` | Match score (0-1, higher = better) |
| `snippet` | Contextual excerpt |
| `matchedFields` | Which fields matched |

---

## Caching

### File Cache

Files are cached after first load:

```javascript
let allFilesCache = null;
let allFilesIndex = null;

async function loadAllFiles(force = false) {
  if (allFilesCache && !force) return allFilesCache;
  // ... load files
}
```

### Cache Invalidation

Clear cache to reload files:

```javascript
clearCache();  // Sets cache to null
```

---

## Examples

### Search Project Status

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "current status",
    "intent": "plan"
  }
}
```

**Result:** Searches only `.project/`, returns STATUS.md, TODO.md

### Search API Documentation

```json
{
  "tool": "search_docs",
  "arguments": {
    "query": "authentication API",
    "category": "api"
  }
}
```

**Result:** Searches only `docs/api/`

### Search Architecture Decisions

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "database choice",
    "intent": "decisions"
  }
}
```

**Result:** Searches only DECISIONS.md

### Full Project Search

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication"
  }
}
```

**Result:** Searches `.project/` + root + `docs/`

---

## Related Documentation

- [Tools Reference](./TOOLS.md) — All tool specifications
- [Intent Mapping](../reference/INTENT_MAPPING.md) — Detailed mapping
- [Architecture](../architecture/DATA_FLOW.md) — Data flow

---

*Last Updated: January 2026*

